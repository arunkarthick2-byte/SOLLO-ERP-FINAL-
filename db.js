// ==========================================
// SOLLO ERP - DATABASE ENGINE (v6.1 Enterprise)
// ==========================================
const DB_NAME = 'SOLLO_ERP_DB';
// ENTERPRISE FIX: Jumped to Version 20 to break the browser deadlock and forcefully build all missing tables!
const DB_VERSION = 22; 
let db;
// --- NEW: Global Database Connection Listener ---
try {
    const dbChannel = new BroadcastChannel('sollo_db_channel');
    dbChannel.onmessage = (event) => {
        if (event.data === 'FORCE_CLOSE_DB' && typeof db !== 'undefined' && db) {
            console.warn("⚠️ Closing database connection to allow another tab to upgrade!");
            db.close();
            db = null; // 🚨 CRITICAL FIX: Destroy the zombie variable so the app knows to reconnect!
        }
    };
} catch(e) {}

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
                        alert("⚠️ CRITICAL WARNING: Your device storage is over 95% full! The database may fail to save new invoices. Please free up space immediately.");
                    }
                }
            } catch (e) { console.error("Persistence check failed:", e); }
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // ENTERPRISE FIX: The Database Deadlock Shield! (V2 - No Infinite Loops)
        // Uses BroadcastChannel to tell ghost tabs to close their DB connections instantly!
        request.onblocked = () => {
            console.warn("🔒 IndexedDB is locked by an older version.");
            
            // 1. Tell other open tabs to close their database connections natively
            try {
                const bc = new BroadcastChannel('sollo_db_channel');
                bc.postMessage('FORCE_CLOSE_DB');
            } catch(e) {} // Failsafe for older browsers
            
            // 2. Alert the user nicely instead of forcing an infinite refresh loop
            alert("Database is upgrading, but another tab is holding it open. Please close all other tabs of this app, then refresh this page!");
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
        };

        request.onsuccess = (event) => { db = event.target.result; resolve(); };
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
        // ENTERPRISE FIX: IndexedDB instantly crashes with a fatal 'DataError' if you search for null or undefined!
        // This shield protects the app if a user accidentally saves an invoice with a blank row.
        if (id === null || id === undefined || id === '') return resolve(undefined);
        
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
                    if (id.trim() !== '' && !isNaN(numId)) {
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
        request.onsuccess = () => resolve(data.id || data.firmId);
        request.onerror = (event) => {
            // 🚨 ENTERPRISE FIX: The Quota Data-Loss Shield!
            if (event.target.error && event.target.error.name === 'QuotaExceededError') {
                alert("🚨 CRITICAL: Device storage is completely full! Empty your recycle bin or delete photos to save data.");
            }
            reject(request.error);
        };
    });
};

