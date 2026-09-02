// ==========================================
// SOLLO ERP - UTILITY, EXPORT & PDF ENGINE (v6.1 Enterprise)
// ==========================================

const Utils = {
    // ==========================================
    // 🚨 BUG FIX: GLOBAL FUZZY SEARCH ENGINE
    // ==========================================
    fuzzyMatch: (term, text) => {
        if (!term) return true; // Empty search shows everything
        if (!text) return false;
        
        // Strip spaces and convert to lowercase for aggressive matching
        const cleanTerm = String(term).toLowerCase().replace(/\s+/g, '');
        const cleanText = String(text).toLowerCase().replace(/\s+/g, '');
        
        return cleanText.includes(cleanTerm);
    },

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

        let safeString = String(dateString);
        
        // 🚨 BUG FIX: iOS Date Parser
        // iPhones physically cannot process YYYY-MM-DD. We must convert dashes to slashes for ALL non-ISO strings!
        if (!safeString.includes('T')) {
            const parts = safeString.split('-');
            if (parts.length === 3) {
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
            safeString = safeString.replace(/-/g, '/');
            const d = new Date(safeString);
            return isNaN(d.getTime()) ? new Date() : d;
        } else {
            // It is already a standard ISO string, let the browser handle it safely
            const d = new Date(safeString);
            return isNaN(d.getTime()) ? new Date() : d;
        }
    },

    // ==========================================
    // 1. CORE UTILITIES & STRICT MATH
    // ==========================================
    // STRICT ERP LOGIC: Forces a UNIX timestamp to the end of EVERY UUID so Daybook sorting never scrambles same-day transactions!
    // STRICT ERP LOGIC: Added the missing parentheses so Date.now() mathematically attaches to EVERY id!
    generateId: () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sollo-' + Math.random().toString(36).substr(2, 9)) + '-' + Date.now(),

    // 🚨 ENTERPRISE UX: BUTTON LOCK SHIELD
    // Prevents double-taps from creating duplicate invoices while the database is saving!
    lockButton: (btnId, loadingText = "Saving...") => {
        const btn = document.getElementById(btnId);
        if (!btn) return null;
        
        // Save the original state so we can restore it later
        const originalText = btn.innerHTML;
        
        // Lock the button
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';
        
        // Inject a spinner and text
        btn.innerHTML = `<span class="material-symbols-outlined" style="animation: sollo-spin 1s linear infinite; font-size:18px; vertical-align:middle; margin-right:6px;">autorenew</span> ${loadingText}`;
        
        return { btn, originalText }; // Return the state object to unlock it later
    },

    unlockButton: (state) => {
        if (!state || !state.btn) return;
        state.btn.disabled = false;
        state.btn.style.pointerEvents = 'auto';
        state.btn.style.opacity = '1';
        state.btn.innerHTML = state.originalText;
    },

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
        let rupees = Math.floor(safeNum);
        let paise = Math.round((safeNum - rupees) * 100);

        // 🚨 ENTERPRISE FIX: The 99-Paisa Rollover Bug
        if (paise === 100) {
            rupees += 1;
            paise = 0;
        }

        let result = rupees === 0 ? 'Zero Rupees' : convertGroup(rupees.toString()) + ' Rupees';
        
        if (paise > 0) {
            result += ' and ' + convertGroup(paise.toString()) + ' Paise';
        }
        return result + ' Only';
    },

    // ==========================================
    // 🚨 ENTERPRISE UPGRADE: CUSTOM ASYNC ALERT DIALOG
    // ==========================================
    alertModal: (message, title = "Notice") => {
        return new Promise((resolve) => {
            const dialog = document.getElementById('enterprise-dialog');
            if (!dialog) { window.alert(message); resolve(); return; } // Failsafe

            document.getElementById('enterprise-dialog-title').innerText = title;
            document.getElementById('enterprise-dialog-msg').innerText = message;

            const okBtn = dialog.querySelector('button');
            okBtn.onclick = () => {
                dialog.style.opacity = '0';
                document.getElementById('enterprise-dialog-card').style.transform = 'scale(0.9)';
                setTimeout(() => { dialog.classList.add('hidden'); resolve(); }, 280);
            };

            dialog.classList.remove('hidden');
            requestAnimationFrame(() => { requestAnimationFrame(() => {
                dialog.style.opacity = '1';
                document.getElementById('enterprise-dialog-card').style.transform = 'scale(1)';
            });});
            if (window.UI && window.UI.triggerHaptic) window.UI.triggerHaptic('medium');
        });
    },

    // ==========================================
    // 🚨 ENTERPRISE UPGRADE: CUSTOM ASYNC CONFIRM DIALOG
    // ==========================================
    confirmModal: (message, confirmText = "Confirm", isDestructive = false) => {
        return new Promise((resolve) => {
            const dialog = document.getElementById('enterprise-confirm');
            if (!dialog) {
                resolve(window.confirm(message)); // Failsafe
                return;
            }

            document.getElementById('enterprise-confirm-msg').innerText = message;
            
            const yesBtn = document.getElementById('enterprise-confirm-yes');
            const noBtn = document.getElementById('enterprise-confirm-no');
            const iconEl = document.getElementById('enterprise-confirm-icon');
            const iconBg = document.getElementById('enterprise-confirm-icon-bg');
            const titleEl = document.getElementById('enterprise-confirm-title');

            yesBtn.innerText = confirmText;

            if (isDestructive) {
                yesBtn.style.background = 'var(--md-error)';
                yesBtn.style.boxShadow = '0 4px 12px rgba(186, 26, 26, 0.3)';
                iconBg.style.background = 'rgba(186, 26, 26, 0.1)';
                iconEl.style.color = 'var(--md-error)';
                iconEl.innerText = 'warning';
                titleEl.innerText = 'Warning';
            } else {
                yesBtn.style.background = 'var(--md-primary)';
                yesBtn.style.boxShadow = '0 4px 12px rgba(0, 97, 164, 0.3)';
                iconBg.style.background = 'rgba(0, 97, 164, 0.1)';
                iconEl.style.color = 'var(--md-primary)';
                iconEl.innerText = 'help';
                titleEl.innerText = 'Please Confirm';
            }

            const closeDialog = (result) => {
                dialog.style.opacity = '0';
                document.getElementById('enterprise-confirm-card').style.transform = 'scale(0.9)';
                setTimeout(() => {
                    dialog.classList.add('hidden');
                    resolve(result);
                }, 280);
            };

            yesBtn.onclick = () => closeDialog(true);
            noBtn.onclick = () => closeDialog(false);

            dialog.classList.remove('hidden');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    dialog.style.opacity = '1';
                    document.getElementById('enterprise-confirm-card').style.transform = 'scale(1)';
                });
            });
            
            if (window.UI && window.UI.triggerHaptic) window.UI.triggerHaptic(isDestructive ? 'heavy' : 'medium');
        });
    },

    // ==========================================
    // 🚨 ENTERPRISE UPGRADE: SWIPE-TO-CONFIRM ENGINE
    // ==========================================
    swipeConfirmModal: (message) => {
        return new Promise((resolve) => {
            const dialog = document.getElementById('enterprise-swipe');
            if (!dialog) { resolve(window.confirm(message)); return; }

            document.getElementById('enterprise-swipe-msg').innerText = message;
            const track = document.getElementById('swipe-track');
            const thumb = document.getElementById('swipe-thumb');
            const cancelBtn = document.getElementById('enterprise-swipe-cancel');
            const trackText = document.getElementById('swipe-track-text');

            let isDragging = false;
            let startX = 0;
            let maxSlide = 0;
            const abortController = new AbortController(); // Cleans up events instantly

            const closeDialog = (result) => {
                abortController.abort(); // Kill all listeners
                dialog.style.opacity = '0';
                document.getElementById('enterprise-swipe-card').style.transform = 'translateY(100%)';
                setTimeout(() => {
                    dialog.classList.add('hidden');
                    thumb.style.transform = `translateX(0px)`;
                    thumb.style.transition = 'none';
                    trackText.style.opacity = '0.8';
                    resolve(result);
                }, 300);
            };

            cancelBtn.onclick = () => closeDialog(false);

            const onDragStart = (e) => {
                isDragging = true;
                startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                thumb.style.transition = 'none';
                if (window.UI && window.UI.triggerHaptic) window.UI.triggerHaptic('light');
            };

            const onDragMove = (e) => {
                if (!isDragging) return;
                let currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                let delta = currentX - startX;
                
                if (delta < 0) delta = 0;
                if (delta > maxSlide) delta = maxSlide;
                
                thumb.style.transform = `translateX(${delta}px)`;
                trackText.style.opacity = Math.max(0, 0.8 - (delta / (maxSlide * 0.7))); // Fade out text as you swipe
            };

            const onDragEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                thumb.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                
                const currentTransform = thumb.style.transform;
                const delta = parseFloat(currentTransform.replace('translateX(', '').replace('px)', '')) || 0;

                if (delta > maxSlide * 0.85) {
                    // SUCCESS! The user swiped all the way!
                    thumb.style.transform = `translateX(${maxSlide}px)`;
                    if (window.UI && window.UI.triggerHaptic) window.UI.triggerHaptic('heavy');
                    setTimeout(() => closeDialog(true), 150);
                } else {
                    // SNAP BACK! They let go too early
                    thumb.style.transform = `translateX(0px)`;
                    trackText.style.opacity = '0.8';
                    if (window.UI && window.UI.triggerHaptic) window.UI.triggerHaptic('light');
                }
            };

            // Safely bind all events using the AbortController
            const opts = { signal: abortController.signal };
            thumb.addEventListener('mousedown', onDragStart, opts);
            thumb.addEventListener('touchstart', onDragStart, Object.assign({passive: true}, opts));
            
            document.addEventListener('mousemove', onDragMove, opts);
            document.addEventListener('touchmove', onDragMove, Object.assign({passive: false}, opts));
            
            document.addEventListener('mouseup', onDragEnd, opts);
            document.addEventListener('touchend', onDragEnd, opts);

            dialog.classList.remove('hidden');
            
            // Calculate track width securely after render
            setTimeout(() => { maxSlide = track.offsetWidth - thumb.offsetWidth - 8; }, 50);

            requestAnimationFrame(() => { requestAnimationFrame(() => {
                dialog.style.opacity = '1';
                document.getElementById('enterprise-swipe-card').style.transform = 'translateY(0)';
            });});
        });
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
        let parsed = parseFloat(String(val || 0).replace(/[^0-9.-]+/g, '')) || 0;
        // Force precision to 4 decimal places using exponential math to prevent Javascript floating point drift
        return Number(Math.round(parsed + 'e4') + 'e-4');
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
        const isNeg = n < 0;
        // 🚨 CRITICAL FIX: Adding Number.EPSILON completely destroys the 1-paisa floating-point drift!
        // This guarantees that numbers like 1.005 will mathematically snap to 1.01 every single time.
        let absRound = Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
        return isNeg ? -absRound : absRound;
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
        }, 60000);
    },
    // ==========================================
    // NEW CODE: UNIVERSAL SHARE ENGINE
    // ==========================================
    shareDocumentAsImage: async (elementId, documentTitle) => {
        try {
            const element = document.getElementById(elementId);
            if (!element) {
                if (window.Utils) await window.Utils.alertModal("Error: Document area not found.", "Share Failed");
                return;
            }

            // STRICT ERP LOGIC: Prevent fatal crash if the user clicks Share before the library finishes loading!
            if (typeof html2canvas === 'undefined') {
                if (window.Utils) await window.Utils.alertModal("Loading Image Engine... Please wait 2 seconds and tap Share again.", "Loading");
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
                scale: 2, // 🚨 RAM FIX: Lower scale from 3 to 2. Looks identical, uses 50% less RAM!
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false, // 🚨 CPU FIX: Disable console logging to speed up rendering
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
            
            // 🚨 RAM FIX: Compress to JPEG to prevent memory crashes!
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `${documentTitle}.jpg`, { type: 'image/jpeg' });

                // 2. Check if the device's browser supports the Universal Share API with files
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: documentTitle,
                            text: `Please find the attached document: ${documentTitle}`,
                            files: [file]
                        });
                    } catch (e) { console.log("Share cancelled by user."); }
                } else {
                    // ENTERPRISE FIX: Added DOM Appending and RAM Garbage Collection to prevent silent download failures and Memory Leaks!
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${documentTitle}.jpg`; // Fixed extension
                    document.body.appendChild(link); // Required for strict mobile browsers
                    link.click();
                    
                    if (window.Utils) window.Utils.alertModal("Universal sharing is not supported on this device. The document has been downloaded instead.", "Downloaded");
                    
                    // Safely destroy the Base64 Blob from the phone's RAM after 1 second!
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        if (link.parentNode) document.body.removeChild(link);
                    }, 60000);
                }
            }, 'image/jpeg', 0.90); // Added 90% compression

        } catch (error) {
            console.error("Sharing failed:", error);
            if (window.Utils) window.Utils.alertModal("An error occurred while trying to share the document.", "Share Error");
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
        if (!phone) {
            if (window.Utils) window.Utils.alertModal("No phone number saved for this customer.", "Missing Details");
            return;
        }
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
    // ENTERPRISE UPGRADE: WHATSAPP SMART-SHARE ENGINE
    // ==========================================
    shareDocumentWhatsApp: async (type, docId) => {
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const doc = await window.getRecordById(storeName, docId);
        if (!doc) return await window.Utils.alertModal("Please save the document first before sharing!", "Action Required");

        const partyId = type === 'sales' ? doc.customerId : doc.supplierId;
        const partyName = type === 'sales' ? doc.customerName : doc.supplierName;
        const party = await window.getRecordById('ledgers', partyId);
        
        const phone = party ? party.phone : '';
        if (!phone) {
            await window.Utils.alertModal(`No phone number saved for ${partyName}. Please edit their profile in the Master Data to add one.`, "Missing Details");
            return;
        }

        const cleanPhone = window.Utils.formatWhatsAppNumber(phone);
        const docNo = doc.invoiceNo || doc.poNo || doc.orderNo || doc.id.slice(-6).toUpperCase();
        const date = window.Utils.formatDateDisplay(doc.date);
        
        // Calculate pending balance
        let totalPaid = parseFloat(doc.trueTotalPaid) || 0;
        if (doc.status === 'Completed' || doc.status === 'Paid') totalPaid = parseFloat(doc.grandTotal);
        const balanceDue = Math.max(0, parseFloat(doc.grandTotal) - totalPaid);
        
        // 🚨 ENTERPRISE FIX: Smart Document Name Detection!
        let properDocName = 'Tax Invoice';
        if (doc.documentType === 'return') properDocName = type === 'sales' ? 'Credit Note' : 'Debit Note';
        else if (doc.invoiceType === 'Non-GST') properDocName = 'Bill of Supply';
        else if (type === 'purchases') properDocName = 'Purchase Bill';
        
        let message = '';
        if (type === 'sales') {
            message = `Hello *${partyName}*,

Please find the details for your recent ${properDocName}:

📄 *${properDocName} No:* ${docNo}
📅 *Date:* ${date}
💰 *Total Amount:* ₹${parseFloat(doc.grandTotal).toFixed(2)}
`;
            if (balanceDue > 0) message += `⏳ *Balance Due:* ₹${balanceDue.toFixed(2)}

`;
            else message += `✅ *Status:* Fully Paid

`;
            message += `Thank you for your business!`;
        } else {
            message = `Hello *${partyName}*,

We have generated a Purchase Order / Bill:

📄 *PO No:* ${docNo}
📅 *Date:* ${date}
💰 *Total Amount:* ₹${parseFloat(doc.grandTotal).toFixed(2)}

Please process this accordingly. Thank you!`;
        }

        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    },

    // ==========================================
    // 3. DATABASE BACKUP (EXPORT/IMPORT) ENGINE
    // ==========================================
    exportData: async () => {
        try {
            if (typeof window.exportDatabase !== 'function') {
                if (window.Utils) await window.Utils.alertModal("Database export not ready.", "Export Failed");
                return;
            }
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
            }, 60000);
            
            if (window.Utils) window.Utils.showToast("✅ Backup successfully saved to Downloads!");
        } catch (e) {
            console.error("Database Export Error:", e);
            if (window.Utils) window.Utils.alertModal("Database Error: Could not generate export file.", "Export Failed");
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
                        if (window.Utils) await window.Utils.alertModal("Database imported successfully! The app will now restart to apply changes.", "Import Complete");
                        // 🚨 FIX: Restore the hard reload! Soft refreshes fail to update the Web Worker for Cash Recovery & Aging!
                        window.location.reload(true);
                    }
                } catch (err) {
                    alert("Invalid backup file. Make sure it is a valid SOLLO JSON backup.");
                }
            };
            reader.readAsText(file);
            
            setTimeout(() => { event.target.value = ''; }, 1000); 
            
            return;
        }

        alert("Please select a valid JSON backup file to restore your database.");
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
                image: { type: 'jpeg', quality: 0.90 }, 
                html2canvas: { 
                    scale: 2.0, // 🚀 ENTERPRISE FIX: Retina HD resolution locked in!
                    useCORS: true, 
                    logging: false, // 🚨 CPU FIX
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

    processPDFExport: async (elementId, filename, customMsg = null) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (typeof html2canvas === 'undefined' || typeof html2pdf === 'undefined') {
            window.Utils.showToast("⏳ Downloading PDF Engine... Just a moment.");
            
            const loadScript = (id, src) => new Promise((resolve, reject) => {
                if (document.getElementById(id)) return resolve();
                const script = document.createElement('script');
                script.id = id;
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
            });

            try {
                await Promise.all([
                    loadScript('script-h2c', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
                    loadScript('script-h2p', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
                ]);
                return window.Utils.processPDFExport(elementId, filename, customMsg);
            } catch (error) {
                console.error(error);
                if (window.Utils) window.Utils.showToast("❌ Failed to load PDF Engine. Check internet connection.");
                return;
            }
        }
        
        const origWidth = element.style.width;
        const origMinWidth = element.style.minWidth;
        const origMaxWidth = element.style.maxWidth;
        const origMinHeight = element.style.minHeight; 

        try {
            document.querySelectorAll('#in-app-pdf-viewer').forEach(el => el.remove());

            const viewer = document.createElement('div');
            viewer.id = 'in-app-pdf-viewer';
            viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
            
            viewer.innerHTML = `
                <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                        <div style="font-size:12px; color:#0061a4; font-weight:700; margin-top:2px;" id="pdf-status-text">Processing Document...</div>
                    </div>
                    <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                        <span id="btn-close-pdf-loading" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a;">close</span>
                    </div>
                </div>
                <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:center; touch-action: pan-x pan-y pinch-zoom;">
                    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; opacity:0.9;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 97, 164, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                            <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                        </div>
                        <div style="font-size:16px; font-weight:800; color:#0f172a;">Generating High-Res PDF...</div>
                        <div style="width: 220px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 8px;">
                            <div style="width: 0%; height: 100%; background: #0061a4; border-radius: 3px; animation: pdf-progress 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;"></div>
                        </div>
                    </div>
                    <style>
                        @keyframes sollo-spin { 100% { transform: rotate(360deg); } }
                        @keyframes pdf-progress { 0% { width: 0%; } 80% { width: 90%; } 100% { width: 95%; } }
                    </style>
                </div>
            `;
            document.body.style.overflow = 'hidden'; 
            document.body.appendChild(viewer);
            
            document.getElementById('btn-close-pdf-loading').onclick = () => {
                const v = document.getElementById('in-app-pdf-viewer');
                if (v) v.remove(); 
                document.body.style.overflow = '';
            };

            await new Promise(res => setTimeout(res, 50));

            element.style.setProperty('width', '800px', 'important');
            element.style.setProperty('min-width', '800px', 'important');
            element.style.setProperty('max-width', '800px', 'important');
            element.style.setProperty('min-height', '1131px', 'important');

            const exactHeight = element.scrollHeight;

            const canvas = await html2canvas(element, { 
                scale: 2.0, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800, 
                windowHeight: exactHeight,
                height: exactHeight,
                scrollY: 0, 
                scrollX: 0,
                onclone: (clonedDoc) => {
                    clonedDoc.body.classList.remove('dark-mode');
                    const printArea = clonedDoc.getElementById('print-area');
                    if (printArea) {
                        printArea.className = ''; 
                        printArea.style.display = 'block';
                        printArea.style.position = 'relative';
                        printArea.style.visibility = 'visible';
                        printArea.style.width = '800px';
                        printArea.style.height = 'max-content';
                        printArea.style.minHeight = '0px';

                        printArea.style.contentVisibility = 'visible';
                        const allElements = printArea.querySelectorAll('*');
                        allElements.forEach(el => { el.style.contentVisibility = 'visible'; });

                        clonedDoc.body.style.height = 'max-content';
                        clonedDoc.body.style.minHeight = '0px';
                        clonedDoc.documentElement.style.height = 'max-content';
                        clonedDoc.documentElement.style.minHeight = '0px';
                    }
                }
            });
            
            const imgBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            const imgSrc = URL.createObjectURL(imgBlob);

            const opt = {
                margin: 0, 
                filename: filename,
                enableLinks: true, 
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] }, 
                html2canvas: { scale: 2.0, useCORS: true, logging: false },
                image: { type: 'jpeg', quality: 0.90 }, 
                // 🚨 FIX: Force continuous single-page format dynamically based on actual content height
                jsPDF: { unit: 'px', format: [800, Math.max(1131, exactHeight + 20)], orientation: 'portrait', compress: true }
            };
            const pdfBlob = await window.html2pdf().set(opt).from(element).outputPdf('blob');
            const readyPdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
            
            document.getElementById('pdf-status-text').style.color = '#64748b';
            document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
            
            document.getElementById('pdf-header-actions').innerHTML = `
                <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="preview-action-print">print</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="preview-action-download">picture_as_pdf</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px;" id="preview-action-share">share</span>
                <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a;">close</span>
            `;

            const previewContent = document.getElementById('pdf-preview-content');
            previewContent.style.alignItems = 'flex-start'; 
            previewContent.innerHTML = `<img src="${imgSrc}" style="max-width:100%; height:auto; box-shadow:0 4px 8px rgba(0,0,0,0.2); border-radius:4px; display:block;" />`;
            
            const vp = document.querySelector('meta[name="viewport"]');
            if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
            
            document.getElementById('preview-action-download').onclick = () => {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
            };

            document.getElementById('preview-action-print').onclick = () => {
                // 🚨 FIX: Force the print dialog to use the generated Blob instead of printing the screen background!
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = URL.createObjectURL(pdfBlob);
                document.body.appendChild(iframe);
                
                iframe.onload = function() {
                    setTimeout(() => {
                        iframe.contentWindow.print();
                        setTimeout(() => { document.body.removeChild(iframe); }, 2000);
                    }, 200);
                };
            };
            
            document.getElementById('preview-action-share').onclick = async () => {
                try {
                    const cleanDocumentName = filename.replace('.pdf', '').replace(/_/g, ' ');
                    const finalMsg = customMsg ? customMsg : `Here is your document: ${cleanDocumentName}`;
                    
                    if (navigator.canShare && navigator.canShare({ files: [readyPdfFile] })) {
                        await navigator.share({
                            title: cleanDocumentName,
                            text: finalMsg,
                            files: [readyPdfFile]
                        });
                    } else {
                        if (window.Utils) window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                        document.getElementById('preview-action-download').click();
                    }
                } catch (err) {
                    console.log("Share cancelled or failed", err);
                }
            };
            
            document.getElementById('btn-close-pdf-loaded').onclick = () => {
                const viewer = document.getElementById('in-app-pdf-viewer');
                if (viewer) viewer.remove();
                document.body.style.overflow = '';
                const pa = document.getElementById('print-area');
                if (pa) pa.innerHTML = '';
                const v = document.querySelector('meta[name="viewport"]');
                if (v) v.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
                URL.revokeObjectURL(imgSrc);
            };

        } catch (err) {
            console.error("Preview Generation Failed", err);
            alert("Failed to generate preview.");
        } finally {
            element.style.width = origWidth;
            element.style.minWidth = origMinWidth;
            element.style.maxWidth = origMaxWidth;
            element.style.minHeight = origMinHeight; 
        }
    },

    // ==========================================
    // 5. PRINT & TEMPLATE ENGINE
    // ==========================================
    generateInvoicePDF: (doc, biz, party, type) => {
        if (typeof pdfMake === 'undefined') {
            window.Utils.showToast("⏳ Loading Vector Engine...");
            return;
        }

        window.Utils.showToast("⚡ Generating Accounting Layout...");

        const safeParty = party || {};
        const isSales = type === 'sales';
        
        const partyName = safeParty.name ? safeParty.name : (isSales ? doc.customerName : doc.supplierName);
        const partyAddress = safeParty.address || safeParty.billingAddress || '';
        const partyLocationStr = [safeParty.city, safeParty.state].filter(Boolean).join(', ') + (safeParty.pincode ? ' - ' + safeParty.pincode : '');
        
        const partyGst = safeParty.gst ? String(safeParty.gst).toUpperCase() : '';
        const bizGst = biz && biz.gst ? String(biz.gst).toUpperCase() : '';
        
        const safeBizName = biz.name || 'Company Name';
        const safeBizAddress = biz.address || '';
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        
        // Handle Notes Mapping (Tick ✓ Check)
        let shouldPrintNotes = doc.printNotes;
        let rawNotes = doc.internalNotes || '';
        const uiCheckbox = document.getElementById(`${type}-print-notes`);
        const uiNotesBox = document.getElementById(`${type}-internal-notes`);
        if (uiCheckbox && uiNotesBox && uiCheckbox.offsetParent !== null) {
            shouldPrintNotes = uiCheckbox.checked;
            rawNotes = uiNotesBox.value;
        }
        
        const isNonGST = doc.invoiceType === 'Non-GST';
        const isReturn = doc.documentType === 'return';
        
        let isIGST = false;
        const bizState = String(biz.state || '').trim().toLowerCase();
        const partyState = String(safeParty.state || '').trim().toLowerCase();
        if (bizState && partyState && bizState !== partyState) isIGST = true;

        let title = isSales ? 'TAX INVOICE' : 'PURCHASE BILL';
        if (isNonGST && !isReturn) title = isSales ? 'BILL OF SUPPLY' : 'PURCHASE BILL';
        if (isReturn) title = isSales ? 'CREDIT NOTE' : 'DEBIT NOTE';

        const safeDocNo = doc.invoiceNo || doc.orderNo || doc.poNo || 'DRAFT';

        // 🚨 ENTERPRISE FIX: Move Debt Tracking UP so we can calculate the true "Paid Date" for the PDF Header!
        const grandTotal = parseFloat(doc.grandTotal) || 0;
        let linkedSum = 0;
        let lastPaymentDate = null;
        if (doc.linkedReceipts) {
            doc.linkedReceipts.forEach(r => {
                linkedSum += (parseFloat(r.amount) || 0);
                if (r.date && (!lastPaymentDate || new Date(r.date) > new Date(lastPaymentDate))) {
                    lastPaymentDate = r.date;
                }
            });
        }
        let displayTotalPaid = Math.max(parseFloat(doc.trueTotalPaid) || 0, linkedSum);
        if (doc.status === 'Completed' || doc.status === 'Paid') displayTotalPaid = grandTotal;
        const thisInvoiceDue = Math.max(0, grandTotal - displayTotalPaid);

        // Smart Dynamic Dates for the PDF Grid
        let titleDate2 = 'Completed Date';
        let valDate2 = window.Utils.formatDateDisplay(doc.completedDate) || '-';

        if (thisInvoiceDue <= 0.01 && lastPaymentDate) {
            titleDate2 = 'Paid On';
            valDate2 = window.Utils.formatDateDisplay(lastPaymentDate);
        }

        // 🚨 Base Math Logic
        let rawSubtotal = 0;
        let totalQty = 0;
        let totalItems = 0;
        (doc.items || []).forEach(item => {
            rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            totalQty += parseFloat(item.qty) || 0;
            totalItems++;
        });

        let discountAmt = doc.discountType === '%' ? (rawSubtotal * ((parseFloat(doc.discount) || 0) / 100)) : (parseFloat(doc.discount) || 0);
        if (rawSubtotal < 0 && discountAmt > 0) discountAmt = -discountAmt;
        if (Math.abs(discountAmt) > Math.abs(rawSubtotal)) discountAmt = rawSubtotal;
        const discountRatio = rawSubtotal !== 0 ? (discountAmt / rawSubtotal) : 0;

        // 🚨 TALLY: Top Meta Grid Layout (Professional Stacked Layout - UNIFORM HEIGHT FIX)
        const tallyHeaderGrid = [
            [
                // Outer Left - Company Details
                {
                    stack: [
                        {
                            columns: [
                                {
                                    width: '*',
                                    stack: [
                                        { text: safeBizName, bold: true, fontSize: 11, margin: [0,0,0,2] },
                                        { text: safeBizAddress, fontSize: 9 },
                                        { text: bizLocationStr, fontSize: 9 },
                                        { text: 'E-Mail: ' + (biz.email || 'N/A'), fontSize: 9, margin: [0,2,0,0] },
                                        { text: 'Contact: ' + (biz.phone || 'N/A'), fontSize: 9 },
                                        bizGst ? { text: 'GSTIN/UIN  : ' + bizGst, bold: true, fontSize: 9, margin: [0,4,0,0] } : null,
                                        biz.state ? { text: 'State Name : ' + biz.state, fontSize: 9 } : null
                                    ].filter(Boolean)
                                },
                                biz.logo ? { width: 55, image: biz.logo, fit: [55, 55], alignment: 'right' } : { width: 0, text: '' }
                            ]
                        }
                    ],
                    padding: [4, 4]
                },
                // Outer Right - Nested Table for Uniform Invoice Info (Fixes Stretching)
                {
                    colSpan: 2,
                    padding: [0, 0], // Remove padding for seamless nested table borders
                    table: {
                        widths: ['50%', '50%'],
                        body: [
                            [
                                { stack: [{ text: 'Invoice No.', fontSize: 7, color: '#475569' }, { text: safeDocNo, bold: true, fontSize: 9 }], padding: [4, 4] },
                                { stack: [{ text: 'Dated', fontSize: 7, color: '#475569' }, { text: window.Utils.formatDateDisplay(doc.date) || '-', bold: true, fontSize: 9 }], padding: [4, 4] }
                            ],
                            [
                                { stack: [{ text: 'Order Ref / PO No.', fontSize: 7, color: '#475569' }, { text: doc.orderNo || '-', bold: true, fontSize: 9 }], padding: [4, 4] },
                                { stack: [{ text: 'Order Date', fontSize: 7, color: '#475569' }, { text: window.Utils.formatDateDisplay(doc.orderDate) || '-', bold: true, fontSize: 9 }], padding: [4, 4] }
                            ],
                            [
                                { stack: [{ text: 'Dispatch Date', fontSize: 7, color: '#475569' }, { text: window.Utils.formatDateDisplay(doc.shippedDate) || '-', bold: true, fontSize: 9 }], padding: [4, 4] },
                                { stack: [{ text: titleDate2, fontSize: 7, color: '#475569' }, { text: valDate2, bold: true, fontSize: 9 }], padding: [4, 4] }
                            ],
                            [
                                {
                                    colSpan: 2,
                                    stack: [
                                        { text: 'Reference / Remarks', fontSize: 7, color: '#475569' },
                                        { text: (shouldPrintNotes && rawNotes) ? rawNotes : '-', bold: true, fontSize: 8 }
                                    ],
                                    padding: [4, 4]
                                },
                                ''
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
                        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0 : 0.5,
                        hLineColor: () => '#000000',
                        vLineColor: () => '#000000'
                    }
                },
                '' // Empty cell to satisfy colSpan: 2 of outer table
            ],
            [
                // Outer Left - Buyer Details
                {
                    stack: [
                        { text: isSales ? 'Buyer (Bill to)' : 'Supplier (Bill from)', fontSize: 8, color: '#475569', margin: [0,0,0,2] },
                        { text: partyName, bold: true, fontSize: 10 },
                        { text: partyAddress, fontSize: 9 },
                        { text: partyLocationStr, fontSize: 9 },
                        partyGst ? { text: 'GSTIN/UIN  : ' + partyGst, bold: true, fontSize: 9, margin: [0,4,0,0] } : null,
                        safeParty.state ? { text: 'State Name : ' + safeParty.state, fontSize: 9 } : null
                    ].filter(Boolean),
                    padding: [4, 4]
                },
                // Outer Right - Bank Details (UPGRADED WITH SHADING)
                {
                    colSpan: 2,
                    fillColor: '#f1f5f9', // <--- Adds the premium light-gray shading
                    stack: [
                        (!isNonGST && isSales && biz.bankDetails) ? { text: "Company's Bank Details", fontSize: 7, color: '#475569', margin: [0,0,0,2] } : null,
                        (!isNonGST && isSales && biz.bankDetails) ? { text: biz.bankDetails, bold: true, fontSize: 9 } : null,

                        (isNonGST && isSales && biz.upiId && thisInvoiceDue > 0.5 && doc.status !== 'Cancelled') ? {
                            columns: [
                                { qr: `upi://pay?pa=${biz.upiId}&pn=${encodeURIComponent(safeBizName)}&am=${thisInvoiceDue.toFixed(2)}&cu=INR`, fit: 45, margin: [0, 0, 8, 0] },
                                { stack: [{ text: 'Scan to Pay', italics: true, fontSize: 8, color: '#475569' }, { text: biz.upiId, fontSize: 9, bold: true }] }
                            ]
                        } : null,

                        (!isSales || (!biz.bankDetails && !isNonGST) || (isNonGST && (!biz.upiId || thisInvoiceDue <= 0.5))) ? { text: 'Payment Terms / Details', fontSize: 7, color: '#475569', margin: [0,0,0,2] } : null,
                        (!isSales || (!biz.bankDetails && !isNonGST) || (isNonGST && (!biz.upiId || thisInvoiceDue <= 0.5))) ? { text: biz.terms ? 'As per terms' : 'Immediate', bold: true, fontSize: 9 } : null
                    ].filter(Boolean),
                    padding: [4, 4]
                },
                '' // Empty cell for colSpan
            ]
        ];

        // 🚨 TALLY: Authentic Item Grid Setup
        const hsnMap = {};
        const itemsBody = [];
        
        // REVERT: Classic Light Gray Table Headers
        const thStyle = { bold: true, fontSize: 9, alignment: 'center', margin: [2, 4], fillColor: '#f1f5f9', color: '#0f172a' };
        
        itemsBody.push([
            {text: 'Sl\nNo.', ...thStyle}, 
            {text: 'Description of Goods', ...thStyle},
            {text: 'HSN/SAC', ...thStyle},
            {text: 'Quantity', ...thStyle}, 
            {text: 'Rate', ...thStyle},
            {text: 'per', ...thStyle},
            {text: 'Amount', ...thStyle}
        ]);

        let totalTaxableValue = 0;
        let totalCgstAmount = 0;
        let totalSgstAmount = 0;
        let totalIgstAmount = 0;

        (doc.items || []).forEach((item, index) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const gstPercent = isNonGST ? 0 : (parseFloat(item.gstPercent) || 0);
            
            const baseAmount = qty * rate;
            const discountedBase = baseAmount - (baseAmount * discountRatio); 
            const gstAmount = discountedBase * (gstPercent / 100);
            
            totalTaxableValue += discountedBase;

            let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
            if (isIGST) {
                igstAmt = gstAmount;
                totalIgstAmount += igstAmt;
            } else {
                cgstAmt = gstAmount / 2;
                sgstAmt = gstAmount / 2;
                totalCgstAmount += cgstAmt;
                totalSgstAmount += sgstAmt;
            }

            if (!isNonGST) {
                const hsnCode = item.hsn || '';
                const hsnKey = `${hsnCode}_${gstPercent}`;
                if (!hsnMap[hsnKey]) {
                    hsnMap[hsnKey] = { hsn: hsnCode, taxRate: gstPercent, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
                }
                hsnMap[hsnKey].taxable += discountedBase;
                hsnMap[hsnKey].cgst += cgstAmt;
                hsnMap[hsnKey].sgst += sgstAmt;
                hsnMap[hsnKey].igst += igstAmt;
                hsnMap[hsnKey].totalTax += gstAmount;
            }

            const tdStyle = { margin: [2, 4], fontSize: 9 };

            itemsBody.push([
                {text: (index + 1).toString(), alignment: 'center', ...tdStyle},
                {stack: [{text: item.name, bold: true}, item.desc ? {text: item.desc, fontSize: 8, color: '#475569'} : null].filter(Boolean), ...tdStyle},
                {text: item.hsn || '', alignment: 'center', ...tdStyle},
                {text: `${qty.toLocaleString('en-IN')} ${item.uom || ''}`, alignment: 'right', bold: true, ...tdStyle},
                {text: rate.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', ...tdStyle},
                {text: item.uom || 'Nos', alignment: 'center', ...tdStyle},
                {text: discountedBase.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, ...tdStyle}
            ]);
        });

        // 🚨 TALLY: Add Inline Tax Rows directly below the items
        const tdStyle = { margin: [2, 4], fontSize: 9 };
        let freightVal = parseFloat(doc.freightAmount || doc.freight || 0);

        if (discountAmt > 0) {
            itemsBody.push([ '', {text: 'Less: Discount', alignment: 'right', italics: true, ...tdStyle}, '', '', '', '', {text: '-' + discountAmt.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', ...tdStyle} ]);
        }
        
        if (!isNonGST) {
            if (isIGST && totalIgstAmount > 0) {
                itemsBody.push([ '', {text: 'Output IGST', alignment: 'right', bold: true, ...tdStyle}, '', '', '', '', {text: totalIgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, ...tdStyle} ]);
            } else {
                if (totalCgstAmount > 0) itemsBody.push([ '', {text: 'Output CGST', alignment: 'right', bold: true, ...tdStyle}, '', '', '', '', {text: totalCgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, ...tdStyle} ]);
                if (totalSgstAmount > 0) itemsBody.push([ '', {text: 'Output SGST', alignment: 'right', bold: true, ...tdStyle}, '', '', '', '', {text: totalSgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, ...tdStyle} ]);
            }
        }

        if (freightVal > 0) {
            itemsBody.push([ '', {text: 'Add: Freight & Forwarding Charges', alignment: 'right', ...tdStyle}, '', '', '', '', {text: freightVal.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', ...tdStyle} ]);
        }
        
        let exactTotalBeforeRound = totalTaxableValue + totalCgstAmount + totalSgstAmount + totalIgstAmount + freightVal;
        let roundOffAmt = (parseFloat(doc.grandTotal) || 0) - exactTotalBeforeRound;

        if (Math.abs(roundOffAmt) > 0.01) {
            itemsBody.push([ '', {text: 'Round Off', alignment: 'right', ...tdStyle}, '', '', '', '', {text: roundOffAmt.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', ...tdStyle} ]);
        }

        // 🚨 TALLY FIX: Smart A4 Page Stretch (UPGRADED FOR UNIFORM FULL-PAGE LAYOUT)
        let usedRows = (doc.items || []).length;
        if (discountAmt > 0) usedRows++;
        if (!isNonGST && isIGST && totalIgstAmount > 0) usedRows++;
        else if (!isNonGST && (totalCgstAmount > 0 || totalSgstAmount > 0)) usedRows += 2;
        if (freightVal > 0) usedRows++;
        if (Math.abs(roundOffAmt) > 0.01) usedRows++;

        let termsLines = biz.terms ? String(biz.terms).split('\n').length : 0;
        
        // INCREASED BASE SPACER: Pushes the footer all the way down to create a strict, uniform A4 size.
        // It dynamically subtracts height based on how many items/taxes you have so it never spills over to page 2.
        let dynamicSpacer = 300 - (usedRows * 18);
        if (!isNonGST) dynamicSpacer -= 65; // Make room for HSN Table
        dynamicSpacer -= (termsLines * 10); 
        
        dynamicSpacer = Math.max(20, dynamicSpacer); // Failsafe: NEVER let it go negative

        itemsBody.push([ 
            {text: '\n', margin: [0, dynamicSpacer, 0, 0]}, '', '', '', '', '', '' 
        ]);

        // Debt tracking was moved to the top of the function to support dynamic dates!
        let partyBalance = 0;
        if (window.UI && window.UI.state && window.UI.state.rawData) {
            let tDocs = 0, tReceipts = 0, tReturns = 0;
            const targetDocs = isSales ? window.UI.state.rawData.sales : window.UI.state.rawData.purchases;
            const partyKey = isSales ? 'customerId' : 'supplierId';
            
            targetDocs.forEach(s => {
                if (s[partyKey] === safeParty.id && s.status !== 'Cancelled' && s.status !== 'Open' && s.invoiceType === doc.invoiceType) {
                    if (s.documentType === 'return') tReturns += (parseFloat(s.grandTotal) || 0);
                    else tDocs += (parseFloat(s.grandTotal) || 0);
                }
            });

            (window.UI.state.rawData.cashbook || []).forEach(c => {
                if (c.ledgerId === safeParty.id) {
                    let isNonGstReceipt = c.taxPool === 'Non-GST';
                    const legacyRef = c.invoiceRef || c.linkedInvoice;
                    if (!c.taxPool || c.taxPool === 'All') {
                        isNonGstReceipt = true;
                        if (legacyRef) {
                            const firstRef = String(legacyRef).split(',')[0].trim();
                            const linkedDoc = targetDocs.find(d => d.id === firstRef || d.invoiceNo === firstRef || d.poNo === firstRef || d.orderNo === firstRef || String(d.id).endsWith(firstRef));
                            if (linkedDoc && linkedDoc.invoiceType !== 'Non-GST') isNonGstReceipt = false;
                        }
                    }
                    if ((doc.invoiceType === 'Non-GST' && isNonGstReceipt) || (doc.invoiceType !== 'Non-GST' && !isNonGstReceipt)) {
                        if (isSales) tReceipts += c.type === 'in' ? (parseFloat(c.amount) || 0) : -(parseFloat(c.amount) || 0);
                        else tReceipts += c.type === 'out' ? (parseFloat(c.amount) || 0) : -(parseFloat(c.amount) || 0);
                    }
                }
            });
            
            let ob = parseFloat(safeParty.openingBalance) || 0;
            let isAdv = isSales ? (String(safeParty.balanceType || 'Dr').includes('Pay') || String(safeParty.balanceType || 'Dr').includes('Cr')) : (String(safeParty.balanceType || 'Cr').includes('Receive') || String(safeParty.balanceType || 'Cr').includes('Debit'));
            let netOb = isAdv ? -ob : ob;
            if (doc.invoiceType !== 'Non-GST') netOb = 0; 

            partyBalance = netOb + tDocs - tReturns - tReceipts;
        }

        // UPGRADE: Highlighted Grand Total Row
        itemsBody.push([
            {text: 'Total', colSpan: 3, alignment: 'right', bold: true, margin: [4, 4], fillColor: '#e2e8f0'}, '', '',
            {text: totalQty.toLocaleString('en-IN'), alignment: 'right', bold: true, margin: [2, 4], fillColor: '#e2e8f0'}, 
            {text: '', fillColor: '#e2e8f0'}, {text: '', fillColor: '#e2e8f0'}, 
            {text: '₹' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, margin: [4, 4], fillColor: '#e2e8f0'}
        ]);

        // 🚨 TALLY: HSN/SAC Summary Grid
        const hsnBody = [];
        if (!isNonGST && Object.keys(hsnMap).length > 0) {
            // REVERT: Classic Light Gray HSN Headers
            const hsnTh = { style: 'th', bold: true, fontSize: 8, margin: [2,4], fillColor: '#f1f5f9', color: '#0f172a' };
            const hsnSub = { bold: true, fontSize: 8, fillColor: '#f1f5f9', color: '#0f172a' };
            
            let hsnHeaders = [
                {text: 'HSN/SAC', alignment: 'center', ...hsnTh},
                {text: 'Taxable\nValue', alignment: 'right', ...hsnTh}
            ];
            if (isIGST) {
                hsnHeaders.push({text: 'Integrated Tax', colSpan: 2, alignment: 'center', ...hsnTh}, '');
            } else {
                hsnHeaders.push({text: 'Central Tax', colSpan: 2, alignment: 'center', ...hsnTh}, '');
                hsnHeaders.push({text: 'State Tax', colSpan: 2, alignment: 'center', ...hsnTh}, '');
            }
            hsnHeaders.push({text: 'Total\nTax Amount', alignment: 'right', ...hsnTh});
            hsnBody.push(hsnHeaders);

            // Sub-Headers for Tax Rates
            let hsnSubHeaders = [
                {text: '', fillColor: '#f1f5f9'}, {text: '', fillColor: '#f1f5f9'}
            ];
            if (isIGST) {
                hsnSubHeaders.push({text: 'Rate', alignment: 'center', ...hsnSub}, {text: 'Amount', alignment: 'right', ...hsnSub});
            } else {
                hsnSubHeaders.push({text: 'Rate', alignment: 'center', ...hsnSub}, {text: 'Amount', alignment: 'right', ...hsnSub});
                hsnSubHeaders.push({text: 'Rate', alignment: 'center', ...hsnSub}, {text: 'Amount', alignment: 'right', ...hsnSub});
            }
            hsnSubHeaders.push({text: '', fillColor: '#f1f5f9'});
            hsnBody.push(hsnSubHeaders);

            let sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumTotalTax = 0;

            Object.values(hsnMap).forEach(h => {
                sumTaxable += h.taxable; sumCgst += h.cgst; sumSgst += h.sgst; sumIgst += h.igst; sumTotalTax += h.totalTax;
                let hsnRow = [
                    {text: h.hsn, margin: [2, 4], fontSize: 8, alignment: 'center'},
                    {text: h.taxable.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', margin: [2, 4], fontSize: 8}
                ];
                if (isIGST) {
                    hsnRow.push({text: `${h.taxRate}%`, alignment: 'center', margin: [2, 4], fontSize: 8});
                    hsnRow.push({text: h.igst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', margin: [2, 4], fontSize: 8});
                } else {
                    hsnRow.push({text: `${h.taxRate/2}%`, alignment: 'center', margin: [2, 4], fontSize: 8});
                    hsnRow.push({text: h.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', margin: [2, 4], fontSize: 8});
                    hsnRow.push({text: `${h.taxRate/2}%`, alignment: 'center', margin: [2, 4], fontSize: 8});
                    hsnRow.push({text: h.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', margin: [2, 4], fontSize: 8});
                }
                hsnRow.push({text: h.totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', margin: [2, 4], fontSize: 8});
                hsnBody.push(hsnRow);
            });

            // HSN Totals
            let hsnTotalRow = [
                {text: 'Total', alignment: 'right', bold: true, fontSize: 8, margin: [2,4]},
                {text: sumTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, fontSize: 8, margin: [2,4]}
            ];
            if (isIGST) {
                hsnTotalRow.push('');
                hsnTotalRow.push({text: sumIgst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, fontSize: 8, margin: [2,4]});
            } else {
                hsnTotalRow.push('');
                hsnTotalRow.push({text: sumCgst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, fontSize: 8, margin: [2,4]});
                hsnTotalRow.push('');
                hsnTotalRow.push({text: sumSgst.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, fontSize: 8, margin: [2,4]});
            }
            hsnTotalRow.push({text: sumTotalTax.toLocaleString('en-IN', {minimumFractionDigits: 2}), alignment: 'right', bold: true, fontSize: 8, margin: [2,4]});
            hsnBody.push(hsnTotalRow);
        }

        // 🚨 ULTIMATE DETAILED ACCOUNTING FOOTER (Payments & Dues)
        const detailedTotalsTable = [];
        
        // Only show breakdown if partial payments exist
        if (displayTotalPaid > 0.01) {
            detailedTotalsTable.push([{ text: 'Current Invoice Total', fontSize: 9, margin: [0, 2] }, { text: '₹' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}), fontSize: 9, bold: true, alignment: 'right', margin: [0, 2] }]);
            detailedTotalsTable.push([{ text: 'Less: Paid / Advanced', fontSize: 9, color: '#16a34a', margin: [0, 2] }, { text: '- ₹' + displayTotalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2}), fontSize: 9, bold: true, color: '#16a34a', alignment: 'right', margin: [0, 2] }]);
            detailedTotalsTable.push([{ text: 'Balance on this Invoice', fontSize: 9, bold: true, margin: [0, 4] }, { text: '₹' + thisInvoiceDue.toLocaleString('en-IN', {minimumFractionDigits: 2}), fontSize: 9, bold: true, alignment: 'right', margin: [0, 4] }]);
        } else {
            detailedTotalsTable.push([{ text: 'Balance on this Invoice', fontSize: 9, bold: true, margin: [0, 4] }, { text: '₹' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}), fontSize: 9, bold: true, alignment: 'right', margin: [0, 4] }]);
        }

        // Add Previous Dues and Net Payable
        if (partyBalance > 0.01 && (partyBalance - thisInvoiceDue > 0.01)) {
            detailedTotalsTable.push([{ text: 'Previous Dues (Other Bills)', fontSize: 9, color: '#475569', margin: [0, 4] }, { text: '₹' + (partyBalance - thisInvoiceDue).toLocaleString('en-IN', {minimumFractionDigits: 2}), fontSize: 9, alignment: 'right', margin: [0, 4] }]);
            detailedTotalsTable.push([{ text: 'TOTAL NET PAYABLE', bold: true, fontSize: 11, margin: [0, 6], fillColor: '#fee2e2', color: '#991b1b' }, { text: '₹' + partyBalance.toLocaleString('en-IN', {minimumFractionDigits: 2}), bold: true, fontSize: 11, alignment: 'right', fillColor: '#fee2e2', color: '#991b1b', margin: [0, 6] }]);
        }

        // Tally Base Configuration (Full A4 Size, Pure Monochome styling)
        const docDefinition = {
            pageSize: 'A4', 
            pageMargins: [15, 12, 15, 12], // 🚨 FIX: Maximum stretch to fit GST + Terms on one page!
            defaultStyle: { font: 'Roboto', fontSize: 9, color: '#000000' }, 
            content: [
                // 1. Tally Header Title (Original for Recipient)
                { text: isSales ? (window.solloCurrentCopyType || 'ORIGINAL FOR RECIPIENT') : '', alignment: 'right', fontSize: 7, bold: true, color: '#475569', margin: [0, -10, 0, 5] },
                                // UPGRADE: Premium Document Title
                { text: title, alignment: 'center', fontSize: 16, bold: true, color: '#334155', characterSpacing: 2, margin: [0, 0, 0, 5] },

                
                // 2. The Main Bordered Box (Contains Header Grid, Items Grid, and Footers)
                {
                    table: {
                        widths: ['*'],
                        body: [
                            // ROW 1: Header Meta Data Grid
                            [{
                                table: {
                                    widths: ['50%', '25%', '25%'],
                                    body: tallyHeaderGrid
                                },
                                layout: {
                                    hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000000', vLineColor: () => '#000000'
                                },
                                margin: [0, 0, 0, 0]
                            }],

                            // ROW 2: The Main Items Table
                            [{
                                table: {
                                    headerRows: 1,
                                    widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                                    body: itemsBody
                                },
                                layout: { 
                                    // TALLY MAGIC: Vertical lines only for items! No horizontal lines between rows.
                                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length) ? 0.5 : 0,
                                    vLineWidth: () => 0.5,
                                    hLineColor: () => '#000000',
                                    vLineColor: () => '#000000'
                                },
                                margin: [0, 0, 0, 0]
                            }],

                            // ROW 3: Amount in Words (UPGRADED CALLOUT BOX)
                            [{
                                fillColor: '#f8fafc',
                                text: [
                                    { text: 'Amount Chargeable (in words)\n', italics: true, fontSize: 8, color: '#475569' },
                                    { text: window.Utils.numberToWords(grandTotal), bold: true, fontSize: 11, color: '#0f172a' }
                                ],
                                margin: [4, 6]
                            }],

                            // ROW 4: HSN Summary (Only if GST applies)
                            ...(hsnBody.length > 0 ? [
                                [{
                                    table: { headerRows: 2, widths: isIGST ? ['auto', '*', 'auto', 'auto', 'auto'] : ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'], body: hsnBody },
                                    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000000', vLineColor: () => '#000000' },
                                    margin: [0, 0]
                                }]
                            ] : []),

                            // ROW 5: Detailed Payment Breakdown & Footer
                            [{
                                columns: [
                                    {
                                        width: '50%',
                                        stack: [
                                            // Bank Details & Remarks have been moved to the Top Header grid!
                                            biz.terms ? { text: 'Terms & Conditions:\n' + biz.terms, fontSize: 8, margin: [0,0,0,6] } : null,
                                            
                                            { text: 'Declaration', italics: true, fontSize: 8, color: '#475569', margin: [0, 0, 0, 2] },
                                            { text: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', fontSize: 8 }
                                        ].filter(Boolean),
                                        margin: [4, 6]
                                    },
                                    {
                                        width: '50%',
                                        stack: [
                                            // The Extensive Accounting Details Table
                                            {
                                                table: { widths: ['*', 'auto'], body: detailedTotalsTable },
                                                layout: { defaultBorder: false, hLineWidth: (i, node) => i === node.table.body.length - 1 && partyBalance > 0.01 ? 0.5 : 0, hLineColor: () => '#000000' },
                                                margin: [0, 4, 4, 5]
                                            },
                                            { text: `for ${safeBizName}`, bold: true, fontSize: 10, alignment: 'right', margin: [0, 4, 4, 5] },
                                            biz.signature ? { image: biz.signature, fit: [120, 40], alignment: 'right', margin: [0, 0, 4, 5] } : { text: '\n\n', margin: [0, 0, 0, 5] },
                                            { text: 'Authorised Signatory', fontSize: 9, alignment: 'right', margin: [0, 0, 4, 4] }
                                        ]
                                    }
                                ],
                                margin: [0, 0]
                            }]
                        ]
                    },
                    layout: { 
                        hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000000', vLineColor: () => '#000000' 
                    }
                },
                
                { text: 'SUBJECT TO ' + (biz.city ? String(biz.city).toUpperCase() : 'LOCAL') + ' JURISDICTION', alignment: 'center', fontSize: 8, margin: [0, 5, 0, 0], color: '#475569' },
                // UPGRADE: Professional Customer Service Sign-off
                { text: 'Thank you for your business!', alignment: 'center', italics: true, bold: true, fontSize: 11, margin: [0, 10, 0, 4], color: '#0f172a' },
                { text: 'SUBJECT TO ' + (biz.city ? String(biz.city).toUpperCase() : 'LOCAL') + ' JURISDICTION', alignment: 'center', fontSize: 8, margin: [0, 0, 0, 0], color: '#475569' },
                { text: 'This is a Computer Generated Document', alignment: 'center', fontSize: 8, margin: [0, 2, 0, 0], color: '#475569' }
            ]
        };

        doc.hideGlobalAdvanceBadge = true;

        // 🚨 PREVIEW UI RENDERING
        const viewer = document.createElement('div');
        viewer.id = 'in-app-pdf-viewer';
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
        viewer.innerHTML = `
            <div style="background:#ffffff; color:#0f172a; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size:16px;">Document Preview</div>
                    <div style="font-size:11px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Native Tally Format...</div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    ${isSales ? `<select id="pdf-copy-selector" style="padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 11px; font-weight: bold; color: #0f172a; outline: none; cursor: pointer;">
                        <option value="ORIGINAL FOR RECIPIENT">Original</option>
                        <option value="DUPLICATE FOR TRANSPORTER">Duplicate</option>
                        <option value="TRIPLICATE FOR SUPPLIER">Triplicate</option>
                    </select>` : ''}
                    <div id="pdf-header-actions" style="display: flex; gap: 12px; align-items: center; color:#475569;">
                        <span class="material-symbols-outlined tap-target" style="font-size:22px; display:none;" id="preview-action-print">print</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:22px; display:none;" id="preview-action-download">download</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:22px; display:none;" id="preview-action-share">share</span>
                        <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:26px; color:#ba1a1a; cursor:pointer;">close</span>
                    </div>
                </div>
            </div>
            <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                    <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
                </div>
                <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(viewer);

        // 🚨 Attach event listener for the Triplicate dropdown
        setTimeout(() => {
            const copySelector = document.getElementById('pdf-copy-selector');
            if (copySelector) {
                copySelector.value = window.solloCurrentCopyType || 'ORIGINAL FOR RECIPIENT';
                copySelector.addEventListener('change', (e) => {
                    window.solloCurrentCopyType = e.target.value;
                    viewer.remove(); // Destroy old preview
                    window.Utils.generateInvoicePDF(doc, biz, party, type); // Regenerate with new tag!
                });
            }
        }, 100);

        document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

        const safeFilenameDocNo = String(safeDocNo).replace(/[^a-zA-Z0-9_.-]/g, '-');
        const filename = `${title.replace(/ /g, '_')}_${safeFilenameDocNo}.pdf`;
        const shareText = `Dear ${partyName},\n\nPlease find attached the ${title} (${safeDocNo}) dated ${window.Utils.formatDateDisplay(doc.date)} for the amount of ₹${window.Utils.formatCurrency(parseFloat(doc.grandTotal) || 0)}.\n\nThank you!`;

        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        
        pdfDocGenerator.getBlob(async (blob) => {
            const file = new File([blob], filename, { type: 'application/pdf' });

            const btnDown = document.getElementById('preview-action-download');
            const btnShare = document.getElementById('preview-action-share');
            const btnPrint = document.getElementById('preview-action-print');

            btnDown.onclick = () => {
                pdfDocGenerator.download(filename);
                if (window.Utils) window.Utils.showToast("✅ Download Started!");
            };

            btnShare.onclick = async () => {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: filename,
                            text: shareText,
                            files: [file]
                        });
                    } catch (err) { console.log("Share cancelled."); }
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                    pdfDocGenerator.download(filename);
                }
            };
            
            btnPrint.onclick = () => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            try {
                if (typeof window.pdfjsLib === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const previewContent = document.getElementById('pdf-preview-content');
                previewContent.innerHTML = ''; 
                previewContent.style.flexDirection = 'column'; 
                previewContent.style.alignItems = 'center';
                previewContent.style.justifyContent = 'flex-start';

                for (let pageNum = 1; pageNum <= 1; pageNum++) { 
                    if (!document.getElementById('in-app-pdf-viewer')) break; 
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    canvas.style.borderRadius = '4px';
                    canvas.style.marginBottom = '16px'; 
                    canvas.style.flexShrink = '0';

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previewContent.appendChild(canvas);
                }

                document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
                document.getElementById('pdf-status-text').style.color = '#64748b';
                
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';

            } catch (err) {
                console.error("Preview Render Error:", err);
                document.getElementById('pdf-preview-content').innerHTML = `
                    <div style="text-align:center; margin-top:50px;">
                        <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                        <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                        <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                    </div>
                `;
                document.getElementById('pdf-status-text').innerText = "Ready";
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';
            }
        });
    },

    printReceivablesReport: async (reportData, grandTotal) => {
        if (typeof pdfMake === 'undefined') {
            if (window.Utils) window.Utils.showToast("⏳ Loading Vector Engine...");
            return;
        }

        window.Utils.showToast("⚡ Generating Premium Receivables Report...");
        const safeDocNo = window.Utils.getLocalDate();
        
        const firmId = typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1';
        const biz = await window.getRecordById('businessProfile', firmId) || {};
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

        const itemsBody = [
            [
                { text: 'Customer / Party Name', style: 'th' },
                { text: 'Contact No.', style: 'th', alignment: 'center' },
                { text: 'Outstanding (₹)', style: 'th', alignment: 'right' }
            ]
        ];

        reportData.forEach((row, index) => {
            let overdueText = '';
            try {
                if (window.UI && window.UI.state && window.UI.state.rawData && window.UI.state.rawData.sales) {
                    const partySales = window.UI.state.rawData.sales.filter(s => s.customerId === row.id && s.status !== 'Completed' && s.status !== 'Paid' && s.status !== 'Open' && s.status !== 'Cancelled' && s.documentType !== 'return');
                    if (partySales.length > 0) {
                        partySales.sort((a,b) => new Date(a.shippedDate || a.date) - new Date(b.shippedDate || b.date));
                        const oldestDate = new Date(partySales[0].shippedDate || partySales[0].date);
                        const daysOverdue = Math.floor(Math.abs(new Date() - oldestDate) / (1000 * 60 * 60 * 24));
                        
                        if (daysOverdue > 0) {
                            overdueText = ` (${daysOverdue} Days Overdue)`;
                        }
                    }
                }
            } catch(e) {}

            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            itemsBody.push([
                { text: row.name + overdueText, style: 'td', bold: true, fillColor: rowBg },
                { text: row.phone || '-', style: 'td', alignment: 'center', fillColor: rowBg },
                { text: '₹' + parseFloat(row.balance || 0).toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#dc2626', fillColor: rowBg }
            ]);
        });

        if (reportData.length === 0) {
            itemsBody.push([{ text: 'No pending receivables found.', style: 'td', colSpan: 3, alignment: 'center' }, {}, {}]);
        } else {
            itemsBody.push([
                { text: 'TOTAL MARKET DUES', style: 'td', colSpan: 2, alignment: 'right', bold: true, color: '#0f172a' },
                {},
                { text: '₹' + parseFloat(grandTotal || 0).toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#dc2626', fontSize: 14 }
            ]);
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 40], // Increased bottom margin
            footer: function(currentPage, pageCount) { 
                return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 9, color: '#64748b', margin: [0, 10, 0, 0] }; 
            },
            defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
            styles: {
                h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
                title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
                sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
                subBold: { fontSize: 9, bold: true, color: '#0f172a' },
                th: { fillColor: '#f1f5f9', bold: true, fontSize: 10, color: '#0f172a', margin: [2, 4] },
                td: { fontSize: 10, margin: [2, 4] }
            },
            content: [
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                biz.logo ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                                { text: biz.name || 'Company Name', style: 'h1' },
                                { text: (biz.address || '') + '\n' + bizLocationStr, style: 'sub' },
                                { text: 'Ph: ' + (biz.phone || ''), style: 'sub' }
                            ].filter(Boolean)
                        },
                        {
                            width: '40%',
                            stack: [
                                { text: 'MARKET RECEIVABLES', style: 'title' },
                                { text: 'DATE: ' + window.Utils.formatDateDisplay(safeDocNo), alignment: 'right', fontSize: 9, bold: true, color: '#475569', margin: [0, -5, 0, 10] },
                                { text: 'Total Outstanding', alignment: 'right', fontSize: 10, color: '#dc2626', margin: [0, 10, 0, 2] },
                                { text: '₹' + parseFloat(grandTotal || 0).toFixed(2), alignment: 'right', fontSize: 22, bold: true, color: '#991b1b' }
                            ].filter(Boolean)
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    table: { headerRows: 1, widths: ['*', 'auto', 'auto'], body: itemsBody },
                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { text: '*** End of Report ***', fontSize: 9, color: '#94a3b8', bold: true, alignment: 'left', width: '*' },
                        {
                            width: 200,
                            stack: [
                                biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                                { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] }
                            ]
                        }
                    ],
                    unbreakable: true 
                }
            ]
        };

        const viewer = document.createElement('div');
        viewer.id = 'in-app-pdf-viewer';
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
        viewer.innerHTML = `
            <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size:18px;">Report Preview</div>
                    <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
                </div>
                <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                    <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
                </div>
            </div>
            <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                    <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
                </div>
                <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(viewer);

        document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

        const safeFilename = `Receivables_Report_${safeDocNo}.pdf`;
        const shareText = "Here is the Market Receivables Report.";

        let pdfDocGenerator;
        try {
            pdfDocGenerator = pdfMake.createPdf(docDefinition);
        } catch (e) {
            window.Utils.showToast("❌ Error generating PDF structure.");
            viewer.remove();
            return;
        }

        pdfDocGenerator.getBlob(async (blob) => {
            document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
            document.getElementById('pdf-status-text').style.color = '#0061a4';

            const file = new File([blob], safeFilename, { type: 'application/pdf' });

            const btnDown = document.getElementById('preview-action-download');
            const btnShare = document.getElementById('preview-action-share');
            const btnPrint = document.getElementById('preview-action-print');

            btnDown.onclick = () => {
                pdfDocGenerator.download(safeFilename);
                if (window.Utils) window.Utils.showToast("✅ Download Started!");
            };

            btnShare.onclick = async () => {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                    } catch (err) {}
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked. Downloading instead...");
                    pdfDocGenerator.download(safeFilename);
                }
            };
            
            btnPrint.onclick = () => { pdfDocGenerator.print(); };

            try {
                if (typeof window.pdfjsLib === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const previewContent = document.getElementById('pdf-preview-content');
                previewContent.innerHTML = ''; 
                previewContent.style.flexDirection = 'column'; 
                previewContent.style.alignItems = 'center';
                previewContent.style.justifyContent = 'flex-start';

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    canvas.style.borderRadius = '4px';
                    canvas.style.marginBottom = '16px'; 
                    canvas.style.flexShrink = '0';

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previewContent.appendChild(canvas);
                }

                document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
                document.getElementById('pdf-status-text').style.color = '#64748b';
                
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';

            } catch (err) {
                document.getElementById('pdf-preview-content').innerHTML = "<div style='text-align:center; margin-top:50px;'><h3 style='color:#0f172a;'>PDF Generated</h3><p>Preview unavailable on this device.</p></div>";
                document.getElementById('pdf-status-text').innerText = "Ready";
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';
            }
        });
    },

    downloadStatementPDF: async () => {
        if (typeof pdfMake === 'undefined') {
            if (window.Utils) window.Utils.showToast("⏳ Loading Vector Engine...");
            return;
        }

        const nameEl = document.getElementById('report-party-name');
        if (!nameEl) return alert("Report data not found.");

        const partyName = nameEl.innerText.trim();
        let isAccount = false;
        
        let party = window.UI.state.rawData.ledgers.find(l => String(l.name || '').trim().toLowerCase() === partyName.toLowerCase());
        
        if (!party) {
            party = window.UI.state.rawData.accounts.find(a => String(a.name || '').trim().toLowerCase() === partyName.toLowerCase());
            if (!party && partyName.toLowerCase().includes('cash')) {
                party = { id: 'cash', name: 'Cash Drawer', type: 'Account', firmId: typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1' };
            }
            if (party) isAccount = true;
        }
        
        let isItem = false;
        if (!party && partyName.toLowerCase().startsWith('item ledger:')) {
            const rawItemName = partyName.replace(/item ledger:\s*/i, '').trim();
            party = window.UI.state.rawData.items.find(i => String(i.name || '').trim().toLowerCase() === rawItemName.toLowerCase());
            if (party) {
                isItem = true;
                party.type = 'Item';
            }
        }
        
        if (!party) return alert("Could not identify details for: " + partyName);

        if (window.Utils) window.Utils.showToast("⚡ Generating Vector Statement PDF...");

        const biz = (party.firmId) ? await window.getRecordById('businessProfile', party.firmId) || {} : {};
        const timeline = window.UI.state.rawData.timeline || [];
        
        let finalBal = 0;
        if (timeline.length > 0) finalBal = timeline[timeline.length - 1].runningBalance || 0;

        const itemsBody = [
            [
                { text: 'Date', style: 'th', alignment: 'center' },
                { text: 'Particulars / Voucher Type', style: 'th' },
                { text: 'Debit (Dr)', style: 'th', alignment: 'right' },
                { text: 'Credit (Cr)', style: 'th', alignment: 'right' },
                { text: 'Balance', style: 'th', alignment: 'right' }
            ]
        ];

        let totalDebit = 0;
        let totalCredit = 0;
        
        timeline.forEach((t) => {
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

            if (debit) totalDebit += parseFloat(debit);
            if (credit) totalCredit += parseFloat(credit);

            let particularsStack = [];
            let mainDesc = t.id === 'open-bal' ? 'Opening Balance' : `${t.type || t.desc} ${t.ref ? '/ ' + t.ref : ''}`;
            if (t.partyName && t.partyName !== 'Unknown') mainDesc += ` (${t.partyName})`;
            particularsStack.push({ text: mainDesc, bold: true });

            if (t.isInvoice && window.UI && window.UI.state && window.UI.state.rawData) {
                let inv = null;
                if (party.type === 'Customer' && window.UI.state.rawData.sales) inv = window.UI.state.rawData.sales.find(s => s.id === t.id);
                else if (party.type === 'Supplier' && window.UI.state.rawData.purchases) inv = window.UI.state.rawData.purchases.find(p => p.id === t.id);

                if (inv) {
                    const gstAmt = parseFloat(inv.totalGst) || 0;
                    const baseAmt = (parseFloat(inv.grandTotal) || 0) - gstAmt;
                    if (gstAmt > 0) {
                        particularsStack.push({ text: `Base: ₹${baseAmt.toFixed(2)} | GST: ₹${gstAmt.toFixed(2)}`, fontSize: 8, color: '#0369a1', margin: [0, 2, 0, 0] });
                    } else if (inv.invoiceType === 'Non-GST') {
                        particularsStack.push({ text: `Non-GST Bill`, fontSize: 8, color: '#b45309', margin: [0, 2, 0, 0] });
                    }
                }
            }

            itemsBody.push([
                { text: window.Utils.formatDateDisplay(t.date), style: 'td', alignment: 'center' },
                { stack: particularsStack, style: 'td' },
                { text: debit ? debit : '', style: 'td', alignment: 'right' },
                { text: credit ? credit : '', style: 'td', alignment: 'right' },
                { text: `${Math.abs(t.runningBalance || 0).toFixed(2)} ${Math.abs(t.runningBalance || 0) < 0.01 ? '' : ((t.runningBalance || 0) > 0 ? 'Dr' : 'Cr')}`, style: 'td', alignment: 'right', bold: true }
            ]);
        });

        if (timeline.length > 0) {
            itemsBody.push([
                { text: 'TOTAL', style: 'td', colSpan: 2, alignment: 'right', bold: true, color: '#0f172a' },
                {},
                { text: totalDebit.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' },
                { text: totalCredit.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' },
                { text: '', style: 'td' }
            ]);
        } else {
            itemsBody.push([{ text: 'No transactions found.', style: 'td', colSpan: 5, alignment: 'center' }, {}, {}, {}, {}]);
        }

        const safeDocNo = window.Utils.getLocalDate();
        let balSuffix = 'Available';
        let splitStack = [];

        if (!isAccount) {
            if (Math.abs(finalBal) < 0.01) {
                balSuffix = 'Settled (Nil)';
            } else if (party.type === 'Customer') {
                balSuffix = finalBal > 0 ? 'Dr (Due)' : 'Cr (Advance)';
            } else {
                balSuffix = finalBal < 0 ? 'Cr (To Pay)' : 'Dr (Advance)';
            }

            if ((party.type === 'Customer' && finalBal > 0.01) || (party.type === 'Supplier' && finalBal < -0.01)) {
                let debitsGst = 0;
                let debitsNon = 0;
                const exactPaymentMap = {};
                const exactReturnMap = {};

                if (window.UI && window.UI.state && window.UI.state.rawData) {
                    (window.UI.state.rawData.cashbook || []).forEach(c => {
                        if (c.ledgerId === party.id && c.invoiceRef) {
                            let amt = parseFloat(c.amount) || 0;
                            const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                            let remainingAmt = amt;
                            refs.forEach(ref => {
                                if (remainingAmt <= 0) return;
                                exactPaymentMap[ref] = (exactPaymentMap[ref] || 0) + (amt / refs.length);
                            });
                        }
                    });

                    const relatedDocs = party.type === 'Customer' ? (window.UI.state.rawData.sales || []) : (window.UI.state.rawData.purchases || []);

                    relatedDocs.forEach(d => {
                        if (d.documentType === 'return' && d.status !== 'Open' && d.orderNo && (party.type === 'Customer' ? d.customerId === party.id : d.supplierId === party.id)) {
                            exactReturnMap[d.orderNo] = (exactReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                        }
                    });

                    relatedDocs.forEach(doc => {
                        const partyMatch = party.type === 'Customer' ? doc.customerId === party.id : doc.supplierId === party.id;
                        if (partyMatch && doc.status !== 'Open' && doc.documentType !== 'return') {
                            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
                            const paid = uniqueRefs.reduce((sum, ref) => sum + (exactPaymentMap[ref] || 0), 0);
                            const returned = uniqueRefs.reduce((sum, ref) => sum + (exactReturnMap[ref] || 0), 0);
                            
                            const docTotal = parseFloat(doc.grandTotal) || 0;
                            const finalUnpaid = Math.max(0, docTotal - paid - returned);
                            
                            if (finalUnpaid > 0.01) {
                                if (doc.invoiceType === 'Non-GST') debitsNon += finalUnpaid;
                                else debitsGst += finalUnpaid;
                            }
                        }
                    });
                }

                const exactTargetBalance = Math.abs(finalBal);
                const trackedDebt = debitsGst + debitsNon;

                if (exactTargetBalance < trackedDebt) {
                    const excessCredit = trackedDebt - exactTargetBalance;
                    if (excessCredit >= debitsGst) {
                        let remaining = excessCredit - debitsGst;
                        debitsGst = 0;
                        debitsNon = Math.max(0, debitsNon - remaining);
                    } else {
                        debitsGst -= excessCredit;
                    }
                } else if (exactTargetBalance > trackedDebt) {
                    const missingDebt = exactTargetBalance - trackedDebt;
                    let hasGst = party.gst && String(party.gst).trim().length > 4;
                    if (!hasGst) debitsNon += missingDebt;
                    else debitsGst += missingDebt;
                }

                if (debitsGst > 0.01 || debitsNon > 0.01) {
                    if (debitsGst > 0.01) splitStack.push({ text: `GST Due: ₹${window.Utils.formatCurrency(debitsGst)}`, fontSize: 9, bold: true, color: '#0f172a' });
                    if (debitsNon > 0.01) splitStack.push({ text: `Non-GST Due: ₹${window.Utils.formatCurrency(debitsNon)}`, fontSize: 9, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] });
                }
            }
        }

        const statementBizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        const statementPartyLocationStr = [party.city, party.state].filter(Boolean).join(', ') + (party.pincode ? ' - ' + party.pincode : '');

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 40], // Increased bottom margin
            footer: function(currentPage, pageCount) { 
                return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 9, color: '#64748b', margin: [0, 10, 0, 0] }; 
            },
            defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
            styles: {
                h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
                title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
                sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
                subBold: { fontSize: 9, bold: true, color: '#0f172a' },
                sectionTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 5], decoration: 'underline' },
                th: { fillColor: '#f1f5f9', bold: true, fontSize: 9, color: '#0f172a', margin: [2, 4] },
                td: { fontSize: 9, margin: [2, 4] }
            },
            content: [
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                biz.logo ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                                { text: biz.name || 'Company Name', style: 'h1' },
                                { text: (biz.address || '') + '\n' + statementBizLocationStr, style: 'sub' },
                                { text: 'Ph: ' + (biz.phone || ''), style: 'sub' }
                            ].filter(Boolean)
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: isAccount ? 'ACCOUNT STATEMENT' : 'LEDGER STATEMENT', style: 'title' },
                                { text: 'DATE: ' + window.Utils.formatDateDisplay(safeDocNo), alignment: 'right', fontSize: 9, bold: true, color: '#475569', margin: [0, -5, 0, 10] },
                                { text: 'Closing Balance', alignment: 'right', fontSize: 9, color: '#64748b', margin: [0, 10, 0, 2] },
                                { text: '₹' + Math.abs(finalBal).toFixed(2), alignment: 'right', fontSize: 20, bold: true, color: '#0f172a' },
                                { text: balSuffix, alignment: 'right', fontSize: 10, bold: true, color: Math.abs(finalBal) < 0.01 ? '#64748b' : (finalBal > 0 ? '#16a34a' : '#ef4444'), margin: [0, 2, 0, 5] },
                                splitStack.length > 0 ? { stack: splitStack, alignment: 'right', margin: [0, 5, 0, 0] } : null
                            ].filter(Boolean)
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    stack: [
                        { text: isAccount ? 'ACCOUNT DETAILS' : 'PARTY DETAILS', style: 'sectionTitle' },
                        { text: party.name, bold: true, fontSize: 12 },
                        { text: (party.address || '') + '\n' + statementPartyLocationStr, style: 'sub', margin: [0, 2, 0, 0] },
                        party.phone ? { text: 'Ph: ' + party.phone, style: 'sub' } : null,
                        party.gst ? { text: 'GSTIN: ' + String(party.gst).toUpperCase(), style: 'subBold', margin: [0, 2, 0, 0] } : null
                    ].filter(Boolean),
                    margin: [0, 0, 0, 15]
                },
                {
                    table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: itemsBody },
                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { text: '*** End of Statement ***', fontSize: 9, color: '#94a3b8', bold: true, alignment: 'left', width: '*' },
                        {
                            width: 200,
                            stack: [
                                biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                                { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] }
                            ]
                        }
                    ],
                    unbreakable: true 
                }
            ]
        };

        const viewer = document.createElement('div');
        viewer.id = 'in-app-pdf-viewer';
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
        viewer.innerHTML = `
            <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size:18px;">Statement Preview</div>
                    <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
                </div>
                <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                    <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
                </div>
            </div>
            <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                    <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
                </div>
                <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(viewer);

        document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

        const docTitle = isAccount ? 'Account_Statement' : 'Ledger_Statement';
        const cleanPartyName = partyName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeFilename = `${docTitle}_${cleanPartyName}_${safeDocNo}.pdf`;
        const shareText = `Dear ${partyName},\n\nPlease find attached your ledger statement.\n\nThank you!`;

        let pdfDocGenerator;
        try {
            pdfDocGenerator = pdfMake.createPdf(docDefinition);
        } catch (e) {
            window.Utils.showToast("❌ Error generating PDF structure.");
            viewer.remove();
            return;
        }

        pdfDocGenerator.getBlob(async (blob) => {
            document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
            document.getElementById('pdf-status-text').style.color = '#0061a4';

            const file = new File([blob], safeFilename, { type: 'application/pdf' });

            const btnDown = document.getElementById('preview-action-download');
            const btnShare = document.getElementById('preview-action-share');
            const btnPrint = document.getElementById('preview-action-print');

            btnDown.onclick = () => {
                pdfDocGenerator.download(safeFilename);
                if (window.Utils) window.Utils.showToast("✅ Download Started!");
            };

            btnShare.onclick = async () => {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                    } catch (err) { console.log("Share cancelled."); }
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                    pdfDocGenerator.download(safeFilename);
                }
            };
            
            btnPrint.onclick = () => {
                pdfDocGenerator.print();
            };

            try {
                if (typeof window.pdfjsLib === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const previewContent = document.getElementById('pdf-preview-content');
                previewContent.innerHTML = ''; 
                previewContent.style.flexDirection = 'column'; 
                previewContent.style.alignItems = 'center';
                previewContent.style.justifyContent = 'flex-start'; // 🚨 NEW: Fixes the missing first page scroll bug

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) { // Keeps all pages loading for these reports
                    if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    canvas.style.borderRadius = '4px';
                    canvas.style.marginBottom = '16px'; 
                    canvas.style.flexShrink = '0';

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previewContent.appendChild(canvas);
                }

                document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
                document.getElementById('pdf-status-text').style.color = '#64748b';
                
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';

            } catch (err) {
                document.getElementById('pdf-preview-content').innerHTML = `
                    <div style="text-align:center; margin-top:50px;">
                        <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                        <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                        <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                    </div>
                `;
                document.getElementById('pdf-status-text').innerText = "Ready";
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';
            }
        });
    },

    // ==========================================
    // ENTERPRISE UPGRADE: PARTY-FILTERED ITEM LEDGER PDF
    // ==========================================
    executeItemLedgerReport: async (itemId, itemName, partyId = null, partyName = null, searchText = '', typeFilter = 'ALL', dateFilter = '', actionType = 'preview') => {
        if (typeof pdfMake === 'undefined') {
            if (window.Utils) window.Utils.showToast("⏳ Loading Vector Engine...");
            return;
        }

        if (window.Utils) window.Utils.showToast("⚡ Generating Premium Stock Ledger...");
        
        const activeFirmId = (typeof app !== 'undefined' && app.state) ? app.state.firmId : 'firm1';
        const biz = await window.getRecordById('businessProfile', activeFirmId) || {};
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

        const product = await window.getRecordById('items', itemId);
        const openingStock = (product && !partyId) ? (parseFloat(product.openingStock) || 0) : 0;

        let timeline = [];
        
        const sales = await window.getAllRecords('sales');
        sales.forEach(s => {
            if(s.status !== 'Open' && s.status !== 'Cancelled' && s.firmId === activeFirmId && (!partyId || s.customerId === partyId)) {
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
            if(p.status !== 'Open' && p.status !== 'Cancelled' && p.firmId === activeFirmId && (!partyId || p.supplierId === partyId)) {
                (p.items || []).forEach(row => {
                    if(row.itemId === itemId) {
                        const isReturn = p.documentType === 'return';
                        const qty = parseFloat(row.qty) || 0;
                        timeline.push({ id: p.id, date: p.date, type: isReturn ? 'Purchase Return' : 'Purchase', desc: p.supplierName || 'Unknown Party', ref: p.invoiceNo || p.poNo || p.id.slice(-4).toUpperCase(), inQty: isReturn ? 0 : qty, outQty: isReturn ? qty : 0 });
                    }
                });
            }
        });

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

        timeline.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;
            const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
            const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
            return timeA - timeB;
        });

        let runningStock = openingStock;
        timeline.forEach(t => {
            runningStock += t.inQty;
            runningStock -= t.outQty;
            t.trueRunningBalance = runningStock; 
        });

        const trueFinalStock = runningStock;

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
        
        const itemsBody = [
            [
                { text: 'Date', style: 'th', alignment: 'center' },
                { text: 'Type', style: 'th' },
                { text: 'Particulars & Ref', style: 'th' },
                { text: 'Stock IN', style: 'th', alignment: 'center' },
                { text: 'Stock OUT', style: 'th', alignment: 'center' },
                { text: 'Running Bal', style: 'th', alignment: 'right' }
            ]
        ];

        if (!partyId && !dateFilter) {
            itemsBody.push([
                { text: 'Opening', style: 'td', color: '#475569', alignment: 'center' },
                { text: 'Opening Stock', style: 'td', bold: true },
                { text: 'Initial Inventory Balance', style: 'td' },
                { text: openingStock > 0 ? openingStock.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
                { text: openingStock < 0 ? Math.abs(openingStock).toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
                { text: openingStock.toFixed(2), style: 'td', alignment: 'right', bold: true }
            ]);
        }

        timeline.forEach(t => {
            totalIn += t.inQty;
            totalOut += t.outQty;
            
            itemsBody.push([
                { text: window.Utils.formatDateDisplay(t.date), style: 'td', alignment: 'center', color: '#475569' },
                { text: t.type, style: 'td', bold: true },
                { stack: [{ text: t.desc }, { text: 'Ref: ' + t.ref, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] }], style: 'td' },
                { text: t.inQty > 0 ? t.inQty.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
                { text: t.outQty > 0 ? t.outQty.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
                { text: t.trueRunningBalance.toFixed(2), style: 'td', alignment: 'right', bold: true }
            ]);
        });

        const finalDisplayBalance = trueFinalStock;

        itemsBody.push([
            { text: 'Total Volume Summary', style: 'td', colSpan: 3, alignment: 'right', bold: true, color: '#0f172a' },
            {}, {},
            { text: totalIn.toFixed(2), style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
            { text: totalOut.toFixed(2), style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
            { text: finalDisplayBalance.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' }
        ]);

        const reportSubtitle = partyId ? `Filtered By Party: ${partyName}` : (dateFilter ? `Filtered By Date: ${dateFilter}` : 'Global Stock Movement');

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 40], // Increased bottom margin
            footer: function(currentPage, pageCount) { 
                return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 9, color: '#64748b', margin: [0, 10, 0, 0] }; 
            },
            defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
            styles: {
                h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
                title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
                sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
                subBold: { fontSize: 9, bold: true, color: '#0f172a' },
                sectionTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 5], decoration: 'underline' },
                th: { fillColor: '#f1f5f9', bold: true, fontSize: 9, color: '#0f172a', margin: [2, 4] },
                td: { fontSize: 9, margin: [2, 4] }
            },
            content: [
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                biz.logo ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                                { text: biz.name || 'Company Name', style: 'h1' },
                                { text: 'Official Stock Ledger & Inventory Audit', style: 'sub' }
                            ].filter(Boolean)
                        },
                        {
                            width: '40%',
                            stack: [
                                { text: 'STOCK LEDGER', style: 'title' },
                                { text: 'DATE: ' + window.Utils.formatDateDisplay(window.Utils.getLocalDate()), alignment: 'right', fontSize: 9, bold: true, color: '#475569', margin: [0, -5, 0, 10] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                { text: 'Product / Item Name', style: 'subBold', color: '#64748b' },
                                { text: itemName || 'Unknown Item', bold: true, fontSize: 14 }
                            ]
                        },
                        {
                            width: '40%',
                            stack: [
                                { text: 'Filter Scope', style: 'subBold', color: '#64748b', alignment: 'right' },
                                { text: reportSubtitle, bold: true, fontSize: 11, alignment: 'right' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 15]
                },
                {
                    table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'], body: itemsBody },
                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: 'LEDGER SUMMARY', style: 'sectionTitle' },
                                { text: `Total Stock IN:  + ${totalIn.toFixed(2)}`, color: '#16a34a', bold: true, margin: [0, 2, 0, 0] },
                                { text: `Total Stock OUT: - ${totalOut.toFixed(2)}`, color: '#dc2626', bold: true, margin: [0, 2, 0, 0] }
                            ]
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: 'Closing Stock Balance', alignment: 'right', fontSize: 9, color: '#64748b', margin: [0, 0, 0, 2] },
                                { text: finalDisplayBalance.toFixed(2), alignment: 'right', fontSize: 20, bold: true, color: '#0f172a' },
                                { text: finalDisplayBalance > 0 ? 'Net Surplus (IN)' : (finalDisplayBalance < 0 ? 'Net Deficit (OUT)' : 'Zero Balance'), alignment: 'right', fontSize: 10, bold: true, color: finalDisplayBalance > 0 ? '#16a34a' : (finalDisplayBalance < 0 ? '#dc2626' : '#475569') }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { text: '*** End of Ledger ***', fontSize: 9, color: '#94a3b8', bold: true, alignment: 'left', width: '*' },
                        {
                            width: 200,
                            stack: [
                                biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                                { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] }
                            ]
                        }
                    ],
                    unbreakable: true 
                }
            ]
        };

        const viewer = document.createElement('div');
        viewer.id = 'in-app-pdf-viewer';
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
        viewer.innerHTML = `
            <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                    <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
                </div>
                <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                    <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
                </div>
            </div>
            <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                    <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
                </div>
                <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(viewer);

        document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

        const safeItemName = itemName ? String(itemName).replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Item';
        const safePartyStr = partyName ? `_${String(partyName).replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        const safeFilename = `Stock_Ledger_${safeItemName}${safePartyStr}.pdf`;
        const shareText = `Please find attached the Stock Ledger for ${itemName}.`;

        let pdfDocGenerator;
        try {
            pdfDocGenerator = pdfMake.createPdf(docDefinition);
        } catch (e) {
            window.Utils.showToast("❌ Error generating PDF structure.");
            viewer.remove();
            return;
        }

        if (actionType === 'share') {
            pdfDocGenerator.getBlob(async (blob) => {
                const file = new File([blob], safeFilename, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                    } catch (err) { console.log("Share cancelled."); }
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                    pdfDocGenerator.download(safeFilename);
                }
                viewer.remove();
            });
            return;
        }

        pdfDocGenerator.getBlob(async (blob) => {
            document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
            document.getElementById('pdf-status-text').style.color = '#0061a4';

            const file = new File([blob], safeFilename, { type: 'application/pdf' });

            const btnDown = document.getElementById('preview-action-download');
            const btnShare = document.getElementById('preview-action-share');
            const btnPrint = document.getElementById('preview-action-print');

            btnDown.onclick = () => {
                pdfDocGenerator.download(safeFilename);
                if (window.Utils) window.Utils.showToast("✅ Download Started!");
            };

            btnShare.onclick = async () => {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                    } catch (err) { console.log("Share cancelled."); }
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                    pdfDocGenerator.download(safeFilename);
                }
            };
            
            btnPrint.onclick = () => {
                pdfDocGenerator.print();
            };

            try {
                if (typeof window.pdfjsLib === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const previewContent = document.getElementById('pdf-preview-content');
                previewContent.innerHTML = ''; 
                previewContent.style.flexDirection = 'column'; 
                previewContent.style.alignItems = 'center';
                previewContent.style.justifyContent = 'flex-start'; // 🚨 NEW: Fixes the missing first page scroll bug

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) { // Keeps all pages loading for these reports
                    if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    canvas.style.borderRadius = '4px';
                    canvas.style.marginBottom = '16px'; 
                    canvas.style.flexShrink = '0';

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previewContent.appendChild(canvas);
                }

                document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
                document.getElementById('pdf-status-text').style.color = '#64748b';
                
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';

            } catch (err) {
                document.getElementById('pdf-preview-content').innerHTML = `
                    <div style="text-align:center; margin-top:50px;">
                        <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                        <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                        <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                    </div>
                `;
                document.getElementById('pdf-status-text').innerText = "Ready";
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';
            }
        });
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
                ["B2C Sales (Unregistered)", reportData.gstr1.b2cTaxable, reportData.gstr1.b2cTax],
                ["Nil Rated / Exempt / Non-GST Sales", reportData.gstr1.nilRatedTaxable || 0, 0],
                [],
                ["GSTR-2 (PURCHASES) BREAKDOWN"],
                ["Category", "Taxable Value", "Tax Amount"],
                ["Total GST Purchases (ITC)", reportData.gstr2.totalTaxable, reportData.gstr2.totalTax],
                ["Nil Rated / Exempt / Non-GST Purchases", reportData.gstr2.nilRatedTaxable || 0, 0]
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
            // 🚀 ENTERPRISE UPGRADE: Asynchronous Yield Engine
            for (let i = 0; i < reportData.rawSales.length; i++) {
                let s = reportData.rawSales[i];
                if (s.invoiceType !== 'Non-GST') {
                    
                    // 🚨 ENTERPRISE FIX: Use the historical snapshot from the invoice first!
                    let gstin = s.customerGst || s.gstin || '';
                    if (!gstin) {
                        let cust = ledgers.find(l => String(l.id) === String(s.customerId));
                        gstin = cust && cust.gst ? cust.gst : '';
                    }
                    
                    // CRITICAL TAX FIX: Match db.js! A valid GSTIN must be exactly 15 characters to enter the B2B Sheet!
                    if (gstin && gstin.trim().length === 15) {
                        // ENTERPRISE FIX: The Blank B2B Taxable Value Exploit!
                        let exactTaxable = parseFloat(s.subtotal);
                        if (isNaN(exactTaxable) || exactTaxable === 0) {
                            let rawSubtotal = 0;
                            (s.items || []).forEach(item => { rawSubtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0); });
                            let discountAmt = s.discountType === '%' ? (rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) : (parseFloat(s.discount) || 0);
                            if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
                            exactTaxable = rawSubtotal - discountAmt;
                        }
                        
                        // 🚨 ENTERPRISE FIX: The Double-Negative Shield
                        let taxable = Math.abs(exactTaxable) * (s.documentType === 'return' ? -1 : 1);
                        let tax = Math.abs(parseFloat(s.totalGst) || 0) * (s.documentType === 'return' ? -1 : 1);
                        let total = Math.abs(parseFloat(s.grandTotal) || 0) * (s.documentType === 'return' ? -1 : 1);
                        b2bData.push([s.date, s.invoiceNo, s.customerName || '', String(gstin).toUpperCase(), taxable, tax, total]);
                    }
                }
                // Yield to main thread every 50 records so the loading spinner doesn't freeze!
                if (i % 50 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }
            const wsB2B = XLSX.utils.aoa_to_sheet(b2bData);
            XLSX.utils.book_append_sheet(wb, wsB2B, "B2B Sales");

            // Generate and Download Excel File
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const file = new File([blob], `GST_Report_${reportData.month}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ title: "SOLLO GST Excel", text: "Here is your Excel GST Report.", files: [file] });
                } catch (e) { console.log("Share cancelled by user."); }
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
            try {
                await navigator.share({ title: filename, files: [file] });
            } catch (e) { console.log("Share cancelled by user."); }
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
    // STRICT ERP LOGIC: NATIVE WEB SHARE API ENGINE
    // ==========================================
    sharePDF: async (elementId, filename, shareText = "Here is your document.", forceDownload = false) => {
        try {
            if (typeof html2pdf === 'undefined' || typeof html2canvas === 'undefined') {
                window.Utils.showToast("⏳ Downloading Share Engine... Just a moment.");
                
                const loadScript = (id, src) => new Promise((resolve, reject) => {
                    if (document.getElementById(id)) return resolve();
                    const script = document.createElement('script');
                    script.id = id;
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });

                try {
                    await Promise.all([
                        loadScript('script-h2c', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
                        loadScript('script-h2p', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
                    ]);
                    // Re-run the function safely now that scripts are definitively loaded
                    return window.Utils.sharePDF(elementId, filename, shareText, forceDownload);
                } catch (error) {
                    console.error(error);
                    if (window.Utils && window.Utils.showToast) window.Utils.showToast("❌ Failed to load Share Engine. Check internet connection.");
                    return;
                }
            }

            const el = document.getElementById(elementId);
            if (!el) return;
            
            // Yield the main thread so the UI registers the tap before freezing to generate the PDF!
            await new Promise(res => setTimeout(res, 50));

            // ENTERPRISE FIX: Measure true desktop height BEFORE running the engine to kill blank space!
            const origW = el.style.width;
            const origMinW = el.style.minWidth;
            const origMaxW = el.style.maxWidth;
            const origPos = el.style.position;
            
            // 🚨 SOLLO FIX: Force EXACT A4 Dimensions for Native Background Sharing!
            el.style.setProperty('width', '800px', 'important');
            el.style.setProperty('min-width', '800px', 'important');
            el.style.setProperty('max-width', '800px', 'important');
            el.style.setProperty('min-height', '1131px', 'important'); // Forces A4 ratio!
            el.style.position = 'absolute';
            
            const exactHeight = el.scrollHeight;
            
            // Cleanup
            el.style.width = origW;
            el.style.minWidth = origMinW;
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
                    scale: 2.0, /* 🚀 ENTERPRISE FIX: Upgraded to Scale 2.0 for perfectly crisp A4 printing */
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
                image: { type: 'jpeg', quality: 0.90 }, // 🚨 RAM FIX: 0.90 saves ~60% memory vs 1.0!
                // 🚀 SOLLO ERP FIX: SINGLE-PAGE SEAMLESS INVOICE ENGINE
                jsPDF: { unit: 'px', format: [800, exactHeight + 10], orientation: 'portrait', compress: true }
            };

            let pdfBlob;
            try {
                // Generates the PDF Blob in memory
                pdfBlob = await window.html2pdf().set(opt).from(el).outputPdf('blob');
            } catch (genErr) {
                console.error("PDF Engine RAM Exhaustion Error:", genErr);
                if (document.getElementById('pdf-share-blocker')) document.getElementById('pdf-share-blocker').remove();
                // 🚨 ENTERPRISE FIX: Ultimate Fallback to Native Browser Print if RAM is completely exhausted!
                alert("The document is too large to share directly on this device. Falling back to Native Print.");
                
                const style = document.createElement('style');
                style.innerHTML = `@media print { body * { visibility: hidden !important; } #${elementId}, #${elementId} * { visibility: visible !important; } #${elementId} { position: absolute; left: 0; top: 0; width: 100%; margin:0; padding:0; } }`;
                document.head.appendChild(style);
                
                window.print();
                setTimeout(() => document.head.removeChild(style), 2000);
                return;
            }

            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            // Remove the visual blocker since processing is done!
            if (document.getElementById('pdf-share-blocker')) document.getElementById('pdf-share-blocker').remove();

            // 🚨 SOLLO FIX: If user tapped download, skip sharing and just download!
            if (forceDownload) {
                window.html2pdf().set(opt).from(el).save();
                return;
            }

            // 🚨 SOLLO FIX: Safely wrap Native Share so cancelling it doesn't trigger the Print Fallback!
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                const cleanTitle = filename.replace('.pdf', '').replace(/_/g, ' ');
                try {
                    await navigator.share({
                        title: cleanTitle,
                        text: shareText,
                        files: [file]
                    });
                } catch (shareErr) {
                    console.log("Share dialog closed by user.");
                    // DO NOTHING! Silently abort so the print dialog doesn't pop up.
                }
            } else {
                window.Utils.showToast("⚠️ Native Share is only supported on mobile apps or secure HTTPS servers. Downloading instead...");
                window.html2pdf().set(opt).from(el).save(); // Fallback to safe download
            }
        } catch (err) {
            if (document.getElementById('pdf-share-blocker')) document.getElementById('pdf-share-blocker').remove();
            console.error("Critical PDF System Error:", err);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: EXPENSE VOUCHER PDF
    // ==========================================
    generateExpenseVoucherPDF: async (expenseId) => {
        if (typeof pdfMake === 'undefined') {
            window.Utils.showToast("⏳ Loading Vector Engine...");
            return;
        }

        const expense = await window.getRecordById('expenses', expenseId);
        if (!expense) return window.Utils.showToast("Error: Expense record not found!");

        window.Utils.showToast("⚡ Generating High-Speed Vector PDF...");

        const activeFirmId = expense.firmId || (window.app && window.app.state ? window.app.state.firmId : 'firm1');
        const biz = await window.getRecordById('businessProfile', activeFirmId) || {};
        const accounts = await window.getAllRecords('accounts');
        const payAccount = accounts.find(a => a.id === expense.accountId) || { name: 'Cash Drawer' };
        
        const safeDate = window.Utils.formatDateDisplay(expense.date);
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

        const itemsToProcess = (expense.items && expense.items.length > 0) 
            ? expense.items 
            : [{ name: expense.category || 'General Expense', qty: 1, rate: expense.amount, uom: 'Units' }];

        const itemsBody = [
            [
                {text: '#', style: 'th', alignment: 'center'},
                {text: 'Description of Expense', style: 'th'},
                {text: 'Qty', style: 'th', alignment: 'center'},
                {text: 'Rate (₹)', style: 'th', alignment: 'right'},
                {text: 'Total (₹)', style: 'th', alignment: 'right'}
            ]
        ];

        let totalAmt = 0;
        itemsToProcess.forEach((item, index) => {
            const qty = parseFloat(item.qty) || 1;
            const rate = parseFloat(item.rate) || 0;
            const total = qty * rate;
            totalAmt += total;

            itemsBody.push([
                {text: String(index + 1), style: 'td', alignment: 'center'},
                {text: String(item.name || 'Expense Item'), style: 'td', bold: true},
                {text: String(`${qty} ${item.uom || ''}`), style: 'td', alignment: 'center'},
                {text: String(rate.toFixed(2)), style: 'td', alignment: 'right'},
                {text: String(total.toFixed(2)), style: 'td', alignment: 'right', bold: true}
            ]);
        });

        const finalTotalAmt = totalAmt > 0 ? totalAmt : (parseFloat(expense.amount) || 0);
        const amountInWords = window.Utils.numberToWords(finalTotalAmt);

        // 🚨 STRICT SHIELD: Forces everything into a string so the database can't crash the engine
        const safeExpenseNo = String(expense.expenseNo || 'EXP-AUTO');
        const safePartyName = String(expense.partyName || expense.vendorName || expense.category || 'General');
        const safePayMode = String(payAccount.name + (expense.refNo ? ` (${expense.refNo})` : ''));

        const docDefinition = {
            pageSize: { width: 595.28, height: 'auto' }, // 🚨 FIX: Forces continuous Single-Page PDF!
            pageMargins: [30, 30, 30, 30],
            defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
            styles: {
                h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
                title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
                sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
                subBold: { fontSize: 9, bold: true, color: '#0f172a' },
                sectionTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 5], decoration: 'underline' },
                th: { fillColor: '#f1f5f9', bold: true, fontSize: 9, color: '#0f172a', margin: [2, 4] },
                td: { fontSize: 9, margin: [2, 4] }
            },
            content: [
                // Header
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                (biz.logo && biz.logo.startsWith('data:image')) ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                                { text: String(biz.name || 'Company Name'), style: 'h1' },
                                { text: String((biz.address ? biz.address + '\n' : '') + bizLocationStr), style: 'sub' },
                                { text: String('Ph: ' + (biz.phone || '') + (biz.email ? ' | Email: ' + biz.email : '')), style: 'sub' }
                            ].filter(Boolean)
                        },
                        {
                            width: '40%',
                            stack: [
                                { text: 'PAYMENT VOUCHER', style: 'title' },
                                { text: 'INTERNAL EXPENSE RECORD', alignment: 'right', fontSize: 9, bold: true, color: '#64748b', margin: [0, -5, 0, 10] },
                                {
                                    table: {
                                        widths: ['*', 'auto'],
                                        body: [
                                            [{text: 'Voucher No:', fillColor: '#f1f5f9', bold: true, fontSize: 9}, {text: safeExpenseNo, alignment: 'right', bold: true, fontSize: 10}],
                                            [{text: 'Date:', fillColor: '#f1f5f9', bold: true, fontSize: 9}, {text: String(safeDate), alignment: 'right', bold: true, fontSize: 10}],
                                            [{text: 'Paid To / Party:', fillColor: '#f1f5f9', bold: true, fontSize: 9}, {text: safePartyName, alignment: 'right', bold: true, fontSize: 10}],
                                            [{text: 'Payment Mode:', fillColor: '#f1f5f9', bold: true, fontSize: 9}, {text: safePayMode, alignment: 'right', bold: true, fontSize: 10}]
                                        ]
                                    },
                                    layout: 'lightHorizontalLines'
                                }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Items Table
                {
                    table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: itemsBody },
                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#0f172a', vLineColor: () => '#0f172a' },
                    margin: [0, 0, 0, 20]
                },

                // Total Amount & Words Block
                {
                    columns: [
                        {
                            width: '65%',
                            stack: [
                                { text: 'AMOUNT IN WORDS', style: 'sectionTitle' },
                                { text: String(amountInWords), bold: true, margin: [0, 0, 0, 15] },
                                ...(expense.notes ? [
                                    { text: 'REMARKS / NOTES:', style: 'sectionTitle' },
                                    { text: String(expense.notes), style: 'sub' }
                                ] : [])
                            ],
                            margin: [0, 0, 15, 0]
                        },
                        {
                            width: '35%',
                            stack: [
                                {
                                    table: {
                                        widths: ['*', 'auto'],
                                        body: [
                                            [{ text: 'TOTAL PAID', bold: true, fillColor: '#0f172a', color: '#ffffff', margin: [4, 8] }, { text: String('₹' + finalTotalAmt.toFixed(2)), bold: true, fillColor: '#0f172a', color: '#ffffff', alignment: 'right', fontSize: 12, margin: [4, 8] }]
                                        ]
                                    },
                                    layout: 'noBorders'
                                }
                            ]
                        }
                    ]
                },

                // Signatures
                {
                    columns: [
                        {
                            width: 200, // 🚨 CRITICAL MATH FIX: Changed from string '200' to number 200
                            stack: [
                                { text: '\n\n\n', margin: [0, 20, 0, 5] },
                                { text: "Receiver's Signature", style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] },
                                { text: '(Sign to confirm cash received)', style: 'sub', alignment: 'center', fontSize: 8 }
                            ]
                        },
                        { width: '*', text: '' }, // Spacer
                        {
                            width: 200, // 🚨 CRITICAL MATH FIX: Changed from string '200' to number 200
                            stack: [
                                biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                                { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] },
                                { text: String('For ' + (biz.name || 'Company Name')), style: 'sub', alignment: 'center' }
                            ]
                        }
                    ],
                    margin: [0, 30, 0, 0]
                }
            ]
        };

        // --- PREVIEW UI RENDERING ---
        const viewer = document.createElement('div');
        viewer.id = 'in-app-pdf-viewer';
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
        viewer.innerHTML = `
            <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                    <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
                </div>
                <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                    <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                    <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
                </div>
            </div>
            <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                    <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
                </div>
                <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(viewer);

        document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

        const safeFilename = `Voucher_${safeExpenseNo.replace(/[^a-zA-Z0-9_.-]/g, '-')}.pdf`;
        const shareText = `Dear ${safePartyName},\n\nPlease find attached the Payment Voucher (${safeExpenseNo}) dated ${safeDate} for the amount of ₹${finalTotalAmt.toFixed(2)}.\n\nThank you!`;

        let pdfDocGenerator;
        try {
            pdfDocGenerator = pdfMake.createPdf(docDefinition);
        } catch (e) {
            console.error("pdfMake crashed during createPdf:", e);
            window.Utils.showToast("❌ Error generating PDF structure.");
            viewer.remove();
            return;
        }
        
        pdfDocGenerator.getBlob(async (blob) => {
            document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
            document.getElementById('pdf-status-text').style.color = '#0061a4';

            const file = new File([blob], safeFilename, { type: 'application/pdf' });

            const btnDown = document.getElementById('preview-action-download');
            const btnShare = document.getElementById('preview-action-share');
            const btnPrint = document.getElementById('preview-action-print');

            btnDown.onclick = () => {
                pdfDocGenerator.download(safeFilename);
                if (window.Utils) window.Utils.showToast("✅ Download Started!");
            };

            btnShare.onclick = async () => {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: safeFilename,
                            text: shareText,
                            files: [file]
                        });
                    } catch (err) { console.log("Share cancelled."); }
                } else {
                    window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                    pdfDocGenerator.download(safeFilename);
                }
            };
            
            btnPrint.onclick = () => {
                // 🚨 FIX: Opens the actual PDF in a native viewer so the printer doesn't capture the app background!
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            // PDF.js Preview Rendering
            try {
                if (typeof window.pdfjsLib === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const previewContent = document.getElementById('pdf-preview-content');
                previewContent.innerHTML = ''; 
                previewContent.style.flexDirection = 'column'; 
                previewContent.style.alignItems = 'center';
                previewContent.style.justifyContent = 'flex-start'; // 🚨 NEW: Fixes the missing first page scroll bug

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) { // Keeps all pages loading for these reports
                    if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    canvas.style.borderRadius = '4px';
                    canvas.style.marginBottom = '16px'; 
                    canvas.style.flexShrink = '0';

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previewContent.appendChild(canvas);
                }

                document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
                document.getElementById('pdf-status-text').style.color = '#64748b';
                
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';

            } catch (err) {
                console.error("Preview Render Error:", err);
                document.getElementById('pdf-preview-content').innerHTML = `
                    <div style="text-align:center; margin-top:50px;">
                        <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                        <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                        <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                    </div>
                `;
                document.getElementById('pdf-status-text').innerText = "Ready";
                btnDown.style.display = 'inline-block';
                btnShare.style.display = 'inline-block';
                btnPrint.style.display = 'inline-block';
            }
        });
    },

    // ==========================================
    // 5. VECTOR PRINT & TEMPLATE ENGINE
    // ==========================================
    processVectorPDF: async (docDefinition, filename, customMsg) => {
        if (typeof pdfMake === 'undefined' || typeof pdfjsLib === 'undefined') {
            window.Utils.showToast("⏳ Loading Preview Engine... Just a moment.");
            
            if (!document.getElementById('script-pdfmake')) {
                const s1 = document.createElement('script');
                s1.id = 'script-pdfmake';
                s1.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
                document.head.appendChild(s1);
                
                const s2 = document.createElement('script');
                s2.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js";
                document.head.appendChild(s2);
            }

            if (!document.getElementById('script-pdfjs')) {
                const s3 = document.createElement('script');
                s3.id = 'script-pdfjs';
                s3.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                document.head.appendChild(s3);
            }

            setTimeout(() => window.Utils.processVectorPDF(docDefinition, filename, customMsg), 1000);
            return;
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        try {
            document.querySelectorAll('#in-app-pdf-viewer').forEach(el => el.remove());

            const viewer = document.createElement('div');
            viewer.id = 'in-app-pdf-viewer';
            viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
            
            viewer.innerHTML = `
                <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                        <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;">Vector PDF Generated Instantly!</div>
                    </div>
                    <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                        <span class="material-symbols-outlined tap-target" style="font-size:24px; color:#0f172a;" id="preview-action-print">print</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:24px; color:#0f172a;" id="preview-action-download">download</span>
                        <span class="material-symbols-outlined tap-target" style="font-size:24px; color:#0061a4;" id="preview-action-share">share</span>
                        <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; margin-left: 8px;">close</span>
                    </div>
                </div>
                <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:24px; display:flex; flex-direction:column; justify-content:flex-start; align-items:center;">
                    <div class="loader-spinner" style="border-top-color: #0061a4; margin-top: 40px; width: 40px; height: 40px; border-radius: 50%; border: 4px solid rgba(0,0,0,0.1); animation: sollo-spin 1s linear infinite;"></div>
                    <p style="color: #64748b; margin-top: 16px; font-weight: bold;">Rendering high-res preview...</p>
                    <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
            document.body.style.overflow = 'hidden'; 
            document.body.appendChild(viewer);
            
            const pdfGenerator = pdfMake.createPdf(docDefinition);
            pdfGenerator.getBlob(async (pdfBlob) => {
                const readyPdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(pdfBlob);

                try {
                    const loadingTask = pdfjsLib.getDocument(blobUrl);
                    const pdfDoc = await loadingTask.promise;
                    const page = await pdfDoc.getPage(1); 
                    
                    const viewport = page.getViewport({ scale: 1.5 });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.style.cssText = 'max-width: 100%; height: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 4px;';
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const previewContainer = document.getElementById('pdf-preview-content');
                    if (previewContainer) {
                        previewContainer.innerHTML = ''; 
                        previewContainer.appendChild(canvas); 
                    }
                } catch (renderErr) {
                    console.warn("PDF.js preview render failed, showing fallback UI.", renderErr);
                }

                document.getElementById('preview-action-download').onclick = () => {
                    const a = document.createElement("a");
                    a.href = blobUrl; a.download = filename;
                    document.body.appendChild(a); a.click();
                    setTimeout(() => { document.body.removeChild(a); }, 2000);
                };

                document.getElementById('preview-action-print').onclick = () => {
                    pdfGenerator.print();
                };
                
                document.getElementById('preview-action-share').onclick = async () => {
                    try {
                        const cleanDocumentName = filename.replace('.pdf', '').replace(/_/g, ' ');
                        const finalMsg = customMsg ? customMsg : `Here is your document: ${cleanDocumentName}`;
                        
                        if (navigator.canShare && navigator.canShare({ files: [readyPdfFile] })) {
                            await navigator.share({ title: cleanDocumentName, text: finalMsg, files: [readyPdfFile] });
                        } else {
                            if (window.Utils) window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                            document.getElementById('preview-action-download').click();
                        }
                    } catch (err) { console.log("Share cancelled", err); }
                };

                document.getElementById('btn-close-pdf-loaded').onclick = () => {
                    const v = document.getElementById('in-app-pdf-viewer');
                    if (v) v.remove(); 
                    document.body.style.overflow = '';
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                };
            });

        } catch (err) {
            console.error("Vector Generation Failed", err);
            alert("Failed to generate PDF.");
        }
    }

}; // <--- THIS CLOSES THE UTILS OBJECT

