const CACHE_NAME = 'nova-calendar-v1.0.0';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/analytics.js',
    'https://d2zcpib8duehag.cloudfront.net/Nova%20Calendar%20wo%20Text.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
