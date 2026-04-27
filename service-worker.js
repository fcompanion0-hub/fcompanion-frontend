const CACHE_STATIC = "fcompanion-static-v17";
const CACHE_CHAT   = "fcompanion-chat-v17";

// Static assets to pre-cache on install
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/Home.html",
    "/Auth.html",
    "/Profile.html",
    "/css/Home.css",
    "/css/Auth.css",
    "/css/Profile.css",
    "/js/session.js",
    "/js/Auth.js",
    "/js/Home.js",
    "/js/Profile.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json"
];

// ── Install: pre-cache static assets ─────────────────────────
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────
self.addEventListener("activate", event => {
    const validCaches = [CACHE_STATIC, CACHE_CHAT];

    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => !validCaches.includes(k))
                    .map(k => caches.delete(k))
            )
        )
    );

    self.clients.claim();
});

// ── Fetch handler ─────────────────────────────────────────────
self.addEventListener("fetch", event => {
    const req = event.request;
    const url = new URL(req.url);

    // 1. Chat history API — network-first, cache fallback
    if (url.hostname.includes("onrender.com") && url.pathname === "/chat/history") {
        event.respondWith(networkFirstChatHistory(req));
        return;
    }

    // 2. Other API calls — network only, offline stub
    if (url.hostname.includes("onrender.com")) {
        event.respondWith(
            fetch(req).catch(() =>
                new Response(JSON.stringify({ reply: "You are offline. Please reconnect." }), {
                    headers: { "Content-Type": "application/json" }
                })
            )
        );
        return;
    }

    // 3. Navigation requests — network first, fallback to Home.html
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).catch(() => caches.match("/Home.html"))
        );
        return;
    }

    // 4. CSS / JS — stale-while-revalidate
    if (req.destination === "style" || req.destination === "script") {
        event.respondWith(staleWhileRevalidate(req, CACHE_STATIC));
        return;
    }

    // 5. Everything else — cache first
    event.respondWith(
        caches.match(req).then(res => res || fetch(req))
    );
});

// ── Network-first with cache fallback for chat history ────────
async function networkFirstChatHistory(req) {
    try {
        const res   = await fetch(req);
        const clone = res.clone();

        // Only cache successful responses
        if (res.ok) {
            const cache = await caches.open(CACHE_CHAT);
            cache.put(req, clone);
        }

        return res;

    } catch {
        // Offline — return cached chat history if available
        const cached = await caches.match(req);
        if (cached) return cached;

        // No cache — return empty history
        return new Response(JSON.stringify({ messages: [] }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}

// ── Stale-while-revalidate for static assets ─────────────────
async function staleWhileRevalidate(req, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(req);

    const networkFetch = fetch(req)
        .then(res => {
            cache.put(req, res.clone());
            return res;
        })
        .catch(() => null);

    return cached || networkFetch;
}