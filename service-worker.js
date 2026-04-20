const CACHE_NAME = "fcompanion-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/login.html",
  "/Home.html",
  "/Profile.html",

  "/css/Home.css",
  "/css/Profile.css",
  "/css/Auth.css",


  "/js/Auth.js",
  "/js/Home.js",
  "/js/Profile.js",

  "/icons/icon-192.png",
  "/manifest.json",
  "/icons/icon-512.png"
];

// Install → cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate → clean old cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch → cache fallback
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Backend → always try network
  if (url.hostname.includes("onrender.com")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ reply: "You are offline." }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Static → cache first
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});