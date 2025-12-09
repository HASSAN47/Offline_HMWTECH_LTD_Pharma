const CACHE_NAME = 'hmwtech-v2';

// Files we strictly want to cache immediately on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Install Event: Cache core files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate Event: Clean up old caches to ensure users get updates
self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Event: The Core Offline Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore Non-GET requests (e.g., Gemini API POST calls)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Ignore Chrome Extension schemes or other non-http protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. HTML Navigation Strategy: Network First, Fallback to Cache
  // This ensures we always try to get the latest version of the app, but load the cached one if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match('./index.html'); // Fallback to SPA root
        })
    );
    return;
  }

  // 4. Asset Strategy: Stale-While-Revalidate
  // Serve cached content immediately, then update cache in background.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            // Network failed, nothing to do (we rely on cache)
          });

        // Return cached response if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});