const deleteRecordById = async (storeName, id) => {
    try {
        // 1. Fetch the record first to identify linked impacts
        const oldRecord = await getRecordById(storeName, id);
        
        // STRICT ERP LOGIC: Stop ghost deletion! If the record doesn't exist, exit safely.
        if (!oldRecord) return;
        
        // 🚨 ENTERPRISE UPGRADE: RELATIONAL INTEGRITY LOCK
        // Prevent deletion of Master Data if they have connected financial history!
        if (storeName === 'ledgers') {
            const relatedSales = await getAllRecords('sales', 'firmId', oldRecord.firmId);
            const relatedPurchases = await getAllRecords('purchases', 'firmId', oldRecord.firmId);
            const hasTransactions = relatedSales.some(s => s.customerId === id) || relatedPurchases.some(p => p.supplierId === id);
            
            if (hasTransactions) {
                alert(`⚠️ INTEGRITY LOCK: Cannot delete ${oldRecord.name}. There are invoices attached to this party. Please delete the invoices first or mark the party as inactive.`);
                return false; // Safely abort deletion
            }
        } else if (storeName === 'items') {
            const relatedSales = await getAllRecords('sales', 'firmId', oldRecord.firmId);
            const relatedPurchases = await getAllRecords('purchases', 'firmId', oldRecord.firmId);
            
            const itemIsUsed = relatedSales.some(s => (s.items || []).some(row => row.itemId === id || row.id === id)) || 
                               relatedPurchases.some(p => (p.items || []).some(row => row.itemId === id || row.id === id));
            
            if (itemIsUsed) {
                alert(`⚠️ INTEGRITY LOCK: Cannot delete ${oldRecord.name}. This product is used in historical invoices. Deleting it will corrupt your financial history.`);
                return false; // Safely abort deletion
            }
        }

        // Ensure we use the exact data type from the DB for the physical deletion
        const actualId = oldRecord.id; 
        
        // 1. Save to Recycle Bin first (Safest operation)
        if (oldRecord && storeName !== 'trash') {
            oldRecord._module = storeName; 
            oldRecord._deletedAt = new Date().toISOString(); 
            await saveRecord('trash', oldRecord); 
        }

        if (oldRecord && (storeName === 'sales' || storeName === 'purchases' || storeName === 'adjustments' || storeName === 'expenses')) {
            // 2. CRITICAL FIX: Reverse Inventory BEFORE deleting the document
            await reverseStockImpact(storeName, oldRecord);
            
            // 3. Batched cleanup of auto-generated receipts
            const uniqueRefs = [...new Set([oldRecord.orderNo, oldRecord.invoiceNo, oldRecord.poNo, oldRecord.expenseNo, oldRecord.id].filter(Boolean))];
            const partyId = storeName === 'sales' ? oldRecord.customerId : (storeName === 'purchases' ? oldRecord.supplierId : null);
            
            // ENTERPRISE FIX: Force all references to Strings so we don't strand numeric ghost receipts in the trash!
            const safeRefs = uniqueRefs.map(String);
            
            // CRITICAL SHIELD: Safely clean up Cashbook entries for both Invoices AND Expenses!
            if ((partyId || storeName === 'expenses') && safeRefs.length > 0) {
                // ENTERPRISE FIX: Use the native index to prevent a massive RAM spike when deleting invoices!
                const receipts = await getAllRecords('receipts', 'firmId', oldRecord.firmId);
                const receiptsToDelete = receipts.filter(r => 
                    (safeRefs.includes(String(r.invoiceRef)) || safeRefs.includes(String(r.linkedInvoice))) && 
                    (!partyId || String(r.ledgerId) === String(partyId)) && 
                    r.isAutoGenerated && 
                    String(r.firmId) === String(oldRecord.firmId)
                );

                if (receiptsToDelete.length > 0) {
                    await new Promise((resolveBatch, rejectBatch) => {
                        // STRICT ERP LOGIC: Open BOTH stores so receipts can be safely sent to the Trash!
                        const t = db.transaction(['receipts', 'trash'], 'readwrite');
                        const recStore = t.objectStore('receipts');
                        const trashStore = t.objectStore('trash');
                        
                        receiptsToDelete.forEach(r => {
                            r._module = 'receipts';
                            r._deletedAt = new Date().toISOString();
                            trashStore.put(r); // Save to recycle bin first
                            recStore.delete(r.id); // Then remove from active ledger
                        });
                        
                        t.oncomplete = () => resolveBatch();
                        t.onerror = () => rejectBatch(t.error);
                    });
                }
            }
        } 
        else if (storeName === 'accounts') {
            // ENTERPRISE FIX: If you delete a bank account, safely orphan the cashbook receipts to 'cash' to prevent money from disappearing!
            const receipts = await getAllRecords('receipts', 'firmId', oldRecord.firmId);
            for (const r of receipts) {
                if (String(r.accountId) === String(actualId)) {
                    r.accountId = 'cash';
                    await saveRecord('receipts', r);
                }
            }
            
            // ENTERPRISE FIX: Safely remap Expenses to 'cash' to prevent the Expense Ledger from permanently breaking!
            const expenses = await getAllRecords('expenses', 'firmId', oldRecord.firmId);
            for (const e of expenses) {
                if (String(e.accountId) === String(actualId)) {
                    e.accountId = 'cash';
                    await saveRecord('expenses', e);
                }
            }
        }

        // 4. Finally, delete the actual document only after all reversals finish
        await new Promise((resolveDelete, rejectDelete) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const request = transaction.objectStore(storeName).delete(actualId); // <--- FIXED TYPE LOCK
            request.onsuccess = () => resolveDelete();
            request.onerror = () => rejectDelete(request.error);
        });

    } catch (err) {
        console.error("Deletion engine failure:", err);
        throw err; // Properly throws the error to the caller instead of swallowing it
    }
};

