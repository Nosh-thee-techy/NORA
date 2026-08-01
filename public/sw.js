const CACHE_NAME = "nora-cache-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/nora-icon.png",
  "/nora-logo.png",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stale-While-Revalidate Strategy for all GET requests
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Don't cache WebLLM model downloads or API requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.host.includes("huggingface.co")) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update cache with new response
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback is handled implicitly by returning cachedResponse below
        });
        
        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
