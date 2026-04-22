const CACHE_NAME = "fcompanion-v4";

const urlsToCache = [
  "/",
  "/index.html",
  "/Auth.html",
  "/Home.html",
  "/css/Home.css",
  "/css/Auth.css",
  "/js/Auth.js",
  "/js/Home.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // API → network first
  if (req.url.includes("onrender.com")) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ reply: "Offline" }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Pages → network first (IMPORTANT for iOS)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/Home.html"))
    );
    return;
  }

  // Static → cache first
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});