const getAllFirms = () => getAllRecords('firms');

// ==========================================
// STRICT INVENTORY & INVOICE ENGINE
// ==========================================
const reverseStockImpact = async (storeName, record) => {
    // ENTERPRISE FIX: The Phantom Cancelled Leak!
    if (record.status === 'Open' || record.status === 'Cancelled') return; 
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    
    const rowsToProcess = storeName === 'adjustments' ? [record] : (record.items || []);
    
    for (const row of rowsToProcess) {
        const dbItem = await getRecordById('items', row.itemId || row.id);
        if (dbItem) {
            // 🚨 ENTERPRISE FIX: Absolute Math Shield! 
            // Strips accidental negatives out of the quantity so the math logic perfectly dictates the flow!
            let qty = Math.abs(parseFloat(row.qty) || 0); 
            
            let stockGst = parseFloat(dbItem.stockGst);
            if (isNaN(stockGst)) stockGst = parseFloat(dbItem.stock) || 0;
            
            let stockNonGst = parseFloat(dbItem.stockNonGst);
            if (isNaN(stockNonGst)) stockNonGst = 0;
            
            dbItem.stockGst = stockGst;
            dbItem.stockNonGst = stockNonGst;
            
            let impact = 0;
            if (storeName === 'sales') {
                impact = isReturn ? -qty : qty;
            } else if (storeName === 'purchases') {
                impact = isReturn ? qty : -qty;
            } else if (storeName === 'adjustments') {
                impact = record.type === 'add' ? -qty : qty; 
            } else if (storeName === 'expenses') {
                impact = qty; 
            }
            
            let targetPoolIsNonGST = isNonGST;
            if (storeName === 'adjustments') targetPoolIsNonGST = record.pool !== 'gst';
            
            if (targetPoolIsNonGST) {
                stockNonGst = Math.round((stockNonGst + impact) * 100) / 100;
                dbItem.stockNonGst = stockNonGst;
            } else {
                stockGst = Math.round((stockGst + impact) * 100) / 100;
                dbItem.stockGst = stockGst;
            }
            
            dbItem.stock = Math.round((stockGst + stockNonGst) * 100) / 100;
            await saveRecord('items', dbItem);
        }
    }
};

