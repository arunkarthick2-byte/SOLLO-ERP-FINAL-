// ==========================================
// SOLLO ERP - DATABASE ENGINE (v6.0 WASM EVENT LEDGER)
// ==========================================
const DB_NAME = 'SOLLO_ERP_DB';
const DB_VERSION = 11; // ⚡ UPGRADED TO V11 FOR DOUBLE-ENTRY ACCOUNTING
let db; // Legacy IndexedDB (Will be deprecated)

// --- ENTERPRISE ARCHITECTURE: WEBASSEMBLY SQLITE CORE ---
let sqlDB = null; // The new Bank-Grade SQL Engine

const initSQLite = async () => {
    try {
        if (typeof window.initSqlJs === 'undefined') {
            console.warn("Wasm Engine loading... retrying in 500ms");
            setTimeout(initSQLite, 500);
            return;
        }
        
        // 1. Boot the C++ WebAssembly Compiler
        const SQL = await window.initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        // 2. Try to load existing SQL binary from IndexedDB
        const savedDB = localStorage.getItem('sollo_wasm_binary'); // Temporary bootstrap check
        if (savedDB) {
            // Load existing database from binary Uint8Array
            const binaryArr = new Uint8Array(savedDB.split(','));
            sqlDB = new SQL.Database(binaryArr);
            console.log("🟢 Wasm SQLite Engine Restored from Cache!");
        } else {
            // Create a brand new blank SQL database
            sqlDB = new SQL.Database();
            console.log("🟢 New Wasm SQLite Engine Booted!");
            
            // 3. Build the Event Sourcing Ledger Table
            sqlDB.run(`
                CREATE TABLE EventLedger (
                    eventId TEXT PRIMARY KEY,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    entityType TEXT NOT NULL,
                    entityId TEXT NOT NULL,
                    eventType TEXT NOT NULL,
                    payload JSON NOT NULL,
                    userId TEXT
                );
                CREATE INDEX idx_entity ON EventLedger(entityId);
                CREATE INDEX idx_type ON EventLedger(entityType);
            `);
            console.log("🏦 Bank-Grade Event Ledger Table Created.");
        }
    } catch (err) {
        console.error("Wasm Boot Failure:", err);
    }
};

// Start the Wasm boot sequence parallel to the legacy IndexedDB
initSQLite();

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

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
            
            // ⚡ DOUBLE-ENTRY ENGINE: The General Journal
            if (!db.objectStoreNames.contains('journal')) {
                let s = db.createObjectStore('journal', { keyPath: 'id' });
                s.createIndex('firmId', 'firmId', { unique: false });
                s.createIndex('refId', 'refId', { unique: false });
            }
        };

        request.onsuccess = (event) => { db = event.target.result; resolve(); };
        request.onerror = (event) => { console.error("IndexedDB error:", event.target.errorCode); reject(event.target.error); };
    });
};

// ==========================================
// STANDARD CRUD OPERATIONS
// ==========================================

// --- ENTERPRISE ARCHITECTURE: EVENT SOURCING APPENDER ---
const appendEvent = (entityType, entityId, eventType, payload) => {
    if (!sqlDB) return; // Failsafe if Wasm hasn't booted
    try {
        const eventId = 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const sql = `INSERT INTO EventLedger (eventId, entityType, entityId, eventType, payload) VALUES (?, ?, ?, ?, ?)`;
        sqlDB.run(sql, [eventId, entityType, entityId, eventType, JSON.stringify(payload)]);
        
        // ⚡ ENTERPRISE FIX: Prevent 5MB Quota Crash! 
        // Stringifying a Uint8Array massively inflates its size. We safely cap it to prevent fatal app crashes.
        const binaryArray = sqlDB.export();
        if (binaryArray.length < 1000000) { 
            localStorage.setItem('sollo_wasm_binary', binaryArray.toString());
        }
    } catch (err) {
        console.error("SQL Event Ledger Failure:", err);
    }
};

