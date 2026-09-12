// ==========================================
// SOLLO ERP - DATABASE ENGINE (v6.1 Enterprise)
// ==========================================
const DB_NAME = 'SOLLO_ERP_DB';
// ENTERPRISE FIX: Jumped to Version 20 to break the browser deadlock and forcefully build all missing tables!
const DB_VERSION = 72; 
let db;
// --- ENTERPRISE FIX: RESILIENT CROSS-TAB SYNC ENGINE ---
window.dbChannel = null;
let crossTabSyncTimer = null;

window.triggerCrossTabSync = () => {
    if (!window.dbChannel) return;
    clearTimeout(crossTabSyncTimer);
    crossTabSyncTimer = setTimeout(() => {
        try {
            window.dbChannel.postMessage('SYNC_REFRESH');
        } catch (e) {
            console.warn("BroadcastChannel postMessage failed:", e);
        }
    }, 500); 
};

try {
    if (window.dbChannel) {
        window.dbChannel.close();
    }
    window.dbChannel = new BroadcastChannel('sollo_db_channel');
    window.dbChannel.onmessage = (event) => {
        if (event.data === 'SYNC_REFRESH') {
            // Guard: Only sync if database is fully initialized
            if (typeof db === 'undefined' || !db) return;
            
            console.log("🔄 Cross-Tab Sync Triggered! Updating local UI...");
            if (window.AppCache) {
                window.AppCache.items = null;
                window.AppCache.ledgers = null;
                window.AppCache.accounts = null;
            }
            if (window.app && typeof window.app.refreshAll === 'function') {
                window.app.refreshAll(true);
            }
        }
    };
} catch(e) {
    console.warn("BroadcastChannel initialization skipped (unsupported environment).");
}