const applyStockImpact = async (storeName, record) => {
    // ENTERPRISE FIX: The Phantom Cancelled Leak!
    if (record.status === 'Open' || record.status === 'Cancelled') return; 
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    
    const rowsToProcess = storeName === 'adjustments' ? [record] : (record.items || []);
    
    for (const row of rowsToProcess) {
        const dbItem = await getRecordById('items', row.itemId || row.id);
        if (dbItem) {
            // 🚨 ENTERPRISE FIX: Absolute Math Shield!
            let qty = Math.abs(parseFloat(row.qty) || 0); 
            
            let stockGst = parseFloat(dbItem.stockGst);
            if (isNaN(stockGst)) stockGst = parseFloat(dbItem.stock) || 0;
            
            let stockNonGst = parseFloat(dbItem.stockNonGst);
            if (isNaN(stockNonGst)) stockNonGst = 0;
            
            dbItem.stockGst = stockGst;
            dbItem.stockNonGst = stockNonGst;
            
            let impact = 0;
            if (storeName === 'sales') {
                impact = isReturn ? qty : -qty;
            } else if (storeName === 'purchases') {
                impact = isReturn ? -qty : qty;
                
                if (!isReturn && parseFloat(row.rate) > 0) {
                    let discountRatio = 0;
                    const trueSubtotal = (record.items || []).reduce((sum, item) => sum + (Math.abs(parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
                    if (record.discount > 0 && trueSubtotal > 0) {
                        discountRatio = record.discountType === '%' ? (record.discount / 100) : (record.discount / trueSubtotal);
                    }
                    const newPrice = Math.max(0, parseFloat(row.rate) * (1 - discountRatio));
                    const newQty = qty;
                    
                    const oldStock = Math.max(0, parseFloat(dbItem.stock) || 0);
                    const oldPrice = parseFloat(dbItem.buyPrice) || 0;
                    
                    if (newQty > 0) {
                        const totalOldValue = oldStock * oldPrice;
                        const totalNewValue = newQty * newPrice;
                        const newTotalStock = oldStock + newQty;
                        dbItem.buyPrice = newTotalStock > 0 ? Math.round(((totalOldValue + totalNewValue) / newTotalStock) * 100) / 100 : newPrice;
                    }
                }
            } else if (storeName === 'adjustments') {
                impact = record.type === 'add' ? qty : -qty;
            } else if (storeName === 'expenses') {
                impact = -qty; 
            }
            
            let targetPoolIsNonGST = isNonGST;
            if (storeName === 'adjustments') targetPoolIsNonGST = record.pool !== 'gst';
            
            if (targetPoolIsNonGST) {
                stockNonGst = Math.round((stockNonGst + impact) * 100) / 100;
                dbItem.stockNonGst = stockNonGst;
            } else {
                stockGst = Math.round((stockGst + impact) * 100) / 100;
                dbItem.stockGst = stockGst;
            }
            
            dbItem.stock = Math.round((stockGst + stockNonGst) * 100) / 100;
            await saveRecord('items', dbItem);
        }
    }
};

const saveInvoiceTransaction = async (storeName, data) => {
    // 🚨 ENTERPRISE UPGRADE: GLOBAL DATA NORMALIZER
    // Silently fixes messy typists before the data ever hits the database!
    if (data.customerName) {
        data.customerName = data.customerName.replace(/\b\w/g, c => c.toUpperCase());
    }
    if (data.supplierName) {
        data.supplierName = data.supplierName.replace(/\b\w/g, c => c.toUpperCase());
    }
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            if (item.hsn) item.hsn = String(item.hsn).toUpperCase().trim();
            if (item.name) item.name = item.name.replace(/\b\w/g, c => c.toUpperCase());
        });
    }

    const existingRecord = await getRecordById(storeName, data.id);
    
    // STRICT ERP LOGIC: Inherit the exact DB type to prevent string/number cloning!
    if (existingRecord) {
        data.id = existingRecord.id;
    }
    
    // STRICT ERP LOGIC: Map all IDs to strings to prevent snapshot rollback failures!
    // ENTERPRISE FIX: Ensure Adjustments are correctly coerced to strings to prevent snapshot failures!
    const newDataItems = storeName === 'adjustments' ? [String(data.itemId)] : (data.items || []).map(row => String(row.itemId || row.id));
    const oldDataItems = existingRecord ? (storeName === 'adjustments' ? [String(existingRecord.itemId)] : (existingRecord.items || []).map(row => String(row.itemId || row.id))) : [];
    const allItemIds = [...new Set([...newDataItems, ...oldDataItems].filter(Boolean))];
    
    // ENTERPRISE FIX: Direct O(1) DB lookup. Stops full table scan RAM crashes!
    const itemsSnapshot = [];
    for (const id of allItemIds) {
        const item = await getRecordById('items', id);
        if (item) itemsSnapshot.push(item);
    }
    // ENTERPRISE FIX: Create a snapshot array to protect receipts in case of a system crash!
    let deletedReceiptsSnapshot = [];

    try {
        if (existingRecord) {
            await reverseStockImpact(storeName, existingRecord);
            
            const docNo = existingRecord.invoiceNo || existingRecord.poNo || existingRecord.id;
            const partyId = storeName === 'sales' ? existingRecord.customerId : existingRecord.supplierId;
            const newDocNo = data.invoiceNo || data.poNo || data.id; 
            
            // ENTERPRISE FIX: Track the new party so we can migrate payments if the customer name changed!
            const newPartyId = storeName === 'sales' ? data.customerId : data.supplierId;
            const newPartyName = storeName === 'sales' ? data.customerName : data.supplierName;
            
            if (docNo && partyId) {
                // ENTERPRISE FIX: Stop the "Save Button" from freezing on large databases!
                const receipts = await getAllRecords('receipts', 'firmId', data.firmId);
                for (const r of receipts) {
                    // ENTERPRISE FIX: The Ghost Payment Multiplier Shield!
                    // Purchases use 'linkedInvoice' instead of 'invoiceRef'. Auto-generated split tenders use data.id instead of docNo!
                    if ((String(r.invoiceRef) === String(docNo) || String(r.invoiceRef) === String(existingRecord.id) || String(r.linkedInvoice) === String(docNo) || String(r.linkedInvoice) === String(existingRecord.id)) && String(r.ledgerId) === String(partyId) && r.isAutoGenerated) {
                        
                        // 🚨 ENTERPRISE FIX: The "Evaporating Payment" Shield!
                        // Do NOT delete Split-Tender payments when a user edits an invoice, otherwise their cashbook permanently loses the money!
                        if (!String(r.id).startsWith('split-')) {
                            deletedReceiptsSnapshot.push(r); // Safely back it up before deleting!
                            await deleteRecordById('receipts', r.id); 
                        }
                    }
                    // ENTERPRISE FIX: Trigger the update if the Invoice Number OR the Customer Name changed!
                    else if (String(r.ledgerId) === String(partyId) && !r.isAutoGenerated && (String(docNo) !== String(newDocNo) || String(partyId) !== String(newPartyId))) {
                        let updated = false;
                        
                        // ENTERPRISE FIX: Check standard invoice references (Sales)
                        if (r.invoiceRef) {
                            const refs = String(r.invoiceRef).split(',').map(x => x.trim());
                            if (refs.includes(String(docNo))) {
                                r.invoiceRef = refs.map(ref => ref === String(docNo) ? String(newDocNo) : ref).join(', ');
                                updated = true;
                            }
                        }
                        
                        // ENTERPRISE FIX: Check linked invoice references (Purchases)
                        if (r.linkedInvoice) {
                            const linkedRefs = String(r.linkedInvoice).split(',').map(x => x.trim());
                            if (linkedRefs.includes(String(docNo))) {
                                r.linkedInvoice = linkedRefs.map(ref => ref === String(docNo) ? String(newDocNo) : ref).join(', ');
                                updated = true;
                            }
                        }

                        if (updated) {
                            // ENTERPRISE FIX: Physically migrate the receipt to the new customer's ledger!
                            if (String(partyId) !== String(newPartyId)) {
                                // ENTERPRISE FIX: The Bulk Payment Hijack Shield!
                                // If this receipt pays for MULTIPLE invoices, moving it to a new customer will permanently orphan the other invoices!
                                const refCount = String(r.invoiceRef || '').split(',').filter(x => x.trim()).length;
                                const linkCount = String(r.linkedInvoice || '').split(',').filter(x => x.trim()).length;
                                if (refCount > 1 || linkCount > 1) {
                                    throw new Error("Cannot change the Customer/Supplier! This invoice is tied to a Bulk Payment covering multiple invoices. Please unlink the payment in the Cashbook first.");
                                }
                                
                                r.ledgerId = newPartyId;
                                r.ledgerName = newPartyName;
                            }
                            
                            if (r.desc && r.desc.includes(docNo)) {
                                r.desc = r.desc.replace(docNo, newDocNo); 
                            }
                            await saveRecord('receipts', r);
                        }
                    }
                }
            }
        }

        await applyStockImpact(storeName, data);
        await saveRecord(storeName, data);
        
        if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    } catch (error) {
        console.error("CRITICAL DB ERROR: Rolling back data to prevent corruption...", error);
        // 1. Rollback Inventory
        for (const oldItem of itemsSnapshot) {
            await saveRecord('items', oldItem);
        }
        // 2. ENTERPRISE FIX: Rollback deleted receipts so the customer's payment isn't permanently lost!
        for (const oldReceipt of deletedReceiptsSnapshot) {
            await saveRecord('receipts', oldReceipt);
        }
        throw new Error("Transaction rolled back safely due to a system error.");
    }
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
    // ENTERPRISE FIX: Debounce the heavy export engine!
    // Prevents the "Save" button from freezing for 3 seconds while the database serializes.
    if (window.localBackupTimer) clearTimeout(window.localBackupTimer);
    
    window.localBackupTimer = setTimeout(async () => {
        try {
            if (typeof exportDatabase !== 'function') return;
            const backupData = await exportDatabase();
            
            // 🚨 ENTERPRISE UPGRADE: INLINE WEB WORKER
            // Offloads massive JSON stringification to a secondary CPU core so the UI never stutters!
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
            const worker = new Worker(URL.createObjectURL(blob));

            worker.onmessage = function(e) {
                if (e.data.success && e.data.payload.length < 4500000) {
                    localStorage.setItem('sollo_auto_backup', e.data.payload);
                    localStorage.setItem('sollo_auto_backup_date', new Date().toISOString());
                }
                worker.terminate(); // Safely kill the background thread to save phone battery
            };

            worker.postMessage(backupData); // Send the heavy data to the background core!
            
        } catch (e) {
            console.warn("Auto-backup engine silently skipped (data might be too large).");
        }
    }, 3000); // Wait 3 seconds for the UI to settle before running background math!
};

