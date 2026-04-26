// ==========================================
// SOLLO ERP - MAIN APPLICATION CONTROLLER (v6.1 Enterprise)
// ==========================================

// --- ENTERPRISE UPGRADE: KILL UGLY BROWSER ALERTS ---
// This secretly intercepts every standard alert() in the entire app and turns them into M3 Toasts!
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
    }
};

// --- ENTERPRISE UPGRADE: GLOBAL ERROR SHIELD ---
window.addEventListener('error', (event) => {
    console.error("Global Error Caught:", event.error);
    if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast("Something went wrong. Please try again.");
    }
});

window.addEventListener('unhandledrejection', (event) => {
    // Log the event for developers, but do NOT show a scary toast to the user.
    // This prevents false alarms from missing Service Workers or AdBlockers blocking Google Drive.
    console.warn("Silent background promise rejected:", event.reason);
});

// --- ENTERPRISE UPGRADE: POS WAKE LOCK (Keep Screen On) ---
let wakeLock = null;
const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            // STRICT ERP LOGIC: Destroy the old wake lock listener before creating a new one to prevent background memory leaks!
            if (wakeLock !== null) wakeLock.onrelease = null; 
            
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.onrelease = () => console.log('Screen Wake Lock released');
        }
    } catch (err) { console.warn(`Wake Lock error: ${err.name}, ${err.message}`); }
};
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
});
requestWakeLock(); // Request immediately on boot