// ==========================================
// ENTERPRISE ARCHITECTURE: SQL TIME MACHINE (REPLAY ENGINE)
// Rebuilds the exact state of any record at any specific point in history!
// ==========================================
const replayStateAtTime = (entityType, entityId, targetISODate = null) => {
    if (!sqlDB) return null;
    try {
        // Fetch all events for this specific record, sorted from oldest to newest
        let sql = `SELECT eventType, payload FROM EventLedger WHERE entityType = ? AND entityId = ?`;
        let params = [entityType, entityId];
        
        if (targetISODate) {
            sql += ` AND timestamp <= ?`;
            params.push(targetISODate);
        }
        sql += ` ORDER BY timestamp ASC`;
        
        const stmt = sqlDB.prepare(sql);
        stmt.bind(params);
        
        let currentState = null;
        
        // Replay the events one by one to reconstruct the file
        while (stmt.step()) {
            const row = stmt.getAsObject();
            const payload = JSON.parse(row.payload);
            
            if (row.eventType === 'UPSERT') {
                currentState = { ...currentState, ...payload };
            } else if (row.eventType === 'DELETE') {
                currentState = null; // The record was deleted at this point in time
            }
        }
        stmt.free();
        
        return currentState;
    } catch (err) {
        console.error("Time Machine Failure:", err);
        return null;
    }
};

// ==========================================
// ⚡ ENTERPRISE UPGRADE: EXTRACT EVENT HISTORY
// ==========================================
const getRecordHistory = (entityId) => {
    if (!sqlDB) return [];
    try {
        let sql = `SELECT eventId, timestamp, eventType, payload FROM EventLedger WHERE entityId = ? ORDER BY timestamp DESC`;
        const stmt = sqlDB.prepare(sql);
        stmt.bind([entityId]);
        let history = [];
        while (stmt.step()) {
            history.push(stmt.getAsObject());
        }
        stmt.free();
        return history;
    } catch (err) {
        console.error("Failed to fetch history:", err);
        return [];
    }
};

const getAllRecords = (storeName, indexName = null, indexValue = null) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        // ENTERPRISE UPGRADE: Native Indexed Queries (RAM Saver)
        // If an index is provided (like firmId), only fetch those specific records!
        let request;
        if (indexName && indexValue && store.indexNames.contains(indexName)) {
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
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveRecord = (storeName, data) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => {
            // --- ENTERPRISE EVENT SOURCING: DUAL-WRITE ROUTER ---
            // Streams an immutable record of this exact transaction into the SQL database!
            if (storeName !== 'trash' && storeName !== 'counters') {
                appendEvent(storeName, data.id || data.firmId, 'UPSERT', data);
            }
            resolve(data.id || data.firmId);
        };
        request.onerror = () => reject(request.error);
    });
};

