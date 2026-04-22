const CACHE_NAME = "fcompanion-v3";

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
"/manifest.json",
"/icons/icon-512.png"
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
const url = new URL(event.request.url);


if (event.request.method !== "GET") return;

if (!url.protocol.startsWith("http")) return;

if (event.request.mode === "navigate") return;

if (url.hostname.includes("onrender.com")) {
event.respondWith(
fetch(event.request, { redirect: "follow" }).catch(() =>
new Response(JSON.stringify({ reply: "You are offline." }), {
headers: { "Content-Type": "application/json" }
})
)
);
return;
}

event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;


  return fetch(event.request, { redirect: "follow" })
    .then(response => {
      if (!response || response.status !== 200 || response.type === "opaqueredirect") {
        return response;
      }
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    })
    .catch(() => caches.match("/Home.html"));
})

);
});