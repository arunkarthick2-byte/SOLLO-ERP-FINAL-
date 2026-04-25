import { 
    initDB, getAllRecords, getRecordById, saveRecord, deleteRecordById, 
    getAllFirms, saveInvoiceTransaction, getNextDocumentNumber, 
    getKhataStatement, getGlobalTimeline, exportDatabase, importDatabase, generateGSTReport 
} from './db.js';
import Utils from './utils.js';
import UI from './ui.js';

// ==========================================
// SOLLO ERP - MAIN APPLICATION CONTROLLER (v5.2 Enterprise)
// ==========================================

// --- ENTERPRISE UPGRADE: TRUE INDIAN CURRENCY FORMATTER ---
window.formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

// --- ENTERPRISE UPGRADE: KILL UGLY BROWSER ALERTS ---
// This secretly intercepts every standard alert() in the entire app and turns them into M3 Toasts!
const solloOriginalAlert = window.alert; // BUG FIX: Preserve native alert in memory
window.alert = function(message) {
    if (window.Utils && typeof window.Utils.showToast === 'function') {
        let icon = "💬";
        const msgLower = message.toLowerCase();
        
        // Smart Engine: Auto-assigns emojis based on the text context!
        if (msgLower.includes("error") || msgLower.includes("fail") || msgLower.includes("invalid") || msgLower.includes("please") || msgLower.includes("cannot")) icon = "⚠️";
        if (msgLower.includes("success") || msgLower.includes("converted") || msgLower.includes("added")) icon = "✅";
        
        window.Utils.showToast(`${icon} ${message}`);
    } else {
        console.warn("Alert Intercepted:", message);
        solloOriginalAlert(message); // Failsafe fallback to prevent silent data loss
    }
};

// --- ENTERPRISE UPGRADE: HIDDEN DEVELOPER DEBUG CONSOLE ---
window.solloDebugLogs = [];
const origError = console.error;
console.error = function(...args) {
    window.solloDebugLogs.unshift({ type: 'error', time: new Date().toLocaleTimeString(), msg: args.join(' ') });
    origError.apply(console, args);
};
const origWarn = console.warn;
console.warn = function(...args) {
    window.solloDebugLogs.unshift({ type: 'warn', time: new Date().toLocaleTimeString(), msg: args.join(' ') });
    origWarn.apply(console, args);
};

