// ==========================================
// SOLLO ERP - DATABASE ENGINE (v6.1 Enterprise)
// ==========================================
const DB_NAME = 'SOLLO_ERP_DB';
const DB_VERSION = 10; // Upgraded version for Trash/Recycle Bin Engine
let db;

const initDB = () => {
    return new Promise(async (resolve, reject) => {
        // STRICT ERP LOGIC: Force the browser to lock this data permanently so it never gets wiped when the phone is full!
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) console.log("🔒 ERP Vault Locked: Data Persistence Granted.");
                else console.warn("⚠️ Persistence denied by browser. Data may be at risk if storage gets full.");
            } catch (e) { console.error("Persistence check failed:", e); }
        }

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
        
        request.onsuccess = () => {
            if (request.result !== undefined) {
                resolve(request.result);
            } else {
                // STRICT ERP LOGIC: IndexedDB Type Fallback! 
                // Prevents old Number IDs from becoming untouchable ghosts when searched with String IDs from HTML.
                if (typeof id === 'string') {
                    const numId = Number(id);
                    if (!isNaN(numId)) {
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
        const request = store.put(data);
        request.onsuccess = () => resolve(data.id || data.firmId);
        request.onerror = () => reject(request.error);
    });
};

const deleteRecordById = async (storeName, id) => {
    try {
        // 1. Fetch the record first to identify linked impacts
        const oldRecord = await getRecordById(storeName, id);
        
        // STRICT ERP LOGIC: Stop ghost deletion! If the record doesn't exist, exit safely.
        if (!oldRecord) return;
        
        // Ensure we use the exact data type from the DB for the physical deletion
        const actualId = oldRecord.id; 
        
        if (oldRecord && (storeName === 'sales' || storeName === 'purchases' || storeName === 'adjustments')) {
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

        // ENTERPRISE UPGRADE: Soft Deletion (Send to Recycle Bin instead of void)
        if (oldRecord && storeName !== 'trash') {
            oldRecord._module = storeName; 
            oldRecord._deletedAt = new Date().toISOString(); 
            await saveRecord('trash', oldRecord); 
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
    if (record.status === 'Open') return; // Drafts do not reverse Stock
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    const items = await getAllRecords('items');
    
    const rowsToProcess = storeName === 'adjustments' ? [record] : (record.items || []);
    
    for (const row of rowsToProcess) {
        const dbItem = items.find(i => String(i.id) === String(row.itemId || row.id));
        if (dbItem) {
            let qty = parseFloat(row.qty) || 0;
            
            let stockGst = parseFloat(dbItem.stockGst);
            if (isNaN(stockGst)) stockGst = parseFloat(dbItem.stock) || 0;
            
            let stockNonGst = parseFloat(dbItem.stockNonGst);
            if (isNaN(stockNonGst)) stockNonGst = 0;
            
            // STRICT ERP LOGIC: Lock base stock back into object so we don't lose the secondary pool!
            dbItem.stockGst = stockGst;
            dbItem.stockNonGst = stockNonGst;
            
            let impact = 0;
            if (storeName === 'sales') {
                impact = isReturn ? -qty : qty;
            } else if (storeName === 'purchases') {
                impact = isReturn ? qty : -qty;
            } else if (storeName === 'adjustments') {
                impact = record.type === 'add' ? -qty : qty; 
            }
            
            let targetPoolIsNonGST = isNonGST;
            if (storeName === 'adjustments') targetPoolIsNonGST = record.pool === 'nongst';
            
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
    if (record.status === 'Open') return; // Drafts do not apply Stock
    const isReturn = record.documentType === 'return';
    const isNonGST = record.invoiceType === 'Non-GST'; 
    const items = await getAllRecords('items');
    
    const rowsToProcess = storeName === 'adjustments' ? [record] : (record.items || []);
    
    for (const row of rowsToProcess) {
        const dbItem = items.find(i => String(i.id) === String(row.itemId || row.id));
        if (dbItem) {
            let qty = parseFloat(row.qty) || 0;
            
            let stockGst = parseFloat(dbItem.stockGst);
            if (isNaN(stockGst)) stockGst = parseFloat(dbItem.stock) || 0;
            
            let stockNonGst = parseFloat(dbItem.stockNonGst);
            if (isNaN(stockNonGst)) stockNonGst = 0;
            
            // STRICT ERP LOGIC: Lock base stock back into object so we don't lose the secondary pool!
            dbItem.stockGst = stockGst;
            dbItem.stockNonGst = stockNonGst;
            
            let impact = 0;
            if (storeName === 'sales') {
                impact = isReturn ? qty : -qty;
            } else if (storeName === 'purchases') {
                impact = isReturn ? -qty : qty;
                
                if (!isReturn && parseFloat(row.rate) > 0) {
                    let discountRatio = 0;
                    const trueSubtotal = (record.items || []).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
                    if (record.discount > 0 && trueSubtotal > 0) {
                        discountRatio = record.discountType === '%' ? (record.discount / 100) : (record.discount / trueSubtotal);
                    }
                    dbItem.buyPrice = parseFloat(row.rate) * (1 - discountRatio);
                }
            } else if (storeName === 'adjustments') {
                impact = record.type === 'add' ? qty : -qty;
            }
            
            let targetPoolIsNonGST = isNonGST;
            if (storeName === 'adjustments') targetPoolIsNonGST = record.pool === 'nongst';
            
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
    const existingRecord = await getRecordById(storeName, data.id);
    
    // STRICT ERP LOGIC: Inherit the exact DB type to prevent string/number cloning!
    if (existingRecord) {
        data.id = existingRecord.id;
    }
    
    const allItems = await getAllRecords('items');
    
    // STRICT ERP LOGIC: Map all IDs to strings to prevent snapshot rollback failures!
    const newDataItems = storeName === 'adjustments' ? [data.itemId] : (data.items || []).map(row => String(row.itemId || row.id));
    const oldDataItems = existingRecord ? (storeName === 'adjustments' ? [existingRecord.itemId] : (existingRecord.items || []).map(row => String(row.itemId || row.id))) : [];
    const allItemIds = [...new Set([...newDataItems, ...oldDataItems].filter(Boolean))];
    
    const itemsSnapshot = allItems.filter(i => allItemIds.includes(String(i.id)));

    try {
        if (existingRecord) {
            await reverseStockImpact(storeName, existingRecord);
            
            const docNo = existingRecord.invoiceNo || existingRecord.poNo || existingRecord.id;
            const partyId = storeName === 'sales' ? existingRecord.customerId : existingRecord.supplierId;
            const newDocNo = data.invoiceNo || data.poNo || data.id; 
            
            if (docNo && partyId) {
                const receipts = await getAllRecords('receipts');
                for (const r of receipts) {
                    if (r.invoiceRef === docNo && r.ledgerId === partyId && r.isAutoGenerated) {
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

        await applyStockImpact(storeName, data);
        await saveRecord(storeName, data);
        
        if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    } catch (error) {
        console.error("CRITICAL DB ERROR: Rolling back stock to prevent corruption...", error);
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
    const rawPurchases = await getAllRecords('purchases');
    rawPurchases.forEach(p => {
        if (p.firmId === firmId && p.supplierId === partyId && p.status !== 'Open') {
            const isReturn = p.documentType === 'return';
            const isNonGST = p.invoiceType === 'Non-GST';
            const docLabel = isReturn ? 'Debit Note' : (isNonGST ? 'Bill of Supply' : 'Purchase Bill');
            const docNo = p.poNo || p.invoiceNo || p.orderNo || String(p.id).slice(-4).toUpperCase();
            
            const safeAmount = Math.abs(parseFloat(p.grandTotal) || 0);
            
            timeline.push({
                id: p.id, date: p.date, desc: `${docLabel} (${docNo})`, 
                amount: safeAmount, isInvoice: !isReturn, impact: isReturn ? -safeAmount : safeAmount
            });
        }
    });
    rawPurchases.length = 0; // Force Garbage Collection

    // 3. Process Receipts, then wipe from memory
    const rawReceipts = await getAllRecords('receipts');
    rawReceipts.forEach(r => {
        if (r.firmId === firmId && r.ledgerId === partyId) {
            const isMoneyIn = r.type === 'in';
            const safeAmount = Math.abs(parseFloat(r.amount) || 0);
            let impact = isCustomer ? (isMoneyIn ? -safeAmount : safeAmount) : (isMoneyIn ? safeAmount : -safeAmount);
            
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
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.id > b.id) ? 1 : -1;
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
        // STRICT ERP LOGIC: Prevent Quadruple Entry by filtering out auto-generated receipts!
        if (r.firmId === firmId && !r.isAutoGenerated) {
            timeline.push({ id: r.id, date: r.date, type: r.type, amount: r.amount, mode: r.mode, desc: `Party: ${r.ledgerName}` });
        }
    });
    rawReceipts.length = 0;

    // 4. Process Expenses & Wipe RAM
    const rawExpenses = await getAllRecords('expenses');
    rawExpenses.forEach(e => {
        if (e.firmId === firmId) {
            // STRICT ERP LOGIC: Audit accurate payment modes instead of forcing 'Cash'
            const mode = e.accountId === 'cash' || !e.accountId ? 'Cash' : 'Bank';
            timeline.push({ id: e.id, date: e.date, type: 'out', amount: parseFloat(e.amount), mode: mode, desc: `Expense: ${e.category}` });
        }
    });
    rawExpenses.length = 0;

    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    
    // FIX: Added 'trash' to the export array so the recycle bin is safely backed up to the cloud
    const stores = ['firms', 'businessProfile', 'counters', 'items', 'ledgers', 'sales', 'purchases', 'receipts', 'expenses', 'accounts', 'adjustments', 'units', 'expenseCategories', 'trash'];
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
    // ==========================================
    // STRICT ERP LOGIC: THE FILE SHIELD
    // ==========================================
    // Mathematically reject PDFs, Images, or random JSON files from other apps!
    // A valid backup MUST be an object and MUST contain core ERP tables.
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        return Promise.reject(new Error("Invalid File Format. Please upload a valid .json backup."));
    }
    if (!parsedData.ledgers && !parsedData.items && !parsedData.sales) {
        return Promise.reject(new Error("File Rejected: This is not a valid SOLLO ERP backup file."));
    }

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
            
            // STRICT ERP LOGIC: Prevent Multi-Company Doomsday Wipe!
            // Only clear the records belonging to the ACTIVE firm, protecting other companies' data!
            if (storeName === 'counters' || storeName === 'units' || storeName === 'expenseCategories') {
                store.clear(); 
                // SAFETY CHECK: Ensure the array actually exists to prevent "o.length" crash
                if (Array.isArray(parsedData[storeName])) {
                    parsedData[storeName].forEach(record => {
                        store.put(record);
                    });
                }
            } else {
                // SAFETY CHECK: Only use the firmId index if the table actually has it!
                if (store.indexNames.contains('firmId')) {
                    const request = store.index('firmId').openKeyCursor(IDBKeyRange.only(activeFirmId));
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            store.delete(cursor.primaryKey);
                            cursor.continue();
                        } else {
                            if (Array.isArray(parsedData[storeName])) {
                                parsedData[storeName].forEach(record => {
                                    if (storeName === 'firms') record.id = activeFirmId;
                                    else record.firmId = activeFirmId;
                                    store.put(record);
                                });
                            }
                        }
                    };
                } else {
                    // For core tables like 'firms' and 'businessProfile', use the primary key directly
                    store.delete(activeFirmId); 
                    if (Array.isArray(parsedData[storeName])) {
                        parsedData[storeName].forEach(record => {
                            if (storeName === 'firms') record.id = activeFirmId;
                            else record.firmId = activeFirmId;
                            store.put(record);
                        });
                    }
                }
            }
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
        
        // STRICT ERP LOGIC: Re-calculate true GROSS subtotal dynamically from rows to fix historical double-discount bugs!
        let trueGrossSubtotal = (s.items || []).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
        let discountAmount = parseFloat(s.discount) || 0;
        if (s.discountType === '%') discountAmount = trueGrossSubtotal * (discountAmount / 100);
        
        let taxable = Math.max(0, trueGrossSubtotal - discountAmount) * mult;
        let tax = (parseFloat(s.totalGst) || 0) * mult;

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
        
        // STRICT ERP LOGIC: Re-calculate true GROSS subtotal dynamically from rows!
        let trueGrossSubtotal = (p.items || []).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
        let discountAmount = parseFloat(p.discount) || 0;
        if (p.discountType === '%') discountAmount = trueGrossSubtotal * (discountAmount / 100);
        
        let taxable = Math.max(0, trueGrossSubtotal - discountAmount) * mult;

        gstr2.totalTaxable += taxable;
        gstr2.totalTax += (parseFloat(p.totalGst) || 0) * mult;
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
    getKhataStatement, getGlobalTimeline, exportDatabase, importDatabase, generateGSTReport
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

