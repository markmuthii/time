// Changing the version clears old caches; updates show on reload either way since fetches are network-first.
const CACHE = "time-v1";
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "fonts/DS-DIGIT.TTF",
  "fonts/DS-DIGII.TTF",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first: always show the latest version when online, fall back to the cache when offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(event.request)
        .then((response) => {
          if (response.ok || response.type === "opaque")
            cache.put(event.request, response.clone());
          return response;
        })
        .catch(
          async () =>
            (await cache.match(event.request, { ignoreSearch: true })) ||
            Response.error(),
        ),
    ),
  );
});