// --- ENTERPRISE UPGRADE: "ANTI-SWIPE" DATA LOSS PREVENTER ---
window.addEventListener('beforeunload', (event) => {
    // STRICT ERP LOGIC: Only trap the user if they are inside a DATA ENTRY form, not a read-only PDF or Ledger report!
    const openForms = Array.from(document.querySelectorAll('.activity-screen.open')).filter(el => el.id.includes('-form'));
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

// --- NEW CODE: Import all our modules ---
// STRICT ERP LOGIC: Synchronized to v6.1 to prevent catastrophic double-booting of the database!
import { 
    initDB, getAllRecords, getRecordById, saveRecord, deleteRecordById, 
    getAllFirms, saveInvoiceTransaction, getNextDocumentNumber, 
    getKhataStatement, getGlobalTimeline, exportDatabase, importDatabase, generateGSTReport 
} from './db.js?v=6.1';
import Utils from './utils.js?v=6.1';
import UI from './ui.js?v=6.1';
// --- END OF NEW CODE ---

const app = {
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
                            }
                        });
                    });
                });
                
                // STRICT ERP LOGIC: Listen for the exact moment the new worker takes over, and force a hard reload!
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
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
        // STRICT ERP LOGIC: Inject Stock Adjustments into RAM so the Dashboard PnL can calculate Stock Loss!
        UI.state.rawData.adjustments = (await getAllRecords('adjustments')).filter(r => r.firmId === app.state.firmId);
        
        // 2. RAM CACHE: Static Master Data (Instant Load 0ms)
        if (!window.AppCache.items) window.AppCache.items = stripBloat((await getAllRecords('items')).filter(r => r.firmId === app.state.firmId));
        UI.state.rawData.items = window.AppCache.items;

        if (!window.AppCache.ledgers) window.AppCache.ledgers = (await getAllRecords('ledgers')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.ledgers = window.AppCache.ledgers;

        if (!window.AppCache.accounts) window.AppCache.accounts = (await getAllRecords('accounts')).filter(r => r.firmId === app.state.firmId);
        UI.state.rawData.accounts = window.AppCache.accounts;

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
        // NEW: WAREHOUSE HEALTH ENGINE
        // ==========================================
        if (UI.state.rawData.items) {
            let totalValuation = 0;
            let lowStockCount = 0;

            UI.state.rawData.items.forEach(i => {
                // STRICT ERP LOGIC: Bulletproof Math to prevent NaN wiping out the whole dashboard!
                const rawGst = parseFloat(i.stockGst);
                const rawNon = parseFloat(i.stockNonGst);
                const stockGst = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
                const stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                const totalStock = stockGst + stockNonGst;
                
                const buyPrice = parseFloat(i.buyPrice) || 0;
                totalValuation += (totalStock * buyPrice);

                const minStock = parseFloat(i.minStock) || 0;
                if (minStock > 0 && totalStock <= minStock) lowStockCount++;
            });

            const valEl = document.getElementById('dash-inventory-value');
            if (valEl) valEl.innerText = `₹${totalValuation.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            const lsText = document.getElementById('dash-low-stock-text');
            const lsIcon = document.getElementById('dash-low-stock-icon');
            const lsBtn = document.getElementById('dash-low-stock-btn');

            if (lsText && lsIcon && lsBtn) {
                if (lowStockCount > 0) {
                    lsText.innerText = `${lowStockCount} Items Low on Stock!`;
                    lsText.style.color = 'var(--md-error)';
                    lsIcon.innerText = 'warning';
                    lsIcon.style.color = 'var(--md-error)';
                    lsBtn.style.borderLeft = '4px solid var(--md-error)';
                } else {
                    lsText.innerText = `Stock Levels Optimal`;
                    lsText.style.color = 'var(--md-success)';
                    lsIcon.innerText = 'check_circle';
                    lsIcon.style.color = 'var(--md-success)';
                    lsBtn.style.borderLeft = '4px solid var(--md-success)';
                }
            }
        }

        // ==========================================
        // ENTERPRISE UPGRADE: RECEIVABLES AGING ENGINE
        // ==========================================
        if (UI.state.rawData.sales && UI.state.rawData.cashbook) {
            let bucket30 = 0, bucket60 = 0, bucket90 = 0, totalDue = 0;
            const today = new Date();
            
            // Build an instant payment lookup map
            const paymentMap = {};
            UI.state.rawData.cashbook.forEach(r => {
                if (r.firmId === app.state.firmId && r.invoiceRef && r.type === 'in') {
                    const refs = String(r.invoiceRef).split(',').map(x => x.trim());
                    const splitAmt = (parseFloat(r.amount) || 0) / (refs.length || 1);
                    refs.forEach(ref => paymentMap[ref] = (paymentMap[ref] || 0) + splitAmt);
                }
            });

            UI.state.rawData.sales.forEach(sale => {
                // STRICT ERP LOGIC: Ignore 'Open' (Draft) invoices so they don't create phantom debt!
                if (sale.firmId === app.state.firmId && sale.status !== 'Completed' && sale.status !== 'Open' && sale.documentType !== 'return') {
                    // Match the precise true balance using the core payment map
                    const uniqueRefs = [...new Set([sale.orderNo, sale.invoiceNo, sale.id].filter(Boolean))];
                    const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
                    const balance = (parseFloat(sale.grandTotal) || 0) - paid;

                    if (balance > 0.01) {
                        totalDue += balance;
                        const diffTime = Math.abs(today - new Date(sale.date));
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                        if (diffDays <= 30) bucket30 += balance;
                        else if (diffDays <= 60) bucket60 += balance;
                        else bucket90 += balance;
                    }
                }
            });

            const totalEl = document.getElementById('aging-total-due');
            if (totalEl) {
                totalEl.innerText = `₹${totalDue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-30-amt').innerText = `₹${bucket30.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-60-amt').innerText = `₹${bucket60.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-90-amt').innerText = `₹${bucket90.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                
                document.getElementById('aging-30-bar').style.width = totalDue > 0 ? `${(bucket30/totalDue)*100}%` : '0%';
                document.getElementById('aging-60-bar').style.width = totalDue > 0 ? `${(bucket60/totalDue)*100}%` : '0%';
                document.getElementById('aging-90-bar').style.width = totalDue > 0 ? `${(bucket90/totalDue)*100}%` : '0%';
            }
        }

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
    // ENTERPRISE UPGRADE: GLOBAL STOCK HEALER
    // ==========================================
    recalculateAllStock: async () => {
        if (!confirm("This will scan every past invoice and mathematically fix all corrupted stock & warehouse capital. Continue?")) return;
        try {
            if (window.Utils) window.Utils.showToast("Recalculating all stock... ⏳");
            
            // ENTERPRISE FIX: Isolate the stock recalculation strictly to the active company!
            const activeFirmId = app.state.firmId;
            const allItems = (await window.getAllRecords('items')).filter(i => i.firmId === activeFirmId);
            const allSales = (await window.getAllRecords('sales')).filter(s => s.firmId === activeFirmId);
            const allPurchases = (await window.getAllRecords('purchases')).filter(p => p.firmId === activeFirmId);
            const allAdjustments = (await window.getAllRecords('adjustments')).filter(a => a.firmId === activeFirmId);
            
            // 1. Reset all items to their Initial Opening Stock securely
            for (let i of allItems) { 
                i.stockGst = parseFloat(i.openingStockGst) || (parseFloat(i.openingStock) || 0); 
                i.stockNonGst = parseFloat(i.openingStockNonGst) || 0; 
                i.stock = parseFloat(i.openingStock) || 0; 
            }
            
            // 2. Mathematically rebuild stock step-by-step
            const processDocs = (docs, isSale) => {
                docs.forEach(doc => {
                    if (doc.status === 'Open') return; // Skip Drafts!
                    const isReturn = doc.documentType === 'return';
                    const isNonGST = doc.invoiceType === 'Non-GST';
                    (doc.items || []).forEach(row => {
                        const dbItem = allItems.find(item => String(item.id) === String(row.itemId || row.id));
                        if (dbItem) {
                            const qty = parseFloat(row.qty) || 0;
                            const impact = isSale ? (isReturn ? qty : -qty) : (isReturn ? -qty : qty);
                            if (isNonGST) dbItem.stockNonGst += impact;
                            else dbItem.stockGst += impact;
                        }
                    });
                });
            };
            processDocs(allSales, true);
            processDocs(allPurchases, false);
            
            // 3. Process Manual Stock Adjustments
            allAdjustments.forEach(adj => {
                const dbItem = allItems.find(item => String(item.id) === String(adj.itemId || adj.id));
                if (dbItem) {
                    const qty = parseFloat(adj.qty) || 0;
                    const impact = adj.type === 'add' ? qty : -qty;
                    if (adj.pool === 'nongst') dbItem.stockNonGst += impact;
                    else dbItem.stockGst += impact;
                }
            });
            
            // 4. Save corrected numbers to hard drive
            for (let i of allItems) {
                i.stockGst = Math.round(i.stockGst * 100) / 100;
                i.stockNonGst = Math.round(i.stockNonGst * 100) / 100;
                i.stock = Math.round((i.stockGst + i.stockNonGst) * 100) / 100;
                await window.saveRecord('items', i);
            }
            
            // Force RAM wipe and Dashboard Refresh
            if (window.AppCache) window.AppCache.items = null;
            await app.refreshAll();
            if (window.Utils) window.Utils.showToast("✅ Stock & Capital Mathematically Fixed!");
        } catch (e) {
            console.error(e);
            alert("Error recalculating stock: " + e.message);
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
                    
                    // STRICT ERP LOGIC: Properly calculate Dr vs Cr before merging opening balances!
                    const getSignedBal = (party) => {
                        let bal = parseFloat(party.openingBalance) || 0;
                        const bType = (party.balanceType || '').toLowerCase();
                        if (party.type === 'Customer') return (bType.includes('pay') || bType.includes('credit')) ? -bal : bal;
                        return (bType.includes('receive') || bType.includes('debit')) ? -bal : bal;
                    };

                    const masterSigned = getSignedBal(master);
                    const duplicateSigned = getSignedBal(l);
                    const newNetBal = masterSigned + duplicateSigned;
                    
                    master.openingBalance = Math.abs(newNetBal);
                    if (master.type === 'Customer') {
                        master.balanceType = newNetBal >= 0 ? 'To Receive / Debit' : 'To Pay / Credit';
                    } else {
                        master.balanceType = newNetBal >= 0 ? 'To Pay / Credit' : 'To Receive / Debit';
                    }
                    
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
                    
                    // ENTERPRISE FIX: Safely remap all Expenses to the official cash drawer so they don't get orphaned!
                    const expenses = await getAllRecords('expenses');
                    for (const e of expenses) { if (e.accountId === a.id) { e.accountId = 'cash'; await saveRecord('expenses', e); } }
                    
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
    // ENTERPRISE UPGRADE: STOCK ADJUSTMENT ENGINE
    // ==========================================
    openAdjustmentSheet: async () => {
        try {
            const allItems = await getAllRecords('items');
            // STRICT ERP LOGIC: Isolate items to the current active firm BEFORE checking if empty!
            const items = allItems.filter(i => i.firmId === app.state.firmId);
            const select = document.getElementById('adj-product-id');
            
            if (!items || items.length === 0) {
                alert("Please add at least one Product in Inventory for this company first!");
                return;
            }

            // Populate the dropdown with actual products and their dual stock pools!
            let html = '<option value="">Select Product...</option>';
            items.forEach(i => {
                if (i.firmId === app.state.firmId) {
                    const rawGst = parseFloat(i.stockGst);
                    const rawNon = parseFloat(i.stockNonGst);
                    let g = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
                    let ng = isNaN(rawNon) ? 0 : rawNon;
                    html += `<option value="${i.id}">${i.name} (GST: ${g.toFixed(2)} | Non-GST: ${ng.toFixed(2)})</option>`;
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
    // NEW: SMART LEDGER DYNAMIC FILTERS
    // ==========================================
    openMasterSort: () => {
        if (!window.UI || !window.UI.state) return;
        const type = window.UI.state.currentMasterType;
        const filterSelect = document.getElementById('filter-master-view');
        const sortSelect = document.getElementById('sort-master-view');

        if (!filterSelect || !sortSelect) return;

        let filterHTML = '<option value="All">All Records</option>';
        let sortHTML = '<option value="name-asc">A to Z (Ascending)</option><option value="name-desc">Z to A (Descending)</option>';

        if (type === 'products') {
            filterHTML += `
                <option value="In Stock">Stock Available</option>
                <option value="Low Stock">Low Stock Alert</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="GST Stock">Has GST Stock</option>
                <option value="Non-GST Stock">Has Non-GST Stock</option>
            `;
            sortHTML += `
                <option value="stock-asc">Lowest Stock First</option>
                <option value="stock-desc">Highest Stock First</option>
            `;
        } else if (type === 'customers') {
            filterHTML += `
                <option value="To Receive">Pending Dues (To Receive)</option>
                <option value="Advance">Advance Received</option>
                <option value="Settled">Settled / Zero Balance</option>
            `;
            sortHTML += `
                <option value="bal-desc">Highest Balance First</option>
                <option value="bal-asc">Lowest Balance First</option>
            `;
        } else if (type === 'suppliers') {
            filterHTML += `
                <option value="To Pay">Pending Bills (To Pay)</option>
                <option value="Advance">Advance Paid</option>
                <option value="Settled">Settled / Zero Balance</option>
            `;
            sortHTML += `
                <option value="bal-desc">Highest Balance First</option>
                <option value="bal-asc">Lowest Balance First</option>
            `;
        }

        filterSelect.innerHTML = filterHTML;
        sortSelect.innerHTML = sortHTML;
        window.UI.openBottomSheet('sheet-master-sort');
    },

    applySmartMasterFilter: () => {
        // The old, clunky DOM filter has been deleted!
        // We now rely 100% on the lightning-fast native data filter inside ui.js!
        if (window.UI && typeof window.UI.applyFilters === 'function') {
            window.UI.applyFilters('masters');
        }
    },

    // ==========================================
    // NEW: SIMPLE MASTER CRUD ENGINE
    // ==========================================
    loadDropdowns: async () => {
        // STRICT ERP LOGIC: Multi-Company Data Isolation for Settings!
        // 1. Auto-seed and Load Units
        let allUnits = await getAllRecords('units');
        let units = allUnits.filter(u => u.firmId === app.state.firmId);
        
        if (units.length === 0) {
            const defaults = ['Pcs', 'Kg', 'Mtr', 'Ltr', 'Box', 'Dozen', 'Tonnes'];
            for (let u of defaults) await saveRecord('units', { id: Utils.generateId(), firmId: app.state.firmId, name: u });
            units = (await getAllRecords('units')).filter(u => u.firmId === app.state.firmId);
        }
        const uomSelect = document.getElementById('product-uom-select');
        if (uomSelect) uomSelect.innerHTML = units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');

        // 2. Auto-seed and Load Categories
        let allCats = await getAllRecords('expenseCategories');
        let cats = allCats.filter(c => c.firmId === app.state.firmId);
        
        if (cats.length === 0) {
            const defaults = ['Salary', 'Rent', 'Electricity', 'Transport', 'Office Supplies', 'Marketing', 'Maintenance', 'Other'];
            for (let c of defaults) await saveRecord('expenseCategories', { id: Utils.generateId(), firmId: app.state.firmId, name: c });
            cats = (await getAllRecords('expenseCategories')).filter(c => c.firmId === app.state.firmId);
        }
        const catSelect = document.getElementById('expense-category-select');
        if (catSelect) catSelect.innerHTML = '<option value="">Select Category...</option>' + cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    manageSimpleMaster: async (storeName, title) => {
        const titleEl = document.getElementById('simple-master-title');
        if (titleEl) titleEl.innerText = `Manage ${title}`;

        // STRICT ERP LOGIC: Only fetch records for the active company!
        const allRecords = await getAllRecords(storeName);
        const records = allRecords.filter(r => r.firmId === app.state.firmId);

        const listEl = document.getElementById('list-simple-master');
        if (listEl) {
            if (records.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color:var(--md-text-muted); margin-top: 20px;">No items found.</p>';
            } else {
                listEl.innerHTML = records.map(r => `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 14px 12px; border-bottom: 1px solid var(--md-surface-variant); border-radius: 8px; margin-bottom: 4px; background: var(--md-surface);">
                        <span style="font-size: 16px; font-weight: 500;">${r.name}</span>
                        <div class="icon-circle tap-target" style="width: 36px; height: 36px; background: #fff0f2; color: var(--md-error);" onclick="app.deleteSimpleMaster('${storeName}', '${r.id}', '${title}')">
                            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                        </div>
                    </li>
                `).join('');
            }
        }

        const addBtn = document.getElementById('btn-add-simple-master');
        const inputEl = document.getElementById('simple-master-input');
        
        if (addBtn && inputEl) {
            inputEl.value = ''; 
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);
            
            newAddBtn.onclick = async () => {
                const newName = inputEl.value.trim();
                if (!newName) return window.Utils.showToast("⚠️ Name cannot be empty");
                
                if (records.some(r => r.name.toLowerCase() === newName.toLowerCase())) {
                    return window.Utils.showToast("⚠️ This already exists!");
                }

                // STRICT ERP LOGIC: Attach the firmId so it doesn't bleed into other companies!
                await saveRecord(storeName, { id: Utils.generateId(), firmId: app.state.firmId, name: newName });
                window.Utils.showToast("Added successfully! ✅");
                
                app.manageSimpleMaster(storeName, title); 
                app.loadDropdowns(); 
            };
        }

        if (window.UI) window.UI.openBottomSheet('sheet-simple-master');
        
        // Premium Polish: Auto-focus the text box so the mobile keyboard pops up instantly!
        setTimeout(() => {
            const input = document.getElementById('simple-master-input');
            if (input) input.focus();
        }, 300);
    },

    deleteSimpleMaster: async (storeName, id, title) => {
        if (!confirm("Are you sure you want to delete this?")) return;
        
        await deleteRecordById(storeName, id);
        window.Utils.showToast("Deleted successfully! 🗑️");
        
        app.manageSimpleMaster(storeName, title);
        app.loadDropdowns(); 
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
        
        // STRICT ERP LOGIC: Failsafe for unreadable, locked, or corrupted files from the OS!
        reader.onerror = () => {
            alert("ERROR: The file could not be read. It may be locked by another application like Excel, or corrupted.");
            event.target.value = ''; // Unlock the input so they can try again
        };
        
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

                        // STRICT ERP LOGIC: Strip commas from Excel CSV exports before parsing to prevent data corruption!
                        const cleanNum = (val) => parseFloat(String(val || '0').replace(/,/g, '')) || 0;

                        const data = {
                            id: match ? match.id : Utils.generateId(),
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            // STRICT ERP LOGIC: Retain existing data if the CSV cells are blank!
                            sellPrice: (cols[sellIdx] !== undefined && cols[sellIdx] !== '') ? cleanNum(cols[sellIdx]) : (match ? match.sellPrice : 0),
                            buyPrice: (cols[buyIdx] !== undefined && cols[buyIdx] !== '') ? cleanNum(cols[buyIdx]) : (match ? match.buyPrice : 0),
                            // STRICT ERP LOGIC: Safely preserve the segregated GST and Non-GST stock pools!
                            stock: match ? match.stock : cleanNum(cols[stockIdx]),
                            stockGst: match ? match.stockGst : cleanNum(cols[stockIdx]),
                            stockNonGst: match ? (match.stockNonGst || 0) : 0,
                            openingStock: match ? (match.openingStock || match.stock || 0) : cleanNum(cols[stockIdx]),
                            openingStockGst: match ? (match.openingStockGst || match.stockGst || 0) : cleanNum(cols[stockIdx]),
                            openingStockNonGst: match ? (match.openingStockNonGst || match.stockNonGst || 0) : 0,
                            minStock: (cols[minStockIdx] !== undefined && cols[minStockIdx] !== '') ? cleanNum(cols[minStockIdx]) : (match ? match.minStock : 0),
                            uom: (cols[uomIdx] !== undefined && cols[uomIdx] !== '') ? cols[uomIdx] : (match ? match.uom : 'Pcs'),
                            gst: (cols[gstIdx] !== undefined && cols[gstIdx] !== '') ? cleanNum(cols[gstIdx]) : (match ? match.gst : 0),
                            hsn: (cols[hsnIdx] !== undefined && cols[hsnIdx] !== '') ? cols[hsnIdx] : (match ? match.hsn : '')
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

                        const cleanNum = (val) => parseFloat(String(val || '0').replace(/,/g, '')) || 0;

                        const data = {
                            id: match ? match.id : Utils.generateId(), // Re-use ID if they already exist
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            type: pType,
                            phone: (cols[phoneIdx] !== undefined && cols[phoneIdx] !== '') ? cols[phoneIdx] : (match ? match.phone : ''),
                            gst: (cols[gstIdx] !== undefined && cols[gstIdx] !== '') ? cols[gstIdx].toUpperCase() : (match ? match.gst : ''),
                            city: (cols[cityIdx] !== undefined && cols[cityIdx] !== '') ? cols[cityIdx] : (match ? match.city : ''),
                            state: (cols[stateIdx] !== undefined && cols[stateIdx] !== '') ? cols[stateIdx] : (match ? match.state : ''),
                            address: (cols[addrIdx] !== undefined && cols[addrIdx] !== '') ? cols[addrIdx] : (match ? match.address : ''),
                            // STRICT ERP LOGIC: If CSV balance is blank, retain the existing database balance!
                            openingBalance: (cols[obIdx] !== undefined && cols[obIdx] !== '') ? cleanNum(cols[obIdx]) : (match ? match.openingBalance : 0),
                            balanceType: (cols[typeIdx] !== undefined && cols[typeIdx] !== '') ? balType : (match ? match.balanceType : balType)
                        };
                        await saveRecord('ledgers', data);
                        
                        // FIX: Push the new party into memory so if the CSV has the same name twice, it doesn't duplicate!
                        if (!match) existingLedgers.push(data);
                        else Object.assign(match, data);

                        successCount++;
                    }
                    
                    // STRICT ERP LOGIC: Prevent Main Thread Lockout! Yield to the browser every 25 rows to prevent mobile RAM crashes during massive CSV uploads.
                    if (i % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0));
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
        if(editBtn) {
            editBtn.style.display = 'flex';
            editBtn.onclick = () => { 
                UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
                setTimeout(() => app.openForm('ledger', partyId), 150); // Open the form smoothly
            };
        }
        
        // STRICT ERP LOGIC: Bind the PDF/Share button to generate the A4 Khata Statement!
        const shareBtn = document.getElementById('btn-share-ledger');
        if(shareBtn) {
            shareBtn.style.display = 'flex';
            shareBtn.onclick = () => {
                window.executeKhataReport(partyId, partyName, partyType);
            };
        }
        
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
            editBtn.style.display = 'flex';
            if(accountId === 'cash') {
                editBtn.onclick = () => window.Utils.showToast('The Default Cash Drawer is a system account and cannot be modified directly.');
            } else {
                editBtn.onclick = () => { 
                    UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
                    setTimeout(() => app.openForm('account', accountId), 150); // Open the form smoothly
                };
            }
        }
        
        // STRICT ERP LOGIC: Wire the PDF Share button to generate the Bank/Cash Statement!
        const shareBtn = document.getElementById('btn-share-ledger');
        if (shareBtn) {
            shareBtn.style.display = 'flex';
            shareBtn.onclick = () => window.executeAccountReport(accountId);
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

            // STRICT ERP LOGIC: Sort by Date AND ID to prevent same-day bank passbook scrambling!
            timeline.sort((a, b) => {
                if (a.id === 'open-bal') return -1;
                if (b.id === 'open-bal') return 1;
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.id > b.id) ? 1 : -1;
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
        
        // STRICT ERP LOGIC: Block Cross-Company Leaks and safely map Supplier Bills!
        const originalDocNo = originalDoc.invoiceNo || originalDoc.poNo || originalDoc.orderNo || originalDoc.id;
        const previousReturns = allDocs.filter(d => d.firmId === app.state.firmId && d.documentType === 'return' && d.orderNo === originalDocNo);
        
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
                const tr = document.createElement('div');
                tr.className = 'item-entry-card m3-card tap-target';
                tr.style.cssText = `padding: 12px; margin-bottom: 8px; border-left: 4px solid var(--md-error);`;
                
                tr.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="flex: 1;">
                            <strong style="font-size: 15px; color: var(--md-on-surface);">${item.name}</strong>
                            <br><small style="color:var(--md-error); font-weight: bold;">Max Return: ${maxAllowable}</small>
                            <div style="font-size: 11px; color: var(--md-text-muted); margin-top: 2px;">HSN: <input type="text" class="row-hsn" value="${item.hsn || ''}" readonly style="width: 60px; border:none; background:transparent; font-size: 11px;"></div>
                            
                            <input type="hidden" class="row-item-id" value="${item.itemId}">
                            <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                            <input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">
                            <input type="hidden" class="row-uom" value="${item.uom || ''}">
                        </div>
                        <div class="icon-circle tap-target" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 28px; height: 28px; background: #fff0f2; color: var(--md-error); flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; align-items: end; background: #fff0f2; padding: 8px; border-radius: 8px;">
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-error);">Return Qty (${item.uom || 'Pcs'})</small>
                            <input type="number" inputmode="decimal" class="row-qty" value="0" min="0" max="${maxAllowable}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; font-weight: bold; border: 1px solid var(--md-error); border-radius: 4px; color: var(--md-error);">
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-text-muted);">Rate (₹)</small>
                            <input type="number" inputmode="decimal" class="row-rate" value="${item.rate}" step="any" readonly oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; border: 1px solid var(--md-outline-variant); border-radius: 4px; background: var(--md-surface-variant);">
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-text-muted);">GST %</small>
                            <input type="number" inputmode="decimal" class="row-gst" value="${item.gstPercent || 0}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; border: 1px solid var(--md-outline-variant); border-radius: 4px;">
                        </div>
                    </div>
                    
                    <div style="text-align: right; margin-top: 8px; padding-right: 4px;">
                        <small style="color:var(--md-text-muted);">Total: </small><strong class="row-total" style="font-size: 15px; color: var(--md-error);">0.00</strong>
                    </div>
                `;
                tbody.appendChild(tr);
            }
        });
        
        const orderNoEl = document.getElementById(`${type}-order-no`);
        if (orderNoEl) orderNoEl.value = originalDoc.invoiceNo;
        
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
        
        // Calculate true balance to only show genuinely unpaid invoices
        const receipts = await getAllRecords('receipts');
        const paymentMap = {};
        receipts.forEach(c => {
            if (c.firmId === activeFirmId && c.invoiceRef && c.ledgerId === partyId) {
                let amt = parseFloat(c.amount) || 0;
                if (storeName === 'sales') amt = c.type === 'in' ? amt : -amt;
                if (storeName === 'purchases') amt = c.type === 'out' ? amt : -amt;
                
                // NEW: Split amount evenly if linked to multiple invoices
                const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                if (refs.length > 0) {
                    let splitAmt = amt / refs.length;
                    refs.forEach(r => {
                        paymentMap[r] = (paymentMap[r] || 0) + splitAmt;
                    });
                }
            }
        });

        // STRICT ERP LOGIC: Factor in Credit/Debit Notes to prevent Phantom Debt in the dropdown!
        const returnMap = {};
        allDocs.forEach(d => {
            if (d.firmId === activeFirmId && d.documentType === 'return' && d.status !== 'Open') {
                const ref = d.orderNo; // Returns link to the original invoice via orderNo
                if (ref) returnMap[ref] = (returnMap[ref] || 0) + (parseFloat(d.grandTotal) || 0);
            }
        });

        const pendingDocs = allDocs.filter(doc => {
            if (doc.firmId !== activeFirmId || doc[partyKey] !== partyId) return false;
            if (doc.status === 'Open' || doc.documentType === 'return') return false;
            
            // BULLETPROOF MATH: Safely catches ghost IDs and clean Order Numbers
            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
            const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
            const returned = uniqueRefs.reduce((sum, ref) => sum + (returnMap[ref] || 0), 0);
            
            const balance = (parseFloat(doc.grandTotal) || 0) - paid - returned;
            return balance > 0.01; 
        });

        if (pendingDocs.length === 0) {
            selectEl.innerHTML = '<option value="">No pending invoices (On Account)</option>';
        } else {
            const options = pendingDocs.map(doc => {
                const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
                const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
                const returned = uniqueRefs.reduce((sum, ref) => sum + (returnMap[ref] || 0), 0);
                
                const balance = (parseFloat(doc.grandTotal) || 0) - paid - returned;
                
                // BULLETPROOF: Directly save the clean Order/PO number to the database!
                const docNo = (isMoneyIn ? (doc.orderNo || doc.invoiceNo) : (doc.orderNo || doc.poNo || doc.invoiceNo)) || doc.id;
                
                let displayNo = '';
                if (isMoneyIn) {
                    displayNo = doc.orderNo || doc.invoiceNo || String(doc.id).slice(-4).toUpperCase();
                } else {
                    displayNo = doc.orderNo || doc.poNo || doc.invoiceNo || String(doc.id).slice(-4).toUpperCase();
                }
                
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
                
                // STRICT ERP LOGIC: Unlock the stock fields for BRAND NEW products!
                if (type === 'product') {
                    const stockInputs = form.querySelectorAll('input[name="stockGst"], input[name="stockNonGst"], input[name="stock"]');
                    stockInputs.forEach(input => {
                        input.readOnly = false;
                        input.style.backgroundColor = '';
                        input.style.border = '';
                    });
                }
            }
            
            // NEW: Ensure the valuation card is hidden when creating a brand new product
            if (type === 'product') {
                const valCard = document.getElementById('product-valuation-card');
                if (valCard) valCard.classList.add('hidden');
            }
            
            // Hide delete buttons for new records
            UI.toggleDeleteButton(type, !!id);

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
                    // NEW: Auto increment Order Ref No as well
                    document.getElementById('sales-order-no').value = await getNextDocumentNumber('sales', 'ORD', 'orderNo');
                } else if (type === 'purchase' && typeof getNextDocumentNumber === 'function') {
                    document.getElementById('purchase-po-no').value = ''; // Keep Supplier Bill blank
                    // ENTERPRISE FIX: Dynamically assign DN prefix for Debit Notes to prevent PO corruption!
                    const prefix = docType === 'return' ? 'DN' : 'PO';
                    document.getElementById('purchase-order-no').value = await getNextDocumentNumber('purchases', prefix, 'orderNo');
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
            (record.items || []).forEach(item => {
                let maxHtml = 'min="0.01" step="any"';
                let maxLabel = '';
                
                if (record.documentType === 'return' && originalDoc) {
                    const origItem = originalDoc.items.find(i => i.itemId === item.itemId);
                    if (origItem) {
                        const maxAllowable = parseFloat(origItem.qty) - (returnedQtyMap[item.itemId] || 0);
                        maxHtml = `min="0" max="${maxAllowable}" step="any"`;
                        maxLabel = `<br><small style="color:var(--md-text-muted);">Max Return: ${maxAllowable}</small>`;
                    }
                }

                const tr = document.createElement('div');
                tr.className = 'item-entry-card m3-card tap-target';
                tr.style.cssText = `padding: 12px; margin-bottom: 8px; border-left: 4px solid ${type === 'sales' ? 'var(--md-primary)' : 'var(--md-error)'};`;
                
                tr.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="flex: 1;">
                            <strong style="font-size: 15px; color: var(--md-on-surface);">${item.name}</strong>
                            ${maxLabel}
                            <div style="font-size: 11px; color: var(--md-text-muted); margin-top: 2px;">HSN/SAC: <input type="text" class="row-hsn" value="${item.hsn || ''}" placeholder="HSN" style="width: 60px; border:none; border-bottom: 1px solid var(--md-outline-variant); background:transparent; font-size: 11px; padding: 2px;"></div>
                            
                            ${type === 'sales' && record.documentType !== 'return' ? `
                            <div style="display:flex; align-items:center; gap:4px; margin-top:6px;">
                                <span style="font-size:11px; color:var(--md-text-muted);">Buy: ₹</span>
                                <input type="number" inputmode="decimal" class="row-item-buyprice" value="${item.buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:60px; padding:2px 4px; font-size:11px; border:1px solid var(--md-outline-variant); border-radius:4px; background:var(--md-surface);">
                            </div>
                            <small class="live-margin" style="font-size:10px; display:block; margin-top:4px; color:var(--md-success);"></small>
                            ` : `<input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">`}
                            
                            <input type="hidden" class="row-item-id" value="${item.itemId}">
                            <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                            <input type="hidden" class="row-uom" value="${item.uom || ''}">
                        </div>
                        <div class="icon-circle tap-target" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 28px; height: 28px; background: #fff0f2; color: var(--md-error); flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; align-items: end; background: var(--md-surface-variant); padding: 8px; border-radius: 8px;">
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-text-muted);">Qty (${item.uom || 'Pcs'})</small>
                            <input type="number" inputmode="decimal" class="row-qty" value="${item.qty}" ${maxHtml} oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; font-weight: bold; border: 1px solid var(--md-outline-variant); border-radius: 4px; ${record.documentType === 'return' ? 'border-color:var(--md-error);' : ''}">
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-text-muted);">Rate (₹)</small>
                            <input type="number" inputmode="decimal" class="row-rate" value="${item.rate}" step="any" ${record.documentType === 'return' ? 'readonly' : ''} oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; border: 1px solid var(--md-outline-variant); border-radius: 4px; ${record.documentType === 'return' ? 'background:var(--md-background);' : ''}">
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:var(--md-text-muted);">GST %</small>
                            <input type="number" inputmode="decimal" class="row-gst" value="${item.gstPercent || 0}" step="any" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 100%; padding: 6px; border: 1px solid var(--md-outline-variant); border-radius: 4px;">
                        </div>
                    </div>
                    
                    <div style="text-align: right; margin-top: 8px; padding-right: 4px;">
                        <small style="color:var(--md-text-muted);">Total: </small><strong class="row-total" style="font-size: 15px; color: var(--md-on-surface);">0.00</strong>
                    </div>
                `;
                tbody.appendChild(tr);
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
                if (el.name) {
                    // STRICT ERP LOGIC: Prevent Ghost Data! Clear the field if the new record doesn't have a value.
                    const val = record[el.name] !== undefined ? record[el.name] : '';
                    if (el.type === 'checkbox') {
                        el.checked = !!val;
                    } else {
                        el.value = val;
                        if (el._flatpickr) {
                            if (val) el._flatpickr.setDate(val);
                            else el._flatpickr.clear();
                        }
                    }
                }
            }
            
            // STRICT ERP LOGIC: Lock Inventory fields on existing products to prevent audit trail bypass!
            if (type === 'product' && id) {
                const stockInputs = form.querySelectorAll('input[name="stockGst"], input[name="stockNonGst"], input[name="stock"]');
                stockInputs.forEach(input => {
                    input.readOnly = true;
                    input.style.backgroundColor = 'var(--md-surface-variant)';
                    input.style.border = '1px dashed var(--md-outline-variant)';
                    input.title = "To change existing inventory, please use the official Stock Adjustment tool.";
                });
            }
            
            // Recover images so they aren't erased on save
            if (type === 'product' && record.image) {
                const img = document.getElementById('product-image-preview');
                if (img) { img.src = record.image; img.classList.remove('hidden'); }
            }
            
            // NEW: Calculate and display the Total Stock Valuation!
            if (type === 'product') {
                const valCard = document.getElementById('product-valuation-card');
                if (valCard) {
                    valCard.classList.remove('hidden');
                    
                    const totalStock = parseFloat(record.stock) || 0;
                    const buyPrice = parseFloat(record.buyPrice) || 0;
                    const totalValue = totalStock * buyPrice;
                    
                    const stockDisp = document.getElementById('product-total-stock-display');
                    const valDisp = document.getElementById('product-total-value-display');
                    
                    if (stockDisp) stockDisp.innerText = `${totalStock} ${record.uom || 'Units'} Total`;
                    if (valDisp) valDisp.innerText = `₹${totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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
                        // SELF-HEALING: Catch broken fragments and protect against corrupted empty IDs!
                        const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || (s.id && s.id.endsWith(linkId)));
                        const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || (p.id && p.id.endsWith(linkId)));
                        
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
        ['sales', 'purchase'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // NEW: Lock the submit button to prevent duplicate entries
                    const submitBtn = document.getElementById(`btn-save-${type}`);
                    // FIXED: Capture the dynamic text (e.g., "Save Credit Note") before overriding it
                    const originalText = submitBtn ? submitBtn.innerText : `Save ${type === 'sales' ? 'Invoice' : 'Purchase'}`;
                    
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Saving...";
                        submitBtn.style.opacity = "0.7";
                    }

                    try {
                        const partyKey = type === 'sales' ? 'customer' : 'supplier';
                    const partyId = document.getElementById(`${type}-${partyKey}-id`).value;
                    if (!partyId) return alert(`Please select a ${partyKey}.`);

                    // STRICT ERP LOGIC: Block Future Dates to protect PnL and Aging Reports!
                    const docDate = document.getElementById(`${type}-date`).value;
                    if (docDate) {
                        const selectedDate = new Date(docDate);
                        const today = new Date();
                        today.setDate(today.getDate() + 1); // Allow up to 1 day for timezone safety
                        if (selectedDate > today) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert("ERROR: You cannot save a document with a future date. Please correct the date to protect your financial reports.");
                        }
                    }

                    const items = [];
                    const rows = document.querySelectorAll(`#${type}-items-body .item-entry-card`);
                    if (rows.length === 0) return alert("Please add at least one item.");

                    rows.forEach(tr => {
                        const qtyInput = tr.querySelector('.row-qty');
                        let qty = parseFloat(qtyInput.value) || 0;
                        
                        // STRICT ERP LOGIC: Enforce the max limit for Returns to protect inventory
                        if (qtyInput.hasAttribute('max')) {
                            const maxAllowable = parseFloat(qtyInput.getAttribute('max'));
                            if (qty > maxAllowable) qty = maxAllowable;
                        }
                        
                        if (qty <= 0) return; // FIX: Prevent saving empty "0 qty" items from Returns or accidental inputs

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

                    const isReturn = app.state.currentDocType === 'return';
                    const discTypeEl = document.getElementById(`${type}-discount-type`);
                    const accEl = document.getElementById(`${type}-account-id`);

                    // FIX: Prevent Duplicate Numbers, but safetly IGNORE blank numbers!
                    const proposedDocNo = type === 'sales' ? document.getElementById('sales-invoice-no').value : document.getElementById('purchase-po-no').value;
                    const allExistingDocs = await getAllRecords(type === 'sales' ? 'sales' : 'purchases');
                    
                    if (proposedDocNo && proposedDocNo.trim() !== '') {
                        const isDuplicate = allExistingDocs.some(d => 
                            d.firmId === app.state.firmId && 
                            (type === 'sales' ? true : d.supplierId === partyId) &&
                            (d.invoiceNo === proposedDocNo || d.poNo === proposedDocNo) && 
                            d.id !== app.state.currentEditId
                        );
                        if (isDuplicate) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert(`Error: Document number "${proposedDocNo}" already exists! Please use a unique number.`);
                        }
                    }

                    // Negative Inventory Warning (With Edit Recovery Math & Purchase Returns)
                    const isReducingStock = (type === 'sales' && !isReturn) || (type === 'purchase' && isReturn);
                    if (isReducingStock) {
                        const allItems = await getAllRecords('items');
                        let existingInvoice = null;
                        if (app.state.currentEditId) {
                            existingInvoice = await getRecordById(type === 'sales' ? 'sales' : 'purchases', app.state.currentEditId);
                        }
                        
                        // NEW: Detect which stock pool this invoice is attempting to pull from!
                        const invTypeEl = document.getElementById(`${type}-invoice-type`);
                        const isNonGST = invTypeEl ? invTypeEl.value === 'Non-GST' : false;
                        const poolName = isNonGST ? 'Non-GST' : 'GST';
                        
                        for (const row of items) {
                            const dbItem = allItems.find(i => i.id === row.itemId);
                            if (dbItem) {
                                // Isolate the exact stock pool being targeted (Bulletproof Math)
                                const rawGst = parseFloat(dbItem.stockGst);
                                const rawNon = parseFloat(dbItem.stockNonGst);
                                let stockGst = isNaN(rawGst) ? (parseFloat(dbItem.stock) || 0) : rawGst;
                                let stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                                let effectiveStock = isNonGST ? stockNonGst : stockGst;
                                
                                // If editing an already-completed invoice, temporarily add the old qty back to the pool
                                if (existingInvoice && existingInvoice.status !== 'Open') {
                                    const oldItem = existingInvoice.items.find(i => i.itemId === row.itemId);
                                    if (oldItem) effectiveStock += (parseFloat(oldItem.qty) || 0);
                                }
                                
                                if (effectiveStock < parseFloat(row.qty)) {
                                    if (!confirm(`Warning: You are trying to deduct ${row.qty} of "${row.name}", but your effective ${poolName} stock is only ${effectiveStock}. This will cause negative inventory. Continue anyway?`)) {
                                        return; 
                                    }
                                }
                            }
                        }
                    }

                    const data = {
                        id: app.state.currentEditId || Utils.generateId(),
                        firmId: app.state.firmId,
                        documentType: app.state.currentDocType,
                        date: document.getElementById(`${type}-date`).value,
                        orderDate: document.getElementById(`${type}-order-date`).value,
                        shippedDate: document.getElementById(`${type}-shipped-date`).value,
                        completedDate: document.getElementById(`${type}-completed-date`).value,
                        
                        [type === 'sales' ? 'customerId' : 'supplierId']: partyId,
                        [type === 'sales' ? 'customerName' : 'supplierName']: document.getElementById(`${type}-${partyKey}-display`).innerText,
                        
                        invoiceNo: type === 'sales' ? document.getElementById('sales-invoice-no').value : (document.getElementById('purchase-po-no').value), 
                        poNo: type === 'purchase' ? document.getElementById('purchase-po-no').value : '',
                        orderNo: document.getElementById(`${type}-order-no`).value,
                        status: document.getElementById(`${type}-order-status`).value,
                        freightAmount: parseFloat(document.getElementById(`${type}-freight`).value) || 0,
                        invoiceType: document.getElementById(`${type}-invoice-type`) ? document.getElementById(`${type}-invoice-type`).value : 'B2B',
                        
                        items: items,
                        
                        subtotal: parseFloat(document.getElementById(`${type}-subtotal`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        // STRICT ERP LOGIC: Force absolute numbers to prevent negative discounts from inflating the total!
                        discount: Math.abs(parseFloat(document.getElementById(`${type}-discount`).value) || 0),
                        discountType: discTypeEl ? discTypeEl.value : '\u20B9',
                        totalGst: parseFloat(document.getElementById(`${type}-gst-total`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        grandTotal: parseFloat(document.getElementById(`${type}-grand-total`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        internalNotes: document.getElementById(`${type}-internal-notes`) ? document.getElementById(`${type}-internal-notes`).value : '',
                        
                        // NEW: Instant payments removed. Hardcoded to 0. All payments use manual receipts now.
                        amountPaid: 0,
                        paymentMode: 'Cash',
                        accountId: 'cash'
                    };

                        const storeName = type === 'sales' ? 'sales' : 'purchases';
                        
                        // STRICT ERP LOGIC 1: THE PRE-TRANSACTION CACHE ANNIHILATOR!
                        // Destroy the browser's RAM cache BEFORE the database does its math. 
                        // This guarantees the engine fetches the TRUE existing invoice and stops the stock from multiplying!
                        if (window.AppCache) {
                            window.AppCache.items = null;
                            window.AppCache[storeName] = null;
                        }

                        // Execute the perfect database math
                        await saveInvoiceTransaction(storeName, data);
                        
                        // THE STATE TRANSITION LOCK
                        app.state.currentEditId = data.id;
                        
                        // STRICT ERP LOGIC 2: THE POST-TRANSACTION CACHE ANNIHILATOR!
                        // Destroy the cache a second time! This forces the Dashboard to read the newly saved hard drive data.
                        if (window.AppCache) {
                            window.AppCache.items = null;
                            window.AppCache[storeName] = null;
                        }
                        
                        // STRICT ERP LOGIC 3: INJECT THE ABSOLUTE TRUTH
                        // Fetch the mathematically perfect stock directly from the hard drive and force it into the UI
                        const absoluteTruth = await window.getAllRecords('items');
                        if (window.UI && window.UI.state && window.UI.state.rawData) {
                            window.UI.state.rawData.items = absoluteTruth;
                        }
                        
                        // NEW: Auto-Complete Advance Payments Engine
                        if (typeof app.autoCompleteInvoices === 'function') {
                            await app.autoCompleteInvoices(partyId, type);
                        }
                        
                        UI.showSuccess(); 
                        UI.closeActivity(`activity-${type}-form`);
                        
                        // STRICT ERP LOGIC 4: Execute a flawless, synchronized global refresh
                        if (typeof app.refreshAll === 'function') {
                            await app.refreshAll();
                        } else if (window.UI && typeof window.UI.renderDashboard === 'function') {
                            window.UI.renderDashboard();
                        }
                    } catch (error) {
                        console.error("Save failed:", error);
                        alert("An error occurred while saving. Please try again.");
                    } finally {
                        // STRICT ERP LOGIC 3: THE ANIMATION SHIELD
                        // Do NOT unlock the button instantly! Wait 400ms so the CSS slide-down animation 
                        // finishes completely, making it physically impossible to double-click.
                        if (submitBtn) {
                            setTimeout(() => {
                                submitBtn.disabled = false;
                                submitBtn.innerText = originalText; 
                                submitBtn.style.opacity = "1";
                            }, 400); 
                        }
                    }
                });
            }
        });

        // ------------------ GENERAL CRUD FORMS ------------------
        ['product', 'ledger', 'expense', 'account'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerText : 'Save';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving...";
                    submitBtn.style.opacity = "0.7";
                }

                try {
                    const formData = new FormData(form);
                    
                    let storeName = `${type}s`;
                    if (type === 'product') storeName = 'items';
                    else if (type === 'account') storeName = 'accounts';

                    // Initialize data and merge with existing database record to prevent wiping hidden fields
                    let data = { id: app.state.currentEditId || Utils.generateId(), firmId: app.state.firmId };
                    
                    if (app.state.currentEditId) {
                        const existingRecord = await getRecordById(storeName, app.state.currentEditId);
                        if (existingRecord) data = { ...existingRecord };
                    }
                    
                    formData.forEach((value, key) => { data[key] = value; });
                
                if (type === 'product') {
                    data.sellPrice = parseFloat(data.sellPrice) || 0;
                    data.buyPrice = parseFloat(data.buyPrice) || 0;
                    data.minStock = parseFloat(data.minStock) || 0;
                    data.gst = parseFloat(data.gst) || 0;
                    
                    // STRICT ERP LOGIC: Prevent "Race Condition" Stock Wipeouts!
                    // If editing an existing product, NEVER overwrite the live stock with the stale UI number. 
                    if (app.state.currentEditId) {
                        const liveRecord = await getRecordById('items', app.state.currentEditId);
                        data.stockGst = liveRecord ? parseFloat(liveRecord.stockGst) || 0 : 0;
                        data.stockNonGst = liveRecord ? parseFloat(liveRecord.stockNonGst) || 0 : 0;
                        
                        // Preserve the original Opening Stock
                        if (liveRecord) {
                            data.openingStock = liveRecord.openingStock || 0;
                            data.openingStockGst = liveRecord.openingStockGst || 0;
                            data.openingStockNonGst = liveRecord.openingStockNonGst || 0;
                        }
                    } else {
                        // For newly created items, inherit directly from the UI 'stock' field
                        data.stock = parseFloat(data.stock) || 0;
                        data.stockGst = parseFloat(data.stockGst) || data.stock;
                        data.stockNonGst = parseFloat(data.stockNonGst) || 0;
                        
                        // Seed the historical Opening Stock ledger
                        data.openingStock = data.stock;
                        data.openingStockGst = data.stockGst;
                        data.openingStockNonGst = data.stockNonGst;
                    }
                    
                    // Dual Engine Safety: Total Stock is always Math(GST + Non-GST)
                    data.stock = Math.round((data.stockGst + data.stockNonGst) * 100) / 100;
                    
                    const img = document.getElementById('product-image-preview');
                    if (img && !img.classList.contains('hidden')) data.image = await window.compressImage(img.src);
                    else data.image = ''; // STRICT ERP LOGIC: Permanently delete removed images
                } 
                else if (type === 'ledger') {
                    data.openingBalance = parseFloat(data.openingBalance) || 0;
                } 
                else if (type === 'expense') {
                    data.amount = parseFloat(data.amount) || 0;
                    const accEl = document.getElementById('expense-account-id');
                    data.accountId = accEl ? accEl.value : 'cash';
                    
                    // STRICT ERP LOGIC: Prevent Expenses from silently overdrafting the Cashbook!
                    const allReceipts = await getAllRecords('receipts');
                    let currentBal = 0;
                    // FIX: Read the Opening Balance for ALL accounts, including the default Cash Drawer!
                    const accRecord = await getRecordById('accounts', data.accountId);
                    if (accRecord) currentBal = parseFloat(accRecord.openingBalance) || 0;
                    
                    allReceipts.forEach(r => {
                        if (r.firmId === app.state.firmId && (r.accountId || 'cash') === data.accountId && r.id !== ('exp-rec-' + data.id)) {
                            currentBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                        }
                    });
                    
                    if (currentBal - data.amount < 0) {
                        if (!confirm(`Warning: This account only has ₹${currentBal.toFixed(2)} available. This expense will drop the balance below zero. Continue anyway?`)) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return;
                        }
                    }

                    const img = document.getElementById('expense-attachment-preview');
                    // ENTERPRISE FIX: Compress the expense receipt!
                    if (img && !img.classList.contains('hidden')) data.attachment = await window.compressImage(img.src);
                    else data.attachment = ''; // STRICT ERP LOGIC: Permanently delete removed images
                }
                else if (type === 'account') {
                    storeName = 'accounts';
                    data.openingBalance = parseFloat(data.openingBalance) || 0;
                }

                await saveRecord(storeName, data);

                // ENTERPRISE FIX: WIPE RAM CACHE ON SAVE SO IT REFRESHES!
                if (window.AppCache) {
                    if (type === 'product') window.AppCache.items = null;
                    if (type === 'ledger') window.AppCache.ledgers = null;
                    if (type === 'account') window.AppCache.accounts = null;
                }

                // --- ENTERPRISE UPGRADE: SMART AUTO-SELECT FOR NESTED FORMS ---
                // If the user was in the middle of an invoice, automatically drop the new item/party in!
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
                        if (window.Utils) window.Utils.showToast("Party Saved & Auto-Selected! ✅");
                    } 
                    else if (type === 'product') {
                        if (!UI.state.rawData.items) UI.state.rawData.items = [];
                        UI.state.rawData.items.push(data); // Inject into memory
                        
                        const list = document.getElementById('list-products');
                        if (list) {
                            const li = document.createElement('li');
                            li.innerHTML = `
                                <div><strong>${data.name}</strong><br><small style="color:var(--md-text-muted);">Stock: ${data.stock} ${data.uom} | ₹${data.sellPrice.toFixed(2)}</small></div>
                                <input type="checkbox" value="${data.id}" style="width: 24px; height: 24px;">
                            `;
                            list.insertBefore(li, list.firstChild);
                        }
                        if (window.Utils) window.Utils.showToast("Product Saved & Added to List! ✅");
                        setTimeout(() => { if(window.UI) window.UI.openBottomSheet('sheet-products'); }, 300);
                    }
                }
                // --------------------------------------------------------------

                // Automatically log Expenses as "Money Out" in the Cashbook
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
                
                UI.closeActivity(`activity-${type}-form`);
                app.refreshAll();
                
                } catch (error) {
                    console.error("Save failed:", error);
                    alert("An error occurred while saving. Please try again.");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalText;
                        submitBtn.style.opacity = "1";
                    }
                }
            });
        });

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
                    
                    const pool = document.getElementById('adj-pool').value;
                    const type = document.getElementById('adj-type').value;
                    const qty = parseFloat(document.getElementById('adj-qty').value) || 0;
                    
                    const item = await getRecordById('items', itemId);
                    if (!item) throw new Error("Product not found in database.");
                    
                    const rawGst = parseFloat(item.stockGst);
                    const rawNon = parseFloat(item.stockNonGst);
                    let stockGst = isNaN(rawGst) ? (parseFloat(item.stock) || 0) : rawGst;
                    let stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                    let targetStock = pool === 'gst' ? stockGst : stockNonGst;
                    
                    if (type === 'reduce') {
                        if (targetStock - qty < 0) {
                            if (!confirm(`Warning: This will drop the ${pool === 'gst' ? 'GST' : 'Non-GST'} stock below zero. Continue anyway?`)) {
                                return; 
                            }
                        }
                    }
                    
                    const adjData = {
                        id: Utils.generateId(),
                        firmId: app.state.firmId,
                        itemId: itemId,
                        pool: pool, // Track which pool was audited
                        type: type,
                        qty: qty,
                        date: document.getElementById('adj-date').value,
                        notes: document.getElementById('adj-notes').value
                    };
                    
                    let impact = type === 'add' ? qty : -qty;
                    if (pool === 'gst') {
                        item.stockGst = Math.round((stockGst + impact) * 100) / 100;
                    } else {
                        item.stockNonGst = Math.round((stockNonGst + impact) * 100) / 100;
                    }
                    // STRICT ERP LOGIC: ParseFloat prevents legacy items from corrupting into NaN!
                    item.stock = Math.round(((parseFloat(item.stockGst) || 0) + (parseFloat(item.stockNonGst) || 0)) * 100) / 100;
                    
                    await saveRecord('adjustments', adjData);
                    await saveRecord('items', item);
                    
                    // STRICT ERP LOGIC: Wipe the RAM Cache so the UI instantly shows the new stock!
                    if (window.AppCache) window.AppCache.items = null;
                    
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

                // STRICT ERP LOGIC: Prevent the "Deep Fryer" bug! Only compress if it is a brand new upload.
                const existingProfile = await getRecordById('businessProfile', app.state.firmId);
                
                const logoImg = document.getElementById('profile-logo-preview');
                if (logoImg && !logoImg.classList.contains('hidden')) {
                    if (existingProfile && existingProfile.logo === logoImg.src) data.logo = existingProfile.logo;
                    else data.logo = await window.compressImage(logoImg.src);
                }

                const sigImg = document.getElementById('profile-signature-preview');
                if (sigImg && !sigImg.classList.contains('hidden')) {
                    if (existingProfile && existingProfile.signature === sigImg.src) data.signature = existingProfile.signature;
                    else data.signature = await window.compressImage(sigImg.src);
                }

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
        ['in', 'out'].forEach(type => {
            const form = document.getElementById(`form-payment-${type}`);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

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

                    // NEW: Prioritize the dropdown selection over the manual text input
                    const invoiceRefEl = document.getElementById(`pay-${type}-invoice-ref`);
                    // NEW: Capture multiple selected invoices and join them
                    const selectedOptions = invoiceRefEl ? Array.from(invoiceRefEl.selectedOptions).map(opt => opt.value).filter(v => v !== '') : [];
                    const selectedInvoiceRef = selectedOptions.join(', ');
                    const manualRef = document.getElementById(`pay-${type}-ref`).value;
                    const docNoInput = document.getElementById(`pay-${type}-no`).value;

                    // FIX: Duplicate Number Protection for Receipts (Safely ignoring blank numbers!)
                    const allReceipts = await getAllRecords('receipts');
                    if (docNoInput && docNoInput.trim() !== '') {
                        const isDuplicate = allReceipts.some(r => 
                            r.firmId === app.state.firmId && 
                            r.receiptNo === docNoInput && 
                            r.id !== app.state.currentReceiptId
                        );
                        if (isDuplicate) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert(`Error: Document number "${docNoInput}" already exists! Please use a unique number.`);
                        }
                    }

                    // STRICT ERP LOGIC: Revert old invoices if unlinked during a receipt edit
                    if (app.state.currentReceiptId) {
                        const oldReceipt = await getRecordById('receipts', app.state.currentReceiptId);
                        if (oldReceipt && oldReceipt.invoiceRef) {
                            const oldRefs = String(oldReceipt.invoiceRef).split(',').map(r => r.trim());
                            const newRefs = selectedInvoiceRef.split(',').map(r => r.trim());
                            const docStore = type === 'in' ? 'sales' : 'purchases';
                            const allDocs = await getAllRecords(docStore);
                            
                            for (const oldRef of oldRefs) {
                                if (!newRefs.includes(oldRef)) {
                                    // STRICT ERP LOGIC: Enforce Firm ID boundaries so Shop A doesn't accidentally open Shop B's invoices!
                                    const linkedDoc = allDocs.find(d => d.firmId === app.state.firmId && (d.id === oldRef || d.invoiceNo === oldRef || d.poNo === oldRef || d.orderNo === oldRef));
                                    if (linkedDoc && linkedDoc.status === 'Completed') {
                                        linkedDoc.status = 'Unpaid'; // FIX: Marks as Unpaid but keeps Stock intact!
                                        linkedDoc.completedDate = '';
                                        await saveRecord(docStore, linkedDoc);
                                    }
                                }
                            }
                        }
                    }

                    // STRICT ERP LOGIC: Cashbook Overdraft Protection!
                    if (type === 'out') {
                        const allReceipts = await getAllRecords('receipts');
                        let currentBal = 0;
                        // FIX: Read the Opening Balance for ALL accounts, including the default Cash Drawer!
                        const accRecord = await getRecordById('accounts', accountId);
                        if (accRecord) currentBal = parseFloat(accRecord.openingBalance) || 0;
                        
                        allReceipts.forEach(r => {
                            if (r.firmId === app.state.firmId && (r.accountId || 'cash') === (accountId || 'cash') && r.id !== app.state.currentReceiptId) {
                                currentBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                            }
                        });
                        
                        const attemptAmt = parseFloat(document.getElementById(`pay-${type}-amount`).value) || 0;
                        if (currentBal - attemptAmt < 0) {
                            if (!confirm(`Warning: This account only has ₹${currentBal.toFixed(2)} available. This payment will drop the balance below zero. Continue anyway?`)) {
                                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                                return;
                            }
                        }
                    }

                    const data = {
                        id: app.state.currentReceiptId || Utils.generateId(),
                        receiptNo: docNoInput, // NEW: Save the custom document number
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
                        // NEW: Link manual payment to the saved invoices and mathematically update their statuses
                        if (selectedInvoiceRef) {
                            const storeName = type === 'in' ? 'sales' : 'purchases';
                            const allDocs = await getAllRecords(storeName);
                            const allReceipts = await getAllRecords('receipts');
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
                                    allReceipts.forEach(r => {
                                        if (r.ledgerId === targetPartyId && r.firmId === app.state.firmId) {
                                            const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                                            if (rRefs.includes(ref)) {
                                                // Split the receipt amount mathematically
                                                totalPaid += (parseFloat(r.amount) || 0) / (rRefs.length || 1);
                                            }
                                        }
                                    });

                                    // STRICT ERP LOGIC: Add Returns (Credit/Debit Notes) to the total settled amount!
                                    let totalReturned = 0;
                                    allDocs.forEach(d => {
                                        if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open') {
                                            // Match returns to the original invoice
                                            if (d.orderNo === linkedInvoice.invoiceNo || d.orderNo === linkedInvoice.poNo || d.orderNo === linkedInvoice.orderNo || d.orderNo === linkedInvoice.id) {
                                                totalReturned += (parseFloat(d.grandTotal) || 0);
                                            }
                                        }
                                    });

                                    // If the split manual payments + returns cover the grand total, mark as Completed
                                    if ((totalPaid + totalReturned) >= parseFloat(linkedInvoice.grandTotal) - 0.5) { 
                                        linkedInvoice.status = 'Completed';
                                        await saveRecord(storeName, linkedInvoice);
                                    }
                                }
                            }
                        }
                        
                        // NEW: Auto-Complete Advance Payments Engine
                        if (typeof app.autoCompleteInvoices === 'function') {
                            await app.autoCompleteInvoices(targetPartyId, type === 'in' ? 'sales' : 'purchases');
                        }

                        UI.showSuccess(); // UPGRADE: Trigger GPay Animation!
                        UI.closeBottomSheet(`sheet-payment-${type}`);
                        app.refreshAll();
                    } catch (error) {
                        console.error("Payment save failed:", error);
                        alert("An error occurred. Please try again.");
                    } finally {
                        // ENTERPRISE FIX: THE ANIMATION SHIELD
                        // Wait 400ms for the bottom sheet to close so users can't double-tap and duplicate payments!
                        if (submitBtn) {
                            setTimeout(() => {
                                submitBtn.disabled = false;
                                submitBtn.innerText = originalText;
                                submitBtn.style.opacity = "1";
                            }, 400);
                        }
                    }
                });
            }
        });
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
        let explicitlyLinkedMoney = 0; // NEW: Track money safely locked to specific invoices

        allReceipts.forEach(r => {
            if (r.firmId === app.state.firmId && r.ledgerId === partyId) {
                const amt = parseFloat(r.amount) || 0;
                const impact = isSales ? (r.type === 'in' ? amt : -amt) : (r.type === 'out' ? amt : -amt);
                totalPaid += impact;
                
                // Lock manually tied receipt money away from the global pool!
                if (r.invoiceRef && impact > 0) {
                    explicitlyLinkedMoney += impact;
                }
            }
        });
        
        // 2. Sort documents chronologically (oldest first). Ignore Drafts!
        const partyDocs = allDocs.filter(d => d.firmId === app.state.firmId && d[partyKey] === partyId && d.documentType !== 'return' && d.status !== 'Open');
        partyDocs.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 3. Smart Allocation - Only use true unlinked advance money for FIFO waterfall!
        let remainingAdvanceMoney = Math.max(0, totalPaid - explicitlyLinkedMoney);
        
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

            // STRICT ERP LOGIC: Factor in Credit Notes & Purchase Returns to prevent Ghost Debt!
            const linkedReturns = allDocs.filter(d => d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open' && uniqueRefs.includes(d.orderNo));
            const returnTotal = linkedReturns.reduce((sum, ret) => sum + (parseFloat(ret.grandTotal) || 0), 0);
            const totalSettled = explicitPaid + returnTotal;
            
            // Mark completed if explicit payments + returns cover it, OR if leftover FIFO advance covers it
            if (totalSettled >= docTotal - 0.5) {
                // Fully covered by its own direct receipt or return!
                if (doc.status !== 'Completed') {
                    doc.status = 'Completed';
                    if (typeof Utils !== 'undefined' && Utils.getLocalDate) doc.completedDate = doc.completedDate || Utils.getLocalDate();
                    await saveRecord(storeName, doc);
                }
            } else if ((totalSettled + remainingAdvanceMoney) >= docTotal - 0.5) { 
                // Covered by a mix of direct receipt + returns + leftover advance pool
                remainingAdvanceMoney -= (docTotal - totalSettled); 
                
                if (doc.status !== 'Completed') {
                    doc.status = 'Completed';
                    if (typeof Utils !== 'undefined' && Utils.getLocalDate) doc.completedDate = doc.completedDate || Utils.getLocalDate();
                    await saveRecord(storeName, doc);
                }
            } else {
                // Not enough money to complete this invoice
                remainingAdvanceMoney -= Math.min(remainingAdvanceMoney, Math.max(0, docTotal - explicitPaid));
                
                // STRICT ERP LOGIC: Safely mark the invoice as Unpaid if the advance payment was deleted!
                if (doc.status === 'Completed') {
                    doc.status = 'Unpaid'; // FIX: Marks as Unpaid but keeps Stock intact!
                    doc.completedDate = '';
                    await saveRecord(storeName, doc);
                }
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
                    // STRICT ERP LOGIC: Prevent deleting invoices tied to BULK payments!
                    const hasBulkPayment = linkedManualReceipts.some(r => String(r.invoiceRef || '').split(',').filter(x => x.trim()).length > 1);
                    
                    if (hasBulkPayment) {
                        return alert("ERROR: Cannot delete this document! It is tied to a BULK payment that covers multiple invoices. Please go to the Cashbook, edit the receipt to unlink this specific invoice, and then try deleting it again.");
                    }
                    
                    if (!confirm(`Warning: This document has ${linkedManualReceipts.length} manual payment(s) exclusively linked to it. Delete them as well to keep the cashbook balanced?`)) {
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

        // STRICT ERP LOGIC 1: Revert Invoice Status when Payment is Deleted
        if (type === 'receipt-in' || type === 'receipt-out') {
            if (record.invoiceRef && !record.isAutoGenerated) {
                const docStore = type === 'receipt-in' ? 'sales' : 'purchases';
                const allDocs = await getAllRecords(docStore);
                const refs = String(record.invoiceRef).split(',').map(r => r.trim());
                
                for (const ref of refs) {
                    // STRICT ERP LOGIC: Lock the search to the specific record's Firm ID to prevent cross-company data corruption!
                    const linkedDoc = allDocs.find(d => d.firmId === record.firmId && (d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref));
                    if (linkedDoc && linkedDoc.status === 'Completed') {
                        linkedDoc.status = 'Unpaid'; // FIX: Marks as Unpaid but keeps Stock intact!
                        linkedDoc.completedDate = '';
                        await saveRecord(docStore, linkedDoc);
                    }
                }
            }
        }

        // STRICT ERP LOGIC 2: Stock reversal is now safely handled by the central db.js engine!
        // (Redundant manual loop deleted to prevent double-reversal inventory corruption)

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

        // STRICT ERP LOGIC: Prevent Product Deletion if it has active transaction history!
        if (type === 'product') {
            const allSales = await getAllRecords('sales');
            const allPurchases = await getAllRecords('purchases');
            
            const inSales = allSales.some(s => (s.items || []).some(i => i.itemId === id));
            const inPurchases = allPurchases.some(p => (p.items || []).some(i => i.itemId === id));
            
            if (inSales || inPurchases) {
                return alert(`Cannot delete this product. It is permanently linked to past invoices or bills. To protect your audit trail and PnL, please edit the product and rename it to "Inactive - [Product Name]" instead.`);
            }
        }

        // STRICT ERP LOGIC: db.js now automatically routes soft-deletions to the unlimited IndexedDB Trash Vault!
        // Delete from main active database
        await deleteRecordById(storeName, id);

        // ENTERPRISE FIX: Wipe RAM Cache so the deleted item instantly disappears from the UI!
        if (window.AppCache) {
            window.AppCache.items = null;
            window.AppCache.ledgers = null;
            window.AppCache.accounts = null;
        }
        
        // ENTERPRISE FIX: Re-run the Advance Payment Waterfall so invoices don't get permanently stuck as "Completed" when their payment is deleted!
        if (type === 'receipt-in' || type === 'receipt-out') {
            if (record.ledgerId && typeof app.autoCompleteInvoices === 'function') {
                await app.autoCompleteInvoices(record.ledgerId, type === 'receipt-in' ? 'sales' : 'purchases');
            }
        }

        if (type === 'sales' || type === 'purchase') UI.closeActivity(`activity-${type}-form`);
        else if (type === 'receipt-in' || type === 'receipt-out') UI.closeBottomSheet(`sheet-payment-${type.split('-')[1]}`);
        else UI.closeActivity(`activity-${type}-form`);
        
        app.refreshAll();
    },

    // ==========================================
    // UPGRADE: RECYCLE BIN RESTORE ENGINE
    // ==========================================
    restoreRecord: async (id, storeName) => {
        if (!confirm("Are you sure you want to restore this item?")) return;

        // STRICT ERP LOGIC: Pull directly from the unlimited IndexedDB Trash Vault!
        const record = await getRecordById('trash', id);
        
        if (record) {
            // Remove the trash tags
            delete record._module;
            delete record._deletedAt;
            
            // STRICT ERP LOGIC: Re-apply stock impacts if restoring an invoice or adjustment!
            if (storeName === 'sales' || storeName === 'purchases' || storeName === 'adjustments') {
                if (typeof saveInvoiceTransaction === 'function') {
                    await saveInvoiceTransaction(storeName, record);
                } else {
                    await saveRecord(storeName, record); // Failsafe fallback
                }
            } else {
                // Save normal records back to the active IndexedDB without stock math
                await saveRecord(storeName, record); 
            }
            
            // FIX: Recreate the Cashbook entry if restoring an Expense
            if (storeName === 'expenses') {
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
            
            // Remove it from the Trash Vault
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

        // STRICT ERP LOGIC: Delete directly from the IndexedDB Trash Vault
        const record = await getRecordById('trash', id);
        
        if (record) {
            await deleteRecordById('trash', id);
            
            if (window.Utils) window.Utils.showToast("Record Permanently Deleted! 🗑️");
            app.refreshAll();
        } else {
            alert("Error: Could not find the record in the Recycle Bin.");
        }
    },

    // ==========================================
    // 8. PDF EXPORT HOOKS
    // ==========================================
        generatePDF: async (type) => {
        if (!app.state.currentEditId) return alert("Please save the document first.");
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const record = await getRecordById(storeName, app.state.currentEditId);
        if (!record) return;

        // NEW: Calculate true total paid (Instant + Manual) to link it to the PDF
        const receipts = await getAllRecords('receipts');
        // FIX: Match against ALL references so the printed PDF never misses a cross-linked payment!
        const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
        const partyId = type === 'sales' ? record.customerId : record.supplierId;
        
        let totalPaid = 0;
        let linkedReceipts = []; // NEW: Array to hold the detailed receipts
        
        receipts.forEach(r => {
            if (r.ledgerId === partyId && r.firmId === app.state.firmId) {
                const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                if (refs.some(ref => uniqueRefs.includes(ref))) {
                    // ENTERPRISE FIX: Correctly add/subtract based on Refunds so the PDF math doesn't inflate!
                    const splitAmt = (parseFloat(r.amount) || 0) / (refs.length || 1);
                    const isRefund = type === 'sales' ? r.type === 'out' : r.type === 'in';
                    
                    totalPaid += isRefund ? -splitAmt : splitAmt;
                    
                    // Clone the receipt so we can safely alter the displayed amount on the PDF
                    const clonedReceipt = { ...r, amount: isRefund ? -splitAmt : splitAmt };
                    linkedReceipts.push(clonedReceipt);
                }
            }
        });

        // STRICT ERP LOGIC: Add Returns/Credit Notes so the printed PDF doesn't demand fake money!
        const allDocs = await getAllRecords(storeName);
        let totalReturned = 0;
        allDocs.forEach(d => {
            if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open') {
                if (uniqueRefs.includes(d.orderNo)) {
                    totalReturned += (parseFloat(d.grandTotal) || 0);
                    // Push the return into the receipts array so it prints on the PDF as an offset payment!
                    linkedReceipts.push({
                        receiptNo: d.orderNo ? 'CN-' + d.orderNo : 'Credit Note',
                        date: d.date,
                        mode: 'Return / Credit',
                        amount: parseFloat(d.grandTotal) || 0
                    });
                }
            }
        });
        
        // Inject the total paid + returns AND the detailed history into the record object
        record.trueTotalPaid = totalPaid + totalReturned;
        record.linkedReceipts = linkedReceipts;

        const profile = await getRecordById('businessProfile', app.state.firmId);
        const party = await getRecordById('ledgers', type === 'sales' ? record.customerId : record.supplierId);

        window.Utils.generateInvoicePDF(record, profile || {}, party || {}, type);
    },

    generateReceiptPDF: async (receiptId) => {
        const receipt = await getRecordById('receipts', receiptId);
        if (!receipt) return alert("Receipt not found. Please save it first.");
        
        const biz = await getRecordById('businessProfile', receipt.firmId) || {};
        
        const isMoneyIn = receipt.type === 'in';
        const title = isMoneyIn ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER';
        const safeDocNo = receipt.receiptNo || String(receipt.id).substring(0, 12).toUpperCase();
        
        let invoiceRefDisplay = '';
        if (receipt.invoiceRef) {
            const refs = String(receipt.invoiceRef).split(',').map(r => r.trim());
            const store = isMoneyIn ? 'sales' : 'purchases';
            const allDocs = await getAllRecords(store);
            
            const displayNames = refs.map(ref => {
                // ENTERPRISE FIX: Enforce Firm ID to prevent cross-company data leaks on printed receipts!
                const doc = allDocs.find(d => d.firmId === receipt.firmId && (d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref));
                if (doc) {
                    if (isMoneyIn) return doc.invoiceNo ? doc.invoiceNo : ('Bill of Supply' + (doc.orderNo ? ` (Ref: ${doc.orderNo})` : ''));
                    else return (doc.poNo || doc.invoiceNo) ? (doc.poNo || doc.invoiceNo) : ('Bill of Supply' + (doc.orderNo ? ` (Ref: ${doc.orderNo})` : ''));
                }
                return ref.startsWith('sollo-') ? 'Bill of Supply' : ref;
            });
            invoiceRefDisplay = displayNames.join(', ');
        }
        
        let balanceText = '';
        if (receipt.ledgerId && typeof getKhataStatement === 'function') {
            const party = await getRecordById('ledgers', receipt.ledgerId);
            if (party) {
                const statement = await getKhataStatement(party.id, party.type);
                balanceText = `<p style="margin: 8px 0 0 0; font-size: 14px; color: #43474e;">Current Party Balance: <strong>\u20B9${Math.abs(statement.finalBalance).toFixed(2)} ${statement.finalBalance > 0 ? (party.type === 'Customer' ? '(Due)' : '(To Pay)') : '(Advance)'}</strong></p>`;
            }
        }

        const html = `
            <div id="pdf-receipt-wrapper" class="a4-document" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; position: relative; background: #ffffff; overflow: hidden; color: #2d3748;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; margin-bottom: 30px; border-bottom: 4px solid #f0f4f8; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; max-width: 60%;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 70px; border-radius: 4px;" />` : ''}
                        <div>
                            <h1 style="margin: 0 0 4px 0; font-size: 24px; color: #1a202c; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">${biz.name || 'Company Name'}</h1>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">${biz.address || ''}</p>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">Ph: ${biz.phone || ''}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0 0 5px 0; font-size: 26px; color: #0061a4; letter-spacing: 1px; text-transform: uppercase; font-weight: 300;">${title}</h2>
                        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #4a5568;"># ${safeDocNo}</p>
                    </div>
                </div>
                
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; margin-bottom: 30px; position: relative; z-index: 1; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: #718096; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Amount ${isMoneyIn ? 'Received' : 'Paid'}</p>
                        <h1 style="margin: 0; font-size: 42px; color: ${isMoneyIn ? '#2f855a' : '#e53e3e'}; font-weight: 800;">\u20B9${parseFloat(receipt.amount).toFixed(2)}</h1>
                    </div>

                    <table style="width: 100%; font-size: 13px; border-collapse: collapse; border: none;">
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; width: 35%; font-weight: bold;">Date:</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #1a202c;">${receipt.date}</td></tr>
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">${isMoneyIn ? 'Received From:' : 'Paid To:'}</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #0061a4; font-size: 15px;">${receipt.ledgerName}</td></tr>
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">Payment Mode:</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #1a202c;">${receipt.mode || 'Cash'} ${receipt.ref ? `(Ref: ${receipt.ref})` : ''}</td></tr>
                        ${invoiceRefDisplay ? `<tr><td style="padding: 12px 10px; color: #718096; border-bottom: none; font-weight: bold;">Settled Invoice(s):</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: none; color: #1a202c;">${invoiceRefDisplay}</td></tr>` : ''}
                    </table>
                </div>
                
                <div style="text-align: center; position: relative; z-index: 1;">${balanceText}</div>
                
                <div class="avoid-break" style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; position: relative; z-index: 1;">
                    <div style="font-size: 11px; color: #718096;">
                        <p style="margin:0;">* This is a computer generated receipt.</p>
                    </div>
                    <div style="width: 200px; text-align: center;">
                        ${biz.signature ? `<img src="${biz.signature}" style="max-height: 50px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 50px; margin-bottom: 5px;"></div>'}
                        <div style="border-top: 1px solid #cbd5e0; padding-top: 5px; font-weight: bold; font-size: 11px; color: #2d3748;">Authorized Signatory</div>
                    </div>
                </div>
            </div>
        `;
        
        // ENTERPRISE FIX: Create the print-area dynamically so the PDF engine doesn't silently crash on fresh boots!
        let printArea = document.getElementById('print-area');
        if (!printArea) {
            printArea = document.createElement('div');
            printArea.id = 'print-area';
            printArea.className = 'print-only';
            document.body.appendChild(printArea);
        }
        
        printArea.innerHTML = html;
        setTimeout(() => {
            window.Utils.processPDFExport('pdf-receipt-wrapper', `${title.replace(/ /g, '_')}_${safeDocNo}.pdf`);
        }, 100);
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
        // STRICT ERP LOGIC: Ensure it is exactly 6 digits, no letters allowed!
        if (!pincode || !/^\d{6}$/.test(pincode.toString())) return;
        
        try {
            if (window.Utils) window.Utils.showToast("Fetching Location...");
            
            // STRICT ERP LOGIC: Add a 5-second timeout so the app never hangs if the government API goes down!
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
            
            // STRICT ERP LOGIC: O(1) Memory Hash Map instead of N+1 Database Queries!
            // This prevents the browser from crashing when generating the CA report for 1,000+ parties.
            const balanceCache = {};
            
            ledgers.forEach(l => {
                if (l.firmId !== app.state.firmId) return;
                let ob = parseFloat(l.openingBalance) || 0;
                const balType = (l.balanceType || '').toLowerCase();
                if (l.type === 'Customer') {
                    balanceCache[l.id] = (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
                } else {
                    balanceCache[l.id] = (balType.includes('receive') || balType.includes('debit')) ? -ob : ob;
                }
            });

            if (window.UI && window.UI.state && window.UI.state.rawData) {
                (window.UI.state.rawData.sales || []).forEach(s => {
                    if (s.firmId === app.state.firmId && s.status !== 'Open' && balanceCache[s.customerId] !== undefined) {
                        balanceCache[s.customerId] += (s.documentType === 'return' ? -parseFloat(s.grandTotal || 0) : parseFloat(s.grandTotal || 0));
                    }
                });

                (window.UI.state.rawData.purchases || []).forEach(p => {
                    if (p.firmId === app.state.firmId && p.status !== 'Open' && balanceCache[p.supplierId] !== undefined) {
                        balanceCache[p.supplierId] += (p.documentType === 'return' ? -parseFloat(p.grandTotal || 0) : parseFloat(p.grandTotal || 0));
                    }
                });

                (window.UI.state.rawData.cashbook || []).forEach(r => {
                    if (r.firmId === app.state.firmId && r.ledgerId && balanceCache[r.ledgerId] !== undefined) {
                        const party = ledgers.find(l => l.id === r.ledgerId);
                        if (party) {
                            const isMoneyIn = r.type === 'in';
                            const amt = parseFloat(r.amount) || 0;
                            if (party.type === 'Customer') balanceCache[r.ledgerId] += isMoneyIn ? -amt : amt;
                            else balanceCache[r.ledgerId] += isMoneyIn ? amt : -amt;
                        }
                    }
                });
            }

            for (const party of ledgers) {
                if (party.firmId !== app.state.firmId) continue;
                const bal = balanceCache[party.id] || 0;
                
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
            const defaultCashAcc = accounts.find(a => a.id === 'cash' && a.firmId === app.state.firmId);
            if (defaultCashAcc) cashBal = parseFloat(defaultCashAcc.openingBalance) || 0;
            
            allReceipts.filter(r => r.firmId === app.state.firmId && (r.accountId === 'cash' || !r.accountId)).forEach(r => {
                cashBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
            });
            csvContent += `"Default Cash Drawer",${cashBal.toFixed(2)}\n`;
            
            // Compute Custom Bank Accounts
            for (const acc of accounts) {
                // STRICT ERP LOGIC: Skip the default Cash Drawer here so it doesn't print twice and inflate assets!
                if (acc.firmId !== app.state.firmId || acc.id === 'cash') continue;
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
// NEW: KHATA (LEDGER) STATEMENT ENGINE
// ==========================================
window.triggerKhataReport = async () => {
    if (!UI.state.rawData.ledgers) return window.Utils.showToast("No data available yet!");
    
    // 1. Get all Customers and Suppliers safely
    const parties = UI.state.rawData.ledgers.filter(l => {
        const type = String(l.type).toLowerCase();
        return type === 'customer' || type === 'supplier';
    });
    if (parties.length === 0) return window.Utils.showToast("No Customers or Suppliers found!");

    // STRICT ERP LOGIC: Destroy old instances to prevent catastrophic DOM memory leaks!
    const oldSheet = document.getElementById('sheet-khata-select');
    if (oldSheet) oldSheet.remove();
    const oldOverlay = document.getElementById('khata-overlay');
    if (oldOverlay) oldOverlay.remove();

    // 2. Build a beautiful native Bottom Sheet dynamically
    let sheetHTML = `
    <div id="sheet-khata-select" class="bottom-sheet open" style="z-index: 9999; max-height: 80vh;">
        <div class="sheet-header" style="background: var(--md-surface); position: sticky; top: 0; z-index: 10;">
            <div>
                <span style="font-size: 18px; font-weight: 600; display: block;">Khata Statement</span>
                <small style="color: var(--md-text-muted);">Select a party to generate report</small>
            </div>
            <span class="material-symbols-outlined tap-target" onclick="this.closest('.bottom-sheet').remove(); document.getElementById('khata-overlay').remove();" style="background: var(--md-surface-variant); padding: 8px; border-radius: 50%;">close</span>
        </div>
        <div style="padding: 16px; overflow-y: auto;">
            ${parties.map(p => `
                <div class="m3-card tap-target" style="padding: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--md-outline-variant);" 
                     onclick="window.executeKhataReport('${p.id}', '${(p.name || 'Unknown').replace(/'/g, "\\'")}', '${p.type}'); this.closest('.bottom-sheet').remove(); document.getElementById('khata-overlay').remove();">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="icon-circle" style="width: 40px; height: 40px; background: ${String(p.type).toLowerCase() === 'customer' ? '#e3f2fd' : '#fff0f2'}; color: ${String(p.type).toLowerCase() === 'customer' ? '#0061a4' : '#ba1a1a'}; box-shadow: none;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">${String(p.type).toLowerCase() === 'customer' ? 'person' : 'storefront'}</span>
                        </div>
                        <strong style="font-size: 15px;">${p.name || 'Unknown'}</strong>
                    </div>
                    <span class="material-symbols-outlined" style="color: var(--md-text-muted);">print</span>
                </div>
            `).join('')}
        </div>
    </div>
    <div id="khata-overlay" class="sheet-overlay open" style="z-index: 9998;" onclick="document.getElementById('sheet-khata-select').remove(); this.remove();"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', sheetHTML);
};

window.executeKhataReport = async (partyId, partyName, partyType) => {
    window.Utils.showToast("Generating Ledger... ⏳");
    
    // Fetch Ledger math from Database
    const statementData = await window.getKhataStatement(partyId, partyType);
    
    // FIX: Safely extract the timeline array from the object!
    if (!statementData || !statementData.timeline || statementData.timeline.length === 0) {
        return window.Utils.showToast("No transactions found for " + partyName);
    }

    const statement = statementData.timeline;

    // Build Professional A4 Print Template (Now perfectly mobile responsive!)
    let html = `
    <div class="a4-document" style="font-family: 'Inter', sans-serif; color: #000; max-width: 100%; padding: 0 !important; margin: 0 !important;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
            <div>
                <h2 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: 0.5px;">LEDGER STATEMENT</h2>
                <h3 style="margin: 6px 0 0 0; color: #0061a4; font-size: 16px; font-weight: 700;">${partyName}</h3>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Generated On</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #0f172a; font-weight: 700;">${new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; table-layout: auto;">
            <thead>
                <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1; color: #475569;">
                    <th style="padding: 8px 4px; text-align: left; white-space: nowrap; font-weight: 600;">Date</th>
                    <th style="padding: 8px 4px; text-align: left; width: 100%; font-weight: 600;">Particulars</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Debit</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Credit</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    let runBal = 0;
    statement.forEach(row => {
        runBal += row.impact;
        
        // PERFECT ACCOUNTING MATH
        let isDebit = false;
        if (String(partyType).toLowerCase() === 'customer') {
            isDebit = row.impact > 0;
        } else {
            isDebit = row.impact < 0;
        }

        if (row.id === 'open-bal') {
             if (String(partyType).toLowerCase() === 'customer') {
                 isDebit = runBal > 0;
             } else {
                 isDebit = runBal < 0;
             }
        }
        
        const amtStr = Math.abs(row.impact || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
        const drText = isDebit ? amtStr : '';
        const crText = !isDebit ? amtStr : '';
        
        let balText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
        if (String(partyType).toLowerCase() === 'customer') {
            balText += (runBal >= 0 ? ' Dr' : ' Cr');
        } else {
            balText += (runBal >= 0 ? ' Cr' : ' Dr');
        }

        // STRICT ERP LOGIC: Reduced vertical padding to 5px to remove the empty gap between rows!
        html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 4px; white-space: nowrap; vertical-align: top; color: #64748b;">${row.date}</td>
                    <td style="padding: 5px 4px; word-break: break-word; vertical-align: top; color: #1e293b; line-height: 1.4;">${row.desc || row.particulars || 'Opening Balance'}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #e11d48; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${drText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #16a34a; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${crText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #0f172a; font-weight: 700; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums;">${balText}</td>
                </tr>
        `;
    });

    const finalBalText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
    
    // STRICT ERP LOGIC: Professional Status Pill Generator
    let finalBalStatus = 'Settled';
    let statusBg = '#e8f5e9'; // Soft Green
    let statusColor = '#146c2e'; // Dark Green

    if (String(partyType).toLowerCase() === 'customer') {
        if (runBal > 0) { finalBalStatus = 'Due to Receive (Dr)'; statusBg = '#fff0f2'; statusColor = '#ba1a1a'; }
        else if (runBal < 0) { finalBalStatus = 'Advance Received (Cr)'; statusBg = '#e3f2fd'; statusColor = '#0061a4'; }
    } else {
        if (runBal > 0) { finalBalStatus = 'Due to Pay (Cr)'; statusBg = '#fff0f2'; statusColor = '#ba1a1a'; }
        else if (runBal < 0) { finalBalStatus = 'Advance Paid (Dr)'; statusBg = '#e3f2fd'; statusColor = '#0061a4'; }
    }

    html += `
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <div style="background: #f8fafc; padding: 14px 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid ${statusColor}; display: inline-block; text-align: right; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Closing Balance</span><br>
                <strong style="font-size: 20px; color: #0f172a; display: block; margin-top: 4px; margin-bottom: 8px;">₹ ${finalBalText}</strong>
                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid ${statusColor}40; display: inline-block;">${finalBalStatus}</span>
            </div>
        </div>
    </div>`;

    // Inject into hidden print area for the actual printer
    let printDiv = document.getElementById('print-area');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'print-area';
        printDiv.className = 'print-only';
        document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    
    // NEW: Build a beautiful On-Screen Viewer!
    let oldViewer = document.getElementById('activity-khata-viewer');
    if (oldViewer) oldViewer.remove();

    let viewerHTML = `
    <div id="activity-khata-viewer" class="activity-screen" style="z-index: 5500; display: flex; flex-direction: column;">
        <div class="activity-header">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span class="material-symbols-outlined tap-target" onclick="document.getElementById('activity-khata-viewer').classList.remove('open'); setTimeout(() => document.getElementById('activity-khata-viewer').remove(), 350);">arrow_back</span>
                <strong style="font-size: 18px;">Ledger Statement</strong>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
                
                <div class="tap-target" onclick="if(window.Utils) window.Utils.sharePDF('khata-render-target', 'Ledger_Statement_${partyName.replace(/\s+/g, '_')}.pdf', 'Here is your Ledger Statement from SOLLO ERP.')" style="width: 36px; height: 36px; border-radius: 50%; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                </div>

                <div class="tap-target" onclick="if(window.Utils) window.Utils.processPDFExport('khata-render-target', 'Ledger_Statement_${partyName.replace(/\s+/g, '_')}.pdf')" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">download</span>
                </div>

            </div>
        </div>
        <div class="activity-content" style="flex: 1; padding: 12px; background: var(--md-background); overflow-y: auto;">
            <div style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <div id="khata-render-target" style="width: 100%; background: white; padding: 12px; box-sizing: border-box;">
                    ${html}
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
    
    // Trigger the smooth slide-in animation
    setTimeout(() => {
        document.getElementById('activity-khata-viewer').classList.add('open');
        window.Utils.showToast("✅ Ledger Ready!");
    }, 50);
};

// ==========================================
// NEW: KHATA LEDGER TRIGGER (FROM FORM)
// ==========================================
window.triggerKhataFromForm = () => {
    // 1. Grab the exact Party Name directly from the form's specific ID
    const nameInput = document.getElementById('ledger-name');
    
    if (!nameInput || !nameInput.value || nameInput.value.trim() === '') {
        return window.Utils.showToast("Could not read the name. Is the Party Name box empty?");
    }

    const foundName = nameInput.value.trim();

    // 2. Look up this exact name in the Database
    const ledgers = window.UI.state.rawData.ledgers || [];
    // STRICT ERP LOGIC: Enforce the Firm ID so "Shop B" doesn't accidentally print "Shop A's" confidential ledger!
    const party = ledgers.find(l => l.firmId === window.app.state.firmId && (l.name || '').toLowerCase() === foundName.toLowerCase());
    
    // 3. Trigger the PDF Viewer
    if (party) {
        window.executeKhataReport(party.id, party.name, party.type);
    } else {
        window.Utils.showToast("⚠️ Please save this profile first before generating a ledger!");
    }
};

// ==========================================
// NEW: BANK & CASH STATEMENT PDF ENGINE
// ==========================================
window.executeAccountReport = async (accountId) => {
    window.Utils.showToast("Generating Bank Statement... ⏳");
    
    let account = { name: 'Cash Drawer', openingBalance: 0 };
    if (accountId !== 'cash') {
        account = await getRecordById('accounts', accountId) || account;
    }

    const receipts = await getAllRecords('receipts');
    const firmId = app.state.firmId;
    
    const accountReceipts = receipts.filter(r => {
        if (r.firmId !== firmId) return false;
        if (accountId === 'cash') return r.accountId === 'cash' || !r.accountId;
        return r.accountId === accountId;
    });

    let timeline = [];
    let openingBalance = parseFloat(account.openingBalance) || 0;
    
    if (openingBalance !== 0) {
        timeline.push({ id: 'open-bal', date: 'Opening', desc: 'Opening Balance', amount: Math.abs(openingBalance), impact: openingBalance });
    }

    accountReceipts.forEach(r => {
        const isMoneyIn = r.type === 'in';
        const impact = isMoneyIn ? parseFloat(r.amount) : -parseFloat(r.amount);
        
        let displayRefs = '';
        if (r.invoiceRef) {
            const refs = String(r.invoiceRef).split(',').map(x => x.trim());
            displayRefs = refs.map(ref => ref.startsWith('sollo-') ? ref.slice(-4).toUpperCase() : ref).join(', ');
        }
        let refText = r.ref || '';
        if (displayRefs) refText = refText ? `${refText} | Docs: ${displayRefs}` : `Docs: ${displayRefs}`;
        if (r.receiptNo) refText = `${r.receiptNo} ${refText ? '| ' + refText : ''}`;

        timeline.push({
            id: r.id,
            date: r.date,
            desc: r.desc || (isMoneyIn ? 'Money In' : 'Money Out'),
            partyName: r.ledgerName || '',
            amount: parseFloat(r.amount),
            impact: impact,
            ref: refText
        });
    });

    timeline.sort((a, b) => {
        if (a.id === 'open-bal') return -1;
        if (b.id === 'open-bal') return 1;
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.id > b.id) ? 1 : -1;
    });

    let html = `
    <div class="a4-document" style="font-family: 'Inter', sans-serif; color: #000; max-width: 100%; padding: 0 !important; margin: 0 !important;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
            <div>
                <h2 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: 0.5px;">ACCOUNT STATEMENT</h2>
                <h3 style="margin: 6px 0 0 0; color: #0061a4; font-size: 16px; font-weight: 700;">${account.name}</h3>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Generated On</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #0f172a; font-weight: 700;">${new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; table-layout: auto;">
            <thead>
                <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1; color: #475569;">
                    <th style="padding: 8px 4px; text-align: left; white-space: nowrap; font-weight: 600;">Date</th>
                    <th style="padding: 8px 4px; text-align: left; width: 100%; font-weight: 600;">Description</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">In</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Out</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    let runBal = 0;
    timeline.forEach(row => {
        runBal += row.impact;
        
        let isMoneyIn = row.impact > 0;
        if (row.id === 'open-bal') isMoneyIn = runBal > 0;
        
        const amtStr = Math.abs(row.impact || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
        const inText = isMoneyIn ? amtStr : '';
        const outText = !isMoneyIn ? amtStr : '';
        const balText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
        
        let fullDesc = row.desc;
        if (row.partyName) fullDesc += `<br><span style="color:#555; font-size:9px;">Party: ${row.partyName}</span>`;
        if (row.ref) fullDesc += `<br><span style="color:#555; font-size:9px;">Ref: ${row.ref}</span>`;

        html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 4px; white-space: nowrap; vertical-align: top; color: #64748b;">${row.date}</td>
                    <td style="padding: 5px 4px; word-break: break-word; vertical-align: top; color: #1e293b; line-height: 1.4;">${fullDesc}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #16a34a; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${inText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #e11d48; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${outText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #0f172a; font-weight: 700; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums;">${balText}</td>
                </tr>
        `;
    });

    const finalBalText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});

    html += `
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <div style="background: #f8fafc; padding: 14px 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid ${runBal >= 0 ? '#146c2e' : '#ba1a1a'}; display: inline-block; text-align: right; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Available Balance</span><br>
                <strong style="font-size: 20px; color: #0f172a; display: block; margin-top: 4px; margin-bottom: 8px;">₹ ${finalBalText}</strong>
                <span style="background: ${runBal >= 0 ? '#e8f5e9' : '#fff0f2'}; color: ${runBal >= 0 ? '#146c2e' : '#ba1a1a'}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid ${runBal >= 0 ? '#146c2e40' : '#ba1a1a40'}; display: inline-block;">${runBal >= 0 ? 'Surplus / In-Hand' : 'Overdrawn'}</span>
            </div>
        </div>
    </div>`;

    let printDiv = document.getElementById('print-area');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'print-area';
        printDiv.className = 'print-only';
        document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    
    let oldViewer = document.getElementById('activity-account-viewer');
    if (oldViewer) oldViewer.remove();

    const safeFilename = `Account_Statement_${account.name.replace(/\\s+/g, '_')}.pdf`;

    let viewerHTML = `
    <div id="activity-account-viewer" class="activity-screen" style="z-index: 5600; display: flex; flex-direction: column;">
        <div class="activity-header">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span class="material-symbols-outlined tap-target" onclick="document.getElementById('activity-account-viewer').classList.remove('open'); setTimeout(() => document.getElementById('activity-account-viewer').remove(), 350);">arrow_back</span>
                <strong style="font-size: 18px;">Account Statement</strong>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="tap-target" onclick="if(window.Utils) window.Utils.sharePDF('account-render-target', '${safeFilename}', 'Here is your Bank Statement from SOLLO ERP.')" style="width: 36px; height: 36px; border-radius: 50%; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                </div>
                <div class="tap-target" onclick="if(window.Utils) window.Utils.processPDFExport('account-render-target', '${safeFilename}')" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">download</span>
                </div>
            </div>
        </div>
        <div class="activity-content" style="flex: 1; padding: 12px; background: var(--md-background); overflow-y: auto;">
            <div style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <div id="account-render-target" style="width: 100%; background: white; padding: 12px; box-sizing: border-box;">
                    ${html}
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
    
    setTimeout(() => {
        document.getElementById('activity-account-viewer').classList.add('open');
        window.Utils.showToast("✅ Statement Ready!");
    }, 50);
};

// --- NEW CODE: Module Initialization ---
window.onload = app.init;
window.app = app; // Explicitly map to window to protect your HTML buttons

// BRIDGE FOR CLOUD.JS: Expose the database engine so Google Drive can access it
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;
// --- END OF NEW CODE ---