// ==========================================
// ENTERPRISE UPGRADE: PARTY-FILTERED ITEM LEDGER PDF
// ==========================================
window.executeItemLedgerReport = async (itemId, itemName, partyId = null, partyName = null, searchText = '', typeFilter = 'ALL', dateFilter = '', actionType = 'preview') => {
    if (typeof pdfMake === 'undefined') {
        if (window.Utils) window.Utils.showToast("⏳ Loading Vector Engine...");
        return;
    }

    if (window.Utils) window.Utils.showToast("⚡ Generating Premium Stock Ledger...");
    
    const activeFirmId = (typeof app !== 'undefined' && app.state) ? app.state.firmId : 'firm1';
    const biz = await window.getRecordById('businessProfile', activeFirmId) || {};
    const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');

    const product = await window.getRecordById('items', itemId);
    const openingStock = (product && !partyId) ? (parseFloat(product.openingStock) || 0) : 0;

    let timeline = [];
    
    const sales = await window.getAllRecords('sales');
    sales.forEach(s => {
        if(s.status !== 'Open' && s.status !== 'Cancelled' && s.firmId === activeFirmId && (!partyId || s.customerId === partyId)) {
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
        if(p.status !== 'Open' && p.status !== 'Cancelled' && p.firmId === activeFirmId && (!partyId || p.supplierId === partyId)) {
            (p.items || []).forEach(row => {
                if(row.itemId === itemId) {
                    const isReturn = p.documentType === 'return';
                    const qty = parseFloat(row.qty) || 0;
                    timeline.push({ id: p.id, date: p.date, type: isReturn ? 'Purchase Return' : 'Purchase', desc: p.supplierName || 'Unknown Party', ref: p.invoiceNo || p.poNo || p.id.slice(-4).toUpperCase(), inQty: isReturn ? 0 : qty, outQty: isReturn ? qty : 0 });
                }
            });
        }
    });

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

    timeline.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeA - timeB;
    });

    let runningStock = openingStock;
    timeline.forEach(t => {
        runningStock += t.inQty;
        runningStock -= t.outQty;
        t.trueRunningBalance = runningStock; 
    });

    const trueFinalStock = runningStock;

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
    
    const itemsBody = [
        [
            { text: 'Date', style: 'th', alignment: 'center' },
            { text: 'Type', style: 'th' },
            { text: 'Particulars & Ref', style: 'th' },
            { text: 'Stock IN', style: 'th', alignment: 'center' },
            { text: 'Stock OUT', style: 'th', alignment: 'center' },
            { text: 'Running Bal', style: 'th', alignment: 'right' }
        ]
    ];

    if (!partyId && !dateFilter) {
        itemsBody.push([
            { text: 'Opening', style: 'td', color: '#475569', alignment: 'center' },
            { text: 'Opening Stock', style: 'td', bold: true },
            { text: 'Initial Inventory Balance', style: 'td' },
            { text: openingStock > 0 ? openingStock.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
            { text: openingStock < 0 ? Math.abs(openingStock).toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
            { text: openingStock.toFixed(2), style: 'td', alignment: 'right', bold: true }
        ]);
    }

    timeline.forEach(t => {
        totalIn += t.inQty;
        totalOut += t.outQty;
        
        itemsBody.push([
            { text: window.Utils.formatDateDisplay(t.date), style: 'td', alignment: 'center', color: '#475569' },
            { text: t.type, style: 'td', bold: true },
            { stack: [{ text: t.desc }, { text: 'Ref: ' + t.ref, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] }], style: 'td' },
            { text: t.inQty > 0 ? t.inQty.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
            { text: t.outQty > 0 ? t.outQty.toFixed(2) : '', style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
            { text: t.trueRunningBalance.toFixed(2), style: 'td', alignment: 'right', bold: true }
        ]);
    });

    const finalDisplayBalance = trueFinalStock;

    itemsBody.push([
        { text: 'Total Volume Summary', style: 'td', colSpan: 3, alignment: 'right', bold: true, color: '#0f172a' },
        {}, {},
        { text: totalIn.toFixed(2), style: 'td', alignment: 'center', bold: true, color: '#16a34a' },
        { text: totalOut.toFixed(2), style: 'td', alignment: 'center', bold: true, color: '#dc2626' },
        { text: finalDisplayBalance.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' }
    ]);

    const reportSubtitle = partyId ? `Filtered By Party: ${partyName}` : (dateFilter ? `Filtered By Date: ${dateFilter}` : 'Global Stock Movement');

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 30, 30, 30],
        defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
        styles: {
            h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
            title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
            sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
            subBold: { fontSize: 9, bold: true, color: '#0f172a' },
            sectionTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 5], decoration: 'underline' },
            th: { fillColor: '#f1f5f9', bold: true, fontSize: 9, color: '#0f172a', margin: [2, 4] },
            td: { fontSize: 9, margin: [2, 4] }
        },
        content: [
            {
                columns: [
                    {
                        width: '60%',
                        stack: [
                            biz.logo ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                            { text: biz.name || 'Company Name', style: 'h1' },
                            { text: 'Official Stock Ledger & Inventory Audit', style: 'sub' }
                        ].filter(Boolean)
                    },
                    {
                        width: '40%',
                        stack: [
                            { text: 'STOCK LEDGER', style: 'title' },
                            { text: 'DATE: ' + window.Utils.formatDateDisplay(window.Utils.getLocalDate()), alignment: 'right', fontSize: 9, bold: true, color: '#475569', margin: [0, -5, 0, 10] }
                        ]
                    }
                ],
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    {
                        width: '60%',
                        stack: [
                            { text: 'Product / Item Name', style: 'subBold', color: '#64748b' },
                            { text: itemName || 'Unknown Item', bold: true, fontSize: 14 }
                        ]
                    },
                    {
                        width: '40%',
                        stack: [
                            { text: 'Filter Scope', style: 'subBold', color: '#64748b', alignment: 'right' },
                            { text: reportSubtitle, bold: true, fontSize: 11, alignment: 'right' }
                        ]
                    }
                ],
                margin: [0, 0, 0, 15]
            },
            {
                table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'], body: itemsBody },
                layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'LEDGER SUMMARY', style: 'sectionTitle' },
                            { text: `Total Stock IN:  + ${totalIn.toFixed(2)}`, color: '#16a34a', bold: true, margin: [0, 2, 0, 0] },
                            { text: `Total Stock OUT: - ${totalOut.toFixed(2)}`, color: '#dc2626', bold: true, margin: [0, 2, 0, 0] }
                        ]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'Closing Stock Balance', alignment: 'right', fontSize: 9, color: '#64748b', margin: [0, 0, 0, 2] },
                            { text: finalDisplayBalance.toFixed(2), alignment: 'right', fontSize: 20, bold: true, color: '#0f172a' },
                            { text: finalDisplayBalance > 0 ? 'Net Surplus (IN)' : (finalDisplayBalance < 0 ? 'Net Deficit (OUT)' : 'Zero Balance'), alignment: 'right', fontSize: 10, bold: true, color: finalDisplayBalance > 0 ? '#16a34a' : (finalDisplayBalance < 0 ? '#dc2626' : '#475569') }
                        ]
                    }
                ],
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    { text: '*** End of Ledger ***', fontSize: 9, color: '#94a3b8', bold: true, alignment: 'left', width: '*' },
                    {
                        width: 200,
                        stack: [
                            biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                            { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] }
                        ]
                    }
                ],
                unbreakable: true 
            }
        ]
    };

    const viewer = document.createElement('div');
    viewer.id = 'in-app-pdf-viewer';
    viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
    viewer.innerHTML = `
        <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div>
                <div style="font-weight:bold; font-size:18px;">Document Preview</div>
                <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
            </div>
            <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
            </div>
        </div>
        <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
            <div style="text-align:center; margin-top:50px;">
                <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
            </div>
            <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
        </div>
    `;
    document.body.appendChild(viewer);

    document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

    const safeItemName = itemName ? String(itemName).replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Item';
    const safePartyStr = partyName ? `_${String(partyName).replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const safeFilename = `Stock_Ledger_${safeItemName}${safePartyStr}.pdf`;
    const shareText = `Please find attached the Stock Ledger for ${itemName}.`;

    let pdfDocGenerator;
    try {
        pdfDocGenerator = pdfMake.createPdf(docDefinition);
    } catch (e) {
        window.Utils.showToast("❌ Error generating PDF structure.");
        viewer.remove();
        return;
    }

    if (actionType === 'share') {
        pdfDocGenerator.getBlob(async (blob) => {
            const file = new File([blob], safeFilename, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                } catch (err) { console.log("Share cancelled."); }
            } else {
                window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                pdfDocGenerator.download(safeFilename);
            }
            viewer.remove();
        });
        return;
    }

    pdfDocGenerator.getBlob(async (blob) => {
        document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
        document.getElementById('pdf-status-text').style.color = '#0061a4';

        const file = new File([blob], safeFilename, { type: 'application/pdf' });

        const btnDown = document.getElementById('preview-action-download');
        const btnShare = document.getElementById('preview-action-share');
        const btnPrint = document.getElementById('preview-action-print');

        btnDown.onclick = () => {
            pdfDocGenerator.download(safeFilename);
            if (window.Utils) window.Utils.showToast("✅ Download Started!");
        };

        btnShare.onclick = async () => {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                } catch (err) { console.log("Share cancelled."); }
            } else {
                window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                pdfDocGenerator.download(safeFilename);
            }
        };
        
        btnPrint.onclick = () => {
            pdfDocGenerator.print();
        };

        try {
            if (typeof window.pdfjsLib === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                    script.onload = () => {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                        resolve();
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });

            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const previewContent = document.getElementById('pdf-preview-content');
            previewContent.innerHTML = ''; 
            previewContent.style.flexDirection = 'column'; 
            previewContent.style.alignItems = 'center';
            previewContent.style.justifyContent = 'flex-start'; // 🚨 FIX: Shows the first page correctly!

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                canvas.style.maxWidth = '100%';
                canvas.style.height = 'auto';
                canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                canvas.style.borderRadius = '4px';
                canvas.style.marginBottom = '16px'; 
                canvas.style.flexShrink = '0';

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                previewContent.appendChild(canvas);
            }

            document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
            document.getElementById('pdf-status-text').style.color = '#64748b';
            
            btnDown.style.display = 'inline-block';
            btnShare.style.display = 'inline-block';
            btnPrint.style.display = 'inline-block';

        } catch (err) {
            document.getElementById('pdf-preview-content').innerHTML = `
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                    <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                    <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                </div>
            `;
            document.getElementById('pdf-status-text').innerText = "Ready";
            btnDown.style.display = 'inline-block';
            btnShare.style.display = 'inline-block';
            btnPrint.style.display = 'inline-block';
        }
    });
};

// ==========================================
// ENTERPRISE UPGRADE: MASTER TAB KHATA PDF ENGINE
// ==========================================
window.executeKhataReport = async (partyId, partyName, partyType) => {
    if (typeof pdfMake === 'undefined') {
        if (window.Utils) window.Utils.showToast("⏳ Loading Vector Engine...");
        return;
    }

    if (window.Utils) window.Utils.showToast("⚡ Generating Master Statement PDF...");

    const party = await window.getRecordById('ledgers', partyId);
    if (!party) return alert("Party not found in database.");

    const firmId = typeof app !== 'undefined' && app.state ? app.state.firmId : 'firm1';
    const biz = await window.getRecordById('businessProfile', firmId) || {};
    
    // Fetch the mathematically perfect timeline direct from the database engine!
    const statement = await window.getKhataStatement(partyId, partyType);
    const timeline = statement.timeline || [];
    const finalBal = statement.finalBalance || 0;

    const itemsBody = [
        [
            { text: 'Date', style: 'th', alignment: 'center' },
            { text: 'Particulars / Voucher Type', style: 'th' },
            { text: 'Debit (Dr)', style: 'th', alignment: 'right' },
            { text: 'Credit (Cr)', style: 'th', alignment: 'right' },
            { text: 'Balance', style: 'th', alignment: 'right' }
        ]
    ];

    let totalDebit = 0;
    let totalCredit = 0;
    
    timeline.forEach((t) => {
        let debit = '';
        let credit = '';
        
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

        if (debit) totalDebit += parseFloat(debit);
        if (credit) totalCredit += parseFloat(credit);

        let particularsStack = [];
        let mainDesc = t.id === 'open-bal' ? 'Opening Balance' : `${t.type || t.desc} ${t.ref ? '/ ' + t.ref : ''}`;
        if (t.partyName && t.partyName !== 'Unknown') mainDesc += ` (${t.partyName})`;
        particularsStack.push({ text: mainDesc, bold: true });

        // Safely check for rawData and sales/purchases arrays
        if (t.isInvoice && window.UI && window.UI.state && window.UI.state.rawData) {
            let inv = null;
            if (party.type === 'Customer' && window.UI.state.rawData.sales) inv = window.UI.state.rawData.sales.find(s => s.id === t.id);
            else if (party.type === 'Supplier' && window.UI.state.rawData.purchases) inv = window.UI.state.rawData.purchases.find(p => p.id === t.id);

            if (inv) {
                const gstAmt = parseFloat(inv.totalGst) || 0;
                const baseAmt = (parseFloat(inv.grandTotal) || 0) - gstAmt;
                if (gstAmt > 0) {
                    particularsStack.push({ text: `Base: ₹${baseAmt.toFixed(2)} | GST: ₹${gstAmt.toFixed(2)}`, fontSize: 8, color: '#0369a1', margin: [0, 2, 0, 0] });
                } else if (inv.invoiceType === 'Non-GST') {
                    particularsStack.push({ text: `Non-GST Bill`, fontSize: 8, color: '#b45309', margin: [0, 2, 0, 0] });
                }
            }
        }

        itemsBody.push([
            { text: window.Utils.formatDateDisplay(t.date), style: 'td', alignment: 'center' },
            { stack: particularsStack, style: 'td' },
            { text: debit ? debit : '', style: 'td', alignment: 'right' },
            { text: credit ? credit : '', style: 'td', alignment: 'right' },
            { text: `${Math.abs(t.runningBalance || 0).toFixed(2)} ${Math.abs(t.runningBalance || 0) < 0.01 ? '' : ((t.runningBalance || 0) > 0 ? 'Dr' : 'Cr')}`, style: 'td', alignment: 'right', bold: true }
        ]);
    });

    if (timeline.length > 0) {
        itemsBody.push([
            { text: 'TOTAL', style: 'td', colSpan: 2, alignment: 'right', bold: true, color: '#0f172a' },
            {},
            { text: totalDebit.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' },
            { text: totalCredit.toFixed(2), style: 'td', alignment: 'right', bold: true, color: '#0f172a' },
            { text: '', style: 'td' }
        ]);
    } else {
        itemsBody.push([{ text: 'No transactions found.', style: 'td', colSpan: 5, alignment: 'center' }, {}, {}, {}, {}]);
    }

    const safeDocNo = window.Utils.getLocalDate();
    let balSuffix = 'Available';
    let splitStack = [];

    if (Math.abs(finalBal) < 0.01) {
        balSuffix = 'Settled (Nil)';
    } else if (party.type === 'Customer') {
        balSuffix = finalBal > 0 ? 'Dr (Due)' : 'Cr (Advance)';
    } else {
        balSuffix = finalBal < 0 ? 'Cr (To Pay)' : 'Dr (Advance)';
    }

    if ((party.type === 'Customer' && finalBal > 0.01) || (party.type === 'Supplier' && finalBal < -0.01)) {
        let debitsGst = 0;
        let debitsNon = 0;
        const exactPaymentMap = {};
        const exactReturnMap = {};

        if (window.UI && window.UI.state && window.UI.state.rawData) {
            (window.UI.state.rawData.cashbook || []).forEach(c => {
                if (c.ledgerId === party.id && c.invoiceRef) {
                    let amt = parseFloat(c.amount) || 0;
                    const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                    let remainingAmt = amt;
                    refs.forEach(ref => {
                        if (remainingAmt <= 0) return;
                        exactPaymentMap[ref] = (exactPaymentMap[ref] || 0) + (amt / refs.length);
                    });
                }
            });

            const relatedDocs = party.type === 'Customer' ? (window.UI.state.rawData.sales || []) : (window.UI.state.rawData.purchases || []);

            relatedDocs.forEach(d => {
                if (d.documentType === 'return' && d.status !== 'Open' && d.orderNo && (party.type === 'Customer' ? d.customerId === party.id : d.supplierId === party.id)) {
                    exactReturnMap[d.orderNo] = (exactReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                }
            });

            relatedDocs.forEach(doc => {
                const partyMatch = party.type === 'Customer' ? doc.customerId === party.id : doc.supplierId === party.id;
                if (partyMatch && doc.status !== 'Open' && doc.documentType !== 'return') {
                    const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
                    const paid = uniqueRefs.reduce((sum, ref) => sum + (exactPaymentMap[ref] || 0), 0);
                    const returned = uniqueRefs.reduce((sum, ref) => sum + (exactReturnMap[ref] || 0), 0);
                    
                    const docTotal = parseFloat(doc.grandTotal) || 0;
                    const finalUnpaid = Math.max(0, docTotal - paid - returned);
                    
                    if (finalUnpaid > 0.01) {
                        if (doc.invoiceType === 'Non-GST') debitsNon += finalUnpaid;
                        else debitsGst += finalUnpaid;
                    }
                }
            });
        }

        const exactTargetBalance = Math.abs(finalBal);
        const trackedDebt = debitsGst + debitsNon;

        if (exactTargetBalance < trackedDebt) {
            const excessCredit = trackedDebt - exactTargetBalance;
            if (excessCredit >= debitsGst) {
                let remaining = excessCredit - debitsGst;
                debitsGst = 0;
                debitsNon = Math.max(0, debitsNon - remaining);
            } else {
                debitsGst -= excessCredit;
            }
        } else if (exactTargetBalance > trackedDebt) {
            const missingDebt = exactTargetBalance - trackedDebt;
            let hasGst = party.gst && String(party.gst).trim().length > 4;
            if (!hasGst) debitsNon += missingDebt;
            else debitsGst += missingDebt;
        }

        if (debitsGst > 0.01 || debitsNon > 0.01) {
            if (debitsGst > 0.01) splitStack.push({ text: `GST Due: ₹${window.Utils.formatCurrency(debitsGst)}`, fontSize: 9, bold: true, color: '#0f172a' });
            if (debitsNon > 0.01) splitStack.push({ text: `Non-GST Due: ₹${window.Utils.formatCurrency(debitsNon)}`, fontSize: 9, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] });
        }
    }

    const statementBizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
    const statementPartyLocationStr = [party.city, party.state].filter(Boolean).join(', ') + (party.pincode ? ' - ' + party.pincode : '');

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 30, 30, 30],
        defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
        styles: {
            h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
            title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 0, 0, 10], alignment: 'right' },
            sub: { fontSize: 9, color: '#334155', lineHeight: 1.3 },
            subBold: { fontSize: 9, bold: true, color: '#0f172a' },
            sectionTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 5], decoration: 'underline' },
            th: { fillColor: '#f1f5f9', bold: true, fontSize: 9, color: '#0f172a', margin: [2, 4] },
            td: { fontSize: 9, margin: [2, 4] }
        },
        content: [
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            biz.logo ? { image: biz.logo, fit: [150, 60], margin: [0, 0, 0, 10] } : null,
                            { text: biz.name || 'Company Name', style: 'h1' },
                            { text: (biz.address || '') + '\n' + statementBizLocationStr, style: 'sub' },
                            { text: 'Ph: ' + (biz.phone || ''), style: 'sub' }
                        ].filter(Boolean)
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'LEDGER STATEMENT', style: 'title' },
                            { text: 'DATE: ' + window.Utils.formatDateDisplay(safeDocNo), alignment: 'right', fontSize: 9, bold: true, color: '#475569', margin: [0, -5, 0, 10] },
                            { text: 'Closing Balance', alignment: 'right', fontSize: 9, color: '#64748b', margin: [0, 10, 0, 2] },
                            { text: '₹' + Math.abs(finalBal).toFixed(2), alignment: 'right', fontSize: 20, bold: true, color: '#0f172a' },
                            { text: balSuffix, alignment: 'right', fontSize: 10, bold: true, color: Math.abs(finalBal) < 0.01 ? '#64748b' : (finalBal > 0 ? '#16a34a' : '#ef4444'), margin: [0, 2, 0, 5] },
                            splitStack.length > 0 ? { stack: splitStack, alignment: 'right', margin: [0, 5, 0, 0] } : null
                        ].filter(Boolean)
                    }
                ],
                margin: [0, 0, 0, 20]
            },
            {
                stack: [
                    { text: 'PARTY DETAILS', style: 'sectionTitle' },
                    { text: party.name, bold: true, fontSize: 12 },
                    { text: (party.address || '') + '\n' + statementPartyLocationStr, style: 'sub', margin: [0, 2, 0, 0] },
                    party.phone ? { text: 'Ph: ' + party.phone, style: 'sub' } : null,
                    party.gst ? { text: 'GSTIN: ' + String(party.gst).toUpperCase(), style: 'subBold', margin: [0, 2, 0, 0] } : null
                ].filter(Boolean),
                margin: [0, 0, 0, 15]
            },
            {
                table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: itemsBody },
                layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    { text: '*** End of Statement ***', fontSize: 9, color: '#94a3b8', bold: true, alignment: 'left', width: '*' },
                    {
                        width: 200,
                        stack: [
                            biz.signature ? { image: biz.signature, fit: [150, 50], alignment: 'center', margin: [0, 20, 0, 5] } : { text: '\n\n\n', margin: [0, 20, 0, 5] },
                            { text: 'Authorized Signatory', style: 'subBold', alignment: 'center', margin: [0, 5, 0, 0] }
                        ]
                    }
                ],
                unbreakable: true 
            }
        ]
    };

    const viewer = document.createElement('div');
    viewer.id = 'in-app-pdf-viewer';
    viewer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#e8eaed; z-index:999999; display:flex; flex-direction:column;';
    viewer.innerHTML = `
        <div style="background:#ffffff; color:#0f172a; padding:16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; flex-shrink:0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div>
                <div style="font-weight:bold; font-size:18px;">Statement Preview</div>
                <div style="font-size:12px; color:#16a34a; font-weight:700; margin-top:2px;" id="pdf-status-text">Rendering Preview...</div>
            </div>
            <div id="pdf-header-actions" style="display: flex; gap: 20px; align-items: center; color:#475569;">
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-print">print</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-download">download</span>
                <span class="material-symbols-outlined tap-target" style="font-size:24px; display:none;" id="preview-action-share">share</span>
                <span id="btn-close-pdf-loaded" class="material-symbols-outlined tap-target" style="font-size:28px; color:#ba1a1a; cursor:pointer;">close</span>
            </div>
        </div>
        <div id="pdf-preview-content" style="flex:1; overflow:auto; padding:16px; display:flex; justify-content:center; align-items:flex-start; touch-action: pan-x pan-y pinch-zoom;">
            <div style="text-align:center; margin-top:50px;">
                <span class="material-symbols-outlined" style="font-size:32px; color:#0061a4; animation: sollo-spin 1s linear infinite;">autorenew</span>
                <div style="margin-top:8px; font-weight:600; color:#475569;">Loading Preview...</div>
            </div>
            <style>@keyframes sollo-spin { 100% { transform: rotate(360deg); } }</style>
        </div>
    `;
    document.body.appendChild(viewer);

    document.getElementById('btn-close-pdf-loaded').onclick = () => viewer.remove();

    const cleanPartyName = partyName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeFilename = `Ledger_Statement_${cleanPartyName}_${safeDocNo}.pdf`;
    const shareText = `Dear ${partyName},\n\nPlease find attached your ledger statement.\n\nThank you!`;

    let pdfDocGenerator;
    try {
        pdfDocGenerator = pdfMake.createPdf(docDefinition);
    } catch (e) {
        window.Utils.showToast("❌ Error generating PDF structure.");
        viewer.remove();
        return;
    }

    pdfDocGenerator.getBlob(async (blob) => {
        document.getElementById('pdf-status-text').innerText = "Generating Preview..."; 
        document.getElementById('pdf-status-text').style.color = '#0061a4';

        const file = new File([blob], safeFilename, { type: 'application/pdf' });

        const btnDown = document.getElementById('preview-action-download');
        const btnShare = document.getElementById('preview-action-share');
        const btnPrint = document.getElementById('preview-action-print');

        btnDown.onclick = () => {
            pdfDocGenerator.download(safeFilename);
            if (window.Utils) window.Utils.showToast("✅ Download Started!");
        };

        btnShare.onclick = async () => {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ title: safeFilename, text: shareText, files: [file] });
                } catch (err) { console.log("Share cancelled."); }
            } else {
                window.Utils.showToast("⚠️ Native Share blocked by phone. Downloading instead...");
                pdfDocGenerator.download(safeFilename);
            }
        };
        
        btnPrint.onclick = () => {
            pdfDocGenerator.print();
        };

        try {
            if (typeof window.pdfjsLib === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                    script.onload = () => {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                        resolve();
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });

            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const previewContent = document.getElementById('pdf-preview-content');
            previewContent.innerHTML = ''; 
            previewContent.style.flexDirection = 'column'; 
            previewContent.style.alignItems = 'center';
            previewContent.style.justifyContent = 'flex-start'; // 🚨 FIX: Shows the first page correctly!

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                if (!document.getElementById('in-app-pdf-viewer')) break; const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                canvas.style.maxWidth = '100%';
                canvas.style.height = 'auto';
                canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                canvas.style.borderRadius = '4px';
                canvas.style.marginBottom = '16px'; 
                canvas.style.flexShrink = '0';

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                previewContent.appendChild(canvas);
            }

            document.getElementById('pdf-status-text').innerText = "Share PDF or Download";
            document.getElementById('pdf-status-text').style.color = '#64748b';
            
            btnDown.style.display = 'inline-block';
            btnShare.style.display = 'inline-block';
            btnPrint.style.display = 'inline-block';

        } catch (err) {
            document.getElementById('pdf-preview-content').innerHTML = `
                <div style="text-align:center; margin-top:50px;">
                    <span class="material-symbols-outlined" style="font-size:40px; color:#16a34a;">picture_as_pdf</span>
                    <h3 style="color:#0f172a; margin-top:8px;">PDF Generated</h3>
                    <p style="color:#475569; font-size:14px;">Preview unavailable on this device, but the document is ready!</p>
                </div>
            `;
            document.getElementById('pdf-status-text').innerText = "Ready";
            btnDown.style.display = 'inline-block';
            btnShare.style.display = 'inline-block';
            btnPrint.style.display = 'inline-block';
        }
    });
};

// ==========================================
// 🚨 ENTERPRISE UPGRADE: UNIVERSAL PINCH-TO-ZOOM ENGINE
// ==========================================
// Mobile browsers strictly block CSS touch-zoom if the HTML Viewport is locked.
// This AI-powered observer watches the DOM. Whenever ANY PDF viewer opens, it instantly 
// unlocks the hardware viewport, allowing flawless pinch-to-zoom. When closed, it locks it back!
document.addEventListener('DOMContentLoaded', () => {
    const toggleZoom = (enable) => {
        const vp = document.querySelector('meta[name="viewport"]');
        if (vp) {
            if (enable) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
            else vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach((node) => {
                    if (node.id === 'in-app-pdf-viewer') toggleZoom(true);
                });
            }
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach((node) => {
                    if (node.id === 'in-app-pdf-viewer') toggleZoom(false);
                });
            }
        });
    });
    
    if (document.body) observer.observe(document.body, { childList: true });
});


// ==========================================
// NEW CODE: GLOBAL MAP
// ==========================================
// 2. Attach to window so index.html onclick="Utils..." buttons don't break!
window.Utils = Utils;