let devClickCount = 0;
let devClickTimer = null;
window.triggerDevConsole = () => {
    devClickCount++;
    clearTimeout(devClickTimer);
    devClickTimer = setTimeout(() => devClickCount = 0, 1000);
    if (devClickCount >= 5) {
        devClickCount = 0;
        let logHtml = window.solloDebugLogs.map(l => `<div style="color:${l.type==='error'?'#ff5252':'#fb8c00'}; margin-bottom:8px; border-bottom:1px dashed #333; padding-bottom:8px;">[${l.time}] ${l.msg}</div>`).join('');
        let consoleDiv = document.getElementById('dev-console-overlay');
        if (!consoleDiv) {
            consoleDiv = document.createElement('div');
            consoleDiv.id = 'dev-console-overlay';
            consoleDiv.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(10, 10, 15, 0.95); color:#0f0; font-family:monospace; z-index:9999999; padding:20px; overflow-y:auto; box-sizing:border-box; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);';
            document.body.appendChild(consoleDiv);
        }
        consoleDiv.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f0; padding-bottom:10px; margin-bottom:15px;">
            <h2 style="margin:0; color:#0f0; letter-spacing: 1px;">SOLLO TECHNICAL REVIEW CONSOLE</h2>
            <button onclick="document.getElementById('dev-console-overlay').remove()" style="background:#f00; color:#fff; border:none; padding:8px 16px; border-radius:4px; font-weight:bold;">CLOSE X</button>
        </div>
        <div style="margin-bottom: 15px; font-size: 13px; color: #fff;"><strong>Database Status:</strong> <span style="color:#0ff;">Stable</span> | <strong>Background Sync:</strong> <span style="color:#0ff;">Active</span></div>
        ${logHtml || '<div style="color:#888;">No system warnings or version conflicts logged yet. Environment running perfectly.</div>'}`;
    }
};

// --- ENTERPRISE UPGRADE: GLOBAL ERROR SHIELD ---
window.addEventListener('error', (event) => {
    console.error("Global Window Error Caught:", event.error ? event.error.message : event.message);
    if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast("Something went wrong. Please try again.");
    }
});

window.addEventListener('unhandledrejection', (event) => {
    // Log the event for developers, but do NOT show a scary toast to the user.
    // This prevents false alarms from missing Service Workers or AdBlockers blocking Google Drive.
    console.warn("Silent background promise rejected:", event.reason);
});

// --- ENTERPRISE UPGRADE: UNIVERSAL DOUBLE-TAP PREVENTION ---
document.addEventListener('submit', (e) => {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        if (btn.dataset.locked === "true") {
            e.preventDefault();
            return false; // Blocks the duplicate submission!
        }
        btn.dataset.locked = "true";
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite; font-size: 18px;">sync</span> Saving...';
        btn.style.opacity = '0.7';
        
        // Safely unlock the button after 2.5 seconds in case validation failed
        setTimeout(() => {
            btn.dataset.locked = "false";
            btn.innerHTML = originalText;
            btn.style.opacity = '1';
        }, 2500);
    }
});

// --- ENTERPRISE UPGRADE: POS WAKE LOCK (Keep Screen On) ---
let wakeLock = null;
const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => console.log('Screen Wake Lock released'));
        }
    } catch (err) { console.warn(`Wake Lock error: ${err.name}, ${err.message}`); }
};
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
});
requestWakeLock(); // Request immediately on boot

// --- ENTERPRISE UPGRADE: "ANTI-SWIPE" DATA LOSS PREVENTER ---
window.addEventListener('beforeunload', (event) => {
    // If an activity form is currently open on the screen, warn the user before closing!
    const openForms = document.querySelectorAll('.activity-screen.open');
    if (openForms.length > 0) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
    }
});

// --- ENTERPRISE UPGRADE: LIVE NETWORK HEARTBEAT BANNER ---
const updateNetworkStatus = () => {
    let banner = document.getElementById('offline-banner');
    // Dynamically inject the banner into the HTML if it doesn't exist yet
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; text-align: center; padding: 6px; font-size: 12px; font-weight: 600; color: white; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateY(-100%); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
        document.body.appendChild(banner);
    }
    
    if (!navigator.onLine) {
        // Drop down the red warning banner
        banner.style.backgroundColor = 'var(--md-error, #ba1a1a)';
        banner.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">cloud_off</span> You are offline. Working locally.';
        banner.style.transform = 'translateY(0)';
    } else {
        // Turn it green, tell them they are connected, then slide it away after 3 seconds
        banner.style.backgroundColor = 'var(--md-success, #146c2e)';
        banner.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">cloud_done</span> Back online. Sync ready.';
        setTimeout(() => { banner.style.transform = 'translateY(-100%)'; }, 3000);
    }
};

window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('online', updateNetworkStatus);
// Run once on boot just in case they open the app while already offline
if (!navigator.onLine) updateNetworkStatus();

// --- ENTERPRISE UPGRADE: BANKING APP PRIVACY SHIELD ---
document.addEventListener('visibilitychange', () => {
    // Blurs the entire app screen when the user minimizes it or opens the app switcher
    if (document.hidden) {
        document.body.style.filter = 'blur(15px)';
        document.body.style.transition = 'filter 0.2s ease';
    } else {
        document.body.style.filter = 'none';
    }
});


// --- ENTERPRISE UPGRADE: IMAGE COMPRESSION ENGINE ---
window.compressImage = async (base64Str) => {
    return new Promise((resolve) => {
        if (!base64Str || !base64Str.startsWith('data:image')) return resolve(base64Str);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Shrinks 4K photos down to safe ERP size
            let width = img.width, height = img.height;
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.6)); // 60% WebP = 95% file size reduction!
        };
        img.src = base64Str;
    });
};

// --- ENTERPRISE ARCHITECTURE: MULTI-THREADED WEB WORKERS ---
// Executes massive math loops on a secondary CPU thread so the UI never freezes
window.runOffThread = (heavyLogic, payload) => {
    return new Promise((resolve, reject) => {
        const workerBlob = new Blob([`
            self.onmessage = async (e) => {
                try {
                    const result = (${heavyLogic.toString()})(e.data);
                    self.postMessage({ success: true, payload: result });
                } catch(err) {
                    self.postMessage({ success: false, error: err.message });
                }
            };
        `], { type: 'application/javascript' });
        
        const worker = new Worker(URL.createObjectURL(workerBlob));
        worker.onmessage = (e) => {
            if (e.data.success) resolve(e.data.payload);
            else reject(new Error(e.data.error));
            worker.terminate();
        };
        worker.postMessage(payload);
    });
};

// ==========================================
// ENTERPRISE ARCHITECTURE 1: THE MICROKERNEL
// The app is now a lightweight routing engine. All features will become isolated Plugins.
// ==========================================
const app = {
    version: '6.0.0-Enterprise',
    plugins: new Map(),
    
    // --- THE REGISTRY ENGINE ---
    registerPlugin: function(pluginName, pluginLogic) {
        if (this.plugins.has(pluginName)) return;
        this.plugins.set(pluginName, pluginLogic);
        console.log(`[Kernel] 🧩 Plugin Registered: ${pluginName}`);
    },

    // --- THE BOOTLOADER ---
    boot: async function() {
        console.log("[Kernel] 🚀 Initiating Core Boot Sequence...");
        
        // Boot all isolated modules safely
        for (let [name, plugin] of this.plugins) {
            try {
                if (typeof plugin.onBoot === 'function') {
                    await plugin.onBoot(this); // Pass the kernel to the plugin
                    console.log(`[Kernel] ✅ System Online: ${name}`);
                }
            } catch (err) {
                // If a module crashes, the Kernel isolates the failure and keeps the ERP running!
                console.error(`[Kernel] ❌ CRASH ISOLATED: Plugin ${name} failed.`, err);
            }
        }
    },
    
    // --- LEGACY STATE (Pending Migration to Plugins) ---
    state: { currentEditId: null, currentReceiptId: null, currentDocType: 'invoice', firmId: 'firm1' },

    // ==========================================
    // 1. BOOT SEQUENCE & FIRM MANAGEMENT
    // ==========================================
    init: async () => {
        try {
            // --- NEW CODE: Apply theme immediately on boot ---
            UI.initTheme();
            
            // NEW: Load Document Formatting Settings
            app.loadDocumentSettings();
            // --- END OF NEW CODE ---

            // (Service Worker registration moved to index.html for PWABuilder)
            
            // --- ENTERPRISE UPGRADE: SMART PWA UPDATER ---
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            // If a new update is downloaded from the server and ready...
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New update available!');
                                if (window.Utils && typeof window.Utils.showToast === 'function') {
                                    window.Utils.showToast("New update available! Installing...");
                                }
                                
                                // ENTERPRISE FIX: Force the new Service Worker to take over immediately!
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                
                                // Safely reload ONLY when the new worker has actually taken control
                                navigator.serviceWorker.addEventListener('controllerchange', () => {
                                    window.location.reload();
                                });
                            }
                        });
                    });
                });
            }

            // --- NEW CODE: Request Persistent Storage ---
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log(`Persistent storage granted: ${isPersisted}`);
            } else {
                console.warn("Persistent storage API is not supported in this browser.");
            }
            // --- END OF NEW CODE ---

            // 2. Initialize the Database and load data
            await initDB();
            await app.loadFirms();
            
            await app.loadAllData(); 
            await app.cleanupDuplicates(); // <-- ENTERPRISE FIX: Scans and merges duplicates on boot!
            await app.migrateLegacyStock(); // <-- NEW: Safely moves old inventory into the new Dual-Engine buckets
            await app.sanitizeDatabase(); // ⚡ NEW: Silently destroys "null" ghost data on boot!
            app.setupForms();
            
            // 3. Render the UI
            UI.renderDashboard();
            UI.applyFilters('sales');
            UI.applyFilters('purchases');
            UI.applyFilters('masters');
            UI.applyFilters('expenses');
            UI.applyFilters('cashbook');
            UI.applyFilters('timeline');
            
            UI.hideSplash();

            // FIX: Parse PWA Home Screen Shortcuts and route the user!
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            if (action === 'new_sale') {
                setTimeout(() => app.openForm('sales', null, 'invoice'), 300);
            } else if (action === 'cashbook') {
                // FIX: Pass the correct tab ID and Screen Title
                setTimeout(() => { if(window.UI) window.UI.switchTab('tab-cashbook', 'Cashbook & Banking'); }, 300);
            }

        } catch (e) { 
            console.error(e);
            alert("Critical Error: Offline storage could not be accessed."); 
            UI.hideSplash();
        }
    },

    loadFirms: async () => {
        let firms = typeof getAllFirms === 'function' ? await getAllFirms() : [];
        
        // Auto-initialize a default firm if the database is completely empty
        if (!firms || firms.length === 0) {
            const defaultFirm = {
                // --- NEW CODE: Dynamically generate a unique ID to prevent cloud sync collisions ---
                id: typeof Utils !== 'undefined' ? Utils.generateId() : 'firm-' + Date.now(),
                // --- END OF NEW CODE ---
                name: 'Main Company',
                phone: '',
                email: '',
                gst: '',
                address: '',
                state: ''
            };
            await saveRecord('firms', defaultFirm);
            firms = [defaultFirm];
        }
        
        app.state.firmId = firms[0].id;
        
        const firmData = await getRecordById('businessProfile', app.state.firmId);
        if (firmData) {
            document.getElementById('profile-name').value = firmData.name || '';
            document.getElementById('profile-phone').value = firmData.phone || '';
            document.getElementById('profile-email').value = firmData.email || '';
            document.getElementById('profile-gst').value = firmData.gst || '';
            document.getElementById('profile-address').value = firmData.address || '';
            document.getElementById('profile-state').value = firmData.state || '';
            document.getElementById('profile-bank').value = firmData.bankDetails || '';
            document.getElementById('profile-terms').value = firmData.terms || '';
            
            if (firmData.logo) {
                const img = document.getElementById('profile-logo-preview');
                img.src = firmData.logo;
                img.classList.remove('hidden');
            }
            if (firmData.signature) {
                const img = document.getElementById('profile-signature-preview');
                img.src = firmData.signature;
                img.classList.remove('hidden');
            }
        }
    },

    // ==========================================
    // 2. DATA HYDRATION & STATE MANAGEMENT
    // ==========================================
    loadAllData: async () => {
        // ENTERPRISE FIX: Moved RAM Cache safely inside the function!
        window.AppCache = window.AppCache || { items: null, ledgers: null, accounts: null }; 

        const stripBloat = (arr) => arr.map(r => { const c = {...r}; delete c.image; delete c.attachment; return c; });
        
        // 1. Dynamic Data (Always fetch fresh from Database)
        UI.state.rawData.sales = (await getAllRecords('sales')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.purchases = (await getAllRecords('purchases')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.expenses = stripBloat((await getAllRecords('expenses')).filter(r => r.firmId === app.state.firmId));
        UI.state.rawData.cashbook = (await getAllRecords('receipts')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.timeline = typeof getGlobalTimeline === 'function' ? await getGlobalTimeline(app.state.firmId) : [];
        
        // ENTERPRISE FIX: Fetch fresh data every time to prevent "Ghost Data" sync bugs
        UI.state.rawData.items = stripBloat((await getAllRecords('items')).filter(r => r.firmId === app.state.firmId));
        UI.state.rawData.ledgers = (await getAllRecords('ledgers')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.accounts = (await getAllRecords('accounts')).filter(r => r.firmId === app.state.firmId);

        // UPGRADE 1: Load Recycle Bin from IndexedDB (Fixes the LocalStorage mismatch bug!)
        const dbTrash = await getAllRecords('trash');
        UI.state.rawData.trash = dbTrash.filter(t => t.firmId === app.state.firmId);

        // Refresh our new dynamic dropdowns
        await app.loadDropdowns();

        // Dynamic Account Dropdown Hydration
        const accountDropdowns = ['sales-account-id', 'purchase-account-id', 'expense-account-id', 'pay-in-account', 'pay-out-account'];
        let accountOptions = UI.state.rawData.accounts.map(acc => 
            `<option value="${acc.id}">${acc.name} (${acc.type})</option>`
        ).join('');

        // CRITICAL FIX: Always include the default Cash Drawer if a custom one doesn't exist
        if (!UI.state.rawData.accounts.some(acc => acc.id === 'cash')) {
            accountOptions = `<option value="cash">Default Cash Drawer</option>` + accountOptions;
        }

        accountDropdowns.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = accountOptions;
        });

        // ==========================================
        // TRIGGER SILENT MEMORY OPTIMIZATION
        // ==========================================
        if (window.UI && typeof window.UI.optimizeMemory === 'function') {
            window.UI.optimizeMemory();
        }
    },

    // ==========================================
    // CORE UI REFRESH ENGINE (Restored)
    // ==========================================
    refreshAll: async () => {
        await app.loadAllData();
        if (window.UI) {
            window.UI.applyFilters('sales');
            window.UI.applyFilters('purchases');
            window.UI.applyFilters('masters');
            window.UI.applyFilters('expenses');
            window.UI.applyFilters('cashbook');
            window.UI.applyFilters('timeline');
            window.UI.renderDashboard();
        }
        
        // Trigger silent background backup if active
        if (typeof Cloud !== 'undefined' && Cloud.autoBackup) {
            Cloud.autoBackup();
        }
    },

    // ==========================================
    // NEW: LEGACY STOCK MIGRATION ENGINE
    // ==========================================
    migrateLegacyStock: async () => {
        try {
            const items = await getAllRecords('items');
            let migratedCount = 0;
            
            for (const item of items) {
                // If it's an old product that hasn't been split into buckets yet...
                if (item.gstStock === undefined && item.nonGstStock === undefined && item.stock !== undefined) {
                    // Safely move the old generic stock into the Account (GST) bucket
                    item.gstStock = parseFloat(item.stock) || 0;
                    item.nonGstStock = 0;
                    await saveRecord('items', item);
                    migratedCount++;
                }
            }
            
            if (migratedCount > 0) {
                console.log(`Migrated ${migratedCount} legacy products to the Dual-Engine.`);
                if (window.AppCache) window.AppCache.items = null; // Wipe cache to load the fixed items
                if (window.Utils) window.Utils.showToast(`Upgraded ${migratedCount} old products to new Inventory Engine! 🚀`);
            }
        } catch (e) {
            console.error("Migration failed:", e);
        }
    },

    // ==========================================
    // ⚡ NEW: SILENT DATABASE SANITIZER ENGINE
    // ==========================================
    sanitizeDatabase: async () => {
        try {
            const items = await getAllRecords('items');
            let fixed = 0;
            for (let i of items) {
                let changed = false;
                
                // Destroy nulls and force them to pure 0
                if (i.gstStock === 'null' || i.gstStock === null || isNaN(i.gstStock)) { i.gstStock = 0; changed = true; }
                if (i.nonGstStock === 'null' || i.nonGstStock === null || isNaN(i.nonGstStock)) { i.nonGstStock = 0; changed = true; }
                if (i.uom === 'null' || i.uom === 'undefined' || !i.uom) { i.uom = 'Units'; changed = true; }
                
                if (changed) { 
                    // Mathematically repair the shadow stock just in case
                    i.stock = ((parseFloat(i.gstStock) || 0) + (parseFloat(i.nonGstStock) || 0));
                    await saveRecord('items', i); 
                    fixed++; 
                }
            }
            if (fixed > 0) {
                console.log(`Sanitizer Complete: Silently cleaned ${fixed} corrupted products!`);
                if (window.AppCache) window.AppCache.items = null; // Wipe cache so the clean data loads instantly
            }
        } catch (e) {
            console.error("Sanitizer failed:", e);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: DATA DEDUPLICATION ENGINE
    // ==========================================
    cleanupDuplicates: async () => {
        try {
            let cleaned = false;
            const ledgers = await getAllRecords('ledgers');
            const accounts = await getAllRecords('accounts');
            const sales = await getAllRecords('sales');
            const purchases = await getAllRecords('purchases');
            const receipts = await getAllRecords('receipts');

            // 1. Merge Duplicate Customers & Suppliers
            const ledgerMap = {};
            for (const l of ledgers) {
                if (l.firmId !== app.state.firmId) continue;
                const key = `${(l.name || '').trim().toLowerCase()}_${l.type}`;
                
                if (!ledgerMap[key]) {
                    ledgerMap[key] = l;
                } else {
                    const master = ledgerMap[key];
                    // Mathematically combine opening balances so no money is lost
                    master.openingBalance = (parseFloat(master.openingBalance) || 0) + (parseFloat(l.openingBalance) || 0);
                    await saveRecord('ledgers', master);

                    // Safely remap all connected documents to the master ID
                    for (const s of sales) { if (s.customerId === l.id) { s.customerId = master.id; await saveRecord('sales', s); } }
                    for (const p of purchases) { if (p.supplierId === l.id) { p.supplierId = master.id; await saveRecord('purchases', p); } }
                    for (const r of receipts) { if (r.ledgerId === l.id) { r.ledgerId = master.id; await saveRecord('receipts', r); } }
                    
                    // Delete the ghost copy
                    await deleteRecordById('ledgers', l.id);
                    cleaned = true;
                }
            }

            // 2. Merge Duplicate Bank Accounts & Enforce Official Cash Drawer
            const accMap = {};
            let realCash = accounts.find(a => a.id === 'cash' && a.firmId === app.state.firmId);

            for (const a of accounts) {
                if (a.firmId !== app.state.firmId) continue;
                const key = (a.name || '').trim().toLowerCase();
                
                // --- ENTERPRISE FIX: DESTROY FAKE CASH DRAWERS ---
                // If the backup contains a manually created "Cash Drawer", merge it into the System 'cash' ID
                if ((key === 'cash drawer' || key === 'cash' || key === 'default cash drawer') && a.id !== 'cash') {
                    if (!realCash) {
                        realCash = { id: 'cash', firmId: app.state.firmId, name: 'Cash Drawer', openingBalance: 0 };
                    }
                    // Mathematically transfer the money to prevent data loss
                    realCash.openingBalance = (parseFloat(realCash.openingBalance) || 0) + (parseFloat(a.openingBalance) || 0);
                    await saveRecord('accounts', realCash);

                    // Safely remap all transactions to the official cash drawer
                    for (const r of receipts) { if (r.accountId === a.id) { r.accountId = 'cash'; await saveRecord('receipts', r); } }
                    
                    // Delete the ghost copy
                    await deleteRecordById('accounts', a.id);
                    cleaned = true;
                    continue; // Skip the rest of the loop for this fake record
                }

                if (a.id === 'cash') continue; // Now safely skip the real one
                
                if (!accMap[key]) {
                    accMap[key] = a;
                } else {
                    const master = accMap[key];
                    master.openingBalance = (parseFloat(master.openingBalance) || 0) + (parseFloat(a.openingBalance) || 0);
                    await saveRecord('accounts', master);

                    for (const r of receipts) { if (r.accountId === a.id) { r.accountId = master.id; await saveRecord('receipts', r); } }
                    
                    await deleteRecordById('accounts', a.id);
                    cleaned = true;
                }
            }

            if (cleaned) {
                if (window.Utils) window.Utils.showToast("Database optimized: Duplicates merged! 🧹");
                await app.loadAllData(); // Reload clean data into RAM
            }
        } catch (e) {
            console.error("Cleanup failed:", e);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: LIVE STOCK LEDGER ENGINE
    // ==========================================
    openStockLedger: async (itemId) => {
        if(window.app && typeof window.app.viewStockLedger === 'function') {
            return window.app.viewStockLedger(itemId);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: STOCK ADJUSTMENT ENGINE
    // ==========================================
    openAdjustmentSheet: async () => {
        try {
            const items = await getAllRecords('items');
            const select = document.getElementById('adj-product-id');
            
            if (!items || items.length === 0) {
                alert("Please add at least one Product in Inventory first!");
                return;
            }

            // Populate the dropdown with actual products and their current stock
            let html = '<option value="">Select Product...</option>';
            items.forEach(i => {
                if (i.firmId === app.state.firmId) {
                    html += `<option value="${i.id}">${i.name} (Cur Stock: ${parseFloat(i.stock || 0).toFixed(2)})</option>`;
                }
            });
            
            // CRASH-PROOF SHIELD: Only update elements if they actually exist in the HTML!
            if (select) select.innerHTML = html;
            
            const qtyEl = document.getElementById('adj-qty');
            if (qtyEl) qtyEl.value = '';
            
            const notesEl = document.getElementById('adj-notes');
            if (notesEl) notesEl.value = '';
            
            const dateEl = document.getElementById('adj-date');
            if (dateEl) dateEl.value = window.Utils ? window.Utils.getLocalDate() : new Date().toISOString().split('T')[0];

            // Safely open the sheet
            if (window.UI) window.UI.openBottomSheet('sheet-stock-adjustment');
        } catch (error) {
            // LOUD ERROR SCANNER: Forces the app to tell you EXACTLY what crashed!
            console.error("Error opening adjustment sheet:", error);
            alert("CRASH DETAILS: " + error.message);
        }
    },

    // ==========================================
    // NEW: SIMPLE MASTER CRUD ENGINE
    // ==========================================
    loadDropdowns: async () => {
        // 1. Auto-seed and Load Units
        let units = await getAllRecords('units');
        if (units.length === 0) {
            const defaults = ['Pcs', 'Kg', 'Mtr', 'Ltr', 'Box', 'Dozen', 'Tonnes'];
            for (let u of defaults) await saveRecord('units', { id: Utils.generateId(), name: u });
            units = await getAllRecords('units');
        }
        const uomSelect = document.getElementById('product-uom-select');
        if (uomSelect) uomSelect.innerHTML = units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');

        // 2. Auto-seed and Load Categories
        let cats = await getAllRecords('expenseCategories');
        if (cats.length === 0) {
            const defaults = ['Salary', 'Rent', 'Electricity', 'Transport', 'Office Supplies', 'Marketing', 'Maintenance', 'Other'];
            for (let c of defaults) await saveRecord('expenseCategories', { id: Utils.generateId(), name: c });
            cats = await getAllRecords('expenseCategories');
        }
        const catSelect = document.getElementById('expense-category-select');
        if (catSelect) catSelect.innerHTML = '<option value="">Select Category...</option>' + cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    // ==========================================
    // ENTERPRISE UPGRADE: PROFESSIONAL MASTER MANAGER
    // ==========================================
    manageSimpleMaster: async (storeName, title) => {
        document.getElementById('simple-master-title').innerText = `Manage ${title}`;
        const inputEl = document.getElementById('simple-master-input');
        if (inputEl) inputEl.value = '';
        
        const renderList = async () => {
            const records = await getAllRecords(storeName);
            const listEl = document.getElementById('simple-master-list');
            if (listEl) {
                listEl.innerHTML = records.map(r => `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--md-outline-variant);">
                        <span style="font-weight: 500; color: var(--md-on-surface);">${r.name}</span>
                        <span class="material-symbols-outlined tap-target" style="color: var(--md-error); padding: 4px;" onclick="app.deleteSimpleMasterItem('${storeName}', '${r.id}')">delete</span>
                    </li>
                `).join('');
            }
        };

        // Bind the new Add Button dynamically
        const addBtn = document.getElementById('btn-add-simple-master');
        if (addBtn) {
            addBtn.onclick = async () => {
                const val = inputEl.value.trim();
                if (!val) return;
                
                const existing = await getAllRecords(storeName);
                if (existing.some(e => e.name.toLowerCase() === val.toLowerCase())) {
                    return alert("This item already exists!");
                }

                await saveRecord(storeName, { id: Utils.generateId(), name: val });
                inputEl.value = ''; // Clear input for rapid adding
                if (window.Utils) window.Utils.showToast("Added Successfully! ✅");
                await renderList(); // Instantly update the list UI
                app.loadDropdowns(); // Instantly update the background dropdowns
            };
        }

        await renderList();
        if (window.UI) window.UI.openBottomSheet('sheet-simple-master');
    },

    deleteSimpleMasterItem: async (storeName, id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        await deleteRecordById(storeName, id);
        if (window.Utils) window.Utils.showToast("Deleted Successfully! 🗑️");
        
        // Rapid re-render of the list inside the open bottom sheet
        const records = await getAllRecords(storeName);
        const listEl = document.getElementById('simple-master-list');
        if (listEl) {
            listEl.innerHTML = records.map(r => `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--md-outline-variant);">
                    <span style="font-weight: 500; color: var(--md-on-surface);">${r.name}</span>
                    <span class="material-symbols-outlined tap-target" style="color: var(--md-error); padding: 4px;" onclick="app.deleteSimpleMasterItem('${storeName}', '${r.id}')">delete</span>
                </li>
            `).join('');
        }
        
        app.loadDropdowns(); // Update background dropdowns instantly
    },

    // ==========================================
    // UPGRADE: BULK CSV IMPORT ENGINE
    // ==========================================
    downloadCSVTemplate: () => {
        const type = UI.state.currentMasterType;
        let csvContent = "";
        let filename = "";

        if (type === 'products') {
            csvContent = "Name,SellPrice,BuyPrice,OpeningStock,MinStock,UOM,GST_Percent,HSN_Code\n\"Premium Widget\",150.50,100,50,5,Pcs,18,123456\n\"Standard Item\",200,150,20,2,Kg,5,654321";
            filename = "SOLLO_Products_Template.csv";
        } else if (type === 'customers' || type === 'suppliers') {
            const partyType = type === 'customers' ? 'Customer' : 'Supplier';
            csvContent = `Name,Phone,GSTIN,City,State,Address,OpeningBalance,BalanceType\n"Acme Corp",9876543210,29ABCDE1234F1Z5,Bangalore,Karnataka,"123 Main St, Tech Park",1500,${partyType === 'Customer' ? 'To Receive' : 'To Pay'}\n"Global Traders",1234567890,,,Tamil Nadu,,0,Advance`;
            filename = `SOLLO_${partyType}s_Template.csv`;
        }

        if (csvContent && window.Utils) {
            window.Utils.downloadFile(csvContent, filename, "text/csv");
            window.Utils.showToast("Template Downloaded!");
        }
    },

    handleCSVImport: async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const type = UI.state.currentMasterType;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                
                // FIX: Bulletproof CSV Parser that gracefully handles line-breaks INSIDE quotes
                const parseCSV = (str) => {
                    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
                    for (l of str) {
                        if ('"' === l) { if (s && l === p) row[i] += l; s = !s; }
                        else if (',' === l && s) l = row[++i] = '';
                        else if ('\n' === l && s) {
                            if ('\r' === p) row[i] = row[i].slice(0, -1);
                            row = ret[++r] = [l = '']; i = 0;
                        } else row[i] += l;
                        p = l;
                    }
                    return ret.map(row => row.map(col => col.trim().replace(/^"|"$/g, ''))).filter(row => row.length > 1 || row[0] !== '');
                };

                const parsedData = parseCSV(text);
                if (parsedData.length < 2) throw new Error("File is empty or invalid format.");

                const headers = parsedData[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
                const rows = parsedData; // Map the new parser to the existing logic loop
                
                const parseCSVRow = (row) => row; // Bypass the old regex parser since we already parsed the whole file
                
                let successCount = 0;

                if (window.Utils) window.Utils.showToast("Importing records, please wait...");
                
                // FIX: Fetch existing database records ONCE outside the loop to prevent massive freezing!
                const existingItems = type === 'products' ? await getAllRecords('items') : [];
                const existingLedgers = (type === 'customers' || type === 'suppliers') ? await getAllRecords('ledgers') : [];
                
                for (let i = 1; i < rows.length; i++) {
                    const cols = parseCSVRow(rows[i]);
                    if (cols.length < 2 || !cols[0]) continue; // Skip bad rows

                    if (type === 'products') {
                        const nameIdx = headers.indexOf('name');
                        const sellIdx = headers.indexOf('sellprice');
                        const buyIdx = headers.indexOf('buyprice');
                        const stockIdx = headers.indexOf('openingstock');
                        const minStockIdx = headers.indexOf('minstock');
                        const uomIdx = headers.indexOf('uom');
                        const gstIdx = headers.indexOf('gstpercent');
                        const hsnIdx = headers.indexOf('hsncode');

                        if (nameIdx === -1 || !cols[nameIdx]) continue;

                        // NEW: Prevent duplicates by finding existing items by name
                        const match = existingItems.find(i => i.name.toLowerCase() === cols[nameIdx].toLowerCase() && i.firmId === app.state.firmId);

                        const data = {
                            id: match ? match.id : Utils.generateId(),
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            sellPrice: parseFloat(cols[sellIdx]) || 0,
                            buyPrice: parseFloat(cols[buyIdx]) || 0,
                            // DUAL ENGINE FIX: Route CSV imports to the Account (GST) bucket by default
                            gstStock: match ? (parseFloat(match.gstStock) || 0) : (parseFloat(cols[stockIdx]) || 0),
                            nonGstStock: match ? (parseFloat(match.nonGstStock) || 0) : 0,
                            stock: match ? match.stock : (parseFloat(cols[stockIdx]) || 0),
                            minStock: parseFloat(cols[minStockIdx]) || 0,
                            uom: cols[uomIdx] || 'Pcs',
                            gst: parseFloat(cols[gstIdx]) || 0,
                            hsn: cols[hsnIdx] || ''
                        };
                        await saveRecord('items', data);
                        
                        // FIX: Update the memory array so if the CSV has the same item twice, it doesn't create a duplicate!
                        if (!match) existingItems.push(data);
                        else Object.assign(match, data);
                        
                        successCount++;
                    } 
                    else if (type === 'customers' || type === 'suppliers') {
                        const nameIdx = headers.indexOf('name');
                        const phoneIdx = headers.indexOf('phone');
                        const gstIdx = headers.indexOf('gstin');
                        const cityIdx = headers.indexOf('city');
                        const stateIdx = headers.indexOf('state');
                        const addrIdx = headers.indexOf('address');
                        const obIdx = headers.indexOf('openingbalance');
                        const typeIdx = headers.indexOf('balancetype');

                        if (nameIdx === -1 || !cols[nameIdx]) continue;

                        const pType = type === 'customers' ? 'Customer' : 'Supplier';
                        const balTypeRaw = cols[typeIdx] ? cols[typeIdx].toLowerCase() : '';
                        let balType = pType === 'Customer' ? 'To Receive / Debit' : 'To Pay / Credit';
                        
                        if (balTypeRaw.includes('pay') || balTypeRaw.includes('credit')) balType = 'To Pay / Credit';
                        else if (balTypeRaw.includes('receive') || balTypeRaw.includes('debit')) balType = 'To Receive / Debit';

                        // FIX: Search the pre-loaded memory array instead of querying the database on every single row!
                        const match = existingLedgers.find(l => l.firmId === app.state.firmId && l.type === pType && 
                            (l.name.toLowerCase() === cols[nameIdx].toLowerCase() || (cols[phoneIdx] && l.phone === cols[phoneIdx]))
                        );

                        const data = {
                            id: match ? match.id : Utils.generateId(), // Re-use ID if they already exist
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            type: pType,
                            phone: cols[phoneIdx] || '',
                            gst: cols[gstIdx] ? cols[gstIdx].toUpperCase() : '',
                            city: cols[cityIdx] || '',
                            state: cols[stateIdx] || '',
                            address: cols[addrIdx] || '',
                            openingBalance: parseFloat(cols[obIdx]) || 0,
                            balanceType: balType
                        };
                        await saveRecord('ledgers', data);
                        
                        // FIX: Push the new party into memory so if the CSV has the same name twice, it doesn't duplicate!
                        if (!match) existingLedgers.push(data);
                        else Object.assign(match, data);

                        successCount++;
                    }
                }
                
                alert(`✅ Successfully imported ${successCount} records!`);
                event.target.value = ''; // Reset file input
                
                // ENTERPRISE FIX: Wipe RAM Cache so the newly imported CSV data appears instantly!
                if (window.AppCache) {
                    window.AppCache.items = null;
                    window.AppCache.ledgers = null;
                }
                
                app.refreshAll();
            } catch (err) {
                console.error(err);
                alert("Error importing CSV. Please ensure you are using the correct template.");
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    },

    // ==========================================
    // 3. LEDGER & RETURNS ENGINE
    // ==========================================
    openPartyLedger: async (partyId, partyType, partyName) => {
        document.getElementById('report-party-name').innerText = partyName;
        const timelineContainer = document.getElementById('timeline-list');
        
        // UPGRADE 3: Inject Skeleton Loaders instead of text
        timelineContainer.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card" style="animation-delay: 0.1s"></div><div class="skeleton-card" style="animation-delay: 0.2s"></div>';
        
        // NEW: Bind the edit button to the currently open party
        const editBtn = document.getElementById('btn-edit-ledger');
        if(editBtn) editBtn.onclick = () => { 
            UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
            setTimeout(() => app.openForm('ledger', partyId), 150); // Open the form smoothly
        };
        
        UI.openActivity('activity-report-viewer');

        try {
            const statement = await getKhataStatement(partyId, partyType);
            
            // BULLETPROOF MATH: Filter out Draft Invoices to perfectly match the Address Book!
            const validTimeline = [];
            let runningBal = 0;
            
            statement.timeline.forEach(t => {
                if (t.isInvoice && t.id !== 'open-bal') {
                    const doc = partyType === 'Customer' ? 
                        UI.state.rawData.sales.find(s => s.id === t.id) : 
                        UI.state.rawData.purchases.find(p => p.id === t.id);
                    if (doc && doc.status === 'Open') return; // Skip Drafts completely!
                }
                runningBal += (t.impact || 0);
                t.runningBalance = runningBal;
                validTimeline.push(t);
            });
            
            statement.timeline = validTimeline;
            const bal = runningBal; // Use the true calculated balance

            const balEl = document.getElementById('report-party-balance');
            let balText = '';
            let balColor = 'var(--md-text-muted)';

            if (partyType === 'Customer') {
                if (bal > 0.01) { balText = `Closing Balance: \u20B9${bal.toFixed(2)} (To Receive)`; balColor = 'var(--md-error)'; }
                else if (bal < -0.01) { balText = `Closing Balance: \u20B9${Math.abs(bal).toFixed(2)} (Advance)`; balColor = 'var(--md-success)'; }
                else { balText = `Closing Balance: \u20B90.00`; balColor = 'var(--md-on-surface)'; }
            } else {
                if (bal > 0.01) { balText = `Closing Balance: \u20B9${bal.toFixed(2)} (To Pay)`; balColor = 'var(--md-error)'; }
                else if (bal < -0.01) { balText = `Closing Balance: \u20B9${Math.abs(bal).toFixed(2)} (Advance)`; balColor = 'var(--md-success)'; }
                else { balText = `Closing Balance: \u20B90.00`; balColor = 'var(--md-on-surface)'; }
            }
            
            balEl.innerText = balText;
            balEl.style.color = balColor;

            // Move state assignment ABOVE the early return to clear previous memory!
            UI.state.rawData.timeline = statement.timeline;

            const emptyHTML = '<p class="empty-state">No transactions found for this party.</p>';
            
            UI.renderVirtualList(timelineContainer, statement.timeline, (t) => {
                const isPayment = !t.isInvoice && t.id !== 'open-bal';
                const icon = t.id === 'open-bal' ? 'account_balance' : (isPayment ? 'payments' : 'receipt_long');
                const iconBg = t.id === 'open-bal' ? '#e3f2fd' : (isPayment ? '#e8f5e9' : '#fff0f2');
                const iconColor = t.id === 'open-bal' ? '#0061a4' : (isPayment ? '#2e7d32' : '#ba1a1a');
                const amtColor = t.isInvoice ? 'var(--md-error)' : 'var(--md-success)';
                
                let clickAction = '';
                let tapClass = '';
                if (t.id !== 'open-bal') {
                    tapClass = 'tap-target';
                    if (isPayment) {
                        const type = (partyType === 'Customer') ? (t.impact < 0 ? 'in' : 'out') : (t.impact > 0 ? 'in' : 'out');
                        clickAction = `onclick="app.openReceipt('${t.id}', '${type}')"`;
                    } else {
                        const doc = partyType === 'Customer' ? UI.state.rawData.sales.find(s => s.id === t.id) : UI.state.rawData.purchases.find(p => p.id === t.id);
                        const docType = doc ? doc.documentType : 'invoice';
                        const formType = partyType === 'Customer' ? 'sales' : 'purchase';
                        clickAction = `onclick="app.openForm('${formType}', '${t.id}', '${docType}')"`;
                    }
                }

                return `
                <div class="m3-card ${tapClass}" ${clickAction} style="display:flex; align-items:center; gap: 12px; padding: 12px; margin-bottom: 8px;">
                    <div class="icon-circle" style="background: ${iconBg}; color: ${iconColor}; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
                    </div>
                    <div style="flex: 1;">
                        <strong class="large-text">${t.desc}</strong><br>
                        <small style="color: var(--md-text-muted);">${t.date}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="font-size: 14px; color: ${amtColor};">${t.isInvoice ? '+' : '-'}\u20B9${(t.amount || 0).toFixed(2)}</strong><br>
                        <small style="color: var(--md-text-muted);">Bal: \u20B9${(t.runningBalance || 0).toFixed(2)}</small>
                    </div>
                </div>`;
            }, emptyHTML);

            const chips = document.querySelectorAll('#activity-report-viewer .filter-chips .chip');
            if(chips.length > 0) {
                chips.forEach(c => c.classList.remove('active'));
                chips[0].classList.add('active'); 
            }
            UI.state.activeFilters['timeline'] = 'All';

        } catch (error) {
            console.error("Error loading ledger:", error);
            timelineContainer.innerHTML = '<p class="empty-state" style="color:var(--md-error);">Failed to load statement.</p>';
        }
    },
        openAccountLedger: async (accountId) => {
        // Fetch Account Details
        let account = { name: 'Cash Drawer', openingBalance: 0 };
        if (accountId !== 'cash') {
            account = await getRecordById('accounts', accountId) || account;
        }

        document.getElementById('report-party-name').innerText = account.name;
        const timelineContainer = document.getElementById('timeline-list');
        
        // UPGRADE 3: Inject Skeleton Loaders instead of text
        timelineContainer.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card" style="animation-delay: 0.1s"></div><div class="skeleton-card" style="animation-delay: 0.2s"></div>';
        
        // Bind the Edit Button in the top right corner
        const editBtn = document.getElementById('btn-edit-ledger');
        if(editBtn) {
            if(accountId === 'cash') {
                editBtn.onclick = () => alert('The Default Cash Drawer is a system account and cannot be modified directly.');
            } else {
                editBtn.onclick = () => { 
                    UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
                    setTimeout(() => app.openForm('account', accountId), 150); // Open the form smoothly
                };
            }
        }
        
        UI.openActivity('activity-report-viewer');

        try {
            let openingBalance = parseFloat(account.openingBalance) || 0;
            let timeline = [];

            if (openingBalance !== 0) {
                timeline.push({
                    id: 'open-bal',
                    date: 'Opening',
                    desc: 'Opening Balance',
                    amount: Math.abs(openingBalance),
                    impact: openingBalance,
                    isInvoice: false
                });
            }

            const receipts = await getAllRecords('receipts');
            const firmId = app.state.firmId;
            
            // Filter out only the transactions for this specific Bank/Cash account
            const accountReceipts = receipts.filter(r => {
                if (r.firmId !== firmId) return false;
                if (accountId === 'cash') return r.accountId === 'cash' || !r.accountId;
                return r.accountId === accountId;
            });

            accountReceipts.forEach(r => {
                const isMoneyIn = r.type === 'in';
                const impact = isMoneyIn ? parseFloat(r.amount) : -parseFloat(r.amount);
                
                // FIX: Translate cross-linked Invoice/PO/Expense IDs into readable numbers for Bank Verification
                let displayRefs = '';
                if (r.invoiceRef) {
                    const refs = String(r.invoiceRef).split(',').map(x => x.trim());
                    const names = refs.map(ref => {
                        const s = UI.state.rawData.sales.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.orderNo === ref);
                        if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                        
                        const p = UI.state.rawData.purchases.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.poNo === ref || doc.orderNo === ref);
                        if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                        
                        const e = UI.state.rawData.expenses.find(doc => doc.id === ref || doc.expenseNo === ref);
                        if (e) {
                            if (e.linkedInvoice) {
                                const eLinks = String(e.linkedInvoice).split(',').map(x => x.trim());
                                const eNames = eLinks.map(el => {
                                    const s = UI.state.rawData.sales.find(doc => doc.id === el || doc.invoiceNo === el || doc.orderNo === el);
                                    if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                                    const p = UI.state.rawData.purchases.find(doc => doc.id === el || doc.invoiceNo === el || doc.poNo === el || doc.orderNo === el);
                                    if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                                    return el.startsWith('sollo-') ? el.slice(-4).toUpperCase() : el;
                                });
                                return (e.expenseNo || String(e.id).slice(-4).toUpperCase()) + ' (🔗 ' + eNames.join(', ') + ')';
                            }
                            return e.expenseNo || String(e.id).slice(-4).toUpperCase();
                        }
                        
                        return ref.startsWith('sollo-') ? ref.slice(-4).toUpperCase() : ref;
                    });
                    displayRefs = [...new Set(names)].join(', ');
                }
                
                let finalRef = r.ref || '';
                if (displayRefs) {
                    finalRef = finalRef ? `${finalRef} | Docs: ${displayRefs}` : `Docs: ${displayRefs}`;
                }

                timeline.push({
                    id: r.id,
                    date: r.date,
                    // UPGRADE: Prepend the custom receipt/voucher number for even better tracking
                    desc: r.receiptNo ? `${r.receiptNo} - ${r.desc || (isMoneyIn ? 'Money In' : 'Money Out')}` : (r.desc || (isMoneyIn ? 'Money In' : 'Money Out')),
                    partyName: r.ledgerName || '',
                    amount: parseFloat(r.amount),
                    impact: impact,
                    isInvoice: false,
                    ref: finalRef // This automatically passes into the PDF engine!
                });
            });

            // Sort chronologically (BULLETPROOF)
            timeline.sort((a, b) => {
                if (a.id === 'open-bal') return -1;
                if (b.id === 'open-bal') return 1;
                return String(a.date || '').localeCompare(String(b.date || ''));
            });

            // Calculate Running Balance
            let runningBalance = 0;
            timeline.forEach(t => {
                runningBalance += t.impact;
                t.runningBalance = runningBalance;
            });

            const balEl = document.getElementById('report-party-balance');
            balEl.innerText = `Available Balance: \u20B9${runningBalance.toFixed(2)}`;
            balEl.style.color = runningBalance >= 0 ? 'var(--md-success)' : 'var(--md-error)';

            // Move state assignment ABOVE the early return!
            UI.state.rawData.timeline = timeline; // Hooks into your existing PDF generator!

            const emptyHTML = '<p class="empty-state">No transactions found for this account.</p>';
            
            UI.renderVirtualList(timelineContainer, timeline, (t) => {
                const isPaymentOut = t.impact < 0;
                const icon = t.id === 'open-bal' ? 'account_balance' : (isPaymentOut ? 'arrow_upward' : 'arrow_downward');
                const iconBg = t.id === 'open-bal' ? '#e3f2fd' : (isPaymentOut ? '#fff0f2' : '#e8f5e9');
                const iconColor = t.id === 'open-bal' ? '#0061a4' : (isPaymentOut ? '#ba1a1a' : '#2e7d32');
                const amtColor = isPaymentOut ? 'var(--md-error)' : 'var(--md-success)';
                const sign = isPaymentOut ? '-' : '+';
                
                let clickAction = '';
                let tapClass = '';
                if (t.id !== 'open-bal') {
                    tapClass = 'tap-target';
                    const type = isPaymentOut ? 'out' : 'in';
                    clickAction = `onclick="app.openReceipt('${t.id}', '${type}')"`;
                }

                return `
                <div class="m3-card ${tapClass}" ${clickAction} style="display:flex; align-items:center; gap: 12px; padding: 12px; margin-bottom: 8px;">
                    <div class="icon-circle" style="background: ${iconBg}; color: ${iconColor}; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
                    </div>
                    <div style="flex: 1;">
                        <strong class="large-text">${t.desc}</strong><br>
                        <small style="color: var(--md-text-muted);">${t.date} ${t.partyName ? '| ' + t.partyName : ''} ${t.ref ? '<br><span style="color:var(--md-primary); font-size:10px; font-weight:bold;">Ref: ' + t.ref + '</span>' : ''}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="font-size: 14px; color: ${amtColor};">${sign}\u20B9${Math.abs(t.amount || 0).toFixed(2)}</strong><br>
                        <small style="color: var(--md-text-muted);">Bal: \u20B9${(t.runningBalance || 0).toFixed(2)}</small>
                    </div>
                </div>`;
            }, emptyHTML);

            // Reset filters
            const chips = document.querySelectorAll('#activity-report-viewer .filter-chips .chip');
            if(chips.length > 0) {
                chips.forEach(c => c.classList.remove('active'));
                chips[0].classList.add('active'); 
            }
            UI.state.activeFilters['timeline'] = 'All';

        } catch (error) {
            console.error("Error loading account ledger:", error);
            timelineContainer.innerHTML = '<p class="empty-state" style="color:var(--md-error);">Failed to load statement.</p>';
        }
    },


    loadOriginalDocuments: (partyId, type) => {
        if (app.state.currentDocType !== 'return') return;

        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const rawData = storeName === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
        const partyKey = type === 'sales' ? 'customerId' : 'supplierId';

        const validInvoices = rawData.filter(doc => 
            doc[partyKey] === partyId && 
            doc.documentType !== 'return' && 
            doc.status !== 'Open'
        );

        const selectEl = document.getElementById(`${type}-original-ref`);
        if (selectEl) {
            const options = validInvoices.map(doc => 
                `<option value="${doc.id}">${doc.invoiceNo || doc.poNo} (${doc.date}) - \u20B9${doc.grandTotal}</option>`
            ).join('');
            selectEl.innerHTML = options ? `<option value="">Select Original Document...</option>` + options : `<option value="">No valid invoices found.</option>`;
        }
    },

    loadReturnItems: async (originalDocId, type) => {
        if (!originalDocId) return;
        
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const originalDoc = await getRecordById(storeName, originalDocId);
        if (!originalDoc) return;

        const allDocs = storeName === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
        const previousReturns = allDocs.filter(d => d.documentType === 'return' && d.orderNo === originalDoc.invoiceNo);
        
        const returnedQtyMap = {};
        previousReturns.forEach(ret => {
            ret.items.forEach(item => {
                returnedQtyMap[item.itemId] = (returnedQtyMap[item.itemId] || 0) + parseFloat(item.qty);
            });
        });

        const tbody = document.getElementById(`${type}-items-body`);
        tbody.innerHTML = ''; 

        originalDoc.items.forEach(item => {
            const previouslyReturned = returnedQtyMap[item.itemId] || 0;
            const maxAllowable = parseFloat(item.qty) - previouslyReturned;

            if (maxAllowable > 0) {
                const itemCard = document.createElement('div');
                itemCard.className = 'item-entry-card m3-card';
                itemCard.style.padding = '14px';
                itemCard.style.marginBottom = '12px';
                itemCard.style.borderLeft = type === 'sales' ? '4px solid var(--md-error)' : '4px solid var(--md-success)';
                
                const hiddenInputs = `
                    <input type="hidden" class="row-item-id" value="${item.itemId}">
                    <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="row-uom" value="${item.uom || ''}">
                    <input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">
                `;

                itemCard.innerHTML = `
                    ${hiddenInputs}
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="font-weight:600; font-size:15px; color:var(--md-on-surface); flex:1; line-height:1.3;">
                            ${item.name}
                            <div style="font-size:11px; color:var(--md-error); margin-top:2px; font-weight:bold;">Max Return: ${maxAllowable}</div>
                            <div style="font-size:11px; color:var(--md-text-muted); font-weight:normal; margin-top:2px;">HSN: <input type="text" class="row-hsn" value="${item.hsn || ''}" style="border:none; background:transparent; width:60px; color:inherit;" readonly></div>
                        </div>
                        <span class="material-symbols-outlined tap-target" style="color:var(--md-error); font-size:22px; padding:4px; margin-right:-4px; margin-top:-4px;" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()">delete</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Return Qty</small>
                            <input type="number" inputmode="decimal" class="row-qty" value="0" min="0" max="${maxAllowable}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-error); border-radius:6px; background:var(--md-surface); font-size:14px; font-weight:bold; color:var(--md-error);">
                        </div>
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Orig Rate</small>
                            <input type="number" inputmode="decimal" class="row-rate" value="${item.rate}" step="any" readonly style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface-variant); font-size:14px; pointer-events:none;">
                        </div>
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">GST %</small>
                            <input type="number" inputmode="decimal" class="row-gst" value="${item.gstPercent || 0}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; align-items:flex-end; padding-top:8px; border-top:1px dashed var(--md-surface-variant);">
                        <div style="text-align:right;">
                            <small style="color:var(--md-text-muted); font-size:11px;">Total Refund (₹)</small><br>
                            <strong class="row-total" style="font-size:18px; color:var(--md-error);">0.00</strong>
                        </div>
                    </div>
                `;
                tbody.appendChild(itemCard);
            }
        });
        
        const orderNoEl = document.getElementById(`${type}-order-no`);
        if (orderNoEl) orderNoEl.value = originalDoc.invoiceNo;
        
        // DUAL-ENGINE FIX: Make sure the return goes into the exact same stock bucket!
        const invTypeEl = document.getElementById(`${type}-invoice-type`);
        if (invTypeEl && originalDoc.invoiceType) {
            invTypeEl.value = originalDoc.invoiceType;
        }
        
        type === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
    },
    loadPendingInvoices: async (partyId, type) => {
        const isMoneyIn = type === 'in';
        const storeName = isMoneyIn ? 'sales' : 'purchases';
        const partyKey = isMoneyIn ? 'customerId' : 'supplierId';
        const selectId = isMoneyIn ? 'pay-in-invoice-ref' : 'pay-out-invoice-ref';
        
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        
        if (!partyId) {
            selectEl.innerHTML = '<option value="">On Account / Advance</option>';
            return;
        }

        const allDocs = await getAllRecords(storeName);
        const activeFirmId = app.state ? app.state.firmId : 'firm1';
        
        // ⚡ FIX 1: LIVE RETURN DEDUCTIONS (Credit/Debit Notes)
        const returnsMap = {};
        allDocs.forEach(d => {
            if (d.firmId === activeFirmId && d[partyKey] === partyId && d.documentType === 'return' && d.status !== 'Open') {
                if (d.orderNo) {
                    returnsMap[d.orderNo] = (returnsMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                }
            }
        });

        // ⚡ FIX 2: SMART PROPORTIONAL PAYMENT ALLOCATION
        const receipts = await getAllRecords('receipts');
        const paymentMap = {};
        
        receipts.forEach(c => {
            // 🛑 ENTERPRISE CRITICAL FIX: Ignore the receipt currently being edited so we don't hide its own balances!
            if (c.id === app.state.currentReceiptId) return;

            if (c.firmId === activeFirmId && c.invoiceRef && c.ledgerId === partyId) {
                let amt = parseFloat(c.amount) || 0;
                if (storeName === 'sales') amt = c.type === 'in' ? amt : -amt;
                if (storeName === 'purchases') amt = c.type === 'out' ? amt : -amt;
                
                const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                if (refs.length > 0) {
                    let totalInvoiceValue = 0;
                    const linkedDocs = [];
                    
                    refs.forEach(ref => {
                        const doc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref);
                        const val = doc ? (parseFloat(doc.grandTotal) || 0) : 0;
                        totalInvoiceValue += val;
                        linkedDocs.push({ ref, val });
                    });

                    if (totalInvoiceValue > 0) {
                        linkedDocs.forEach(ld => {
                            const proportion = ld.val / totalInvoiceValue;
                            paymentMap[ld.ref] = (paymentMap[ld.ref] || 0) + (amt * proportion);
                        });
                    } else {
                        let splitAmt = amt / refs.length;
                        refs.forEach(r => paymentMap[r] = (paymentMap[r] || 0) + splitAmt);
                    }
                }
            }
        });

        const pendingDocs = allDocs.filter(doc => {
            if (doc.firmId !== activeFirmId || doc[partyKey] !== partyId) return false;
            if (doc.status === 'Open' || doc.documentType === 'return') return false;
            
            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
            
            const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
            const returnedAmt = uniqueRefs.reduce((sum, ref) => sum + (returnsMap[ref] || 0), 0);
            
            // Subtract both partial payments AND returns from the grand total
            const balance = (parseFloat(doc.grandTotal) || 0) - paid - returnedAmt;
            doc._trueBalance = balance; 
            
            // 🛑 CRITICAL FIX: Ensure currently linked invoices stay visible in the dropdown even if their balance is 0!
            let isCurrentlyLinked = false;
            if (app.state.currentReceiptId) {
                const activeReceipt = receipts.find(r => r.id === app.state.currentReceiptId);
                if (activeReceipt && activeReceipt.invoiceRef) {
                    const activeRefs = String(activeReceipt.invoiceRef).split(',').map(x => x.trim());
                    isCurrentlyLinked = uniqueRefs.some(r => activeRefs.includes(r));
                }
            }
            
            return balance > 0.01 || isCurrentlyLinked; 
        });

        if (pendingDocs.length === 0) {
            selectEl.innerHTML = '<option value="">No pending invoices (On Account)</option>';
        } else {
            const options = pendingDocs.map(doc => {
                const balance = doc._trueBalance;
                const docNo = (isMoneyIn ? (doc.orderNo || doc.invoiceNo) : (doc.orderNo || doc.poNo || doc.invoiceNo)) || doc.id;
                
                let displayNo = '';
                if (isMoneyIn) displayNo = doc.orderNo || doc.invoiceNo || String(doc.id).slice(-4).toUpperCase();
                else displayNo = doc.orderNo || doc.poNo || doc.invoiceNo || String(doc.id).slice(-4).toUpperCase();
                
                return `<option value="${docNo}" data-bal="${balance.toFixed(2)}">${displayNo} (Due: \u20B9${balance.toFixed(2)})</option>`;
            }).join('');
            selectEl.innerHTML = '<option value="">On Account / Advance</option>' + options;
        }
    },

    // ==========================================
    // 4. FORM INITIALIZATION & ROUTING
    // ==========================================
    openForm: async (type, id = null, docType = 'invoice') => {
        try {
            UI.closeAllBottomSheets();
            
            // --- ENTERPRISE UPGRADE: NESTED MEMORY SHIELD ---
            // Do NOT overwrite memory if we are opening a Master form on top of an active invoice!
            const salesOpen = document.getElementById('activity-sales-form')?.classList.contains('open');
            const purchOpen = document.getElementById('activity-purchase-form')?.classList.contains('open');
            const isMaster = (type === 'ledger' || type === 'product' || type === 'account');
            
            if (!(isMaster && (salesOpen || purchOpen))) {
                app.state.currentEditId = id;
                app.state.currentDocType = docType;
            }
            // ------------------------------------------------
            
            const form = document.getElementById(`form-${type}`);
            if(form) {
                form.reset();
                // Wipe ghost images from previous sessions
                form.querySelectorAll('img').forEach(img => {
                    img.src = '';
                    img.classList.add('hidden');
                });
            }
            
            // Hide delete buttons for new records
            UI.toggleDeleteButton(type, !!id);

            // Hide Stock Ledger button for new records
            if (type === 'product') {
                const histBtn = document.getElementById('btn-view-stock-ledger');
                if (histBtn) histBtn.classList.add('hidden');
            }

            if (type === 'sales' || type === 'purchase') {
                document.getElementById(`${type}-items-body`).innerHTML = '';
                document.getElementById(`${type}-subtotal`).innerText = '\u20B90.00';
                document.getElementById(`${type}-gst-total`).innerText = '\u20B90.00';
                document.getElementById(`${type}-grand-total`).innerText = '\u20B90.00';
                document.getElementById(`${type}-${type === 'sales' ? 'customer' : 'supplier'}-display`).innerText = `Select ${type === 'sales' ? 'Customer' : 'Supplier'}...`;
                document.getElementById(`${type}-${type === 'sales' ? 'customer' : 'supplier'}-display`).style.color = 'var(--md-text-muted)';
                
                // NEW: Hide payment history when creating a brand new record
                const historyCard = document.getElementById(`${type}-payment-history-card`);
                if (historyCard) historyCard.classList.add('hidden');
                const expenseCard = document.getElementById(`${type}-expense-history-card`);
                if (expenseCard) expenseCard.classList.add('hidden');
                const titleEl = document.getElementById(`form-title-${type}`);
                const btnEl = document.getElementById(`btn-save-${type}`);
                const headerEl = document.getElementById(`activity-${type}-form`).querySelector('.activity-header');

                if (docType === 'return') {
                    if (titleEl) titleEl.innerText = id ? `Edit ${type === 'sales' ? 'Credit Note' : 'Debit Note'}` : `New ${type === 'sales' ? 'Credit Note' : 'Debit Note'}`;
                    if (btnEl) btnEl.innerText = `Save ${type === 'sales' ? 'Credit Note' : 'Debit Note'}`;
                    if (headerEl) headerEl.style.backgroundColor = type === 'sales' ? '#fff0f2' : '#e8f5e9';
                    
                    const refGroup = document.getElementById(`${type}-return-ref-group`);
                    if (refGroup) refGroup.classList.remove('hidden');
                } else {
                    if (titleEl) titleEl.innerText = id ? `Edit ${type === 'sales' ? 'Sales Invoice' : 'Purchase Bill'}` : `New ${type === 'sales' ? 'Sales Invoice' : 'Purchase Bill'}`;
                    if (btnEl) btnEl.innerText = `Save ${type === 'sales' ? 'Invoice' : 'Purchase'}`;
                    if (headerEl) headerEl.style.backgroundColor = 'var(--md-surface)';
                    
                    const refGroup = document.getElementById(`${type}-return-ref-group`);
                    if (refGroup) refGroup.classList.add('hidden');
                }
                
                UI.toggleDates(type);
            }

            if (id) {
                await app.populateEditForm(type, id);
            } else {
                const dateInput = document.getElementById(`${type}-date`);
                if(dateInput && typeof Utils !== 'undefined' && Utils.getLocalDate) {
                    dateInput.value = Utils.getLocalDate();
                    if (dateInput._flatpickr) dateInput._flatpickr.setDate(Utils.getLocalDate()); // FIX: Sync Flatpickr
                }
                
                // Injecting the Editable Auto-Numbering Engine
                if (type === 'sales' && typeof getNextDocumentNumber === 'function') {
                    const prefix = docType === 'return' ? 'CN' : 'INV';
                    document.getElementById('sales-invoice-no').value = await getNextDocumentNumber('sales', prefix);
                    document.getElementById('sales-order-no').value = await getNextDocumentNumber('sales', 'ORD', 'orderNo');
                } else if (type === 'purchase' && typeof getNextDocumentNumber === 'function') {
                    document.getElementById('purchase-po-no').value = ''; 
                    document.getElementById('purchase-order-no').value = await getNextDocumentNumber('purchases', 'PO', 'orderNo');
                }

                // ==========================================
                // ⚡ DELTA-DRAFT ENGINE: THE REHYDRATOR
                // Intercepts new forms and restores lost data
                // ==========================================
                if ((type === 'sales' || type === 'purchase') && docType !== 'return') {
                    const draftStr = localStorage.getItem(`sollo_draft_${type}`);
                    if (draftStr) {
                        // Wait 400ms for the form slide-up animation to finish before showing the prompt
                        setTimeout(async () => {
                            if (confirm(`You have an unsaved ${type === 'sales' ? 'Invoice' : 'Bill'} draft. Would you like to restore it?`)) {
                                try {
                                    const draft = JSON.parse(draftStr);
                                    
                                    // 1. Restore the Party (Customer/Supplier)
                                    const partyKey = type === 'sales' ? 'customer' : 'supplier';
                                    const partyIdKey = type === 'sales' ? 'customerId' : 'supplierId';
                                    const partyNameKey = type === 'sales' ? 'customerName' : 'supplierName';
                                    
                                    if (draft[partyIdKey]) {
                                        document.getElementById(`${type}-${partyKey}-id`).value = draft[partyIdKey];
                                        document.getElementById(`${type}-${partyKey}-display`).innerText = draft[partyNameKey] || 'Restored Party';
                                        document.getElementById(`${type}-${partyKey}-display`).style.color = 'var(--md-on-surface)';
                                    }

                                    // 2. Restore Form Settings (Discount, Freight, Notes)
                                    const form = document.getElementById(`form-${type}`);
                                    for (const key in draft) {
                                        if (key !== 'items' && form.elements[key]) {
                                            form.elements[key].value = draft[key];
                                            if (form.elements[key]._flatpickr) form.elements[key]._flatpickr.setDate(draft[key]);
                                        }
                                    }

                                    // 3. Rebuild the Items List
                                    if (draft.items && draft.items.length > 0) {
                                        const tbody = document.getElementById(`${type}-items-body`);
                                        tbody.innerHTML = ''; // Clear default blank row
                                        
                                        draft.items.forEach(item => {
                                            if (!item.name) return; // Skip empty rows
                                            const itemCard = document.createElement('div');
                                            itemCard.className = 'item-entry-card m3-card';
                                            itemCard.style.padding = '14px';
                                            itemCard.style.marginBottom = '12px';
                                            itemCard.style.borderLeft = type === 'sales' ? '4px solid var(--md-primary)' : '4px solid #f57f17';
                                            
                                            itemCard.innerHTML = `
                                                <input type="hidden" class="row-item-id" value="${item.itemId || ''}">
                                                <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                                                <input type="hidden" class="row-uom" value="${item.uom || ''}">
                                                <input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">
                                                
                                                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                                    <div style="font-weight:600; font-size:15px; color:var(--md-on-surface); flex:1;">
                                                        ${item.name}
                                                        <div style="font-size:11px; color:var(--md-text-muted); font-weight:normal; margin-top:2px;">HSN: <input type="text" class="row-hsn" value="${item.hsn || ''}" style="border:none; background:transparent; width:60px; color:inherit;" readonly></div>
                                                    </div>
                                                    <span class="material-symbols-outlined tap-target" style="color:var(--md-error); font-size:22px; padding:4px;" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()">delete</span>
                                                </div>
                                                
                                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                                                    <div>
                                                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Qty</small>
                                                        <input type="number" class="row-qty" value="${item.qty}" min="0.01" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                                                    </div>
                                                    <div>
                                                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Rate</small>
                                                        <input type="number" class="row-rate" value="${item.rate}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                                                    </div>
                                                    <div>
                                                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">GST %</small>
                                                        <input type="number" class="row-gst" value="${item.gstPercent || 0}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                                                    </div>
                                                </div>
                                                <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:8px; border-top:1px dashed var(--md-surface-variant);">
                                                    <div style="display:flex; gap:8px;">
                                                        ${type === 'sales' ? `
                                                        <div>
                                                            <small style="color:var(--md-text-muted); font-size:10px; display:block;">Buy Price</small>
                                                            <input type="number" inputmode="decimal" class="row-item-buyprice" value="${item.buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:70px; padding:4px 6px; font-size:11px; border:1px solid var(--md-outline-variant); background:var(--md-surface); border-radius:4px;">
                                                        </div>
                                                        ` : `<input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">`}
                                                    </div>
                                                    <div style="text-align:right;">
                                                        <small style="color:var(--md-text-muted); font-size:11px;">Total (₹)</small><br>
                                                        <strong class="row-total" style="font-size:18px; color:var(--md-on-surface);">0.00</strong>
                                                    </div>
                                                </div>
                                                ${type === 'sales' ? `<small class="live-margin" style="font-size:10px; display:block; margin-top:8px; text-align:right;"></small>` : ''}
                                            `;
                                            tbody.appendChild(itemCard);
                                        });
                                    }
                                    
                                    // 4. Trigger UI Recalculation
                                    type === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
                                    if (window.Utils) window.Utils.showToast("Draft Restored Successfully! ♻️");
                                    
                                } catch (e) {
                                    console.error("Failed to restore draft:", e);
                                    localStorage.removeItem(`sollo_draft_${type}`); // Draft is corrupted, silently destroy it
                                }
                            } else {
                                // User clicked "Cancel", silently destroy the ghost draft
                                localStorage.removeItem(`sollo_draft_${type}`);
                            }
                        }, 400); 
                    }
                }
            }
            
            // NEW: Expense form specific logic
            if (type === 'expense') {
                if (!id && typeof getNextDocumentNumber === 'function') {
                    document.getElementById('expense-no').value = await getNextDocumentNumber('expenses', 'EXP', 'expenseNo');
                }
                
                // Reset the display label
                const displayEl = document.getElementById('expense-linked-display');
                if (displayEl) {
                    displayEl.innerText = '-- No Link (General Expense) --';
                    displayEl.style.color = 'var(--md-text-muted)';
                }
                
                // Build the new search screen
                if (typeof app.loadLinkedDocsList === 'function') app.loadLinkedDocsList();
            }
            
            UI.openActivity(`activity-${type}-form`);
            
        } catch (error) {
            console.error("CRITICAL ROUTING ERROR:", error);
            alert("Error opening form: " + error.message);
        }
    },

    // ==========================================
    // 5. EDIT MODE HYDRATION
    // ==========================================
    populateEditForm: async (type, id) => {
        // FIXED: Added 'account': 'accounts' to ensure bank records can be retrieved for editing
        const storeMap = { 'product': 'items', 'ledger': 'ledgers', 'expense': 'expenses', 'sales': 'sales', 'purchase': 'purchases', 'account': 'accounts' };
        const record = await getRecordById(storeMap[type], id);
        if (!record) return;

        if (type === 'sales' || type === 'purchase') {
            const setDateSafe = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    if (el._flatpickr) el._flatpickr.setDate(val); // FIX: Sync Flatpickr
                }
            };
            setDateSafe(`${type}-date`, record.date || '');
            setDateSafe(`${type}-order-date`, record.orderDate || '');
            setDateSafe(`${type}-shipped-date`, record.shippedDate || '');
            setDateSafe(`${type}-completed-date`, record.completedDate || '');
            document.getElementById(`${type}-order-no`).value = record.orderNo || '';
            document.getElementById(`${type}-order-status`).value = record.status || 'Completed';
            document.getElementById(`${type}-freight`).value = record.freightAmount || 0;
            document.getElementById(`${type}-discount`).value = record.discount || 0;
            
            const discTypeEl = document.getElementById(`${type}-discount-type`);
            if (discTypeEl) discTypeEl.value = record.discountType || '\u20B9';
            
            const invTypeEl = document.getElementById(`${type}-invoice-type`);
            if (invTypeEl) invTypeEl.value = record.invoiceType || 'B2B';

            const notesEl = document.getElementById(`${type}-internal-notes`);
            if (notesEl) notesEl.value = record.internalNotes || '';

            // ⚡ CUSTOM FIELD ENGINE: Hydrate dynamic fields back onto the screen
            const formObj = document.getElementById(`form-${type}`);
            if (formObj) {
                for (const key in record) {
                    if (key.startsWith('custom_') && formObj.elements[key]) {
                        formObj.elements[key].value = record[key];
                    }
                }
            }

            const partyKey = type === 'sales' ? 'customer' : 'supplier';
            const partyIdKey = type === 'sales' ? 'customerId' : 'supplierId';
            const partyNameKey = type === 'sales' ? 'customerName' : 'supplierName';
            
            document.getElementById(`${type}-${partyKey}-id`).value = record[partyIdKey] || '';
            document.getElementById(`${type}-${partyKey}-display`).innerText = record[partyNameKey] || `Select ${type === 'sales' ? 'Customer' : 'Supplier'}...`;
            document.getElementById(`${type}-${partyKey}-display`).style.color = 'var(--md-on-surface)';

            if (type === 'sales') {
                document.getElementById('sales-invoice-no').value = record.invoiceNo || '';
                // Removed the deleted instant payment fields from the hydration engine
            } else {
                document.getElementById('purchase-po-no').value = record.invoiceNo || record.poNo || '';
                // Removed the deleted instant payment fields from the hydration engine
            }

            const tbody = document.getElementById(`${type}-items-body`);
            tbody.innerHTML = '';

            // --- FETCH RETURN MAX ALLOWABLE LOGIC ---
            let returnedQtyMap = {};
            let originalDoc = null;
            if (record.documentType === 'return' && record.orderNo) {
                const allDocs = storeMap[type] === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
                originalDoc = allDocs.find(d => (d.invoiceNo === record.orderNo || d.poNo === record.orderNo) && d.documentType !== 'return');
                const previousReturns = allDocs.filter(d => d.documentType === 'return' && d.orderNo === record.orderNo && d.id !== record.id);
                previousReturns.forEach(ret => ret.items.forEach(i => returnedQtyMap[i.itemId] = (returnedQtyMap[i.itemId] || 0) + parseFloat(i.qty)));
            }
            // FLEXIBLE MODE: Unlocked for easy editing of typos!
            (record.items || []).forEach(item => {
                let maxHtml = 'min="0.01" step="any"';
                let maxLabel = '';
                
                if (record.documentType === 'return' && originalDoc) {
                    const origItem = originalDoc.items.find(i => i.itemId === item.itemId);
                    if (origItem) {
                        const maxAllowable = parseFloat(origItem.qty) - (returnedQtyMap[item.itemId] || 0);
                        maxHtml = `min="0" max="${maxAllowable}" step="any"`;
                        maxLabel = `<div style="font-size:11px; color:var(--md-error); margin-top:2px; font-weight:bold;">Max Return: ${maxAllowable}</div>`;
                    }
                }

                const itemCard = document.createElement('div');
                itemCard.className = 'item-entry-card m3-card';
                itemCard.style.padding = '14px';
                itemCard.style.marginBottom = '12px';
                itemCard.style.borderLeft = type === 'sales' ? '4px solid var(--md-primary)' : '4px solid #f57f17';
                
                const hiddenInputs = `
                    <input type="hidden" class="row-item-id" value="${item.itemId}">
                    <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="row-uom" value="${item.uom || ''}">
                `;

                itemCard.innerHTML = `
                    ${hiddenInputs}
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="font-weight:600; font-size:15px; color:var(--md-on-surface); flex:1; line-height:1.3;">
                            ${item.name}
                            ${maxLabel}
                            <div style="font-size:11px; color:var(--md-text-muted); font-weight:normal; margin-top:2px;">HSN: <input type="text" class="row-hsn" value="${item.hsn || ''}" style="border:none; background:transparent; width:60px; color:inherit;" readonly></div>
                        </div>
                        <span class="material-symbols-outlined tap-target" style="color:var(--md-error); font-size:22px; padding:4px; margin-right:-4px; margin-top:-4px;" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()">delete</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Qty (${item.uom || 'Unit'})</small>
                            <input type="number" inputmode="decimal" class="row-qty" value="${item.qty}" ${maxHtml} oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                        </div>
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Rate (₹)</small>
                            <input type="number" inputmode="decimal" class="row-rate" value="${item.rate}" step="any" ${record.documentType === 'return' ? 'readonly style="background:var(--md-surface-variant) !important;"' : ''} oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                        </div>
                        <div>
                            <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">GST %</small>
                            <input type="number" inputmode="decimal" class="row-gst" value="${item.gstPercent || 0}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:8px; border-top:1px dashed var(--md-surface-variant);">
                        <div style="display:flex; gap:8px;">
                            ${type === 'sales' && record.documentType !== 'return' ? `
                            <div>
                                <small style="color:var(--md-text-muted); font-size:10px; display:block;">Buy Price</small>
                                <input type="number" inputmode="decimal" class="row-item-buyprice" value="${item.buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:70px; padding:4px 6px; font-size:11px; border:1px solid var(--md-outline-variant); background:var(--md-surface); border-radius:4px;">
                            </div>
                            ` : `<input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">`}
                        </div>
                        <div style="text-align:right;">
                            <small style="color:var(--md-text-muted); font-size:11px;">Total (₹)</small><br>
                            <strong class="row-total" style="font-size:18px; color:var(--md-on-surface);">0.00</strong>
                        </div>
                    </div>
                    ${type === 'sales' && record.documentType !== 'return' ? `<small class="live-margin" style="font-size:10px; display:block; margin-top:8px; text-align:right;"></small>` : ''}
                `;
                tbody.appendChild(itemCard);
            });
            if (record.documentType === 'return') {
                const refEl = document.getElementById(`${type}-original-ref`);
                if (refEl) {
                    refEl.innerHTML = `<option value="">${record.orderNo || 'Linked Reference'}</option>`;
                    refEl.disabled = true; 
                }
            }

            type === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
            UI.toggleDates(type);

            // NEW: Fetch and Display all Linked Receipts / Vouchers
            const historyCard = document.getElementById(`${type}-payment-history-card`);
            const historyList = document.getElementById(`${type}-payment-history-list`);
            if (historyCard && historyList) {
                // FIX: Check ALL references to catch cross-linked payments in the history view!
                const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
                const partyId = type === 'sales' ? record.customerId : record.supplierId;
                const allReceipts = await getAllRecords('receipts');
                
                const linkedReceipts = allReceipts.filter(r => {
                    if (r.firmId !== app.state.firmId || r.ledgerId !== partyId) return false;
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    return refs.some(ref => uniqueRefs.includes(ref));
                });

                if (linkedReceipts.length > 0) {
                    historyCard.classList.remove('hidden');
                    historyList.innerHTML = linkedReceipts.map(r => {
                        // Split the display amount if it's a multi-invoice payment
                        const refCount = String(r.invoiceRef || '').split(',').length || 1;
                        const splitAmt = (parseFloat(r.amount) || 0) / refCount;
                        return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed var(--md-outline-variant);">
                            <div><div style="font-weight:bold; color:var(--md-primary);">${r.receiptNo || (r.isAutoGenerated ? 'Auto-Generated Receipt' : 'Manual Receipt')}</div><small style="color:var(--md-text-muted);">${r.date} | Mode: ${r.mode}</small></div>
                            <div style="font-weight:bold; font-size:16px; color:${type === 'sales' ? 'var(--md-success)' : 'var(--md-error)'};">${type === 'sales' ? '+' : '-'}&#8377;${splitAmt.toFixed(2)}</div>
                        </div>`;
                    }).join('');
                } else {
                    historyCard.classList.add('hidden');
                    historyList.innerHTML = '';
                }
            }

            // NEW: Fetch and Display all Linked Expenses (Job Costing)
            const expCard = document.getElementById(`${type}-expense-history-card`);
            const expList = document.getElementById(`${type}-expense-history-list`);
            if (expCard && expList) {
                const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
                const allExpenses = await getAllRecords('expenses');
                // FIX: Trim whitespace and check against ALL possible IDs to prevent broken links!
                const linkedExpenses = allExpenses.filter(e => {
                    if (e.firmId !== app.state.firmId || !e.linkedInvoice) return false;
                    const cleanLinks = e.linkedInvoice.split(',').map(link => link.trim());
                    return cleanLinks.some(link => uniqueRefs.includes(link));
                });

                if (linkedExpenses.length > 0) {
                    expCard.classList.remove('hidden');
                    expList.innerHTML = linkedExpenses.map(e => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed var(--md-outline-variant);">
                            <div><div style="font-weight:bold; color:var(--md-error);">${e.expenseNo || 'EXP'} - ${e.category}</div><small style="color:var(--md-text-muted);">${e.date} | ${e.notes || 'No notes'}</small></div>
                            <div style="font-weight:bold; font-size:16px; color:var(--md-error);">\u20B9${parseFloat(e.amount).toFixed(2)}</div>
                        </div>
                    `).join('');
                } else {
                    expCard.classList.add('hidden');
                    expList.innerHTML = '';
                }
            }

        } else {
            const form = document.getElementById(`form-${type}`);
            if(!form) return;
            const elements = form.elements;
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (el.name && record[el.name] !== undefined) {
                    if (el.type === 'checkbox') {
                        el.checked = record[el.name];
                    } else {
                        // ⚡ BULLETPROOF SHIELD: Prevent "null" ghost text from corrupting math inputs!
                        let val = record[el.name];
                        if (val === 'null' || val === 'undefined' || val === null) val = '';
                        
                        el.value = val;
                        if (el._flatpickr) el._flatpickr.setDate(val); // FIX: Sync Flatpickr dynamically
                    }
                }
            }
            
            // Recover images so they aren't erased on save
            if (type === 'product') {
                if (record.image) {
                    const img = document.getElementById('product-image-preview');
                    if (img) { img.src = record.image; img.classList.remove('hidden'); }
                }
                // ENTERPRISE UX: Auto-calculate the Live Total Badge on Edit!
                const badge = document.getElementById('prod-total-stock-badge');
                if (badge) badge.innerText = ((parseFloat(record.gstStock) || 0) + (parseFloat(record.nonGstStock) || 0)).toFixed(2);
                
                // ENTERPRISE UX: Unhide the Stock Ledger Button
                const histBtn = document.getElementById('btn-view-stock-ledger');
                if (histBtn) {
                    histBtn.classList.remove('hidden');
                    // ⚡ FIX: Redirect to the NEW Audit Ledger Engine
                    histBtn.onclick = () => app.viewStockLedger(id); 
                }
            }
            if (type === 'expense') {
                if (record.attachment) {
                    const img = document.getElementById('expense-attachment-preview');
                    if (img) { img.src = record.attachment; img.classList.remove('hidden'); }
                }
                // NEW: Recover the document names for the UI Display (Multi-Link)
                if (record.linkedInvoice) {
                    const links = record.linkedInvoice.split(',').map(x => x.trim()).filter(x => x);
                    const displayNames = links.map(linkId => {
                        // SELF-HEALING: Catch broken fragments like '8965' or '0778'
                        const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || s.id.endsWith(linkId));
                        const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || p.id.endsWith(linkId));
                        
                        if (sDoc) return sDoc.orderNo || sDoc.invoiceNo || sDoc.id.slice(-4).toUpperCase();
                        if (pDoc) return pDoc.orderNo || pDoc.poNo || pDoc.invoiceNo || pDoc.id.slice(-4).toUpperCase();
                        
                        return linkId.startsWith('sollo-') ? linkId.slice(-4).toUpperCase() : linkId;
                    });
                    
                    const displayEl = document.getElementById('expense-linked-display');
                    if(displayEl) {
                        // SELF-HEALING: Remove duplicates
                        displayEl.innerText = [...new Set(displayNames)].join(' | ');
                        displayEl.style.color = 'var(--md-primary)';
                    }
                }
            }
        }
    },

    // ==========================================
    // 6. MASTER FORM SUBMISSIONS & EVENT LISTENERS
    // ==========================================
    setupForms: () => {
        // ------------------ SALES & PURCHASE SUBMISSIONS ------------------
        // ENTERPRISE ARCHITECTURE: Sales and Purchases have been decoupled into Micro-Plugins!
        // No monolithic submission logic needed here anymore.

        // ------------------ GENERAL CRUD FORMS ------------------
        // ENTERPRISE ARCHITECTURE: Master Data Forms have been decoupled into the CrudPlugin!

        // ------------------ STOCK ADJUSTMENT SUBMISSION ------------------
                const adjForm = document.getElementById('form-stock-adjustment');
        if (adjForm) {
            adjForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // FIXED: Button locking implemented to prevent duplicate stock adjustments
                const submitBtn = adjForm.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerText : 'Save Adjustment';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving...";
                    submitBtn.style.opacity = "0.7";
                }

                try {
                    const itemId = document.getElementById('adj-product-id').value;
                    if (!itemId) throw new Error("Please select a product.");
                    
                    const type = document.getElementById('adj-type').value;
                    const qty = parseFloat(document.getElementById('adj-qty').value) || 0;
                    const bucket = document.getElementById('adj-bucket') ? document.getElementById('adj-bucket').value : 'gst'; // NEW: Identify Bucket
                    
                    const item = await getRecordById('items', itemId);
                    if (!item) throw new Error("Product not found in database.");
                    
                    // Initialize buckets safely
                    item.gstStock = parseFloat(item.gstStock) || 0;
                    item.nonGstStock = parseFloat(item.nonGstStock) || 0;
                    
                    const currentBucketStock = bucket === 'non-gst' ? item.nonGstStock : item.gstStock;
                    const bucketName = bucket === 'non-gst' ? 'Non-GST' : 'Account (GST)';
                    
                    if (type === 'reduce') {
                        if (currentBucketStock - qty < 0) {
                            if (!confirm(`Warning: This will drop your ${bucketName} stock below zero (Current: ${currentBucketStock}). Continue anyway?`)) {
                                return; 
                            }
                        }
                    }
                    
                    const adjData = {
                        id: Utils.generateId(),
                        firmId: app.state.firmId,
                        itemId: itemId,
                        type: type,
                        bucket: bucket, // NEW: Track which bucket was adjusted
                        qty: qty,
                        date: document.getElementById('adj-date').value,
                        notes: document.getElementById('adj-notes').value
                    };
                    
                    // Apply math to the specific bucket
                    const rawNewStock = currentBucketStock + (type === 'add' ? qty : -qty);
                    if (bucket === 'non-gst') {
                        item.nonGstStock = Math.round(rawNewStock * 100) / 100;
                    } else {
                        item.gstStock = Math.round(rawNewStock * 100) / 100;
                    }
                    
                    // SHADOW SYNC: Roll up into master total
                    item.stock = Math.round((item.gstStock + item.nonGstStock) * 100) / 100;
                    
                    await saveRecord('adjustments', adjData);
                    await saveRecord('items', item);
                    
                    alert("Stock adjusted successfully!");
                    UI.closeBottomSheet('sheet-stock-adjustment');
                    app.refreshAll();
                } catch (error) {
                    alert(error.message || "An error occurred while saving.");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalText;
                        submitBtn.style.opacity = "1";
                    }
                }
            });
        }

        // ------------------ BUSINESS PROFILE SUBMISSION ------------------
        const profileForm = document.getElementById('form-business-profile');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    firmId: app.state.firmId,
                    name: document.getElementById('profile-name').value,
                    phone: document.getElementById('profile-phone').value,
                    email: document.getElementById('profile-email').value,
                    gst: document.getElementById('profile-gst').value,
                    address: document.getElementById('profile-address').value,
                    state: document.getElementById('profile-state').value,
                    bankDetails: document.getElementById('profile-bank').value,
                    terms: document.getElementById('profile-terms').value
                };

                const logoImg = document.getElementById('profile-logo-preview');
                if (logoImg && !logoImg.classList.contains('hidden')) data.logo = await window.compressImage(logoImg.src);

                const sigImg = document.getElementById('profile-signature-preview');
                if (sigImg && !sigImg.classList.contains('hidden')) data.signature = await window.compressImage(sigImg.src);

                await saveRecord('businessProfile', data);
                
                const firmRecord = await getRecordById('firms', app.state.firmId) || { id: app.state.firmId };
                firmRecord.name = data.name;
                firmRecord.phone = data.phone;
                firmRecord.email = data.email;
                firmRecord.gst = data.gst;
                firmRecord.address = data.address;
                firmRecord.state = data.state;
                await saveRecord('firms', firmRecord);

                alert("Business Profile Saved Successfully!");
                UI.closeActivity('activity-business-profile');
            });
        }

        // ------------------ MANUAL RECEIPT SUBMISSIONS ------------------
        // ENTERPRISE ARCHITECTURE: Cashbook has been decoupled into the ReceiptPlugin!
    },

      openNewPayment: async (type) => {
        app.state.currentReceiptId = null;
        const form = document.getElementById(`form-payment-${type}`);
        if (form) {
            form.reset();
            const dateInput = document.getElementById(`pay-${type}-date`);
            if (dateInput && typeof Utils !== 'undefined') {
                dateInput.value = Utils.getLocalDate();
                if (dateInput._flatpickr) dateInput._flatpickr.setDate(Utils.getLocalDate());
            }

            // NEW: Unified Template Engine connection for Receipts & Vouchers
            const prefix = type === 'in' ? 'REC' : 'VOU';
            if (typeof getNextDocumentNumber === 'function') {
                const nextNo = await getNextDocumentNumber('receipts', prefix, 'receiptNo');
                const noInput = document.getElementById(`pay-${type}-no`);
                if (noInput) noInput.value = nextNo;
            }
        }
        UI.toggleDeleteButton(`receipt-${type}`, false);
        UI.openBottomSheet(`sheet-payment-${type}`);
    },

    // ==========================================
    // CASHBOOK EDIT & DELETE ENGINE
    // ==========================================
    openReceipt: async (id, type) => {
        const record = await getRecordById('receipts', id);
        if (!record) return alert("Receipt not found.");

        // SAFEGUARD: Prevent tampering with invoice-linked auto-receipts
        if (record.isAutoGenerated) {
            return alert("This is an auto-generated receipt linked to a document. To modify or delete it, please edit the original invoice or bill.");
        }

        app.state.currentReceiptId = id;
        
        await UI.openBottomSheet(`sheet-payment-${type}`);
        
        setTimeout(async () => {
            // Restore the custom document number (Fallback to ID for older unpatched records)
            const noInput = document.getElementById(`pay-${type}-no`);
            if (noInput) noInput.value = record.receiptNo || String(record.id).substring(0, 12).toUpperCase();

            document.getElementById(`pay-${type}-date`).value = record.date || '';
            
            // UPGRADE: Hydrate the new custom Tap-to-Select UI display
            const partyInput = document.getElementById(type === 'in' ? 'pay-in-customer' : 'pay-out-supplier');
            const partyDisplay = document.getElementById(type === 'in' ? 'pay-in-customer-display' : 'pay-out-supplier-display');
            
            if (partyInput) partyInput.value = record.ledgerId || '';
            if (partyDisplay) {
                partyDisplay.innerText = record.ledgerName || 'Unknown Party';
                partyDisplay.style.color = 'var(--md-on-surface)';
            }
            
            if (partyInput) {
                // NEW: Load the pending invoices into the dropdown for the selected party
                await app.loadPendingInvoices(record.ledgerId, type);
                                const invoiceRefEl = document.getElementById(`pay-${type}-invoice-ref`);
                if (invoiceRefEl && record.invoiceRef) {
                    const savedRefs = String(record.invoiceRef).split(',').map(r => r.trim());
                    const store = type === 'in' ? 'sales' : 'purchases';
                    const allDocs = await getAllRecords(store);

                    savedRefs.forEach(ref => {
                        // Check if this specific ref is already in the dropdown options
                        let optionExists = Array.from(invoiceRefEl.options).some(opt => opt.value === ref);
                        
                        // If not, it means it's fully paid and hidden, so we must inject it back
                        if (!optionExists) {
                            let displayRef = ref;
                            // SELF-HEALING: Map perfectly to Order No and catch ghost IDs!
                            const linkedDoc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref || d.id.endsWith(ref));
                            if (linkedDoc) {
                                if (type === 'in') {
                                    displayRef = linkedDoc.orderNo || linkedDoc.invoiceNo || String(linkedDoc.id).slice(-4).toUpperCase();
                                } else {
                                    displayRef = linkedDoc.orderNo || linkedDoc.poNo || linkedDoc.invoiceNo || String(linkedDoc.id).slice(-4).toUpperCase();
                                }
                            }
                            invoiceRefEl.innerHTML += `<option value="${ref}">${displayRef} (Fully Paid)</option>`;
                        }
                    });

                    // Loop through all options and natively select the ones that match our saved refs
                    Array.from(invoiceRefEl.options).forEach(opt => {
                        if (savedRefs.includes(opt.value)) {
                            opt.selected = true;
                        }
                    });
                }
            }
            
            document.getElementById(`pay-${type}-amount`).value = record.amount || 0;
            document.getElementById(`pay-${type}-mode`).value = record.mode || 'Cash';
            
            const accEl = document.getElementById(`pay-${type}-account`);
            if (accEl) accEl.value = record.accountId || 'cash';
            
            document.getElementById(`pay-${type}-ref`).value = record.ref || '';
            document.getElementById(`pay-${type}-notes`).value = record.desc || '';
            
            UI.toggleDeleteButton(`receipt-${type}`, true);
        }, 50);
    },

    // ==========================================
    // PO TO INVOICE CONVERTER
    // ==========================================
    convertPO: async (id) => {
        if (!confirm("Convert this Draft PO into a Completed Purchase Bill? This will officially add the items to your inventory and update your payable ledger.")) return;
        
        const record = await getRecordById('purchases', id);
        if (!record) return alert("Record not found.");

        record.status = 'Completed';
        const today = typeof Utils !== 'undefined' && Utils.getLocalDate ? Utils.getLocalDate() : new Date().toISOString().split('T')[0];
        record.completedDate = today;

        await saveInvoiceTransaction('purchases', record);
        
        alert("PO successfully converted to Purchase Bill!");
        app.refreshAll();
    },

    // ==========================================
    // AUTO-COMPLETE ADVANCE PAYMENT ENGINE
    // ==========================================
    autoCompleteInvoices: async (partyId, type) => {
        const isSales = (type === 'sales');
        const storeName = isSales ? 'sales' : 'purchases';
        const partyKey = isSales ? 'customerId' : 'supplierId';
        
        const allDocs = await getAllRecords(storeName);
        const allReceipts = await getAllRecords('receipts');
        
        // 1. Calculate total money received/paid for this party (including Advances)
        let totalPaid = 0;
        allReceipts.forEach(r => {
            if (r.firmId === app.state.firmId && r.ledgerId === partyId) {
                const amt = parseFloat(r.amount) || 0;
                if (isSales) totalPaid += (r.type === 'in' ? amt : -amt);
                else totalPaid += (r.type === 'out' ? amt : -amt);
            }
        });
        
        // 2. Sort documents chronologically (oldest first). Ignore Drafts!
        const partyDocs = allDocs.filter(d => d.firmId === app.state.firmId && d[partyKey] === partyId && d.documentType !== 'return' && d.status !== 'Open');
        partyDocs.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 3. Smart Allocation - Prioritize explicit payments first, then use FIFO for advances
        let remainingMoney = totalPaid;
        
        for (const doc of partyDocs) {
            const docTotal = parseFloat(doc.grandTotal) || 0;
            
            // Calculate if THIS specific invoice was explicitly paid via manual receipt
            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
            let explicitPaid = 0;
            allReceipts.forEach(r => {
                if (r.firmId === app.state.firmId && r.ledgerId === partyId) {
                    const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    if (rRefs.some(ref => uniqueRefs.includes(ref))) {
                        explicitPaid += (parseFloat(r.amount) || 0) / (rRefs.length || 1);
                    }
                }
            });
            
            // Mark completed if explicit payments cover it, OR if leftover FIFO advance covers it
            if (explicitPaid >= docTotal - 0.5 || remainingMoney >= docTotal - 0.5) { 
                remainingMoney -= docTotal; // Consume from global pool
                
                if (doc.status === 'Open') {
                    doc.status = 'Completed';
                    if (typeof Utils !== 'undefined' && Utils.getLocalDate) {
                        doc.completedDate = doc.completedDate || Utils.getLocalDate();
                    }
                    await saveRecord(storeName, doc); // Auto-save!
                }
            } else {
                remainingMoney -= Math.min(remainingMoney, docTotal);
            }
        }
    },

    // ==========================================
    // 7. ORPHAN PROTECTION & DELETION ENGINE
    // ==========================================
    deleteRecord: async (type) => {
        const id = type === 'receipt-in' || type === 'receipt-out' ? app.state.currentReceiptId : app.state.currentEditId;

        let storeMap = {
            'sales': 'sales', 'purchase': 'purchases',
            'product': 'items', 'ledger': 'ledgers',
            'expense': 'expenses', 'account': 'accounts',
            'receipt-in': 'receipts', 'receipt-out': 'receipts'
        };
        const storeName = storeMap[type];
        
        const record = await getRecordById(storeName, id);
        if(!record) return;

        let warningMsg = "Are you sure you want to delete this record?";
        if (type === 'sales' || type === 'purchase') {
            warningMsg = "Deleting this document will return all inventory to its previous state. Continue?";
        }

        if (!confirm(warningMsg)) return;

        // ORPHAN PROTECTION: Check for linked manual receipts safely
        if (type === 'sales' || type === 'purchase') {
            // FIX: Safely capture ALL possible linked IDs to prevent orphaned receipts
            const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
            const partyId = type === 'sales' ? record.customerId : record.supplierId;
            
            if (uniqueRefs.length > 0 && partyId) {
                const receipts = await getAllRecords('receipts');
                // Check if any of the manual receipt refs match ANY of the document's IDs
                const linkedManualReceipts = receipts.filter(r => {
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    return refs.some(ref => uniqueRefs.includes(ref)) && r.ledgerId === partyId && r.isAutoGenerated === false;
                });
                if (linkedManualReceipts.length > 0) {
                    if (!confirm(`Warning: This document has ${linkedManualReceipts.length} manual payment(s) linked to it. Delete them as well to keep the cashbook balanced?`)) {
                        return; // Abort the whole deletion if they cancel here to prevent imbalance
                    }
                    for (const r of linkedManualReceipts) {
                        await deleteRecordById('receipts', r.id);
                    }
                }
            }
        }

        // Clean up Cashbook if an Expense is deleted
        if (type === 'expense') {
            await deleteRecordById('receipts', 'exp-rec-' + id);
        }

        // Prevent Bank Account Deletion if transactions are tied to it
        if (type === 'account') {
            const allReceipts = await getAllRecords('receipts');
            const linkedTransactions = allReceipts.filter(r => r.accountId === id);
            if (linkedTransactions.length > 0) {
                return alert(`Cannot delete this account. It has ${linkedTransactions.length} transaction(s) linked to it in the Cashbook.`);
            }
        }

        // ENTERPRISE FIX: Prevent Ledger (Party) Deletion if they have active history!
        if (type === 'ledger') {
            const allSales = await getAllRecords('sales');
            const allPurchases = await getAllRecords('purchases');
            const allReceipts = await getAllRecords('receipts');
            
            const linkedSales = allSales.filter(s => s.customerId === id);
            const linkedPurchases = allPurchases.filter(p => p.supplierId === id);
            const linkedReceipts = allReceipts.filter(r => r.ledgerId === id);
            
            const totalLinked = linkedSales.length + linkedPurchases.length + linkedReceipts.length;
            if (totalLinked > 0) {
                return alert(`Cannot delete this party. They have ${totalLinked} document(s) linked to them. To protect your financial reports, please delete their documents first, or just edit the party and rename them to "Inactive".`);
            }
        }

        // ⚡ DOUBLE-ENTRY REVERSAL: Destroy the linked Journal Entry for the Payment
        if (type === 'receipt-in' || type === 'receipt-out' || type === 'expense') {
            try {
                // If it's an expense, the receipt ID has 'exp-rec-' prepended to it
                let jrnId = 'JRN-' + id;
                if (type === 'expense') jrnId = 'JRN-exp-rec-' + id;
                
                await new Promise((res, rej) => {
                    const jt = db.transaction('journal', 'readwrite');
                    const jreq = jt.objectStore('journal').delete(jrnId);
                    jreq.onsuccess = res;
                    jreq.onerror = rej;
                });
            } catch(e) {}
        }

        // --- ENTERPRISE FIX: GHOST PAYMENT REVERSAL ENGINE ---
        // If you delete a receipt, it MUST un-link from the invoice and return it to "Open" status!
        if (type === 'receipt-in' || type === 'receipt-out') {
            if (record.invoiceRef) {
                const refs = String(record.invoiceRef).split(',').map(r => r.trim());
                const targetStore = type === 'receipt-in' ? 'sales' : 'purchases';
                const allDocs = await getAllRecords(targetStore);
                
                for (const ref of refs) {
                    const linkedDoc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref);
                    if (linkedDoc && linkedDoc.status === 'Completed') {
                        // Revert it back to Open! (The autoComplete engine will recalculate it on the next payment)
                        linkedDoc.status = 'Open';
                        linkedDoc.completedDate = '';
                        await saveRecord(targetStore, linkedDoc);
                    }
                }
            }
        }

        // ⚡ ENTERPRISE FIX: Defer ALL stock reversals, journal cleanup, and recycle bin routing 
        // to the secure `db.js` engine to prevent Double-Reversals and Data Corruption!
        await deleteRecordById(storeName, id);

        // ENTERPRISE FIX: Wipe RAM Cache so the deleted item instantly disappears from the UI!
        if (window.AppCache) {
            window.AppCache.items = null;
            window.AppCache.ledgers = null;
            window.AppCache.accounts = null;
        }

        if (type === 'sales' || type === 'purchase') UI.closeActivity(`activity-${type}-form`);
        else if (type === 'receipt-in' || type === 'receipt-out') UI.closeBottomSheet(`sheet-payment-${type.split('-')[1]}`);
        else UI.closeActivity(`activity-${type}-form`);
        
        app.refreshAll();
    },

    // ==========================================
    // ENTERPRISE UPGRADE: RECYCLE BIN RESTORE ENGINE
    // ==========================================
    restoreRecord: async (id, storeName) => {
        if (!confirm("Are you sure you want to restore this item?")) return;

        const record = await getRecordById('trash', id);
        
        if (record) {
            // ⚡ ENTERPRISE FIX: Use the secure database '_module' tag
            const targetStore = record._module || record.originalStore || storeName; 
            
            // Remove ALL trash tags to prevent ghost database pollution
            delete record.deletedAt;
            delete record.originalStore;
            delete record._module;
            delete record._deletedAt;
            
            // ⚡ ENTERPRISE FIX: Route documents through the financial transaction engine 
            // so Inventory Stock and Journal Entries are properly recreated!
            if (targetStore === 'sales' || targetStore === 'purchases') {
                await saveInvoiceTransaction(targetStore, record);
            } else {
                await saveRecord(targetStore, record); 
            }
            
            // Recreate the Cashbook entry if restoring an Expense
            if (targetStore === 'expenses') {
                const expenseReceipt = {
                    id: 'exp-rec-' + record.id,
                    firmId: record.firmId,
                    date: record.date,
                    ledgerId: 'internal-expense',
                    ledgerName: 'Internal Expense',
                    type: 'out',
                    amount: record.amount,
                    mode: 'Expense',
                    accountId: record.accountId || 'cash',
                    ref: '',
                    desc: `Expense: ${record.category}`,
                    isAutoGenerated: true,
                    invoiceRef: record.id 
                };
                await saveRecord('receipts', expenseReceipt);
            }
            
            // Remove it from the IndexedDB Trash Vault
            await deleteRecordById('trash', id);
            
            // ENTERPRISE FIX: Wipe RAM Cache so the restored item instantly reappears!
            if (window.AppCache) {
                window.AppCache.items = null;
                window.AppCache.ledgers = null;
                window.AppCache.accounts = null;
            }
            
            if (window.Utils) window.Utils.showToast("Record Restored Successfully! ♻️");
            app.refreshAll();
        } else {
            alert("Error: Could not find the record in the Recycle Bin.");
        }
    },

    permanentlyDeleteRecord: async (id) => {
        if (!confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) return;

        const record = await getRecordById('trash', id);
        if (record) {
            // Remove it from the IndexedDB Trash Vault permanently
            await deleteRecordById('trash', id);
            
            if (window.Utils) window.Utils.showToast("Record Permanently Deleted! 🗑️");
            app.refreshAll();
        } else {
            alert("Error: Could not find the record in the Recycle Bin.");
        }
    },

    // ==========================================
    // 8. LIVE A4 PDF PREVIEW ENGINE (UPGRADED)
    // ==========================================
    generatePDF: async (type) => {
        if (!app.state.currentEditId) return alert("Please save the document first.");
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const record = await getRecordById(storeName, app.state.currentEditId);
        if (!record) return;

        // ⚡ FIX: Fetch your actual Company Profile from the Database!
        const profile = await getRecordById('businessProfile', app.state.firmId) || {};
        
        // Build Data
        const isSales = type === 'sales';
        const firmName = profile.name || 'My Enterprise';
        const firmPhone = profile.phone || '';
        const partyName = isSales ? record.customerName : record.supplierName;
        const docNo = record.invoiceNo || record.poNo || record.orderNo || String(record.id).slice(-4).toUpperCase();
        const docTitle = isSales ? 'TAX INVOICE' : 'PURCHASE ORDER';
        
        // Build Item Rows
        let itemsHtml = '';
        (record.items || []).forEach((item, idx) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const total = qty * rate;
            itemsHtml += `
                <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <td style="padding: 10px 8px; color: #555;">${idx + 1}</td>
                    <td style="padding: 10px 8px;">
                        <strong style="color: #222;">${item.name}</strong>
                        ${item.hsn ? `<div style="font-size:10px; color:#888; margin-top:2px;">HSN: ${item.hsn}</div>` : ''}
                    </td>
                    <td style="padding: 10px 8px; text-align: center; color: #444;">${qty} <span style="font-size:10px;">${item.uom||''}</span></td>
                    <td style="padding: 10px 8px; text-align: right; color: #444;">${rate.toFixed(2)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #111;">${total.toFixed(2)}</td>
                </tr>
            `;
        });

        // Create the Viewer
        const viewerId = 'a4-live-preview';
        let viewer = document.getElementById(viewerId);
        if (viewer) viewer.remove();

        viewer = document.createElement('div');
        viewer.id = viewerId;
        // Cinematic Dark Blur Background
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:999999; display:flex; flex-direction:column; animation: slideUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);';

        viewer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(20,20,20,0.9); padding:16px 20px; padding-top:calc(16px + env(safe-area-inset-top, 0px)); box-shadow:0 4px 20px rgba(0,0,0,0.5); z-index:10;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div class="tap-target" onclick="document.getElementById('${viewerId}').remove()" style="background: rgba(255,255,255,0.15); padding: 8px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                    <div>
                        <strong style="font-size:16px; color:#fff; display:block;">Live Document Preview</strong>
                        <small style="color:#aaa; font-size:11px;">${docNo}</small>
                    </div>
                </div>
            </div>
            
            <div style="flex:1; overflow-y:auto; padding:24px 16px; padding-bottom:120px; display:flex; justify-content:center;">
                <div id="print-canvas" style="background:#fff; width:100%; max-width:800px; padding:32px 24px; box-shadow:0 20px 40px rgba(0,0,0,0.4); border-radius:8px; color:#000; font-family:sans-serif; align-self:flex-start; position:relative; overflow:hidden;">
                    
                    <div style="position:absolute; top:0; left:0; width:100%; height:8px; background:var(--md-primary);"></div>

                    <div style="display:flex; justify-content:space-between; border-bottom:2px solid #f0f0f0; padding-bottom:20px; margin-bottom:20px; margin-top:8px;">
                        <div>
                            <h1 style="margin:0; color:var(--md-primary); font-size:22px; font-weight:900; letter-spacing:1px;">${docTitle}</h1>
                            <div style="margin-top:12px; font-size:13px; color:#555;">
                                <table style="border-spacing:0;">
                                    <tr><td style="padding-bottom:4px; padding-right:12px;">Doc No:</td><td><strong style="color:#111;">${docNo}</strong></td></tr>
                                    <tr><td>Date:</td><td><strong style="color:#111;">${record.date || ''}</strong></td></tr>
                                </table>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <h2 style="margin:0; font-size:18px; color:#222;">${firmName}</h2>
                            <div style="font-size:12px; color:#666; margin-top:6px; line-height:1.4;">
                                ${firmPhone ? `Phone: ${firmPhone}<br>` : ''}
                                ${profile.gst ? `GSTIN: ${profile.gst}` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="background:#f8f9fa; padding:16px; border-radius:8px; margin-bottom:24px;">
                        <div style="font-size:10px; color:#777; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px; margin-bottom:4px;">${isSales ? 'Billed To' : 'Purchased From'}</div>
                        <div style="font-size:15px; font-weight:bold; color:#111;">${partyName}</div>
                    </div>

                    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:24px;">
                        <thead>
                            <tr style="background:#f0f4f8; text-align:left; color:#444;">
                                <th style="padding:10px 8px; border-radius:6px 0 0 6px;">#</th>
                                <th style="padding:10px 8px;">Description</th>
                                <th style="padding:10px 8px; text-align:center;">Qty</th>
                                <th style="padding:10px 8px; text-align:right;">Rate</th>
                                <th style="padding:10px 8px; text-align:right; border-radius:0 6px 6px 0;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="display:flex; justify-content:flex-end;">
                        <div style="width:260px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Subtotal:</span> <strong>₹${(parseFloat(record.subtotal)||0).toFixed(2)}</strong></div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Discount:</span> <strong>₹${(parseFloat(record.discount)||0).toFixed(2)}</strong></div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Tax (GST):</span> <strong>₹${(parseFloat(record.totalGst)||0).toFixed(2)}</strong></div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:2px solid #eee; font-size:18px; color:var(--md-primary);">
                                <strong style="text-transform:uppercase; font-size:14px;">Grand Total</strong> 
                                <strong>₹${(parseFloat(record.grandTotal)||0).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:40px; text-align:center; font-size:10px; color:#aaa; border-top:1px solid #eee; padding-top:12px;">
                        This is a computer-generated document and does not require a physical signature.
                    </div>
                </div>
            </div>

            <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(20,20,20,0.9); padding:16px 20px; padding-bottom:calc(16px + env(safe-area-inset-bottom, 0px)); display:flex; gap:12px; box-shadow:0 -10px 30px rgba(0,0,0,0.5); z-index:20;">
                <button onclick="window.print()" class="tap-target" style="flex:1; background:#333; color:#fff; border:none; padding:16px; border-radius:16px; font-weight:bold; font-size:15px; display:flex; justify-content:center; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print
                </button>
                <button id="btn-whatsapp-share" class="tap-target" style="flex:2; background:#25D366; color:#fff; border:none; padding:16px; border-radius:16px; font-weight:bold; font-size:15px; display:flex; justify-content:center; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(37, 211, 102, 0.25);">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Send via WhatsApp
                </button>
            </div>
        `;

        document.body.appendChild(viewer);

        // Attach WhatsApp Engine
        document.getElementById('btn-whatsapp-share').onclick = async () => {
            const text = `Hello ${partyName},\n\nHere is your ${docTitle} (*${docNo}*) for ₹${(parseFloat(record.grandTotal)||0).toFixed(2)}.\n\nThank you for your business!\n- ${firmName}`;
            
            try {
                if (navigator.share) {
                    await navigator.share({ title: 'Invoice', text: text });
                } else {
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }
            } catch (err) {
                console.log(err);
            }
        };
    },

    // ==========================================
    // 9. GST DASHBOARD CONTROLLER
    // ==========================================
    openGSTReport: async () => {
        // Default to the current month
        const dateInput = document.getElementById('gst-month-selector');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}`;
        }
        
        await app.refreshGSTReport();
        if (typeof UI !== 'undefined') UI.openActivity('activity-gst-report');
    },

    refreshGSTReport: async () => {
        const monthVal = document.getElementById('gst-month-selector').value;
        if (!monthVal) return;
        
        if (typeof generateGSTReport !== 'function') {
            return alert("GST engine not found in db.js! Please make sure you saved the db.js file updates.");
        }
        
        // 1. Run the heavy math engine we built in db.js
        const report = await generateGSTReport(monthVal, app.state.firmId);
        
        // 2. Update GSTR-3B UI Cards
        document.getElementById('gst-out-tax').innerText = `\u20B9${report.gstr3b.outputTax.toFixed(2)}`;
        document.getElementById('gst-in-tax').innerText = `\u20B9${report.gstr3b.inputTax.toFixed(2)}`;
        document.getElementById('gst-net-payable').innerText = `\u20B9${report.gstr3b.netPayable.toFixed(2)}`;
        
        // 3. Update GSTR-1 UI Cards
        document.getElementById('gst-b2b-taxable').innerText = `\u20B9${report.gstr1.b2bTaxable.toFixed(2)}`;
        document.getElementById('gst-b2b-tax').innerText = `\u20B9${report.gstr1.b2bTax.toFixed(2)}`;
        document.getElementById('gst-b2c-taxable').innerText = `\u20B9${report.gstr1.b2cTaxable.toFixed(2)}`;
        document.getElementById('gst-b2c-tax').innerText = `\u20B9${report.gstr1.b2cTax.toFixed(2)}`;
        
        // 4. Bind the Export CSV Button
        const exportBtn = document.getElementById('btn-export-gst');
        if (exportBtn) {
            exportBtn.onclick = () => { Utils.exportGSTCSV(report); };
        }
    }, // <--- ADDED THE MISSING COMMA HERE!

    // ==========================================
    // NEW: EXPENSE LINK SEARCH ENGINE
    // ==========================================
    loadLinkedDocsList: async () => {
        const listEl = document.getElementById('list-linked-docs');
        if (!listEl) return;
        
        const sales = await getAllRecords('sales');
        const purchases = await getAllRecords('purchases');
        
        const currentSelected = (document.getElementById('expense-linked-invoice').value || '').split(',');
        let html = '';
        
        const recentSales = sales.filter(s => s.firmId === app.state.firmId && s.status !== 'Open').slice(-50).reverse();
        if (recentSales.length > 0) {
            html += `<li style="background: var(--md-surface-variant); font-weight: bold; pointer-events: none; padding: 8px 16px; border-radius: 4px;">Sales Invoices</li>`;
            recentSales.forEach(s => {
                // BULLETPROOF: Save the exact Order/Invoice number directly!
                const docNo = s.orderNo || s.invoiceNo || s.id;
                const displayNo = s.orderNo || s.invoiceNo || s.id.slice(-4).toUpperCase();
                const isSelected = currentSelected.includes(docNo);
                const bg = isSelected ? 'var(--md-surface-variant)' : 'transparent';
                const checked = isSelected ? 'checked' : '';

                html += `<li style="background: ${bg};" onclick="app.selectLinkedDoc('${docNo}', '${displayNo}', this)">
                    <div><strong style="color:var(--md-primary);">${displayNo}</strong><br><small>${s.customerName}</small></div>
                    <input type="checkbox" ${checked} style="width: 20px; height: 20px; pointer-events: none;">
                </li>`;
            });
        }
        
        const recentPurch = purchases.filter(p => p.firmId === app.state.firmId && p.status !== 'Open').slice(-50).reverse();
        if (recentPurch.length > 0) {
            html += `<li style="background: var(--md-surface-variant); font-weight: bold; pointer-events: none; padding: 8px 16px; border-radius: 4px; margin-top: 12px;">Purchase Bills</li>`;
            recentPurch.forEach(p => {
                // BULLETPROOF: Save the exact PO/Order number directly!
                const docNo = p.orderNo || p.poNo || p.invoiceNo || p.id;
                const displayNo = p.orderNo || p.poNo || p.invoiceNo || p.id.slice(-4).toUpperCase();
                
                const isSelected = currentSelected.includes(docNo);
                const bg = isSelected ? 'var(--md-surface-variant)' : 'transparent';
                const checked = isSelected ? 'checked' : '';

                html += `<li style="background: ${bg};" onclick="app.selectLinkedDoc('${docNo}', '${displayNo}', this)">
                    <div><strong style="color:var(--md-error);">${displayNo}</strong><br><small>${p.supplierName}</small></div>
                    <input type="checkbox" ${checked} style="width: 20px; height: 20px; pointer-events: none;">
                </li>`;
            });
        }
        listEl.innerHTML = html;
    },

    selectLinkedDoc: (id, displayName, liElement = null) => {
        const inputEl = document.getElementById('expense-linked-invoice');
        const displayEl = document.getElementById('expense-linked-display');

        if (!id) {
            inputEl.value = '';
            displayEl.innerText = '-- No Link (General Expense) --';
            displayEl.style.color = 'var(--md-text-muted)';
            UI.closeBottomSheet('sheet-linked-docs');
            document.querySelectorAll('#list-linked-docs li input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('#list-linked-docs li').forEach(li => {
                if(li.style.pointerEvents !== 'none') li.style.background = 'transparent';
            });
            return;
        }

        let currentIds = inputEl.value ? inputEl.value.split(',') : [];
        let currentNames = displayEl.innerText !== '-- No Link (General Expense) --' ? displayEl.innerText.split(' | ') : [];

        if (currentIds.includes(id)) {
            currentIds = currentIds.filter(i => i !== id);
            currentNames = currentNames.filter(n => n !== displayName);
            if (liElement) {
                liElement.style.background = 'transparent';
                const cb = liElement.querySelector('input');
                if (cb) cb.checked = false;
            }
        } else {
            currentIds.push(id);
            currentNames.push(displayName);
            if (liElement) {
                liElement.style.background = 'var(--md-surface-variant)';
                const cb = liElement.querySelector('input');
                if (cb) cb.checked = true;
            }
        }

        inputEl.value = currentIds.join(',');
        displayEl.innerText = currentNames.length > 0 ? currentNames.join(' | ') : '-- No Link (General Expense) --';
        displayEl.style.color = currentIds.length > 0 ? 'var(--md-primary)' : 'var(--md-text-muted)';
    },

    fetchPincode: async (pincode, prefix) => {
        if (!pincode || pincode.toString().length !== 6) return;
        
        try {
            if (window.Utils) window.Utils.showToast("Fetching Location...");
            
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();
            
            if (data && data[0] && data[0].Status === 'Success') {
                const postOffice = data[0].PostOffice[0];
                
                const cityEl = document.getElementById(`${prefix}-city`);
                const stateEl = document.getElementById(`${prefix}-state`);
                
                // Set the values, but they remain editable by the user!
                if (cityEl) cityEl.value = postOffice.District;
                if (stateEl) stateEl.value = postOffice.State;
                
                if (window.Utils) window.Utils.showToast(`📍 Found: ${postOffice.District}, ${postOffice.State}`);
            } else {
                if (window.Utils) window.Utils.showToast("⚠️ Invalid Pincode");
            }
        } catch (error) {
            console.error("Pincode API Error:", error);
            if (window.Utils) window.Utils.showToast("⚠️ Could not fetch location");
        }
    },

    filterLinkedDocs: (term) => {
        const listItems = document.querySelectorAll('#list-linked-docs li');
        const lowerTerm = term.toLowerCase();
        listItems.forEach(li => {
            if(li.style.pointerEvents === 'none') return; // Skip headers
            const text = li.innerText.toLowerCase();
            li.style.display = text.includes(lowerTerm) ? 'flex' : 'none';
        });
    },

    // ==========================================
    // DOCUMENT SETTINGS ENGINE
    // ==========================================
    loadDocumentSettings: () => {
        const savedFormats = JSON.parse(localStorage.getItem('sollo_doc_formats') || '{}');
        
        const applyToUI = (key, defaultFormat, idPrefix) => {
            const template = savedFormats[key] || defaultFormat;
            const parts = template.split('{NUM}');
            if (document.getElementById(`${idPrefix}-prefix`)) {
                document.getElementById(`${idPrefix}-prefix`).value = parts[0] || '';
                document.getElementById(`${idPrefix}-suffix`).value = parts.length > 1 ? parts[1] : '';
            }
        };

        applyToUI('INV', '{NUM}/{FY}', 'format-inv');
        applyToUI('ORD', 'ORD {NUM}/{FY}', 'format-ord');
        applyToUI('PO', 'PO {NUM}/{FY}', 'format-po');
        applyToUI('CN', 'CN {NUM}/{FY}', 'format-cn');
        applyToUI('EXP', 'EXP {NUM}/{FY}', 'format-exp');
        applyToUI('REC', 'REC {NUM}/{FY}', 'format-rec');
        applyToUI('VOU', 'VOU {NUM}/{FY}', 'format-vou');

        // Load custom starting numbers into ALL the middle boxes
        const types = ['inv', 'ord', 'po', 'cn', 'exp', 'rec', 'vou'];
        types.forEach(type => {
            const el = document.getElementById(`format-${type}-start`);
            if (el) el.value = localStorage.getItem(`sollo_${type}_start`) || '';
        });
    },

    saveDocumentSettings: () => {
        const buildFormat = (idPrefix) => {
            const pre = document.getElementById(`${idPrefix}-prefix`).value || '';
            const suf = document.getElementById(`${idPrefix}-suffix`).value || '';
            return `${pre}{NUM}${suf}`;
        };

        const formats = {
            'INV': buildFormat('format-inv'),
            'ORD': buildFormat('format-ord'),
            'PO': buildFormat('format-po'),
            'CN': buildFormat('format-cn'),
            'EXP': buildFormat('format-exp'),
            'REC': buildFormat('format-rec'),
            'VOU': buildFormat('format-vou')
        };
        
        localStorage.setItem('sollo_doc_formats', JSON.stringify(formats));

        // Save custom starting numbers from ALL the middle boxes
        const types = ['inv', 'ord', 'po', 'cn', 'exp', 'rec', 'vou'];
        types.forEach(type => {
            const el = document.getElementById(`format-${type}-start`);
            if (el && el.value) localStorage.setItem(`sollo_${type}_start`, el.value);
        });

        if (window.Utils) window.Utils.showToast("Document Formats Saved! ✅");
        if (window.UI) window.UI.closeBottomSheet('sheet-document-formats');
    },

    // ==========================================
    // 10. FINANCIAL YEAR-END ENGINE (NON-DESTRUCTIVE)
    // ==========================================
    closeFinancialYear: async () => {
        if (!confirm("Generate Financial Year-End Closing Report? This will calculate all final Ledger and Bank balances for your CA, without deleting any historical data.")) return;
        
        try {
            if (window.Utils) window.Utils.showToast("Calculating Year-End Balances...");
            
            const ledgers = await getAllRecords('ledgers');
            const accounts = await getAllRecords('accounts');
            
            let csvContent = "SOLLO ERP - FINANCIAL YEAR CLOSING BALANCES\n\n";
            csvContent += `Generated on: ${new Date().toLocaleDateString('en-IN')}\n\n`;
            
            csvContent += "1. CUSTOMER & SUPPLIER LEDGERS\n";
            csvContent += "Party Name,Type,Phone,Closing Balance,Status\n";
            
            // Aggregate all Customer & Supplier Balances using your strict Khata Engine
            for (const party of ledgers) {
                if (party.firmId !== app.state.firmId) continue;
                const statement = await getKhataStatement(party.id, party.type);
                const bal = statement.finalBalance;
                
                let status = '';
                if (party.type === 'Customer') status = bal > 0.01 ? 'To Receive' : (bal < -0.01 ? 'Advance' : 'Settled');
                else status = bal > 0.01 ? 'To Pay' : (bal < -0.01 ? 'Advance' : 'Settled');
                
                csvContent += `"${party.name.replace(/"/g, '""')}","${party.type}","${party.phone || ''}",${Math.abs(bal).toFixed(2)},"${status}"\n`;
            }
            
            csvContent += "\n2. BANK & CASH ACCOUNTS\n";
            csvContent += "Account Name,Closing Balance\n";
            
            const allReceipts = await getAllRecords('receipts');
            
            // Compute Main Cash Drawer
            let cashBal = 0;
            allReceipts.filter(r => r.firmId === app.state.firmId && (r.accountId === 'cash' || !r.accountId)).forEach(r => {
                cashBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
            });
            csvContent += `"Default Cash Drawer",${cashBal.toFixed(2)}\n`;
            
            // Compute Custom Bank Accounts
            for (const acc of accounts) {
                if (acc.firmId !== app.state.firmId) continue;
                let accBal = parseFloat(acc.openingBalance) || 0;
                allReceipts.filter(r => r.firmId === app.state.firmId && r.accountId === acc.id).forEach(r => {
                    accBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                });
                csvContent += `"${acc.name.replace(/"/g, '""')}",${accBal.toFixed(2)}\n`;
            }
            
            // Download the Non-Destructive Report
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const file = new File([blob], `FY_Closing_Report_${new Date().getFullYear()}.csv`, { type: 'text/csv' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: "Year End Report", files: [file] });
            } else if (window.Utils) {
                window.Utils.downloadFile(csvContent, file.name, 'text/csv;charset=utf-8;');
            }
            
            if (window.Utils) window.Utils.showToast("Year-End Books Generated Successfully! ✅");
            
        } catch (error) {
            console.error("Year End Engine Error:", error);
            alert("An error occurred while closing the books.");
        }
    }

}; // <--- THIS IS THE CRITICAL CLOSING BRACKET FOR THE APP OBJECT