const exportDatabase = async () => {
    // ENTERPRISE FIX: Capture the phone's current active Firm ID
    const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
    
    // FIX: Added 'trash' to the export array so the recycle bin is safely backed up to the cloud
    const stores = ['firms', 'businessProfile', 'counters', 'items', 'ledgers', 'sales', 'purchases', 'receipts', 'expenses', 'accounts', 'adjustments', 'units', 'expenseCategories', 'trash'];
    const backupData = {};
    
    for (const store of stores) {
        const allRecords = await getAllRecords(store);
        
        // --- ENTERPRISE FIX: STRICT DATA ISOLATION ---
        // Only export global settings OR records that belong exactly to the active business!
        // ENTERPRISE FIX: The Master-Data Blackhole Shield!
        // Units and Expense Categories are legacy tables that lack strict firmIds. They MUST bypass the filter or they get permanently deleted during backup!
        if (store === 'counters' || store === 'units' || store === 'expenseCategories') {
            backupData[store] = allRecords; // Global dropdowns and settings
        } else {
            // Filter out any data that belongs to other businesses (if multi-firm is used)
            backupData[store] = allRecords.filter(record => record.firmId === activeFirmId || record.id === activeFirmId);
        }
    }

    // 🚨 ENTERPRISE UPGRADE: LOCAL STORAGE SETTINGS BACKUP
    // Safely extract all UI themes, PDF fonts, numbering formats, and custom starting numbers!
    const appSettings = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Backup all SOLLO settings EXCEPT the massive background temporary auto-backup strings!
        if (key && key.startsWith('sollo_') && !key.includes('auto_backup')) {
            appSettings[key] = localStorage.getItem(key);
        }
    }
    // Store it as a single object array to perfectly match the existing JSON structure parser!
    backupData['appSettings'] = [appSettings];
    
    return backupData;
};

