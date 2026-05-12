// ==========================================
// SOLLO ERP - UTILITY, EXPORT & PDF ENGINE (v6.1 Enterprise)
// ==========================================

const Utils = {
    // ==========================================
    // ENTERPRISE FIX: THE APPLE/IOS DATE SANITIZER
    // ==========================================
    safeDate: (dateString) => {
        if (!dateString) return new Date();
        
        // ENTERPRISE FIX: The Timezone Shift Shield!
        // If the date is already a secure UTC ISO string (ends with Z), let modern browsers parse it natively!
        // Stripping the Z forces the browser into Local Time, shifting midnight invoices into the wrong day and ruining GST returns!
        if (String(dateString).includes('T') && String(dateString).endsWith('Z')) {
            const utcDate = new Date(dateString);
            if (!isNaN(utcDate.getTime())) return utcDate;
        }

        // iPhones physically cannot process YYYY-MM-DD HH:MM:SS. 
        // We MUST convert dashes to slashes (YYYY/MM/DD HH:MM:SS) for Safari to survive!
        let safeString = String(dateString).replace(/-/g, '/');
        // Strip out the 'T' if it's an ISO string so it doesn't break older iOS versions
        safeString = safeString.replace('T', ' ').split('.')[0]; 
        
        const d = new Date(safeString);
        return isNaN(d.getTime()) ? new Date(dateString) : d; // Fallback just in case
    },

    // ==========================================
    // 1. CORE UTILITIES & STRICT MATH
    // ==========================================
    // STRICT ERP LOGIC: Forces a UNIX timestamp to the end of EVERY UUID so Daybook sorting never scrambles same-day transactions!
    // STRICT ERP LOGIC: Added the missing parentheses so Date.now() mathematically attaches to EVERY id!
    generateId: () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sollo-' + Math.random().toString(36).substr(2, 9)) + '-' + Date.now(),

    // 🟢 ENTERPRISE FIX: Native Anti-Freeze Engine
    // Prevents mobile keyboards from crashing by waiting 300ms before filtering huge lists!
    debounce: (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // ==========================================
    // ENTERPRISE UPGRADE: DOM CHUNKING ENGINE
    // ==========================================
    // Prevents the app from freezing when loading massive lists (like 5,000 invoices)
    renderInChunks: (dataArray, renderCallback, onComplete, batchSize = 50) => {
        if (!dataArray || dataArray.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        
        let index = 0;
        const processBatch = () => {
            // Grab the next set of items
            const chunk = dataArray.slice(index, index + batchSize);
            
            // Render this specific batch
            chunk.forEach(item => renderCallback(item));
            index += batchSize;
            
            if (index < dataArray.length) {
                // Enterprise Magic: requestAnimationFrame lets the phone's CPU rest and draw the UI 
                // before locking up the main thread with the next batch!
                requestAnimationFrame(processBatch);
            } else {
                // The entire massive list is finished rendering
                if (onComplete) onComplete();
            }
        };
        
        // Start the engine
        requestAnimationFrame(processBatch);
    },

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
                
                // ENTERPRISE FIX: Prevent infinite loading loops if a user uploads a corrupted file!
                img.onerror = () => resolve(''); 
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width === 0) return resolve(''); // Shield against division by zero
                    
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // ENTERPRISE FIX: Paint a white background first so transparent PNG signatures/logos don't turn black!
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    
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
        // ENTERPRISE FIX: Strip any existing Timezones first, then forcefully lock to Local High Noon!
        const cleanDate = dateString.split('T')[0];
        const safeString = cleanDate + 'T12:00:00';
        
        const d = new Date(safeString);
        if (isNaN(d.getTime())) return dateString; 
        // Converts "2026-03-25" into "25 Mar 2026"
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

        // ENTERPRISE FIX: The "Negative Amount in Words" Breakdown!
        // Credit Notes and Refunds use negative totals. Math.floor(-500) breaks the regex and prints blank words!
        const safeNum = Math.abs(parseFloat(num) || 0);
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
        
        // ENTERPRISE FIX: Increased the timeout to 3000ms so users can actually read AI and Error messages!
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Mobile WebKit safety
        a.click();
        
        // ENTERPRISE FIX: Give mobile download managers 1 second to grab the file before destroying the URL!
        setTimeout(() => {
            URL.revokeObjectURL(url);
            if (a.parentNode) document.body.removeChild(a);
        }, 1000);
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
                    // ENTERPRISE FIX: Added DOM Appending and RAM Garbage Collection to prevent silent download failures and Memory Leaks!
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${documentTitle}.png`;
                    document.body.appendChild(link); // Required for strict mobile browsers
                    link.click();
                    
                    alert("Universal sharing is not supported on this device. The document has been downloaded instead.");
                    
                    // Safely destroy the Base64 Blob from the phone's RAM after 1 second!
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        if (link.parentNode) document.body.removeChild(link);
                    }, 1000);
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
        // ENTERPRISE FIX: Intercept numbers saved with a '0' and convert to standard +91
        if (clean.length === 11 && clean.startsWith('0')) {
            clean = '91' + clean.substring(1);
        } else if (clean.length === 10) {
            clean = '91' + clean; 
        }
        return clean;
    },
    
    shareOverdueReminder: (phone, customerName, balanceAmount, invoiceNo) => {
        if (!phone) return alert("No phone number saved for this customer.");
        const cleanPhone = Utils.formatWhatsAppNumber(phone);
        
        // ENTERPRISE FIX: Injected dynamic URL-encoded text so the user doesn't have to manually type the reminder!
        const message = encodeURIComponent(`Hello ${customerName || 'Customer'},

A payment of ₹${parseFloat(balanceAmount || 0).toFixed(2)} is currently pending for Document No: ${invoiceNo || 'N/A'}.

Please arrange the payment at your earliest convenience. Thank you!`);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
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

            // STRICT ERP LOGIC: Inject exact timestamp to prevent OS-level file overwriting!
            const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            // ENTERPRISE FIX: The Timezone File-Naming Shift!
            // 'toISOString()' converts to UTC. A backup at 2 AM IST will mathematically label the file with yesterday's date!
            const fileName = `SOLLO_Backup_${Utils.getLocalDate()}_${timestamp}.json`;
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
                // STRICT ERP LOGIC: Sanitize hidden keyboard artifacts and line breaks before parsing!
                const cleanStr = jsonStr.trim().replace(/[\u200B-\u200D\uFEFF]/g, ''); 
                const data = JSON.parse(cleanStr);
                
                if (typeof window.importDatabase === 'function') {
                    await window.importDatabase(data);
                    alert("✅ Database restored successfully! Reloading app...");
                    window.location.reload();
                }
            } catch (err) {
                console.error("Restore Parser Error:", err);
                alert("❌ Invalid backup text. Please ensure you copied the exact JSON string without adding any extra spaces.");
            }
        };
    },

    // ==========================================
    // 4. IN-APP INVOICE VIEWER (TRUE PDF UPGRADE)
    // ==========================================
    shareNativePDF: async (elementId, filename, textMsg) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (window.Utils && window.Utils.showToast) window.Utils.showToast("Preparing PDF... ⏳");
        
        try {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: filename,
                    text: textMsg,
                    files: [file]
                });
            } else {
                if (window.Utils && window.Utils.showToast) window.Utils.showToast("Native share not supported on this device. Downloading...");
                html2pdf().set(opt).from(element).save();
            }
        } catch (err) {
            console.error("PDF Share Error:", err);
            alert("Could not share PDF. Please download it instead.");
        }
    },

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
            
            // ENTERPRISE FIX: Absolute Garbage Collection! 
            // Wipe the print area completely so the NEXT receipt or invoice doesn't pull a ghost!
            const printArea = document.getElementById('print-area');
            if (printArea) printArea.innerHTML = '';
            
            // Wipe any lingering viewer overlays to prevent stacking
            document.querySelectorAll('#in-app-pdf-viewer').forEach(el => el.remove());

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
                    if (window.Utils) window.Utils.showToast("Preparing Document...");

                    // THE ULTIMATE FIX: YOU WERE 100% CORRECT!
                    // Sharing as a native Image (PNG) bypasses all the iOS/Android PDF rendering bugs.
                    // We take the flawless Preview image and share it directly to WhatsApp/Email!
                    
                    const res = await fetch(imgSrc);
                    const blob = await res.blob();
                    const imageFilename = filename.replace('.pdf', '.png');
                    const file = new File([blob], imageFilename, { type: 'image/png' });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: imageFilename.replace('.png', ''),
                            files: [file]
                        });
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = imageFilename;
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                            document.body.removeChild(link);
                        }, 1000);
                        alert("Native sharing is blocked by this device. The image has been downloaded to your files instead.");
                    }
                } catch (err) {
                    console.log("Share cancelled or failed", err);
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
        
        // ENTERPRISE FIX: Compile the City, State, and Pincode into a clean string for the PDF!
        const partyLocationStr = [safeParty.city, safeParty.state].filter(Boolean).join(', ') + (safeParty.pincode ? ' - ' + safeParty.pincode : '');
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        
        const partyGst = safeParty.gst ? safeParty.gst.toUpperCase() : '';
        const bizGst = biz && biz.gst ? biz.gst.toUpperCase() : 'N/A';
        
        const isNonGST = doc.invoiceType === 'Non-GST';
        const isReturn = doc.documentType === 'return';
        
        let title = isSales ? 'TAX INVOICE' : 'PURCHASE BILL';
        if (isNonGST && !isReturn) title = isSales ? 'BILL OF SUPPLY' : 'PURCHASE BILL';
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
            // STRICT ERP LOGIC: Completely kill the tax math if this is a Non-GST Bill of Supply!
            const gstPercent = isNonGST ? 0 : (parseFloat(item.gstPercent) || 0);
            
            // STRICT ERP LOGIC: Apply proportional discount BEFORE calculating GST to match UI math!
            const baseAmount = qty * rate;
            const discountedBase = baseAmount - (baseAmount * discountRatio);
            const gstAmount = discountedBase * (gstPercent / 100);
            
            // ENTERPRISE FIX: Enforce strict line-level rounding so printed PDF math exactly matches UI math!
            const roundedDiscountedBase = Math.round(discountedBase * 100) / 100;
            const roundedGst = Math.round(gstAmount * 100) / 100;
            const rowTotal = roundedDiscountedBase + roundedGst;
            
            itemsHtml += `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
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
        // ENTERPRISE FIX: Dynamic UUID prevents the browser from grabbing a ghost PDF!
        const uniquePdfId = 'pdf-invoice-' + Date.now();

        // ENTERPRISE FIX: Changed 'const' to 'let' so the Split-Payment Tracker doesn't crash the engine!
        let html = `
        <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #333; background: #fff; line-height: 1.5; box-sizing: border-box; padding: 40px; position: relative;">
            
            ${biz.logo ? `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; z-index: 0; width: 50%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

            <div style="position: relative; z-index: 1;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f0f0f0; padding-bottom: 25px; margin-bottom: 25px;">
                    <div style="max-width: 50%;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 65px; margin-bottom: 12px;" />` : `<h2 style="font-size: 24px; font-weight: bold; color: #111; margin-bottom: 12px; text-transform: uppercase;">${biz.name || 'Company Name'}</h2>`}
                        ${biz.logo ? `<strong style="font-size: 14px; text-transform: uppercase; color: #111;">${biz.name || 'Company Name'}</strong>` : ''}
                        <div style="color: #666; margin-top: 4px; white-space: pre-wrap; font-size: 11px;">${biz.address || ''}</div>
                        ${bizLocationStr ? `<div style="color: #666; font-size: 11px; margin-top: 2px;">${bizLocationStr}</div>` : ''}
                        <div style="color: #666; font-size: 11px; margin-top: 2px;">Ph: ${biz.phone || ''}</div>
                        ${!isNonGST ? `<div style="margin-top: 6px; font-size: 11px;"><strong style="color:#333;">GSTIN:</strong> ${bizGst}</div>` : ''}
                    </div>
                    <div style="text-align: right; max-width: 45%;">
                        <h1 style="font-size: 32px; font-weight: 300; letter-spacing: 2px; color: #0061a4; margin-bottom: 15px; text-transform: uppercase;">${title}</h1>
                        <table style="width: 100%; text-align: right; font-size: 11px; border: none;">
                            <tr><td style="padding: 3px 0; color: #666;">Document No:</td><td style="padding: 3px 0 3px 15px; font-weight: bold; color: #111; font-size: 13px;">${safeDocNo}</td></tr>
                            <tr><td style="padding: 3px 0; color: #666;">Date:</td><td style="padding: 3px 0 3px 15px; font-weight: bold; color: #111;">${Utils.formatDateDisplay(doc.date)}</td></tr>
                            ${doc.orderNo ? `<tr><td style="padding: 3px 0; color: #666;">Order Ref:</td><td style="padding: 3px 0 3px 15px; font-weight: bold; color: #111;">${doc.orderNo}</td></tr>` : ''}
                            <tr><td style="padding: 3px 0; color: #666;">Dispatch Date:</td><td style="padding: 3px 0 3px 15px; font-weight: bold; color: #111;">${(doc.status === 'Open' || !doc.shippedDate) ? '-' : Utils.formatDateDisplay(doc.shippedDate)}</td></tr>
                        </table>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                    <div style="width: 48%;">
                        <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${isSales ? 'Billed To' : 'Billed By'}</div>
                        <div style="font-size: 14px; font-weight: bold; color: #111; text-transform: uppercase; margin-bottom: 4px;">${partyName}</div>
                        ${partyAddress ? `<div style="color: #666; font-size: 11px; white-space: pre-wrap; margin-bottom: 2px;">${partyAddress}</div>` : ''}
                        ${partyLocationStr ? `<div style="color: #666; font-size: 11px; margin-bottom: 6px;">${partyLocationStr}</div>` : ''}
                        ${!isNonGST && partyGst ? `<div style="font-size: 11px;"><strong style="color:#333;">GSTIN:</strong> ${partyGst}</div>` : ''}
                    </div>
                    <div style="width: 48%;">
                        ${biz.cf1Name && doc.cf1Val || biz.cf2Name && doc.cf2Val || biz.cf3Name && doc.cf3Val ? `
                            <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">Additional Details</div>
                            <table style="width: 100%; font-size: 11px; border: none;">
                                ${biz.cf1Name && doc.cf1Val ? `<tr><td style="padding: 3px 0; color: #666; width: 40%;">${biz.cf1Name}:</td><td style="padding: 3px 0; font-weight: bold; color: #111;">${doc.cf1Val}</td></tr>` : ''}
                                ${biz.cf2Name && doc.cf2Val ? `<tr><td style="padding: 3px 0; color: #666; width: 40%;">${biz.cf2Name}:</td><td style="padding: 3px 0; font-weight: bold; color: #111;">${doc.cf2Val}</td></tr>` : ''}
                                ${biz.cf3Name && doc.cf3Val ? `<tr><td style="padding: 3px 0; color: #666; width: 40%;">${biz.cf3Name}:</td><td style="padding: 3px 0; font-weight: bold; color: #111;">${doc.cf3Val}</td></tr>` : ''}
                            </table>
                        ` : ''}
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: center; font-size: 10px; text-transform: uppercase; color: #555; width: 5%;">#</th>
                            <th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: left; font-size: 10px; text-transform: uppercase; color: #555; width: ${!isNonGST ? '35%' : '45%'};">Description of Goods</th>
                            ${!isNonGST ? `<th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: center; font-size: 10px; text-transform: uppercase; color: #555; width: 10%;">HSN/SAC</th>` : ''}
                            <th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: center; font-size: 10px; text-transform: uppercase; color: #555; width: ${!isNonGST ? '10%' : '15%'};">Qty</th>
                            <th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: right; font-size: 10px; text-transform: uppercase; color: #555; width: ${!isNonGST ? '15%' : '15%'};">Rate</th>
                            ${!isNonGST ? `<th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: center; font-size: 10px; text-transform: uppercase; color: #555; width: 10%;">GST%</th>` : ''}
                            <th style="padding: 10px 8px; background: #f8f9fa; border-bottom: 2px solid #ddd; text-align: right; font-size: 10px; text-transform: uppercase; color: #555; width: ${!isNonGST ? '15%' : '20%'};">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml.replace(/<td style="/g, '<td style="padding: 12px 8px; border-bottom: 1px solid #eee; ')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="width: 55%; padding-right: 20px;">
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Total Amount in Words</span>
                            <strong style="font-size: 11px; color: #111; text-transform: capitalize;">${Utils.numberToWords(parseFloat(doc.grandTotal) || 0)}</strong>
                        </div>
                        ${biz.bankDetails ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                            <span style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Bank Details</span>
                            <div style="font-size: 11px; color: #333; white-space: pre-wrap; line-height: 1.4;">${biz.bankDetails}</div>
                        </div>` : ''}
                        
                        ${biz.upiId ? `
                        <div style="margin-bottom: 15px; display: flex; align-items: center; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #ffffff;">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=upi%3A%2F%2Fpay%3Fpa%3D${biz.upiId}%26pn%3D${encodeURIComponent(biz.name || 'Business')}%26am%3D${parseFloat(doc.grandTotal || 0).toFixed(2)}%26cu%3DINR" style="width: 65px; height: 65px; margin-right: 12px; border-radius: 4px;" />
                            <div>
                                <span style="font-size: 10px; color: #0061a4; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Scan to Pay via UPI</span>
                                <div style="font-size: 11px; color: #333;"><strong>UPI ID:</strong> ${biz.upiId}</div>
                                <div style="font-size: 11px; color: #333;"><strong>Amount:</strong> ₹${parseFloat(doc.grandTotal || 0).toFixed(2)}</div>
                            </div>
                        </div>` : ''}

                    </div>
                    
                    <div style="width: 40%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr><td style="padding: 6px 8px; color: #555;">Subtotal:</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #111;">${rawSubtotal.toFixed(2)}</td></tr>
                            ${discountAmt > 0 ? `<tr><td style="padding: 6px 8px; color: #555;">Discount:</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #dc2626;">-${discountAmt.toFixed(2)}</td></tr>` : ''}
                            ${!isNonGST ? `<tr><td style="padding: 6px 8px; color: #555;">Total GST:</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #111;">${(parseFloat(doc.totalGst) || 0).toFixed(2)}</td></tr>` : ''}
                            ${(parseFloat(doc.freightAmount) || 0) > 0 ? `<tr><td style="padding: 6px 8px; color: #555;">Freight / Extra:</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #111;">${(parseFloat(doc.freightAmount) || 0).toFixed(2)}</td></tr>` : ''}
                            ${Math.abs((parseFloat(doc.grandTotal) || 0) - ((rawSubtotal - discountAmt) + (parseFloat(doc.totalGst) || 0) + (parseFloat(doc.freightAmount) || 0))) > 0.01 ? `<tr><td style="padding: 6px 8px; color: #555;">Round Off:</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #111;">${((parseFloat(doc.grandTotal) || 0) - ((rawSubtotal - discountAmt) + (parseFloat(doc.totalGst) || 0) + (parseFloat(doc.freightAmount) || 0))).toFixed(2)}</td></tr>` : ''}
                            
                            <tr>
                                <td colspan="2" style="padding: 0;">
                                    <div style="display: flex; justify-content: space-between; margin-top: 8px; padding: 12px 8px; background: #f4f6fa; border-top: 2px solid #0061a4; border-radius: 4px;">
                                        <strong style="font-size: 14px; color: #0061a4;">GRAND TOTAL</strong>
                                        <strong style="font-size: 16px; color: #0061a4;">&#8377;${Utils.formatCurrency(parseFloat(doc.grandTotal) || 0)}</strong>
                                    </div>
                                </td>
                            </tr>
                            
                            ${doc.linkedReceipts && doc.linkedReceipts.length > 0 ? doc.linkedReceipts.map(r => `
                                <tr>
                                    <td style="padding: 6px 8px; font-size: 10px; color: #666;">${parseFloat(r.amount) < 0 ? 'Refund / Offset' : 'Paid'} (${r.date}):</td>
                                    <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 10px; color: #16a34a;">${parseFloat(r.amount) < 0 ? '+' : '-'}${Math.abs(parseFloat(r.amount)).toFixed(2)}</td>
                                </tr>
                            `).join('') : ''}
                            
                            ${((parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)) > 0.01 ? `
                            <tr><td style="padding: 8px 8px 0 8px; font-weight: bold; color: #333;">Balance Due:</td><td style="padding: 8px 8px 0 8px; text-align: right; font-weight: bold; color: #dc2626;">&#8377;${Math.max(0, (parseFloat(doc.grandTotal) || 0) - (doc.trueTotalPaid || 0)).toFixed(2)}</td></tr>
                            ` : `
                            <tr><td style="padding: 8px 8px 0 8px; font-weight: bold; color: #333;">Balance Due:</td><td style="padding: 8px 8px 0 8px; text-align: right; font-weight: bold; color: #16a34a;">&#8377;0.00 (PAID)</td></tr>
                            `}
                        </table>
                    </div>
                </div>

                <div style="margin-top: 30px; border-top: 2px solid #f0f0f0; padding-top: 15px; page-break-inside: avoid;">
                    <span style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Terms & Conditions</span>
                    <div style="font-size: 10px; color: #666; white-space: pre-wrap; line-height: 1.4;">${biz.terms ? biz.terms : '1. Subject to local jurisdiction.\n2. Goods once sold cannot be returned.\n3. E.&O.E.'}</div>
                </div>

                <div style="margin-top: 40px; text-align: right; padding-right: 20px; page-break-inside: avoid;">
                    ${biz.signature ? `<img src="${biz.signature}" style="max-height: 60px; margin-bottom: 8px; object-fit: contain; display: inline-block;" />` : '<div style="height: 60px; margin-bottom: 8px;"></div>'}
                    <div style="border-top: 1px solid #ddd; padding-top: 8px; font-size: 11px; font-weight: bold; color: #333; width: 200px; display: inline-block; text-align: center;">Authorized Signatory</div>
                </div>

                <div style="margin-top: 50px; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 15px; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; page-break-inside: avoid;">
                    &mdash; End of Document &mdash;<br>
                    <span style="font-size: 8px; opacity: 0.7; letter-spacing: 0.5px; display: inline-block; margin-top: 4px;">Generatated via SOLLO ERP</span>
                </div>
            </div>
        </div>
        `;
        
        // --- ENTERPRISE UPGRADE: SPLIT PAYMENT / INSTALLMENT TRACKER ---
        let totalPaid = parseFloat(doc.trueTotalPaid) || 0;

        // If the customer has paid even a single rupee, print the Tracker!
        if (totalPaid > 0) {
            const safeGrandTotal = parseFloat(doc.grandTotal) || 0;
            const balanceDue = Math.max(0, safeGrandTotal - totalPaid);
            const paidPercent = safeGrandTotal > 0 ? Math.min(100, (totalPaid / safeGrandTotal) * 100) : 0;
            
            const progressHtml = `
            <div style="margin-top: 16px; margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; background: #f8fafc; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Installment / Payment Status</h4>
                    <span style="font-size: 14px; font-weight: bold; color: #0f172a;">Invoice Total: ${safeGrandTotal.toFixed(2)}</span>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
                    <div style="width: ${paidPercent}%; height: 100%; background: #16a34a;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
                    <span style="color: #16a34a;">Total Paid: ${totalPaid.toFixed(2)}</span>
                    <span style="color: #dc2626;">Balance Due: ${balanceDue.toFixed(2)}</span>
                </div>
            </div>`;

            // ENTERPRISE FIX: The "Orphaned Tracker" PDF Bug!
            // The SaaS upgrade changed the signature block's design, breaking the anchor text!
            // We MUST target the new signature div so the tracker stays cleanly INSIDE the A4 page!
            const anchorIndex = html.lastIndexOf('<div style="margin-top: 40px; text-align: right; padding-right: 20px; page-break-inside: avoid;">');
            if (anchorIndex !== -1) {
                html = html.substring(0, anchorIndex) + progressHtml + html.substring(anchorIndex);
            } else {
                html += progressHtml; 
            }
        }
        // --- END SPLIT PAYMENT ENGINE ---

        // --- ENTERPRISE UPGRADE: DYNAMIC PDF THEME BUILDER ---
        let themedHtml = html;
        const brandColor = localStorage.getItem('sollo_brand_color') || '#000000';
        const pdfFont = localStorage.getItem('sollo_pdf_font') || 'inter';

        // 1. Inject Custom Typography
        if (pdfFont === 'serif') {
            themedHtml = themedHtml.replace(/font-family: Arial, sans-serif;/g, "font-family: 'Times New Roman', Times, serif;");
        } else if (pdfFont === 'mono') {
            themedHtml = themedHtml.replace(/font-family: Arial, sans-serif;/g, "font-family: 'Courier New', Courier, monospace;");
        }

        // 2. Inject Custom Brand Color
        if (brandColor !== '#000000' && brandColor !== '#e5e5e5') {
            themedHtml = themedHtml.replace(/background-color: #e5e5e5;/g, `background-color: ${brandColor}; color: #ffffff; border: 1px solid ${brandColor};`);
            themedHtml = themedHtml.replace(/background: #e5e5e5;/g, `background: ${brandColor}; color: #ffffff; border: 1px solid ${brandColor};`);
            themedHtml = themedHtml.replace(/color: #000;/g, `color: #1a1c1e;`); 
        }

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = themedHtml; 
            setTimeout(() => {
                const safeFilenameDocNo = String(safeDocNo).replace(/[^a-zA-Z0-9_.-]/g, '-');
                Utils.processPDFExport(uniquePdfId, `${title.replace(/ /g, '_')}_${safeFilenameDocNo}.pdf`);
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
        
        // ENTERPRISE FIX: Allow Item Stock Ledgers to bypass Customer/Bank validation!
        let isItem = false;
        if (!party && partyName.toLowerCase().startsWith('item ledger:')) {
            const rawItemName = partyName.replace(/item ledger:\s*/i, '').trim();
            party = window.UI.state.rawData.items.find(i => (i.name || '').trim().toLowerCase() === rawItemName.toLowerCase());
            if (party) {
                isItem = true;
                party.type = 'Item';
            }
        }
        
        if (!party) return alert("Could not identify details for: " + partyName);

        // ENTERPRISE FIX: Added 'window.' prefix to prevent ReferenceError crashes on older devices!
        const biz = (party.firmId) ? await window.getRecordById('businessProfile', party.firmId) || {} : {};
        
        // Harness the timeline that is already populated in the UI to prevent bugs
        const timeline = window.UI.state.rawData.timeline || [];
        
        // STRICT ERP LOGIC: NEVER scrape the UI string for financial math! It strips negative signs and causes legal printing errors!
        let finalBal = 0;
        if (timeline.length > 0) {
            finalBal = timeline[timeline.length - 1].runningBalance || 0;
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
                // ENTERPRISE FIX: The Opening Balance Reversal Trap!
                // Opening balances lack the 'isInvoice' flag, so the old code blindly dumped them into the wrong accounting column!
                // We MUST check 't.id === open-bal' and map it using its mathematical impact!
                if (party.type === 'Customer') {
                    if (t.id === 'open-bal') {
                        if (t.impact > 0) debit = parseFloat(t.amount || 0).toFixed(2);
                        else credit = parseFloat(t.amount || 0).toFixed(2);
                    } else if (t.isInvoice) debit = parseFloat(t.amount || 0).toFixed(2);
                    else credit = parseFloat(t.amount || 0).toFixed(2);
                } else {
                    if (t.id === 'open-bal') {
                        if (t.impact < 0) credit = parseFloat(t.amount || 0).toFixed(2);
                        else debit = parseFloat(t.amount || 0).toFixed(2);
                    } else if (t.isInvoice) credit = parseFloat(t.amount || 0).toFixed(2);
                    else debit = parseFloat(t.amount || 0).toFixed(2);
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
                        <span style="font-size:11px; color:#73777f;">${(t.runningBalance || 0) >= 0 ? 'Dr' : 'Cr'}</span>
                    </td>
                </tr>
            `;
        });

        const safeDocNo = Utils.getLocalDate();
        
        // ENTERPRISE FIX: The "Inverted Supplier Suffix" Trap!
        // Because Purchases are properly stored as Liabilities (Negative), the old logic printed "Advance" when we actually owed money!
        let balSuffix = 'Available';
        if (!isAccount) {
            if (party.type === 'Customer') {
                balSuffix = finalBal > 0 ? 'Dr (Due)' : 'Cr (Advance)';
            } else {
                // For Suppliers: Negative = We owe them (To Pay). Positive = Overpayment (Advance)!
                balSuffix = finalBal < 0 ? 'Cr (To Pay)' : 'Dr (Advance)';
            }
        }
        // ENTERPRISE FIX: Compile the City, State, and Pincode for the Statement PDF!
        const statementBizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        const statementPartyLocationStr = [party.city, party.state].filter(Boolean).join(', ') + (party.pincode ? ' - ' + party.pincode : '');
        
        // ENTERPRISE FIX: Dynamic UUID prevents the browser from grabbing a ghost Statement!
        const uniquePdfId = 'pdf-statement-' + Date.now();

        const html = `
            <div id="${uniquePdfId}" class="a4-document" style="font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; line-height: 1.4; box-sizing: border-box; padding: 10px;">
                
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
                        ${statementBizLocationStr ? `<div style="margin-bottom: 4px;">${statementBizLocationStr}</div>` : ''}
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
                    ${party.address ? `<div style="margin-top: 4px; white-space: pre-wrap;">${party.address}</div>` : ''}
                    ${statementPartyLocationStr ? `<div style="margin-top: 2px;">${statementPartyLocationStr}</div>` : ''}
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
            // STRICT ERP LOGIC: Safely generate the title and target the correct statement wrapper!
            const docTitle = isAccount ? 'Account_Statement' : 'Ledger_Statement';
            setTimeout(() => {
                Utils.processPDFExport(uniquePdfId, `${docTitle}_${safeDocNo}.pdf`);
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
            
            // ENTERPRISE FIX: Passed the firmId to prevent a Full Table Scan RAM Crash during heavy Excel exports!
            const activeFirmId = (typeof app !== 'undefined' && app.state) ? app.state.firmId : 'firm1';
            // ENTERPRISE FIX: Added window. prefix and || [] shield to prevent Excel Engine crashes!
            const ledgers = (await window.getAllRecords('ledgers', 'firmId', activeFirmId).catch(() => [])) || [];
            reportData.rawSales.forEach(s => {
                if (s.invoiceType === 'Non-GST') return;
                let cust = ledgers.find(l => l.id === s.customerId);
                let gstin = cust ? cust.gst : '';
                // CRITICAL TAX FIX: Match db.js! A valid GSTIN must be exactly 15 characters to enter the B2B Sheet!
                if (gstin && gstin.trim().length === 15) {
                    // ENTERPRISE FIX: The Blank B2B Taxable Value Exploit!
                    // 's.subtotal' is often undefined in the database, causing the Excel file to export ₹0.00!
                    // We MUST mathematically extract the exact Net Taxable value by reading the invoice items!
                    let rawSubtotal = 0;
                    (s.items || []).forEach(item => { rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0); });
                    let discountAmt = s.discountType === '%' ? (rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) : (parseFloat(s.discount) || 0);
                    if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
                    let exactTaxable = rawSubtotal - discountAmt;
                    
                    let taxable = exactTaxable * (s.documentType === 'return' ? -1 : 1);
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

        // ENTERPRISE FIX: The AI Date Flipper!
        // HTML forms will crash and stay blank if we don't flip DD/MM/YYYY into YYYY-MM-DD!
        let cleanDate = '';
        if (dateMatch) {
            let parts = dateMatch[1].replace(/[-/.]/g, '-').split('-');
            if (parts[0].length <= 2 && parts[2].length === 4) {
                // If it found DD-MM-YYYY, flip it to YYYY-MM-DD
                cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) {
                // Already YYYY-MM-DD, just pad the zeros
                cleanDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
        }

        const extracted = {
            gstin: gstinMatch ? gstinMatch[1].toUpperCase() : '',
            amount: amountMatch ? amountMatch[1].replace(/[^0-9.]/g, '') : '',
            invNo: invMatch ? invMatch[1].toUpperCase() : '',
            date: cleanDate
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
                if (extracted.date) triggerInput('expense-date', extracted.date);
            } 
            else if (moduleType === 'purchase') {
                if (extracted.invNo) triggerInput('purchase-po-no', extracted.invNo);
                if (extracted.date) triggerInput('purchase-date', extracted.date);
            }
            else if (moduleType === 'sales') {
                if (extracted.invNo) triggerInput('sales-invoice-no', extracted.invNo);
                if (extracted.date) triggerInput('sales-date', extracted.date);
            }
            else if (moduleType === 'product') {
                if (extracted.amount) triggerInput('prod-sell', extracted.amount);
            }
            else if (moduleType === 'ledger') {
                if (extracted.gstin) triggerInput('ledger-gst', extracted.gstin);
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
                        // Original safe logic for Ledgers
                        const target = clonedDoc.getElementById(elementId);
                        if (target) {
                            target.style.width = '800px'; 
                            target.style.minWidth = '800px'; 
                            target.style.maxWidth = '800px';
                            target.style.position = 'absolute';
                            target.style.top = '0';
                            target.style.left = '0';
                            clonedDoc.body.style.width = '800px';
                            clonedDoc.body.style.overflow = 'visible';
                        }
                    }
                },
                // ENTERPRISE SPEED UPGRADE: Aggressive JPEG compression makes the PDF build and share instantly!
                image: { type: 'jpeg', quality: 0.92 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true }
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
// ENTERPRISE UPGRADE: ITEM LEDGER PDF
// ==========================================
window.executeItemLedgerReport = async (itemId, itemName) => {
    // 🟢 ENTERPRISE FIX: Auto-load the PDF library if it isn't loaded yet!
    if (typeof window.html2pdf === 'undefined' && typeof html2pdf === 'undefined') {
        if (window.Utils) window.Utils.showToast("Loading PDF Engine... Please tap Print again in 2 seconds.");
        const s2 = document.createElement('script');
        s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        document.head.appendChild(s2);
        return;
    }

    if (window.Utils) window.Utils.showToast("Generating Stock Ledger PDF...");
    
    const product = await window.getRecordById('items', itemId);
    const openingStock = product ? (parseFloat(product.openingStock) || 0) : 0;

    let timeline = [];
    const sales = await window.getAllRecords('sales');
    sales.forEach(s => {
        if(s.status !== 'Open') {
            (s.items || []).forEach(row => {
                if(row.itemId === itemId) {
                    const isReturn = s.documentType === 'return';
                    const qty = parseFloat(row.qty) || 0;
                    timeline.push({ id: s.id, date: s.date, type: isReturn ? 'Sales Return' : 'Sale', desc: s.customerName || 'Unknown Party', ref: s.invoiceNo || s.orderNo || s.id.slice(-4).toUpperCase(), inQty: isReturn ? qty : 0, outQty: isReturn ? 0 : qty });
                }
            });
        }
    });

    const purchases = await window.getAllRecords('purchases');
    purchases.forEach(p => {
        if(p.status !== 'Open') {
            (p.items || []).forEach(row => {
                if(row.itemId === itemId) {
                    const isReturn = p.documentType === 'return';
                    const qty = parseFloat(row.qty) || 0;
                    timeline.push({ id: p.id, date: p.date, type: isReturn ? 'Purchase Return' : 'Purchase', desc: p.supplierName || 'Unknown Party', ref: p.invoiceNo || p.poNo || p.id.slice(-4).toUpperCase(), inQty: isReturn ? 0 : qty, outQty: isReturn ? qty : 0 });
                }
            });
        }
    });

    const adjustments = await window.getAllRecords('adjustments');
    adjustments.forEach(a => {
        if(a.itemId === itemId) {
            const qty = parseFloat(a.qty) || 0;
            timeline.push({ id: a.id, date: a.date, type: 'Adjustment', desc: a.notes || 'Manual', ref: 'ADJ-' + a.id.slice(-4).toUpperCase(), inQty: a.type === 'add' ? qty : 0, outQty: a.type === 'reduce' ? qty : 0 });
        }
    });

    timeline.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeA - timeB;
    });

    let runningStock = openingStock;
    let rowsHtml = `
        <tr style="background:#f1f3f4; font-weight:bold;">
            <td style="padding:10px; border:1px solid #ddd;" colspan="3">Opening Stock</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">-</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">-</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:right;">${openingStock.toFixed(2)}</td>
        </tr>
    `;

    timeline.forEach(t => {
        runningStock += t.inQty;
        runningStock -= t.outQty;
        rowsHtml += `
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">${t.date}</td>
                <td style="padding:10px; border:1px solid #ddd;">${t.type}</td>
                <td style="padding:10px; border:1px solid #ddd;">${t.desc}<br><small style="color:#666;">Ref: ${t.ref}</small></td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center; color:#146c2e;">${t.inQty > 0 ? t.inQty.toFixed(2) : ''}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center; color:#ba1a1a;">${t.outQty > 0 ? t.outQty.toFixed(2) : ''}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:right; font-weight:bold;">${runningStock.toFixed(2)}</td>
            </tr>
        `;
    });

    const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
    let firmName = "My Business";
    
    // ENTERPRISE FIX: Dynamic UUID prevents the browser from grabbing a ghost Ledger!
    const uniquePdfId = 'pdf-item-ledger-' + Date.now();

    const html = `
        <div id="${uniquePdfId}" style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: #fff;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0061a4; padding-bottom: 20px;">
                <h1 style="margin: 0 0 10px 0; color: #0061a4; font-size: 28px; text-transform: uppercase;">Stock Ledger</h1>
                <h2 style="margin: 0 0 5px 0; font-size: 20px; color: #333;">${itemName}</h2>
                <p style="margin: 0; font-size: 14px; color: #666;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #0061a4; color: #fff; text-align: left;">
                        <th style="padding: 12px 10px; border: 1px solid #004a80; width: 12%;">Date</th>
                        <th style="padding: 12px 10px; border: 1px solid #004a80; width: 16%;">Type</th>
                        <th style="padding: 12px 10px; border: 1px solid #004a80; width: 36%;">Particulars</th>
                        <th style="padding: 12px 10px; border: 1px solid #004a80; text-align: center; width: 12%;">IN (+)</th>
                        <th style="padding: 12px 10px; border: 1px solid #004a80; text-align: center; width: 12%;">OUT (-)</th>
                        <th style="padding: 12px 10px; border: 1px solid #004a80; text-align: right; width: 12%;">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    // ENTERPRISE FIX: Route the HTML into the Universal In-App PDF Viewer instead of forcing a blind download!
    const printArea = document.getElementById('print-area');
    if (printArea) {
        printArea.innerHTML = html;
        setTimeout(() => {
            // ENTERPRISE FIX: The Fatal PDF Freeze Shield!
            // If an item was deleted but remains in historical ledgers, 'itemName' will be undefined.
            // Calling .replace() on undefined instantly crashes the entire app!
            const safeItemName = itemName ? String(itemName) : 'Unknown_Item';
            const safeFilename = `Stock_Ledger_${safeItemName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            window.Utils.processPDFExport(uniquePdfId, safeFilename);
        }, 100);
    }
};

// ==========================================
// NEW CODE: GLOBAL MAP
// ==========================================
// 2. Attach to window so index.html onclick="Utils..." buttons don't break!
window.Utils = Utils; 
