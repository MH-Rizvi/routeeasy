const CACHE_NAME = 'routaura-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // NEVER cache API requests or Chrome extension requests
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api') || url.pathname.includes(':8000')) {
        return fetch(event.request);
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached response if found
            if (response) {
                // Fetch in background to update cache for next time (Stale-while-revalidate)
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    }
                }).catch(() => { });

                return response;
            }

            // Otherwise fetch from network
            return fetch(event.request).then((networkResponse) => {
                // Verify response is valid before caching
                if (
                    !networkResponse ||
                    networkResponse.status !== 200 ||
                    networkResponse.type !== 'basic'
                ) {
                    return networkResponse;
                }

                // Cache the dynamically fetched static assets if it's http/https
                if (event.request.url.startsWith('http')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkResponse;
            }).catch(() => {
                // Fallback or do nothing if network fails and not in cache
            });
        })
    );
});