// ==========================================
// 🔌 ENTERPRISE PLUGIN: ISOLATED SALES ENGINE
// Completely decoupled from the core App Kernel.
// ==========================================
const SalesPlugin = {
    onBoot: async (kernel) => {
        const form = document.getElementById('form-sales');
        if (form) {
            form.addEventListener('submit', SalesPlugin.handleCheckout);
        }
    },
    
    handleCheckout: async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-save-sales');
        const originalText = submitBtn ? submitBtn.innerText : 'Save Invoice';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Sale...";
            submitBtn.style.opacity = "0.7";
        }

        try {
            const partyId = document.getElementById('sales-customer-id').value;
            if (!partyId) return alert('Please select a customer.');

            const items = [];
            const rows = document.querySelectorAll('#sales-items-body .item-entry-card');
            
            rows.forEach(tr => {
                const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
                if (qty <= 0) return;
                items.push({
                    itemId: tr.querySelector('.row-item-id').value,
                    name: tr.querySelector('.row-item-name').value,
                    hsn: tr.querySelector('.row-hsn').value,
                    qty: qty,
                    uom: tr.querySelector('.row-uom').value,
                    rate: parseFloat(tr.querySelector('.row-rate').value) || 0,
                    gstPercent: parseFloat(tr.querySelector('.row-gst').value) || 0,
                    buyPrice: parseFloat(tr.querySelector('.row-item-buyprice').value) || 0
                });
            });
            
            if (items.length === 0) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                return alert("Please add at least one item with a quantity greater than 0.");
            }

            // 1. Duplicate Number Protection
            const proposedDocNo = document.getElementById('sales-invoice-no').value;
            const allExistingDocs = await getAllRecords('sales');
            if (proposedDocNo && proposedDocNo.trim() !== '') {
                const isDuplicate = allExistingDocs.some(d => 
                    d.firmId === app.state.firmId && 
                    d.invoiceNo === proposedDocNo && 
                    d.id !== app.state.currentEditId
                );
                if (isDuplicate) {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                    return alert(`Error: Document number "${proposedDocNo}" already exists! Please use a unique number.`);
                }
            }

            // 2. Negative Inventory Warning
            const isReturn = app.state.currentDocType === 'return';
            if (!isReturn) {
                const allItems = await getAllRecords('items');
                let existingInvoice = app.state.currentEditId ? await getRecordById('sales', app.state.currentEditId) : null;
                
                for (const row of items) {
                    const dbItem = allItems.find(i => i.id === row.itemId);
                    if (dbItem) {
                        let effectiveStock = parseFloat(dbItem.stock) || 0;
                        if (existingInvoice && existingInvoice.status !== 'Open') {
                            const oldItem = existingInvoice.items.find(i => i.itemId === row.itemId);
                            if (oldItem) effectiveStock += (parseFloat(oldItem.qty) || 0);
                        }
                        if (effectiveStock < parseFloat(row.qty)) {
                            if (!confirm(`Warning: Deducting ${row.qty} of "${row.name}" will cause negative inventory (Current: ${effectiveStock}). Continue?`)) return; 
                        }
                    }
                }
            }

            const discTypeEl = document.getElementById('sales-discount-type');
            
            // ⚡ CUSTOM FIELD ENGINE: Dynamically extract injected schema fields
            const formData = new FormData(e.target);
            const customFields = {};
            for (let [key, value] of formData.entries()) {
                if (key.startsWith('custom_')) customFields[key] = value;
            }
            
            // 3. Form Data Extraction
            const data = {
                ...customFields, // Instantly maps all custom fields to the database!
                id: app.state.currentEditId || Utils.generateId(),
                firmId: app.state.firmId,
                documentType: app.state.currentDocType,
                date: document.getElementById('sales-date').value,
                orderDate: document.getElementById('sales-order-date').value,
                shippedDate: document.getElementById('sales-shipped-date').value,
                completedDate: document.getElementById('sales-completed-date').value,
                customerId: partyId,
                customerName: document.getElementById('sales-customer-display').innerText,
                invoiceNo: proposedDocNo, 
                orderNo: document.getElementById('sales-order-no').value,
                status: document.getElementById('sales-order-status').value,
                freightAmount: parseFloat(document.getElementById('sales-freight').value) || 0,
                invoiceType: document.getElementById('sales-invoice-type') ? document.getElementById('sales-invoice-type').value : 'B2B',
                items: items,
                subtotal: parseFloat(document.getElementById('sales-subtotal').innerText.replace(/[^\d.-]/g, '')) || 0,
                discount: parseFloat(document.getElementById('sales-discount').value) || 0,
                discountType: discTypeEl ? discTypeEl.value : '\u20B9',
                totalGst: parseFloat(document.getElementById('sales-gst-total').innerText.replace(/[^\d.-]/g, '')) || 0,
                grandTotal: parseFloat(document.getElementById('sales-grand-total').innerText.replace(/[^\d.-]/g, '')) || 0,
                internalNotes: document.getElementById('sales-internal-notes') ? document.getElementById('sales-internal-notes').value : '',
                amountPaid: 0, paymentMode: 'Cash', accountId: 'cash'
            };

            await saveInvoiceTransaction('sales', data);
            
            // 4. Memory Injection & UI Refresh
            const ramData = window.UI.state.rawData.sales;
            const existIdx = ramData.findIndex(r => r.id === data.id);
            if (existIdx > -1) ramData[existIdx] = data;
            else ramData.push(data);
            
            if (typeof app.autoCompleteInvoices === 'function') await app.autoCompleteInvoices(partyId, 'sales');
            
            // ⚡ DELTA-DRAFT ENGINE: Clear the draft since the save was successful!
            if (typeof DraftPlugin !== 'undefined') DraftPlugin.clearDraft('sales');
            
            // ⚡ ENTERPRISE FIX: Instantly sync Inventory RAM so stock changes show immediately!
            if (window.UI && window.UI.state && window.UI.state.rawData) {
                window.UI.state.rawData.items = await getAllRecords('items');
            }
            
            UI.showSuccess(); 
            UI.closeActivity('activity-sales-form');
            window.UI.applyFilters('sales');
            window.UI.renderDashboard();
            
        } catch (error) {
            console.error("Sales Plugin Error:", error);
            alert("An error occurred while saving the sale.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = "1";
            }
        }
    }
};

