// ==========================================
// SOLLO ERP - SMART OFFLINE ENGINE (v6.5 Auto-Fresh)
// ==========================================
const CACHE_NAME = 'sollo-erp-evergreen-offline';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './ui.js',
    './db.js',
    './utils.js',
    './cloud.js',
    './state.js',
    './components.js',
    './worker.js',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
    'https://cdn.jsdelivr.net/npm/html-to-pdfmake/browser.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(ASSETS_TO_CACHE.map(url => {
                return cache.add(new Request(url, { cache: 'reload' })).catch(err => {
                    console.warn(`Failed to precache: ${url}`, err);
                });
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
                        console.log('SW: Purging old zombie cache -', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

const fetchWithTimeout = (request, timeout = 1500, fetchOptions = {}) => {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Network Timeout'));
        }, timeout);
        fetch(request, { ...fetchOptions, signal: controller.signal }).then(res => {
            clearTimeout(timer);
            resolve(res);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
};

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // 1. Bypass Google Auth and Drive API requests only (preserves fonts.googleapis.com)
    if (url.includes('apis.google.com') || 
        url.includes('accounts.google.com') || 
        url.includes('content.googleapis.com') || 
        url.includes('www.googleapis.com/drive')) {
        return; 
    }

    // 2. Prevent 405 Method Not Allowed on static servers when handling CSV Share Target
    if (event.request.method === 'POST' && url.includes('action=import_csv')) {
        event.respondWith(Response.redirect('./?action=import_csv', 303));
        return;
    }

    if (event.request.method !== 'GET') return;
    if (url.startsWith('blob:') || url.startsWith('data:')) return;

    const urlObj = new URL(url);
    const isLocalAsset = urlObj.origin === self.location.origin;
    const isAppIdentityAsset = isLocalAsset && (
        urlObj.pathname.endsWith('icon-192.png') ||
        urlObj.pathname.endsWith('icon-512.png') ||
        urlObj.pathname.endsWith('manifest.json')
    );

    // 2.5. Instant 0ms Cache-First for App Icons & Manifest (Prevents Chrome Icon Flash on Launch)
    if (isAppIdentityAsset) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                    }
                    return networkResponse;
                }).catch(() => {});
                return cachedResponse || networkFetch;
            })
        );
        return;
    }

    // 3. All Local App Files (HTML, CSS, JS): Network-First (cache: 'no-cache') with Offline Fallback
    if (event.request.mode === 'navigate' || isLocalAsset) {
        event.respondWith(
            fetchWithTimeout(event.request, 1500, { cache: 'no-cache' })
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request, { ignoreSearch: true }).then(cached => {
                        if (cached) return cached;
                        if (event.request.mode === 'navigate') return caches.match('./index.html');
                        return new Response('', { status: 408, statusText: 'Offline' });
                    });
                })
        );
        return;
    }

    // 4. External Vendor CDNs & Google Fonts (.woff2): Cache-First for Instant Speed
    const shouldIgnoreSearch = !url.includes('fonts.googleapis.com');
    event.respondWith(
        caches.match(event.request, { ignoreSearch: shouldIgnoreSearch }).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetchWithTimeout(event.request, 8000).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                }
                return networkResponse;
            }).catch(() => {
                return new Response('', { status: 408, statusText: 'Offline' });
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sollo-auto-backup') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRIGGER_BACKGROUND_BACKUP' }));
            })
        );
    }
});