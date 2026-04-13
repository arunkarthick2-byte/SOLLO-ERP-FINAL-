// ==========================================
// SOLLO ERP - UTILITY, EXPORT & PDF ENGINE (v6.1 Enterprise)
// ==========================================

import { getRecordById, getAllRecords, getKhataStatement } from './db.js?v=6.1';

const Utils = {
    // ==========================================
    // 1. CORE UTILITIES & STRICT MATH
    // ==========================================
    generateId: () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sollo-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),

    // --- ENTERPRISE UPGRADE: OFFLINE IMAGE COMPRESSOR ---
    compressImage: (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            // STRICT ERP LOGIC: Prevent fatal crash when editing items with existing images!
            if (typeof file === 'string') {
                if (file.startsWith('data:image')) return resolve(file);
                return resolve('');
            }
            if (!file || !(file instanceof Blob)) return resolve(''); // WebKit safety catch

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
        });
    },

    getLocalDate: () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // --- ENTERPRISE UPGRADE: PROFESSIONAL DATE DISPLAY ---
    formatDateDisplay: (dateString) => {
        if (!dateString) return '';
        // Neutralize Timezone Shift by forcing evaluation at High Noon (12:00:00)
        const safeString = dateString.includes('T') ? dateString : dateString + 'T12:00:00';
        const d = new Date(safeString);
        if (isNaN(d.getTime())) return dateString; 
        // Converts "2026-03-25" into "25 Mar 2026"
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    // --- ENTERPRISE UPGRADE: PERFORMANCE DEBOUNCE ---
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    },

    // --- ENTERPRISE FORMATTING ENGINES ---
    formatCurrency: (amount) => {
        // Formats 100000.00 to 1,00,000.00 automatically
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    numberToWords: (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        const convertGroup = (nStr) => {
            if (nStr.length > 9) return 'Amount too large';
            const n = ('000000000' + nStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n) return '';
            let str = '';
            str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
            str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
            str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
            str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
            str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
            return str.trim();
        };

        const safeNum = parseFloat(num) || 0;
        const rupees = Math.floor(safeNum);
        const paise = Math.round((safeNum - rupees) * 100);

        let result = rupees === 0 ? 'Zero Rupees' : convertGroup(rupees.toString()) + ' Rupees';
        
        if (paise > 0) {
            result += ' and ' + convertGroup(paise.toString()) + ' Paise';
        }
        return result + ' Only';
    },

    // --- NEW CODE: TOAST ENGINE ---
    showToast: (message) => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10); // Trigger animation
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 1000);
    },
    // --- END OF NEW CODE ---

    // --- ENTERPRISE UPGRADE: BULLETPROOF MATH PARSER ---
    safeNumber: (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        // Strips out commas, spaces, currency symbols, and letters so math never crashes
        const cleaned = String(val).replace(/[^0-9.-]+/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    },

    // --- ENTERPRISE UPGRADE: STRICT GSTIN VALIDATOR ---
    validateGSTIN: (gstin) => {
        if (!gstin) return false;
        // Official Indian Govt Regex for GST
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(String(gstin).trim().toUpperCase());
    },

    calculateRowTotal: (qty, rate, gstPercent, discountPercent = 0) => {
        // ENTERPRISE UPGRADE: Safe Numbers + Item-Level Discount processing BEFORE taxes
        let grossAmount = Math.round((Utils.safeNumber(qty) * Utils.safeNumber(rate)) * 100) / 100;
        let discountAmount = Math.round((grossAmount * (Utils.safeNumber(discountPercent) / 100)) * 100) / 100;
        
        let baseAmount = grossAmount - discountAmount;
        let gstAmount = Math.round((baseAmount * (Utils.safeNumber(gstPercent) / 100)) * 100) / 100;
        let finalTotal = Math.round((baseAmount + gstAmount) * 100) / 100;
        
        return { baseAmount, gstAmount, finalTotal, discountAmount, grossAmount };
    },

    // --- ENTERPRISE UPGRADE: REVERSE GST (INCLUSIVE TAX) ---
    calculateReverseGST: (mrp, gstPercent) => {
        // UPGRADE: Replaced basic parseFloat with safeNumber
        let finalTotal = Utils.safeNumber(mrp);
        let taxRate = Utils.safeNumber(gstPercent);
        // Formula: Base = Total / (1 + (GST / 100))
        let baseAmount = Math.round((finalTotal / (1 + (taxRate / 100))) * 100) / 100;
        let gstAmount = Math.round((finalTotal - baseAmount) * 100) / 100;
        return { baseAmount, gstAmount, finalTotal };
    },

    downloadFile: (content, filename, contentType) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    },
    // ==========================================
    // NEW CODE: UNIVERSAL SHARE ENGINE
    // ==========================================
    shareDocumentAsImage: async (elementId, documentTitle) => {
        try {
            const element = document.getElementById(elementId);
            if (!element) {
                alert("Error: Document area not found.");
                return;
            }

            // STRICT ERP LOGIC: Prevent fatal crash if the user clicks Share before the library finishes loading!
            if (typeof html2canvas === 'undefined') {
                alert("Loading Image Engine... Please wait 2 seconds and tap Share again.");
                const s1 = document.createElement('script');
                s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                document.head.appendChild(s1);
                return;
            }

            // 1. Convert the HTML element (like an invoice) into an image
            const canvas = await html2canvas(element, { scale: 2, useCORS: true }); // FIX: Lowered back to 2 to prevent Mobile Out-Of-Memory crashes!
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `${documentTitle}.png`, { type: 'image/png' });

                // 2. Check if the device's browser supports the Universal Share API with files
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: documentTitle,
                        text: `Please find the attached document: ${documentTitle}`,
                        files: [file]
                    });
                } else {
                    // 3. Fallback: If sharing isn't supported (like on older desktop browsers), just download it
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${documentTitle}.png`;
                    link.click();
                    alert("Universal sharing is not supported on this device. The document has been downloaded instead.");
                }
            }, 'image/png');

        } catch (error) {
            console.error("Sharing failed:", error);
            alert("An error occurred while trying to share the document.");
        }
    },
    // ==========================================
    // END OF NEW CODE
    // ==========================================

    formatWhatsAppNumber: (phone) => {
        let clean = String(phone || '').replace(/\D/g, ''); 
        if (clean.length === 10) clean = '91' + clean; 
        return clean;
    },
    
    shareOverdueReminder: (phone, customerName, balanceAmount, invoiceNo) => {
        if (!phone) return alert("No phone number saved for this customer.");
        const cleanPhone = Utils.formatWhatsAppNumber(phone);
        
        // STRICT ERP LOGIC: Removed pre-written text & open in new tab to prevent app crash!
        const whatsappUrl = `https://wa.me/${cleanPhone}`;
        window.open(whatsappUrl, '_blank');
    },

    // ==========================================
    // 3. DATABASE BACKUP (EXPORT/IMPORT) ENGINE
    // ==========================================
    exportData: async () => {
        try {
            if (typeof window.exportDatabase !== 'function') return alert("Database export not ready.");
            if (window.Utils) window.Utils.showToast("Preparing Backup...");
            
            const data = await window.exportDatabase();
            
            // ENTERPRISE FIX: Dynamically stream ALL database tables safely without missing any schemas!
            const blobParts = ['{'];
            const keys = Object.keys(data);
            
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                blobParts.push(`"${key}":[`);
                const arr = data[key] || [];
                for (let j = 0; j < arr.length; j++) {
                    blobParts.push(JSON.stringify(arr[j]));
                    if (j < arr.length - 1) blobParts.push(',');
                }
                blobParts.push(']');
                if (i < keys.length - 1) blobParts.push(',');
            }
            blobParts.push('}');

            const fileName = `SOLLO_Backup_${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob(blobParts, { type: "application/json" });
            const file = new File([blob], fileName, { type: "application/json" });

            // ENTERPRISE FIX: Force direct download to the "Downloads" folder to prevent Share Menu crashes
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // Clean up memory
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 1000);
            
            if (window.Utils) window.Utils.showToast("✅ Backup successfully saved to Downloads!");
        } catch (e) {
            console.error("Database Export Error:", e);
            alert("Database Error: Could not generate export file.");
        }
    },

    importData: async (event) => {
        if (event && event.target && event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (typeof window.importDatabase === 'function') {
                        await window.importDatabase(data);
                        alert("Database imported successfully! Reloading app...");
                        window.location.reload();
                    }
                } catch (err) {
                    alert("Invalid backup file. Make sure it is a valid SOLLO JSON backup.");
                }
            };
            reader.readAsText(file);
            event.target.value = ''; 
            return;
        }

        // STRICT ERP LOGIC: Replaced 'prompt()' with a native HTML text area to prevent the browser from truncating massive database strings!
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;';
        overlay.innerHTML = `
            <div style="background:var(--md-surface, #fff); padding:20px; border-radius:12px; width:100%; max-width:500px; display:flex; flex-direction:column; gap:16px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <h3 style="margin:0; color:var(--md-on-surface, #000); font-family:sans-serif;">Manual Text Restore</h3>
                <p style="margin:0; font-size:14px; color:var(--md-text-muted, #666); font-family:sans-serif;">Paste your entire JSON backup string below.</p>
                <textarea id="restore-textarea" placeholder="Paste data here..." style="width:100%; height:200px; padding:12px; border-radius:8px; border:1px solid #ccc; font-family:monospace; font-size:12px; box-sizing:border-box;"></textarea>
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button id="btn-cancel-restore" style="padding:10px 16px; border:none; background:transparent; color:#ba1a1a; font-weight:bold; cursor:pointer;">Cancel</button>
                    <button id="btn-confirm-restore" style="padding:10px 16px; border:none; background:#0061a4; color:#fff; border-radius:8px; font-weight:bold; cursor:pointer;">Restore Data</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-cancel-restore').onclick = () => document.body.removeChild(overlay);
        document.getElementById('btn-confirm-restore').onclick = async () => {
            const jsonStr = document.getElementById('restore-textarea').value;
            if (!jsonStr) return alert("Please paste the backup text first.");
            try {
                const data = JSON.parse(jsonStr);
                if (typeof window.importDatabase === 'function') {
                    await window.importDatabase(data);
                    alert("✅ Database restored successfully! Reloading app...");
                    window.location.reload();
                }
            } catch (err) {
                alert("❌ Invalid backup text. Please ensure you copied the exact JSON string.");
            }
        };
    },

    // ==========================================
    // 4. IN-APP INVOICE VIEWER (TRUE PDF UPGRADE)
    // ==========================================
    processPDFExport: async (elementId, filename) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (typeof html2canvas === 'undefined' || typeof html2pdf === 'undefined') {
            window.Utils.showToast("Installing True PDF Engine... Please wait 3 seconds and tap Print again.");
            if (typeof html2canvas === 'undefined') {
                const s1 = document.createElement('script');
                s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                document.head.appendChild(s1);
            }
            if (typeof html2pdf === 'undefined') {
                const s2 = document.createElement('script');
                s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                document.head.appendChild(s2);
            }
            return;
        }
        
        try {
            // STRICT ERP LOGIC: Physically lock the DOM to A4 Desktop dimensions BEFORE taking the snapshot!
            const origWidth = element.style.width;
            const origMinWidth = element.style.minWidth;
            const origMaxWidth = element.style.maxWidth;
            
            element.style.width = '800px';
            element.style.minWidth = '800px';
            element.style.maxWidth = '800px';

            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800, // Force engine to render as a desktop screen
                onclone: (clonedDoc) => {
                    const printArea = clonedDoc.getElementById('print-area');
                    if (printArea) {
                        printArea.className = ''; 
                        printArea.style.display = 'block';
                        printArea.style.position = 'relative';
                        printArea.style.visibility = 'visible';
                        printArea.style.width = '800px';
                    }
                }
            });
            
            const imgSrc = canvas.toDataURL('image/png');
            
            // Instantly restore mobile layout behind the scenes
            element.style.width = origWidth;
            element.style.minWidth = origMinWidth;
            element.style.maxWidth = origMaxWidth;

            const viewer = document.createElement('div');
            viewer.id = 'in-app-pdf-viewer';
            viewer.style.position = 'fixed';
            viewer.style.top = '0';
            viewer.style.left = '0';
            viewer.style.width = '100vw';
            viewer.style.height = '100vh';
            viewer.style.backgroundColor = '#e8eaed';
            viewer.style.zIndex = '999999';
            viewer.style.display = 'flex';
            viewer.style.flexDirection = 'column';

            viewer.innerHTML = `
                <div style="background:#0061a4; color:white; padding:16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.2); flex-shrink:0;">
                    <div>
                        <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                        <div style="font-size:12px; opacity:0.9; margin-top:2px;">Share PDF or Print</div>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="btn-print-preview">print</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="btn-share-preview">share</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:28px;" onclick="document.getElementById('in-app-pdf-viewer').remove()">close</span>
                    </div>
                </div>
                <div style="flex:1; overflow-y:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start;">
                    <img src="${imgSrc}" style="max-width:100%; height:auto; box-shadow:0 4px 8px rgba(0,0,0,0.2); border-radius:4px; display:block;" />
                </div>
            `;
            document.body.appendChild(viewer);

            document.getElementById('btn-print-preview').onclick = () => {
                document.getElementById('in-app-pdf-viewer').style.display = 'none';
                window.print();
                setTimeout(() => { document.getElementById('in-app-pdf-viewer').style.display = 'flex'; }, 500);
            };
            
            document.getElementById('btn-share-preview').onclick = async () => {
                try {
                    if (window.Utils) window.Utils.showToast("Generating Print-Ready PDF...");

                    const opt = {
                        margin:       [0.4, 0.4, 0.4, 0.4], 
                        filename:     filename,
                        image:        { type: 'jpeg', quality: 1.0 }, 
                        pagebreak:    { mode: ['css', 'legacy'] }, 
                        html2canvas:  { 
                            scale: 2, 
                            useCORS: true,
                            logging: false, 
                            windowWidth: 800,
                            width: 800,
                            onclone: (clonedDoc) => {
                                // STRICT ERP LOGIC: Physically rip the document out of all mobile bounding boxes!
                                const target = clonedDoc.getElementById(elementId);
                                if (target) {
                                    target.style.width = '800px'; 
                                    target.style.minWidth = '800px'; 
                                    target.style.maxWidth = '800px';
                                    target.style.position = 'absolute';
                                    target.style.top = '0';
                                    target.style.left = '0';
                                    clonedDoc.body.style.width = '800px';
                                    clonedDoc.body.style.overflow = 'visible'; // Destroys the mobile cutoff!
                                }
                            }
                        },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    const pdfBlob = await window.html2pdf().set(opt).from(element).outputPdf('blob');
                    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

                    // Instantly Restore layout
                    element.style.width = origWidth;
                    element.style.minWidth = origMinWidth;
                    element.style.maxWidth = origMaxWidth;

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: filename,
                            files: [file]
                        });
                    } else {
                        const url = URL.createObjectURL(pdfBlob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                            document.body.removeChild(link);
                        }, 1000);
                        alert("Native sharing is blocked by this device. The PDF has been downloaded to your files instead.");
                    }
                } catch (err) {
                    console.log("PDF Share cancelled or failed", err);
                    alert("Sharing was cancelled or is unsupported on this device.");
                }
            };
        } catch (err) {
            console.error("Preview Generation Failed", err);
            alert("Failed to generate preview.");
        }
    },

    // ==========================================
    // 5. PRINT & TEMPLATE ENGINE
    // ==========================================
    generateInvoicePDF: (doc, biz, party, type) => {
        // STRICT ERP LOGIC: Prevent fatal crash on Cash Sales if the party object is undefined!
        const safeParty = party || {};
        const isSales = type === 'sales';
        const partyName = safeParty.name ? safeParty.name : (isSales ? doc.customerName : doc.supplierName);
        const partyAddress = safeParty.address || safeParty.billingAddress || '';
        
        const partyGst = safeParty.gst ? safeParty.gst.toUpperCase() : '';
        const bizGst = biz && biz.gst ? biz.gst.toUpperCase() : 'N/A';
        
        const isNonGST = doc.invoiceType === 'Non-GST';
        const isReturn = doc.documentType === 'return';
        
        let title = isSales ? 'TAX INVOICE' : 'PURCHASE RECORD';
        if (isNonGST && !isReturn) title = isSales ? 'BILL OF SUPPLY' : 'PURCHASE RECORD';
        if (isReturn) title = isSales ? 'CREDIT NOTE' : 'DEBIT NOTE';

        let rawSubtotal = 0;
        (doc.items || []).forEach(item => {
            rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
        });

        let discountAmt = doc.discountType === '%' ? (rawSubtotal * ((parseFloat(doc.discount) || 0) / 100)) : (parseFloat(doc.discount) || 0);
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        const discountRatio = rawSubtotal > 0 ? (discountAmt / rawSubtotal) : 0;

        let itemsHtml = '';
        (doc.items || []).forEach((item, index) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const gstPercent = parseFloat(item.gstPercent) || 0;
            
            // STRICT ERP LOGIC: Apply proportional discount BEFORE calculating GST to match UI math!
            const baseAmount = qty * rate;
            const discountedBase = baseAmount - (baseAmount * discountRatio);
            const gstAmount = discountedBase * (gstPercent / 100);
            const rowTotal = discountedBase + gstAmount;
            
            itemsHtml += `
                <tr>
                    <td style="text-align:center;">${index + 1}</td>
                    <td style="font-weight: bold;">${item.name}</td>
                    ${!isNonGST ? `<td style="text-align:center;">${item.hsn || '-'}</td>` : ''}
                    <td style="text-align:center;">${item.qty} ${item.uom}</td>
                    <td style="text-align:right;">${rate.toFixed(2)}</td>
                    ${!isNonGST ? `<td style="text-align:center;">${gstPercent}%</td>` : ''}
                    <td style="text-align:right; font-weight:bold;">${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        });
        const safeDocNo = doc.invoiceNo || doc.poNo || 'DRAFT';

        const html = `
            <div id="pdf-invoice-wrapper" class="a4-document" style="font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; line-height: 1.4; box-sizing: border-box; padding: 10px;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #pdf-invoice-wrapper * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
                    #pdf-invoice-wrapper table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: auto; border: 1px solid #000; }
                    #pdf-invoice-wrapper th { background-color: #e5e5e5; border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 11px; text-transform: uppercase; }
                    #pdf-invoice-wrapper td { border: 1px solid #000; padding: 6px 4px; font-size: 11px; vertical-align: middle; }
                    #pdf-invoice-wrapper tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    #pdf-invoice-wrapper thead { display: table-header-group; }
                    .border-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
                </style>

                <h2 style="text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; border: 1px solid #000; padding: 6px; background: #e5e5e5;">${title}</h2>

                <div style="display: flex; width: 100%; border: 1px solid #000; margin-bottom: 15px;">
                    <div style="width: 50%; padding: 10px; border-right: 1px solid #000;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 50px; margin-bottom: 8px;" />` : ''}
                        <strong style="font-size: 16px; text-transform: uppercase;">${biz.name || 'Company Name'}</strong>
                        <div style="margin-top: 4px; white-space: pre-wrap;">${biz.address || ''}</div>
                        <div>Ph: ${biz.phone || ''}</div>
                        <div style="margin-top: 4px;"><strong>GSTIN: ${bizGst}</strong></div>
                    </div>
                    <div style="width: 50%; padding: 0; display: flex; flex-direction: column;">
                        <div style="display: flex; border-bottom: 1px solid #000; flex: 1;">
                            <div style="width: 50%; padding: 8px; border-right: 1px solid #000;"><strong>Invoice No:</strong><br><span style="font-size: 14px;">${safeDocNo}</span></div>
                            <div style="width: 50%; padding: 8px;"><strong>Date:</strong><br><span style="font-size: 14px;">${Utils.formatDateDisplay(doc.date)}</span></div>
                        </div>
                        <div style="display: flex; border-bottom: 1px solid #000; flex: 1;">
                            <div style="width: 50%; padding: 8px; border-right: 1px solid #000;"><strong>Order Ref:</strong><br>${doc.orderNo || '-'}</div>
                            <div style="width: 50%; padding: 8px;"><strong>Order Date:</strong><br>${Utils.formatDateDisplay(doc.orderDate) || '-'}</div>
                        </div>
                        <div style="display: flex; flex: 1;">
                            <div style="width: 50%; padding: 8px; border-right: 1px solid #000;"><strong>Dispatch Date:</strong><br>${Utils.formatDateDisplay(doc.shippedDate) || '-'}</div>
                            <div style="width: 50%; padding: 8px;"><strong>Status:</strong><br>${doc.status || '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="border-box">
                    <strong style="text-transform: uppercase; font-size: 11px; background: #e5e5e5; padding: 2px 6px; border: 1px solid #000; display: inline-block; margin-bottom: 6px;">Billed To / Party Details</strong>
                    <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${partyName}</div>
                    ${partyAddress ? `<div style="margin-top: 4px; white-space: pre-wrap;">${partyAddress}</div>` : ''}
                    ${!isNonGST && partyGst ? `<div style="margin-top: 4px;"><strong>GSTIN: ${partyGst}</strong></div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 35%; text-align: left;">Description of Goods</th>
                            ${!isNonGST ? `<th style="width: 10%;">HSN/SAC</th>` : ''}
                            <th style="width: 10%;">Qty</th>
                            <th style="width: 12%; text-align: right;">Rate</th>
                            ${!isNonGST ? `<th style="width: 8%;">GST%</th>` : ''}
                            <th style="width: 15%; text-align: right;">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="display: flex; border: 1px solid #000; page-break-inside: avoid;">
                    <div style="width: 60%; padding: 10px; border-right: 1px solid #000;">
                        <div style="margin-bottom: 12px;">
                            <strong>Total Amount in Words:</strong><br>
                            <span style="text-transform: capitalize; font-size: 11px;">${Utils.numberToWords(parseFloat(doc.grandTotal) || 0)}</span>
                        </div>
                        ${biz.bankDetails ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Bank Details:</strong><br>
                            <span style="white-space: pre-wrap; font-size: 11px;">${biz.bankDetails}</span>
                        </div>` : ''}
                        <div>
                            <strong>Terms & Conditions:</strong><br>
                            <span style="white-space: pre-wrap; font-size: 10px;">${biz.terms ? biz.terms : '1. Subject to local jurisdiction.\\n2. Goods once sold cannot be returned.\\n3. E.&O.E.'}</span>
                        </div>
                    </div>
                    <div style="width: 40%; padding: 0;">
                        <table style="width: 100%; border: none; margin: 0;">
                            <tr><td style="border: none; border-bottom: 1px solid #000; padding: 6px 8px;">Subtotal:</td><td style="border: none; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding: 6px 8px;">${rawSubtotal.toFixed(2)}</td></tr>
                            ${discountAmt > 0 ? `<tr><td style="border: none; border-bottom: 1px solid #000; padding: 6px 8px;">Discount:</td><td style="border: none; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding: 6px 8px;">-${discountAmt.toFixed(2)}</td></tr>` : ''}
                            ${!isNonGST ? `<tr><td style="border: none; border-bottom: 1px solid #000; padding: 6px 8px;">Total GST:</td><td style="border: none; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding: 6px 8px;">${(parseFloat(doc.totalGst) || 0).toFixed(2)}</td></tr>` : ''}
                            ${(parseFloat(doc.freightAmount) || 0) > 0 ? `<tr><td style="border: none; border-bottom: 1px solid #000; padding: 6px 8px;">Freight / Extra Charges:</td><td style="border: none; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding: 6px 8px;">${(parseFloat(doc.freightAmount) || 0).toFixed(2)}</td></tr>` : ''}
                            <tr>
                                <td style="border: none; border-bottom: 1px solid #000; background: #e5e5e5; font-weight: bold; font-size: 14px; padding: 10px 8px;">GRAND TOTAL</td>
                                <td style="border: none; border-bottom: 1px solid #000; background: #e5e5e5; font-weight: bold; font-size: 16px; text-align: right; padding: 10px 8px;">&#8377;${Utils.formatCurrency(parseFloat(doc.grandTotal) || 0)}</td>
                            </tr>
                            ${doc.linkedReceipts && doc.linkedReceipts.length > 0 ? doc.linkedReceipts.map(r => `
                                <tr>
                                    <td style="border: none; border-bottom: 1px dashed #ccc; padding: 4px 8px; font-size: 10px;">Paid (${r.date}):</td>
                                    <td style="border: none; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold; padding: 4px 8px; font-size: 10px;">-${parseFloat(r.amount).toFixed(2)}</td>
                                </tr>
                            `).join('') : ''}
                            ${((parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)) > 0.01 ? `
                            <tr><td style="border: none; padding: 6px 8px; font-weight: bold;">Balance Due:</td><td style="border: none; text-align: right; font-weight: bold; padding: 6px 8px;">&#8377;${Math.max(0, (parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)).toFixed(2)}</td></tr>
                            ` : `
                            <tr><td style="border: none; padding: 6px 8px; font-weight: bold;">Balance Due:</td><td style="border: none; text-align: right; font-weight: bold; padding: 6px 8px;">&#8377;0.00 (PAID)</td></tr>
                            `}
                        </table>
                        <div style="text-align: center; margin-top: 25px; padding: 10px;">
                            ${biz.signature ? `<img src="${biz.signature}" style="max-height: 45px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 45px; margin-bottom: 5px;"></div>'}
                            <div style="border-top: 1px solid #000; padding-top: 4px; font-size: 11px; font-weight: bold; width: 80%; margin: 0 auto;">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // --- ENTERPRISE UPGRADE: PREMIUM PDF THEMES ---
        let themedHtml = html;
        const theme = localStorage.getItem('sollo_invoice_theme') || 'modern';
        
        if (theme === 'classic') {
            // Classic Black & White
            themedHtml = themedHtml.replace(/#0061a4/g, '#000000').replace(/#f0f4f8/g, '#f2f2f2').replace(/#f8fafc/g, '#ffffff');
        } else if (theme === 'elegant') {
            // Dark Slate & Minimalist
            themedHtml = themedHtml.replace(/#0061a4/g, '#2c3e50').replace(/#f0f4f8/g, '#ecf0f1').replace(/#f8fafc/g, '#fdfdfd');
        }
        // --- END OF THEME ENGINE ---

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = themedHtml; // FIX: Pushing the themed HTML instead of the default!
            setTimeout(() => {
                const safeFilenameDocNo = String(safeDocNo).replace(/[^a-zA-Z0-9_.-]/g, '-');
                Utils.processPDFExport('pdf-invoice-wrapper', `${title.replace(/ /g, '_')}_${safeFilenameDocNo}.pdf`);
            }, 100);
        }
    },

    printReceivablesReport: (reportData, grandTotal) => {
        let html = `
            <div id="pdf-rec-wrapper" style="padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1c1e; background: #ffffff;">
                <style>
                    #pdf-rec-wrapper table { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: auto; }
                    #pdf-rec-wrapper tr { page-break-inside: avoid; page-break-after: auto; break-inside: avoid; }
                    #pdf-rec-wrapper thead { display: table-header-group; }
                </style>
                <h1 style="text-align: center; color: #0061a4; text-transform: uppercase;">Receivables Report</h1>
                <p style="text-align: center; color: #73777f;">Generated on: ${Utils.getLocalDate()}</p>
                <table>
                    <thead>
                        <tr style="background-color: #f3f3f3;">
                            <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Customer Name</th>
                            <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Contact</th>
                            <th style="border: 1px solid #ccc; padding: 10px; text-align: right;">Outstanding Balance (&#8377;)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        reportData.forEach(row => {
            html += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px; font-weight: bold;">${row.name}</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">${row.phone || 'N/A'}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: right; color: #ba1a1a; font-weight: bold;">${parseFloat(row.balance || 0).toFixed(2)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 20px;">
                    <h2 style="color: #0061a4;">Total Market Receivables: &#8377;${parseFloat(grandTotal || 0).toFixed(2)}</h2>
                </div>
            </div>
        `;
        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
            setTimeout(() => {
                Utils.processPDFExport('pdf-rec-wrapper', `Receivables_${Utils.getLocalDate()}.pdf`);
            }, 100);
        }
    },

    downloadStatementPDF: async () => {
        const nameEl = document.getElementById('report-party-name');
        const balEl = document.getElementById('report-party-balance');
        if (!nameEl) return alert("Report data not found.");

        // FIX 1: Trim invisible spaces to prevent match failures
        const partyName = nameEl.innerText.trim();
        let isAccount = false;
        
        // SAFEGUARD: Case-insensitive search 
        // STRICT ERP LOGIC: Added 'window.' prefix to prevent ES6 Module ReferenceError Crash!
        let party = window.UI.state.rawData.ledgers.find(l => (l.name || '').trim().toLowerCase() === partyName.toLowerCase());
        
        // Check if this is a Bank Account/Cash Drawer/UPI instead of a Ledger Party
        if (!party) {
            party = window.UI.state.rawData.accounts.find(a => (a.name || '').trim().toLowerCase() === partyName.toLowerCase());
            // Make Cash Drawer detection bulletproof
            if (!party && partyName.toLowerCase().includes('cash')) {
                party = { id: 'cash', name: 'Cash Drawer', type: 'Account', firmId: typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1' };
            }
            if (party) isAccount = true;
        }
        
        if (!party) return alert("Could not identify details for: " + partyName);

        const biz = (party.firmId) ? await getRecordById('businessProfile', party.firmId) || {} : {};
        
        // Harness the timeline that is already populated in the UI to prevent bugs
        const timeline = window.UI.state.rawData.timeline || [];
        
        let finalBal = 0;
        if(balEl) {
            const balMatch = balEl.innerText.replace(/,/g, '').match(/[\d.]+/);
            if(balMatch) finalBal = parseFloat(balMatch[0]);
        }

        // FIX 2: Safely calculate Opening Balance from the timeline to prevent silent crashes!
        let openingBal = 0;
        const openEntry = timeline.find(t => t.id === 'open-bal');
        if (openEntry) openingBal = openEntry.impact || openEntry.amount || 0;
        
        let tableRows = '';
        timeline.forEach(t => {
            let debit = '';
            let credit = '';
            
            if (isAccount) {
                if (t.impact > 0) debit = Math.abs(t.impact).toFixed(2);
                else credit = Math.abs(t.impact).toFixed(2);
            } else {
                if (party.type === 'Customer') {
                    if (t.isInvoice) debit = t.amount.toFixed(2);
                    else credit = t.amount.toFixed(2);
                } else {
                    if (t.isInvoice) credit = t.amount.toFixed(2);
                    else debit = t.amount.toFixed(2);
                }
            }

            tableRows += `
                <tr>
                    <td style="text-align:center;">${t.date}</td>
                    <td style="font-weight: 500;">
                        ${t.desc || '-'} 
                        ${t.partyName && t.partyName !== 'Unknown' ? `<br><small style="color:#1a1c1e; font-weight:bold;">Party: ${t.partyName}</small>` : ''}
                        ${t.ref ? `<br><small style="color:#73777f; font-weight:normal;">Ref: ${t.ref}</small>` : ''}
                    </td>
                    <td style="text-align:right; color:#ba1a1a;">${debit ? '\u20B9' + debit : ''}</td>
                    <td style="text-align:right; color:#146c2e;">${credit ? '\u20B9' + credit : ''}</td>
                    <td style="text-align:right; font-weight:bold; color:#1a1c1e;">
                        \u20B9${Math.abs(t.runningBalance || 0).toFixed(2)} 
                        <span style="font-size:11px; color:#73777f;">${(t.runningBalance || 0) > 0 ? (party.type === 'Customer' ? 'Dr' : 'Cr') : (party.type === 'Customer' ? 'Cr' : 'Dr')}</span>
                    </td>
                </tr>
            `;
        });

        const safeDocNo = Utils.getLocalDate();
        const balSuffix = isAccount ? 'Available' : (finalBal > 0 ? (party.type === 'Customer' ? 'Dr (Due)' : 'Cr (To Pay)') : (party.type === 'Customer' ? 'Cr (Advance)' : 'Dr (Advance)'));

        const html = `
            <div id="pdf-statement-wrapper" class="a4-document" style="font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; line-height: 1.4; box-sizing: border-box; padding: 10px;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #pdf-statement-wrapper * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
                    #pdf-statement-wrapper table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: auto; border: 1px solid #000; }
                    #pdf-statement-wrapper th { background-color: #e5e5e5; border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 11px; text-transform: uppercase; }
                    #pdf-statement-wrapper td { border: 1px solid #000; padding: 6px 4px; font-size: 11px; vertical-align: middle; }
                    #pdf-statement-wrapper tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    #pdf-statement-wrapper thead { display: table-header-group; }
                    .border-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
                </style>

                <h2 style="text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; border: 1px solid #000; padding: 6px; background: #e5e5e5;">${isAccount ? 'ACCOUNT STATEMENT' : 'LEDGER STATEMENT'}</h2>

                <div style="display: flex; width: 100%; border: 1px solid #000; margin-bottom: 15px;">
                    <div style="width: 50%; padding: 10px; border-right: 1px solid #000;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 50px; margin-bottom: 8px;" />` : ''}
                        <strong style="font-size: 16px; text-transform: uppercase;">${biz.name || 'Company Name'}</strong>
                        <div style="margin-top: 4px; white-space: pre-wrap;">${biz.address || ''}</div>
                        <div>Ph: ${biz.phone || ''}</div>
                    </div>
                    <div style="width: 50%; padding: 0; display: flex; flex-direction: column;">
                        <div style="display: flex; border-bottom: 1px solid #000; flex: 1;">
                            <div style="width: 100%; padding: 8px;"><strong>Date Generated:</strong><br><span style="font-size: 14px;">${Utils.getLocalDate()}</span></div>
                        </div>
                        <div style="display: flex; flex: 1;">
                            <div style="width: 100%; padding: 8px; background: #e5e5e5;">
                                <strong style="text-transform: uppercase;">Closing Balance:</strong><br>
                                <span style="font-size: 18px; font-weight: bold;">₹${Math.abs(finalBal).toFixed(2)} ${balSuffix}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="border-box">
                    <strong style="text-transform: uppercase; font-size: 11px; background: #e5e5e5; padding: 2px 6px; border: 1px solid #000; display: inline-block; margin-bottom: 6px;">${isAccount ? 'ACCOUNT DETAILS' : 'PARTY DETAILS'}</strong>
                    <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${party.name}</div>
                    ${party.phone ? `<div style="margin-top: 4px;">Ph: ${party.phone}</div>` : ''}
                    ${party.gst ? `<div style="margin-top: 4px;"><strong>GSTIN: ${party.gst.toUpperCase()}</strong></div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">Date</th>
                            <th style="width: 43%; text-align: left;">Particulars / Voucher Type</th>
                            <th style="width: 15%; text-align: right;">Debit (Dr)</th>
                            <th style="width: 15%; text-align: right;">Credit (Cr)</th>
                            <th style="width: 15%; text-align: right;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="padding:20px; text-align:center;">No transactions found.</td></tr>'}
                    </tbody>
                </table>
                
                <div class="avoid-break" style="margin-top: 25px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
                    <div style="width: 200px; text-align: center;">
                        ${biz.signature ? `<img src="${biz.signature}" style="max-height: 45px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 45px; margin-bottom: 5px;"></div>'}
                        <div style="border-top: 1px solid #000; padding-top: 4px; font-size: 11px; font-weight: bold;">Authorized Signatory</div>
                    </div>
                </div>
            </div>
        `;
        
        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
            setTimeout(() => {
                Utils.processPDFExport('pdf-receipt-wrapper', `${title.replace(/ /g, '_')}_${safeDocNo}.pdf`);
            }, 100);
        }
    },

    // --- ENTERPRISE UPGRADE: TRUE EXCEL (.XLSX) EXPORTER ---
    exportGSTExcel: async (reportData) => {
        try {
            if (typeof XLSX === 'undefined') return alert("Excel Engine loading... Please try again in 2 seconds.");

            const wb = XLSX.utils.book_new();

            // SHEET 1: Summary Data
            const summaryData = [
                ["SOLLO ERP - MONTHLY GST REPORT"],
                ["Month", reportData.month],
                [],
                ["GSTR-3B SUMMARY"],
                ["Description", "Taxable Value", "Tax Amount"],
                ["Total Sales (Output Tax)", reportData.gstr1.totalTaxable, reportData.gstr1.totalTax],
                ["Total Purchases (Input Tax / ITC)", reportData.gstr2.totalTaxable, reportData.gstr2.totalTax],
                ["NET GST PAYABLE TO GOVT", "", reportData.gstr3b.netPayable],
                [],
                ["GSTR-1 (SALES) BREAKDOWN"],
                ["Category", "Taxable Value", "Tax Amount"],
                ["B2B Sales (Registered)", reportData.gstr1.b2bTaxable, reportData.gstr1.b2bTax],
                ["B2C Sales (Unregistered)", reportData.gstr1.b2cTaxable, reportData.gstr1.b2cTax]
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // SHEET 2: B2B Detailed Sales for CA Portal
            const b2bData = [
                ["Date", "Invoice No", "Customer Name", "Customer GSTIN", "Taxable Value", "GST Amount", "Total Invoice Value"]
            ];
            
            const ledgers = await getAllRecords('ledgers');
            reportData.rawSales.forEach(s => {
                if (s.invoiceType === 'Non-GST') return;
                let cust = ledgers.find(l => l.id === s.customerId);
                let gstin = cust ? cust.gst : '';
                if (gstin && gstin.trim() !== '') {
                    // STRICT ERP LOGIC: Prevent NaN values in Excel from legacy invoices
                    let taxable = (parseFloat(s.subtotal) || 0) * (s.documentType === 'return' ? -1 : 1);
                    let tax = (parseFloat(s.totalGst) || 0) * (s.documentType === 'return' ? -1 : 1);
                    let total = (parseFloat(s.grandTotal) || 0) * (s.documentType === 'return' ? -1 : 1);
                    b2bData.push([s.date, s.invoiceNo, s.customerName || '', gstin.toUpperCase(), taxable, tax, total]);
                }
            });
            const wsB2B = XLSX.utils.aoa_to_sheet(b2bData);
            XLSX.utils.book_append_sheet(wb, wsB2B, "B2B Sales");

            // Generate and Download Excel File
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const file = new File([blob], `GST_Report_${reportData.month}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: "SOLLO GST Excel", text: "Here is your Excel GST Report.", files: [file] });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a); // Mobile WebKit safety
                a.click();
                
                // STRICT ERP LOGIC: Give Android 1 second to intercept the download before destroying the memory!
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 1000);
            }
            if (window.Utils) window.Utils.showToast("✅ Excel Report Generated!");
        } catch (e) {
            console.error(e);
            alert("Excel Export failed.");
        }
    },

    exportArrayToExcel: async (dataArray, filename) => {
        if (!dataArray || !dataArray.length) return Utils.showToast("No data to export!");
        if (typeof XLSX === 'undefined') return alert("Excel Engine loading... Please try again.");

        // Convert JSON to Excel Sheet
        const ws = XLSX.utils.json_to_sheet(dataArray);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const file = new File([blob], `${filename}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: filename, files: [file] });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a); // Mobile WebKit safety
            a.click();
            
            // STRICT ERP LOGIC: Prevent Android "Download Failed" Crash
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 1000);
        }
    },

    // --- LEGACY BRIDGES (Prevents your existing HTML buttons from breaking!) ---
    exportGSTCSV: (data) => Utils.exportGSTExcel(data),
    exportArrayToCSV: (data, name) => Utils.exportArrayToExcel(data, name), // <--- ADDED COMMA HERE

    // ==========================================
    // ENTERPRISE AI: UNIVERSAL DOCUMENT SCANNER
    // ==========================================
    startAIScanner: async (moduleType) => {
        if (typeof Tesseract === 'undefined') {
            return alert("AI Engine is loading. Please check your internet connection.");
        }

        // 1. Create an invisible file input that triggers Camera or Gallery!
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // FIX: Removed the 'capture' attribute so Chrome is forced to show the "Camera vs Gallery" menu!

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (window.Utils) window.Utils.showToast("🤖 AI is reading the document... Please wait.");

            try {
                // 1. Compress image to make AI processing much faster
                const compressedImage = await Utils.compressImage(file, 1200, 0.7);

                // 2. ENTERPRISE FIX: Apply OCR Pre-Processing (High-Contrast Grayscale)
                if (window.Utils) window.Utils.showToast("Enhancing document clarity...");
                const enhancedImage = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        
                        // Boost contrast by 50% to make faded receipt text completely black
                        const contrast = 1.5; 
                        const intercept = 128 * (1 - contrast);
                        
                        for (let i = 0; i < data.length; i += 4) {
                            // Convert to Grayscale
                            const grayscale = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
                            // Apply Contrast
                            let finalColor = (grayscale * contrast) + intercept;
                            if (finalColor > 255) finalColor = 255;
                            if (finalColor < 0) finalColor = 0;
                            // Set R, G, B to the new high-contrast pixel
                            data[i] = data[i+1] = data[i+2] = finalColor; 
                        }
                        
                        ctx.putImageData(imageData, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.9));
                    };
                    img.src = compressedImage;
                });

                // 3. Run the OCR Engine on the crystal clear image!
                const result = await Tesseract.recognize(enhancedImage, 'eng', {
                    logger: m => console.log("AI Progress:", m)
                });

                const text = result.data.text;
                Utils.processAIText(text, moduleType);

            } catch (err) {
                console.error("AI Scan Failed:", err);
                alert("AI Engine failed to read the image. Please try a clearer photo.");
            }
        };
        
        input.click(); // Open the camera/gallery
    },

    processAIText: (text, moduleType) => {
        // 2. Regex Pattern Matching to hunt down Enterprise Data
        const gstinMatch = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
        const amountMatch = text.match(/(?:total|amount|grand|net|payable|pay|sum)[\s:.-]*([₹$€£]?\s*[\d,]+\.\d{2})/i);
        const invMatch = text.match(/(?:inv|invoice|bill|receipt|ref|no|po)[\s:.-]*([A-Z0-9-/]+)/i);
        const dateMatch = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);

        const extracted = {
            gstin: gstinMatch ? gstinMatch[1].toUpperCase() : '',
            amount: amountMatch ? amountMatch[1].replace(/[^0-9.]/g, '') : '',
            invNo: invMatch ? invMatch[1].toUpperCase() : '',
            date: dateMatch ? dateMatch[1].replace(/\./g, '-') : ''
        };

        // 3. THE REVIEW STEP: Alert the user with what the AI found
        let msg = "🤖 AI Scan Complete! Please verify:\n\n";
        if (extracted.invNo) msg += `Document No: ${extracted.invNo}\n`;
        if (extracted.amount) msg += `Total Amount: ₹${extracted.amount}\n`;
        if (extracted.gstin) msg += `GSTIN: ${extracted.gstin}\n`;
        if (extracted.date) msg += `Date Found: ${extracted.date}\n`;
        msg += "\n(The app will now auto-fill these values into the form.)";

        alert(msg);

        // 4. Safe Auto-Fill Logic (With Event Dispatchers)
        try {
            // Helper function to inject value AND trigger the app's calculation listeners
            const triggerInput = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            // ENTERPRISE FIX: Mapped the AI outputs to your exact index.html form IDs!
            if (moduleType === 'expense') {
                if (extracted.amount) triggerInput('exp-amount', extracted.amount);
                if (extracted.invNo) triggerInput('expense-no', extracted.invNo);
            } 
            else if (moduleType === 'purchase') {
                if (extracted.invNo) triggerInput('purchase-po-no', extracted.invNo);
            }
            else if (moduleType === 'sales') {
                if (extracted.invNo) triggerInput('sales-invoice-no', extracted.invNo);
            }
            else if (moduleType === 'product') {
                if (extracted.amount) triggerInput('prod-sell', extracted.amount);
            }
            if (window.Utils) window.Utils.showToast("✅ Auto-Fill Applied! Please verify data before saving.");
        } catch (e) {
            console.log("Auto-fill safely skipped.", e);
        }
    }, // <-- CRITICAL COMMA ADDED HERE

    // ==========================================
    // STRICT ERP LOGIC: NATIVE WEB SHARE API ENGINE
    // ==========================================
    sharePDF: async (elementId, filename, shareText = "Here is your document.") => {
        try {
            if (typeof html2pdf === 'undefined' || typeof html2canvas === 'undefined') {
                window.Utils.showToast("⏳ Installing Share Engine... Please tap Share again in 3 seconds.");
                if (typeof html2canvas === 'undefined') {
                    const s1 = document.createElement('script');
                    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                    document.head.appendChild(s1);
                }
                const s2 = document.createElement('script');
                s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                document.head.appendChild(s2);
                return;
            }

            const el = document.getElementById(elementId);
            if (!el) return;
            
            window.Utils.showToast("⏳ Preparing PDF for Print...");

            const opt = {
                margin: [0.4, 0.4, 0.4, 0.4],
                filename: filename,
                image: { type: 'jpeg', quality: 1.0 },
                pagebreak: { mode: ['css', 'legacy'] },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false, 
                    windowWidth: 800,
                    width: 800,
                    onclone: (clonedDoc) => {
                        // STRICT ERP LOGIC: Physically rip the document out of all mobile bounding boxes!
                        const target = clonedDoc.getElementById(elementId);
                        if (target) {
                            target.style.width = '800px'; 
                            target.style.minWidth = '800px'; 
                            target.style.maxWidth = '800px';
                            target.style.position = 'absolute';
                            target.style.top = '0';
                            target.style.left = '0';
                            clonedDoc.body.style.width = '800px';
                            clonedDoc.body.style.overflow = 'visible'; // Destroys the mobile cutoff!
                        }
                    }
                },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            const pdfBlob = await window.html2pdf().set(opt).from(el).outputPdf('blob');
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: filename.replace('.pdf', ''),
                    text: shareText,
                    files: [file]
                });
            } else {
                window.Utils.showToast("⚠️ Direct share not supported. Downloading instead...");
                window.html2pdf().set(opt).from(el).save();
            }
        } catch (err) {
            console.error("Share API Error:", err);
            window.Utils.showToast("❌ Share cancelled or failed.");
        }
    }
}; // <--- THIS CLOSES THE UTILS OBJECT

// ==========================================
// NEW CODE: ES MODULE EXPORT & GLOBAL MAP
// ==========================================
// 1. Export the module so app.js can import it safely
export default Utils; 

// 2. Attach to window so index.html onclick="Utils..." buttons don't break!
window.Utils = Utils; 
// ==========================================
// ENTERPRISE UPGRADE: DEBOUNCE ENGINE
// Prevents keyboard lag during live search
// ==========================================
window.Utils.debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};
