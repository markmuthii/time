// Bump the version whenever the app shell changes so clients pick up the new files.
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

// Stale-while-revalidate: serve from cache instantly (works offline), refresh the cache in the background.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok || response.type === "opaque")
            cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network;
    }),
  );
});