const importDatabase = async (parsedData) => {
    // ==========================================
    // STRICT ERP LOGIC: THE FILE SHIELD
    // ==========================================
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        return Promise.reject(new Error("Invalid File Format. Please upload a valid .json backup."));
    }
    if (!parsedData.ledgers && !parsedData.items && !parsedData.sales) {
        return Promise.reject(new Error("File Rejected: This is not a valid SOLLO ERP backup file."));
    }

    // 🚨 ENTERPRISE UPGRADE: RESTORE LOCAL STORAGE SETTINGS
    // Re-applies your custom PDF colors, fonts, and invoice numbering formats instantly!
    if (parsedData.appSettings && parsedData.appSettings.length > 0) {
        const settings = parsedData.appSettings[0];
        Object.keys(settings).forEach(key => {
            localStorage.setItem(key, settings[key]);
        });
        console.log("⚙️ App Settings & Themes Restored Successfully!");
    }

    // ENTERPRISE FIX: The "New Phone" Restore Bug!
    // The previous shield permanently blocked restoring backups onto a brand new device!
    // We must accept the backup's Firm ID and command the app to dynamically adopt it.
    let backupFirmId = null;
    if (parsedData.firms && parsedData.firms.length > 0) {
        backupFirmId = parsedData.firms[0].id;
    }

    const stores = Object.keys(parsedData);

    return new Promise((resolve, reject) => {
        const validStores = stores.filter(store => db.objectStoreNames.contains(store));
        
        if (validStores.length === 0) return reject(new Error("No valid data stores found in backup."));
        
        const transaction = db.transaction(validStores, 'readwrite');
        
        transaction.oncomplete = () => {
            // ENTERPRISE FIX: Successfully restored! Now force the app to adopt the restored company's ID!
            if (backupFirmId && window.app && window.app.state) {
                window.app.state.firmId = backupFirmId;
            }
            
            // Clear the memory so the app doesn't show old ghost data
            if (window.AppCache) {
                window.AppCache.items = null;
                window.AppCache.ledgers = null;
                window.AppCache.accounts = null;
            }
            
            // Give the database a split second to settle, then instantly reload the screen!
            if (window.app && typeof window.app.refreshAll === 'function') {
                setTimeout(() => window.app.refreshAll(), 50);
            }
            resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);

        // ENTERPRISE FIX: The Multi-Firm Annihilation Shield!
        validStores.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            
            // 1. Fetch ALL existing records to selectively delete
            const request = store.getAll();
            request.onsuccess = () => {
                const existingRecords = request.result || [];
                
                // 2. SURGICAL WIPE: Only delete records that belong to the Firm we are restoring!
                existingRecords.forEach(record => {
                    // If the record belongs to the backup's firm, or it's a global setting, delete it to make room.
                    if (record.firmId === backupFirmId || record.id === backupFirmId || storeName === 'counters' || storeName === 'units' || storeName === 'expenseCategories') {
                        store.delete(record.id || record.firmId); 
                    }
                });

                // 3. Inject the restored data safely!
                if (Array.isArray(parsedData[storeName])) {
                    parsedData[storeName].forEach(record => {
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

    let gstr1 = { b2bTaxable: 0, b2bTax: 0, b2cTaxable: 0, b2cTax: 0, totalTaxable: 0, totalTax: 0 };
    let gstr2 = { totalTaxable: 0, totalTax: 0 }; 

    // Calculate GSTR-1 (Outward Supplies / Sales)
    monthSales.forEach(s => {
        // NEW: Omit "Bill of Supply" (Non-GST) from GSTR-1 and GSTR-3B
        if (s.invoiceType === 'Non-GST') return;

        let isReturn = s.documentType === 'return';
        let mult = isReturn ? -1 : 1; // Subtract returns from total sales
        
        // ENTERPRISE FIX: Removed secondary discount deduction because subtotal is ALREADY stored as Net Taxable Value!
        // Double-deducting here artificially deflates GSTR-1 and causes portal rejections.
        let taxable = (parseFloat(s.subtotal) || 0) * mult;
        let tax = (parseFloat(s.totalGst) || 0) * mult;

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
        // NEW: Omit Non-GST / Exempt purchases from GSTR-2 and GSTR-3B ITC
        if (p.invoiceType === 'Non-GST') return;

        let isReturn = p.documentType === 'return';
        let mult = isReturn ? -1 : 1;
        
        // ENTERPRISE FIX: Mathematical Net Impact Shield!
        // Ensures Returns (Debit Notes) correctly reduce the ITC pool without causing CSV validation crashes.
        let taxable = parseFloat(p.subtotal) || 0;
        let tax = parseFloat(p.totalGst) || 0;

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
            
            ['sales', 'purchases'].forEach(storeName => {
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    req.result.forEach(doc => {
                        // If invoice is Older than 1 year, is Completed/Paid, and hasn't been archived yet...
                        if (doc.date < cutoffDate && doc.status === 'Completed' && doc.items && doc.items.length > 0) {
                            // Erase the massive item array to free up MBs of RAM and Storage
                            doc.items = []; 
                            doc.notes = (doc.notes || '') + '\n[SYSTEM: Items archived to Cold Storage to save space.]';
                            store.put(doc);
                            archivedCount++;
                        }
                    });
                };
            });

            tx.oncomplete = () => {
                console.log(`📦 Cold Storage Archive Complete: ${archivedCount} old invoices compressed.`);
                resolve(archivedCount);
            };
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

