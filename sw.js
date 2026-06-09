// ==========================================
// SOLLO ERP - SMART OFFLINE ENGINE (v6.4)
// ==========================================
// ENTERPRISE RULE: Every time you change your code, you MUST change this version number (e.g., to 11.8, 11.9)!
const CACHE_NAME = 'sollo-erp-v46.0-offline';

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
    // STRICT ERP LOGIC: Added Chart.js and HTML2PDF so the dashboard and printing work offline 
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

self.addEventListener('install', (event) => {
    // ENTERPRISE FIX: Re-activated skipWaiting()! Without this, the PWA gets permanently stuck on old versions and refuses to update!
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

    // ENTERPRISE FIX: The Cache API violently crashes on POST requests. We MUST ignore them!
    if (event.request.method !== 'GET') return;

    // 🚨 ENTERPRISE UPGRADE: STALE-WHILE-REVALIDATE (ZERO-LATENCY BOOT)
    // Instantly loads from the phone's SSD (0.05s boot time) while silently updating the cache in the background!
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            // Secretly fetch the newest files from the server in the background
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch((err) => console.warn("Background sync offline:", err));

            // Return the instant SSD cache if it exists, otherwise wait for the network
            return cachedResponse || fetchPromise.then(res => {
                if (res) return res;
                if (event.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});

// ==========================================
// ENTERPRISE FIX: THE PWA UPDATE LISTENER
// ==========================================
// Listens for the "SKIP_WAITING" signal from app.js so the app actually updates when a new version drops!
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
// ==========================================
// 🚨 ENTERPRISE POLISH: THE "ZOMBIE CACHE" PURGER
// ==========================================
// When you update the CACHE_NAME version at the top of this file, this engine wakes up
// and permanently deletes the old cache from the phone's hard drive. 
// This guarantees users never get stuck on a broken, outdated version of the app!
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // If the cache name doesn't match the CURRENT version, destroy it!
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Destroying old outdated cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Forces all open tabs to instantly use the new cache!
    );
});
// ==========================================
// 🚨 ENTERPRISE UPGRADE: BACKGROUND SYNC API
// ==========================================
// Wakes up in the background the moment the phone connects to WiFi!
self.addEventListener('sync', (event) => {
    if (event.tag === 'sollo-auto-backup') {
        console.log("☁️ Background Sync Triggered: Network Restored!");
        
        // Wake up the minimized app and command it to run the backup securely!
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'TRIGGER_BACKGROUND_BACKUP' });
                });
            })
        );
    }
});