const initDB = () => {
    return new Promise(async (resolve, reject) => {
        // STRICT ERP LOGIC: Force the browser to lock this data permanently so it never gets wiped when the phone is full!
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) console.log("🔒 ERP Vault Locked: Data Persistence Granted.");
                else console.warn("⚠️ Persistence denied by browser. Data may be at risk if storage gets full.");

                // 🚨 ENTERPRISE UPGRADE: STORAGE QUOTA SHIELD
                // Continuously monitors the phone's hard drive. If the phone hits 100% capacity, IndexedDB will silently drop data!
                if (navigator.storage.estimate) {
                    const est = await navigator.storage.estimate();
                    // 🚨 CRITICAL FIX: Prevent Division by Zero in Incognito/Privacy Mode!
                    const percentage = est.quota > 0 ? (est.usage / est.quota) * 100 : 0;
                    if (percentage > 95) {
                        if (window.Utils) window.Utils.alertModal("Your device storage is over 95% full! The database may fail to save new invoices. Please free up space immediately.", "⚠️ STORAGE CRITICAL");
                    }
                }
            } catch (e) { console.error("Persistence check failed:", e); }
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // ENTERPRISE FIX: The Database Deadlock Shield! (V2 - No Infinite Loops)
        // Uses BroadcastChannel to tell ghost tabs to close their DB connections instantly!
        request.onblocked = () => {
            console.warn("🔒 IndexedDB version conflict detected across open tabs.");
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast("Database update pending. Please refresh this page.");
            }
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Core Settings Stores
            if (!db.objectStoreNames.contains('firms')) db.createObjectStore('firms', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('businessProfile')) db.createObjectStore('businessProfile', { keyPath: 'firmId' });
            if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters', { keyPath: 'id' });
            
            // Master Stores
            if (!db.objectStoreNames.contains('items')) {
                let s = db.createObjectStore('items', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('ledgers')) {
                let s = db.createObjectStore('ledgers', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('accounts')) {
                let s = db.createObjectStore('accounts', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            
            // Transaction Stores
            if (!db.objectStoreNames.contains('sales')) {
                let s = db.createObjectStore('sales', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('purchases')) {
                let s = db.createObjectStore('purchases', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('receipts')) {
                let s = db.createObjectStore('receipts', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('expenses')) {
                let s = db.createObjectStore('expenses', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }
            if (!db.objectStoreNames.contains('adjustments')) {
                let s = db.createObjectStore('adjustments', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
                s.createIndex('itemId', 'itemId', { unique: false });
            }
            // NEW: Simple Master Stores
            if (!db.objectStoreNames.contains('units')) db.createObjectStore('units', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('expenseCategories')) db.createObjectStore('expenseCategories', { keyPath: 'id' });
            
            // ENTERPRISE UPGRADE: Recycle Bin Store
            if (!db.objectStoreNames.contains('trash')) {
                let s = db.createObjectStore('trash', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
            }

            // 🚀 ENTERPRISE UPGRADE: Compound Indexes for O(1) Date Filtering!
            const storesToUpgrade = ['sales', 'purchases', 'receipts', 'expenses'];
            storesToUpgrade.forEach(storeName => {
                if (db.objectStoreNames.contains(storeName)) {
                    const store = event.target.transaction.objectStore(storeName);
                    // Build a dual-index that connects the Company ID and the Date together
                    if (!store.indexNames.contains('firmId_date')) {
                        store.createIndex('firmId_date', ['firmId', 'date'], { unique: false });
                    }
                }
            });
        };

        request.onsuccess = (event) => { 
            db = event.target.result; 
            
            // 🚨 ENTERPRISE FIX: The Native Deadlock Shield!
            // If the user opens the app in Tab B, Tab A will automatically close its database so Tab B doesn't permanently freeze!
            db.onversionchange = () => {
                console.warn("⚠️ Database upgrading in another tab. Closing local connection to prevent deadlock!");
                db.close();
                db = null;
            };
            
            resolve(); 
        };
        request.onerror = (event) => { console.error("IndexedDB error:", event.target.errorCode); reject(event.target.error); };
    });
};

// ==========================================
// STANDARD CRUD OPERATIONS
// ==========================================
const getAllRecords = (storeName, indexName = null, indexValue = null) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        // ENTERPRISE UPGRADE: Native Indexed Queries (RAM Saver)
        // If an index is provided (like firmId), only fetch those specific records!
        let request;
        // ENTERPRISE FIX: Replaced 'indexValue' with strict undefined/null checks!
        // This prevents the engine from dumping the entire database into RAM if you search for a legitimate value of '0' or 'false'!
        if (indexName && indexValue !== undefined && indexValue !== null && store.indexNames.contains(indexName)) {
            const index = store.index(indexName);
            request = index.getAll(indexValue);
        } else {
            request = store.getAll(); // Fallback to full scan if no index is passed
        }
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

const getRecordById = (storeName, id) => {
    return new Promise((resolve, reject) => {
        // 🚨 BUG FIX: Graceful Fallback for Optional Fields!
        // Do NOT reject the promise and crash the app if a user leaves an optional field (like Customer Name or Invoice Ref) blank!
        if (id === null || id === undefined || id === '' || Number.isNaN(id)) {
            return resolve(undefined); // Safely return nothing instead of violently crashing
        }
        
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => {
            if (request.result !== undefined) {
                resolve(request.result);
            } else {
                // STRICT ERP LOGIC: IndexedDB Type Fallback! 
                // Prevents old Number IDs from becoming untouchable ghosts when searched with String IDs from HTML.
                if (typeof id === 'string') {
                    const numId = Number(id);
                    // ENTERPRISE FIX: Prevent empty strings from converting to 0 and fetching the wrong ghost record!
                    if (id.trim() !== '' && !isNaN(numId) && String(numId) === id.trim()) {
                        const fallbackReq = store.get(numId);
                        fallbackReq.onsuccess = () => resolve(fallbackReq.result);
                        fallbackReq.onerror = () => resolve(undefined);
                        return;
                    }
                } else if (typeof id === 'number') {
                    const strId = String(id);
                    const fallbackReq = store.get(strId);
                    fallbackReq.onsuccess = () => resolve(fallbackReq.result);
                    fallbackReq.onerror = () => resolve(undefined);
                    return;
                }
                resolve(undefined);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

const saveRecord = (storeName, data) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // STRICT ERP LOGIC: ALWAYS update the timestamp on every save/edit so Cloud Sync doesn't overwrite new data!
        data._lastModified = new Date().toISOString();
        
        const request = store.put(data);
        request.onsuccess = () => {
            if (window.triggerCrossTabSync) window.triggerCrossTabSync();
            resolve(data.id || data.firmId);
        };
        request.onerror = (event) => {
            // 🚨 ENTERPRISE FIX: The Quota Data-Loss Shield & Performance Fallback!
            console.error("Database write error on store:", storeName, event.target.error);
            if (event.target.error && event.target.error.name === 'QuotaExceededError') {
                if (window.Utils) window.Utils.alertModal("Device storage is completely full! Empty your recycle bin or delete photos to save data.", "🚨 STORAGE FULL");
            } else {
                if (window.Utils) window.Utils.showToast("⚠️ Save warning: Retrying write operation.");
            }
            reject(request.error);
        };
    });
};

const deleteRecordById = async (storeName, id) => {
    const oldRecord = await getRecordById(storeName, id);
    if (!oldRecord) return;
    
    if (storeName === 'ledgers') {
        const relatedSales = await getAllRecords('sales', 'firmId', oldRecord.firmId);
        const relatedPurchases = await getAllRecords('purchases', 'firmId', oldRecord.firmId);
        if (relatedSales.some(s => s.customerId === id) || relatedPurchases.some(p => p.supplierId === id)) {
            if (window.Utils) await window.Utils.alertModal(`Cannot delete ${oldRecord.name}. There are invoices attached to this party.`, "⚠️ INTEGRITY LOCK");
            return false;
        }
    } else if (storeName === 'items') {
        const checkItemUsage = (store) => new Promise((resolve) => {
            const request = db.transaction(store, 'readonly').objectStore(store).index('firmId').openCursor(IDBKeyRange.only(oldRecord.firmId));
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (!cursor) return resolve(false);
                if ((cursor.value.items || []).some(row => String(row.itemId) === String(id) || String(row.id) === String(id))) return resolve(true);
                cursor.continue();
            };
            request.onerror = () => resolve(false);
        });
        if (await checkItemUsage('sales') || await checkItemUsage('purchases')) {
            if (window.Utils) await window.Utils.alertModal(`Cannot delete ${oldRecord.name}. This product is used in historical invoices.`, "⚠️ INTEGRITY LOCK");
            return false;
        }
    }

    const atomicPuts = [];
    const atomicDeletes = [];

    if (['sales', 'purchases', 'adjustments', 'expenses'].includes(storeName)) {
        if (oldRecord.status !== 'Open' && oldRecord.status !== 'Cancelled') {
            const isReturn = oldRecord.documentType === 'return';
            const isNonGST = oldRecord.invoiceType === 'Non-GST'; 
            const rowsToProcess = storeName === 'adjustments' ? [oldRecord] : (oldRecord.items || []);
            const itemIds = [...new Set(rowsToProcess.map(row => String(row.itemId || row.id)))];
            const itemsSnapshot = (await Promise.all(itemIds.map(i => getRecordById('items', i)))).filter(Boolean);
            
            rowsToProcess.forEach(row => {
                const dbItem = itemsSnapshot.find(i => String(i.id) === String(row.itemId || row.id));
                if (dbItem) {
                    let qty = Math.abs(parseFloat(row.qty) || 0); 
                    let impact = storeName === 'sales' ? (isReturn ? -qty : qty) : storeName === 'purchases' ? (isReturn ? qty : -qty) : storeName === 'adjustments' ? (oldRecord.type === 'add' ? -qty : qty) : qty;
                    let targetPoolIsNonGST = storeName === 'adjustments' ? oldRecord.pool !== 'gst' : isNonGST;
                    let impactInPaise = Math.round(impact * 100);

                    if (targetPoolIsNonGST) {
                        dbItem.stockNonGst = (Math.round((parseFloat(dbItem.stockNonGst)||0) * 100) + impactInPaise) / 100;
                    } else {
                        dbItem.stockGst = (Math.round((parseFloat(dbItem.stockGst)||0) * 100) + impactInPaise) / 100;
                    }
                    dbItem.stock = (Math.round((parseFloat(dbItem.stockGst)||0)*100) + Math.round((parseFloat(dbItem.stockNonGst)||0)*100)) / 100;
                }
            });
            itemsSnapshot.forEach(item => atomicPuts.push({ store: 'items', data: item }));
        }
        
        const uniqueRefs = [...new Set([oldRecord.orderNo, oldRecord.invoiceNo, oldRecord.poNo, oldRecord.expenseNo, oldRecord.id].filter(Boolean).map(String))];
        const partyId = storeName === 'sales' ? oldRecord.customerId : (storeName === 'purchases' ? oldRecord.supplierId : null);
        if ((partyId || storeName === 'expenses') && uniqueRefs.length > 0) {
            const receipts = await getAllRecords('receipts', 'firmId', oldRecord.firmId);
            receipts.forEach(r => {
                const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                const lRefs = String(r.linkedInvoice || '').split(',').map(x => x.trim());
                const hasMatch = rRefs.some(ref => uniqueRefs.includes(ref)) || lRefs.some(ref => uniqueRefs.includes(ref));
                if (hasMatch && (!partyId || String(r.ledgerId) === String(partyId)) && r.isAutoGenerated) {
                    atomicDeletes.push({ store: 'receipts', id: r.id, trashData: r });
                }
            });
        }
    } else if (storeName === 'accounts') {
        const receipts = await getAllRecords('receipts', 'firmId', oldRecord.firmId);
        receipts.forEach(r => { if (String(r.accountId) === String(oldRecord.id)) { r.accountId = 'cash'; atomicPuts.push({ store: 'receipts', data: r }); }});
        const expenses = await getAllRecords('expenses', 'firmId', oldRecord.firmId);
        expenses.forEach(e => { if (String(e.accountId) === String(oldRecord.id)) { e.accountId = 'cash'; atomicPuts.push({ store: 'expenses', data: e }); }});
    }

    atomicDeletes.push({ store: storeName, id: oldRecord.id, trashData: storeName !== 'trash' ? oldRecord : null });
    await executeAtomicBatch(atomicPuts, atomicDeletes);
    if (window.AppCache) { window.AppCache.items = null; window.AppCache.ledgers = null; window.AppCache.accounts = null; }
};

const getAllFirms = () => getAllRecords('firms');

// 🚀 ENTERPRISE UPGRADE: High-Speed Date Range Fetcher
const getRecordsByDateRange = (storeName, firmId, startDate, endDate) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        if (!store.indexNames.contains('firmId_date')) {
            // Failsafe: If the database hasn't upgraded yet, fall back to the old method
            return getAllRecords(storeName, 'firmId', firmId).then(records => {
                resolve(records.filter(r => r.date >= startDate && r.date <= endDate));
            });
        }

        // Open the hard drive ONLY to the exact dates requested
        const index = store.index('firmId_date');
        const keyRange = IDBKeyRange.bound([firmId, startDate], [firmId, endDate]);
        const request = index.getAll(keyRange);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};
window.getRecordsByDateRange = getRecordsByDateRange;

// ==========================================
// STRICT INVENTORY & INVOICE ENGINE
// ==========================================
const saveInvoiceTransaction = async (storeName, data) => {
    if (data.customerName) data.customerName = data.customerName.replace(/\b\w/g, c => c.toUpperCase());
    if (data.supplierName) data.supplierName = data.supplierName.replace(/\b\w/g, c => c.toUpperCase());
    if (data.items) {
        data.items.forEach(item => {
            if (item.hsn) item.hsn = String(item.hsn).toUpperCase().trim();
            if (item.name) item.name = item.name.replace(/\b\w/g, c => c.toUpperCase());
        });
    }

    const existingRecord = await getRecordById(storeName, data.id);
    if (existingRecord) data.id = existingRecord.id;
    
    // 1. CREATE ATOMIC RAM VAULT
    const atomicPuts = [];
    const atomicDeletes = [];

    const newDataItems = storeName === 'adjustments' ? [String(data.itemId)] : (data.items || []).map(row => String(row.itemId || row.id));
    const oldDataItems = existingRecord ? (storeName === 'adjustments' ? [String(existingRecord.itemId)] : (existingRecord.items || []).map(row => String(row.itemId || row.id))) : [];
    const allItemIds = [...new Set([...newDataItems, ...oldDataItems].filter(Boolean))];
    const itemsSnapshot = (await Promise.all(allItemIds.map(id => getRecordById('items', id)))).filter(Boolean);
    const getRamItem = (id) => itemsSnapshot.find(i => String(i.id) === String(id));

    // 2. REVERSE OLD STOCK IN RAM
    if (existingRecord && existingRecord.status !== 'Open' && existingRecord.status !== 'Cancelled') {
        const isReturn = existingRecord.documentType === 'return';
        const isNonGST = existingRecord.invoiceType === 'Non-GST'; 
        const rowsToProcess = storeName === 'adjustments' ? [existingRecord] : (existingRecord.items || []);
        
        rowsToProcess.forEach(row => {
            const dbItem = getRamItem(row.itemId || row.id);
            if (dbItem) {
                let qty = Math.abs(parseFloat(row.qty) || 0); 
                let impact = storeName === 'sales' ? (isReturn ? -qty : qty) : storeName === 'purchases' ? (isReturn ? qty : -qty) : storeName === 'adjustments' ? (existingRecord.type === 'add' ? -qty : qty) : qty;
                let targetPoolIsNonGST = storeName === 'adjustments' ? existingRecord.pool !== 'gst' : isNonGST;
                let impactInPaise = Math.round(impact * 100);

                if (targetPoolIsNonGST) {
                    dbItem.stockNonGst = (Math.round((parseFloat(dbItem.stockNonGst)||0) * 100) + impactInPaise) / 100;
                } else {
                    dbItem.stockGst = (Math.round((parseFloat(dbItem.stockGst)||0) * 100) + impactInPaise) / 100;
                }
                dbItem.stock = (Math.round((parseFloat(dbItem.stockGst)||0)*100) + Math.round((parseFloat(dbItem.stockNonGst)||0)*100)) / 100;
            }
        });
    }

    // 3. CLEAN UP LINKED RECEIPTS IN RAM
    if (existingRecord) {
        const docNo = existingRecord.invoiceNo || existingRecord.poNo || existingRecord.id;
        const partyId = storeName === 'sales' ? existingRecord.customerId : existingRecord.supplierId;
        const newDocNo = data.invoiceNo || data.poNo || data.id; 
        const newPartyId = storeName === 'sales' ? data.customerId : data.supplierId;
        const newPartyName = storeName === 'sales' ? data.customerName : data.supplierName;
        
        if (docNo && partyId) {
            const receipts = await getAllRecords('receipts', 'firmId', data.firmId);
            receipts.forEach(r => {
                const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                const lRefs = String(r.linkedInvoice || '').split(',').map(x => x.trim());
                const hasMatch = rRefs.includes(String(docNo)) || rRefs.includes(String(existingRecord.id)) || lRefs.includes(String(docNo)) || lRefs.includes(String(existingRecord.id));

                if (hasMatch && String(r.ledgerId) === String(partyId) && r.isAutoGenerated) {
                    if (!String(r.id).startsWith('split-') || data.status === 'Open' || data.status === 'Cancelled') {
                        atomicDeletes.push({ store: 'receipts', id: r.id, trashData: r });
                    }
                } else if (String(r.ledgerId) === String(partyId) && !r.isAutoGenerated && (String(docNo) !== String(newDocNo) || String(partyId) !== String(newPartyId))) {
                    let updated = false;
                    if (r.invoiceRef && rRefs.includes(String(docNo))) { r.invoiceRef = rRefs.map(ref => ref === String(docNo) ? String(newDocNo) : ref).join(', '); updated = true; }
                    if (r.linkedInvoice && lRefs.includes(String(docNo))) { r.linkedInvoice = lRefs.map(ref => ref === String(docNo) ? String(newDocNo) : ref).join(', '); updated = true; }
                    
                    if (updated) {
                        if (String(partyId) !== String(newPartyId)) {
                            if (rRefs.length > 1 || lRefs.length > 1) throw new Error("Cannot change Customer/Supplier! Invoice is tied to a Bulk Payment.");
                            r.ledgerId = newPartyId; r.ledgerName = newPartyName;
                        }
                        if (r.desc && r.desc.includes(docNo)) {
                            const safeDocNo = String(docNo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            r.desc = r.desc.replace(new RegExp('(?<=^|\\s)' + safeDocNo + '(?=\\s|$)', 'g'), newDocNo); 
                        }
                        atomicPuts.push({ store: 'receipts', data: r });
                    }
                }
            });
        }
    }

    // 4. APPLY NEW STOCK IN RAM
    if (data.status !== 'Open' && data.status !== 'Cancelled') {
        const isReturn = data.documentType === 'return';
        const isNonGST = data.invoiceType === 'Non-GST'; 
        const rowsToProcess = storeName === 'adjustments' ? [data] : (data.items || []);
        
        rowsToProcess.forEach(row => {
            const dbItem = getRamItem(row.itemId || row.id);
            if (dbItem) {
                let qty = Math.abs(parseFloat(row.qty) || 0); 
                let impact = storeName === 'sales' ? (isReturn ? qty : -qty) : storeName === 'purchases' ? (isReturn ? -qty : qty) : storeName === 'adjustments' ? (data.type === 'add' ? qty : -qty) : -qty;
                
                if (storeName === 'purchases' && !isReturn && parseFloat(row.rate) > 0) {
                    let discountRatio = 0;
                    const trueSubtotal = (data.items || []).reduce((sum, item) => sum + (Math.abs(parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
                    if (data.discount > 0 && trueSubtotal > 0) discountRatio = data.discountType === '%' ? (data.discount / 100) : (data.discount / trueSubtotal);
                    const newPrice = Math.max(0, parseFloat(row.rate) * (1 - discountRatio));
                    const oldStock = Math.max(0, parseFloat(dbItem.stock) || 0);
                    const oldPrice = parseFloat(dbItem.buyPrice) || 0;
                    if (qty > 0) {
                        const newTotalStock = oldStock + qty;
                        dbItem.buyPrice = newTotalStock > 0 ? Math.round((((oldStock * oldPrice) + (qty * newPrice)) / newTotalStock) * 100) / 100 : newPrice;
                    }
                }

                let targetPoolIsNonGST = storeName === 'adjustments' ? data.pool !== 'gst' : isNonGST;
                let impactInPaise = Math.round(impact * 100);

                if (targetPoolIsNonGST) {
                    dbItem.stockNonGst = (Math.round((parseFloat(dbItem.stockNonGst)||0) * 100) + impactInPaise) / 100;
                } else {
                    dbItem.stockGst = (Math.round((parseFloat(dbItem.stockGst)||0) * 100) + impactInPaise) / 100;
                }
                dbItem.stock = (Math.round((parseFloat(dbItem.stockGst)||0)*100) + Math.round((parseFloat(dbItem.stockNonGst)||0)*100)) / 100;
            }
        });
    }

    // 5. SECURE TRANSACTION PUSH
    atomicPuts.push({ store: storeName, data: data });
    itemsSnapshot.forEach(item => atomicPuts.push({ store: 'items', data: item }));
    
    await executeAtomicBatch(atomicPuts, atomicDeletes);
    if (window.AppCache) { window.AppCache.items = null; window.AppCache[storeName] = null; }
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
};

// ==========================================
// SMART AUTO-NUMBERING ENGINE (Template Driven)
// ==========================================
const getNextDocumentNumber = async (storeName, docType, targetField = null) => {
    const firmId = typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1';
    // ENTERPRISE FIX: Use the native IndexedDB index to fetch ONLY this firm's records. Saves massive RAM!
    const firmRecords = await getAllRecords(storeName, 'firmId', firmId);
    
    // 1. Calculate Current Financial Year (April 1st to March 31st)
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const fyString = `${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}`; // Output: "25-26"
    
    // 2. ⚙️ CUSTOM NUMBERING CONFIGURATION ⚙️
    const defaultFormats = {
        'INV': '{NUM}/{FY}',         
        'ORD': 'ORD {NUM}/{FY}',     
        'PO': 'PO {NUM}/{FY}',       
        'CN': 'CN {NUM}/{FY}',       
        'EXP': 'EXP {NUM}/{FY}',     
        'REC': 'REC {NUM}/{FY}',     
        'VOU': 'VOU {NUM}/{FY}'      
    };
    
    // STRICT ERP LOGIC: Prevent fatal app crash if LocalStorage JSON gets corrupted!
    let savedFormats = {};
    try {
        savedFormats = JSON.parse(localStorage.getItem('sollo_doc_formats') || '{}');
    } catch (err) {
        console.warn("Recovered from corrupted document formats.");
    }
    const formatSettings = { ...defaultFormats, ...savedFormats };

    const template = formatSettings[docType] || `${docType} {NUM}/{FY}`;
    
    // ENTERPRISE UPGRADE 1: Standardized 4-digit padding for ALL documents (e.g. 0001)
    const padLength = 4; 

    // 3. Create a strict search pattern for the CURRENT financial year
    const currentYearTemplate = template.replace('{FY}', fyString);
    
    // Convert the template into a Regex to safely extract the {NUM}
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = '^' + escapeRegex(currentYearTemplate).replace('\\{NUM\\}', '(\\d+)') + '$';
    const searchRegex = new RegExp(regexPattern);

    let maxNumber = 0;

    firmRecords.forEach(record => {
        let docNo = '';
        if (targetField) {
            // ENTERPRISE FIX: Force String coercion so .match() doesn't throw a fatal crash on manual integers!
            docNo = String(record[targetField] || '');
        } else {
            // ENTERPRISE FIX: Stop Vendor Hijacking & Sequence Collisions!
            // We must dynamically map the correct ID field based on the table, otherwise Receipts and Expenses reset to 0001!
            if (storeName === 'sales') docNo = String(record.invoiceNo || '');
            else if (storeName === 'purchases') docNo = String(record.poNo || '');
            else if (storeName === 'receipts') docNo = String(record.receiptNo || '');
            else if (storeName === 'expenses') docNo = String(record.expenseNo || '');
            else docNo = '';
        }
        
        // If the document number matches our exact template structure for this year
        const match = docNo.match(searchRegex);
        if (match && match[1]) {
            const parsedNum = parseInt(match[1], 10);
            if (!isNaN(parsedNum) && parsedNum > maxNumber) {
                maxNumber = parsedNum;
            }
        }
    });

    // 4. Generate the next number and inject it into the template
    let nextNumber = maxNumber + 1;
    
    // ENTERPRISE UPGRADE 2: CUSTOM STARTING NUMBER
    // If no invoices exist for this year, check if the user set a custom starting number
    if (maxNumber === 0) {
        const customStartStr = localStorage.getItem(`sollo_${docType.toLowerCase()}_start`) || '1';
        // ENTERPRISE FIX: Add a strict NaN shield! If a user accidentally types text into the starting number setting, it prevents "INV 0NaN/25-26" corruption!
        nextNumber = parseInt(customStartStr, 10) || 1;
    }

    const paddedNumber = String(nextNumber).padStart(padLength, '0');
    
    return currentYearTemplate.replace('{NUM}', paddedNumber);
};

// ==========================================
// LEDGER / KHATA ENGINE
// ==========================================
const getKhataStatement = async (partyId, partyType) => {
    const ledger = await getRecordById('ledgers', partyId);
    const firmId = typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1';
    
    let openingBalance = parseFloat(ledger ? ledger.openingBalance : 0) || 0;
    
    // FIX: Bulletproof case-insensitive string parsing
    const isCustomer = String(partyType).toLowerCase() === 'customer';
    const balType = (ledger && ledger.balanceType) ? ledger.balanceType.toLowerCase() : '';
    
    // Mathematical signs for ledger: Positive means "We are owed (Receive)", Negative means "We owe them (Pay)"
    if (isCustomer) {
        openingBalance = (balType.includes('pay') || balType.includes('credit')) ? -openingBalance : openingBalance;
    } else {
        openingBalance = (balType.includes('receive') || balType.includes('debit')) ? -openingBalance : openingBalance;
    }

    let timeline = [];
    
    if (openingBalance !== 0) {
        timeline.push({
            id: 'open-bal',
            date: 'Opening',
            desc: 'Opening Balance',
            amount: Math.abs(openingBalance),
            isInvoice: openingBalance > 0, 
            impact: openingBalance
        });
    }

    // ENTERPRISE FIX: Sequential Processing & Garbage Collection to save RAM
    
    // 1. Process Sales, then wipe from memory
    const rawSales = (await getAllRecords('sales', 'firmId', firmId).catch(() => [])) || [];
    rawSales.forEach(s => {
        // ENTERPRISE FIX: Force String comparison to prevent missing ledger entries!
        // Prevent Cancelled Invoices from demanding fake money in the Ledger!
        if (s.firmId === firmId && String(s.customerId) === String(partyId) && s.status !== 'Open' && s.status !== 'Cancelled') {
            const isReturn = s.documentType === 'return';
            const isNonGST = s.invoiceType === 'Non-GST';
            const docLabel = isReturn ? 'Credit Note' : (isNonGST ? 'Bill of Supply' : 'Sales Invoice');
            const docNo = s.invoiceNo || s.orderNo || String(s.id).slice(-4).toUpperCase();
            
            // STRICT ERP LOGIC: Enforce absolute value to prevent negative embezzlement hacks!
            const safeAmount = Math.abs(parseFloat(s.grandTotal) || 0);
            
            timeline.push({
                id: s.id, date: s.date, desc: `${docLabel} (${docNo})`, 
                amount: safeAmount, isInvoice: !isReturn, impact: isReturn ? -safeAmount : safeAmount
            });
        }
    });
    rawSales.length = 0; // Force Garbage Collection

    // 2. Process Purchases, then wipe from memory
    const rawPurchases = (await getAllRecords('purchases', 'firmId', firmId).catch(() => [])) || [];
    rawPurchases.forEach(p => {
        // ENTERPRISE FIX: Force String comparison to prevent missing ledger entries!
        if (p.firmId === firmId && String(p.supplierId) === String(partyId) && p.status !== 'Open' && p.status !== 'Cancelled') {
            const isReturn = p.documentType === 'return';
            const isNonGST = p.invoiceType === 'Non-GST';
            const docLabel = isReturn ? 'Debit Note' : (isNonGST ? 'Bill of Supply' : 'Purchase Bill');
            const docNo = p.poNo || p.invoiceNo || p.orderNo || String(p.id).slice(-4).toUpperCase();
            
            const safeAmount = Math.abs(parseFloat(p.grandTotal) || 0);
            
            // ENTERPRISE FIX: The Inverted Payables Trap!
            // Purchases create LIABILITY (Negative). Returns (Debit Notes) reduce liability (Positive)!
            timeline.push({
                id: p.id, date: p.date, desc: `${docLabel} (${docNo})`, 
                amount: safeAmount, isInvoice: !isReturn, impact: isReturn ? safeAmount : -safeAmount
            });
        }
    });
    rawPurchases.length = 0; // Force Garbage Collection

    // 3. Process Receipts, then wipe from memory
    const rawReceipts = (await getAllRecords('receipts', 'firmId', firmId).catch(() => [])) || [];
    rawReceipts.forEach(r => {
        // ENTERPRISE FIX: Force String comparison to prevent missing ledger entries!
        if (r.firmId === firmId && String(r.ledgerId) === String(partyId)) {
            const isMoneyIn = r.type === 'in';
            const safeAmount = Math.abs(parseFloat(r.amount) || 0);
            
            // ENTERPRISE FIX: The Double-Debt Receipt Trap!
            // Money In ALWAYS reduces the ledger math, Money Out ALWAYS increases it!
            // The old code had Supplier receipts completely backwards, causing payments to double their debt instead of clearing it!
            let impact = isMoneyIn ? -safeAmount : safeAmount;
            
            timeline.push({
                id: r.id, date: r.date, 
                desc: (r.receiptNo ? r.receiptNo + ' - ' : '') + (r.desc || (isMoneyIn ? 'Payment Received' : 'Payment Made')),
                amount: safeAmount, isInvoice: false, impact: impact 
            });
        }
    });
    rawReceipts.length = 0; // Force Garbage Collection

    // Sort chronologically
    timeline.sort((a, b) => {
        if (a.id === 'open-bal') return -1;
        if (b.id === 'open-bal') return 1;
        
        // STRICT ERP LOGIC: Sort by Date AND ID to prevent same-day running balance scrambling!
        // ENTERPRISE FIX: Use safeDate! 'new Date("")' returns NaN and permanently scrambles the ledger!
        const dateA = (window.Utils ? window.Utils.safeDate(a.date) : new Date(a.date || 0)).getTime();
        const dateB = (window.Utils ? window.Utils.safeDate(b.date) : new Date(b.date || 0)).getTime();
        
        // Final NaN fallback check just in case!
        const validTimeA = isNaN(dateA) ? 0 : dateA;
        const validTimeB = isNaN(dateB) ? 0 : dateB;
        if (validTimeA !== validTimeB) return validTimeA - validTimeB;
        // ENTERPRISE FIX: Extract the actual timestamp from the end of the UUID to guarantee chronological precision!
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeA - timeB;
    });

    // Compute Running Balance
    let runningBalance = 0;
    timeline.forEach(t => {
        runningBalance += t.impact;
        t.runningBalance = runningBalance;
    });

    return {
        finalBalance: runningBalance,
        timeline: timeline
    };
};

const getGlobalTimeline = async (firmId) => {
    let timeline = [];

    // 1. Process Sales & Wipe RAM
    const rawSales = (await getAllRecords('sales', 'firmId', firmId).catch(() => [])) || [];
    rawSales.forEach(s => {
        if (s.firmId === firmId && s.status !== 'Open' && s.status !== 'Cancelled') {
            const isReturn = s.documentType === 'return';
            // ENTERPRISE FIX: Sales bring money IN. Refunds send money OUT.
            timeline.push({ id: s.id, date: s.date, type: isReturn ? 'OUT' : 'IN', party: s.customerName, ref: s.invoiceNo, qty: `${isReturn ? '+' : ''}${(s.items || []).length} items`, amount: s.grandTotal, mode: 'Credit', desc: `${isReturn ? 'Return from' : 'Sale to'} ${s.customerName}` });
        }
    });
    rawSales.length = 0;

    // 2. Process Purchases & Wipe RAM
    const rawPurchases = (await getAllRecords('purchases', 'firmId', firmId).catch(() => [])) || [];
    rawPurchases.forEach(p => {
        if (p.firmId === firmId && p.status !== 'Open' && p.status !== 'Cancelled') {
            const isReturn = p.documentType === 'return';
            // ENTERPRISE FIX: Purchases send money OUT. Refunds bring money IN.
            timeline.push({ id: p.id, date: p.date, type: isReturn ? 'IN' : 'OUT', party: p.supplierName, ref: p.poNo || p.invoiceNo, qty: `${isReturn ? '-' : ''}${(p.items || []).length} items`, amount: p.grandTotal, mode: 'Credit', desc: `${isReturn ? 'Return to' : 'Purchase from'} ${p.supplierName}` });
        }
    });
    rawPurchases.length = 0;

    // 3. Process Receipts & Wipe RAM
    const rawReceipts = (await getAllRecords('receipts', 'firmId', firmId).catch(() => [])) || [];
    rawReceipts.forEach(r => {
        // STRICT ERP LOGIC: Prevent Quadruple Entry by filtering out auto-generated receipts!
        if (r.firmId === firmId && !r.isAutoGenerated) {
            timeline.push({ id: r.id, date: r.date, type: r.type, amount: r.amount, mode: r.mode, desc: `Party: ${r.ledgerName}` });
        }
    });
    rawReceipts.length = 0;

    // 4. Process Expenses & Wipe RAM
    const rawExpenses = (await getAllRecords('expenses', 'firmId', firmId).catch(() => [])) || [];
    rawExpenses.forEach(e => {
        if (e.firmId === firmId) {
            // STRICT ERP LOGIC: Audit accurate payment modes instead of forcing 'Cash'
            const mode = e.accountId === 'cash' || !e.accountId ? 'Cash' : 'Bank';
            timeline.push({ id: e.id, date: e.date, type: 'out', amount: parseFloat(e.amount), mode: mode, desc: `Expense: ${e.category}` });
        }
    });
    rawExpenses.length = 0;

    // ENTERPRISE FIX: Extract the actual timestamp from the UUID so same-day transactions stay perfectly chronological!
    return timeline.sort((a, b) => {
        // ENTERPRISE FIX: NaN Scramble Shield for the Cashbook!
        const dateA = (window.Utils ? window.Utils.safeDate(a.date) : new Date(a.date || 0)).getTime();
        const dateB = (window.Utils ? window.Utils.safeDate(b.date) : new Date(b.date || 0)).getTime();
        
        const validTimeA = isNaN(dateA) ? 0 : dateA;
        const validTimeB = isNaN(dateB) ? 0 : dateB;
        if (validTimeA !== validTimeB) return validTimeB - validTimeA; // Descending Date
        
        // Extract the absolute timestamp physically appended to the end of the UUID
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeB - timeA; // Descending Time Fallback
    });
};

// ==========================================
// AUTO-BACKUP & BULK EXPORT ENGINE
// ==========================================
const triggerAutoBackup = async () => {
    if (window.localBackupTimer) clearTimeout(window.localBackupTimer);
    
    window.localBackupTimer = setTimeout(async () => {
        try {
            if (typeof exportDatabase !== 'function') return;
            const backupData = await exportDatabase();
            
            const workerCode = `
                self.onmessage = function(e) {
                    try {
                        const result = JSON.stringify(e.data);
                        self.postMessage({ success: true, payload: result });
                    } catch (err) {
                        self.postMessage({ success: false });
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            const worker = new Worker(blobUrl);

            worker.onmessage = function(e) {
                if (e.data.success) {
                    try {
                        localStorage.setItem('sollo_auto_backup', e.data.payload);
                        localStorage.setItem('sollo_auto_backup_date', new Date().toISOString());
                    } catch (storageError) {
                        console.warn("Storage quota exceeded. Skipping local backup string to prevent crash.");
                        localStorage.removeItem('sollo_auto_backup');
                    }
                }
                worker.terminate(); 
                URL.revokeObjectURL(blobUrl); // 🚨 CRITICAL FIX: Flush the virtual file from RAM!
            };

            worker.postMessage(backupData); 
            
        } catch (e) {
            console.warn("Auto-backup engine silently skipped.");
        }
    }, 3000); 
};

const exportDatabase = () => {
    return new Promise((resolve, reject) => {
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
        const stores = ['firms', 'businessProfile', 'counters', 'items', 'ledgers', 'sales', 'purchases', 'receipts', 'expenses', 'accounts', 'adjustments', 'units', 'expenseCategories', 'trash'];
        const backupData = {};
        stores.forEach(s => backupData[s] = []);
        
        const appSettings = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sollo_') && !key.includes('auto_backup')) {
                appSettings[key] = localStorage.getItem(key);
            }
        }
        backupData['appSettings'] = [appSettings];

        // 🚨 ENTERPRISE UPGRADE: O(1) Memory Streaming Cursor
        // Streams data chunk-by-chunk directly from the hard drive, bypassing mobile RAM limits!
        const transaction = db.transaction(stores, 'readonly');
        let storesCompleted = 0;

        stores.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const record = cursor.value;
                    if (storeName === 'counters' || storeName === 'units' || storeName === 'expenseCategories') {
                        backupData[storeName].push(record);
                    } else if (record.firmId === activeFirmId || record.id === activeFirmId) {
                        backupData[storeName].push(record);
                    }
                    cursor.continue();
                } else {
                    storesCompleted++;
                    if (storesCompleted === stores.length) {
                        resolve(backupData);
                    }
                }
            };
            request.onerror = () => reject(request.error);
        });
    });
};

const importDatabase = async (parsedData) => {
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        return Promise.reject(new Error("Invalid File Format. Please upload a valid .json backup."));
    }
    if (!parsedData.ledgers && !parsedData.items && !parsedData.sales) {
        return Promise.reject(new Error("File Rejected: This is not a valid SOLLO ERP backup file."));
    }

    if (parsedData.appSettings && parsedData.appSettings.length > 0) {
        const settings = parsedData.appSettings[0];
        Object.keys(settings).forEach(key => { localStorage.setItem(key, settings[key]); });
    }

    let backupFirmId = null;
    if (parsedData.firms && parsedData.firms.length > 0) {
        backupFirmId = parsedData.firms[0].id;
    } else {
        backupFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
    }

    const stores = Object.keys(parsedData);

    return new Promise((resolve, reject) => {
        const validStores = stores.filter(store => db.objectStoreNames.contains(store));
        if (validStores.length === 0) return reject(new Error("No valid data stores found in backup."));
        
        const transaction = db.transaction(validStores, 'readwrite');
        
        transaction.oncomplete = () => {
            if (backupFirmId && window.app && window.app.state) {
                window.app.state.firmId = backupFirmId;
            }
            if (window.AppCache) {
                window.AppCache.items = null;
                window.AppCache.ledgers = null;
                window.AppCache.accounts = null;
            }
            if (window.app && typeof window.app.refreshAll === 'function') {
                setTimeout(() => window.app.refreshAll(), 50);
            }
            resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);

        validStores.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const existingRecords = request.result || [];
                existingRecords.forEach(record => {
                    if (record.firmId === backupFirmId || record.id === backupFirmId || storeName === 'counters' || storeName === 'units' || storeName === 'expenseCategories') {
                        store.delete(record.id || record.firmId); 
                    }
                });

                if (Array.isArray(parsedData[storeName])) {
                    parsedData[storeName].forEach(record => {
                        if (storeName !== 'counters' && storeName !== 'units' && storeName !== 'expenseCategories') {
                            record.firmId = backupFirmId;
                        }
                        store.put(record);
                    });
                }
            };
        });
    });
};

// ==========================================
// 9. GST REPORTS AGGREGATION ENGINE
// ==========================================
async function generateGSTReport(yearMonth, firmId) {
    // ENTERPRISE FIX: Array Fallback Shields prevent the CA Report from crashing if tables are empty!
    const sales = (await getAllRecords('sales', 'firmId', firmId).catch(() => [])) || [];
    const purchases = (await getAllRecords('purchases', 'firmId', firmId).catch(() => [])) || [];
    const ledgers = (await getAllRecords('ledgers', 'firmId', firmId).catch(() => [])) || [];

    // Filter specific month, and EXCLUDE DRAFTS (With Blank-Date Crash Protection)
    // ENTERPRISE FIX: Strip Cancelled orders so they don't artificially inflate CA Tax filings!
    const monthSales = sales.filter(s => (s.date || '').startsWith(yearMonth) && s.status !== 'Open' && s.status !== 'Cancelled');
    const monthPurchases = purchases.filter(p => (p.date || '').startsWith(yearMonth) && p.status !== 'Open' && p.status !== 'Cancelled');

    let gstr1 = { b2bTaxable: 0, b2bTax: 0, b2cTaxable: 0, b2cTax: 0, nilRatedTaxable: 0, totalTaxable: 0, totalTax: 0 };
    let gstr2 = { totalTaxable: 0, totalTax: 0, nilRatedTaxable: 0 }; 

    // Calculate GSTR-1 (Outward Supplies / Sales)
    monthSales.forEach(s => {
        let isReturn = s.documentType === 'return';
        let mult = isReturn ? -1 : 1; // Subtract returns from total sales
        
        // 🚨 LEGAL COMPLIANCE FIX: Track Non-GST/Exempt Sales for GSTR-1 Table 8 & GSTR-3B Table 3.1.c!
        if (s.invoiceType === 'Non-GST') {
            let exactTaxable = parseFloat(s.subtotal);
            // 🚨 BUG FIX: Removed '|| exactTaxable === 0' to allow Free Samples & 100% Discounts!
            if (isNaN(exactTaxable)) { 
                let rawSubtotal = 0;
                (s.items || []).forEach(item => { rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0); });
                let discountAmt = s.discountType === '%' ? (rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) : (parseFloat(s.discount) || 0);
                if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
                exactTaxable = rawSubtotal - discountAmt;
            }
            
            gstr1.nilRatedTaxable += (exactTaxable * mult);
            return; // Safely exit before adding to standard GST pools
        }
        
        // Double-deducting here artificially deflates GSTR-1 and causes portal rejections.
                // 🚨 CRITICAL FIX: Subtotal is Gross! We MUST deduct the discount to get the true Taxable Value!
        let rawSubtotal = Math.abs(parseFloat(s.subtotal) || 0);
        let discountAmt = s.discountType === '%' ? (rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) : (parseFloat(s.discount) || 0);
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        
        let taxable = (rawSubtotal - discountAmt) * mult;
        let tax = Math.abs(parseFloat(s.totalGst) || 0) * mult;


        gstr1.totalTaxable += taxable;
        gstr1.totalTax += tax;

        // Determine B2B vs B2C
        // ENTERPRISE FIX: The Retroactive Tax Corruption Shield!
        // Prioritize the frozen snapshot on the invoice. Do NOT retroactively alter past GST returns if a customer is edited today!
        let snapshotGst = s.customerGst || s.gstin || '';
        if (!snapshotGst) {
            let customer = ledgers.find(l => String(l.id) === String(s.customerId));
            snapshotGst = customer && customer.gst ? customer.gst : '';
        }
        
        // CRITICAL TAX FIX: A valid GSTIN must be exactly 15 characters!
        if (snapshotGst && snapshotGst.trim().length === 15) {
            gstr1.b2bTaxable += taxable;
            gstr1.b2bTax += tax;
        } else {
            gstr1.b2cTaxable += taxable;
            gstr1.b2cTax += tax;
        }
    });

    // Calculate GSTR-2 (Inward Supplies / Purchases / ITC)
    monthPurchases.forEach(p => {
        let isReturn = p.documentType === 'return';
        let mult = isReturn ? -1 : 1;
        
        // 🚨 LEGAL COMPLIANCE FIX: Track Non-GST/Exempt Purchases for reporting!
        if (p.invoiceType === 'Non-GST') {
            let exactTaxable = parseFloat(p.subtotal);
            // 🚨 BUG FIX: Removed '|| exactTaxable === 0' to allow Free Samples & 100% Discounts!
            if (isNaN(exactTaxable)) { 
                let rawSubtotal = 0;
                (p.items || []).forEach(item => { rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0); });
                let discountAmt = p.discountType === '%' ? (rawSubtotal * ((parseFloat(p.discount) || 0) / 100)) : (parseFloat(p.discount) || 0);
                if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
                exactTaxable = rawSubtotal - discountAmt;
            }
            
            gstr2.nilRatedTaxable += (exactTaxable * mult);
            return; // Safely exit before adding to ITC
        }

        // ENTERPRISE FIX: Mathematical Net Impact Shield!
        // Ensures Returns (Debit Notes) correctly reduce the ITC pool without causing CSV validation crashes.
        // 🚨 CRITICAL FIX: Deduct the discount so GSTR-2 Taxable Value matches the true bill!
        let rawSubtotal = Math.abs(parseFloat(p.subtotal) || 0);
        let discountAmt = p.discountType === '%' ? (rawSubtotal * ((parseFloat(p.discount) || 0) / 100)) : (parseFloat(p.discount) || 0);
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        
        let taxable = rawSubtotal - discountAmt;
        let tax = Math.abs(parseFloat(p.totalGst) || 0);

        // ENTERPRISE FIX: The Fraudulent ITC Shield!
        // Only claim Input Tax Credit (ITC) if the supplier has a valid 15-digit GSTIN!
        // Claiming tax from Unregistered Dealers (URD) will inflate GSTR-2 and cause portal rejection!
        // ENTERPRISE FIX: Protect GSTR-2 ITC from retroactive supplier edits!
        let snapshotGst = p.supplierGst || p.gstin || '';
        if (!snapshotGst) {
            let supplier = ledgers.find(l => String(l.id) === String(p.supplierId));
            snapshotGst = supplier && supplier.gst ? supplier.gst : '';
        }
        
        if (snapshotGst && snapshotGst.trim().length === 15) {
            // Apply the multiplier to the final addition to keep the logic clean
            gstr2.totalTaxable += (taxable * mult);
            gstr2.totalTax += (tax * mult);
        }
    });

    // Calculate GSTR-3B (Net Summary)
    let gstr3b = {
        outputTax: gstr1.totalTax,
        inputTax: gstr2.totalTax,
        netPayable: gstr1.totalTax - gstr2.totalTax
    };

    return { month: yearMonth, gstr1, gstr2, gstr3b, rawSales: monthSales, rawPurchases: monthPurchases };
}
// ==========================================
// ENTERPRISE UPGRADE: COLD STORAGE ARCHIVE ENGINE
// ==========================================
// Shrinks massive multi-year databases by deleting the heavy Item arrays from old, fully paid invoices.
const executeColdStorageArchive = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoffDate = oneYearAgo.toISOString().split('T')[0];
            
            let archivedCount = 0;
            const tx = db.transaction(['sales', 'purchases'], 'readwrite');
            
            // 🚀 ENTERPRISE UPGRADE: IndexedDB Cursor Engine
            // Streams records one-by-one instead of dumping 50,000 invoices into RAM at once!
            let activeRequests = 2; // Track both sales and purchases stores
            
            ['sales', 'purchases'].forEach(storeName => {
                const store = tx.objectStore(storeName);
                const request = store.openCursor();
                
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const doc = cursor.value;
                        
                        if (doc.date < cutoffDate && doc.status === 'Completed' && doc.items && doc.items.length > 0) {
                            if (!doc.notes || !doc.notes.includes('[SYSTEM: Items archived')) {
                                
                                doc.items = doc.items.map(i => ({
                                    id: i.id || '',
                                    itemId: i.itemId || i.id || '',
                                    qty: parseFloat(i.qty) || 0,
                                    rate: parseFloat(i.rate) || 0,
                                    buyPrice: parseFloat(i.buyPrice) || 0,
                                    gstPercent: parseFloat(i.gstPercent) || 0
                                }));
                                
                                doc.notes = (doc.notes || '') + '\n[SYSTEM: Items archived to Cold Storage to save space.]';
                                cursor.update(doc); // Update exactly where the cursor is pointing
                                archivedCount++;
                            }
                        }
                        cursor.continue(); // Move to the next record
                    } else {
                        activeRequests--;
                        // If both cursors have finished scanning all records, resolve the promise manually
                        if (activeRequests === 0) {
                            console.log(`📦 Cold Storage Archive Complete: ${archivedCount} old invoices compressed.`);
                            resolve(archivedCount);
                        }
                    }
                };
            });
            
            tx.onerror = () => reject(tx.error);
        } catch (e) {
            reject(e);
        }
    });
};

// Export the Engine
window.executeColdStorageArchive = executeColdStorageArchive;


// ==========================================
// NEW CODE: GLOBAL MAP
// ==========================================

// 2. Map to window so inline HTML and older files don't break
window.initDB = initDB;
window.getAllRecords = getAllRecords;
window.getRecordById = getRecordById;
window.saveRecord = saveRecord;
window.deleteRecordById = deleteRecordById;
window.getAllFirms = getAllFirms;
window.saveInvoiceTransaction = saveInvoiceTransaction;
window.getNextDocumentNumber = getNextDocumentNumber;
window.getKhataStatement = getKhataStatement;
window.getGlobalTimeline = getGlobalTimeline;
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;
window.generateGSTReport = generateGSTReport;

// ==========================================
// ENTERPRISE FIX: ATOMIC BATCH TRANSACTION
// ==========================================
window.executeAtomicBatch = (puts, deletes) => {
    return new Promise((resolve, reject) => {
        const storeNames = [...new Set([...puts.map(p => p.store), ...deletes.map(d => d.store), 'trash'])];
        if (storeNames.length <= 1 && !puts.length && !deletes.length) return resolve();
        
        const transaction = db.transaction(storeNames, 'readwrite');
        
        puts.forEach(p => {
            const store = transaction.objectStore(p.store);
            p.data._lastModified = new Date().toISOString();
            store.put(p.data);
        });
        
        deletes.forEach(d => {
            const store = transaction.objectStore(d.store);
            if (d.trashData) {
                const trashStore = transaction.objectStore('trash');
                d.trashData._module = d.store;
                d.trashData._deletedAt = new Date().toISOString();
                trashStore.put(d.trashData);
            }
            store.delete(d.id);
        });
        
        transaction.oncomplete = () => {
            if (window.triggerCrossTabSync) window.triggerCrossTabSync();
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

// ==========================================
// 🚀 ERP SAFETY: STORAGE INTEGRITY MONITOR
// ==========================================
// Checks if the phone is running out of space to prevent silent data loss
if (navigator.storage && navigator.storage.estimate) {
    setInterval(async () => {
        try {
            const estimate = await navigator.storage.estimate();
            const usagePercent = (estimate.usage / estimate.quota) * 100;
            
            // If storage is over 90% full, trigger a critical warning
            if (usagePercent > 90 && window.Utils && window.Utils.showToast) {
                window.Utils.showToast('⚠️ DEVICE STORAGE FULL. Backup data immediately to prevent loss.', 'error');
            }
        } catch (e) {
            console.warn('Storage estimation not supported on this device.');
        }
    }, 60000); // Runs a silent check every 60 seconds
}