// 5. Register the Plugin with the Microkernel
app.registerPlugin('SalesEngine', SalesPlugin);

// ==========================================
// 🔌 ENTERPRISE PLUGIN: ISOLATED PURCHASE ENGINE
// Completely decoupled from the core App Kernel.
// ==========================================
const PurchasePlugin = {
    onBoot: async (kernel) => {
        const form = document.getElementById('form-purchase');
        if (form) {
            form.addEventListener('submit', PurchasePlugin.handleCheckout);
        }
    },
    
    handleCheckout: async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-save-purchase');
        const originalText = submitBtn ? submitBtn.innerText : 'Save Purchase';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Bill...";
            submitBtn.style.opacity = "0.7";
        }

        try {
            const partyId = document.getElementById('purchase-supplier-id').value;
            if (!partyId) return alert('Please select a supplier.');

            const items = [];
            const rows = document.querySelectorAll('#purchase-items-body .item-entry-card');
            
            rows.forEach(tr => {
                const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
                if (qty <= 0) return;
                items.push({
                    itemId: tr.querySelector('.row-item-id').value,
                    name: tr.querySelector('.row-item-name').value,
                    hsn: tr.querySelector('.row-hsn') ? tr.querySelector('.row-hsn').value : '',
                    qty: qty,
                    uom: tr.querySelector('.row-uom') ? tr.querySelector('.row-uom').value : '',
                    rate: parseFloat(tr.querySelector('.row-rate').value) || 0,
                    gstPercent: parseFloat(tr.querySelector('.row-gst').value) || 0,
                    // ⚡ ENTERPRISE FIX: Link the purchase rate to the item's cost basis to protect profit margins!
                    buyPrice: parseFloat(tr.querySelector('.row-item-buyprice') ? tr.querySelector('.row-item-buyprice').value : tr.querySelector('.row-rate').value) || 0 
                });
            });
            
            if (items.length === 0) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                return alert("Please add at least one item with a quantity greater than 0.");
            }

            // Negative Inventory Warning (For Debit Notes / Purchase Returns)
            const isReturn = app.state.currentDocType === 'return';
            if (isReturn) {
                const allItems = await getAllRecords('items');
                let existingInvoice = app.state.currentEditId ? await getRecordById('purchases', app.state.currentEditId) : null;
                
                for (const row of items) {
                    const dbItem = allItems.find(i => i.id === row.itemId);
                    if (dbItem) {
                        let effectiveStock = parseFloat(dbItem.stock) || 0;
                        if (existingInvoice && existingInvoice.status !== 'Open') {
                            const oldItem = existingInvoice.items.find(i => i.itemId === row.itemId);
                            if (oldItem) effectiveStock += (parseFloat(oldItem.qty) || 0);
                        }
                        if (effectiveStock < parseFloat(row.qty)) {
                            if (!confirm(`Warning: Deducting ${row.qty} of "${row.name}" will cause negative inventory. Continue?`)) return; 
                        }
                    }
                }
            }

            const discTypeEl = document.getElementById('purchase-discount-type');
            const proposedDocNo = document.getElementById('purchase-po-no').value;
            
            // FULL ENTERPRISE DATA EXTRACTION
            const data = {
                id: app.state.currentEditId || Utils.generateId(),
                firmId: app.state.firmId,
                documentType: app.state.currentDocType,
                date: document.getElementById('purchase-date').value,
                orderDate: document.getElementById('purchase-order-date') ? document.getElementById('purchase-order-date').value : '',
                shippedDate: document.getElementById('purchase-shipped-date') ? document.getElementById('purchase-shipped-date').value : '',
                completedDate: document.getElementById('purchase-completed-date') ? document.getElementById('purchase-completed-date').value : '',
                supplierId: partyId,
                supplierName: document.getElementById('purchase-supplier-display').innerText,
                poNo: proposedDocNo, 
                invoiceNo: proposedDocNo, 
                orderNo: document.getElementById('purchase-order-no') ? document.getElementById('purchase-order-no').value : '',
                status: document.getElementById('purchase-order-status') ? document.getElementById('purchase-order-status').value : 'Completed',
                freightAmount: parseFloat(document.getElementById('purchase-freight') ? document.getElementById('purchase-freight').value : 0) || 0,
                invoiceType: document.getElementById('purchase-invoice-type') ? document.getElementById('purchase-invoice-type').value : 'B2B',
                items: items,
                subtotal: parseFloat(document.getElementById('purchase-subtotal').innerText.replace(/[^\d.-]/g, '')) || 0,
                discount: parseFloat(document.getElementById('purchase-discount') ? document.getElementById('purchase-discount').value : 0) || 0,
                discountType: discTypeEl ? discTypeEl.value : '\u20B9',
                totalGst: parseFloat(document.getElementById('purchase-gst-total').innerText.replace(/[^\d.-]/g, '')) || 0,
                grandTotal: parseFloat(document.getElementById('purchase-grand-total').innerText.replace(/[^\d.-]/g, '')) || 0,
                internalNotes: document.getElementById('purchase-internal-notes') ? document.getElementById('purchase-internal-notes').value : '',
                amountPaid: 0, paymentMode: 'Cash', accountId: 'cash'
            };

            await saveInvoiceTransaction('purchases', data);
            
            // RAM Injection
            const ramData = window.UI.state.rawData.purchases;
            if (ramData) {
                const existIdx = ramData.findIndex(r => r.id === data.id);
                if (existIdx > -1) ramData[existIdx] = data;
                else ramData.push(data);
            }
            
            if (typeof app.autoCompleteInvoices === 'function') await app.autoCompleteInvoices(partyId, 'purchase');
            
            // ⚡ DELTA-DRAFT ENGINE: Clear the draft since the save was successful!
            if (typeof DraftPlugin !== 'undefined') DraftPlugin.clearDraft('purchase');
            
            // ⚡ ENTERPRISE FIX: Instantly sync Inventory RAM so stock changes show immediately!
            if (window.UI && window.UI.state && window.UI.state.rawData) {
                window.UI.state.rawData.items = await getAllRecords('items');
            }
            
            UI.showSuccess(); 
            UI.closeActivity('activity-purchase-form');
            window.UI.applyFilters('purchases');
            window.UI.renderDashboard();
            
        } catch (error) {
            console.error("Purchase Plugin Error:", error);
            alert("An error occurred while saving the bill.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = "1";
            }
        }
    }
};

