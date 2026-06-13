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

    // --- ENTERPRISE UPGRADE: OFFLINE IMAGE COMPRESSOR (OFF-MAIN-THREAD) ---
    compressImage: async (file, maxWidth = 800, quality = 0.7) => {
        // STRICT ERP LOGIC: Prevent fatal crash when editing items with existing images!
        if (typeof file === 'string') return file.startsWith('data:image') ? file : '';
        if (!file || !(file instanceof Blob)) return '';

        try {
            // 🚨 ENTERPRISE UPGRADE: createImageBitmap & OffscreenCanvas move heavy pixel math to the GPU!
            // This guarantees the UI, scrolling, and typing NEVER freeze while crunching 4K photos.
            const bitmap = await createImageBitmap(file);
            let width = bitmap.width;
            let height = bitmap.height;

            if (width === 0) return ''; 
            
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            if (typeof OffscreenCanvas !== 'undefined') {
                const offscreen = new OffscreenCanvas(width, height);
                const ctx = offscreen.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: quality });
                
                return new Promise(res => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result);
                    reader.readAsDataURL(blob);
                });
            } else {
                // Failsafe for older iOS versions that don't have OffscreenCanvas yet
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                return canvas.toDataURL('image/jpeg', quality);
            }
        } catch (e) {
            console.warn("Image Compression Engine Failed:", e);
            return '';
        }
    },

    getLocalDate: () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // --- ENTERPRISE UPGRADE: PROFESSIONAL DATE DISPLAY (DD/MM/YYYY) ---
    formatDateDisplay: (dateString) => {
        if (!dateString) return '';
        const cleanDate = String(dateString).split('T')[0];
        
        // ENTERPRISE FIX: Route the display date through our Apple-Safe engine!
        const d = Utils.safeDate(cleanDate + 'T12:00:00');
        
        if (isNaN(d.getTime())) return dateString; 
        
        // 🚨 CRITICAL FIX: Force strict DD/MM/YYYY format across the entire ERP
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    },

    // --- ENTERPRISE FORMATTING ENGINES ---
    formatCurrency: (amount) => {
        // 🚨 ENTERPRISE FIX: Prevent NaN crashes! Safely strip commas before formatting!
        const cleanAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cleanAmount || 0);
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
        // 🚨 CRITICAL FIX: safeNumber() prevents "1,50,000" from evaluating as "1" and printing "One Rupee Only"!
        const safeNum = Math.abs(Utils.safeNumber(num));
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

    // --- ENTERPRISE UPGRADE: XSS SECURITY SHIELD ---
    // Sanitizes all text going in and out of the database to prevent Javascript Injection Attacks!
    sanitizeHTML: (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[match]));
    },

    // --- ENTERPRISE UPGRADE: BULLETPROOF MATH PARSER ---
    safeNumber: (val) => {
        let parsed = 0;
        if (typeof val === 'number') {
            parsed = isNaN(val) ? 0 : val;
        } else if (val) {
            // Strips out commas, spaces, currency symbols, and letters so math never crashes
            const cleaned = String(val).replace(/[^0-9.-]+/g, '');
            parsed = parseFloat(cleaned);
        }
        
        if (isNaN(parsed)) return 0;

        // 🚨 ENTERPRISE POLISH: Number.EPSILON destroys the Javascript "0.1 + 0.2 = 0.3000000004" bug!
        return Math.round((parsed + Number.EPSILON) * 100000) / 100000;
    },

    // --- ENTERPRISE UPGRADE: STRICT GSTIN VALIDATOR ---
    validateGSTIN: (gstin) => {
        if (!gstin) return false;
        // Official Indian Govt Regex for GST
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(String(gstin).trim().toUpperCase());
    },

    // --- ENTERPRISE UPGRADE: BANK-GRADE ROUNDING ENGINE ---
    // Forces JavaScript to calculate fractions like a real accounting firm (e.g., 1.005 becomes 1.01, not 1.00)
    roundFinancial: (num) => {
        const n = Utils.safeNumber(num);
        // ENTERPRISE FIX: Apply Negative Epsilon to Negative Numbers! 
        // Otherwise, Credit Notes mathematically drift by ₹0.01 because a positive Epsilon pushes them in the wrong direction!
        const epsilon = n >= 0 ? Number.EPSILON : -Number.EPSILON;
        return Math.round((n + epsilon) * 100) / 100;
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

            // ENTERPRISE FIX: Measure true desktop height BEFORE running the engine to kill blank space!
            const origW = element.style.width;
            const origMaxW = element.style.maxWidth;
            const origPos = element.style.position;
            element.style.width = '800px';
            element.style.maxWidth = '800px';
            element.style.position = 'absolute';
            const exactHeight = element.scrollHeight;
            element.style.width = origW;
            element.style.maxWidth = origMaxW;
            element.style.position = origPos;

            const canvas = await html2canvas(element, { 
                scale: (window.devicePixelRatio || 3), 
                backgroundColor: '#ffffff',
                useCORS: true,
                windowWidth: 800,
                windowHeight: exactHeight,
                height: exactHeight,
                onclone: (clonedDoc) => {
                    const target = clonedDoc.getElementById(elementId);
                    if (target) {
                        target.style.width = '800px'; 
                        target.style.minWidth = '800px'; 
                        target.style.maxWidth = '800px';
                        target.style.position = 'relative';
                        target.style.margin = '0 auto';
                        target.style.transform = 'none'; 
                        target.style.height = 'max-content';
                        
                        clonedDoc.body.style.width = '800px';
                        clonedDoc.body.style.overflow = 'visible';
                        clonedDoc.body.style.height = 'max-content';
                        // 🚨 CRITICAL FIX: Kill the Mobile Viewport Stretching!
                        clonedDoc.documentElement.style.height = 'max-content';
                    }
                }
            }); 
            
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
        // 🚨 CRITICAL FIX: Passed through safeNumber() so "1,500.00" doesn't parse as "1.00"!
        const message = encodeURIComponent(`Hello ${customerName || 'Customer'},

A payment of ₹${Utils.safeNumber(balanceAmount).toFixed(2)} is currently pending for Document No: ${invoiceNo || 'N/A'}.

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
            
            // 🚨 ENTERPRISE UPGRADE: Log the successful backup timestamp!
            localStorage.setItem('sollo_last_backup', Date.now());
            
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
            
            // Clean up memory safely without throwing DOMExceptions
            setTimeout(() => {
                URL.revokeObjectURL(url);
                if (a.parentNode) document.body.removeChild(a);
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
        overlay.id = 'manual-restore-overlay'; // ENTERPRISE FIX: Added ID so the Android Back Button can see it!
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;';
        document.body.style.overflow = 'hidden'; // ENTERPRISE FIX: Lock background from rubber-banding!
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

        document.getElementById('btn-cancel-restore').onclick = () => {
            document.body.removeChild(overlay);
            document.body.style.overflow = ''; // ENTERPRISE FIX: Release the scroll lock!
        };
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
            // ENTERPRISE FIX: Measure true desktop height BEFORE running the engine to kill blank space!
            const origW = element.style.width;
            const origMaxW = element.style.maxWidth;
            const origPos = element.style.position;
            element.style.width = '800px';
            element.style.maxWidth = '800px';
            element.style.position = 'absolute';
            const exactHeight = element.scrollHeight;
            element.style.width = origW;
            element.style.maxWidth = origMaxW;
            element.style.position = origPos;

            const opt = {
                margin: 0, 
                filename: filename,
                enableLinks: true, 
                pagebreak: { mode: 'css', avoid: '.avoid-break' }, 
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    windowWidth: 800, 
                    windowHeight: exactHeight,
                    height: exactHeight,
                    scrollY: 0, 
                    scrollX: 0,
                    letterRendering: true,
                    onclone: (clonedDoc) => {
                        // 🚨 ENTERPRISE FIX: Force the PDF clone into Light Mode so it always prints perfectly!
                        clonedDoc.body.classList.remove('dark-mode');
                        
                        const target = clonedDoc.getElementById(elementId);
                        if (target) {
                            target.style.width = '800px'; 
                            target.style.minWidth = '800px'; 
                            target.style.maxWidth = '800px';
                            target.style.position = 'relative';
                            target.style.margin = '0 auto';
                            target.style.transform = 'none'; 
                            target.style.height = 'max-content';
                            target.style.minHeight = '0px';
                            clonedDoc.body.style.width = '800px';
                            clonedDoc.body.style.overflow = 'visible';
                            clonedDoc.body.style.height = 'max-content';
                            clonedDoc.body.style.minHeight = '0px';
                            // 🚨 CRITICAL FIX: Kill the Mobile Viewport Stretching!
                            clonedDoc.documentElement.style.height = 'max-content';
                            clonedDoc.documentElement.style.minHeight = '0px';
                        }
                    }
                },
                // 🚨 CRITICAL FIX: Dynamically match PDF height to content height to kill blank pages!
                jsPDF: { unit: 'px', format: [800, exactHeight + 2], orientation: 'portrait', compress: true }
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
            window.Utils.showToast("⏳ Downloading PDF Engine... Just a moment.");
            if (!document.getElementById('script-h2c')) {
                const s1 = document.createElement('script');
                s1.id = 'script-h2c';
                s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                document.head.appendChild(s1);
            }
            if (!document.getElementById('script-h2p')) {
                const s2 = document.createElement('script');
                s2.id = 'script-h2p';
                s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                document.head.appendChild(s2);
            }
            
            // 🚨 BIZOPS FIX: Auto-Resume Engine
            const checkInterval = setInterval(() => {
                if (typeof html2canvas !== 'undefined' && typeof html2pdf !== 'undefined') {
                    clearInterval(checkInterval);
                    window.Utils.processPDFExport(elementId, filename);
                }
            }, 300);
            return;
        }
        
        // 🚨 CRITICAL FIX: Save original dimensions OUTSIDE the try block!
        const origWidth = element.style.width;
        const origMinWidth = element.style.minWidth;
        const origMaxWidth = element.style.maxWidth;
        const origMinHeight = element.style.minHeight; // 🚨 ENTERPRISE FIX: Track the min-height!

        try {
            // STRICT ERP LOGIC: Physically lock the DOM to A4 Desktop dimensions BEFORE taking the snapshot!
            // 🚨 BIZOPS FIX: We use setProperty to crush inline HTML rules and force a strict A4 Canvas size!
            element.style.setProperty('width', '800px', 'important');
            element.style.setProperty('min-width', '800px', 'important');
            element.style.setProperty('max-width', '800px', 'important');
            element.style.setProperty('min-height', '1131px', 'important');

            // ENTERPRISE FIX: Now that the width and min-height are locked, measure the exact height!
            const exactHeight = element.scrollHeight;

            const canvas = await html2canvas(element, { 
                scale: (window.devicePixelRatio || 3), 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800, 
                windowHeight: exactHeight,
                height: exactHeight,
                scrollY: 0, 
                scrollX: 0,
                onclone: (clonedDoc) => {
                    // 🚨 ENTERPRISE FIX: Force the PDF clone into Light Mode so it always prints perfectly!
                    clonedDoc.body.classList.remove('dark-mode');
                    
                    const printArea = clonedDoc.getElementById('print-area');
                    if (printArea) {
                        printArea.className = ''; 
                        printArea.style.display = 'block';
                        printArea.style.position = 'relative';
                        printArea.style.visibility = 'visible';
                        printArea.style.width = '800px';

                        // 🚨 CRITICAL FIX: Destroy Mobile Viewport Stretching!
                        printArea.style.height = 'max-content';
                        printArea.style.minHeight = '0px';
                        clonedDoc.body.style.height = 'max-content';
                        clonedDoc.body.style.minHeight = '0px';
                        // 🚨 CRITICAL FIX: Kill the Mobile Viewport Stretching!
                        clonedDoc.documentElement.style.height = 'max-content';
                        clonedDoc.documentElement.style.minHeight = '0px';
                    }
                }
            });
            
            const imgSrc = canvas.toDataURL('image/png');
            
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
                <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0;">
                    <div>
                        <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                        <div style="font-size:12px; color:#64748b; margin-top:2px;">Share PDF or Download</div>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center; color:#475569;">
                        <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="btn-print-preview">print</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="btn-download-pdf">picture_as_pdf</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="btn-share-preview">share</span>
                        
                        <span class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a;" onclick="document.getElementById('in-app-pdf-viewer').remove(); document.body.style.overflow = ''; const pa = document.getElementById('print-area'); if(pa) pa.innerHTML = ''; const vp = document.querySelector('meta[name=viewport]'); if(vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');">close</span>
                    </div>
                </div>
                <div style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                    <img src="${imgSrc}" style="max-width:100%; height:auto; box-shadow:0 4px 8px rgba(0,0,0,0.2); border-radius:4px; display:block;" />
                </div>
            `;
            document.body.style.overflow = 'hidden'; // ENTERPRISE FIX: Lock background from rubber-banding!
            document.body.appendChild(viewer);
            
            // 🚨 ENTERPRISE FIX: Dynamically Unlock Pinch-to-Zoom for dense PDFs!
            const vp = document.querySelector('meta[name="viewport"]');
            if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
            
            // 🚨 BIZOPS FIX: Correctly mapped the Download button to ACTUALLY download!
            document.getElementById('btn-download-pdf').onclick = async () => {
                window.Utils.showToast("Downloading True PDF...");
                // The 'true' at the end forces the engine to download instead of share!
                window.Utils.sharePDF(elementId, filename, '', true); 
            };

            document.getElementById('btn-print-preview').onclick = () => {
                document.getElementById('in-app-pdf-viewer').style.display = 'none';
                window.print();
                setTimeout(() => { document.getElementById('in-app-pdf-viewer').style.display = 'flex'; }, 500);
            };
            
            document.getElementById('btn-share-preview').onclick = async () => {
                try {
                    if (window.Utils) window.Utils.showToast("Preparing True PDF...");

                    // ENTERPRISE FIX: Route the Main Invoice Share Button to the Universal PDF Engine!
                    // This ensures Sales Invoices share as crystal-clear A4 PDFs, not blurry PNGs!
                    window.Utils.sharePDF(elementId, filename, `Here is your document: ${filename.replace('.pdf', '')}`);
                    
                } catch (err) {
                    console.log("Share cancelled or failed", err);
                    alert("Sharing was cancelled or is unsupported on this device.");
                }
            };
        } catch (err) {
            console.error("Preview Generation Failed", err);
            alert("Failed to generate preview.");
        } finally {
            // 🚨 CRITICAL FIX: The Finally Block! 
            // Guarantees the mobile UI is restored even if the PDF engine crashes, preventing a permanently frozen screen!
            element.style.width = origWidth;
            element.style.minWidth = origMinWidth;
            element.style.maxWidth = origMaxWidth;
            element.style.minHeight = origMinHeight; // 🚨 ENTERPRISE FIX: Restore the min-height to kill the permanent white space!
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
        let totalQty = 0;
        let totalItems = 0;
        (doc.items || []).forEach(item => {
            rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            totalQty += parseFloat(item.qty) || 0;
            totalItems++;
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
                    <td style="text-align:center; vertical-align: top; padding-top: 10px;">${index + 1}</td>
                    <td style="font-weight: bold; vertical-align: top; padding-top: 10px;">
                        ${item.name}
                        ${item.desc ? `<div style="font-weight: 600; font-size: 10px; color: #64748b; margin-top: 4px;">${item.desc}</div>` : ''}
                    </td>
                    ${!isNonGST ? `<td style="text-align:center; vertical-align: top; padding-top: 10px;">${item.hsn || '-'}</td>` : ''}
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

        // 🚨 ENTERPRISE UPGRADE: DYNAMIC METADATA ENGINE
        // Rebuilds the PDF header automatically without leaving blank empty boxes!
        const metaFields = [];
        
        // 🚨 CRITICAL FIX: The Ultimate "Ghost Data" Shield!
        // Destroys "NaN", "Invalid Date", "undefined", and old corrupted data from printing on the PDF!
        const isSafe = (val) => {
            if (!val) return false;
            const str = String(val).trim().toLowerCase();
            return str !== '' && str !== 'undefined' && str !== 'null' && str !== 'nan' && !str.includes('nan') && str !== 'invalid date';
        };

        if (isSafe(doc.orderNo)) metaFields.push(`<strong>Order Ref:</strong><br><span style="font-weight: 600; color: #0f172a;">${doc.orderNo}</span>`);
        if (isSafe(doc.orderDate)) metaFields.push(`<strong>Order Date:</strong><br><span style="font-weight: 600; color: #0f172a;">${window.Utils.formatDateDisplay(doc.orderDate)}</span>`);
        
        // STRICT LOGIC: Only allow Dispatch Date if the invoice is actually Shipped or Completed!
        if (isSafe(doc.shippedDate) && (doc.status === 'Shipped' || doc.status === 'Completed')) {
            metaFields.push(`<strong>Dispatch Date:</strong><br><span style="font-weight: 600; color: #0f172a;">${window.Utils.formatDateDisplay(doc.shippedDate)}</span>`);
        }
        // STRICT LOGIC: Only allow Completed Date if the invoice is actually Completed!
        if (isSafe(doc.completedDate) && doc.status === 'Completed') {
            metaFields.push(`<strong>Completed Date:</strong><br><span style="font-weight: 600; color: #0f172a;">${window.Utils.formatDateDisplay(doc.completedDate)}</span>`);
        }

        let metaRowsHtml = '';
        for (let i = 0; i < metaFields.length; i += 2) {
            metaRowsHtml += `<tr>`;
            metaRowsHtml += `<td style="padding: 10px 15px; border-bottom: 1px solid #475569; border-right: 1px solid #475569; color: #0f172a;">${metaFields[i]}</td>`;
            if (metaFields[i+1]) {
                metaRowsHtml += `<td style="padding: 10px 15px; border-bottom: 1px solid #475569; color: #0f172a;">${metaFields[i+1]}</td>`;
            } else {
                metaRowsHtml += `<td style="padding: 10px 15px; border-bottom: 1px solid #475569; color: #0f172a;"></td>`;
            }
            metaRowsHtml += `</tr>`;
        }

        // --- ENTERPRISE UPGRADE: CA-LEVEL GST SUMMARY TABLE ENGINE ---
        let gstSummaryHtml = '';
        if (!isNonGST && (parseFloat(doc.totalGst) || 0) > 0) {
            let taxGroups = {};
            let isIGST = biz.state && safeParty.state && (biz.state.trim().toLowerCase() !== safeParty.state.trim().toLowerCase());
            
            (doc.items || []).forEach(item => {
                const g = parseFloat(item.gstPercent) || 0;
                if (g > 0) {
                    const bAmt = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    const dBase = bAmt - (bAmt * discountRatio);
                    if (!taxGroups[g]) taxGroups[g] = { taxable: 0, tax: 0 };
                    
                    // 🚨 CRITICAL FIX: Round the tax AT THE LINE LEVEL before accumulating!
                    // If you accumulate floating points (10.554 + 10.554) you get 21.108 (21.11).
                    // But the printed rows were rounded to 10.55 + 10.55 = 21.10. 
                    // This causes a 1-Paisa legal mismatch on the final CA Tax PDF!
                    const roundedTax = Math.round((dBase * (g / 100)) * 100) / 100;
                    
                    taxGroups[g].taxable += dBase;
                    taxGroups[g].tax += roundedTax;
                }
            });

            if (Object.keys(taxGroups).length > 0) {
                let rows = '';
                let tTaxable = 0, tTax = 0;
                Object.keys(taxGroups).forEach(rate => {
                    let r = parseFloat(rate), t = taxGroups[rate].taxable, tx = taxGroups[rate].tax;
                    tTaxable += t; tTax += tx;
                    rows += `<tr>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; color: #0f172a;">${r}%</td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${t.toFixed(2)}</td>
                        ${isIGST ? '' : `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(tx/2).toFixed(2)}</td><td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(tx/2).toFixed(2)}</td>`}
                        ${isIGST ? `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${tx.toFixed(2)}</td>` : ''}
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${tx.toFixed(2)}</td>
                    </tr>`;
                });
                gstSummaryHtml = `
                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #475569; margin-bottom: 4px;">Tax Summary (GST Breakdown)</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 4px; border: 1px solid #cbd5e1; color: #0f172a;">Tax Rate</th>
                                <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">Taxable Value</th>
                                ${isIGST ? '' : `<th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">CGST Amount</th><th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">SGST Amount</th>`}
                                ${isIGST ? `<th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">IGST Amount</th>` : ''}
                                <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">Total Tax</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                            <tr style="background: #f8fafc; font-weight: 800;">
                                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; color: #0f172a;">Total</td>
                                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${tTaxable.toFixed(2)}</td>
                                ${isIGST ? '' : `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(tTax/2).toFixed(2)}</td><td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(tTax/2).toFixed(2)}</td>`}
                                ${isIGST ? `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${tTax.toFixed(2)}</td>` : ''}
                                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${tTax.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
            }
        }

        // ENTERPRISE UPGRADE: TRUE OFFLINE DYNAMIC UPI QR GENERATOR
        let qrCodeHtml = '';
        // STRICT ERP LOGIC: Only render the UPI QR Code for Non-GST Sales! GST Invoices skip the QR.
        if (isSales && !isReturn && isNonGST && biz.upiId && (parseFloat(doc.grandTotal) || 0) > 0) {
            const trueTotalPaid = parseFloat(doc.trueTotalPaid) || 0;
            const remainingBalance = (parseFloat(doc.grandTotal) || 0) - trueTotalPaid;
            
            if (remainingBalance > 0.5) {
                try {
                    const upiString = `upi://pay?pa=${biz.upiId}&pn=${encodeURIComponent(biz.name || 'Business')}&am=${remainingBalance.toFixed(2)}&cu=INR`;
                    const qrCanvas = document.createElement('canvas');
                    new QRious({
                        element: qrCanvas,
                        value: upiString,
                        size: 250, // High Resolution for crisp printing
                        level: 'M'
                    });
                    const qrImage = qrCanvas.toDataURL('image/png');
                    
                    // ENTERPRISE UPGRADE: Wrapped the QR Code in an interactive UPI Link!
                    qrCodeHtml = `
                    <a href="${upiString}" style="text-decoration: none; display: inline-block;">
                        <div style="margin-bottom: 15px; display: flex; align-items: center; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer;">
                            <img src="${qrImage}" style="width: 65px; height: 65px; margin-right: 12px; border-radius: 4px;" />
                            <div>
                                <span style="font-size: 10px; color: #0061a4; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Tap or Scan to Pay</span>
                                <div style="font-size: 11px; color: #333;"><strong>UPI ID:</strong> ${biz.upiId}</div>
                                <div style="font-size: 11px; color: #333;"><strong>Amount:</strong> ₹${remainingBalance.toFixed(2)}</div>
                            </div>
                        </div>
                    </a>`;
                } catch(e) { console.warn("QR Engine skipped:", e); }
            }
        }

        // ENTERPRISE FIX: Changed 'const' to 'let' so the Split-Payment Tracker doesn't crash the engine!
        let html = `
        <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box; position: relative; overflow: hidden; min-height: auto !important;">
            
            <style>
                #${uniquePdfId} table { page-break-inside: auto; }
                #${uniquePdfId} tr { page-break-inside: avoid; page-break-after: auto; }
                #${uniquePdfId} thead { display: table-header-group; }
                .avoid-break { page-break-inside: avoid; }
            </style>

            <div style="border: 2px solid #475569; padding: 2px;">
            <div style="border: 1px solid #475569;">
                
                <div style="background: #f8fafc; border-bottom: 1px solid #475569; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">${title}</h2>
                    <div style="font-size: 12px; font-weight: 700;">
                        ${!isNonGST && bizGst && bizGst !== 'N/A' ? `GSTIN: ${bizGst}` : 'BILL OF SUPPLY'}
                    </div>
                </div>

                <div style="display: flex; border-bottom: 1px solid #475569;">
                    <div style="width: 55%; padding: 20px; border-right: 1px solid #475569;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 12px;">` : ''}
                        <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${biz.name || 'Company Name'}</h1>
                        <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                            ${biz.address ? biz.address.replace(/\n/g, '<br>') + '<br>' : ''}
                            ${bizLocationStr ? bizLocationStr + '<br>' : ''}
                            ${biz.phone ? `<strong>Phone:</strong> ${biz.phone}` : ''} ${biz.email ? ` | <strong>Email:</strong> ${biz.email}` : ''}
                        </div>
                    </div>
                    <div style="width: 45%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; height: 100%;">
                            <tr>
                                <td style="padding: 10px 15px; border-bottom: 1px solid #475569; border-right: 1px solid #475569; width: 50%; color: #0f172a;"><strong>Document No:</strong><br><span style="font-size: 14px; font-weight: 700; color: #0f172a;">${safeDocNo}</span></td>
                                <td style="padding: 10px 15px; border-bottom: 1px solid #475569; color: #0f172a;"><strong>Date:</strong><br><span style="font-weight: 600; color: #0f172a;">${Utils.formatDateDisplay(doc.date)}</span></td>
                            </tr>
                            ${metaRowsHtml}
                        </table>
                    </div>
                </div>

                <div style="display: flex; border-bottom: 1px solid #475569;">
                    <div style="width: 50%; padding: 15px 20px; border-right: 1px solid #475569;">
                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px;">${isSales ? 'Billed To' : 'Billed By'}</div>
                        <strong style="font-size: 15px; display: block; margin-bottom: 4px; color: #0f172a;">${partyName}</strong>
                        <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                            ${partyAddress ? partyAddress.replace(/\n/g, '<br>') + '<br>' : ''}
                            ${partyLocationStr ? partyLocationStr + '<br>' : ''}
                        </div>
                        ${!isNonGST && partyGst ? `<div style="font-size: 12px; font-weight: 700; margin-top: 6px;">GSTIN: ${partyGst}</div>` : ''}
                    </div>
                    <div style="width: 50%; padding: 15px 20px;">
                        ${biz.cf1Name && doc.cf1Val || biz.cf2Name && doc.cf2Val || biz.cf3Name && doc.cf3Val ? `
                            <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px;">Additional Details</div>
                            <table style="width: 100%; font-size: 12px; border: none; color: #0f172a;">
                                ${biz.cf1Name && doc.cf1Val ? `<tr><td style="padding: 2px 0;"><strong>${biz.cf1Name}:</strong></td><td style="padding: 2px 0;">${doc.cf1Val}</td></tr>` : ''}
                                ${biz.cf2Name && doc.cf2Val ? `<tr><td style="padding: 2px 0;"><strong>${biz.cf2Name}:</strong></td><td style="padding: 2px 0;">${doc.cf2Val}</td></tr>` : ''}
                                ${biz.cf3Name && doc.cf3Val ? `<tr><td style="padding: 2px 0;"><strong>${biz.cf3Name}:</strong></td><td style="padding: 2px 0;">${doc.cf3Val}</td></tr>` : ''}
                            </table>
                        ` : ''}
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; width: 5%; color: #0f172a;">#</th>
                            <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; width: ${!isNonGST ? '35%' : '45%'}; color: #0f172a;">Item Description</th>
                            ${!isNonGST ? `<th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; text-align: center; width: 10%; color: #0f172a;">HSN</th>` : ''}
                            <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; text-align: center; width: ${!isNonGST ? '10%' : '15%'}; color: #0f172a;">Qty</th>
                            <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; text-align: right; width: ${!isNonGST ? '15%' : '15%'}; color: #0f172a;">Rate</th>
                            ${!isNonGST ? `<th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; text-align: center; width: 10%; color: #0f172a;">GST</th>` : ''}
                            <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; text-align: right; width: ${!isNonGST ? '15%' : '20%'}; color: #0f172a;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml.replace(/<td style="/g, '<td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; color: #1e293b; ').replace(/border-right: 1px solid #94a3b8; color: #1e293b; ">([^<]*)$/gm, 'color: #1e293b; ">$1')}
                        <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #475569;">
                            <td colspan="${!isNonGST ? '3' : '2'}" style="padding: 10px; text-align: right; text-transform: uppercase; color: #0f172a;">Total Items: ${totalItems}</td>
                            <td style="padding: 10px; text-align: center; color: #0f172a;">${totalQty.toFixed(2)}</td>
                            <td colspan="${!isNonGST ? '3' : '2'}" style="padding: 10px;"></td>
                        </tr>
                    </tbody>
                </table>

                <div style="display: flex; border-top: 1px solid #475569; page-break-inside: avoid;">
                    
                    <div style="width: 60%; border-right: 1px solid #475569; padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-size: 11px; margin-bottom: 15px;">
                                <strong style="text-transform: uppercase; color: #475569;">Amount in Words:</strong><br>
                                <span style="font-style: italic; font-weight: 600; font-size: 13px; color: #0f172a;">Rupees ${Utils.numberToWords(parseFloat(doc.grandTotal) || 0)}</span>
                            </div>

                            ${gstSummaryHtml}
                            
                            <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 15px;">
                                ${qrCodeHtml}
                                
                                ${biz.bankDetails && !isNonGST ? `
                                <div style="font-size: 11px; margin-bottom: 15px;">
                                    <strong style="text-transform: uppercase; color: #475569;">Bank Details:</strong><br>
                                    <div style="margin-top: 4px; white-space: pre-wrap; font-family: monospace; font-size: 12px; font-weight: 600;">${biz.bankDetails}</div>
                                </div>` : ''}
                                
                                </div>
                        </div>

                        ${biz.terms ? `
                        <div style="font-size: 10px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                            <strong style="text-transform: uppercase; color: #475569;">Terms & Conditions:</strong><br>
                            <div style="margin-top: 4px; white-space: pre-wrap; line-height: 1.4; color: #0f172a;">${biz.terms}</div>
                        </div>` : ''}
                    </div>

                    <div style="width: 40%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-weight: 600;">
                            <tr><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">Subtotal</td><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${rawSubtotal.toFixed(2)}</td></tr>
                            ${discountAmt > 0 ? `<tr><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; color: #ef4444;">Discount</td><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #ef4444;">- ₹${discountAmt.toFixed(2)}</td></tr>` : ''}
                            ${!isNonGST ? `<tr><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">Total GST</td><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(parseFloat(doc.totalGst) || 0).toFixed(2)}</td></tr>` : ''}
                            ${(parseFloat(doc.freightAmount) || 0) > 0 ? `<tr><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">Freight / Extra</td><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${(parseFloat(doc.freightAmount) || 0).toFixed(2)}</td></tr>` : ''}
                            ${Math.abs((parseFloat(doc.grandTotal) || 0) - ((rawSubtotal - discountAmt) + (parseFloat(doc.totalGst) || 0) + (parseFloat(doc.freightAmount) || 0))) > 0.01 ? `
                            <tr><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">Round Off</td><td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹${((parseFloat(doc.grandTotal) || 0) - ((rawSubtotal - discountAmt) + (parseFloat(doc.totalGst) || 0) + (parseFloat(doc.freightAmount) || 0))).toFixed(2)}</td></tr>` : ''}
                            
                            <tr style="background: #f1f5f9;">
                                <td style="padding: 15px; font-size: 15px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #475569; color: #0f172a;">Grand Total</td>
                                <td style="padding: 15px; font-size: 18px; font-weight: 900; text-align: right; border-bottom: 1px solid #475569; color: #0f172a;">₹${Utils.formatCurrency(parseFloat(doc.grandTotal) || 0)}</td>
                            </tr>
                            
                            ${(() => {
                                let linkedSum = 0;
                                if (doc.linkedReceipts) doc.linkedReceipts.forEach(r => linkedSum += (parseFloat(r.amount) || 0));
                                let upfrontPaid = (parseFloat(doc.trueTotalPaid) || 0) - linkedSum;
                                
                                // THE FIX: Sync the PDF mathematically with the UI's Smart FIFO Engine!
                                let displayTotalPaid = parseFloat(doc.trueTotalPaid) || 0;
                                const displayGrandTotal = parseFloat(doc.grandTotal) || 0;
                                let autoKnockoffRow = '';
                                
                                if (doc.status === 'Completed' && displayTotalPaid < displayGrandTotal) {
                                    const advanceApplied = displayGrandTotal - displayTotalPaid;
                                    displayTotalPaid = displayGrandTotal; // Force balance to sync with UI
                                    autoKnockoffRow = `
                                    <tr>
                                        <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; font-size: 11px; color: #475569; font-weight: 700;">Payment from Advance Pool</td>
                                        <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #16a34a;">- ₹${advanceApplied.toFixed(2)}</td>
                                    </tr>`;
                                }

                                let htmlStr = '';
                                if (upfrontPaid > 0.01) {
                                    htmlStr += `
                                    <tr>
                                        <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; font-size: 12px; color: #475569; font-weight: 800;">Advance / Upfront Payment</td>
                                        <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #16a34a;">- ₹${upfrontPaid.toFixed(2)}</td>
                                    </tr>`;
                                }
                                htmlStr += autoKnockoffRow;
                                return htmlStr;
                            })()}

                            ${doc.linkedReceipts && doc.linkedReceipts.length > 0 ? doc.linkedReceipts.map(r => `
                            <tr>
                                <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1;">
                                    <div style="font-size: 11px; color: #475569; font-weight: 700;">${parseFloat(r.amount) < 0 ? 'Refund / Offset' : 'Payment'} on ${Utils.formatDateDisplay(r.date)}</div>
                                    <div style="font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 600;">
                                        ${r.receiptNo ? `Rec: ${r.receiptNo}` : (r.id ? `Rec: ${r.id.slice(-6).toUpperCase()}` : '')}
                                        ${r.mode ? ` | Mode: ${r.mode}` : ''}
                                        ${r.ref ? ` | Ref: ${r.ref}` : ''}
                                    </div>
                                </td>
                                <td style="padding: 10px 15px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #16a34a; vertical-align: top;">${parseFloat(r.amount) < 0 ? '+' : '-'} ₹${Math.abs(parseFloat(r.amount)).toFixed(2)}</td>
                            </tr>
                            `).join('') : ''}
                            
                            ${(() => {
                                let displayTotalPaid = parseFloat(doc.trueTotalPaid) || 0;
                                const displayGrandTotal = parseFloat(doc.grandTotal) || 0;
                                if (doc.status === 'Completed') displayTotalPaid = displayGrandTotal;
                                
                                let finalHtml = '';
                                const thisInvoiceDue = Math.max(0, displayGrandTotal - displayTotalPaid);

                                if (thisInvoiceDue > 0.01) {
                                    finalHtml += `
                                    <tr>
                                        <td style="padding: 15px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a;">Balance Due</td>
                                        <td style="padding: 15px; font-size: 16px; font-weight: 900; text-align: right; color: #dc2626;">₹${thisInvoiceDue.toFixed(2)}</td>
                                    </tr>`;
                                } else if (displayTotalPaid > 0) {
                                    finalHtml += `
                                    <tr>
                                        <td style="padding: 15px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a;">Balance Due</td>
                                        <td style="padding: 15px; font-size: 16px; font-weight: 900; text-align: right; color: #16a34a;">₹0.00 (PAID)</td>
                                    </tr>`;
                                }

                                // 🚨 THE FIX: DYNAMIC PREVIOUS BALANCE INJECTION!
                                const partyBalance = parseFloat(safeParty.balance) || 0;
                                if (isSales && partyBalance > 0.01) {
                                    const previousDues = partyBalance - thisInvoiceDue;
                                    if (previousDues > 0.01) {
                                        finalHtml += `
                                        <tr>
                                            <td style="padding: 10px 15px; border-bottom: 1px dashed #cbd5e1; font-size: 12px; color: #475569; font-weight: 800;">Previous Outstanding Dues</td>
                                            <td style="padding: 10px 15px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 800; color: #dc2626;">₹${previousDues.toFixed(2)}</td>
                                        </tr>
                                        <tr style="background: #fee2e2;">
                                            <td style="padding: 15px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #991b1b; border-bottom: 1px solid #475569;">Total Net Payable</td>
                                            <td style="padding: 15px; font-size: 16px; font-weight: 900; text-align: right; color: #991b1b; border-bottom: 1px solid #475569;">₹${partyBalance.toFixed(2)}</td>
                                        </tr>`;
                                    }
                                }
                                return finalHtml;
                            })()}
                        </table>

                        <div id="signature-anchor" class="avoid-break" style="padding: 20px 15px; text-align: right; page-break-inside: avoid;">
                            ${biz.signature ? `<img src="${biz.signature}" style="max-height: 60px; max-width: 160px; margin-bottom: 8px; object-fit: contain; display: inline-block;">` : `<div style="height: 60px;"></div>`}
                            <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">Authorized Signatory</div>
                            <div style="font-size: 10px; color: #475569; margin-top: 4px;">For ${biz.name || 'Company Name'}</div>
                        </div>
                    </div>
                </div>
            </div> </div> </div>
        `;
        
        // --- ENTERPRISE UPGRADE: SPLIT PAYMENT / INSTALLMENT TRACKER ---
        let totalPaid = parseFloat(doc.trueTotalPaid) || 0;
        // THE FIX: Sync the tracker with the UI FIFO logic
        if (doc.status === 'Paid' || doc.status === 'Completed') totalPaid = parseFloat(doc.grandTotal) || 0; 

        if (totalPaid > 0) {
            const safeGrandTotal = parseFloat(doc.grandTotal) || 0;
            const balanceDue = Math.max(0, safeGrandTotal - totalPaid);
            const paidPercent = safeGrandTotal > 0 ? Math.min(100, (totalPaid / safeGrandTotal) * 100) : 0;
            
            const progressHtml = `
            <div class="avoid-break" style="margin-top: 16px; margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; background: #f8fafc; page-break-inside: avoid;">
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

            // ENTERPRISE FIX: Updated the anchor target so the tracker safely locks into the new Premium layout!
            const anchorIndex = html.lastIndexOf('<div id="signature-anchor"');
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

        // 🚨 BIZOPS FIX: Corrected the regex to target 'Inter' so the user's Font Settings actually apply!
        if (pdfFont === 'serif') {
            themedHtml = themedHtml.replace(/font-family: 'Inter', sans-serif;/g, "font-family: 'Times New Roman', Times, serif;");
        } else if (pdfFont === 'mono') {
            themedHtml = themedHtml.replace(/font-family: 'Inter', sans-serif;/g, "font-family: 'Courier New', Courier, monospace;");
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

    printReceivablesReport: async (reportData, grandTotal) => {
        window.Utils.showToast("Generating Premium Report... ⏳");
        const uniquePdfId = 'pdf-receivables-' + Date.now();
        const safeDocNo = Utils.getLocalDate();
        
        // 1. Fetch Business Profile for the Letterhead
        const firmId = typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1';
        const biz = await window.getRecordById('businessProfile', firmId) || {};
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

        let rowsHtml = '';
        reportData.forEach((row, index) => {
            let overdueTag = '';
            try {
                if (window.UI && window.UI.state && window.UI.state.rawData && window.UI.state.rawData.sales) {
                    const partySales = window.UI.state.rawData.sales.filter(s => s.customerId === row.id && s.status !== 'Completed' && s.status !== 'Paid');
                    if (partySales.length > 0) {
                        partySales.sort((a,b) => new Date(a.shippedDate || a.date) - new Date(b.shippedDate || b.date));
                        const oldestDate = new Date(partySales[0].shippedDate || partySales[0].date);
                        const daysOverdue = Math.floor(Math.abs(new Date() - oldestDate) / (1000 * 60 * 60 * 24));
                        
                        if (daysOverdue > 60) overdueTag = `<span style="background:#fff0f2; color:#ba1a1a; padding:2px 6px; border-radius:4px; font-size:10px; border:1px solid #ffdad6; margin-left:8px; display:inline-block; vertical-align:middle; font-weight:800;">${daysOverdue} Days Overdue</span>`;
                        else if (daysOverdue > 30) overdueTag = `<span style="background:#fff7ed; color:#c2410c; padding:2px 6px; border-radius:4px; font-size:10px; border:1px solid #fb923c; margin-left:8px; display:inline-block; vertical-align:middle; font-weight:800;">${daysOverdue} Days Overdue</span>`;
                        else if (daysOverdue > 0) overdueTag = `<span style="background:#f8fafc; color:#475569; padding:2px 6px; border-radius:4px; font-size:10px; border:1px solid #cbd5e1; margin-left:8px; display:inline-block; vertical-align:middle; font-weight:800;">${daysOverdue} Days</span>`;
                    }
                }
            } catch(e) { console.warn("Aging calculation skipped for", row.name); }

            // 🚀 ENTERPRISE UPGRADE: Zebra Striping
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            rowsHtml += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; font-weight: 800; color: #0f172a;">${row.name} ${overdueTag}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; color: #475569; font-weight: 600;">${row.phone || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-weight: 900; font-size: 13px;">₹${parseFloat(row.balance || 0).toFixed(2)}</td>
                </tr>
            `;
        });

        // 🚀 ENTERPRISE UPGRADE: Official Letterhead HTML Injection
        const html = `
            <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box; position: relative; overflow: hidden; min-height: auto !important;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #${uniquePdfId} * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
                    #${uniquePdfId} table { width: 100%; border-collapse: collapse; border-top: none; }
                    #${uniquePdfId} th { background-color: #f1f5f9 !important; border-bottom: 1px solid #475569 !important; border-right: 1px solid #94a3b8 !important; padding: 10px !important; font-weight: 800 !important; font-size: 11px !important; text-transform: uppercase !important; color: #0f172a !important; text-align: left; }
                    #${uniquePdfId} td { border-top: none !important; border-left: none !important; font-size: 11px !important; vertical-align: middle !important; }
                    #${uniquePdfId} td:last-child, #${uniquePdfId} th:last-child { border-right: none !important; }
                    #${uniquePdfId} tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    #${uniquePdfId} thead { display: table-header-group; }
                </style>

                <div style="border: 2px solid #475569; padding: 2px;">
                <div style="border: 1px solid #475569;">
                    
                    <div style="background: #f8fafc; border-bottom: 1px solid #475569; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">MARKET RECEIVABLES</h2>
                        <div style="font-size: 12px; font-weight: 700; color: #475569;">DATE: ${Utils.formatDateDisplay(safeDocNo)}</div>
                    </div>

                    <div style="display: flex; border-bottom: 1px solid #475569;">
                        <div style="width: 50%; padding: 20px; border-right: 1px solid #475569;">
                            ${biz.logo ? `<img src="${biz.logo}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 12px;">` : ''}
                            <h1 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a;">${biz.name || 'Company Name'}</h1>
                            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                                ${biz.address || ''}<br>
                                ${bizLocationStr ? bizLocationStr + '<br>' : ''}
                                Ph: ${biz.phone || ''}
                            </div>
                        </div>
                        <div style="width: 50%; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; background: #fff0f2; text-align: right;">
                            <strong style="font-size: 11px; text-transform: uppercase; color: #ba1a1a; margin-bottom: 4px;">Total Market Due</strong>
                            <span style="font-size: 28px; font-weight: 900; color: #991b1b; display: block; margin-bottom: 4px;">₹${parseFloat(grandTotal || 0).toFixed(2)}</span>
                            <span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid #fca5a5;">Outstanding Receivables</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 55%;">Customer / Party Name</th>
                                <th style="width: 25%;">Contact No.</th>
                                <th style="width: 20%; text-align: right;">Outstanding (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="3" style="padding:20px; text-align:center;">No pending receivables found.</td></tr>'}
                            <tr style="background:#f1f5f9; font-weight:900; border-top: 2px solid #475569; border-bottom: 4px double #475569;">
                                <td colspan="2" style="padding:15px 15px; text-align:right; text-transform:uppercase; font-size:13px; color:#0f172a;">Total Market Dues</td>
                                <td style="padding:15px 10px; text-align:right; color:#dc2626; font-size:16px;">₹${parseFloat(grandTotal || 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="avoid-break" style="padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">*** End of Report ***</div>
                        <div style="width: 200px; text-align: center;">
                            ${biz.signature ? `<img src="${biz.signature}" style="max-height: 75px; margin-bottom: 5px; object-fit: contain; position: relative; z-index: 10; mix-blend-mode: multiply;" />` : '<div style="height: 60px; margin-bottom: 5px;"></div>'}
                            <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">Authorized Signatory</div>
                        </div>
                    </div>
                </div> </div> </div>
        `;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
            setTimeout(() => {
                Utils.processPDFExport(uniquePdfId, `Receivables_${safeDocNo}.pdf`);
            }, 100);
        }
    },

    downloadStatementPDF: async () => {
        const nameEl = document.getElementById('report-party-name');
        const balEl = document.getElementById('report-party-balance');
        if (!nameEl) return alert("Report data not found.");

        const partyName = nameEl.innerText.trim();
        let isAccount = false;
        
        let party = window.UI.state.rawData.ledgers.find(l => (l.name || '').trim().toLowerCase() === partyName.toLowerCase());
        
        if (!party) {
            party = window.UI.state.rawData.accounts.find(a => (a.name || '').trim().toLowerCase() === partyName.toLowerCase());
            if (!party && partyName.toLowerCase().includes('cash')) {
                party = { id: 'cash', name: 'Cash Drawer', type: 'Account', firmId: typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1' };
            }
            if (party) isAccount = true;
        }
        
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

        const biz = (party.firmId) ? await window.getRecordById('businessProfile', party.firmId) || {} : {};
        const timeline = window.UI.state.rawData.timeline || [];
        
        let finalBal = 0;
        if (timeline.length > 0) {
            finalBal = timeline[timeline.length - 1].runningBalance || 0;
        }

        let openingBal = 0;
        const openEntry = timeline.find(t => t.id === 'open-bal');
        if (openEntry) openingBal = openEntry.impact || openEntry.amount || 0;
        
        let tableRows = '';
        let totalDebit = 0;
        let totalCredit = 0;
        
        timeline.forEach((t, index) => {
            let debit = '';
            let credit = '';
            
            if (isAccount) {
                if (t.impact > 0) debit = Math.abs(t.impact).toFixed(2);
                else credit = Math.abs(t.impact).toFixed(2);
            } else {
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

            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            // 🚨 EXACT SCREENSHOT MATCH: Combines the Voucher Type and Number cleanly!
            let particulars = t.id === 'open-bal' ? 'Opening Balance' : `${t.type || t.desc} ${t.ref ? '/ ' + t.ref : ''}`;
            if (t.partyName && t.partyName !== 'Unknown') particulars += ` <span style="color:#64748b; font-size: 10px;">(${t.partyName})</span>`;

            // 🚨 ENTERPRISE UI: Inject GST / Non-GST Micro-Badges into the Particulars!
            if (t.isInvoice) {
                let inv = null;
                if (party.type === 'Customer' && window.UI.state.rawData.sales) {
                    inv = window.UI.state.rawData.sales.find(s => s.id === t.id);
                } else if (party.type === 'Supplier' && window.UI.state.rawData.purchases) {
                    inv = window.UI.state.rawData.purchases.find(p => p.id === t.id);
                }

                if (inv) {
                    const gstAmt = parseFloat(inv.totalGst) || 0;
                    const baseAmt = (parseFloat(inv.grandTotal) || 0) - gstAmt;
                    
                    if (gstAmt > 0) {
                        particulars += `<div style="margin-top: 5px;"><span style="font-size: 9px; color: #0369a1; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-weight: 700; display: inline-block;">Base: ₹${baseAmt.toFixed(2)} | GST: ₹${gstAmt.toFixed(2)}</span></div>`;
                    } else if (inv.invoiceType === 'Non-GST') {
                        particulars += `<div style="margin-top: 5px;"><span style="font-size: 9px; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a; font-weight: 700; display: inline-block;">Non-GST Bill</span></div>`;
                    }
                }
            }

            tableRows += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#0f172a; white-space:nowrap; font-weight:600;">${Utils.formatDateDisplay(t.date)}</td>
                    <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; font-weight: 700; color:#0f172a; line-height: 1.4;">
                        ${particulars}
                    </td>
                    <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:right; color:#0f172a; font-weight:600;">${debit ? debit : ''}</td>
                    <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:right; color:#0f172a; font-weight:600;">${credit ? credit : ''}</td>
                    <td style="padding:10px; border-bottom:1px solid #cbd5e1; text-align:right; font-weight:800; color:#0f172a;">
                        ${Math.abs(t.runningBalance || 0).toFixed(2)} ${Math.abs(t.runningBalance || 0) < 0.01 ? '' : ((t.runningBalance || 0) > 0 ? 'Dr' : 'Cr')}
                    </td>
                </tr>
            `;
            
            if (debit) totalDebit += parseFloat(debit);
            if (credit) totalCredit += parseFloat(credit);
        });

        if (timeline.length > 0) {
            tableRows += `
                <tr style="background:#f1f5f9; font-weight:900; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
                    <td colspan="2" style="padding:12px 15px; text-align:right; text-transform:uppercase; font-size:12px; color:#0f172a;">Total</td>
                    <td style="padding:12px 10px; border-right:1px solid #94a3b8; text-align:right; color:#0f172a; font-size:13px;">${totalDebit.toFixed(2)}</td>
                    <td style="padding:12px 10px; border-right:1px solid #94a3b8; text-align:right; color:#0f172a; font-size:13px;">${totalCredit.toFixed(2)}</td>
                    <td style="padding:12px 10px;"></td>
                </tr>
            `;
        }

        const safeDocNo = Utils.getLocalDate();
        
        let balSuffix = 'Available';
        let splitHtml = ''; 

        if (!isAccount) {
            // 🚨 NEW LOGIC: Catch perfect zero balances first!
            if (Math.abs(finalBal) < 0.01) {
                balSuffix = 'Settled (Nil)';
            } else if (party.type === 'Customer') {
                balSuffix = finalBal > 0 ? 'Dr (Due)' : 'Cr (Advance)';
            } else {
                balSuffix = finalBal < 0 ? 'Cr (To Pay)' : 'Dr (Advance)';
            }

            if ((party.type === 'Customer' && finalBal > 0.01) || (party.type === 'Supplier' && finalBal < -0.01)) {
                let ob = parseFloat(party.openingBalance) || 0;
                let isAdv = party.type === 'Customer' ? ((party.balanceType || '').toLowerCase().includes('pay') || (party.balanceType || '').toLowerCase().includes('credit')) : ((party.balanceType || '').toLowerCase().includes('receive') || (party.balanceType || '').toLowerCase().includes('debit'));
                
                let credits = isAdv ? ob : 0;
                let debitsGst = !isAdv ? ob : 0;
                let debitsNon = 0;
                let invoices = [];

                if (party.type === 'Customer') {
                    window.UI.state.rawData.sales.forEach(s => {
                        if (s.status !== 'Open' && s.customerId === party.id) {
                            if (s.documentType === 'return') credits += parseFloat(s.grandTotal || 0);
                            else invoices.push({ type: s.invoiceType === 'Non-GST' ? 'non' : 'gst', amt: parseFloat(s.grandTotal || 0), date: s.date });
                        }
                    });
                    window.UI.state.rawData.cashbook.forEach(c => {
                        if (c.ledgerId === party.id) credits += (c.type === 'in' ? parseFloat(c.amount || 0) : -parseFloat(c.amount || 0));
                    });
                } else {
                    window.UI.state.rawData.purchases.forEach(p => {
                        if (p.status !== 'Open' && p.supplierId === party.id) {
                            if (p.documentType === 'return') credits += parseFloat(p.grandTotal || 0);
                            else invoices.push({ type: p.invoiceType === 'Non-GST' ? 'non' : 'gst', amt: parseFloat(p.grandTotal || 0), date: p.date });
                        }
                    });
                    window.UI.state.rawData.cashbook.forEach(c => {
                        if (c.ledgerId === party.id) credits += (c.type === 'out' ? parseFloat(c.amount || 0) : -parseFloat(c.amount || 0));
                    });
                }

                invoices.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
                
                if (credits >= debitsGst) { credits -= debitsGst; debitsGst = 0; }
                else { debitsGst -= credits; credits = 0; }

                invoices.forEach(inv => {
                    let unpaid = inv.amt;
                    if (credits >= unpaid) { credits -= unpaid; unpaid = 0; }
                    else { unpaid -= credits; credits = 0; }
                    if (unpaid > 0.01) {
                        if (inv.type === 'gst') debitsGst += unpaid;
                        else debitsNon += unpaid;
                    }
                });

                if (debitsGst > 0.01 || debitsNon > 0.01) {
                    splitHtml = `<div style="margin-top: 12px; background: #e2e8f0; padding: 8px; border-radius: 6px; border: 1px dashed #94a3b8; display: inline-block; text-align: right;">`;
                    if (debitsGst > 0.01) splitHtml += `<div style="font-size: 11px; color: #0f172a; font-weight: 800; margin-bottom: 2px;">GST Due: ₹${debitsGst.toFixed(2)}</div>`;
                    if (debitsNon > 0.01) splitHtml += `<div style="font-size: 11px; color: #0f172a; font-weight: 800;">Non-GST Due: ₹${debitsNon.toFixed(2)}</div>`;
                    splitHtml += `</div>`;
                }
            }
        }
        
        const statementBizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        const statementPartyLocationStr = [party.city, party.state].filter(Boolean).join(', ') + (party.pincode ? ' - ' + party.pincode : '');
        const uniquePdfId = 'pdf-statement-' + Date.now();

        // 🚀 ENTERPRISE UPGRADE: Official Letterhead HTML Injection
        const html = `
            <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box; position: relative; overflow: hidden; min-height: auto !important;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : ''}

                <style>
                    #${uniquePdfId} * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
                    #${uniquePdfId} table { width: 100%; border-collapse: collapse; border-top: none; }
                    #${uniquePdfId} th { background-color: #f1f5f9 !important; border-bottom: 1px solid #475569 !important; border-right: 1px solid #94a3b8 !important; padding: 10px !important; font-weight: 800 !important; font-size: 11px !important; text-transform: uppercase !important; color: #0f172a !important; }
                    #${uniquePdfId} td { border-top: none !important; border-left: none !important; font-size: 11px !important; vertical-align: middle !important; }
                    #${uniquePdfId} td:last-child, #${uniquePdfId} th:last-child { border-right: none !important; }
                    #${uniquePdfId} tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    #${uniquePdfId} thead { display: table-header-group; }
                </style>

                <div style="border: 2px solid #475569; padding: 2px;">
                <div style="border: 1px solid #475569;">
                    
                    <div style="background: #f8fafc; border-bottom: 1px solid #475569; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">${isAccount ? 'ACCOUNT STATEMENT' : 'LEDGER STATEMENT'}</h2>
                        <div style="font-size: 12px; font-weight: 700; color: #475569;">
                            DATE: ${Utils.getLocalDate()}
                        </div>
                    </div>

                    <div style="display: flex; border-bottom: 1px solid #475569;">
                        <div style="width: 50%; padding: 20px; border-right: 1px solid #475569;">
                            ${biz.logo ? `<img src="${biz.logo}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 12px;">` : ''}
                            <h1 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a;">${biz.name || 'Company Name'}</h1>
                            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                                ${biz.address || ''}<br>
                                ${statementBizLocationStr ? statementBizLocationStr + '<br>' : ''}
                                Ph: ${biz.phone || ''}
                            </div>
                        </div>
                        <div style="width: 50%; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; background: #f8fafc; text-align: right;">
                            <strong style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Closing Balance</strong>
                            <span style="font-size: 24px; font-weight: 900; color: #0f172a; display: block; margin-bottom: 4px;">₹${Math.abs(finalBal).toFixed(2)}</span>
                            <span style="font-size: 14px; font-weight: 700; color: ${Math.abs(finalBal) < 0.01 ? '#64748b' : (finalBal > 0 ? '#16a34a' : '#ef4444')};">${balSuffix}</span>
                            ${splitHtml}
                        </div>
                    </div>

                    <div style="padding: 15px 20px; border-bottom: 1px solid #475569;">
                        <strong style="text-transform: uppercase; font-size: 11px; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; color: #0f172a; display: inline-block; margin-bottom: 8px;">${isAccount ? 'ACCOUNT DETAILS' : 'PARTY DETAILS'}</strong>
                        <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a;">${party.name}</div>
                        <div style="font-size: 12px; color: #334155; margin-top: 4px; line-height: 1.5;">
                            ${party.address || ''} ${party.address ? '<br>' : ''}
                            ${statementPartyLocationStr || ''} ${statementPartyLocationStr ? '<br>' : ''}
                            ${party.phone ? `Ph: ${party.phone}<br>` : ''}
                            ${party.gst ? `<strong style="color:#0f172a;">GSTIN: ${party.gst.toUpperCase()}</strong>` : ''}
                        </div>
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
                    
                    <div class="avoid-break" style="padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">*** End of Statement ***</div>
                        <div style="width: 200px; text-align: center;">
                            ${biz.signature ? `<img src="${biz.signature}" style="max-height: 75px; margin-bottom: 5px; object-fit: contain; position: relative; z-index: 10; mix-blend-mode: multiply;" />` : '<div style="height: 60px; margin-bottom: 5px;"></div>'}
                            <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">Authorized Signatory</div>
                        </div>
                    </div>
                </div> </div> </div>
        `;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
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
                    if (a.parentNode) document.body.removeChild(a);
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
            } else if (parts[0].length <= 2 && parts[2].length === 2) {
                // 🚨 ENTERPRISE FIX: Catch 2-Digit Years (e.g., 15/05/26) and auto-prefix '20'!
                cleanDate = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
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
    sharePDF: async (elementId, filename, shareText = "Here is your document.", forceDownload = false) => {
        try {
            if (typeof html2pdf === 'undefined' || typeof html2canvas === 'undefined') {
                window.Utils.showToast("⏳ Downloading Share Engine... Just a moment.");
                if (!document.getElementById('script-h2c')) {
                    const s1 = document.createElement('script');
                    s1.id = 'script-h2c';
                    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                    document.head.appendChild(s1);
                }
                if (!document.getElementById('script-h2p')) {
                    const s2 = document.createElement('script');
                    s2.id = 'script-h2p';
                    s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                    document.head.appendChild(s2);
                }
                
                // 🚨 BIZOPS FIX: Auto-Resume Engine
                const checkInterval = setInterval(() => {
                    if (typeof html2canvas !== 'undefined' && typeof html2pdf !== 'undefined') {
                        clearInterval(checkInterval);
                        window.Utils.sharePDF(elementId, filename, shareText, forceDownload);
                    }
                }, 300);
                return;
            }

            const el = document.getElementById(elementId);
            if (!el) return;
            
            window.Utils.showToast("⏳ Preparing PDF for Print...");

            // ENTERPRISE FIX: Measure true desktop height BEFORE running the engine to kill blank space!
            const origW = el.style.width;
            const origMaxW = el.style.maxWidth;
            const origPos = el.style.position;
            
            // 🚨 BIZOPS FIX: Force EXACT A4 Dimensions for Native Background Sharing!
            el.style.setProperty('width', '800px', 'important');
            el.style.setProperty('min-width', '800px', 'important');
            el.style.setProperty('max-width', '800px', 'important');
            el.style.setProperty('min-height', '1131px', 'important'); // Forces A4 ratio!
            el.style.position = 'absolute';
            
            const exactHeight = el.scrollHeight;
            
            // Cleanup
            el.style.width = origW;
            el.style.maxWidth = origMaxW;
            el.style.minHeight = ''; 
            el.style.position = origPos;

            const opt = {
                margin: 0, 
                filename: filename,
                enableLinks: true, 
                // 🚨 FIX: Added 'tr' so it never mathematically slices a table row in half across two pages!
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] }, 
                html2canvas: { 
                    scale: (window.devicePixelRatio || 3), 
                    backgroundColor: '#ffffff',
                    useCORS: true, 
                    logging: false, 
                    windowWidth: 800, 
                    windowHeight: exactHeight,
                    height: exactHeight,
                    scrollY: 0, 
                    scrollX: 0,
                    letterRendering: true,
                    onclone: (clonedDoc) => {
                        const target = clonedDoc.getElementById(elementId);
                        if (target) {
                            target.style.width = '800px'; 
                            target.style.minWidth = '800px'; 
                            target.style.maxWidth = '800px';
                            target.style.position = 'relative';
                            target.style.margin = '0 auto';
                            target.style.transform = 'none'; 
                            target.style.height = 'max-content';
                            target.style.minHeight = '0px';
                            clonedDoc.body.style.width = '800px';
                            clonedDoc.body.style.overflow = 'visible';
                            clonedDoc.body.style.height = 'max-content';
                            clonedDoc.body.style.minHeight = '0px';
                            // 🚨 CRITICAL FIX: Kill the Mobile Viewport Stretching!
                            clonedDoc.documentElement.style.height = 'max-content';
                            clonedDoc.documentElement.style.minHeight = '0px';
                        }
                    }
                },
                image: { type: 'jpeg', quality: 1.0 },
                // 🚨 ENTERPRISE FIX: The Multi-Page A4 Shield!
                // Forces massive Ledgers and Statements into paginated A4 format (800x1131), while wrapping small invoices tightly!
                jsPDF: { unit: 'px', format: exactHeight > 1150 ? [800, 1131] : [800, exactHeight + 2], orientation: 'portrait', compress: true }
            };

            const pdfBlob = await window.html2pdf().set(opt).from(el).outputPdf('blob');
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            // 🚨 BIZOPS FIX: If user tapped download, skip sharing and just download!
            if (forceDownload) {
                window.html2pdf().set(opt).from(el).save();
                return;
            }

            // 🚨 BIZOPS FIX: If user tapped Share, ONLY share. No fallback!
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: filename.replace('.pdf', ''),
                    text: shareText,
                    files: [file]
                });
            } else {
                window.Utils.showToast("⚠️ Native Share is only supported on mobile apps or secure servers.");
            }
        } catch (err) {
            console.error("Share API Error:", err);
            window.Utils.showToast("❌ Share cancelled or failed.");
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: EXPENSE VOUCHER PDF
    // ==========================================
    generateExpenseVoucherPDF: async (expenseId) => {
        if (typeof window.html2pdf === 'undefined' && typeof html2canvas === 'undefined') {
            if (window.Utils) window.Utils.showToast("Loading PDF Engine... Please wait 2 seconds.");
            const s2 = document.createElement('script');
            s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            document.head.appendChild(s2);
            return;
        }

        if (window.Utils) window.Utils.showToast("Generating Expense Voucher...");
        
        const expense = await window.getRecordById('expenses', expenseId);
        if (!expense) return window.Utils.showToast("Error: Expense record not found!");

        const activeFirmId = expense.firmId || (window.app && window.app.state ? window.app.state.firmId : 'firm1');
        const biz = await window.getRecordById('businessProfile', activeFirmId) || {};
        const accounts = await window.getAllRecords('accounts');
        const payAccount = accounts.find(a => a.id === expense.accountId) || { name: 'Cash Drawer' };
        
        const safeDate = window.Utils.formatDateDisplay(expense.date);
        const uniquePdfId = 'pdf-expense-' + Date.now();
        
        let itemsHtml = '';
        let totalAmt = 0;
        
        // Ensure items array exists to prevent crashes if it's a simple expense
        const itemsToProcess = (expense.items && expense.items.length > 0) ? expense.items : [{ name: expense.category || 'General Expense', qty: 1, rate: expense.amount, uom: 'Units' }];

        itemsToProcess.forEach((item, index) => {
            const qty = parseFloat(item.qty) || 1;
            const rate = parseFloat(item.rate) || 0;
            const total = qty * rate;
            totalAmt += total;
            
            itemsHtml += `
                <tr>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#475569; font-weight:600;">${index + 1}</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#0f172a; font-weight:700;">${item.name || 'Expense Item'}</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#475569;">${qty} ${item.uom || ''}</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:right; color:#475569;">${rate.toFixed(2)}</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; text-align:right; font-weight:800; color:#0f172a;">${total.toFixed(2)}</td>
                </tr>
            `;
        });

        const finalTotalAmt = totalAmt > 0 ? totalAmt : (parseFloat(expense.amount) || 0);
        const amountInWords = window.Utils.numberToWords(finalTotalAmt);

        const html = `
            <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box; position: relative; overflow: hidden; min-height: auto !important;">
                
                ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%); mix-blend-mode: multiply;" /></div>` : ''}

                <style>
                    #${uniquePdfId} * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
                    #${uniquePdfId} table { width: 100%; border-collapse: collapse; border-top: none; }
                    #${uniquePdfId} th { background-color: #f1f5f9 !important; border-bottom: 1px solid #475569 !important; border-right: 1px solid #94a3b8 !important; padding: 12px !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; color: #0f172a !important; text-align: left; }
                    #${uniquePdfId} td { font-size: 13px !important; vertical-align: middle !important; }
                    #${uniquePdfId} td:last-child, #${uniquePdfId} th:last-child { border-right: none !important; }
                </style>

                <div style="border: 2px solid #475569; padding: 2px;">
                <div style="border: 1px solid #475569;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #475569;">
                        <div style="width: 65%; padding: 20px; border-right: 1px solid #475569;">
                            <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${biz.name || 'Company Name'}</h1>
                            <div style="font-size: 12px; color: #475569;">Internal Expense & Payment Record</div>
                        </div>
                        <div style="width: 35%; padding: 20px; background: #f8fafc; text-align: center;">
                            <h2 style="margin: 0; font-size: 22px; color: #0f172a; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">PAYMENT VOUCHER</h2>
                        </div>
                    </div>

                    <div style="display: flex; padding: 20px; background: #ffffff; border-bottom: 1px solid #475569;">
                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Voucher No</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${expense.expenseNo || 'EXP-AUTO'}</div>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Date</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${safeDate}</div>
                        </div>
                        <div style="flex: 1.5;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Paid To / Party</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${expense.partyName || expense.vendorName || expense.category || 'General'}</div>
                        </div>
                        <div style="flex: 1; text-align: right;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Payment Mode</div>
                            <div style="font-size: 14px; font-weight: 800; background: #e2e8f0; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">${payAccount.name}</div>
                            ${expense.refNo ? `<div style="font-size: 11px; color: #475569; font-weight: 700;">Ref: ${expense.refNo}</div>` : ''}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 8%; text-align: center;">#</th>
                                <th style="width: 47%;">Description of Expense</th>
                                <th style="text-align: center; width: 15%;">Qty</th>
                                <th style="text-align: right; width: 15%;">Rate (₹)</th>
                                <th style="text-align: right; width: 15%;">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div style="display: flex; border-top: 2px solid #475569; border-bottom: 1px solid #475569;">
                        <div style="width: 70%; padding: 16px 20px; border-right: 1px solid #475569; background: #f8fafc; display: flex; align-items: center;">
                            <div>
                                <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Amount in Words</div>
                                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${amountInWords}</div>
                            </div>
                        </div>
                        <div style="width: 30%; padding: 16px 20px; text-align: right; display: flex; flex-direction: column; justify-content: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Total Paid</div>
                            <div style="font-size: 24px; font-weight: 900; color: #0f172a;">₹${finalTotalAmt.toFixed(2)}</div>
                        </div>
                    </div>

                    <div style="padding: 20px; font-size: 13px; color: #334155; line-height: 1.5; border-bottom: 1px solid #475569; background: #f8fafc;">
                        <strong>Remarks / Notes:</strong><br>
                        ${expense.notes ? expense.notes.replace(/\\n/g, '<br>') : 'No additional remarks.'}
                    </div>

                    <div style="display: flex; padding: 40px 20px 20px 20px; justify-content: space-between; align-items: flex-end;">
                        <div style="width: 250px; text-align: center;">
                            <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Receiver's Signature</div>
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">(Sign to confirm cash received)</div>
                        </div>
                        
                        <div style="width: 250px; text-align: center;">
                            ${biz.signature ? `<img src="${biz.signature}" style="max-height: 75px; margin-bottom: 5px; object-fit: contain; position: relative; z-index: 10; mix-blend-mode: multiply;" />` : '<div style="height: 60px; margin-bottom: 5px;"></div>'}
                            <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">Authorized By</div>
                        </div>
                    </div>

                </div></div>
            </div>
        `;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = html;
            setTimeout(() => {
                const safeFilename = `Voucher_${expense.expenseNo || 'EXP'}.pdf`;
                window.Utils.processPDFExport(uniquePdfId, safeFilename);
            }, 100);
        }
    }
}; // <--- THIS CLOSES THE UTILS OBJECT

// ==========================================
// ENTERPRISE UPGRADE: PARTY-FILTERED ITEM LEDGER PDF
// ==========================================
window.executeItemLedgerReport = async (itemId, itemName, partyId = null, partyName = null, searchText = '', typeFilter = 'ALL', dateFilter = '') => {
    if (typeof window.html2pdf === 'undefined' && typeof html2pdf === 'undefined') {
        if (window.Utils) window.Utils.showToast("Loading PDF Engine... Please tap Print again in 2 seconds.");
        const s2 = document.createElement('script');
        s2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        document.head.appendChild(s2);
        return;
    }

    if (window.Utils) window.Utils.showToast("Generating Premium Stock Ledger...");
    
    // 1. Fetch Business Profile for the Letterhead
    const activeFirmId = (typeof app !== 'undefined' && app.state) ? app.state.firmId : 'firm1';
    const biz = await window.getRecordById('businessProfile', activeFirmId) || {};
    const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

    const product = await window.getRecordById('items', itemId);
    
    // 🚨 ENTERPRISE FIX: If checking a specific party's ledger, the Global Opening Stock is strictly 0!
    const openingStock = (product && !partyId) ? (parseFloat(product.openingStock) || 0) : 0;

    let timeline = [];
    
    // 2. Safely Filter Sales
    const sales = await window.getAllRecords('sales');
    sales.forEach(s => {
        if(s.status !== 'Open' && s.firmId === activeFirmId && (!partyId || s.customerId === partyId)) {
            (s.items || []).forEach(row => {
                if(row.itemId === itemId) {
                    const isReturn = s.documentType === 'return';
                    const qty = parseFloat(row.qty) || 0;
                    timeline.push({ id: s.id, date: s.date, type: isReturn ? 'Sales Return' : 'Sale', desc: s.customerName || 'Unknown Party', ref: s.invoiceNo || s.orderNo || s.id.slice(-4).toUpperCase(), inQty: isReturn ? qty : 0, outQty: isReturn ? 0 : qty });
                }
            });
        }
    });

    // 3. Safely Filter Purchases
    const purchases = await window.getAllRecords('purchases');
    purchases.forEach(p => {
        if(p.status !== 'Open' && p.firmId === activeFirmId && (!partyId || p.supplierId === partyId)) {
            (p.items || []).forEach(row => {
                if(row.itemId === itemId) {
                    const isReturn = p.documentType === 'return';
                    const qty = parseFloat(row.qty) || 0;
                    timeline.push({ id: p.id, date: p.date, type: isReturn ? 'Purchase Return' : 'Purchase', desc: p.supplierName || 'Unknown Party', ref: p.invoiceNo || p.poNo || p.id.slice(-4).toUpperCase(), inQty: isReturn ? 0 : qty, outQty: isReturn ? qty : 0 });
                }
            });
        }
    });

    // 4. Manual Adjustments & Expenses are only shown if we are NOT filtering by a specific party
    if (!partyId) {
        const adjustments = await window.getAllRecords('adjustments');
        adjustments.forEach(a => {
            if(a.itemId === itemId && a.firmId === activeFirmId) {
                const qty = parseFloat(a.qty) || 0;
                timeline.push({ id: a.id, date: a.date, type: 'Adjustment', desc: 'Manual Correction', ref: a.notes || 'Audit', inQty: a.type === 'add' ? qty : 0, outQty: a.type === 'reduce' ? qty : 0 });
            }
        });
        
        const expenses = await window.getAllRecords('expenses');
        expenses.forEach(e => {
            if(e.firmId === activeFirmId) {
                (e.items || []).forEach(row => {
                    if(row.itemId === itemId) {
                        const qty = parseFloat(row.qty) || 0;
                        timeline.push({ id: e.id, date: e.date, type: 'Expense', desc: 'Internal Expense', ref: e.expenseNo || 'EXP', inQty: 0, outQty: qty });
                    }
                });
            }
        });
    }

    // 1. SORT CHRONOLOGICALLY FIRST!
    timeline.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeA - timeB;
    });

    // 2. CALCULATE TRUE RUNNING MATH ON FULL TIMELINE!
    let runningStock = openingStock;
    timeline.forEach(t => {
        runningStock += t.inQty;
        runningStock -= t.outQty;
        t.trueRunningBalance = runningStock; // Save the permanent, mathematically correct balance
    });

    // 🚨 CRITICAL FIX: Save the true final mathematical stock safely in memory!
    const trueFinalStock = runningStock;

    // 3. NOW APPLY FILTERS!
    timeline = timeline.filter(t => {
        if (searchText && !String(t.ref || '').toLowerCase().includes(searchText) && !String(t.type || '').toLowerCase().includes(searchText)) return false;
        
        const impact = (t.inQty || 0) - (t.outQty || 0);
        if (typeFilter === 'IN' && impact <= 0) return false;
        if (typeFilter === 'OUT' && impact >= 0) return false;
        if (typeFilter === 'Expense' && t.type !== 'Expense') return false;
        if (dateFilter && t.date !== dateFilter) return false;

        return true;
    });

    let totalIn = 0;
    let totalOut = 0;
    let rowsHtml = '';
    
    // Hide Global Opening Stock if filtering by Party or Date
    if (!partyId && !dateFilter) {
        // 🚨 ENTERPRISE FIX: Perfectly aligned 6-column Opening Stock row for the PDF!
        rowsHtml += `
            <tr style="background:#f1f5f9; font-weight:800;">
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#475569;">Opening</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#1e293b; font-weight:600;">Opening Stock</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#1e293b; line-height:1.4;">Initial Inventory Balance</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#16a34a; font-weight:800;">${openingStock > 0 ? openingStock.toFixed(2) : ''}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#dc2626; font-weight:800;">${openingStock < 0 ? Math.abs(openingStock).toFixed(2) : ''}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; text-align:right; color:#0f172a; font-weight:900;">${openingStock.toFixed(2)}</td>
            </tr>
        `;
    }

    timeline.forEach((t, index) => {
        totalIn += t.inQty;
        totalOut += t.outQty;
        
        // 🚀 ENTERPRISE UPGRADE: Zebra Striping
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        rowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#475569;">${t.date}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#1e293b; font-weight:600;">${t.type}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; color:#1e293b; line-height:1.4;">${t.desc}<br><small style="color:#64748b; font-weight:700;">Ref: ${t.ref}</small></td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#16a34a; font-weight:800;">${t.inQty > 0 ? t.inQty.toFixed(2) : ''}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; border-right:1px solid #94a3b8; text-align:center; color:#dc2626; font-weight:800;">${t.outQty > 0 ? t.outQty.toFixed(2) : ''}</td>
                <td style="padding:10px; border-bottom:1px solid #cbd5e1; text-align:right; font-weight:900; color:#0f172a;">${t.trueRunningBalance.toFixed(2)}</td>
            </tr>
        `;
    });

    // 🚨 CRITICAL FIX: The Closing Balance must ALWAYS be the true final stock, regardless of filters!
    const finalDisplayBalance = trueFinalStock;

    // 🚀 ENTERPRISE UPGRADE: Tally Double-Line Totals
    rowsHtml += `
        <tr style="background:#f1f5f9; font-weight:900; border-top: 2px solid #475569; border-bottom: 4px double #475569;">
            <td style="padding:12px 10px; text-align:right; text-transform:uppercase; color:#0f172a;" colspan="3">Total Volume Summary</td>
            <td style="padding:12px 10px; border-right:1px solid #94a3b8; text-align:center; color:#16a34a; font-size:13px;">${totalIn.toFixed(2)}</td>
            <td style="padding:12px 10px; border-right:1px solid #94a3b8; text-align:center; color:#dc2626; font-size:13px;">${totalOut.toFixed(2)}</td>
            <td style="padding:12px 10px; text-align:right; color:#0f172a; font-size:13px;">${finalDisplayBalance.toFixed(2)}</td>
        </tr>
    `;
    
    const uniquePdfId = 'pdf-item-ledger-' + Date.now();
    const safeDocNo = Utils.getLocalDate();
    
    // Dynamic Legal Title based on Filter
    const reportSubtitle = partyId ? `Filtered By Party: ${partyName}` : (dateFilter ? `Filtered By Date: ${dateFilter}` : 'Global Stock Movement');

    // 🚀 ENTERPRISE UPGRADE: Official Letterhead HTML Injection
    const html = `
    <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box; position: relative; min-height: auto !important;">
        
        ${biz.logo ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; z-index: 0; width: 60%; display: flex; justify-content: center; pointer-events: none;"><img src="${biz.logo}" style="width: 100%; object-fit: contain; filter: grayscale(100%); mix-blend-mode: multiply;" /></div>` : ''}

        <style>
            #${uniquePdfId} * { position: relative; z-index: 1; margin: 0; padding: 0; box-sizing: border-box; }
            #${uniquePdfId} table { width: 100%; border-collapse: collapse; border-top: none; }
            #${uniquePdfId} th { background-color: #f1f5f9 !important; border-bottom: 1px solid #475569 !important; border-right: 1px solid #94a3b8 !important; padding: 12px !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; color: #0f172a !important; text-align: left; }
            #${uniquePdfId} td { font-size: 12px !important; vertical-align: middle !important; }
            #${uniquePdfId} td:last-child, #${uniquePdfId} th:last-child { border-right: none !important; }
        </style>

        <div style="border: 2px solid #475569; padding: 2px;">
        <div style="border: 1px solid #475569;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #475569;">
                <div style="width: 65%; padding: 20px; border-right: 1px solid #475569;">
                    <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${biz.name || 'Company Name'}</h1>
                    <div style="font-size: 12px; color: #475569;">Official Stock Ledger & Inventory Audit</div>
                </div>
                <div style="width: 35%; padding: 20px; background: #f8fafc; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">STOCK LEDGER</h2>
                </div>
            </div>

            <div style="display: flex; padding: 20px; background: #ffffff; border-bottom: 1px solid #475569;">
                <div style="flex: 1.5; border-right: 1px dashed #cbd5e1;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Product / Item Name</div>
                    <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${itemName || 'Unknown Item'}</div>
                </div>
                <div style="flex: 1; padding-left: 20px;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Filter Scope</div>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${reportSubtitle}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 12%;">Date</th>
                        <th style="width: 15%;">Type</th>
                        <th style="width: 33%;">Particulars & Ref</th>
                        <th style="text-align: center; width: 12%;">Stock IN</th>
                        <th style="text-align: center; width: 12%;">Stock OUT</th>
                        <th style="text-align: right; width: 16%;">Running Bal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            
            <div style="display: flex; border-top: 2px solid #475569; border-bottom: 1px solid #475569;">
                <div style="width: 50%; padding: 20px; border-right: 1px solid #475569; background: #ffffff;">
                    <strong style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; display:block;">Ledger Summary</strong>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-size: 13px; color: #475569; font-weight: 600;">Total Stock IN</span>
                        <strong style="font-size: 13px; color: #16a34a;">+ ${totalIn.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 13px; color: #475569; font-weight: 600;">Total Stock OUT</span>
                        <strong style="font-size: 13px; color: #dc2626;">- ${totalOut.toFixed(2)}</strong>
                    </div>
                </div>
                <div style="width: 50%; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; background: #f8fafc; text-align: right;">
                    <strong style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Closing Stock Balance</strong>
                    <span style="font-size: 28px; font-weight: 900; color: #0f172a; display: block; margin-bottom: 4px;">${finalDisplayBalance.toFixed(2)}</span>
                    <span style="background: ${finalDisplayBalance > 0 ? '#e8f5e9' : (finalDisplayBalance < 0 ? '#fff0f2' : '#f1f5f9')}; color: ${finalDisplayBalance > 0 ? '#146c2e' : (finalDisplayBalance < 0 ? '#ba1a1a' : '#475569')}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid ${finalDisplayBalance > 0 ? '#bbf7d0' : (finalDisplayBalance < 0 ? '#fecaca' : '#cbd5e1')};">${finalDisplayBalance > 0 ? 'Net Surplus (IN)' : (finalDisplayBalance < 0 ? 'Net Deficit (OUT)' : 'Zero Balance')}</span>
                </div>
            </div>

            <div style="display: flex; padding: 30px 20px 20px 20px; justify-content: space-between; align-items: flex-end; background: #ffffff;">
                <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">*** End of Ledger ***</div>
                <div style="width: 200px; text-align: center;">
                    ${biz.signature ? `<img src="${biz.signature}" style="max-height: 75px; margin-bottom: 5px; object-fit: contain; position: relative; z-index: 10; mix-blend-mode: multiply;" />` : '<div style="height: 60px; margin-bottom: 5px;"></div>'}
                    <div style="border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">Authorized Signatory</div>
                </div>
            </div>

        </div></div>
    </div>
    `;

    const printArea = document.getElementById('print-area');
    if (printArea) {
        printArea.innerHTML = html;
        setTimeout(() => {
            const safeItemName = itemName ? String(itemName) : 'Unknown_Item';
            const safePartyStr = partyName ? `_${String(partyName).replace(/[^a-z0-9]/gi, '')}` : '';
            const safeFilename = `Stock_Ledger_${safeItemName.replace(/[^a-z0-9]/gi, '_')}${safePartyStr}.pdf`;
            window.Utils.processPDFExport(uniquePdfId, safeFilename);
        }, 100);
    }
};

// ==========================================
// NEW CODE: GLOBAL MAP
// ==========================================
// 2. Attach to window so index.html onclick="Utils..." buttons don't break!
window.Utils = Utils;
