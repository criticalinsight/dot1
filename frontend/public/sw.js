const CACHE_NAME = 'velocity-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/src/index.css',
    '/manifest.json'
];

self.addEventListener('install', (event: any) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event: any) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

console.log('[SW] Velocity Service Worker Active');