// --- REGISTER WITH KERNEL ---
app.registerPlugin('PurchaseEngine', PurchasePlugin);

// ==========================================
// 🔌 ENTERPRISE PLUGIN: ISOLATED RECEIPT ENGINE
// Completely decoupled from the core App Kernel.
// ==========================================
const ReceiptPlugin = {
    onBoot: async (kernel) => {
        ['in', 'out'].forEach(type => {
            const form = document.getElementById(`form-payment-${type}`);
            if (form) {
                form.addEventListener('submit', (e) => ReceiptPlugin.handlePayment(e, type));
            }
        });
    },

    handlePayment: async (e, type) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : 'Save';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            submitBtn.style.opacity = "0.7";
        }

        try {
            const targetPartyId = type === 'in' ? document.getElementById('pay-in-customer').value : document.getElementById('pay-out-supplier').value;
            if (!targetPartyId) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                return alert("Please select a party.");
            }

            const ledger = await getRecordById('ledgers', targetPartyId);
            const accountId = document.getElementById(`pay-${type}-account`).value;

            const invoiceRefEl = document.getElementById(`pay-${type}-invoice-ref`);
            const selectedOptions = invoiceRefEl ? Array.from(invoiceRefEl.selectedOptions).map(opt => opt.value).filter(v => v !== '') : [];
            const selectedInvoiceRef = selectedOptions.join(', ');
            const manualRef = document.getElementById(`pay-${type}-ref`).value;
            const docNoInput = document.getElementById(`pay-${type}-no`).value;

            const allReceipts = await getAllRecords('receipts');
            const isDuplicate = allReceipts.some(r => 
                r.firmId === app.state.firmId && 
                r.receiptNo === docNoInput && 
                r.id !== app.state.currentReceiptId
            );
            
            if (isDuplicate) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                return alert(`Error: Document number "${docNoInput}" already exists! Please use a unique number.`);
            }

            const data = {
                id: app.state.currentReceiptId || Utils.generateId(),
                receiptNo: docNoInput, 
                firmId: app.state.firmId,
                date: document.getElementById(`pay-${type}-date`).value,
                ledgerId: targetPartyId,
                ledgerName: ledger ? ledger.name : 'Unknown',
                type: type,
                amount: parseFloat(document.getElementById(`pay-${type}-amount`).value) || 0,
                mode: document.getElementById(`pay-${type}-mode`).value,
                accountId: accountId,
                ref: manualRef,
                invoiceRef: selectedInvoiceRef, 
                desc: document.getElementById(`pay-${type}-notes`).value || (type === 'in' ? 'Payment Received' : 'Payment Made'),
                isAutoGenerated: false 
            };

            await saveRecord('receipts', data);
            
            // ==========================================
            // ⚡ DOUBLE-ENTRY ENGINE: CASHBOOK POSTING
            // Generates strict Dr/Cr legs for all Payments/Receipts
            // ==========================================
            let legs = [];
            const amt = parseFloat(data.amount) || 0;
            const accountName = data.accountId === 'cash' ? 'Cash In Hand' : 'Bank Account';
            
            if (type === 'in') {
                // Received Money: Debit Bank/Cash, Credit the Customer
                legs.push({ acc: accountName, type: 'Dr', amt: amt, party: null });
                legs.push({ acc: 'Accounts Receivable', type: 'Cr', amt: amt, party: targetPartyId });
            } else {
                // Paid Money: Debit the Supplier/Expense, Credit Bank/Cash
                const isExpense = data.ledgerId === 'internal-expense';
                legs.push({ acc: isExpense ? 'Operating Expenses' : 'Accounts Payable', type: 'Dr', amt: amt, party: targetPartyId });
                legs.push({ acc: accountName, type: 'Cr', amt: amt, party: null });
            }

            const journalEntry = {
                id: 'JRN-' + data.id, 
                firmId: data.firmId,
                date: data.date,
                refId: data.id,
                refNo: data.receiptNo || 'MANUAL',
                module: 'receipts',
                legs: legs,
                timestamp: new Date().toISOString()
            };
            await saveRecord('journal', journalEntry);

            // Link manual payment to the saved invoices and mathematically update their statuses
            if (selectedInvoiceRef) {
                const storeName = type === 'in' ? 'sales' : 'purchases';
                const allDocs = await getAllRecords(storeName);
                const allReceiptsUpdated = await getAllRecords('receipts');
                const selectedRefs = selectedInvoiceRef.split(',').map(r => r.trim());

                for (const ref of selectedRefs) {
                    const linkedInvoice = allDocs.find(doc => {
                        if (doc.firmId !== app.state.firmId) return false;
                        if ((type === 'in' ? doc.customerId : doc.supplierId) !== targetPartyId) return false;
                        const docNo = type === 'in' ? doc.invoiceNo : (doc.poNo || doc.invoiceNo);
                        const refToMatch = docNo || doc.id;
                        return refToMatch === ref;
                    });

                    if (linkedInvoice && linkedInvoice.status !== 'Completed') {
                        let totalPaid = 0;
                        allReceiptsUpdated.forEach(r => {
                            if (r.ledgerId === targetPartyId && r.firmId === app.state.firmId) {
                                const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                                if (rRefs.includes(ref)) {
                                    totalPaid += (parseFloat(r.amount) || 0) / (rRefs.length || 1);
                                }
                            }
                        });

                        if (totalPaid >= parseFloat(linkedInvoice.grandTotal) - 0.5) { 
                            linkedInvoice.status = 'Completed';
                            await saveRecord(storeName, linkedInvoice);
                        }
                    }
                }
            }
            
            if (typeof app.autoCompleteInvoices === 'function') {
                await app.autoCompleteInvoices(targetPartyId, type === 'in' ? 'sales' : 'purchases');
            }

            UI.showSuccess(); 
            UI.closeBottomSheet(`sheet-payment-${type}`);
            app.refreshAll();
            
        } catch (error) {
            console.error("Payment save failed:", error);
            alert("An error occurred. Please try again.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = "1";
            }
        }
    }
};

