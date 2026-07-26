// worker.js - Enterprise Stock & Velocity Accountant

self.addEventListener('message', function(e) {
    const data = e.data;

    if (data.command === 'CALCULATE_DASHBOARD_INVENTORY') {
        const { items, purchases, sales, firmId } = data;

        let totalValuation = 0;
        let lowStockItems = [];

        // 30-Day Velocity Window
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        (items || []).forEach(i => {
            const rawGst = parseFloat(i.stockGst);
            const rawNon = parseFloat(i.stockNonGst);
            const stockGst = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
            const stockNonGst = isNaN(rawNon) ? 0 : rawNon;
            const totalStock = stockGst + stockNonGst;

            // 1. CAPITAL ENGINE: True Weighted Average Cost (WAC)
            let trueCost = parseFloat(i.buyPrice) || 0;
            let totalBoughtQty = 0;
            let totalBoughtValue = 0;

            (purchases || []).forEach(p => {
                if (p.firmId === firmId && p.status !== 'Open' && p.status !== 'Cancelled') {
                    (p.items || []).forEach(row => {
                        if (String(row.itemId) === String(i.id)) {
                            let q = parseFloat(row.qty) || 0;
                            let r = parseFloat(row.rate) || 0;
                            if (p.documentType === 'return') {
                                totalBoughtQty -= q;
                                totalBoughtValue -= (q * r);
                            } else {
                                totalBoughtQty += q;
                                totalBoughtValue += (q * r);
                            }
                        }
                    });
                }
            });

            if (totalBoughtQty > 0) {
                trueCost = totalBoughtValue / totalBoughtQty;
            }

            totalValuation += (totalStock * trueCost);

            // 2. VELOCITY ENGINE: Calculate precise daily sales
            const minStock = parseFloat(i.minStock) || 0;
            let soldIn30Days = 0;

            (sales || []).forEach(s => {
                if (s.firmId === firmId && s.status !== 'Open' && s.status !== 'Cancelled') {
                    // 🚨 BUG FIX: Timezone-Safe Manual Parsing!
                    let sDate = thirtyDaysAgo; 
                    if (s.date) {
                        const parts = String(s.date).split('-');
                        sDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(s.date);
                    }
                    
                    if (sDate >= thirtyDaysAgo) {
                        (s.items || []).forEach(row => {
                            if (String(row.itemId) === String(i.id)) {
                                soldIn30Days += (s.documentType === 'return' ? -(parseFloat(row.qty)||0) : (parseFloat(row.qty)||0));
                            }
                        });
                    }
                }
            });

            const dailyVelocity = Math.max(0, soldIn30Days / 30);
            const daysRemaining = dailyVelocity > 0 ? (totalStock / dailyVelocity) : 999;

            let isCritical = false;
            let triggerReason = '';
            let urgencyScore = 999;

            // Trigger 1: Hard Limit
            if (minStock > 0 && totalStock <= minStock) {
                isCritical = true;
                triggerReason = `${totalStock} / ${minStock}`;
                urgencyScore = totalStock - minStock;
            } 
            // Trigger 2: Velocity Alert (< 7 days remaining)
            else if (dailyVelocity > 0 && daysRemaining <= 7 && totalStock > 0) {
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

        // 3. Shout the final results back to the Front Desk!
        self.postMessage({
            type: 'DASHBOARD_INVENTORY_RESULT',
            totalValuation: totalValuation,
            lowStockItems: lowStockItems
        });
    }
    
    // --- NEW: RECEIVABLES AGING ENGINE ---
    if (data.command === 'CALCULATE_AGING') {
        const { sales, cashbook, firmId } = data;
        let bucket30 = 0, bucket60 = 0, bucket90 = 0, totalDue = 0;
        const today = new Date();
        
        const dashboardReturnMap = {};
        (sales || []).forEach(d => {
            if (d.firmId === firmId && d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                dashboardReturnMap[d.orderNo] = (dashboardReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
            }
        });

        const paymentMap = {};
        (cashbook || []).forEach(r => {
            if (r.firmId === firmId && r.invoiceRef && r.type === 'in') {
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
            if (sale.firmId === firmId && sale.status !== 'Completed' && sale.status !== 'Open' && sale.status !== 'Cancelled' && sale.documentType !== 'return') {
                const uniqueRefs = [...new Set([sale.orderNo, sale.invoiceNo, sale.id].filter(Boolean).map(String))];
                const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${sale.customerId}_${ref}`] || 0), 0);
                
                const linkedReturns = (sales || []).filter(d => d.firmId === firmId && d.documentType === 'return' && d.status !== 'Open' && d.status !== 'Cancelled' && uniqueRefs.includes(d.orderNo));
                const returnTotal = linkedReturns.reduce((sum, ret) => sum + (parseFloat(ret.grandTotal) || 0), 0);
                
                const balance = (parseFloat(sale.grandTotal) || 0) - paid - returnTotal;

                if (balance > 0.01) {
                    totalDue += balance;
                    const baseDate = sale.shippedDate ? sale.shippedDate : sale.date;
                    
                    // Worker-safe Date Parsing
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
