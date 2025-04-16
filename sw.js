const CACHE_NAME = 'nova-calendar-v1.1.0';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/analytics.js',
    'https://d2zcpib8duehag.cloudfront.net/Nova%20Calendar%20wo%20Text.png',
    '/fonts/SpaceGrotesk-Variable.ttf',
    '/fonts/Inter-Variable.ttf',
    '/icons/favicon.ico',
    '/icons/touch-icon.png'
];

// Add dynamic caching
const DYNAMIC_CACHE = 'nova-calendar-dynamic';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

// Handle fetch events with network-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request);
            })
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Add background sync for offline changes
self.addEventListener('sync', event => {
    if (event.tag === 'sync-events') {
        event.waitUntil(syncEvents());
    }
});

async function syncEvents() {
    const db = await idb.openDB('nova-calendar', 1);
    const syncQueue = await db.getAll('sync-queue');
    
    for (const item of syncQueue) {
        try {
            await fetch('/api/events', {
                method: 'POST',
                body: JSON.stringify(item)
            });
            await db.delete('sync-queue', item.id);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}