// --- REGISTER WITH KERNEL ---
app.registerPlugin('ReceiptEngine', ReceiptPlugin);

// ==========================================
// 🔌 ENTERPRISE PLUGIN: ISOLATED MASTER DATA ENGINE (OPTIMISTIC UI)
// Handles Products, Ledgers, Expenses, and Accounts with Zero Latency
// ==========================================
const CrudPlugin = {
    onBoot: async (kernel) => {
        ['product', 'ledger', 'expense', 'account'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (form) {
                form.addEventListener('submit', (e) => CrudPlugin.handleSave(e, type));
            }
        });
    },

    handleSave: async (e, type) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : 'Save';
        
        try {
            const formData = new FormData(form);
            
            let storeName = `${type}s`;
            if (type === 'product') storeName = 'items';
            else if (type === 'account') storeName = 'accounts';

            let data = { id: app.state.currentEditId || Utils.generateId(), firmId: app.state.firmId };
            
            if (app.state.currentEditId) {
                const existingRecord = await getRecordById(storeName, app.state.currentEditId);
                if (existingRecord) data = { ...existingRecord };
            }
            
            formData.forEach((value, key) => { data[key] = value; });
        
            if (type === 'product') {
                data.sellPrice = parseFloat(data.sellPrice) || 0;
                data.buyPrice = parseFloat(data.buyPrice) || 0;
                data.gstStock = parseFloat(data.gstStock) || 0;
                data.nonGstStock = parseFloat(data.nonGstStock) || 0;
                data.stock = Math.round((data.gstStock + data.nonGstStock) * 100) / 100;
                data.minStock = parseFloat(data.minStock) || 0;
                data.gst = parseFloat(data.gst) || 0;
                const img = document.getElementById('product-image-preview');
                if (img && !img.classList.contains('hidden')) data.image = await window.compressImage(img.src);
            } 
            else if (type === 'ledger' || type === 'account') {
                data.openingBalance = parseFloat(data.openingBalance) || 0;
            } 
            else if (type === 'expense') {
                data.amount = parseFloat(data.amount) || 0;
                const accEl = document.getElementById('expense-account-id');
                data.accountId = accEl ? accEl.value : 'cash';
                const img = document.getElementById('expense-attachment-preview');
                if (img && !img.classList.contains('hidden')) data.attachment = await window.compressImage(img.src);
            }

            // ==========================================
            // ⚡ OPTIMISTIC UI ENGINE: INSTANT DOM/RAM MUTATION ⚡
            // ==========================================
            const ramData = window.UI.state.rawData[storeName];
            let backupData = null;
            let isNew = true;
            
            // 1. Instantly Inject into RAM before the database!
            if (ramData) {
                const existIdx = ramData.findIndex(r => r.id === data.id);
                if (existIdx > -1) {
                    backupData = { ...ramData[existIdx] }; // Keep a backup for rollback
                    ramData[existIdx] = data;
                    isNew = false;
                } else {
                    ramData.push(data);
                }
            }

            // 2. Instantly close the UI form and repaint the screen (0ms Latency)
            if (window.UI) UI.closeActivity(`activity-${type}-form`);
            
            // Handle nested dropdowns if opened from sales/purchase
            const salesOpen = document.getElementById('activity-sales-form')?.classList.contains('open');
            const purchOpen = document.getElementById('activity-purchase-form')?.classList.contains('open');
            if (salesOpen || purchOpen) {
                const prefix = salesOpen ? 'sales' : 'purchase';
                if (type === 'ledger') {
                    const partyKey = salesOpen ? 'customer' : 'supplier';
                    const idEl = document.getElementById(`${prefix}-${partyKey}-id`);
                    const displayEl = document.getElementById(`${prefix}-${partyKey}-display`);
                    if (idEl) idEl.value = data.id;
                    if (displayEl) {
                        displayEl.innerText = data.name;
                        displayEl.style.color = 'var(--md-on-surface)';
                    }
                } else if (type === 'product') {
                    setTimeout(() => { if(window.UI) window.UI.openBottomSheet('sheet-products'); }, 300);
                }
            }

            if (window.UI && window.UI.applyFilters) {
                // ⚡ ENTERPRISE FIX: Correctly route the UI refresh to the Master list!
                if (storeName === 'items' || storeName === 'ledgers' || storeName === 'accounts') {
                    window.UI.applyFilters('masters');
                } else {
                    window.UI.applyFilters(storeName);
                }
            }
            if (typeof app.loadDropdowns === 'function') app.loadDropdowns();
            
            if (window.Utils) window.Utils.showToast("Saved instantly! ⚡");

            // ==========================================
            // 🚇 BACKGROUND TUNNEL: Save to Database Silently
            // ==========================================
            (async () => {
                try {
                    await saveRecord(storeName, data);
                    
                    if (type === 'expense') {
                        const expenseReceipt = {
                            id: 'exp-rec-' + data.id,
                            firmId: app.state.firmId,
                            date: data.date,
                            ledgerId: 'internal-expense',
                            ledgerName: 'Internal Expense',
                            type: 'out',
                            amount: data.amount,
                            mode: 'Expense',
                            accountId: data.accountId,
                            ref: '',
                            desc: `Expense: ${data.category}`,
                            isAutoGenerated: true,
                            invoiceRef: data.id 
                        };
                        await saveRecord('receipts', expenseReceipt);
                    }
                    
                    // Secretly wipe cache behind the scenes
                    if (window.AppCache) {
                        if (type === 'product') window.AppCache.items = null;
                        if (type === 'ledger') window.AppCache.ledgers = null;
                        if (type === 'account') window.AppCache.accounts = null;
                    }
                } catch (err) {
                    // SILENT ROLLBACK: If the background save fails, undo the UI mutation seamlessly
                    console.error("Background Save Failed! Rolling back UI.", err);
                    if (window.Utils) window.Utils.showToast("⚠️ Database save failed! Reverting changes.");
                    
                    if (ramData) {
                        if (isNew) {
                            const idx = ramData.findIndex(r => r.id === data.id);
                            if (idx > -1) ramData.splice(idx, 1);
                        } else if (backupData) {
                            const idx = ramData.findIndex(r => r.id === data.id);
                            if (idx > -1) ramData[idx] = backupData;
                        }
                    }
                    if (window.UI && window.UI.applyFilters) {
            // ⚡ ENTERPRISE FIX: Correctly route the UI refresh to the Master list!
            if (storeName === 'items' || storeName === 'ledgers' || storeName === 'accounts') {
                window.UI.applyFilters('masters');
            } else {
                window.UI.applyFilters(storeName);
            }
        } // Repaint the rollback
                }
            })();

        } catch (error) {
            console.error("Form parsing failed:", error);
            alert("An error occurred. Please check your inputs.");
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; }
        }
    }
};

