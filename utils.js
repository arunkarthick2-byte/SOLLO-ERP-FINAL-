// ==========================================
// SOLLO ERP - UTILITY, EXPORT & PDF ENGINE (v5.2 Enterprise)
// ==========================================

import { getRecordById, getAllRecords, getKhataStatement } from './db.js?v=83';

const Utils = {
    // ==========================================
    // 1. CORE UTILITIES & STRICT MATH
    // ==========================================
    generateId: () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sollo-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),

    // --- ENTERPRISE UPGRADE: OFFLINE IMAGE COMPRESSOR ---
    compressImage: (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve) => {
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
        const message = `🚨 *Payment Reminder* 🚨\n\nDear ${customerName},\nThis is a gentle reminder that a balance of *\u20B9${parseFloat(balanceAmount).toFixed(2)}* is currently overdue against Invoice *#${invoiceNo}*.\n\nPlease clear the dues at your earliest convenience to avoid any interruptions.\n\nThank you!`;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.location.href = whatsappUrl;
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

        // WEBINTOAPP CLIPBOARD FALLBACK
        const jsonStr = prompt("WEBINTOAPP RESTORE:\nSince your app blocks file downloads, you likely backed up your data as Text.\n\nPlease PASTE your backup text here to restore it:");
        if (jsonStr) {
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
        }
    },

    // ==========================================
    // 4. IN-APP INVOICE VIEWER (TRUE PDF UPGRADE)
    // ==========================================
    processPDFExport: async (elementId, filename) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Load BOTH the preview engine and the true PDF engine
        if (typeof html2canvas === 'undefined' || typeof html2pdf === 'undefined') {
            alert("Installing True PDF Engine... Please wait 3 seconds and tap Print again.");
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
            // Keep html2canvas for the visual on-screen preview
            const canvas = await html2canvas(element, { 
                // CRITICAL FIX: Lowered scale from 4 to 2 (Retina Display quality, massive CPU boost)
                scale: 2, 
                useCORS: true,
                logging: false, // Prevents background console lag
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const printArea = clonedDoc.getElementById('print-area');
                    if (printArea) {
                        printArea.className = ''; 
                        printArea.style.display = 'block';
                        printArea.style.position = 'relative';
                        printArea.style.visibility = 'visible';
                    }
                }
            });
            
            const imgSrc = canvas.toDataURL('image/png');

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

            // Print Button
            document.getElementById('btn-print-preview').onclick = () => {
                document.getElementById('in-app-pdf-viewer').style.display = 'none';
                window.print();
                setTimeout(() => { document.getElementById('in-app-pdf-viewer').style.display = 'flex'; }, 500);
            };
            
            // NEW: TRUE PDF SHARE ENGINE
            document.getElementById('btn-share-preview').onclick = async () => {
                try {
                    if (window.Utils) window.Utils.showToast("Generating PDF File...");
                    
                    // We generate the PDF directly from the invisible #print-area
                    const printArea = document.getElementById('print-area');
                    if (!printArea) return alert("Document data lost. Please close and tap print again.");

                    const opt = {
                        /* ENTERPRISE FIX: Added physical 0.4-inch margins so text never touches the paper edge! */
                        margin:       [0.4, 0.4, 0.4, 0.4], 
                        filename:     filename,
                        /* UPGRADE: Max image quality for crisp logos */
                        image:        { type: 'jpeg', quality: 1.0 }, 
                        /* ENTERPRISE FIX: Forces the PDF to jump to Page 2 instead of slicing rows in half! */
                        pagebreak:    { mode: ['css', 'legacy'] }, 
                        html2canvas:  { 
                            /* UPGRADE: Increased scale to 3 for Retina-quality crispness */
                            scale: 3, 
                            useCORS: true,
                            letterRendering: true, /* Smoothes out small fonts */
                            logging: false, 
                            onclone: (clonedDoc) => {
                                const pa = clonedDoc.getElementById('print-area');
                                if (pa) {
                                    pa.style.display = 'block';
                                    pa.style.position = 'relative';
                                    pa.style.visibility = 'visible';
                                }
                            }
                        },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    // CRITICAL FIX: Use 'element' instead of 'printArea', and use outputPdf('blob')
                    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
                    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: filename,
                            files: [file]
                        });
                    } else {
                        // Fallback: Force Download if sharing is blocked
                        const url = URL.createObjectURL(pdfBlob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = filename;
                        link.click();
                        URL.revokeObjectURL(url);
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
        } finally {
            // Do NOT clear the print-area here anymore, because html2pdf needs it when the user clicks share!
        }
    },

    // ==========================================
    // 5. PRINT & TEMPLATE ENGINE
    // ==========================================
    generateInvoicePDF: (doc, biz, party, type) => {
        const isSales = type === 'sales';
        const partyName = (party && party.name) ? party.name : (isSales ? doc.customerName : doc.supplierName);
        const partyAddress = party ? (party.address || '') : '';
        
        const partyGst = party && party.gst ? party.gst.toUpperCase() : '';
        const bizGst = biz && biz.gst ? biz.gst.toUpperCase() : 'N/A';
        
        const isNonGST = doc.invoiceType === 'Non-GST';
        const isReturn = doc.documentType === 'return';
        
        let title = isSales ? 'TAX INVOICE' : 'PURCHASE RECORD';
        if (isNonGST && !isReturn) title = isSales ? 'BILL OF SUPPLY' : 'PURCHASE RECORD';
        if (isReturn) title = isSales ? 'CREDIT NOTE' : 'DEBIT NOTE';

        let itemsHtml = '';
        let rawSubtotal = 0;
        
        (doc.items || []).forEach((item, index) => {
            const rowTotal = Utils.calculateRowTotal(item.qty, item.rate, item.gstPercent).finalTotal;
            rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            
            itemsHtml += `
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${index + 1}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-weight: 500; color: #1a1c1e;">${item.name}</td>
                    ${!isNonGST ? `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${item.hsn || '-'}</td>` : ''}
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${item.qty} ${item.uom}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:right;">${parseFloat(item.rate).toFixed(2)}</td>
                    ${!isNonGST ? `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${item.gstPercent}%</td>` : ''}
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align:right; font-weight:bold; color: #1a1c1e;">${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        });

        let discountAmt = doc.discountType === '%' ? (rawSubtotal * ((parseFloat(doc.discount) || 0) / 100)) : (parseFloat(doc.discount) || 0);
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        const safeDocNo = doc.invoiceNo || doc.poNo || 'DRAFT';

        // NEW: Calculate CGST and SGST split beautifully
        const totalGstValue = parseFloat(doc.totalGst) || 0;
        const halfGstValue = (totalGstValue / 2).toFixed(2);

        const html = `
            <div id="pdf-invoice-wrapper" class="a4-document" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; position: relative; background: #ffffff; overflow: hidden; color: #2d3748;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #pdf-invoice-wrapper * { position: relative; z-index: 1; }
                    #pdf-invoice-wrapper table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
                    #pdf-invoice-wrapper th { background-color: #f0f4f8; color: #0061a4; text-transform: uppercase; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; border-bottom: 2px solid #0061a4; padding: 10px 8px; }
                    #pdf-invoice-wrapper td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; color: #2d3748; }
                    /* ENTERPRISE FIX: Added !important tags to physically block rows from cutting in half */
                    #pdf-invoice-wrapper tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    #pdf-invoice-wrapper thead { display: table-header-group; }
                </style>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; margin-bottom: 25px; border-bottom: 4px solid #f0f4f8;">
                    <div style="display: flex; align-items: center; gap: 15px; max-width: 60%;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 70px; border-radius: 4px;" />` : ''}
                        <div>
                            <h1 style="margin: 0 0 4px 0; font-size: 24px; color: #1a202c; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">${biz.name || 'Company Name'}</h1>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">${biz.address || ''}</p>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">Ph: ${biz.phone || ''} &nbsp;|&nbsp; <strong style="color:#0061a4;">GSTIN: ${bizGst}</strong></p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0 0 5px 0; font-size: 28px; color: #0061a4; letter-spacing: 2px; text-transform: uppercase; font-weight: 300;">${title}</h2>
                        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #4a5568;"># ${safeDocNo}</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                    <div style="width: 48%; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0061a4;">
                        <p style="margin: 0 0 8px 0; font-size: 10px; color: #718096; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #1a202c;">${partyName}</p>
                        ${partyAddress ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #4a5568; white-space: pre-wrap; line-height: 1.4;">${partyAddress}</p>` : ''}
                        ${!isNonGST && partyGst ? `<p style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold; color: #0061a4;">GSTIN: ${partyGst}</p>` : ''}
                    </div>
                    <div style="width: 45%;">
                        <table style="width: 100%; font-size: 11px; margin-bottom:0; border: none;">
                            <tr><td style="color: #718096; padding: 4px 0; border:none; font-weight: bold;">Invoice Date:</td><td style="font-weight: bold; text-align:right; padding: 4px 0; border:none; color: #1a202c;">${Utils.formatDateDisplay(doc.date)}</td></tr>
                            ${doc.orderNo ? `<tr><td style="color: #718096; padding: 4px 0; border:none; font-weight: bold;">Order Ref:</td><td style="font-weight: bold; text-align:right; padding: 4px 0; border:none; color: #1a202c;">${doc.orderNo}</td></tr>` : ''}
                            ${doc.shippedDate ? `<tr><td style="color: #718096; padding: 4px 0; border:none; font-weight: bold;">Dispatch Date:</td><td style="font-weight: bold; text-align:right; padding: 4px 0; border:none; color: #1a202c;">${Utils.formatDateDisplay(doc.shippedDate)}</td></tr>` : ''}
                            <tr><td style="color: #718096; padding: 4px 0; border:none; font-weight: bold;">Status:</td><td style="font-weight: bold; text-align:right; padding: 4px 0; border:none; color: #0061a4;">${doc.status}</td></tr>
                        </table>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align:center; width: 5%; border-top-left-radius: 4px;">#</th>
                            <th style="text-align:left; width: 35%;">Item Description</th>
                            ${!isNonGST ? `<th style="text-align:center; width: 10%;">HSN</th>` : ''}
                            <th style="text-align:center; width: 10%;">Qty</th>
                            <th style="text-align:right; width: 15%;">Rate</th>
                            ${!isNonGST ? `<th style="text-align:center; width: 10%;">GST</th>` : ''}
                            <th style="text-align:right; width: 15%; border-top-right-radius: 4px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="avoid-break" style="display: flex; justify-content: space-between; align-items: flex-start; page-break-inside: avoid; margin-top: 15px;">
                    <div style="width: 45%; font-size: 10px; color: #718096; line-height: 1.5;">
                        ${biz.bankDetails ? `
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #2d3748; font-size: 11px; text-transform: uppercase;">Bank Details</strong><br>
                            <span style="white-space: pre-wrap;">${biz.bankDetails}</span>
                        </div>` : ''}
                        <div>
                            <strong style="color: #2d3748; text-transform: uppercase;">Terms & Conditions:</strong><br>
                            <span style="white-space: pre-wrap;">${biz.terms ? biz.terms : '1. Subject to local jurisdiction.\\n2. This is a computer-generated document.'}</span>
                        </div>
                    </div>

                    <div style="width: 50%;">
                        <table style="width: 100%; border: none; font-size: 12px;">
                            <tr><td style="padding: 6px 8px; color: #4a5568; border:none;">Subtotal:</td><td style="padding: 6px 8px; text-align:right; font-weight:bold; color:#1a202c; border:none;">&#8377;${rawSubtotal.toFixed(2)}</td></tr>
                            ${discountAmt > 0 ? `<tr><td style="padding: 6px 8px; color: #4a5568; border:none;">Discount:</td><td style="padding: 6px 8px; text-align:right; font-weight:bold; color:#e53e3e; border:none;">-&#8377;${discountAmt.toFixed(2)}</td></tr>` : ''}
                            
                            ${!isNonGST && totalGstValue > 0 ? `
                                <tr><td style="padding: 4px 8px; color: #4a5568; border:none; font-size: 10px;">CGST:</td><td style="padding: 4px 8px; text-align:right; font-weight:bold; color:#1a202c; border:none; font-size: 10px;">&#8377;${halfGstValue}</td></tr>
                                <tr><td style="padding: 4px 8px; color: #4a5568; border:none; font-size: 10px;">SGST:</td><td style="padding: 4px 8px; text-align:right; font-weight:bold; color:#1a202c; border:none; font-size: 10px;">&#8377;${halfGstValue}</td></tr>
                            ` : ''}
                            
                            ${(parseFloat(doc.freightAmount) || 0) > 0 ? `<tr><td style="padding: 6px 8px; color: #4a5568; border:none;">Freight / Extra:</td><td style="padding: 6px 8px; text-align:right; font-weight:bold; color:#1a202c; border:none;">&#8377;${(parseFloat(doc.freightAmount) || 0).toFixed(2)}</td></tr>` : ''}
                            
                            <tr><td colspan="2" style="padding: 0; border: none;"><div style="background-color: #0061a4; color: white; border-radius: 6px; margin-top: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight:bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</span>
                                <span style="font-size: 18px; font-weight:bold;">&#8377;${Utils.formatCurrency(parseFloat(doc.grandTotal) || 0)}</span>
                            </div></td></tr>
                            
                            ${doc.linkedReceipts && doc.linkedReceipts.length > 0 ? doc.linkedReceipts.map(r => `
                                <tr>
                                    <td style="padding: 8px 8px 4px; color: #2f855a; border:none; font-size: 11px;">Paid (${r.date}):</td>
                                    <td style="padding: 8px 8px 4px; text-align:right; font-weight:bold; color:#2f855a; border:none; font-size: 12px;">-&#8377;${parseFloat(r.amount).toFixed(2)}</td>
                                </tr>
                            `).join('') : ''}
                            
                            ${((parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)) > 0.01 ? `
                            <tr><td style="padding: 8px 8px; font-weight:bold; font-size: 12px; color: #e53e3e; border:none;">Balance Due:</td><td style="padding: 8px 8px; text-align:right; font-size: 14px; font-weight:bold; color: #e53e3e; border:none;">&#8377;${Math.max(0, (parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)).toFixed(2)}</td></tr>
                            ` : `
                            <tr><td style="padding: 8px 8px; font-weight:bold; font-size: 12px; color: #2f855a; border:none;">Balance Due:</td><td style="padding: 8px 8px; text-align:right; font-size: 14px; font-weight:bold; color: #2f855a; border:none;">&#8377;0.00 (PAID)</td></tr>
                            `}
                        </table>
                    </div>
                </div>

                <div class="avoid-break" style="margin-top: 15px; border-top: 1px dashed #cbd5e0; padding-top: 15px; page-break-inside: avoid;">
                    <p style="margin: 0; font-size: 11px; color: #4a5568;"><strong>Amount in Words:</strong> <span style="text-transform: capitalize; color: #1a202c;">${Utils.numberToWords(parseFloat(doc.grandTotal) || 0)}</span></p>
                </div>

                <div class="avoid-break" style="margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
                    <div style="width: 200px; text-align: center;">
                        ${biz.signature ? `<img src="${biz.signature}" style="max-height: 50px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 50px; margin-bottom: 5px;"></div>'}
                        <div style="border-top: 1px solid #cbd5e0; padding-top: 5px; font-weight: bold; font-size: 11px; color: #2d3748;">Authorized Signatory</div>
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
        let party = UI.state.rawData.ledgers.find(l => (l.name || '').trim().toLowerCase() === partyName.toLowerCase());
        
        // Check if this is a Bank Account/Cash Drawer/UPI instead of a Ledger Party
        if (!party) {
            party = UI.state.rawData.accounts.find(a => (a.name || '').trim().toLowerCase() === partyName.toLowerCase());
            // Make Cash Drawer detection bulletproof
            if (!party && partyName.toLowerCase().includes('cash')) {
                party = { id: 'cash', name: 'Cash Drawer', type: 'Account', firmId: typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1' };
            }
            if (party) isAccount = true;
        }
        
        if (!party) return alert("Could not identify details for: " + partyName);

        const biz = (party.firmId) ? await getRecordById('businessProfile', party.firmId) || {} : {};
        
        // Harness the timeline that is already populated in the UI to prevent bugs
        const timeline = UI.state.rawData.timeline || [];
        
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
            <div id="pdf-statement-wrapper" class="a4-document" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; position: relative; background: #ffffff; overflow: hidden; color: #2d3748;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #pdf-statement-wrapper * { position: relative; z-index: 1; }
                    #pdf-statement-wrapper table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
                    #pdf-statement-wrapper th { background-color: #f0f4f8; color: #0061a4; text-transform: uppercase; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; border-bottom: 2px solid #0061a4; padding: 10px 8px; }
                    #pdf-statement-wrapper td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; color: #2d3748; }
                    #pdf-statement-wrapper tr { page-break-inside: avoid; page-break-after: auto; break-inside: avoid; }
                    #pdf-statement-wrapper thead { display: table-header-group; }
                </style>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; margin-bottom: 25px; border-bottom: 4px solid #f0f4f8;">
                    <div style="display: flex; align-items: center; gap: 15px; max-width: 60%;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 70px; border-radius: 4px;" />` : ''}
                        <div>
                            <h1 style="margin: 0 0 4px 0; font-size: 24px; color: #1a202c; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">${biz.name || 'Company Name'}</h1>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">${biz.address || ''}</p>
                            <p style="margin: 2px 0; font-size: 11px; color: #718096;">Ph: ${biz.phone || ''}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0 0 5px 0; font-size: 24px; color: #0061a4; letter-spacing: 1px; text-transform: uppercase; font-weight: 300;">${isAccount ? 'Account Statement' : 'Ledger Statement'}</h2>
                        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #4a5568;">Date: ${Utils.getLocalDate()}</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                    <div style="width: 48%; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0061a4;">
                        <p style="margin: 0 0 8px 0; font-size: 10px; color: #718096; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${isAccount ? 'Account Details' : 'Party Details'}</p>
                        <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: bold; color: #1a202c;">${party.name}</p>
                        ${party.phone ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #4a5568;">Ph: ${party.phone}</p>` : ''}
                        ${party.gst ? `<p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #0061a4;">GSTIN: ${party.gst.toUpperCase()}</p>` : ''}
                    </div>
                    <div style="width: 45%; display: flex; flex-direction: column; justify-content: center;">
                        <div style="background: ${isAccount ? (finalBal >= 0 ? '#f0fdf4' : '#fff5f5') : (finalBal > 0 ? '#fff5f5' : '#f0fdf4')}; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid ${isAccount ? (finalBal >= 0 ? '#c6f6d5' : '#fed7d7') : (finalBal > 0 ? '#fed7d7' : '#c6f6d5')};">
                            <p style="margin: 0 0 5px 0; font-size: 11px; color: #718096; text-transform: uppercase; font-weight: bold;">Closing Balance</p>
                            <h3 style="margin: 0; font-size: 24px; color: ${isAccount ? (finalBal >= 0 ? '#2f855a' : '#e53e3e') : (finalBal > 0 ? '#e53e3e' : '#2f855a')};">\u20B9${Math.abs(finalBal).toFixed(2)} <span style="font-size:12px; font-weight: normal;">${balSuffix}</span></h3>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align:center; width: 12%; border-top-left-radius: 4px;">Date</th>
                            <th style="text-align:left; width: 43%;">Particulars / Voucher Type</th>
                            <th style="text-align:right; width: 15%;">Debit (Dr)</th>
                            <th style="text-align:right; width: 15%;">Credit (Cr)</th>
                            <th style="text-align:right; width: 15%; border-top-right-radius: 4px;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="padding:20px; text-align:center; color:#718096; border:none;">No transactions found.</td></tr>'}
                    </tbody>
                </table>
                
                <div class="avoid-break" style="margin-top: 40px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
                    <div style="width: 200px; text-align: center;">
                        ${biz.signature ? `<img src="${biz.signature}" style="max-height: 50px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 50px; margin-bottom: 5px;"></div>'}
                        <div style="border-top: 1px solid #cbd5e0; padding-top: 5px; font-weight: bold; font-size: 11px; color: #2d3748;">Authorized Signatory</div>
                    </div>
                </div>
            </div>
        `;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
            setTimeout(() => {
                Utils.processPDFExport('pdf-statement-wrapper', `Account_Statement_${party.name.replace(/\s+/g, '_')}_${safeDocNo}.pdf`);
            }, 100);
        }
    },

    generateReceiptPDF: async (receiptId) => {
        const receipt = await getRecordById('receipts', receiptId);
        if (!receipt) return alert("Receipt not found. Please save it first.");
        
        const biz = await getRecordById('businessProfile', receipt.firmId) || {};
        
        const isMoneyIn = receipt.type === 'in';
        const title = isMoneyIn ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER';
        const safeDocNo = receipt.receiptNo || String(receipt.id).substring(0, 12).toUpperCase();
        
        // NEW: Translate Multiple Invoices into readable names for the PDF
        let invoiceRefDisplay = '';
        if (receipt.invoiceRef) {
            const refs = String(receipt.invoiceRef).split(',').map(r => r.trim());
            const store = isMoneyIn ? 'sales' : 'purchases';
            const allDocs = await getAllRecords(store);
            
            const displayNames = refs.map(ref => {
                // FIX: Check ALL cross-linked ID references (including orderNo) so the PDF can translate them!
                const doc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref);
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
                        <div style="background-color: #0061a4; color: white; display: inline-block; padding: 10px 24px; border-radius: 8px; margin-bottom: 10px;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 800;">\u20B9${Utils.formatCurrency(parseFloat(receipt.amount) || 0)}</h1>
                        </div>
                        <p style="margin: 0; font-size: 12px; color: #4a5568;"><strong>In Words:</strong> <span style="text-transform: capitalize;">${Utils.numberToWords(parseFloat(receipt.amount) || 0)}</span></p>
                    </div>

                    <table style="width: 100%; font-size: 13px; border-collapse: collapse; border: none;">
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; width: 35%; font-weight: bold;">Date:</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #1a202c;">${Utils.formatDateDisplay(receipt.date)}</td></tr>
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">${isMoneyIn ? 'Received From:' : 'Paid To:'}</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #0061a4; font-size: 15px;">${receipt.ledgerName}</td></tr>
                        <tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">Payment Mode:</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #1a202c;">${receipt.mode || 'Cash'} ${receipt.ref ? `(Ref: ${receipt.ref})` : ''}</td></tr>
                        ${receipt.desc ? `<tr><td style="padding: 12px 10px; color: #718096; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">Particulars:</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: 1px dashed #e2e8f0; color: #1a202c;">${receipt.desc}</td></tr>` : ''}
                        ${invoiceRefDisplay ? `<tr><td style="padding: 12px 10px; color: #718096; border-bottom: none; font-weight: bold;">Settled Invoice(s):</td><td style="padding: 12px 10px; font-weight: bold; text-align: right; border-bottom: none; color: #1a202c;">${invoiceRefDisplay}</td></tr>` : ''}
                    </table>
                </div>
                
                <div style="text-align: center; position: relative; z-index: 1; margin-bottom: 30px;">${balanceText}</div>
                
                <div class="avoid-break" style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; position: relative; z-index: 1;">
                    <div style="font-size: 11px; color: #718096;">
                        <p style="margin:0;">* This is a computer generated document.</p>
                    </div>
                    <div style="width: 200px; text-align: center;">
                        ${biz.signature ? `<img src="${biz.signature}" style="max-height: 50px; margin-bottom: 5px; object-fit: contain;" />` : '<div style="height: 50px; margin-bottom: 5px;"></div>'}
                        <div style="border-top: 1px solid #cbd5e0; padding-top: 5px; font-weight: bold; font-size: 11px; color: #2d3748;">Authorized Signatory</div>
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
            printArea.innerHTML = themedHtml; // FIX: Push themed HTML!
            setTimeout(() => {
                const safeFilenameDocNo = String(safeDocNo).replace(/[^a-zA-Z0-9_.-]/g, '-');
                Utils.processPDFExport('pdf-receipt-wrapper', `${title.replace(/ /g, '_')}_${safeFilenameDocNo}.pdf`);
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
                    let taxable = parseFloat(s.subtotal) * (s.documentType === 'return' ? -1 : 1);
                    let tax = parseFloat(s.totalGst) * (s.documentType === 'return' ? -1 : 1);
                    let total = parseFloat(s.grandTotal) * (s.documentType === 'return' ? -1 : 1);
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
                a.click();
                URL.revokeObjectURL(url);
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
            a.click();
            URL.revokeObjectURL(url);
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
    },

    // ==========================================
    // 6. GST EXPORT ENGINE (For the Accountant)
    // ==========================================
    exportGSTCSV: (report) => {
        let csvContent = "SOLLO ERP - MONTHLY GST REPORT\n\n";
        csvContent += `Report Month:,${report.month}\n\n`;

        csvContent += "--- GSTR-3B (NET SUMMARY) ---\n";
        csvContent += `Total Output Tax (Sales),Rs. ${parseFloat(report.gstr3b.outputTax).toFixed(2)}\n`;
        csvContent += `Total Input Tax (Purchases),Rs. ${parseFloat(report.gstr3b.inputTax).toFixed(2)}\n`;
        csvContent += `Net Payable to Govt,Rs. ${parseFloat(report.gstr3b.netPayable).toFixed(2)}\n\n`;

        csvContent += "--- GSTR-1 (SALES BREAKDOWN) ---\n";
        csvContent += "Type,Taxable Value,Tax Amount\n";
        csvContent += `B2B (Registered),${parseFloat(report.gstr1.b2bTaxable).toFixed(2)},${parseFloat(report.gstr1.b2bTax).toFixed(2)}\n`;
        csvContent += `B2C (Unregistered),${parseFloat(report.gstr1.b2cTaxable).toFixed(2)},${parseFloat(report.gstr1.b2cTax).toFixed(2)}\n\n`;

        csvContent += "--- B2B SALES INVOICE REGISTER ---\n";
        csvContent += "Date,Invoice No,Customer Name,GSTIN,Taxable Value,CGST,SGST,Total Invoice Value\n";
        
        if (report.rawSales) {
            report.rawSales.forEach(inv => {
                // Ignore Drafts and strictly ignore "Non-GST" (UnAccount) bills!
                if (inv.invoiceType === 'B2B' && inv.status !== 'Open') {
                    const totalValue = parseFloat(inv.grandTotal) || 0;
                    const totalTax = parseFloat(inv.totalGst) || 0;
                    const taxable = (totalValue - totalTax).toFixed(2);
                    const halfGst = (totalTax / 2).toFixed(2);
                    
                    const customer = window.UI && window.UI.state && window.UI.state.rawData ? window.UI.state.rawData.ledgers.find(l => l.id === inv.customerId) : null;
                    const gstin = customer && customer.gst ? customer.gst : 'N/A';
                    
                    csvContent += `"${inv.date}","${inv.invoiceNo}","${inv.customerName}","${gstin}",${taxable},${halfGst},${halfGst},${totalValue.toFixed(2)}\n`;
                }
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `GST_Report_${report.month}.csv`, { type: 'text/csv' });

        // If on mobile, open the native Share menu (WhatsApp, Email, etc.)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ title: `GST Report - ${report.month}`, files: [file] }).catch(err => console.log("Share skipped", err));
        } else {
            // If on PC, automatically download the file
            Utils.downloadFile(csvContent, file.name, 'text/csv;charset=utf-8;');
        }
        Utils.showToast("GST Report Exported! 📊");
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