const deleteRecordById = async (storeName, id) => {
    try {
        // 1. Fetch the record first to identify linked impacts
        const oldRecord = await getRecordById(storeName, id);
        
        if (oldRecord && (storeName === 'sales' || storeName === 'purchases')) {
            // 2. CRITICAL: Await the stock reversal COMPLETELY before proceeding
            await reverseStockImpact(storeName, oldRecord);
            
            // 3. Batched cleanup of auto-generated receipts (Optimized & Collision Protected)
            const uniqueRefs = [...new Set([oldRecord.orderNo, oldRecord.invoiceNo, oldRecord.poNo, oldRecord.id].filter(Boolean))];
            const partyId = storeName === 'sales' ? oldRecord.customerId : oldRecord.supplierId;
            
            if (uniqueRefs.length > 0 && partyId) {
                const receipts = await getAllRecords('receipts');
                const receiptsToDelete = receipts.filter(r => uniqueRefs.includes(r.invoiceRef) && r.ledgerId === partyId && r.isAutoGenerated && r.firmId === oldRecord.firmId);

                if (receiptsToDelete.length > 0) {
                    await new Promise((resolveBatch, rejectBatch) => {
                        const t = db.transaction('receipts', 'readwrite');
                        const store = t.objectStore('receipts');
                        
                        receiptsToDelete.forEach(r => store.delete(r.id));
                        
                        t.oncomplete = () => resolveBatch();
                        t.onerror = () => rejectBatch(t.error);
                    });
                }
            }
        }

        // ENTERPRISE UPGRADE: Soft Deletion (Send to Recycle Bin instead of void)
        if (oldRecord && storeName !== 'trash') {
            oldRecord._module = storeName; 
            oldRecord._deletedAt = new Date().toISOString(); 
            await saveRecord('trash', oldRecord); 
        }

        // ⚡ DOUBLE-ENTRY REVERSAL: Destroy the linked Journal Entry
        try {
            await new Promise((res, rej) => {
                const jt = db.transaction('journal', 'readwrite');
                const jreq = jt.objectStore('journal').delete('JRN-' + id);
                jreq.onsuccess = res;
                jreq.onerror = rej;
            });
        } catch(e) {}

        // 4. Finally, delete the actual document only after all reversals finish
        await new Promise((resolveDelete, rejectDelete) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const request = transaction.objectStore(storeName).delete(id);
            request.onsuccess = () => {
                // --- ENTERPRISE EVENT SOURCING: TOMBSTONE APPENDER ---
                if (storeName !== 'trash') {
                    appendEvent(storeName, id, 'DELETE', { deletedAt: new Date().toISOString() });
                }
                resolveDelete();
            };
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
    if (record.status === 'Open') return; 
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    
    const items = await getAllRecords('items');
    const safeItems = Array.isArray(record.items) ? record.items : [];
    
    for (const row of safeItems) {
        const dbItem = items.find(i => i.id === row.itemId);
        if (dbItem) {
            let qty = parseFloat(row.qty) || 0;
            dbItem.gstStock = parseFloat(dbItem.gstStock) || 0;
            dbItem.nonGstStock = parseFloat(dbItem.nonGstStock) || 0;
            if (!dbItem.batches) dbItem.batches = []; 
            
            let originalImpactQty = isReturn ? qty : -qty;
            if (storeName === 'purchases') {
                originalImpactQty = isReturn ? -qty : qty;
            }
            
            // ⚡ UPGRADED REVERSAL ENGINE
            if (originalImpactQty > 0) {
                const batchIdToDestroy = record.id + '-' + row.itemId;
                dbItem.batches = dbItem.batches.filter(b => b.batchId !== batchIdToDestroy);
            } else if (originalImpactQty < 0) {
                if (row.fifoTrail) {
                    row.fifoTrail.forEach(trail => {
                        let batch = dbItem.batches.find(b => b.batchId === trail.batchId);
                        // If we are reversing an overdraft, we restore the negative balance to 0!
                        if (batch) batch.remaining += trail.qty; 
                    });
                }
            }

            // Legacy Shadow Sync Reversal
            let reverseImpact = -originalImpactQty; 
            if (isNonGST) {
                dbItem.nonGstStock = Math.round((dbItem.nonGstStock + reverseImpact) * 100) / 100;
            } else {
                dbItem.gstStock = Math.round((dbItem.gstStock + reverseImpact) * 100) / 100;
            }
            dbItem.stock = Math.round((dbItem.gstStock + dbItem.nonGstStock) * 100) / 100;
            
            await saveRecord('items', dbItem);
        }
    }
};

const applyStockImpact = async (storeName, record) => {
    if (record.status === 'Open') return; 
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    
    const items = await getAllRecords('items');
    const safeItems = Array.isArray(record.items) ? record.items : [];
    
    for (const row of safeItems) {
        const dbItem = items.find(i => i.id === row.itemId);
        if (dbItem) {
            let qty = parseFloat(row.qty) || 0;
            dbItem.gstStock = parseFloat(dbItem.gstStock) || 0;
            dbItem.nonGstStock = parseFloat(dbItem.nonGstStock) || 0;
            if (!dbItem.batches) dbItem.batches = []; 
            
            let impactQty = isReturn ? qty : -qty;
            if (storeName === 'purchases') {
                impactQty = isReturn ? -qty : qty;
            }
            
            const targetBucket = isNonGST ? 'non-gst' : 'gst';

            // ⚡ ENTERPRISE FIX: TRUE FIFO COSTING & NEGATIVE STOCK ENGINE
            if (impactQty > 0) {
                // STOCK IN: Determine correct valuation for incoming stock
                let trueCostRate = parseFloat(row.rate) || 0;
                if (storeName === 'sales' && isReturn) {
                    // 🛑 CRITICAL FIX: For Sales Returns, DO NOT use the selling price! Use the original buy price!
                    trueCostRate = parseFloat(row.buyPrice) || parseFloat(isNonGST ? dbItem.nonGstBuyPrice : dbItem.gstBuyPrice) || parseFloat(dbItem.buyPrice) || 0;
                }

                // Before creating a new positive batch, check if we have any negative (overdraft) batches to fill!
                let remainingToFill = impactQty;
                dbItem.batches.sort((a, b) => new Date(a.date) - new Date(b.date));

                for (let batch of dbItem.batches) {
                    if (remainingToFill <= 0) break;
                    if (batch.bucket !== targetBucket || batch.remaining >= 0) continue; // Look only for negative overdrafts

                    let fillAmount = Math.min(Math.abs(batch.remaining), remainingToFill);
                    batch.remaining += fillAmount; // Fill the negative gap mathematically
                    remainingToFill -= fillAmount;
                }

                // If there is still stock left after filling overdrafts, create a new batch
                if (remainingToFill > 0) {
                    dbItem.batches.push({
                        batchId: record.id + '-' + row.itemId,
                        date: record.date,
                        rate: trueCostRate,
                        qty: remainingToFill,
                        remaining: remainingToFill,
                        bucket: targetBucket
                    });
                }
            } else if (impactQty < 0) {
                // STOCK OUT -> Deduct from oldest Lots first
                let needed = Math.abs(impactQty);
                row.fifoTrail = []; 
                
                dbItem.batches.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                for (let batch of dbItem.batches) {
                    if (needed <= 0) break;
                    if (batch.bucket !== targetBucket || batch.remaining <= 0) continue;
                    
                    let deducted = Math.min(batch.remaining, needed);
                    batch.remaining -= deducted;
                    needed -= deducted;
                    
                    row.fifoTrail.push({ batchId: batch.batchId, qty: deducted, rate: batch.rate });
                }

                // ⚡ FIX: OVERDRAFT (NEGATIVE STOCK) BATCH CREATOR
                // If we sold more than we had, we MUST record the negative balance!
                if (needed > 0) {
                    const overdraftId = 'OVD-' + record.id + '-' + row.itemId;
                    const fallbackCost = parseFloat(row.buyPrice) || parseFloat(isNonGST ? dbItem.nonGstBuyPrice : dbItem.gstBuyPrice) || parseFloat(dbItem.buyPrice) || 0;
                    
                    dbItem.batches.push({
                        batchId: overdraftId,
                        date: record.date,
                        rate: fallbackCost,
                        qty: -needed,
                        remaining: -needed, // Mathematically negative remaining!
                        bucket: targetBucket
                    });
                    
                    row.fifoTrail.push({ batchId: overdraftId, qty: needed, rate: fallbackCost });
                }
                
                // COGS Calculation: Average cost of the deducted lots
                if (row.fifoTrail.length > 0) {
                    let totalCost = row.fifoTrail.reduce((sum, t) => sum + (t.qty * t.rate), 0);
                    let totalQty = row.fifoTrail.reduce((sum, t) => sum + t.qty, 0);
                    row.buyPrice = totalCost / totalQty; 
                }
            }
            
            // Legacy Shadow Sync (Keeps the UI dashboards working perfectly)
            if (isNonGST) {
                dbItem.nonGstStock = Math.round((dbItem.nonGstStock + impactQty) * 100) / 100;
            } else {
                dbItem.gstStock = Math.round((dbItem.gstStock + impactQty) * 100) / 100;
            }
            dbItem.stock = Math.round((dbItem.gstStock + dbItem.nonGstStock) * 100) / 100;
            
            // Dual Valuation Fallback (For Master Records)
            if (storeName === 'purchases' && !isReturn && row.rate > 0) {
                let discountRatio = 0;
                const trueSubtotal = (record.items || []).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
                if (record.discount > 0 && trueSubtotal > 0) discountRatio = record.discountType === '%' ? (record.discount / 100) : (record.discount / trueSubtotal);
                let finalRate = row.rate * (1 - discountRatio);

                if (isNonGST) {
                    const taxMultiplier = 1 + ((parseFloat(row.gstPercent) || 0) / 100);
                    dbItem.nonGstBuyPrice = finalRate * taxMultiplier;
                } else {
                    dbItem.gstBuyPrice = finalRate;
                }
                dbItem.buyPrice = isNonGST ? dbItem.nonGstBuyPrice : dbItem.gstBuyPrice;
            }
            
            await saveRecord('items', dbItem);
        }
    }
};

const saveInvoiceTransaction = async (storeName, data) => {
    // ENTERPRISE UPGRADE: Take a snapshot ONLY of the specific items in this transaction to prevent massive Lag/Freezing
    const allItems = await getAllRecords('items');
    const itemsSnapshot = allItems.filter(i => (data.items || []).some(row => row.itemId === i.id));
    const existingRecord = await getRecordById(storeName, data.id);

    try {
        // 1. If Editing, Reverse previous stock impacts first
        if (existingRecord) {
            await reverseStockImpact(storeName, existingRecord);
            
            // Delete old auto-receipts to recreate them fresh (Collision Protected)
            const docNo = existingRecord.invoiceNo || existingRecord.poNo || existingRecord.id;
            const partyId = storeName === 'sales' ? existingRecord.customerId : existingRecord.supplierId;
            const newDocNo = data.invoiceNo || data.poNo || data.id; 
            
            if (docNo && partyId) {
                const receipts = await getAllRecords('receipts');
                for (const r of receipts) {
                    if (r.invoiceRef === docNo && r.ledgerId === partyId && r.isAutoGenerated) {
                        // FIX: Actually delete the old auto-receipt so it doesn't duplicate the balance!
                        await deleteRecordById('receipts', r.id); 
                    }
                    else if (r.ledgerId === partyId && !r.isAutoGenerated && docNo !== newDocNo) {
                        const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                        if (refs.includes(docNo)) {
                            const newRefs = refs.map(ref => ref === docNo ? newDocNo : ref);
                            r.invoiceRef = newRefs.join(', ');
                            if (r.desc && r.desc.includes(docNo)) {
                                r.desc = r.desc.replace(docNo, newDocNo); 
                            }
                            await saveRecord('receipts', r);
                        }
                    }
                }
            }
        }

        // 2. Apply New Stock Impacts
        await applyStockImpact(storeName, data);

        // 3. Save the actual Invoice/PO document
        await saveRecord(storeName, data);
        
        // ==========================================
        // ⚡ DOUBLE-ENTRY ENGINE: AUTOMATIC JOURNAL POSTING
        // Generates strict Dr/Cr legs for every transaction
        // ==========================================
        if (data.status !== 'Open') {
            let legs = [];
            const gt = parseFloat(data.grandTotal) || 0;
            const tax = parseFloat(data.totalGst) || 0;
            const fr = parseFloat(data.freightAmount) || 0;
            
            // Mathematically deduce exact Net Revenue
            const rawSubtotal = (data.items || []).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
            const discAmt = data.discountType === '%' ? (rawSubtotal * ((parseFloat(data.discount) || 0) / 100)) : (parseFloat(data.discount) || 0);
            const netRevenue = rawSubtotal - discAmt;

            if (storeName === 'sales') {
                if (data.documentType === 'return') {
                    legs.push({ acc: 'Sales Returns', type: 'Dr', amt: gt, party: null });
                    legs.push({ acc: 'Accounts Receivable', type: 'Cr', amt: gt, party: data.customerId });
                } else {
                    legs.push({ acc: 'Accounts Receivable', type: 'Dr', amt: gt, party: data.customerId });
                    legs.push({ acc: 'Sales Revenue', type: 'Cr', amt: netRevenue, party: null });
                    if (tax > 0) legs.push({ acc: 'Output GST (Liability)', type: 'Cr', amt: tax, party: null });
                    if (fr > 0) legs.push({ acc: 'Freight Income', type: 'Cr', amt: fr, party: null });
                }
            } else if (storeName === 'purchases') {
                if (data.documentType === 'return') {
                    legs.push({ acc: 'Accounts Payable', type: 'Dr', amt: gt, party: data.supplierId });
                    legs.push({ acc: 'Purchase Returns', type: 'Cr', amt: gt, party: null });
                } else {
                    legs.push({ acc: 'Purchases (COGS)', type: 'Dr', amt: netRevenue, party: null });
                    if (tax > 0) legs.push({ acc: 'Input GST (Asset)', type: 'Dr', amt: tax, party: null });
                    if (fr > 0) legs.push({ acc: 'Freight Expense', type: 'Dr', amt: fr, party: null });
                    legs.push({ acc: 'Accounts Payable', type: 'Cr', amt: gt, party: data.supplierId });
                }
            }

            // CA-Approval Failsafe: Verify Debits = Credits
            const drTotal = Math.round(legs.filter(l => l.type === 'Dr').reduce((s, l) => s + l.amt, 0) * 100) / 100;
            const crTotal = Math.round(legs.filter(l => l.type === 'Cr').reduce((s, l) => s + l.amt, 0) * 100) / 100;
            
            if (Math.abs(drTotal - crTotal) < 0.5) {
                const journalEntry = {
                    id: 'JRN-' + data.id, // Idempotent: Auto-overwrites on edits!
                    firmId: data.firmId,
                    date: data.date,
                    refId: data.id,
                    refNo: data.invoiceNo || data.poNo,
                    module: storeName,
                    legs: legs,
                    timestamp: new Date().toISOString()
                };
                await saveRecord('journal', journalEntry);
            } else {
                console.error(`[Double-Entry] Imbalance in ${data.id}! Dr: ${drTotal}, Cr: ${crTotal}`);
            }
        }

        // 4. Trigger silent background backup
        if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    } catch (error) {
        console.error("CRITICAL DB ERROR: Rolling back stock to prevent corruption...", error);
        // ROLLBACK: Restore inventory to the exact snapshot taken before the crash!
        for (const oldItem of itemsSnapshot) {
            await saveRecord('items', oldItem);
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
    
    // Read the user's custom settings from the device memory
    const savedFormats = JSON.parse(localStorage.getItem('sollo_doc_formats') || '{}');
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
            docNo = record[targetField] || '';
        } else {
            // FIX: Corrected typo 'invomiceNo' to 'invoiceNo'
            docNo = (storeName === 'sales' ? record.invoiceNo : (record.poNo || record.invoiceNo)) || ''; 
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
        // Dynamically checks for 'sollo_inv_start', 'sollo_po_start', etc. Defaults to 1.
        const customStartStr = localStorage.getItem(`sollo_${docType.toLowerCase()}_start`) || '1';
        nextNumber = parseInt(customStartStr, 10);
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
    const rawSales = await getAllRecords('sales');
    rawSales.forEach(s => {
        if (s.firmId === firmId && s.customerId === partyId && s.status !== 'Open') {
            const isReturn = s.documentType === 'return';
            const isNonGST = s.invoiceType === 'Non-GST';
            const docLabel = isReturn ? 'Credit Note' : (isNonGST ? 'Bill of Supply' : 'Sales Invoice');
            const docNo = s.invoiceNo || s.orderNo || String(s.id).slice(-4).toUpperCase();
            
            timeline.push({
                id: s.id, date: s.date, desc: `${docLabel} (${docNo})`, 
                amount: s.grandTotal, isInvoice: !isReturn, impact: isReturn ? -s.grandTotal : s.grandTotal
            });
        }
    });
    rawSales.length = 0; // Force Garbage Collection

    // 2. Process Purchases, then wipe from memory
    const rawPurchases = await getAllRecords('purchases');
    rawPurchases.forEach(p => {
        if (p.firmId === firmId && p.supplierId === partyId && p.status !== 'Open') {
            const isReturn = p.documentType === 'return';
            const isNonGST = p.invoiceType === 'Non-GST';
            const docLabel = isReturn ? 'Debit Note' : (isNonGST ? 'Bill of Supply' : 'Purchase Bill');
            const docNo = p.poNo || p.invoiceNo || p.orderNo || String(p.id).slice(-4).toUpperCase();
            
            timeline.push({
                id: p.id, date: p.date, desc: `${docLabel} (${docNo})`, 
                amount: p.grandTotal, isInvoice: !isReturn, impact: isReturn ? -p.grandTotal : p.grandTotal
            });
        }
    });
    rawPurchases.length = 0; // Force Garbage Collection

    // 3. Process Receipts, then wipe from memory
    const rawReceipts = await getAllRecords('receipts');
    rawReceipts.forEach(r => {
        if (r.firmId === firmId && r.ledgerId === partyId) {
            const isMoneyIn = r.type === 'in';
            let impact = isCustomer ? (isMoneyIn ? -r.amount : r.amount) : (isMoneyIn ? r.amount : -r.amount);
            
            timeline.push({
                id: r.id, date: r.date, 
                desc: (r.receiptNo ? r.receiptNo + ' - ' : '') + (r.desc || (isMoneyIn ? 'Payment Received' : 'Payment Made')),
                amount: r.amount, isInvoice: false, impact: impact 
            });
        }
    });
    rawReceipts.length = 0; // Force Garbage Collection

    // --- ENTERPRISE FIX: SAME-DAY LEDGER PRECISION ---
    // Sort chronologically (with ID fallback for exact hour/minute creation order)
    timeline.sort((a, b) => {
        if (a.id === 'open-bal') return -1;
        if (b.id === 'open-bal') return 1;
        
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) return dateDiff;
        
        // If they happened on the exact same day, sort by ID to prevent running balance glitches!
        return String(a.id).localeCompare(String(b.id));
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
    const rawSales = await getAllRecords('sales');
    rawSales.forEach(s => {
        if (s.firmId === firmId && s.status !== 'Open') {
            const isReturn = s.documentType === 'return';
            timeline.push({ id: s.id, date: s.date, type: isReturn ? 'IN' : 'OUT', party: s.customerName, ref: s.invoiceNo, qty: `${isReturn ? '+' : ''}${(s.items || []).length} items`, amount: s.grandTotal, mode: 'Credit', desc: `${isReturn ? 'Return from' : 'Sale to'} ${s.customerName}` });
        }
    });
    rawSales.length = 0;

    // 2. Process Purchases & Wipe RAM
    const rawPurchases = await getAllRecords('purchases');
    rawPurchases.forEach(p => {
        if (p.firmId === firmId && p.status !== 'Open') {
            const isReturn = p.documentType === 'return';
            timeline.push({ id: p.id, date: p.date, type: isReturn ? 'OUT' : 'IN', party: p.supplierName, ref: p.poNo || p.invoiceNo, qty: `${isReturn ? '-' : ''}${(p.items || []).length} items`, amount: p.grandTotal, mode: 'Credit', desc: `${isReturn ? 'Return to' : 'Purchase from'} ${p.supplierName}` });
        }
    });
    rawPurchases.length = 0;

    // 3. Process Receipts & Wipe RAM
    const rawReceipts = await getAllRecords('receipts');
    rawReceipts.forEach(r => {
        if (r.firmId === firmId) {
            timeline.push({ id: r.id, date: r.date, type: r.type, amount: r.amount, mode: r.mode, desc: `Party: ${r.ledgerName}` });
        }
    });
    rawReceipts.length = 0;

    // 4. Process Expenses & Wipe RAM
    const rawExpenses = await getAllRecords('expenses');
    rawExpenses.forEach(e => {
        if (e.firmId === firmId) {
            timeline.push({ id: e.id, date: e.date, type: 'out', amount: parseFloat(e.amount), mode: 'Cash', desc: `Expense: ${e.category}` });
        }
    });
    rawExpenses.length = 0;

    // --- ENTERPRISE FIX: SAME-DAY DASHBOARD PRECISION ---
    return timeline.sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date); // Reverse chronological (Newest first)
        if (dateDiff !== 0) return dateDiff;
        return String(b.id).localeCompare(String(a.id)); // Fallback to ID
    });
};

// ==========================================
// AUTO-BACKUP & BULK EXPORT ENGINE
// ==========================================
const triggerAutoBackup = async () => {
    try {
        // Automatically saves a rolling backup to LocalStorage.
        // If the browser wipes IndexedDB, the last known good state is safe here!
        if (typeof exportDatabase !== 'function') return;
        const backupData = await exportDatabase();
        const compressedString = JSON.stringify(backupData);
        
        // LocalStorage has a 5MB limit. We check size to prevent quota crashes.
        if (compressedString.length < 4500000) {
            localStorage.setItem('sollo_auto_backup', compressedString);
            localStorage.setItem('sollo_auto_backup_date', new Date().toISOString());
        }
    } catch (e) {
        console.warn("Auto-backup engine silently skipped (data might be too large).");
    }
};

const exportDatabase = async () => {
    // ENTERPRISE FIX: Capture the phone's current active Firm ID
    const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
    
    // ⚡ ENTERPRISE FIX: Added 'journal' so Trial Balance and Double-Entry Accounting are safely backed up!
    const stores = ['firms', 'businessProfile', 'counters', 'items', 'ledgers', 'sales', 'purchases', 'receipts', 'expenses', 'accounts', 'adjustments', 'units', 'expenseCategories', 'trash', 'journal'];
    const backupData = {};
    
    for (const store of stores) {
        const allRecords = await getAllRecords(store);
        
        // --- ENTERPRISE FIX: STRICT DATA ISOLATION ---
        // Only export global settings OR records that belong exactly to the active business!
        if (store === 'counters' || store === 'units' || store === 'expenseCategories') {
            backupData[store] = allRecords; // Global dropdowns and settings
        } else {
            // Filter out any data that belongs to other businesses (if multi-firm is used)
            backupData[store] = allRecords.filter(record => record.firmId === activeFirmId || record.id === activeFirmId);
        }
    }
    
    return backupData;
};

const importDatabase = async (parsedData) => {
    const stores = Object.keys(parsedData);
    
    // ENTERPRISE FIX: Capture the phone's current active Firm ID
    const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';

    return new Promise((resolve, reject) => {
        // Filter out obsolete stores to prevent transaction crashes
        const validStores = stores.filter(store => db.objectStoreNames.contains(store));
        
        if (validStores.length === 0) return reject(new Error("No valid data stores found in backup."));
        
        const transaction = db.transaction(validStores, 'readwrite');
        validStores.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            store.clear(); 
            parsedData[storeName].forEach(record => {
                
                // --- ENTERPRISE FIX: INVISIBLE NAME TAG OVERRIDE ---
                if (storeName === 'firms') {
                    record.id = activeFirmId; // Force the firm profile to match the phone
                } else if (storeName === 'counters' || storeName === 'units' || storeName === 'expenseCategories') {
                    // Global settings, leave them as is
                } else {
                    // Force all Invoices, Products, Customers, and Cashbook data to belong to this phone!
                    record.firmId = activeFirmId;
                }
                // ---------------------------------------------------
                
                store.put(record);
            });
        });
        
        transaction.oncomplete = () => {
            // --- ENTERPRISE FIX: WIPE RAM & AUTO-REFRESH ---
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
    });
};
// ==========================================
// 9. GST REPORTS AGGREGATION ENGINE
// ==========================================
async function generateGSTReport(yearMonth, firmId) {
    const sales = await getAllRecords('sales');
    const purchases = await getAllRecords('purchases');
    const ledgers = await getAllRecords('ledgers');

    // Filter by firm and specific month, and EXCLUDE DRAFTS (With Blank-Date Crash Protection)
    const monthSales = sales.filter(s => s.firmId === firmId && (s.date || '').startsWith(yearMonth) && s.status !== 'Open');
    const monthPurchases = purchases.filter(p => p.firmId === firmId && (p.date || '').startsWith(yearMonth) && p.status !== 'Open');

    let gstr1 = { b2bTaxable: 0, b2bTax: 0, b2cTaxable: 0, b2cTax: 0, totalTaxable: 0, totalTax: 0 };
    let gstr2 = { totalTaxable: 0, totalTax: 0 }; 

    // Calculate GSTR-1 (Outward Supplies / Sales)
    monthSales.forEach(s => {
        // NEW: Omit "Bill of Supply" (Non-GST) from GSTR-1 and GSTR-3B
        if (s.invoiceType === 'Non-GST') return;

        let isReturn = s.documentType === 'return';
        let mult = isReturn ? -1 : 1; // Subtract returns from total sales
        
        // FIX: Reverted Double-Discount Bug! ui.js already applies the discount before saving s.subtotal.
        let taxable = parseFloat(s.subtotal) * mult;
        let tax = parseFloat(s.totalGst) * mult;

        gstr1.totalTaxable += taxable;
        gstr1.totalTax += tax;

        // Determine B2B vs B2C
        let customer = ledgers.find(l => l.id === s.customerId);
        if (customer && customer.gst && customer.gst.trim() !== '') {
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
        
        // FIX: Reverted Double-Discount Bug!
        gstr2.totalTaxable += parseFloat(p.subtotal) * mult;
        gstr2.totalTax += parseFloat(p.totalGst) * mult;
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
// NEW CODE: ES MODULE EXPORT & GLOBAL MAP
// ==========================================
// 1. Export all standalone functions for ES Modules
export {
    initDB, getAllRecords, getRecordById, saveRecord, deleteRecordById,
    getAllFirms, saveInvoiceTransaction, getNextDocumentNumber,
    getKhataStatement, getGlobalTimeline, exportDatabase, importDatabase, generateGSTReport,
    getRecordHistory, replayStateAtTime 
};

// 2. Map to window so inline HTML and older files don't break during the transition
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
window.getRecordHistory = getRecordHistory;
window.replayStateAtTime = replayStateAtTime;