// --- REGISTER WITH KERNEL ---
app.registerPlugin('CrudEngine', CrudPlugin);

// ==========================================
// 🔌 ENTERPRISE PLUGIN: DELTA-DRAFT ENGINE
// Auto-saves forms on every keystroke to prevent data loss.
// ==========================================
const DraftPlugin = {
    onBoot: async (kernel) => {
        // Attach silent listeners to the complex forms
        ['sales', 'purchase'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (form) {
                // Uses the debounce engine from utils.js to save exactly 1 second after they stop typing!
                form.addEventListener('input', window.Utils.debounce(() => DraftPlugin.saveDraft(type, form), 1000));
            }
        });
    },

    saveDraft: (type, form) => {
        // Do not overwrite drafts if the user is currently editing a completed, historical document
        if (app.state.currentEditId) return;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Surgically extract the dynamic item rows
            const items = [];
            const rows = document.querySelectorAll(`#${type}-items-body .item-entry-card`);
            rows.forEach(tr => {
                items.push({
                    itemId: tr.querySelector('.row-item-id') ? tr.querySelector('.row-item-id').value : '',
                    name: tr.querySelector('.row-item-name') ? tr.querySelector('.row-item-name').value : '',
                    uom: tr.querySelector('.row-uom') ? tr.querySelector('.row-uom').value : '',
                    hsn: tr.querySelector('.row-hsn') ? tr.querySelector('.row-hsn').value : '',
                    buyPrice: tr.querySelector('.row-item-buyprice') ? tr.querySelector('.row-item-buyprice').value : 0,
                    qty: tr.querySelector('.row-qty') ? tr.querySelector('.row-qty').value : 0,
                    rate: tr.querySelector('.row-rate') ? tr.querySelector('.row-rate').value : 0,
                    gstPercent: tr.querySelector('.row-gst') ? tr.querySelector('.row-gst').value : 0
                });
            });
            data.items = items;
            
            // Save to high-speed synchronous local storage
            localStorage.setItem(`sollo_draft_${type}`, JSON.stringify(data));
            console.log(`[DraftEngine] 💾 ${type.toUpperCase()} Delta Draft secured.`);
            
            // Optional visual indicator
            const titleEl = document.getElementById(`form-title-${type}`);
            if (titleEl && !titleEl.innerText.includes('•')) {
                const originalTitle = titleEl.innerText;
                titleEl.innerText = originalTitle + ' • Draft Saved';
                setTimeout(() => titleEl.innerText = originalTitle, 2000);
            }
        } catch (err) {
            console.warn("Draft engine failed to capture state:", err);
        }
    },

    clearDraft: (type) => {
        localStorage.removeItem(`sollo_draft_${type}`);
    }
};

// --- REGISTER WITH KERNEL ---
app.registerPlugin('DraftEngine', DraftPlugin);

// ==========================================
// 🔌 ENTERPRISE PLUGIN: SCHEMA-DRIVEN CUSTOM FIELDS
// Generates dynamic inputs without touching HTML!
// ==========================================
const CustomFieldPlugin = {
    // 1. Define your custom fields here! The engine will build them automatically.
    schemas: {
        sales: [
            { name: 'custom_vehicle_no', label: 'Vehicle / Lorry No.', type: 'text' },
            { name: 'custom_eway_bill', label: 'E-Way Bill No.', type: 'text' }
        ],
        purchase: [
            { name: 'custom_gate_pass', label: 'Gate Pass No.', type: 'text' }
        ],
        product: [
            { name: 'custom_rack_loc', label: 'Warehouse Rack Loc.', type: 'text' },
            { name: 'custom_barcode', label: 'Barcode / UPC', type: 'text' }
        ],
        ledger: [
            { name: 'custom_credit_limit', label: 'Credit Limit (₹)', type: 'number' },
            { name: 'custom_salesman', label: 'Assigned Salesman', type: 'text' }
        ]
    },

    onBoot: async (kernel) => {
        for (const [formType, fields] of Object.entries(CustomFieldPlugin.schemas)) {
            const form = document.getElementById(`form-${formType}`);
            if (!form) continue;

            // Check if container already exists
            let container = form.querySelector('.custom-fields-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'custom-fields-container';
                
                // ⚡ FIX 1: Responsive Flexbox Column & Premium M3 Card Styling
                container.style.cssText = 'display: flex; flex-direction: column; gap: 12px; margin-top: 16px; padding: 16px; background: var(--md-surface-variant); border-radius: 12px; margin-bottom: 24px;';

                // Draw the inputs based purely on the JSON array
                fields.forEach(field => {
                    container.innerHTML += `
                        <div>
                            <small style="color:var(--md-on-surface-variant); font-size:12px; font-weight:bold; display:block; margin-bottom:6px;">${field.label}</small>
                            <input type="${field.type}" name="${field.name}" style="width:100%; padding:10px; border:1px solid var(--md-outline-variant); border-radius:8px; background:var(--md-surface); font-size:15px; color:var(--md-on-surface);">
                        </div>
                    `;
                });

                // ⚡ FIX 2: Inject securely outside the bottom bar so it aligns perfectly with the main form!
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.closest('.activity-bottom-bar')) {
                    form.insertBefore(container, submitBtn.closest('.activity-bottom-bar'));
                } else if (submitBtn) {
                    form.insertBefore(container, submitBtn.parentElement);
                } else {
                    form.appendChild(container);
                }
            }
        }
    }
}; // <--- THIS SAFELY CLOSES THE CUSTOM FIELD PLUGIN!

app.registerPlugin('CustomFieldEngine', CustomFieldPlugin);

// ==========================================
// 11. ENTERPRISE TRIAL BALANCE ENGINE (LIVE PREVIEW)
// ==========================================
app.viewTrialBalance = async () => {
    if (window.Utils) window.Utils.showToast("Calculating Double-Entry Trial Balance...");
    
    try {
        const ledgers = typeof getAllRecords === 'function' ? await getAllRecords('ledgers') : [];
        const accounts = typeof getAllRecords === 'function' ? await getAllRecords('accounts') : [];
        const items = typeof getAllRecords === 'function' ? await getAllRecords('items') : [];
        const receipts = typeof getAllRecords === 'function' ? await getAllRecords('receipts') : [];
        
        let csvContent = "SOLLO ERP - TRIAL BALANCE\n\n";
        csvContent += `Generated on: ${new Date().toLocaleDateString('en-IN')}\n\n`;
        csvContent += "Account Name,Debit (Dr),Credit (Cr)\n";
        
        // NEW: Build the HTML Table for the screen!
        let htmlRows = "";
        let totalDr = 0;
        let totalCr = 0;
        
        const addRow = (name, dr, cr) => {
            const cleanDr = parseFloat(dr) || 0;
            const cleanCr = parseFloat(cr) || 0;
            if (cleanDr === 0 && cleanCr === 0) return;
            
            // Add to CSV
            csvContent += `"${(name || 'Unknown').replace(/"/g, '""')}",${cleanDr.toFixed(2)},${cleanCr.toFixed(2)}\n`;
            
            // Add to Screen UI
            htmlRows += `
                <div style="display:flex; justify-content:space-between; padding: 12px 0; border-bottom: 1px solid var(--md-surface-variant);">
                    <div style="flex:2; font-size:14px; color:var(--md-on-surface); padding-right:8px;">${name}</div>
                    <div style="flex:1; text-align:right; font-size:14px; color:var(--md-error);">${cleanDr > 0 ? cleanDr.toFixed(2) : '-'}</div>
                    <div style="flex:1; text-align:right; font-size:14px; color:var(--md-success);">${cleanCr > 0 ? cleanCr.toFixed(2) : '-'}</div>
                </div>
            `;
            
            totalDr += cleanDr;
            totalCr += cleanCr;
        };

        // 1. Stock in Hand
        let stockValue = 0;
        items.forEach(i => {
            if (i.firmId === app.state.firmId) {
                const stock = (parseFloat(i.gstStock) || 0) + (parseFloat(i.nonGstStock) || 0);
                const cost = parseFloat(i.buyPrice) || 0;
                if (stock > 0 && cost > 0) stockValue += (stock * cost);
            }
        });
        addRow("Closing Stock (Inventory)", stockValue, 0);

        // 2. Cash & Bank
        let cashBal = 0;
        receipts.filter(r => r.firmId === app.state.firmId && (r.accountId === 'cash' || !r.accountId)).forEach(r => {
            cashBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
        });
        if (cashBal >= 0) addRow("Default Cash Drawer", cashBal, 0);
        else addRow("Default Cash Drawer (Overdrawn)", 0, Math.abs(cashBal));

        for (const acc of accounts) {
            if (acc.firmId !== app.state.firmId) continue;
            let accBal = parseFloat(acc.openingBalance) || 0;
            receipts.filter(r => r.firmId === app.state.firmId && r.accountId === acc.id).forEach(r => {
                accBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
            });
            if (accBal >= 0) addRow(`Bank: ${acc.name}`, accBal, 0);
            else addRow(`Bank: ${acc.name} (OD)`, 0, Math.abs(accBal));
        }

        // 3. Parties
        for (const party of ledgers) {
            if (party.firmId !== app.state.firmId) continue;
            let bal = 0;
            if (typeof getKhataStatement === 'function') {
                try {
                    const statement = await getKhataStatement(party.id, party.type || 'Customer');
                    bal = statement ? (parseFloat(statement.finalBalance) || 0) : 0;
                } catch(err) { console.warn("Skipped ledger calculation"); }
            }
            
            if (party.type === 'Supplier') {
                if (bal > 0.01) addRow(`Sundry Creditor: ${party.name}`, 0, bal);
                else if (bal < -0.01) addRow(`Advance to: ${party.name}`, Math.abs(bal), 0);
            } else {
                if (bal > 0.01) addRow(`Sundry Debtor: ${party.name}`, bal, 0);
                else if (bal < -0.01) addRow(`Advance from: ${party.name}`, 0, Math.abs(bal));
            }
        }
        
        csvContent += `\n"TOTAL",${totalDr.toFixed(2)},${totalCr.toFixed(2)}\n`;

        // ==========================================
        // ⚡ THE NEW LIVE UI VIEWER ENGINE
        // ==========================================
        const viewerId = 'tb-live-preview';
        let viewer = document.getElementById(viewerId);
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = viewerId;
            viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:var(--md-background); z-index:999999; display:flex; flex-direction:column; animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);';
            document.body.appendChild(viewer);
        }

        viewer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--md-surface); padding:16px 20px; box-shadow:0 2px 8px rgba(0,0,0,0.05); position:sticky; top:0; z-index:10;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="tap-target" onclick="document.getElementById('${viewerId}').remove()" style="background: var(--md-surface-variant); padding: 6px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: var(--md-on-surface);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                    <strong style="font-size:18px; color:var(--md-primary); letter-spacing: 0.5px;">Trial Balance</strong>
                </div>
                <div class="tap-target" id="btn-share-tb" style="background: linear-gradient(135deg, #0061a4, #004a7a); color: white; padding: 8px 18px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,97,164,0.3);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                    Export
                </div>
            </div>
            
            <div style="flex:1; overflow-y:auto; padding:16px;">
                <div class="m3-card" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:2px solid var(--md-outline-variant); margin-bottom:8px;">
                        <div style="flex:2; font-weight:bold; font-size:12px; color:var(--md-text-muted); text-transform:uppercase;">Account</div>
                        <div style="flex:1; text-align:right; font-weight:bold; font-size:12px; color:var(--md-text-muted); text-transform:uppercase;">Debit</div>
                        <div style="flex:1; text-align:right; font-weight:bold; font-size:12px; color:var(--md-text-muted); text-transform:uppercase;">Credit</div>
                    </div>
                    
                    ${htmlRows}
                    
                    <div style="display:flex; justify-content:space-between; padding-top:16px; margin-top:8px; border-top:2px solid var(--md-primary);">
                        <div style="flex:2; font-weight:bold; font-size:16px; color:var(--md-primary);">TOTAL</div>
                        <div style="flex:1; text-align:right; font-weight:bold; font-size:16px; color:var(--md-error);">${totalDr.toFixed(2)}</div>
                        <div style="flex:1; text-align:right; font-weight:bold; font-size:16px; color:var(--md-success);">${totalCr.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;

        // Attach Native Share Engine to the new button
        document.getElementById('btn-share-tb').onclick = async () => {
            const fileName = `Trial_Balance_${new Date().getTime()}.csv`;
            try {
                if (navigator.canShare && navigator.canShare({ files: [new File([new Blob([csvContent])], fileName, {type: 'text/csv'})] })) {
                    const file = new File([new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })], fileName, { type: 'text/csv' });
                    await navigator.share({ title: "Trial Balance", files: [file] });
                } else if (window.Utils && typeof window.Utils.downloadFile === 'function') {
                    window.Utils.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
                } else {
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                }
            } catch (dlErr) {
                console.error("Download blocked:", dlErr);
                alert("Browser blocked the share attempt.");
            }
        };

    } catch (error) {
        console.error("Trial Balance Error:", error);
        alert("CRASH LOG: " + error.message); 
    }
};

