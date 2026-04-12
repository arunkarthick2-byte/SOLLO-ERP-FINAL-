// ==========================================
// SOLLO ERP - SMART OFFLINE ENGINE (v6.1)
// ==========================================
const CACHE_NAME = 'sollo-erp-v6.1-offline';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './ui.js',
    './db.js',
    './utils.js',
    './cloud.js',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // STRICT ERP LOGIC: Force { cache: 'reload' } to bypass the browser's HTTP cache.
            // This guarantees the Service Worker downloads the absolute newest files from your server!
            return Promise.all(ASSETS_TO_CACHE.map(url => {
                return cache.add(new Request(url, { cache: 'reload' })).catch(err => console.warn(`Failed to cache: ${url}`, err));
            }));
        })
    );
});

self.addEventListener('activate', (event) => {
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

// ENTERPRISE UPGRADE: 3-Second Timeout Engine for "Lie-Fi" connections
const fetchWithTimeout = (request, timeout = 3000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Network Timeout')), timeout);
        fetch(request).then(response => {
            clearTimeout(timer);
            resolve(response);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
};

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('blob:') || event.request.url.startsWith('data:')) return;

    // STRICT ERP LOGIC: Network-First with a 3-second abort timeout.
    // If the network is slow or hanging, it instantly drops to the high-speed cache!
    event.respondWith(
        fetchWithTimeout(event.request, 3000).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                if (event.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});
