// ==========================================
// SOLLO ERP - SMART OFFLINE ENGINE (v6.3)
// ==========================================
// ENTERPRISE RULE: Every time you change your code, you MUST change this version number (e.g., to 6.3, 6.4)!
const CACHE_NAME = 'sollo-erp-v6.3-offline';

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
    'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js',
    // STRICT ERP LOGIC: Added Chart.js and HTML2PDF so the dashboard and printing work offline!
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
    // We removed skipWaiting() here so it doesn't force an aggressive update loop!
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

// STRICT ERP LOGIC: The Garbage Collector. Destroys outdated caches to prevent mobile storage bombs!
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Purging old zombie cache -', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ENTERPRISE UPGRADE: 3-Second Timeout Engine for "Lie-Fi" connections
const fetchWithTimeout = (request, timeout = 3000) => {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort(); // STRICT ERP LOGIC: Physically sever the hanging network connection!
            reject(new Error('Network Timeout'));
        }, timeout);
        fetch(request, { signal: controller.signal }).then(response => {
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
    
    // STRICT ERP LOGIC: Never intercept or cache Google Auth & API scripts! 
    // This prevents permanent "Token Mismatch" lockouts on the Cloud Backup engine.
    const url = event.request.url;
    // ENTERPRISE FIX: Also exclude 'googleapis.com' so massive database restores don't hit the 3-second timeout and crash on 3G networks!
    if (url.includes('apis.google.com') || url.includes('accounts.google.com') || url.includes('googleapis.com')) {
        return; 
    }

    // --- DEVELOPMENT MODE OVERRIDE ---
    // If we are developing locally, ALWAYS bypass the cache completely
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        event.respondWith(fetch(event.request));
        return;
    }
    // ---------------------------------

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
            // ENTERPRISE FIX: Add ignoreSearch so PWA Quick Actions (?action=new_sale) don't crash offline!
            return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                if (event.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});