// ==========================================
// 12. LIVE A4 INVOICE PREVIEW ENGINE (UPGRADED)
// ==========================================
app.generatePDF = async (type) => {
    // Determine context
    const isSales = type === 'sales';
    const docId = app.state.currentEditId;
    
    if (!docId) {
        if (window.Utils) window.Utils.showToast("⚠️ Please save the document first!");
        return;
    }

    const record = typeof getRecordById === 'function' ? await getRecordById(type, docId) : null;
    if (!record) return;

    // ⚡ FIX 1: Fetch your actual Company Profile & Logo from the Database!
    const profile = await getRecordById('businessProfile', app.state.firmId) || {};
    const party = await getRecordById('ledgers', isSales ? record.customerId : record.supplierId) || {};
    
    // Build Data
    const firmName = profile.name || 'My Enterprise';
    const firmPhone = profile.phone || '';
    const partyName = isSales ? record.customerName : record.supplierName;
    const docNo = record.invoiceNo || record.poNo || record.orderNo || String(record.id).slice(-4).toUpperCase();
    const docTitle = isSales ? 'TAX INVOICE' : 'PURCHASE ORDER';
    
    // ⚡ FIX 2: Inject the Company Logo HTML securely
    const logoHtml = profile.logo ? `<img src="${profile.logo}" style="max-height: 65px; max-width: 180px; margin-bottom: 12px; border-radius: 4px; object-fit: contain;">` : '';

    // Build Item Rows
    let itemsHtml = '';
    (record.items || []).forEach((item, idx) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const total = qty * rate;
        itemsHtml += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 10px 8px; color: #555;">${idx + 1}</td>
                <td style="padding: 10px 8px;">
                    <strong style="color: #222;">${item.name}</strong>
                    ${item.hsn ? `<div style="font-size:10px; color:#888; margin-top:2px;">HSN: ${item.hsn}</div>` : ''}
                </td>
                <td style="padding: 10px 8px; text-align: center; color: #444;">${qty} <span style="font-size:10px;">${item.uom||''}</span></td>
                <td style="padding: 10px 8px; text-align: right; color: #444;">${rate.toFixed(2)}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #111;">${total.toFixed(2)}</td>
            </tr>
        `;
    });

    // Create the Viewer
    const viewerId = 'a4-live-preview';
    let viewer = document.getElementById(viewerId);
    if (viewer) viewer.remove();

    viewer = document.createElement('div');
    viewer.id = viewerId;
    // Cinematic Dark Blur Background
    viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:999999; display:flex; flex-direction:column; animation: slideUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);';

    viewer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(20,20,20,0.9); padding:16px 20px; padding-top:calc(16px + env(safe-area-inset-top, 0px)); box-shadow:0 4px 20px rgba(0,0,0,0.5); z-index:10;">
            <div style="display:flex; align-items:center; gap:16px;">
                <div class="tap-target" onclick="document.getElementById('${viewerId}').remove()" style="background: rgba(255,255,255,0.15); padding: 8px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <div>
                    <strong style="font-size:16px; color:#fff; display:block;">Live Document Preview</strong>
                    <small style="color:#aaa; font-size:11px;">${docNo}</small>
                </div>
            </div>
        </div>
        
        <div style="flex:1; overflow-y:auto; padding:24px 16px; padding-bottom:120px; display:flex; justify-content:center;">
            <div id="print-canvas" style="background:#fff; width:100%; max-width:800px; padding:32px 24px; box-shadow:0 20px 40px rgba(0,0,0,0.4); border-radius:8px; color:#000; font-family:sans-serif; align-self:flex-start; position:relative; overflow:hidden;">
                
                <div style="position:absolute; top:0; left:0; width:100%; height:8px; background:var(--md-primary);"></div>

                <div style="display:flex; justify-content:space-between; border-bottom:2px solid #f0f0f0; padding-bottom:20px; margin-bottom:20px; margin-top:8px;">
                    <div>
                        <h1 style="margin:0; color:var(--md-primary); font-size:22px; font-weight:900; letter-spacing:1px;">${docTitle}</h1>
                        <div style="margin-top:12px; font-size:13px; color:#555;">
                            <table style="border-spacing:0;">
                                <tr><td style="padding-bottom:4px; padding-right:12px;">Doc No:</td><td><strong style="color:#111;">${docNo}</strong></td></tr>
                                <tr><td>Date:</td><td><strong style="color:#111;">${record.date || ''}</strong></td></tr>
                            </table>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        ${logoHtml}
                        <h2 style="margin:0; font-size:18px; color:#222;">${firmName}</h2>
                        <div style="font-size:12px; color:#666; margin-top:6px; line-height:1.4;">
                            ${firmPhone ? `Phone: ${firmPhone}<br>` : ''}
                            ${profile.gst ? `GSTIN: ${profile.gst}` : ''}
                        </div>
                    </div>
                </div>

                <div style="background:#f8f9fa; padding:16px; border-radius:8px; margin-bottom:24px;">
                    <div style="font-size:10px; color:#777; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px; margin-bottom:4px;">${isSales ? 'Billed To' : 'Purchased From'}</div>
                    <div style="font-size:15px; font-weight:bold; color:#111;">${partyName}</div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:24px;">
                    <thead>
                        <tr style="background:#f0f4f8; text-align:left; color:#444;">
                            <th style="padding:10px 8px; border-radius:6px 0 0 6px;">#</th>
                            <th style="padding:10px 8px;">Description</th>
                            <th style="padding:10px 8px; text-align:center;">Qty</th>
                            <th style="padding:10px 8px; text-align:right;">Rate</th>
                            <th style="padding:10px 8px; text-align:right; border-radius:0 6px 6px 0;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:flex-end;">
                    <div style="width:260px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Subtotal:</span> <strong>₹${(parseFloat(record.subtotal)||0).toFixed(2)}</strong></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Discount:</span> <strong>₹${(parseFloat(record.discount)||0).toFixed(2)}</strong></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#555;"><span>Tax (GST):</span> <strong>₹${(parseFloat(record.totalGst)||0).toFixed(2)}</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:2px solid #eee; font-size:18px; color:var(--md-primary);">
                            <strong style="text-transform:uppercase; font-size:14px;">Grand Total</strong> 
                            <strong>₹${(parseFloat(record.grandTotal)||0).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>

                <div style="margin-top:40px; text-align:center; font-size:10px; color:#aaa; border-top:1px solid #eee; padding-top:12px;">
                    This is a computer-generated document and does not require a physical signature.
                </div>
            </div>
        </div>

        <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(20,20,20,0.9); padding:16px 20px; padding-bottom:calc(16px + env(safe-area-inset-bottom, 0px)); display:flex; gap:12px; box-shadow:0 -10px 30px rgba(0,0,0,0.5); z-index:20;">
            <button onclick="window.print()" class="tap-target" style="flex:1; background:#333; color:#fff; border:none; padding:16px; border-radius:16px; font-weight:bold; font-size:15px; display:flex; justify-content:center; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
            
            <button id="btn-native-share" class="tap-target" style="flex:2; background: linear-gradient(135deg, #0061a4, #004a7a); color:#fff; border:none; padding:16px; border-radius:16px; font-weight:bold; font-size:15px; display:flex; justify-content:center; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(0,97,164,0.3);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Share
            </button>

            <button id="btn-download-pdf" class="tap-target" style="flex:1; background: #f57f17; color:#fff; border:none; padding:16px; border-radius:16px; font-weight:bold; font-size:15px; display:flex; justify-content:center; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(245,127,23,0.3);">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
        </div>
    `;

    document.body.appendChild(viewer);

    // ⚡ Attach Native Share Engine
    document.getElementById('btn-native-share').onclick = async () => {
        const text = `Hello ${partyName},\n\nHere is your ${docTitle} (*${docNo}*) for ₹${(parseFloat(record.grandTotal)||0).toFixed(2)}.\n\nThank you for your business!\n- ${firmName}`;
        
        try {
            if (navigator.share) {
                await navigator.share({ 
                    title: `${docTitle} - ${docNo}`, 
                    text: text 
                });
            } else {
                alert("Native Web Share is not supported on this browser.");
            }
        } catch (err) {
            console.log("Share canceled or failed:", err);
        }
    };

    // ⚡ Attach PDF Download Fallback
    const downloadBtn = document.getElementById('btn-download-pdf');
    if (downloadBtn && window.Utils && window.Utils.generateInvoicePDF) {
        downloadBtn.onclick = () => {
            window.Utils.generateInvoicePDF(record, profile || {}, party || {}, type);
        };
    }
};

// ==========================================
// 13. ITEM-WISE STOCK LEDGER ENGINE (AUDIT READY)
// ==========================================
app.viewStockLedger = async (productId) => {
    if (!productId) return alert("Please save the product first to view its ledger.");
    
    let product = null;
    try {
        if (typeof getRecordById === 'function') {
            product = await getRecordById('items', productId) || await getRecordById('products', productId);
        }
    } catch(e) { console.warn("Product fetch bypassed:", e); }
    
    if (!product) return alert("Product not found in database!");

    document.getElementById('stock-ledger-title').innerText = product.name || 'Unknown Item';
    
    // ⚡ ENTERPRISE FIX: Force absolute numeric parsing to destroy NaN ghosts!
    const gst = parseFloat(product.gstStock) || 0;
    const nonGst = parseFloat(product.nonGstStock) || 0;
    const totalStock = gst + nonGst;
    const safeUom = (product.uom && String(product.uom).toLowerCase() !== 'null' && String(product.uom).toLowerCase() !== 'undefined') ? product.uom : 'Units';
    
    // Support both old and new HTML header IDs
    const balEl = document.getElementById('stock-ledger-bal');
    if (balEl) balEl.innerText = `Total: ${totalStock.toFixed(2)} ${safeUom} (GST: ${gst.toFixed(2)} | Non-GST: ${nonGst.toFixed(2)})`;
    
    const gstEl = document.getElementById('stock-ledger-gst');
    const nonGstEl = document.getElementById('stock-ledger-nongst');
    const totalEl = document.getElementById('stock-ledger-total');
    if(gstEl) gstEl.innerText = `GST: ${gst.toFixed(2)} ${safeUom}`;
    if(nonGstEl) nonGstEl.innerText = `Non-GST: ${nonGst.toFixed(2)} ${safeUom}`;
    if(totalEl) totalEl.innerText = `Total: ${totalStock.toFixed(2)} ${safeUom}`;
    
    if(window.UI) window.UI.openActivity('activity-stock-ledger');
    const container = document.getElementById('stock-ledger-timeline');
    if(container) container.innerHTML = '<div class="loader-spinner" style="margin: 40px auto;"></div>';

    try {
        let sales = [], purchases = [], adjustments = [];
        try { sales = await getAllRecords('sales'); } catch(e) {}
        try { purchases = await getAllRecords('purchases'); } catch(e) {}
        try { adjustments = await getAllRecords('adjustments'); } catch(e) {}

        if (!Array.isArray(sales)) sales = [];
        if (!Array.isArray(purchases)) purchases = [];
        if (!Array.isArray(adjustments)) adjustments = [];

        let history = [];
        const parseItems = (rawItems) => {
            if (!rawItems) return [];
            if (typeof rawItems === 'string') {
                try { return JSON.parse(rawItems); } catch(e) { return []; }
            }
            return Array.isArray(rawItems) ? rawItems : [];
        };

        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';

        // A. Check Sales (Stock Leaving)
        sales.forEach(sale => {
            if (!sale || sale.status === 'Open' || sale.firmId !== activeFirmId) return;
            const bucket = sale.invoiceType === 'Non-GST' ? 'NON-GST' : 'GST';
            const items = parseItems(sale.items);
            
            items.forEach(item => {
                if (item && (String(item.id) === String(productId) || String(item.itemId) === String(productId))) {
                    history.push({
                        date: sale.date || 'Unknown',
                        type: sale.documentType === 'return' ? 'IN' : 'OUT',
                        label: sale.documentType === 'return' ? `Credit Note (Return): ${sale.customerName || 'Customer'}` : `Sold to: ${sale.customerName || 'Cash Customer'}`,
                        ref: sale.invoiceNo || sale.orderNo || 'Invoice',
                        bucket: bucket,
                        qty: Number(item.qty) || 0,
                        docId: sale.id,
                        docType: 'sales',
                        originalDocType: sale.documentType || 'invoice'
                    });
                }
            });
        });

        // B. Check Purchases (Stock Entering)
        purchases.forEach(po => {
            if (!po || po.status === 'Open' || po.firmId !== activeFirmId) return;
            const bucket = po.invoiceType === 'Non-GST' ? 'NON-GST' : 'GST';
            const items = parseItems(po.items);
            
            items.forEach(item => {
                if (item && (String(item.id) === String(productId) || String(item.itemId) === String(productId))) {
                    history.push({
                        date: po.date || 'Unknown',
                        type: po.documentType === 'return' ? 'OUT' : 'IN',
                        label: po.documentType === 'return' ? `Debit Note (Return): ${po.supplierName || 'Vendor'}` : `Bought from: ${po.supplierName || 'Vendor'}`,
                        ref: po.poNo || po.invoiceNo || po.orderNo || 'PO/Bill',
                        bucket: bucket,
                        qty: Number(item.qty) || 0,
                        docId: po.id,
                        docType: 'purchase',
                        originalDocType: po.documentType || 'invoice'
                    });
                }
            });
        });

        // C. Check Manual Adjustments (Audits)
        adjustments.forEach(adj => {
            if (!adj || adj.firmId !== activeFirmId) return;
            if (String(adj.productId) === String(productId) || String(adj.itemId) === String(productId)) {
                history.push({
                    date: adj.date || 'Unknown',
                    type: adj.type === 'add' ? 'IN' : 'OUT',
                    label: `Stock Audit`,
                    ref: adj.notes || 'Manual Correction',
                    bucket: adj.bucket === 'non-gst' ? 'NON-GST' : 'GST',
                    qty: Number(adj.qty) || 0,
                    docId: adj.id,
                    docType: 'adjustments'
                });
            }
        });

        // ⚡ ENTERPRISE FIX 1: Robust Date Parser
        const parseDate = (d) => {
            if (!d) return 0;
            let dStr = String(d).trim();
            if (dStr.includes('-') && dStr.split('-')[0].length === 2) {
                const p = dStr.split('-');
                return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
            }
            if (dStr.includes('/') && dStr.split('/')[0].length === 2) {
                const p = dStr.split('/');
                return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
            }
            return new Date(dStr).getTime() || 0;
        };

        // ⚡ ENTERPRISE FIX 2: Calculated Forward Math with VISIBLE OPENING BALANCE
        
        let netHistoryChange = 0;
        history.forEach(tx => {
            let qty = parseFloat(tx.qty) || 0;
            if (tx.type === 'IN') netHistoryChange += qty;
            else netHistoryChange -= qty;
        });

        // Mathematically deduce the Opening Balance (before any transactions occurred)
        let implicitOpeningBalance = totalStock - netHistoryChange;

        // Sort chronologically (Oldest first)
        history.sort((a, b) => {
            const dateDiff = parseDate(a.date) - parseDate(b.date);
            if (dateDiff !== 0) return dateDiff;
            // Same day? Put INs before OUTs
            if (a.type === 'IN' && b.type === 'OUT') return -1;
            if (a.type === 'OUT' && b.type === 'IN') return 1;
            return String(a.docId).localeCompare(String(b.docId));
        });

        // Roll the Balance Forward & destroy floating-point ghosts!
        let runBal = implicitOpeningBalance;
        history.forEach(tx => {
            let qty = parseFloat(tx.qty) || 0;
            if (tx.type === 'IN') runBal += qty;
            else runBal -= qty;
            
            runBal = Math.round(runBal * 100) / 100;
            tx.runningBalance = runBal;
        });
        
        // ⚡ ENTERPRISE FIX 3: Inject the invisible Opening Balance into the UI!
        // This stops the user from thinking the math is wrong when they see the first row
        if (Math.abs(implicitOpeningBalance) > 0.001) {
            history.unshift({
                date: 'Opening',
                type: implicitOpeningBalance > 0 ? 'IN' : 'OUT',
                label: 'Opening Stock / Import',
                ref: 'Master Data',
                bucket: 'SYS',
                qty: Math.abs(implicitOpeningBalance),
                docId: 'open-bal',
                docType: 'opening',
                runningBalance: Math.round(implicitOpeningBalance * 100) / 100
            });
        }

        // Flip the list so Newest is at the top for the UI!
        history.reverse();

        if (!container) return;
        if (history.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: var(--md-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">inventory_2</span>
                    <p style="margin-top:12px; font-weight:500;">No stock movement found yet.</p>
                </div>`;
            return;
        }

        let html = '';
        history.forEach(tx => {
            const isOut = tx.type === 'OUT';
            const color = isOut ? '#ba1a1a' : '#146c2e';
            const bg = isOut ? '#fff0f2' : '#e8f5e9';
            const icon = tx.docId === 'open-bal' ? 'inventory' : (isOut ? 'arrow_upward' : 'arrow_downward');
            const sign = isOut ? '-' : '+';
            
            let bucketTag = '';
            if (tx.bucket === 'GST') {
                bucketTag = `<span style="font-size: 10px; border: 1px solid var(--md-outline-variant); color: #0061a4; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: white;">GST</span>`;
            } else if (tx.bucket === 'NON-GST') {
                bucketTag = `<span style="font-size: 10px; border: 1px solid var(--md-outline-variant); color: #d84315; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: white;">NON-GST</span>`;
            } else {
                bucketTag = `<span style="font-size: 10px; border: 1px solid var(--md-outline-variant); color: #535f70; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: white;">SYSTEM</span>`;
            }
            
            const docTypeParam = tx.originalDocType ? `', '${tx.originalDocType}'` : '';
            const clickAction = (tx.docType !== 'adjustments' && tx.docType !== 'opening') ? `onclick="if(window.app) window.app.openForm('${tx.docType}', '${tx.docId}'${docTypeParam})"` : '';
            const tapClass = clickAction ? 'tap-target' : '';

            html += `
                <div class="m3-card ${tapClass}" ${clickAction} style="padding: 16px; margin-bottom: 0; display: flex; align-items: center; gap: 16px; cursor: pointer;">
                    <div class="icon-circle" style="background: ${bg}; color: ${color}; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--md-outline-variant);">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <strong style="display:block; font-size:15px; color:var(--md-on-surface); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tx.label}</strong>
                        <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
                            <span style="font-size: 11px; background: var(--md-surface-variant); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: var(--md-on-surface-variant); border: 1px solid var(--md-outline-variant);">${tx.ref}</span>
                            ${bucketTag}
                            <small style="color:var(--md-text-muted); display:flex; align-items:center; gap: 4px; margin-left: auto;">
                                <span class="material-symbols-outlined" style="font-size:12px;">event</span> ${tx.date}
                            </small>
                        </div>
                    </div>
                    <div style="text-align: right; width: 85px;">
                        <strong style="font-size: 18px; color: ${color};">${sign}${Number(tx.qty).toFixed(2)}</strong>
                        <small style="display:block; color:var(--md-text-muted); font-size:10px; font-weight:bold; text-transform:uppercase;">Bal: ${Number(tx.runningBalance).toFixed(2)}</small>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;

    } catch (err) {
        console.error("Stock Ledger Error:", err);
        if (container) container.innerHTML = `<p style="color:red; text-align:center;">Failed to calculate ledger math.</p><p style="font-size:10px; color:gray; text-align:center;">${err.message}</p>`;
    }
};

// --- NEW CODE: Module Initialization ---
window.onload = async () => {
    await app.boot(); // 1. Boot the Microkernel Plugins first!
    app.init();       // 2. Then run the legacy init sequence
    
    // ⚡ ENTERPRISE FIX: PWA Home Screen Shortcut Router!
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'new_sale') {
        setTimeout(() => { if (window.app && window.app.openForm) window.app.openForm('sales'); }, 500);
    } else if (action === 'cashbook') {
        setTimeout(() => { if (window.UI && window.UI.openActivity) window.UI.openActivity('activity-cashbook'); }, 500);
    }
};
window.app = app; // Explicitly map to window to protect your HTML buttons

// BRIDGE FOR CLOUD.JS: Expose the database engine so Google Drive can access it
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;
// --- END OF NEW CODE ---
