// worker.js - Enterprise Stock & Velocity Accountant (Optimized V3)

const DB_NAME = 'SOLLO_ERP_DB';
const DB_VERSION = 70; // Make sure this perfectly matches the version in db.js!

self.addEventListener('message', async function(e) {
    const data = e.data;

    if (data.command === 'CALCULATE_DASHBOARD_INVENTORY') {
        const firmId = data.firmId;
        
        try {
            // 🚨 ENTERPRISE FIX: Open ONE connection and fetch all 3 stores simultaneously to prevent Deadlocks!
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onsuccess = e => resolve(e.target.result);
                request.onerror = e => reject(request.error);
            });

            const tx = db.transaction(['items', 'purchases', 'sales'], 'readonly');
            
            const fetchStore = (storeName) => new Promise((resolve, reject) => {
                const req = tx.objectStore(storeName).index('firmId').getAll(firmId);
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });

            const [items, purchases, sales] = await Promise.all([
                fetchStore('items'),
                fetchStore('purchases'),
                fetchStore('sales')
            ]);
            
            db.close();

        let totalValuation = 0;
        let lowStockItems = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const purchaseMap = {};
        (purchases || []).forEach(p => {
            if (p.status !== 'Open' && p.status !== 'Cancelled') {
                (p.items || []).forEach(row => {
                    const id = String(row.itemId || row.id);
                    if (!purchaseMap[id]) purchaseMap[id] = { qty: 0, val: 0 };
                    
                    let q = parseFloat(row.qty) || 0;
                    let r = parseFloat(row.rate) || 0;
                    
                    if (p.documentType === 'return') {
                        purchaseMap[id].qty -= q;
                        purchaseMap[id].val -= (q * r);
                    } else {
                        purchaseMap[id].qty += q;
                        purchaseMap[id].val += (q * r);
                    }
                });
            }
        });

        const velocityMap = {};
        (sales || []).forEach(s => {
            if (s.status !== 'Open' && s.status !== 'Cancelled') {
                let sDate = thirtyDaysAgo; 
                if (s.date) {
                    const parts = String(s.date).split('-');
                    sDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(s.date);
                }
                
                if (sDate >= thirtyDaysAgo) {
                    (s.items || []).forEach(row => {
                        const id = String(row.itemId || row.id);
                        if (!velocityMap[id]) velocityMap[id] = 0;
                        velocityMap[id] += (s.documentType === 'return' ? -(parseFloat(row.qty)||0) : (parseFloat(row.qty)||0));
                    });
                }
            }
        });

        (items || []).forEach(i => {
            const rawGst = parseFloat(i.stockGst);
            const rawNon = parseFloat(i.stockNonGst);
            const stockGst = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
            const stockNonGst = isNaN(rawNon) ? 0 : rawNon;
            const totalStock = stockGst + stockNonGst;

            const pData = purchaseMap[String(i.id)] || { qty: 0, val: 0 };
            let trueCost = parseFloat(i.buyPrice) || 0;
            if (pData.qty > 0) {
                trueCost = pData.val / pData.qty;
            }

            totalValuation += (totalStock * trueCost);

            const minStock = parseFloat(i.minStock) || 0;
            const soldIn30Days = velocityMap[String(i.id)] || 0;
            const dailyVelocity = Math.max(0, soldIn30Days / 30);
            const daysRemaining = dailyVelocity > 0 ? (totalStock / dailyVelocity) : 999;

            let isCritical = false;
            let triggerReason = '';
            let urgencyScore = 999;

            if (minStock > 0 && totalStock <= minStock) {
                isCritical = true;
                triggerReason = `${totalStock} / ${minStock}`;
                urgencyScore = totalStock - minStock;
            } else if (dailyVelocity > 0 && daysRemaining <= 7 && totalStock > 0) {
                isCritical = true;
                triggerReason = `${Math.ceil(daysRemaining)} Days Left`;
                urgencyScore = daysRemaining;
            }

            if (isCritical) {
                lowStockItems.push({
                    name: i.name,
                    stock: totalStock,
                    min: minStock,
                    uom: i.uom || 'Pcs',
                    reason: triggerReason,
                    score: urgencyScore
                });
            }
        });

        self.postMessage({
            type: 'DASHBOARD_INVENTORY_RESULT',
            totalValuation: totalValuation,
            lowStockItems: lowStockItems
        });
    }
    
    if (data.command === 'CALCULATE_AGING') {
        const firmId = data.firmId;
        
        // 🚀 Fetch directly from disk!
        const [sales, cashbook] = await Promise.all([
            fetchFromDB('sales', firmId),
            fetchFromDB('receipts', firmId) // The store is called 'receipts', UI references it as cashbook
        ]);

        let bucket30 = 0, bucket60 = 0, bucket90 = 0, totalDue = 0;
        const today = new Date();
        
        const dashboardReturnMap = {};
        (sales || []).forEach(d => {
            if (d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                dashboardReturnMap[d.orderNo] = (dashboardReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
            }
        });

        const paymentMap = {};
        (cashbook || []).forEach(r => {
            if (r.invoiceRef && r.type === 'in') {
                const refs = String(r.invoiceRef).split(',').map(x => x.trim()).filter(Boolean);
                let remainingPayment = parseFloat(r.amount) || 0;
                
                refs.forEach(ref => {
                    const linkedDoc = (sales || []).find(d => String(d.id) === ref || String(d.invoiceNo) === ref || String(d.orderNo) === ref || String(d.id).endsWith(ref));
                    const returned = [linkedDoc?.orderNo, linkedDoc?.invoiceNo, linkedDoc?.id, ref].filter(Boolean).reduce((sum, rx) => sum + (dashboardReturnMap[rx] || 0), 0);
                    let docTotal = linkedDoc ? Math.max(0, (parseFloat(linkedDoc.grandTotal) || 0) - returned) : (parseFloat(r.amount) / refs.length);
                    
                    let applyAmt = Math.min(docTotal, remainingPayment);
                    if (applyAmt > 0) {
                        paymentMap[`${r.ledgerId}_${ref}`] = (paymentMap[`${r.ledgerId}_${ref}`] || 0) + applyAmt;
                        remainingPayment -= applyAmt;
                    }
                });
                if (remainingPayment > 0.01 && refs[0]) {
                    paymentMap[`${r.ledgerId}_${refs[0]}`] = (paymentMap[`${r.ledgerId}_${refs[0]}`] || 0) + remainingPayment;
                }
            }
        });

        (sales || []).forEach(sale => {
            if (sale.status !== 'Completed' && sale.status !== 'Open' && sale.status !== 'Cancelled' && sale.documentType !== 'return') {
                
                const uniqueRefs = [...new Set([sale.orderNo, sale.invoiceNo, sale.id].filter(Boolean).map(String))];
                const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${sale.customerId}_${ref}`] || 0), 0);
                const returnTotal = uniqueRefs.reduce((sum, ref) => sum + (dashboardReturnMap[ref] || 0), 0);
                
                const balance = (parseFloat(sale.grandTotal) || 0) - paid - returnTotal;

                if (balance > 0.01) {
                    totalDue += balance;
                    const baseDate = sale.shippedDate ? sale.shippedDate : sale.date;
                    
                    let invoiceDate = today;
                    if (baseDate) {
                        const parts = String(baseDate).split('-');
                        invoiceDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(baseDate);
                    }
                    
                    const diffTime = today - invoiceDate;
                    if (diffTime >= 0) {
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
                        if (diffDays <= 30) bucket30 += balance;
                        else if (diffDays <= 60) bucket60 += balance;
                        else bucket90 += balance;
                    }
                }
            }
        });

        self.postMessage({
            type: 'AGING_RESULT',
            totalDue, bucket30, bucket60, bucket90
        });
    }
});
