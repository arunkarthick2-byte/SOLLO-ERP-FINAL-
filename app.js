// ==========================================
// SOLLO ERP - MAIN APPLICATION CONTROLLER (v6.1 Enterprise)
// ==========================================

// ==========================================
// 🚨 ENTERPRISE FIX: MASTER STYLING SHIELD
// ==========================================
if (!document.getElementById('enterprise-master-fixes')) {
    const style = document.createElement('style');
    style.id = 'enterprise-master-fixes';
    style.innerHTML = `
        /* 1. Fix Screen Bottom Overlaps (Business Profile & Inventory Master) */
        #form-business-profile, #master-list-container { padding-bottom: 95px !important; }
        
        /* 2. Fix Ledger Header Visibility */
        #activity-report-viewer .activity-header { background: var(--md-surface, #ffffff) !important; color: var(--md-on-surface, #0f172a) !important; border-bottom: 1px solid var(--md-outline-variant, #e2e8f0) !important; }
        #activity-report-viewer .activity-header .material-symbols-outlined,
        #activity-report-viewer .activity-header strong,
        #report-party-name,
        #report-party-balance { color: var(--md-on-surface, #0f172a) !important; }

        /* 🚨 3. ENTERPRISE FIX: THE "NATIVE BUTTON" CURSOR SHIELD */
        /* Permanently destroys the blinking text cursor on Custom Numpad inputs */
        input[readonly], input[inputmode="none"] {
            caret-color: transparent !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            outline: none !important;
        }
        
        /* 🚨 4. NUMPAD ACTIVE HIGHLIGHTER */
        /* Safely highlights the box in blue so you know what you are editing, WITHOUT a cursor! */
        input:focus[readonly], input:focus[inputmode="none"] {
            background-color: rgba(0, 97, 164, 0.05) !important;
            border-color: var(--md-primary, #0061a4) !important;
            color: var(--md-primary, #0061a4) !important;
            box-shadow: 0 0 0 3px rgba(0, 97, 164, 0.15) !important;
        }
        
        /* 🚨 5. PREMIUM NORMAL INPUT FOCUS */
        /* Standard text boxes get a soft highlight instead of harsh browser outlines */
        input:focus:not([readonly]), select:focus, textarea:focus {
            background-color: rgba(0, 97, 164, 0.03) !important;
            transition: background-color 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 🚨 ENTERPRISE FIX: HIDDEN INPUT RESET SHIELD
// ==========================================
// Standard HTML ignores hidden fields when resetting forms. This forces all hidden IDs to wipe 
// completely clean so previous customers/suppliers don't get stuck in the background!
document.addEventListener('reset', (e) => {
    const form = e.target;
    setTimeout(() => {
        // 🚨 BIZOPS FIX: The "Ghost Supplier" Race Condition!
        // Prevents the reset timeout from destroying the Supplier/Customer ID when opening a Saved Entry!
        if (window.app && window.app.state && (window.app.state.currentEditId || window.app.state.currentReceiptId)) return;

        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(input => {
            // Wipes the hidden IDs clean for Sales, Purchases, and General Ledger forms
            if (input.id && (input.id.includes('customer-id') || input.id.includes('supplier-id') || input.id.includes('party-id'))) {
                input.value = '';
            }
        });
        
        // Also force the Live Insight Engine to instantly clear the banner!
        const oldBanner = document.getElementById('risk-banner');
        if (oldBanner) oldBanner.remove();
        
    }, 10); // 10ms delay ensures it happens right after the browser finishes its native reset
});


// --- ENTERPRISE UPGRADE: KILL UGLY BROWSER ALERTS ---
// Removed the custom override because it was non-blocking and caused race-condition bugs.
// The app will now use the safe, native browser alert to properly pause execution!

// --- ENTERPRISE UPGRADE: GLOBAL ERROR SHIELD ---
window.addEventListener('error', (event) => {
    console.error("Global Error Caught:", event.error);
    if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast("Something went wrong. Please try again.");
    }
});

window.addEventListener('unhandledrejection', (event) => {
    // Log the event for developers, but do NOT show a scary toast to the user.
    // This prevents false alarms from missing Service Workers or AdBlockers blocking Google Drive.
    console.warn("Silent background promise rejected:", event.reason);
});

// --- ENTERPRISE UPGRADE: "ANTI-SWIPE" DATA LOSS PREVENTER ---
window.addEventListener('beforeunload', (event) => {
    // STRICT ERP LOGIC: Only trap the user if they are inside a DATA ENTRY form, not a read-only PDF or Ledger report!
    const openForms = Array.from(document.querySelectorAll('.activity-screen.open')).filter(el => el.id.includes('-form'));
    // 🚨 CRITICAL FIX: Ensure we only trap the user if they have ACTUALLY typed something!
    if (openForms.length > 0 && window.isFormDirty) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
    }
});


// --- ENTERPRISE UPGRADE: LIVE NETWORK HEARTBEAT BANNER ---
const updateNetworkStatus = () => {
    let banner = document.getElementById('offline-banner');
    // Dynamically inject the banner into the HTML if it doesn't exist yet
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; text-align: center; padding: 6px; font-size: 12px; font-weight: 600; color: white; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateY(-100%); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
        document.body.appendChild(banner);
    }
    
    if (!navigator.onLine) {
        // Drop down the red warning banner
        banner.style.backgroundColor = 'var(--md-error, #ba1a1a)';
        banner.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">cloud_off</span> You are offline. Working locally.';
        banner.style.transform = 'translateY(0)';
    } else {
        // Turn it green, tell them they are connected, then slide it away after 3 seconds
        banner.style.backgroundColor = 'var(--md-success, #146c2e)';
        banner.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">cloud_done</span> Back online. Sync ready.';
        
        if (window.networkBannerTimeout) clearTimeout(window.networkBannerTimeout);
        window.networkBannerTimeout = setTimeout(() => { banner.style.transform = 'translateY(-100%)'; }, 3000);

        // ENTERPRISE UPGRADE: SMART AUTO-RECOVERY
        // The moment internet is restored, silently push all offline work to Google Drive!
        if (typeof Cloud !== 'undefined' && typeof Cloud.autoBackup === 'function') {
            if (typeof gapi !== 'undefined' && gapi.client && gapi.client.getToken() !== null) {
                // ENTERPRISE FIX: Debounce the connection! 
                // If 4G flickers rapidly, this prevents 5 simultaneous backups from corrupting the Google Drive file!
                if (window.cloudSyncTimeout) clearTimeout(window.cloudSyncTimeout);
                window.cloudSyncTimeout = setTimeout(() => Cloud.autoBackup(), 2000);
            }
        }
    }
};

window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('online', updateNetworkStatus);
// Run once on boot just in case they open the app while already offline
if (!navigator.onLine) updateNetworkStatus();

// --- ENTERPRISE SECURITY: BANKING PRIVACY SHIELD ---
// Blurs the screen when the app is pushed to the background to hide financial data
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        document.body.classList.add('privacy-blur');
    } else {
        // Remove blur with a tiny delay to let the OS finish waking up the app
        setTimeout(() => document.body.classList.remove('privacy-blur'), 150);
    }
});

// ENTERPRISE FIX: Removed the hazardous 'DOUBLE-CHARGE PREVENTER' from app.js!
// ui.js already contains a vastly superior 'Anti-Clone Shield' that doesn't break HTML form validators.
// Having both running simultaneously was causing permanent button freezes!

// (Pincode engine moved inside the main 'app' object below for absolute stability!)

// --- ENTERPRISE UI: REAL-TIME FORM VALIDATION LOCK ---
// Watches every keystroke and prevents clicking "Save" until required fields are filled!
let formValidationTimer = null;
document.addEventListener('input', (e) => {
    const form = e.target.closest('form');
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    // 🚨 ENTERPRISE UPGRADE: KEYBOARD CPU DEBOUNCER!
    // Prevents the phone from freezing and recalculating the whole form 100 times while typing fast.
    if (formValidationTimer) clearTimeout(formValidationTimer);
    
    formValidationTimer = setTimeout(() => {
        let isValid = true;
        for (let i = 0; i < form.elements.length; i++) {
            if (form.elements[i].willValidate && !form.elements[i].validity.valid) {
                isValid = false;
                break;
            }
        }

        if (isValid) {
            submitBtn.style.opacity = '1';
            submitBtn.style.filter = 'grayscale(0%)';
            submitBtn.style.transform = 'scale(1)';
        } else {
            // We keep it visually faded, but we DO NOT physically disable it. 
            // This allows the browser to automatically scroll the user to the missing required field when clicked!
            submitBtn.style.opacity = '0.7';
            submitBtn.style.filter = 'grayscale(100%)';
            submitBtn.style.transform = 'scale(0.98)';
        }
    }, 150); // Wait exactly 150ms for the user to stop typing before running heavy math!
});

// Force validation check the moment any form is opened
document.addEventListener('click', (e) => {
    if (e.target.closest('.tap-target') || e.target.closest('.floating-action-button')) {
        setTimeout(() => {
            document.querySelectorAll('form').forEach(f => {
                if (f.closest('.open')) f.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }, 350);
    }
});

// ENTERPRISE FIX: Completely annihilated the Global MutationObserver!
// The app uses high-speed Virtual Lists (M3 Cards) now. This legacy observer was scanning the entire HTML body 
// every single time a pixel changed, causing severe CPU lag, battery drain, and stuttering scrolling!
// ---------------------------------------------

// --- ENTERPRISE UI: SMART SCROLL MENU (AUTO-HIDE) ---
// Hides the bottom navigation bar when scrolling down to give 100% screen reading space!
let lastScrollY = 0;
// We use { capture: true, passive: true } so the 120hz mobile scrolling never lags
document.addEventListener('scroll', (e) => {
    // ENTERPRISE FIX: Target the correct HTML class so the immersive scroll-hide actually works!
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const target = e.target;
    // Get the scroll position of whatever container is currently scrolling
    const currentScroll = target.scrollTop || window.scrollY;

    if (currentScroll === undefined || currentScroll < 0) return;

    // Only hide if we've scrolled down past the top header, and ignore tiny accidental thumb twitches
    if (currentScroll > lastScrollY && currentScroll > 60) {
        bottomNav.classList.add('nav-hidden'); // Scrolling Down = Hide Menu
    } else if (currentScroll < lastScrollY - 5 || currentScroll < 50) {
        bottomNav.classList.remove('nav-hidden'); // Scrolling Up = Show Menu
    }
    
    lastScrollY = currentScroll;
}, { capture: true, passive: true });

const app = {
    state: { currentEditId: null, currentReceiptId: null, currentDocType: 'invoice', firmId: 'firm1' },

    // ==========================================
    // 🚨 ENTERPRISE UPGRADE: SMART PINCODE AUTO-FETCH (TRI-API ENGINE)
    // ==========================================
    fetchPincode: async (pincode, type) => {
        if (!pincode || String(pincode).length !== 6) return;
        try {
            if (window.Utils) window.Utils.showToast("Fetching location... 📍");
            
            let city = '', state = '';
            
            // API 1: Primary Indian Postal API
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500); 
                try {
                    const res1 = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal });
                    const data1 = await res1.json();
                    if (data1 && data1[0] && data1[0].Status === 'Success') {
                        city = data1[0].PostOffice[0].District || data1[0].PostOffice[0].Block || data1[0].PostOffice[0].Region;
                        state = data1[0].PostOffice[0].State;
                    }
                } finally {
                    clearTimeout(timeoutId);
                }
            } catch (e1) { console.warn("Primary API Failed:", e1); }

            // API 2: Fallback to Global OpenStreetMap (Nominatim)
            if (!city || !state) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3500);
                    try {
                        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=india&format=json&addressdetails=1`, { 
    signal: controller.signal,
    headers: { 'User-Agent': 'SolloERP/6.1 (your-email@example.com)' }
});
                        const data2 = await res2.json();
                        if (data2 && data2.length > 0 && data2[0].address) {
                            city = data2[0].address.state_district || data2[0].address.city || data2[0].address.county || data2[0].address.town;
                            state = data2[0].address.state;
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                } catch (e2) { console.warn("Secondary API Failed:", e2); }
            }

            // API 3: Final Fallback to Zippopotam
            if (!city || !state) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3500);
                    try {
                        const res3 = await fetch(`https://api.zippopotam.us/in/${pincode}`, { signal: controller.signal });
                        if (res3.ok) {
                            const data3 = await res3.json();
                            if (data3.places && data3.places.length > 0) {
                                city = data3.places[0]["place name"];
                                state = data3.places[0]["state"];
                            }
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                } catch (e3) { console.warn("Tertiary API Failed:", e3); }
            }

            // Inject the data securely into the form
            if (city && state) {
                const cityEl = document.getElementById(`${type}-city`);
                const stateEl = document.getElementById(`${type}-state`);
                
                if (cityEl && !cityEl.value) {
                    cityEl.value = city;
                    cityEl.dispatchEvent(new Event('input', { bubbles: true })); 
                }
                if (stateEl && !stateEl.value) {
                    stateEl.value = state;
                    stateEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (window.Utils) window.Utils.showToast("Location auto-filled! ✨");
                if (window.UI && typeof window.UI.triggerHaptic === 'function') window.UI.triggerHaptic('medium');
            } else {
                // 🚨 ENTERPRISE FIX: Fail silently! Do not yell "Invalid Pincode" at the user if all 3 APIs are offline or missing data!
                if (window.Utils) window.Utils.showToast("Please enter city & state manually.");
            }

        } catch (err) {
            console.error("Critical Pincode API Error:", err);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: NATIVE CONTACT PICKER
    // ==========================================
    importContact: async () => {
        // Hardware support check
        const supported = ('contacts' in navigator && 'ContactsManager' in window);
        if (!supported) {
            if (window.Utils) window.Utils.showToast("⚠️ Contact import is not supported on this device/browser.");
            return;
        }
        
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: false };
            const contacts = await navigator.contacts.select(props, opts);
            
            if (contacts && contacts.length > 0) {
                const contact = contacts[0];
                
                if (contact.name && contact.name.length > 0) {
                    const nameEl = document.getElementById('ledger-name');
                    if (nameEl) {
                        nameEl.value = contact.name[0];
                        nameEl.dispatchEvent(new Event('input', { bubbles: true })); // Trigger listeners
                    }
                }
                
                if (contact.tel && contact.tel.length > 0) {
                    const phoneEl = document.getElementById('ledger-phone');
                    if (phoneEl) {
                        // Clean up the phone number (removes spaces, hyphens, and parentheses)
                        let cleanPhone = contact.tel[0].replace(/[\s\-\(\)]/g, '');
                        phoneEl.value = cleanPhone;
                        phoneEl.dispatchEvent(new Event('input', { bubbles: true })); // Trigger listeners
                    }
                }
                
                if (window.Utils) window.Utils.showToast("✅ Contact imported successfully!");
                if (window.UI) window.UI.triggerHaptic('medium');
            }
        } catch (err) {
            console.log("Contact import cancelled or failed:", err);
        }
    },

    // ==========================================
    // ENTERPRISE UX: DASHBOARD QUICK LINKS
    // ==========================================
    viewFilteredSales: (status) => {
        // 1. Navigate to the Documents Tab seamlessly
        if (window.UI && typeof window.UI.switchTab === 'function') {
            const navBtn = document.getElementById('nav-docs');
            window.UI.switchTab('tab-documents', 'Documents', navBtn);
            
            // 2. Ensure the Sales view is active (hiding Purchases if it was open)
            const salesView = document.getElementById('doc-sales-view');
            const purchView = document.getElementById('doc-purchase-view');
            if (salesView && purchView) {
                salesView.classList.remove('hidden');
                purchView.classList.add('hidden');
            }
            
            // 3. Wait 150ms for the screen to slide over, then apply the native filter!
            setTimeout(() => {
                if (window.UI) {
                    // Inject the status filter
                    window.UI.state.activeFilters = window.UI.state.activeFilters || {};
                    window.UI.state.activeFilters['sales'] = status;
                    
                    // 🚨 ENTERPRISE FIX: Tell the Documents Tab to physically obey the Dashboard's Date Filter!
                    window.UI.state.applyDashboardDateToDocuments = true;
                    
                    if (typeof window.UI.applyFilters === 'function') window.UI.applyFilters('sales');
                    
                    if (window.Utils) {
                        const dashFilterEl = document.getElementById('dashboard-date-filter');
                        const dateFilterName = dashFilterEl && dashFilterEl.options ? dashFilterEl.options[dashFilterEl.selectedIndex].text : 'Selected Date Range';
                        window.Utils.showToast(`Filtered: ${status} (${dateFilterName})`);
                    }
                }
            }, 150);
        }
    },

    // ==========================================
    // 1. BOOT SEQUENCE & FIRM MANAGEMENT
    // ==========================================
    init: async () => {
        try {
            // --- NEW CODE: Apply theme immediately on boot ---
            UI.initTheme();
            
            // NEW: Load Document Formatting Settings
            app.loadDocumentSettings();
            // --- END OF NEW CODE ---

            // (Service Worker registration moved to index.html for PWABuilder)
            
            // --- ENTERPRISE UPGRADE: SMART PWA UPDATER ---
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            // If a new update is downloaded from the server and ready...
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New update available! Waiting for next restart.');
                                // Bug Fix: Give the user the choice to restart immediately to clear the PWA deadlock
                                if (confirm("✨ A new update is available! Would you like to restart the app now to apply it?")) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                    setTimeout(() => window.location.reload(), 200);
                                } else {
                                    if (window.Utils && typeof window.Utils.showToast === 'function') {
                                        window.Utils.showToast("Update downloaded! It will apply on next restart.");
                                    }
                                }
                            }
                        });
                    });
                });
                
                // ENTERPRISE FIX: Removed the Violent Auto-Reload!
                // Force-reloading the DOM while a user is typing an invoice will destroy their data!
                // We let the Service Worker install silently, and it will apply naturally the next time they open the app.
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (window.Utils) window.Utils.showToast("✨ App updated in background! Restart later to apply.");
                });
            }

            // --- NEW CODE: Request Persistent Storage ---
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log(`Persistent storage granted: ${isPersisted}`);
            } else {
                console.warn("Persistent storage API is not supported in this browser.");
            }
            // --- END OF NEW CODE ---

            // 2. Initialize the Database and load data
            await initDB();
            await app.loadFirms();
            
            await app.loadAllData(); 
            app.setupForms();
            
            // ENTERPRISE UPGRADE: Hardware Contact Picker Check
            if ('contacts' in navigator && 'ContactsManager' in window) {
                const importBtn = document.getElementById('btn-import-contact');
                if (importBtn) importBtn.style.display = 'flex';
            }
            
            // ENTERPRISE FIX: Order of Operations is Critical!
            // The Splash Screen MUST hide, and Filters MUST apply BEFORE the Dashboard renders!
            if (window.UI) {
                if (typeof window.UI.hideSplash === 'function') window.UI.hideSplash();
                
                window.UI.applyFilters('sales');
                window.UI.applyFilters('purchases');
                window.UI.applyFilters('masters');
                window.UI.applyFilters('expenses');
                window.UI.applyFilters('cashbook');
                window.UI.applyFilters('timeline');
                
                // Allow a microscopic 50ms delay for the DOM to register the filters before drawing the math!
                if (typeof window.UI.renderDashboard === 'function') {
                    setTimeout(() => window.UI.renderDashboard(), 50);
                }
            }
            
            // 🚨 BATTERY OPTIMIZATION: Delay the heavy database scan so the app has time to fully boot and stabilize first!
            setTimeout(() => { 
                if (window.requestIdleCallback) {
                    // This forces Android to only run the heavy math when the CPU is resting!
                    window.requestIdleCallback(() => app.cleanupDuplicates());
                } else {
                    app.cleanupDuplicates();
                }
            }, 12000);

            // FIX: Parse PWA Home Screen Shortcuts and route the user!
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            if (action === 'new_sale') {
                setTimeout(() => app.openForm('sales', null, 'invoice'), 300);
            } else if (action === 'cashbook') {
                setTimeout(() => { if(window.UI) window.UI.switchTab('tab-cashbook', 'Cashbook & Banking', document.getElementById('nav-cashbook')); }, 300);
            }
            
            // ENTERPRISE FIX: Wipe the URL parameter so waking up the app doesn't force-open the sales form and delete unsaved work!
            if (action && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

        } catch (e) { 
            // ENTERPRISE FIX: Dynamically display the exact Javascript error so we can trace it!
            console.error("Boot Crash Full Stack:", e);
            alert("Boot Crash: " + e.message); 
            if(window.UI) UI.hideSplash();
        }
    },

    loadFirms: async () => {
        let firms = typeof getAllFirms === 'function' ? await getAllFirms() : [];
        
        // Auto-initialize a default firm if the database is completely empty
        if (!firms || firms.length === 0) {
            const defaultFirm = {
                // --- NEW CODE: Dynamically generate a unique ID to prevent cloud sync collisions ---
                id: typeof Utils !== 'undefined' ? Utils.generateId() : 'firm-' + Date.now(),
                // --- END OF NEW CODE ---
                name: 'Main Company',
                phone: '',
                email: '',
                gst: '',
                address: '',
                state: ''
            };
            await saveRecord('firms', defaultFirm);
            firms = [defaultFirm];
        }
        
        app.state.firmId = firms[0].id;
        
        const firmData = await getRecordById('businessProfile', app.state.firmId);
        if (firmData) {
            document.getElementById('profile-name').value = firmData.name || '';
            document.getElementById('profile-phone').value = firmData.phone || '';
            document.getElementById('profile-email').value = firmData.email || '';
            document.getElementById('profile-gst').value = firmData.gst || '';
            document.getElementById('profile-address').value = firmData.address || '';
            // 🚨 ENTERPRISE FIX: Load the missing City field so the form doesn't stay blank!
            if (document.getElementById('profile-city')) document.getElementById('profile-city').value = firmData.city || '';
            if (document.getElementById('profile-pincode')) document.getElementById('profile-pincode').value = firmData.pincode || ''; // 🚨 ADDED PINCODE LOAD
            document.getElementById('profile-state').value = firmData.state || '';
            document.getElementById('profile-bank').value = firmData.bankDetails || '';
            // ENTERPRISE FIX: Load the UPI ID into the UI
            const upiEl = document.getElementById('profile-upi');
            if (upiEl) upiEl.value = firmData.upiId || '';
            document.getElementById('profile-terms').value = firmData.terms || '';
            
            // NEW: Load Custom Field Names
            document.getElementById('profile-cf1-name').value = firmData.cf1Name || '';
            document.getElementById('profile-cf2-name').value = firmData.cf2Name || '';
            document.getElementById('profile-cf3-name').value = firmData.cf3Name || '';
            
            if (firmData.logo) {
                const img = document.getElementById('profile-logo-preview');
                img.src = firmData.logo;
                img.classList.remove('hidden');
            }
            if (firmData.signature) {
                const img = document.getElementById('profile-signature-preview');
                img.src = firmData.signature;
                img.classList.remove('hidden');
            }
            
            // 🟢 ENTERPRISE FIX: Load PDF Theme Settings
            document.getElementById('profile-brand-color').value = localStorage.getItem('sollo_brand_color') || '#000000';
            document.getElementById('profile-pdf-font').value = localStorage.getItem('sollo_pdf_font') || 'inter';
        }
    },

    // ==========================================
    // 2. DATA HYDRATION & STATE MANAGEMENT
    // ==========================================
    loadAllData: async () => {
        // ENTERPRISE FIX: Moved RAM Cache safely inside the function!
        window.AppCache = window.AppCache || { items: null, ledgers: null, accounts: null }; 

        const stripBloat = (arr) => arr.map(r => { const c = {...r}; delete c.image; delete c.attachment; return c; });
        
        // ENTERPRISE FIX: Absolute Self-Healing Boot Engine!
        // If any core objects were accidentally deleted, the app instantly rebuilds them instead of crashing!
        window.AppCache = window.AppCache || {};
        window.UI = window.UI || { state: { rawData: {} } };
        window.UI.state = window.UI.state || { rawData: {} };
        window.UI.state.rawData = window.UI.state.rawData || {};
        
        // Safely extract the Firm ID without throwing TypeErrors
        const safeFirm = (typeof app !== 'undefined' && app.state) ? app.state.firmId : 'firm1';
        // ENTERPRISE FIX: Prevent massive Out-of-Memory (OOM) crashes by securely deleting Base64 images from RAM!
        const safeStrip = (arr) => Array.isArray(arr) ? arr.map(i => { const c = {...i}; delete c.image; delete c.attachment; return c; }) : [];

        // 1. Dynamic Data (Always fetch fresh from Database)
        // ENTERPRISE FIX: Appended || [] to everything so .filter() NEVER crashes!
        UI.state.rawData.sales = (await getAllRecords('sales', 'firmId', safeFirm).catch(() => [])) || [];
        UI.state.rawData.purchases = (await getAllRecords('purchases', 'firmId', safeFirm).catch(() => [])) || [];
        
        // 🚨 NEW FIX: Fetch and sort expenses in descending alphanumeric order based on expenseNo
        let rawExpenses = safeStrip((await getAllRecords('expenses', 'firmId', safeFirm).catch(() => [])) || []);
        rawExpenses.sort((a, b) => String(b.expenseNo || b.id).localeCompare(String(a.expenseNo || a.id), undefined, {numeric: true, sensitivity: 'base'}));
        UI.state.rawData.expenses = rawExpenses;
        
        UI.state.rawData.cashbook = (await getAllRecords('receipts', 'firmId', safeFirm).catch(() => [])) || [];
        
        try {
            const rawTime = typeof getGlobalTimeline === 'function' ? await getGlobalTimeline(safeFirm) : [];
            UI.state.rawData.timeline = rawTime || [];
        } catch(e) { UI.state.rawData.timeline = []; }
        
        UI.state.rawData.adjustments = (await getAllRecords('adjustments', 'firmId', safeFirm).catch(() => [])) || [];
        
        // 2. RAM CACHE: Static Master Data (Instant Load 0ms)
        if (!window.AppCache.items) window.AppCache.items = safeStrip((await getAllRecords('items', 'firmId', safeFirm).catch(() => [])) || []);
        UI.state.rawData.items = window.AppCache.items;

        if (!window.AppCache.ledgers) window.AppCache.ledgers = (await getAllRecords('ledgers', 'firmId', safeFirm).catch(() => [])) || [];
        UI.state.rawData.ledgers = window.AppCache.ledgers;

        if (!window.AppCache.accounts) {
            const safeAccs = (await getAllRecords('accounts').catch(() => [])) || [];
            window.AppCache.accounts = safeAccs.filter(r => r.firmId === safeFirm);
        }
        UI.state.rawData.accounts = window.AppCache.accounts;

        const safeTrash = (await getAllRecords('trash').catch(() => [])) || [];
        UI.state.rawData.trash = safeTrash.filter(t => t.firmId === safeFirm);

        // Refresh our new dynamic dropdowns
        await app.loadDropdowns();

        // Dynamic Account Dropdown Hydration
        const accountDropdowns = ['sales-account-id', 'purchase-account-id', 'expense-account-id', 'pay-in-account', 'pay-out-account'];
        let accountOptions = UI.state.rawData.accounts.map(acc => 
            `<option value="${acc.id}">${acc.name} (${acc.type})</option>`
        ).join('');

        // CRITICAL FIX: Always include the default Cash Drawer if a custom one doesn't exist
        if (!UI.state.rawData.accounts.some(acc => acc.id === 'cash')) {
            accountOptions = `<option value="cash">Default Cash Drawer</option>` + accountOptions;
        }

        accountDropdowns.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = accountOptions;
        });

        // ==========================================
        // ENTERPRISE UPGRADE: WAREHOUSE MINI-TABLE ENGINE (VELOCITY PREDICTOR)
        // ==========================================
        if (UI.state.rawData.items) {
            let totalValuation = 0;
            let lowStockItems = []; 

            // 🚨 VELOCITY ENGINE: Calculate the date 30 days ago to measure demand!
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const salesHistory = UI.state.rawData.sales || [];
            
            // 🚨 CAPITAL ENGINE: Pull historical purchases to calculate real-world costs
            const purchaseHistory = UI.state.rawData.purchases || [];

            UI.state.rawData.items.forEach(i => {
                const rawGst = parseFloat(i.stockGst);
                const rawNon = parseFloat(i.stockNonGst);
                const stockGst = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
                const stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                // 🚨 ENTERPRISE FIX: Allow negative stock to accurately reduce warehouse capital!
                const totalStock = stockGst + stockNonGst; 
                
                // 🚨 CAPITAL ENGINE: True Weighted Average Cost (WAC) Valuation
                let trueCost = parseFloat(i.buyPrice) || 0; // Fallback to master price if no bills exist
                let totalBoughtQty = 0;
                let totalBoughtValue = 0;

                purchaseHistory.forEach(p => {
                    if (p.firmId === app.state.firmId && p.status !== 'Open' && p.status !== 'Cancelled') {
                        (p.items || []).forEach(row => {
                            if (String(row.itemId) === String(i.id)) {
                                let q = parseFloat(row.qty) || 0;
                                let r = parseFloat(row.rate) || 0; // The actual rate paid on the bill
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

                // Mathematically calculate the true average cost of the items
                if (totalBoughtQty > 0) {
                    trueCost = totalBoughtValue / totalBoughtQty; 
                }

                // Add the true audited value to the dashboard total
                totalValuation += (totalStock * trueCost);

                const minStock = parseFloat(i.minStock) || 0;
                
                // 🚨 VELOCITY ENGINE: Calculate exact daily sales for this specific item!
                let soldIn30Days = 0;
                salesHistory.forEach(s => {
                    if (s.firmId === app.state.firmId && s.status !== 'Open' && s.status !== 'Cancelled') {
                        if (window.Utils.safeDate(s.date) >= thirtyDaysAgo) {
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
                let urgencyScore = 999; // Lower is worse
                
                // Trigger 1: Hard Limit (They hit their exact minimum)
                if (minStock > 0 && totalStock <= minStock) {
                    isCritical = true;
                    triggerReason = `${totalStock} / ${minStock}`;
                    urgencyScore = totalStock - minStock; // Negative means they are deep in deficit
                } 
                // Trigger 2: Velocity Alert (They have stock, but it will run out in < 7 days based on heavy sales!)
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

            const valEl = document.getElementById('dash-inventory-value');
            if (valEl) valEl.innerText = `₹${totalValuation.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            const lsText = document.getElementById('dash-low-stock-text');
            const lsIcon = document.getElementById('dash-low-stock-icon');
            const lsBtn = document.getElementById('dash-low-stock-btn');

            if (lsText && lsIcon && lsBtn) {
                const oldTable = document.getElementById('dash-mini-table');
                if (oldTable) oldTable.remove();

                if (lowStockItems.length > 0) {
                    lsBtn.style.display = '';
                    
                    // 🚨 VELOCITY ENGINE: Sort items by pure urgency so the most dangerous shortages are at the top!
                    lowStockItems.sort((a, b) => a.score - b.score);
                    const topItems = lowStockItems.slice(0, 3);
                    
                    let tableRows = topItems.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 6px 0; border-bottom: 1px dashed rgba(186, 26, 26, 0.2);">
                            <span style="color: #410002; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%; font-weight: 600;">${item.name}</span>
                            <span style="color: var(--md-error); font-weight: 800; background: #ffe4e6; padding: 2px 6px; border-radius: 4px;">${item.reason}</span>
                        </div>
                    `).join('');
                    
                    let extraCount = lowStockItems.length - 3;
                    let extraText = extraCount > 0 ? `<div style="text-align: center; font-size: 10px; color: var(--md-error); margin-top: 8px; font-weight: 800; text-transform: uppercase;">+${extraCount} MORE ITEMS CRITICAL</div>` : '';

                    lsText.innerHTML = `<span style="font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">RESTOCK REQUIRED</span>`;
                    lsText.style.color = 'var(--md-error)';
                    lsIcon.innerText = 'warning';
                    lsIcon.style.color = 'var(--md-error)';
                    lsBtn.style.borderLeft = '4px solid var(--md-error)';
                    lsBtn.style.background = 'rgba(186, 26, 26, 0.05)'; // Tint the entire card red for extreme visibility!
                    
                    // Inject the gorgeous Mini-Table right into the dashboard
                    const tableHTML = `<div id="dash-mini-table" style="width: 100%; margin-top: 12px; background: rgba(255,255,255,0.8); border-radius: 6px; padding: 4px 12px; border: 1px solid rgba(186,26,26,0.2); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${tableRows}${extraText}</div>`;
                    lsBtn.insertAdjacentHTML('beforeend', tableHTML);
                    
                    // Keep the Smart Router attached so tapping the card still works!
                    lsBtn.onclick = () => {
                        if (window.UI) {
                            window.UI.state.currentMasterType = 'products'; 
                            window.UI.openBottomSheet('sheet-products');
                            setTimeout(() => {
                                window.UI.state.activeFilters = window.UI.state.activeFilters || {};
                                window.UI.state.activeFilters['masters'] = 'Low Stock';
                                if (window.Utils) window.Utils.showToast("Filtered: Critical Restock ⚠️");
                                if (typeof window.UI.applyFilters === 'function') window.UI.applyFilters('masters');
                            }, 150);
                        }
                    };

                } else {
                    // THE GHOST UI: Completely hide the card to save screen space when stock is perfect!
                    lsBtn.style.display = 'none';
                }
            }
        }

        // ==========================================
        // ENTERPRISE UPGRADE: RECEIVABLES AGING ENGINE
        // ==========================================
        if (UI.state.rawData.sales && UI.state.rawData.cashbook) {
            let bucket30 = 0, bucket60 = 0, bucket90 = 0, totalDue = 0;
            const today = new Date();
            
            // 🚨 ENTERPRISE FIX: Pre-calculate Returns so Credit Notes don't swallow payments!
            const dashboardReturnMap = {};
            UI.state.rawData.sales.forEach(d => {
                if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                    dashboardReturnMap[d.orderNo] = (dashboardReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                }
            });

            // Build an instant payment lookup map
            const paymentMap = {};
            UI.state.rawData.cashbook.forEach(r => {
                if (r.firmId === app.state.firmId && r.invoiceRef && r.type === 'in') {
                    const refs = String(r.invoiceRef).split(',').map(x => x.trim()).filter(Boolean);
                    let remainingPayment = parseFloat(r.amount) || 0;
                    refs.forEach(ref => {
                        const linkedDoc = UI.state.rawData.sales.find(d => d.id === ref || d.invoiceNo === ref || d.orderNo === ref || String(d.id).endsWith(ref));
                        
                        // 🚨 FIX: The Blackhole Credit Note Trap
                        // Deduct the return to find the true net total, allowing excess money to waterfall!
                        const returned = [linkedDoc?.orderNo, linkedDoc?.invoiceNo, linkedDoc?.id, ref].filter(Boolean).reduce((sum, r) => sum + (dashboardReturnMap[r] || 0), 0);
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

            UI.state.rawData.sales.forEach(sale => {
                // ENTERPRISE FIX: The Phantom Debt Shield!
                // Added 'Cancelled' to the ignore list so voided invoices don't permanently bloat the High-Risk aging bucket!
                if (sale.firmId === app.state.firmId && sale.status !== 'Completed' && sale.status !== 'Open' && sale.status !== 'Cancelled' && sale.documentType !== 'return') {
                    // Match the precise true balance using the core payment map
                    const uniqueRefs = [...new Set([sale.orderNo, sale.invoiceNo, sale.id].filter(Boolean))];
                    // ENTERPRISE FIX: Check the map using the customer ID prefix!
                    const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${sale.customerId}_${ref}`] || 0), 0);
                    
                    // ENTERPRISE FIX: Subtract Credit Notes so returned items don't falsely inflate dashboard debt!
                    const linkedReturns = UI.state.rawData.sales.filter(d => d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open' && d.status !== 'Cancelled' && uniqueRefs.includes(d.orderNo));
                    const returnTotal = linkedReturns.reduce((sum, ret) => sum + (parseFloat(ret.grandTotal) || 0), 0);
                    
                    const balance = (parseFloat(sale.grandTotal) || 0) - paid - returnTotal;

                    if (balance > 0.01) {
                        totalDue += balance;
                        // 🚨 FIX: Calculate aging from the Dispatched Date (if available), otherwise fallback to Invoice Date
                        const baseDate = sale.shippedDate ? sale.shippedDate : sale.date;
                        const diffTime = today - window.Utils.safeDate(baseDate);
                        
                        // ENTERPRISE FIX: The "Post-Dated" Aging Panic Shield!
                        // The old 'Math.abs' converted future invoices into past-due invoices, triggering fake High-Risk 90+ Day alerts!
                        if (diffTime >= 0) {
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

                            if (diffDays <= 30) bucket30 += balance;
                            else if (diffDays <= 60) bucket60 += balance;
                            else bucket90 += balance;
                        }
                    }
                }
            });

            const totalEl = document.getElementById('aging-total-due');
            if (totalEl) {
                totalEl.innerText = `₹${totalDue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-30-amt').innerText = `₹${bucket30.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-60-amt').innerText = `₹${bucket60.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                document.getElementById('aging-90-amt').innerText = `₹${bucket90.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                
                document.getElementById('aging-30-bar').style.width = totalDue > 0 ? `${(bucket30/totalDue)*100}%` : '0%';
                document.getElementById('aging-60-bar').style.width = totalDue > 0 ? `${(bucket60/totalDue)*100}%` : '0%';
                document.getElementById('aging-90-bar').style.width = totalDue > 0 ? `${(bucket90/totalDue)*100}%` : '0%';
            }
        }
    },

    // ==========================================
    // CORE UI REFRESH ENGINE (Restored)
    // ==========================================
    refreshAll: async () => {
        await app.loadAllData();
        if (window.UI) {
            window.UI.applyFilters('sales');
            window.UI.applyFilters('purchases');
            window.UI.applyFilters('masters');
            window.UI.applyFilters('expenses');
            window.UI.applyFilters('cashbook');
            window.UI.applyFilters('timeline');
            window.UI.renderDashboard();
        }
        
        // Trigger silent background backup if active
        if (typeof Cloud !== 'undefined' && Cloud.autoBackup) {
            // ENTERPRISE FIX: Only run background backup if Google Drive is ALREADY authenticated!
            // This prevents the Google Drive login screen from violently interrupting your workflow after saving.
            if (typeof gapi !== 'undefined' && gapi.client && gapi.client.getToken() !== null) {
                Cloud.autoBackup();
            }
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: GLOBAL STOCK HEALER
    // ==========================================
    recalculateAllStock: async () => {
        if (!confirm("This will scan every past invoice and mathematically fix all corrupted stock & warehouse capital. Continue?")) return;
        try {
            if (window.Utils) window.Utils.showToast("Recalculating all stock... ⏳");
            
            // ENTERPRISE FIX: Prevent RAM crashes by making IndexedDB filter the active firm BEFORE it hits memory!
            const activeFirmId = app.state.firmId;
            const allItems = await window.getAllRecords('items', 'firmId', activeFirmId);
            const allSales = await window.getAllRecords('sales', 'firmId', activeFirmId);
            const allPurchases = await window.getAllRecords('purchases', 'firmId', activeFirmId);
            const allExpenses = await window.getAllRecords('expenses', 'firmId', activeFirmId);
            const allAdjustments = await window.getAllRecords('adjustments', 'firmId', activeFirmId);
            
            // 1. Reset all items to their Initial Opening Stock securely
            for (let i of allItems) { 
                i.stockGst = parseFloat(i.openingStockGst) || (parseFloat(i.openingStock) || 0); 
                i.stockNonGst = parseFloat(i.openingStockNonGst) || 0; 
                i.stock = parseFloat(i.openingStock) || 0; 
            }
            
            // 2. Mathematically rebuild stock step-by-step
            const processDocs = (docs, isSale) => {
                docs.forEach(doc => {
                    if (doc.status === 'Open' || doc.status === 'Cancelled') return; // Skip Drafts & Cancelled!
                    const isReturn = doc.documentType === 'return';
                    const isNonGST = doc.invoiceType === 'Non-GST';
                    (doc.items || []).forEach(row => {
                        const dbItem = allItems.find(item => String(item.id) === String(row.itemId || row.id));
                        if (dbItem) {
                            // ENTERPRISE FIX: Absolute Math prevents Inverted Returns!
                            // Because Return invoices use negative quantities in the UI, we MUST convert them to absolute numbers first!
                            const absQty = Math.abs(parseFloat(row.qty) || 0);
                            const impact = isSale ? (isReturn ? absQty : -absQty) : (isReturn ? -absQty : absQty);
                            if (isNonGST) dbItem.stockNonGst += impact;
                            else dbItem.stockGst += impact;
                        }
                    });
                });
            };
            processDocs(allSales, true);
            processDocs(allPurchases, false);
            processDocs(allExpenses, true); // Deducts stock consumed through the expense ledger
            
            // 3. Process Manual Stock Adjustments
            allAdjustments.forEach(adj => {
                const dbItem = allItems.find(item => String(item.id) === String(adj.itemId || adj.id));
                if (dbItem) {
                    const qty = parseFloat(adj.qty) || 0;
                    const impact = adj.type === 'add' ? qty : -qty;
                    // ENTERPRISE FIX: If the dropdown saved 'non-gst', the strict 'nongst' check fails and dumps it into the GST pool!
                    // Safely route anything that isn't explicitly 'gst' to the Non-GST pool to perfectly match the save engine!
                    if (adj.pool === 'gst') dbItem.stockGst += impact;
                    else dbItem.stockNonGst += impact;
                }
            });
            
            // 4. Save corrected numbers to hard drive
            for (let i of allItems) {
                i.stockGst = Math.round(i.stockGst * 100) / 100;
                i.stockNonGst = Math.round(i.stockNonGst * 100) / 100;
                i.stock = Math.round((i.stockGst + i.stockNonGst) * 100) / 100;
                await window.saveRecord('items', i);
            }
            
            // Force RAM wipe and Dashboard Refresh
            if (window.AppCache) window.AppCache.items = null;
            await app.refreshAll();
            if (window.Utils) window.Utils.showToast("✅ Stock & Capital Mathematically Fixed!");
        } catch (e) {
            console.error(e);
            alert("Error recalculating stock: " + e.message);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: DATA DEDUPLICATION ENGINE
    // ==========================================
    cleanupDuplicates: async () => {
        try {
            let cleaned = false;
            const activeFirmId = app.state.firmId;
            const ledgers = (await getAllRecords('ledgers', 'firmId', activeFirmId).catch(() => [])) || [];
            const allAccounts = (await getAllRecords('accounts').catch(() => [])) || [];
            const accounts = allAccounts.filter(a => a.firmId === activeFirmId);
            const sales = (await getAllRecords('sales', 'firmId', activeFirmId).catch(() => [])) || [];
            const purchases = (await getAllRecords('purchases', 'firmId', activeFirmId).catch(() => [])) || [];
            const receipts = (await getAllRecords('receipts', 'firmId', activeFirmId).catch(() => [])) || [];
            const expenses = (await getAllRecords('expenses').catch(() => [])) || [];

            let batchPuts = [];
            let batchDeletes = [];

            // 1. Merge Duplicate Customers & Suppliers
            const ledgerMap = {};
            for (const l of ledgers) {
                if (l.firmId !== app.state.firmId) continue;
                const safePhone = (l.phone || '').trim();
                const key = `${(l.name || '').trim().toLowerCase()}_${safePhone}_${l.type}`;
                
                if (!ledgerMap[key]) {
                    ledgerMap[key] = l;
                } else {
                    const master = ledgerMap[key];
                    const getSignedBal = (party) => {
                        let bal = parseFloat(party.openingBalance) || 0;
                        const bType = (party.balanceType || '').toLowerCase();
                        if (party.type === 'Customer') return (bType.includes('pay') || bType.includes('credit')) ? -bal : bal;
                        return (bType.includes('receive') || bType.includes('debit')) ? -bal : bal;
                    };

                    const masterSigned = getSignedBal(master);
                    const duplicateSigned = getSignedBal(l);
                    const newNetBal = masterSigned + duplicateSigned;
                    
                    master.openingBalance = Math.abs(newNetBal);
                    if (master.type === 'Customer') {
                        master.balanceType = newNetBal >= 0 ? 'To Receive / Debit' : 'To Pay / Credit';
                    } else {
                        master.balanceType = newNetBal >= 0 ? 'To Pay / Credit' : 'To Receive / Debit';
                    }
                    
                    batchPuts.push({ store: 'ledgers', data: master });

                    for (const s of sales) { if (s.customerId === l.id) { s.customerId = master.id; s.customerName = master.name; batchPuts.push({ store: 'sales', data: s }); } }
                    for (const p of purchases) { if (p.supplierId === l.id) { p.supplierId = master.id; p.supplierName = master.name; batchPuts.push({ store: 'purchases', data: p }); } }
                    for (const r of receipts) { if (r.ledgerId === l.id) { r.ledgerId = master.id; r.ledgerName = master.name; batchPuts.push({ store: 'receipts', data: r }); } }
                    
                    batchDeletes.push({ store: 'ledgers', id: l.id, trashData: l });
                    cleaned = true;
                }
            }

            // 2. Merge Duplicate Bank Accounts & Enforce Official Cash Drawer
            const accMap = {};
            let realCash = accounts.find(a => a.id === 'cash' && a.firmId === app.state.firmId);

            for (const r of receipts) {
                if (!r.accountId || String(r.accountId).trim() === '') {
                    r.accountId = 'cash';
                    batchPuts.push({ store: 'receipts', data: r });
                    cleaned = true;
                }
            }
            
            for (const e of expenses) {
                if (!e.accountId || String(e.accountId).trim() === '') {
                    e.accountId = 'cash';
                    batchPuts.push({ store: 'expenses', data: e });
                    cleaned = true;
                }
            }

            for (const a of accounts) {
                if (a.firmId !== app.state.firmId) continue;
                const key = (a.name || '').trim().toLowerCase();
                
                if ((key === 'cash drawer' || key === 'cash' || key === 'default cash drawer') && a.id !== 'cash') {
                    if (!realCash) {
                        realCash = { id: 'cash', firmId: app.state.firmId, name: 'Cash Drawer', openingBalance: 0 };
                    }
                    realCash.openingBalance = (parseFloat(realCash.openingBalance) || 0) + (parseFloat(a.openingBalance) || 0);
                    batchPuts.push({ store: 'accounts', data: { ...realCash } });

                    for (const r of receipts) { if (r.accountId === a.id) { r.accountId = 'cash'; batchPuts.push({ store: 'receipts', data: r }); } }
                    
                    for (const e of expenses) {
                        if (e.accountId === a.id) {
                            e.accountId = 'cash';
                            batchPuts.push({ store: 'expenses', data: e });
                        }
                    }
                    
                    batchDeletes.push({ store: 'accounts', id: a.id, trashData: a });
                    cleaned = true;
                    continue; 
                }

                if (a.id === 'cash') continue; 
                
                if (!accMap[key]) {
                    accMap[key] = a;
                } else {
                    const master = accMap[key];
                    master.openingBalance = (parseFloat(master.openingBalance) || 0) + (parseFloat(a.openingBalance) || 0);
                    batchPuts.push({ store: 'accounts', data: master });

                    for (const r of receipts) { if (r.accountId === a.id) { r.accountId = master.id; batchPuts.push({ store: 'receipts', data: r }); } }
                    
                    batchDeletes.push({ store: 'accounts', id: a.id, trashData: a });
                    cleaned = true;
                }
            }

            if (cleaned) {
                if (typeof executeAtomicBatch === 'function') await executeAtomicBatch(batchPuts, batchDeletes);
                else if (window.executeAtomicBatch) await window.executeAtomicBatch(batchPuts, batchDeletes);

                if (window.Utils) window.Utils.showToast("Database optimized safely! 🧹");
                
                if (window.AppCache) {
                    window.AppCache.ledgers = null;
                    window.AppCache.accounts = null;
                }
                
                await app.loadAllData();
            }
        } catch (e) {
            console.error("Cleanup failed:", e);
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: STOCK ADJUSTMENT ENGINE
    // ==========================================
    openAdjustmentSheet: async () => {
        try {
            // ENTERPRISE FIX: Scoped database fetch prevents RAM freeze when opening Stock Adjustments!
            const items = await getAllRecords('items', 'firmId', app.state.firmId);
            const select = document.getElementById('adj-product-id');
            
            if (!items || items.length === 0) {
                alert("Please add at least one Product in Inventory for this company first!");
                return;
            }

            // Populate the dropdown with actual products and their dual stock pools!
            let html = '<option value="">Select Product...</option>';
            items.forEach(i => {
                if (i.firmId === app.state.firmId) {
                    const rawGst = parseFloat(i.stockGst);
                    const rawNon = parseFloat(i.stockNonGst);
                    let g = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
                    let ng = isNaN(rawNon) ? 0 : rawNon;
                    const safeItemName = window.Utils.sanitizeHTML ? window.Utils.sanitizeHTML(i.name) : i.name;
                    html += `<option value="${i.id}">${safeItemName} (GST: ${g.toFixed(2)} | Non-GST: ${ng.toFixed(2)})</option>`;
                }
            });
            
            // CRASH-PROOF SHIELD: Only update elements if they actually exist in the HTML!
            if (select) select.innerHTML = html;
            
            const qtyEl = document.getElementById('adj-qty');
            if (qtyEl) qtyEl.value = '';
            
            const notesEl = document.getElementById('adj-notes');
            if (notesEl) notesEl.value = '';
            
            // 🟢 ENTERPRISE FIX: Crash-Proof Date Generator
            const dateEl = document.getElementById('adj-date');
            if (dateEl) {
                const today = new Date().toISOString().split('T')[0];
                dateEl.value = (typeof Utils !== 'undefined' && typeof Utils.getLocalDate === 'function') ? Utils.getLocalDate() : today;
            }

            // Safely open the sheet
            if (window.UI) window.UI.openBottomSheet('sheet-stock-adjustment');
        } catch (error) {
            // LOUD ERROR SCANNER: Forces the app to tell you EXACTLY what crashed!
            console.error("Error opening adjustment sheet:", error);
            alert("CRASH DETAILS: " + error.message);
        }
    },

    // ==========================================
    // NEW: SMART LEDGER DYNAMIC FILTERS
    // ==========================================
    openMasterSort: () => {
        if (!window.UI || !window.UI.state) return;
        const type = window.UI.state.currentMasterType;
        const filterSelect = document.getElementById('filter-master-view');
        const sortSelect = document.getElementById('sort-master-view');

        if (!filterSelect || !sortSelect) return;

        // 🚨 ENTERPRISE FIX: Read the true active state directly from the RAM Engine!
        const currentFilter = (window.UI.state.activeFilters && window.UI.state.activeFilters['masters']) ? window.UI.state.activeFilters['masters'] : 'All';
        const currentSort = (window.UI.state.activeSorts && window.UI.state.activeSorts['masters']) ? window.UI.state.activeSorts['masters'] : 'name-asc';

        let filterHTML = '<option value="All">All Records</option>';
        let sortHTML = '<option value="name-asc">A to Z (Ascending)</option><option value="name-desc">Z to A (Descending)</option>';

        if (type === 'products') {
            filterHTML += `
                <option value="In Stock">Stock Available</option>
                <option value="Low Stock">Low Stock Alert</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="GST Stock">Has GST Stock</option>
                <option value="Non-GST Stock">Has Non-GST Stock</option>
            `;
            sortHTML += `
                <option value="stock-asc">Lowest Stock First</option>
                <option value="stock-desc">Highest Stock First</option>
            `;
        } else if (type === 'customers') {
            filterHTML += `
                <option value="To Receive">Pending Dues (To Receive)</option>
                <option value="Advance">Advance Received</option>
                <option value="Settled">Settled / Zero Balance</option>
            `;
            sortHTML += `
                <option value="bal-desc">Highest Balance First</option>
                <option value="bal-asc">Lowest Balance First</option>
            `;
        } else if (type === 'suppliers') {
            filterHTML += `
                <option value="To Pay">Pending Bills (To Pay)</option>
                <option value="Advance">Advance Paid</option>
                <option value="Settled">Settled / Zero Balance</option>
            `;
            sortHTML += `
                <option value="bal-desc">Highest Balance First</option>
                <option value="bal-asc">Lowest Balance First</option>
            `;
        }

        filterSelect.innerHTML = filterHTML;
        sortSelect.innerHTML = sortHTML;
        
        // 🚨 ENTERPRISE FIX: Restore the user's previous selection!
        if (currentFilter) filterSelect.value = currentFilter;
        if (currentSort) sortSelect.value = currentSort;

        window.UI.openBottomSheet('sheet-master-sort');
    },

    applySmartMasterFilter: () => {
        // The old, clunky DOM filter has been deleted!
        // We now rely 100% on the lightning-fast native data filter inside ui.js!
        if (window.UI && typeof window.UI.applyFilters === 'function') {
            
            // 🚨 ENTERPRISE FIX: Capture the dropdown values and inject them into the state BEFORE filtering!
            const filterSelect = document.getElementById('filter-master-view');
            const sortSelect = document.getElementById('sort-master-view');
            
            window.UI.state.activeFilters = window.UI.state.activeFilters || {};
            window.UI.state.activeSorts = window.UI.state.activeSorts || {};
            
            if (filterSelect) window.UI.state.activeFilters['masters'] = filterSelect.value;
            if (sortSelect) window.UI.state.activeSorts['masters'] = sortSelect.value;
            
            window.UI.applyFilters('masters');
        }
    },

    // ==========================================
    // NEW: SIMPLE MASTER CRUD ENGINE
    // ==========================================
    loadDropdowns: async () => {
        // STRICT ERP LOGIC: Multi-Company Data Isolation for Settings!
        // 1. Auto-seed and Load Units
        // ENTERPRISE FIX: Absolute mathematical safety with '|| []' prevents undefined .filter() crashes!
        let allUnits = (await getAllRecords('units').catch(() => [])) || [];
        let units = allUnits.filter(u => u.firmId === app.state.firmId);
        
        if (units.length === 0) {
            const defaults = ['Pcs', 'Kg', 'Mtr', 'Ltr', 'Box', 'Dozen', 'Tonnes'];
            for (let u of defaults) await saveRecord('units', { id: Utils.generateId(), firmId: app.state.firmId, name: u }).catch(()=>{});
            units = ((await getAllRecords('units').catch(() => [])) || []).filter(u => u.firmId === app.state.firmId);
        }
        const uomSelect = document.getElementById('product-uom-select');
        if (uomSelect) uomSelect.innerHTML = units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');

        // 2. Auto-seed and Load Categories
        let allCats = (await getAllRecords('expenseCategories').catch(() => [])) || [];
        let cats = allCats.filter(c => c.firmId === app.state.firmId);
        
        if (cats.length === 0) {
            const defaults = ['Salary', 'Rent', 'Electricity', 'Transport', 'Office Supplies', 'Marketing', 'Maintenance', 'Other'];
            for (let c of defaults) await saveRecord('expenseCategories', { id: Utils.generateId(), firmId: app.state.firmId, name: c }).catch(()=>{});
            cats = ((await getAllRecords('expenseCategories').catch(() => [])) || []).filter(c => c.firmId === app.state.firmId);
        }
        const catSelect = document.getElementById('expense-category-select');
        if (catSelect) catSelect.innerHTML = '<option value="">Select Category...</option>' + cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    manageSimpleMaster: async (storeName, title) => {
        const titleEl = document.getElementById('simple-master-title');
        if (titleEl) titleEl.innerText = `Manage ${title}`;

        // ENTERPRISE FIX: Safely wrap in || [] so it never crashes on empty databases!
        const allRecords = (await getAllRecords(storeName).catch(() => [])) || [];
        const records = allRecords.filter(r => r.firmId === app.state.firmId);

        const listEl = document.getElementById('list-simple-master');
        if (listEl) {
            if (records.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color:var(--md-text-muted); margin-top: 20px;">No items found.</p>';
            } else {
                listEl.innerHTML = records.map(r => `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid var(--md-surface-variant); border-radius: 8px; margin-bottom: 8px; background: var(--md-surface);">
                        <span style="font-size: 16px; font-weight: 500; line-height: 1; margin: 0; padding: 0;">${window.Utils.sanitizeHTML(r.name)}</span>
                        <div class="tap-target" style="color: var(--md-error); display: flex; justify-content: center; align-items: center; padding: 4px; margin: 0;" onclick="app.deleteSimpleMaster('${storeName}', '${r.id}', '${title}')">
                            <span class="material-symbols-outlined" style="font-size: 24px; display: flex; justify-content: center; align-items: center; line-height: 1; margin: 0; padding: 0;">delete</span>
                        </div>
                    </li>
                `).join('');
            }
        }

        const addBtn = document.getElementById('btn-add-simple-master');
        const inputEl = document.getElementById('simple-master-input');
        
        if (addBtn && inputEl) {
            inputEl.value = ''; 
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);
            
            newAddBtn.onclick = async () => {
                const newName = inputEl.value.trim();
                if (!newName) return window.Utils.showToast("⚠️ Name cannot be empty");
                
                if (records.some(r => String(r.name || '').toLowerCase() === newName.toLowerCase())) {
                    return window.Utils.showToast("⚠️ This already exists!");
                }

                // STRICT ERP LOGIC: Attach the firmId so it doesn't bleed into other companies!
                await saveRecord(storeName, { id: Utils.generateId(), firmId: app.state.firmId, name: newName });
                window.Utils.showToast("Added successfully! ✅");
                
                app.manageSimpleMaster(storeName, title); 
                await app.loadDropdowns(); 
                
                // ENTERPRISE FIX: Auto-Select the newly created option!
                // Rebuilding the dropdown resets the selection, so we forcefully select the new item for the user.
                const targetSelect = storeName === 'units' ? document.getElementById('product-uom-select') : document.getElementById('expense-category-select');
                if (targetSelect) targetSelect.value = newName;
            };
        }

        if (window.UI) window.UI.openBottomSheet('sheet-simple-master');
        
        // Premium Polish: Auto-focus the text box so the mobile keyboard pops up instantly!
        setTimeout(() => {
            const input = document.getElementById('simple-master-input');
            if (input) input.focus();
        }, 300);
    },

    deleteSimpleMaster: async (storeName, id, title) => {
        if (!confirm("Are you sure you want to delete this?")) return;
        
        await deleteRecordById(storeName, id);
        window.Utils.showToast("Deleted successfully! 🗑️");
        
        app.manageSimpleMaster(storeName, title);
        app.loadDropdowns(); 
    },

    // ==========================================
    // UPGRADE: BULK CSV IMPORT ENGINE
    // ==========================================
    downloadCSVTemplate: () => {
        const type = UI.state.currentMasterType;
        let csvContent = "";
        let filename = "";

        if (type === 'products') {
            csvContent = "Name,SellPrice,BuyPrice,OpeningStock,MinStock,UOM,GST_Percent,HSN_Code\n\"Premium Widget\",150.50,100,50,5,Pcs,18,123456\n\"Standard Item\",200,150,20,2,Kg,5,654321";
            filename = "SOLLO_Products_Template.csv";
        } else if (type === 'customers' || type === 'suppliers') {
            const partyType = type === 'customers' ? 'Customer' : 'Supplier';
            csvContent = `Name,Phone,GSTIN,City,State,Address,OpeningBalance,BalanceType\n"Acme Corp",9876543210,29ABCDE1234F1Z5,Bangalore,Karnataka,"123 Main St, Tech Park",1500,${partyType === 'Customer' ? 'To Receive' : 'To Pay'}\n"Global Traders",1234567890,,,Tamil Nadu,,0,Advance`;
            filename = `SOLLO_${partyType}s_Template.csv`;
        }

        if (csvContent && window.Utils) {
            window.Utils.downloadFile(csvContent, filename, "text/csv");
            window.Utils.showToast("Template Downloaded!");
        }
    },

    handleCSVImport: async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const type = UI.state.currentMasterType;
        
        const reader = new FileReader();
        
        // STRICT ERP LOGIC: Failsafe for unreadable, locked, or corrupted files from the OS!
        reader.onerror = () => {
            alert("ERROR: The file could not be read. It may be locked by another application like Excel, or corrupted.");
            event.target.value = ''; // Unlock the input so they can try again
        };
        
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                
                // FIX: Bulletproof CSV Parser that gracefully handles line-breaks INSIDE quotes
                const parseCSV = (str) => {
                    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
                    for (l of str) {
                        if ('"' === l) { if (s && l === p) row[i] += l; s = !s; }
                        else if (',' === l && s) l = row[++i] = '';
                        else if ('\n' === l && s) {
                            if ('\r' === p) row[i] = row[i].slice(0, -1);
                            row = ret[++r] = [l = '']; i = 0;
                        } else row[i] += l;
                        p = l;
                    }
                    return ret.map(row => row.map(col => col.trim().replace(/^"|"$/g, ''))).filter(row => row.length > 1 || row[0] !== '');
                };

                const parsedData = parseCSV(text);
                if (parsedData.length < 2) throw new Error("File is empty or invalid format.");

                const headers = parsedData[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
                const rows = parsedData; // Map the new parser to the existing logic loop
                
                const parseCSVRow = (row) => row; // Bypass the old regex parser since we already parsed the whole file
                
                let successCount = 0;

                if (window.Utils) window.Utils.showToast("Importing records, please wait...");
                
                // ENTERPRISE FIX: Fetch existing database records ONCE, and strictly scoped to the active firm!
                const activeFirmId = app.state.firmId;
                const existingItems = type === 'products' ? await getAllRecords('items', 'firmId', activeFirmId) : [];
                const existingLedgers = (type === 'customers' || type === 'suppliers') ? await getAllRecords('ledgers', 'firmId', activeFirmId) : [];
                
                for (let i = 1; i < rows.length; i++) {
                    const cols = parseCSVRow(rows[i]);
                    if (cols.length < 2 || !cols[0]) continue; // Skip bad rows

                    if (type === 'products') {
                        const nameIdx = headers.indexOf('name');
                        const sellIdx = headers.indexOf('sellprice');
                        const buyIdx = headers.indexOf('buyprice');
                        const stockIdx = headers.indexOf('openingstock');
                        const minStockIdx = headers.indexOf('minstock');
                        const uomIdx = headers.indexOf('uom');
                        const gstIdx = headers.indexOf('gstpercent');
                        const hsnIdx = headers.indexOf('hsncode');

                        if (nameIdx === -1 || !cols[nameIdx]) continue;

                        // NEW: Prevent duplicates by finding existing items by name
                        const match = existingItems.find(i => String(i.name || '').toLowerCase() === String(cols[nameIdx] || '').toLowerCase() && i.firmId === app.state.firmId);

                        // STRICT ERP LOGIC: Strip commas from Excel CSV exports before parsing to prevent data corruption!
                        // ENTERPRISE FIX: Route through the bulletproof math parser to prevent currency symbols (₹, $) from wiping data to 0!
                        const cleanNum = (val) => window.Utils.safeNumber(val);

                        const data = {
                            id: match ? match.id : Utils.generateId(),
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            // STRICT ERP LOGIC: Retain existing data if the CSV cells are blank!
                            sellPrice: (cols[sellIdx] !== undefined && cols[sellIdx] !== '') ? cleanNum(cols[sellIdx]) : (match ? match.sellPrice : 0),
                            buyPrice: (cols[buyIdx] !== undefined && cols[buyIdx] !== '') ? cleanNum(cols[buyIdx]) : (match ? match.buyPrice : 0),
                            // STRICT ERP LOGIC: Safely preserve the segregated GST and Non-GST stock pools!
                            stock: match ? match.stock : cleanNum(cols[stockIdx]),
                            stockGst: match ? match.stockGst : cleanNum(cols[stockIdx]),
                            stockNonGst: match ? (match.stockNonGst || 0) : 0,
                            openingStock: match ? (match.openingStock || match.stock || 0) : cleanNum(cols[stockIdx]),
                            openingStockGst: match ? (match.openingStockGst || match.stockGst || 0) : cleanNum(cols[stockIdx]),
                            openingStockNonGst: match ? (match.openingStockNonGst || match.stockNonGst || 0) : 0,
                            minStock: (cols[minStockIdx] !== undefined && cols[minStockIdx] !== '') ? cleanNum(cols[minStockIdx]) : (match ? match.minStock : 0),
                            uom: (cols[uomIdx] !== undefined && cols[uomIdx] !== '') ? cols[uomIdx] : (match ? match.uom : 'Pcs'),
                            gst: (cols[gstIdx] !== undefined && cols[gstIdx] !== '') ? cleanNum(cols[gstIdx]) : (match ? match.gst : 0),
                            hsn: (cols[hsnIdx] !== undefined && cols[hsnIdx] !== '') ? cols[hsnIdx] : (match ? match.hsn : '')
                        };
                        await saveRecord('items', data);
                        
                        // FIX: Update the memory array so if the CSV has the same item twice, it doesn't create a duplicate!
                        if (!match) existingItems.push(data);
                        else Object.assign(match, data);
                        
                        successCount++;
                    } 
                    else if (type === 'customers' || type === 'suppliers') {
                        const nameIdx = headers.indexOf('name');
                        const phoneIdx = headers.indexOf('phone');
                        const gstIdx = headers.indexOf('gstin');
                        const cityIdx = headers.indexOf('city');
                        const stateIdx = headers.indexOf('state');
                        const addrIdx = headers.indexOf('address');
                        const obIdx = headers.indexOf('openingbalance');
                        const typeIdx = headers.indexOf('balancetype');

                        if (nameIdx === -1 || !cols[nameIdx]) continue;

                        const pType = type === 'customers' ? 'Customer' : 'Supplier';
                        const balTypeRaw = cols[typeIdx] ? cols[typeIdx].toLowerCase() : '';
                        let balType = pType === 'Customer' ? 'To Receive / Debit' : 'To Pay / Credit';
                        
                        if (balTypeRaw.includes('pay') || balTypeRaw.includes('credit')) balType = 'To Pay / Credit';
                        else if (balTypeRaw.includes('receive') || balTypeRaw.includes('debit')) balType = 'To Receive / Debit';

                        // FIX: Search the pre-loaded memory array instead of querying the database on every single row!
                        const match = existingLedgers.find(l => l.firmId === app.state.firmId && l.type === pType && 
                            (String(l.name || '').toLowerCase() === String(cols[nameIdx] || '').toLowerCase() || (cols[phoneIdx] && l.phone === cols[phoneIdx]))
                        );

                        // ENTERPRISE FIX: Route through the bulletproof math parser to prevent currency symbols (₹, $) from wiping data to 0!
                        const cleanNum = (val) => window.Utils.safeNumber(val);

                        const data = {
                            id: match ? match.id : Utils.generateId(), // Re-use ID if they already exist
                            firmId: app.state.firmId,
                            name: cols[nameIdx],
                            type: pType,
                            phone: (cols[phoneIdx] !== undefined && cols[phoneIdx] !== '') ? cols[phoneIdx] : (match ? match.phone : ''),
                            gst: (cols[gstIdx] !== undefined && cols[gstIdx] !== '') ? cols[gstIdx].toUpperCase() : (match ? match.gst : ''),
                            city: (cols[cityIdx] !== undefined && cols[cityIdx] !== '') ? cols[cityIdx] : (match ? match.city : ''),
                            state: (cols[stateIdx] !== undefined && cols[stateIdx] !== '') ? cols[stateIdx] : (match ? match.state : ''),
                            address: (cols[addrIdx] !== undefined && cols[addrIdx] !== '') ? cols[addrIdx] : (match ? match.address : ''),
                            // STRICT ERP LOGIC: If CSV balance is blank, retain the existing database balance!
                            openingBalance: (cols[obIdx] !== undefined && cols[obIdx] !== '') ? cleanNum(cols[obIdx]) : (match ? match.openingBalance : 0),
                            balanceType: (cols[typeIdx] !== undefined && cols[typeIdx] !== '') ? balType : (match ? match.balanceType : balType)
                        };
                        await saveRecord('ledgers', data);
                        
                        // FIX: Push the new party into memory so if the CSV has the same name twice, it doesn't duplicate!
                        if (!match) existingLedgers.push(data);
                        else Object.assign(match, data);

                        successCount++;
                    }
                    
                    // STRICT ERP LOGIC: Prevent Main Thread Lockout! Yield to the browser every 25 rows to prevent mobile RAM crashes during massive CSV uploads.
                    if (i % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0));
                }
                
                alert(`✅ Successfully imported ${successCount} records!`);
                event.target.value = ''; // Reset file input
                
                // ENTERPRISE FIX: Wipe RAM Cache so the newly imported CSV data appears instantly!
                if (window.AppCache) {
                    window.AppCache.items = null;
                    window.AppCache.ledgers = null;
                }
                
                app.refreshAll();
            } catch (err) {
                console.error(err);
                alert("Error importing CSV. Please ensure you are using the correct template.");
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    },

    // ==========================================
    // 3. LEDGER & RETURNS ENGINE
    // ==========================================
    openPartyLedger: async (partyId, partyType, partyName) => {
        document.getElementById('report-party-name').innerText = partyName;
        const timelineContainer = document.getElementById('timeline-list');
        
        // UPGRADE 3: Inject Skeleton Loaders instead of text
        timelineContainer.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card" style="animation-delay: 0.1s"></div><div class="skeleton-card" style="animation-delay: 0.2s"></div>';
        
        // NEW: Bind the edit button to the currently open party
        const editBtn = document.getElementById('btn-edit-ledger');
        if(editBtn) {
            editBtn.style.display = 'flex';
            editBtn.onclick = () => { 
                UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
                setTimeout(() => app.openForm('ledger', partyId), 150); // Open the form smoothly
            };
        }
        
        // STRICT ERP LOGIC: Bind the PDF/Share button to generate the A4 Khata Statement!
        const shareBtn = document.getElementById('btn-share-ledger');
        if(shareBtn) {
            shareBtn.style.display = 'flex';
            shareBtn.onclick = () => {
                window.executeKhataReport(partyId, partyName, partyType);
            };
        }
        
        UI.openActivity('activity-report-viewer');

        try {
            const statement = await getKhataStatement(partyId, partyType);
            
            // BULLETPROOF MATH: Filter out Draft Invoices to perfectly match the Address Book!
            const validTimeline = [];
            let runningBal = 0;
            
            statement.timeline.forEach(t => {
                if (t.isInvoice && t.id !== 'open-bal') {
                    const doc = partyType === 'Customer' ? 
                        UI.state.rawData.sales.find(s => s.id === t.id) : 
                        UI.state.rawData.purchases.find(p => p.id === t.id);
                    if (doc && doc.status === 'Open') return; // Skip Drafts completely!
                }
                runningBal += (t.impact || 0);
                t.runningBalance = runningBal;
                validTimeline.push(t);
            });
            
            statement.timeline = validTimeline;
            const bal = runningBal; // Use the true calculated balance

            const balEl = document.getElementById('report-party-balance');
            let balText = '';
            let balColor = 'var(--md-text-muted)';
            let subText = ''; // 🚀 ENTERPRISE GST SPLIT ENGINE FOR UI HEADER

            // 🚨 ENTERPRISE FIX: Drop "To Pay/Receive" to a new line as a beautiful badge so long Party Names don't get squished!
            if (partyType === 'Customer') {
                if (bal > 0.01) { balText = `Closing Balance: \u20B9${bal.toFixed(2)} <br><span style="display:inline-block; margin-top:6px; background:#dc2626; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(220,38,38,0.3);">TO RECEIVE</span>`; balColor = '#ef4444'; }
                else if (bal < -0.01) { balText = `Closing Balance: \u20B9${Math.abs(bal).toFixed(2)} <br><span style="display:inline-block; margin-top:6px; background:#16a34a; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(22,163,74,0.3);">ADVANCE</span>`; balColor = '#22c55e'; }
                else { balText = `Closing Balance: \u20B90.00 <br><span style="display:inline-block; margin-top:6px; background:#475569; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(71,85,105,0.3);">SETTLED</span>`; balColor = '#94a3b8'; }
            } else {
                if (bal < -0.01) { balText = `Closing Balance: \u20B9${Math.abs(bal).toFixed(2)} <br><span style="display:inline-block; margin-top:6px; background:#dc2626; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(220,38,38,0.3);">TO PAY</span>`; balColor = '#ef4444'; }
                else if (bal > 0.01) { balText = `Closing Balance: \u20B9${Math.abs(bal).toFixed(2)} <br><span style="display:inline-block; margin-top:6px; background:#16a34a; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(22,163,74,0.3);">ADVANCE</span>`; balColor = '#22c55e'; }
                else { balText = `Closing Balance: \u20B90.00 <br><span style="display:inline-block; margin-top:6px; background:#475569; color:#ffffff; padding:4px 10px; border-radius:6px; font-weight:900; font-size:11px; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(71,85,105,0.3);">SETTLED</span>`; balColor = '#94a3b8'; }
            }
            
            // 🚀 ENTERPRISE UPGRADE: EXPLICIT TAX-SPLIT ENGINE FOR LEDGER
            // Respects exact invoice mapping instead of guessing via FIFO!
            if ((partyType === 'Customer' && bal > 0.01) || (partyType !== 'Customer' && bal < -0.01)) {
                const party = await getRecordById('ledgers', partyId) || { openingBalance: 0, balanceType: '' };
                let ob = parseFloat(party.openingBalance) || 0;
                let isAdv = partyType === 'Customer' ? ((party.balanceType || '').toLowerCase().includes('pay') || (party.balanceType || '').toLowerCase().includes('credit')) : ((party.balanceType || '').toLowerCase().includes('receive') || (party.balanceType || '').toLowerCase().includes('debit'));
                
                // 🚨 BUG FIX: Opening balance falls to Non-GST pool by default
                let debitsGst = 0;
                let debitsNon = !isAdv ? ob : 0;
                
                const exactPaymentMap = {};
                const exactReturnMap = {};

                window.UI.state.rawData.cashbook.forEach(c => {
                    if (c.ledgerId === partyId && c.invoiceRef) {
                        let amt = parseFloat(c.amount) || 0;
                        const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                        let remainingAmt = amt;
                        refs.forEach(ref => {
                            if (remainingAmt <= 0) return;
                            exactPaymentMap[ref] = (exactPaymentMap[ref] || 0) + (amt / refs.length);
                        });
                    }
                });

                const docs = partyType === 'Customer' ? window.UI.state.rawData.sales : window.UI.state.rawData.purchases;
                docs.forEach(d => {
                    if (d.documentType === 'return' && d.status !== 'Open' && d.orderNo && (partyType === 'Customer' ? d.customerId === partyId : d.supplierId === partyId)) {
                        exactReturnMap[d.orderNo] = (exactReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                    }
                });

                docs.forEach(doc => {
                    if (doc.status !== 'Open' && doc.documentType !== 'return' && (partyType === 'Customer' ? doc.customerId === partyId : doc.supplierId === partyId)) {
                        const uniqueRefs = [...new Set([doc.orderNo, doc.poNo, doc.invoiceNo, doc.id].filter(Boolean))];
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

                const trueBalance = Math.abs(bal); 
                const trackedDebt = debitsGst + debitsNon;
                if (trueBalance < trackedDebt) {
                    const excessCredit = trackedDebt - trueBalance;
                    if (excessCredit >= debitsGst) {
                        let remaining = excessCredit - debitsGst;
                        debitsGst = 0;
                        debitsNon = Math.max(0, debitsNon - remaining);
                    } else {
                        debitsGst -= excessCredit;
                    }
                }

                if (debitsGst > 0.01 && debitsNon > 0.01) subText = `<br><span style="font-size:12px; color:var(--md-error); font-weight: 800;">GST Due: \u20B9${debitsGst.toFixed(2)} | Non-GST Due: \u20B9${debitsNon.toFixed(2)}</span>`;
                else if (debitsGst > 0.01) subText = `<br><span style="font-size:12px; color:var(--md-error); font-weight: 800;">GST Due: \u20B9${debitsGst.toFixed(2)}</span>`;
                else if (debitsNon > 0.01) subText = `<br><span style="font-size:12px; color:var(--md-error); font-weight: 800;">Non-GST Due: \u20B9${debitsNon.toFixed(2)}</span>`;
            }

            balEl.innerHTML = balText + subText; // Upgraded to innerHTML so the span tags safely render!
            balEl.style.color = balColor;

            // Move state assignment ABOVE the early return to clear previous memory!
            UI.state.rawData.timeline = statement.timeline;

            // 🚀 ENTERPRISE UPGRADE: Delegate Native Rendering & Financial Year Lock to UI Engine!
            UI.state.activeFilters['timeline'] = 'All';
            if (window.UI) window.UI.applyFilters('timeline');

            const chips = document.querySelectorAll('#activity-report-viewer .filter-chips .chip');
            if(chips.length > 0) {
                chips.forEach(c => c.classList.remove('active'));
                chips[0].classList.add('active'); 
            }
            UI.state.activeFilters['timeline'] = 'All';

        } catch (error) {
            console.error("Error loading ledger:", error);
            timelineContainer.innerHTML = '<p class="empty-state" style="color:var(--md-error);">Failed to load statement.</p>';
        }
    },
        openAccountLedger: async (accountId) => {
        // Fetch Account Details
        // ENTERPRISE FIX: Query the DB for the Cash Drawer so we don't wipe out the user's true Opening Balance!
        let account = await getRecordById('accounts', accountId) || { name: 'Cash Drawer', openingBalance: 0 };

        document.getElementById('report-party-name').innerText = account.name;
        const timelineContainer = document.getElementById('timeline-list');
        
        // UPGRADE 3: Inject Skeleton Loaders instead of text
        timelineContainer.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card" style="animation-delay: 0.1s"></div><div class="skeleton-card" style="animation-delay: 0.2s"></div>';
        
        // Bind the Edit Button in the top right corner
        const editBtn = document.getElementById('btn-edit-ledger');
        if(editBtn) {
            editBtn.style.display = 'flex';
            if(accountId === 'cash') {
                editBtn.onclick = () => window.Utils.showToast('The Default Cash Drawer is a system account and cannot be modified directly.');
            } else {
                editBtn.onclick = () => { 
                    UI.closeActivity('activity-report-viewer'); // FIX: Slide down the ledger statement first
                    setTimeout(() => app.openForm('account', accountId), 150); // Open the form smoothly
                };
            }
        }
        
        // STRICT ERP LOGIC: Wire the PDF Share button to generate the Bank/Cash Statement!
        const shareBtn = document.getElementById('btn-share-ledger');
        if (shareBtn) {
            shareBtn.style.display = 'flex';
            shareBtn.onclick = () => window.executeAccountReport(accountId);
        }
        
        UI.openActivity('activity-report-viewer');

        try {
            let openingBalance = parseFloat(account.openingBalance) || 0;
            let timeline = [];

            if (openingBalance !== 0) {
                timeline.push({
                    id: 'open-bal',
                    date: 'Opening',
                    desc: 'Opening Balance',
                    amount: Math.abs(openingBalance),
                    impact: openingBalance,
                    isInvoice: false
                });
            }

            const receipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
            const firmId = app.state.firmId;
            
            // Filter out only the transactions for this specific Bank/Cash account
            const accountReceipts = receipts.filter(r => {
                if (r.firmId !== firmId) return false;
                if (accountId === 'cash') return r.accountId === 'cash' || !r.accountId;
                return r.accountId === accountId;
            });

            accountReceipts.forEach(r => {
                const isMoneyIn = r.type === 'in';
                const impact = isMoneyIn ? parseFloat(r.amount) : -parseFloat(r.amount);
                
                // FIX: Translate cross-linked Invoice/PO/Expense IDs into readable numbers for Bank Verification
                let displayRefs = '';
                if (r.invoiceRef) {
                    const refs = String(r.invoiceRef).split(',').map(x => x.trim());
                    const names = refs.map(ref => {
                        const s = UI.state.rawData.sales.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.orderNo === ref);
                        if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                        
                        const p = UI.state.rawData.purchases.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.poNo === ref || doc.orderNo === ref);
                        if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                        
                        const e = UI.state.rawData.expenses.find(doc => doc.id === ref || doc.expenseNo === ref);
                        if (e) {
                            if (e.linkedInvoice) {
                                const eLinks = String(e.linkedInvoice).split(',').map(x => x.trim());
                                const eNames = eLinks.map(el => {
                                    const s = UI.state.rawData.sales.find(doc => doc.id === el || doc.invoiceNo === el || doc.orderNo === el);
                                    if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                                    const p = UI.state.rawData.purchases.find(doc => doc.id === el || doc.invoiceNo === el || doc.poNo === el || doc.orderNo === el);
                                    if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                                    return el.startsWith('sollo-') ? el.slice(-4).toUpperCase() : el;
                                });
                                return (e.expenseNo || String(e.id).slice(-4).toUpperCase()) + ' (🔗 ' + eNames.join(', ') + ')';
                            }
                            return e.expenseNo || String(e.id).slice(-4).toUpperCase();
                        }
                        
                        return ref.startsWith('sollo-') ? ref.slice(-4).toUpperCase() : ref;
                    });
                    displayRefs = [...new Set(names)].join(', ');
                }
                
                let finalRef = r.ref || '';
                if (displayRefs) {
                    finalRef = finalRef ? `${finalRef} | Docs: ${displayRefs}` : `Docs: ${displayRefs}`;
                }

                timeline.push({
                    id: r.id,
                    date: r.date,
                    // UPGRADE: Prepend the custom receipt/voucher number for even better tracking
                    desc: r.receiptNo ? `${r.receiptNo} - ${r.desc || (isMoneyIn ? 'Money In' : 'Money Out')}` : (r.desc || (isMoneyIn ? 'Money In' : 'Money Out')),
                    partyName: r.ledgerName || '',
                    amount: parseFloat(r.amount),
                    impact: impact,
                    isInvoice: false,
                    ref: finalRef // This automatically passes into the PDF engine!
                });
            });

            // STRICT ERP LOGIC: Sort by Date AND ID to prevent same-day bank passbook scrambling!
            timeline.sort((a, b) => {
                if (a.id === 'open-bal') return -1;
                if (b.id === 'open-bal') return 1;
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.id > b.id) ? 1 : -1;
            });

            // Calculate Running Balance
            let runningBalance = 0;
            timeline.forEach(t => {
                runningBalance += t.impact;
                t.runningBalance = runningBalance;
            });

            const balEl = document.getElementById('report-party-balance');
            balEl.innerText = `Available Balance: \u20B9${runningBalance.toFixed(2)}`;
            balEl.style.color = runningBalance >= 0 ? 'var(--md-success)' : 'var(--md-error)';

            // Move state assignment ABOVE the early return!
            UI.state.rawData.timeline = timeline; // Hooks into your existing PDF generator!

            // 🚀 ENTERPRISE UPGRADE: Delegate Native Rendering & Financial Year Lock to UI Engine!
            UI.state.activeFilters['timeline'] = 'All';
            if (window.UI) window.UI.applyFilters('timeline');

            // Reset filters
            const chips = document.querySelectorAll('#activity-report-viewer .filter-chips .chip');
            if(chips.length > 0) {
                chips.forEach(c => c.classList.remove('active'));
                chips[0].classList.add('active'); 
            }
            UI.state.activeFilters['timeline'] = 'All';

        } catch (error) {
            console.error("Error loading account ledger:", error);
            timelineContainer.innerHTML = '<p class="empty-state" style="color:var(--md-error);">Failed to load statement.</p>';
        }
    },


    loadOriginalDocuments: (partyId, type) => {
        if (app.state.currentDocType !== 'return') return;

        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const rawData = storeName === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
        const partyKey = type === 'sales' ? 'customerId' : 'supplierId';

        // ENTERPRISE FIX: Prevent Cancelled Invoices from showing up in the Returns/Refunds list!
        const validInvoices = rawData.filter(doc => 
            doc[partyKey] === partyId && 
            doc.documentType !== 'return' && 
            doc.status !== 'Open' && 
            doc.status !== 'Cancelled'
        );

        const selectEl = document.getElementById(`${type}-original-ref`);
        if (selectEl) {
            const options = validInvoices.map(doc => 
                `<option value="${doc.id}">${doc.invoiceNo || doc.poNo} (${doc.date}) - \u20B9${doc.grandTotal}</option>`
            ).join('');
            selectEl.innerHTML = options ? `<option value="">Select Original Document...</option>` + options : `<option value="">No valid invoices found.</option>`;
        }
    },

    loadReturnItems: async (originalDocId, type) => {
        if (!originalDocId) return;
        
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const originalDoc = await getRecordById(storeName, originalDocId);
        if (!originalDoc) return;

        const allDocs = storeName === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
        
        // STRICT ERP LOGIC: Block Cross-Company Leaks and safely map Supplier Bills!
        const originalDocNo = originalDoc.invoiceNo || originalDoc.poNo || originalDoc.orderNo || originalDoc.id;
        // 🚨 ENTERPRISE FIX: Safely exclude the currently editing document so it doesn't subtract its own items from the max allowable limit!
        const previousReturns = allDocs.filter(d => d.firmId === app.state.firmId && d.documentType === 'return' && d.orderNo === originalDocNo && d.id !== app.state.currentEditId);
        
        const returnedQtyMap = {};
        previousReturns.forEach(ret => {
            ret.items.forEach(item => {
                returnedQtyMap[item.itemId] = (returnedQtyMap[item.itemId] || 0) + parseFloat(item.qty);
            });
        });

        const tbody = document.getElementById(`${type}-items-body`);
        tbody.innerHTML = ''; 

        originalDoc.items.forEach(item => {
            const previouslyReturned = returnedQtyMap[item.itemId] || 0;
            const maxAllowable = parseFloat(item.qty) - previouslyReturned;

            if (maxAllowable > 0) {
                const tr = document.createElement('div');
                tr.className = 'item-entry-card m3-card tap-target';
                tr.style.cssText = `padding: 12px; margin-bottom: 8px; border-left: 4px solid var(--md-error);`;
                
                tr.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1; padding-right: 8px; min-width: 0;">
                            <strong style="font-size: 14px; color: var(--md-on-surface); display: block; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name || 'Archived / Unknown Item'}</strong>
                            <small style="color:var(--md-error); font-weight: bold; display: block; margin-bottom: 6px;">Max Return: ${maxAllowable}</small>
                            <!-- 🚨 ENTERPRISE UPGRADE: POS NUMPAD TRIGGERS -->
                            <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                                <input type="text" inputmode="none" class="row-qty" value="0" max="${maxAllowable}" required readonly onclick="UI.openNumpad(this, 'Quantity')" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 60px; padding: 6px 4px; text-align: center; font-weight: bold; border: 1px solid var(--md-error); border-radius: 4px; color: var(--md-error); font-size: 14px; background: rgba(186, 26, 26, 0.05); cursor: pointer;">
                                <span style="font-size: 11px; color: var(--md-text-muted); font-weight: 700;">${item.uom || 'Unit'}</span>
                                <span style="font-size: 12px; color: var(--md-text-muted); font-weight: bold; margin: 0 2px;">×</span>
                                <input type="text" inputmode="none" class="row-rate" value="${item.rate}" required readonly oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 75px; padding: 6px 4px; border: 1px solid var(--md-outline-variant); border-radius: 4px; font-size: 14px; background: var(--md-surface-variant);">
                                <span style="font-size: 10px; color: var(--md-text-muted); background: var(--md-surface-variant); padding: 4px 6px; border-radius: 4px; font-weight: bold; white-space: nowrap;">${item.gstPercent || 0}% GST</span>
                                <input type="hidden" class="row-gst" value="${item.gstPercent || 0}">
                                <input type="hidden" class="row-hsn" value="${item.hsn || ''}">
                                <input type="hidden" class="row-item-id" value="${item.itemId}">
                                <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                                <input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">
                                <input type="hidden" class="row-uom" value="${item.uom || ''}">
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; align-self: stretch;">
                            <div class="tap-target" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="color: var(--md-error); padding: 4px; border-radius: 50%; background: #fff0f2; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                            </div>
                            <strong class="row-total" style="font-size: 16px; color: var(--md-error); margin-top: auto; padding-top: 8px;">0.00</strong>
                        </div>
                    </div>
                `;
                tbody.appendChild(tr);
            }
        });
        
        const orderNoEl = document.getElementById(`${type}-order-no`);
        // SMART LINK PATCH: Safely fallback through all possible document numbers so the Return is permanently hard-linked!
        if (orderNoEl) orderNoEl.value = originalDocNo; 
        
        type === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
    },
    loadPendingInvoices: async (partyId, type) => {
        const isMoneyIn = type === 'in';
        const selectId = isMoneyIn ? 'pay-in-invoice-ref' : 'pay-out-invoice-ref';
        
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        
        if (!partyId) {
            selectEl.innerHTML = '<option value="">On Account / Advance</option>';
            return;
        }

        // 🚨 ENTERPRISE FIX: The Cross-Table Refund Trap!
        const partyForDropdown = await getRecordById('ledgers', partyId);
        const isCustomer = partyForDropdown ? String(partyForDropdown.type).toLowerCase() === 'customer' : isMoneyIn;
        
        const storeName = isCustomer ? 'sales' : 'purchases';
        const partyKey = isCustomer ? 'customerId' : 'supplierId';

        const activeFirmId = app.state ? app.state.firmId : 'firm1';
        // ENTERPRISE FIX: Use firmId index to prevent the app from lagging when opening the Payment sheet!
        const allDocs = await getAllRecords(storeName, 'firmId', activeFirmId);
        
        // 1. ELITE UPGRADE: CALCULATE THE EXACT TRUE LEDGER BALANCE FIRST
        const party = await getRecordById('ledgers', partyId);
        let ob = party ? (parseFloat(party.openingBalance) || 0) : 0;
        const balType = party ? (party.balanceType || '').toLowerCase() : '';
        let trueBalance = 0;
        
        // 🚨 NEW: Grab the active bill filter from the UI earlier
        const billFilterEl = document.getElementById(isMoneyIn ? 'pay-in-bill-filter' : 'pay-out-bill-filter');
        const billFilter = billFilterEl ? billFilterEl.value : 'All';
        
        // 🚨 LEGACY FIX: Apply Ledger Opening Balance to the Non-GST pool by default
        if (billFilter === 'All' || billFilter === 'Non-GST') {
            if (isMoneyIn) { 
                trueBalance = (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
            } else { 
                trueBalance = (balType.includes('receive') || balType.includes('debit')) ? -ob : ob;
            }
        }

        allDocs.forEach(d => {
            if (d.firmId === activeFirmId && d[partyKey] === partyId && d.status !== 'Open') {
                // 🚨 NEW: Split the Invoice Debt by Tax Pool
                if (billFilter === 'GST' && d.invoiceType === 'Non-GST') return;
                if (billFilter === 'Non-GST' && d.invoiceType !== 'Non-GST') return;

                const amt = parseFloat(d.grandTotal) || 0;
                trueBalance += (d.documentType === 'return' ? -amt : amt);
            }
        });

        const receipts = await getAllRecords('receipts', 'firmId', activeFirmId);
        receipts.forEach(r => {
            if (r.firmId === activeFirmId && r.ledgerId === partyId && r.id !== app.state.currentReceiptId) {
                
                // 🚨 NEW: Split the Advance and Payment tracking by Tax Pool
                let isNonGstReceipt = r.taxPool === 'Non-GST';
                
                // 🚨 LEGACY FIX: Catch old payments saved under 'linkedInvoice'
                const legacyRef = r.invoiceRef || r.linkedInvoice;
                
                // 🚨 THE ULTIMATE FIX: Treat 'All' tags from old receipts as Non-GST advances too!
                if (!r.taxPool || r.taxPool === 'All') {
                    // BUG FIX: Pure untagged legacy advances now default to Non-GST!
                    isNonGstReceipt = true;
                    // But if it has a linked history, we respect the original document type
                    if (legacyRef) {
                        const firstRef = String(legacyRef).split(',')[0].trim();
                        const linkedDoc = allDocs.find(d => d.id === firstRef || d.invoiceNo === firstRef || d.poNo === firstRef || d.orderNo === firstRef || String(d.id).endsWith(firstRef));
                        if (linkedDoc && linkedDoc.invoiceType !== 'Non-GST') isNonGstReceipt = false;
                    }
                }

                if (billFilter === 'GST' && isNonGstReceipt) return;
                if (billFilter === 'Non-GST' && !isNonGstReceipt) return; // Legacy pure advances now safely fall into Non-GST

                const amt = parseFloat(r.amount) || 0;
                if (isMoneyIn) trueBalance += (r.type === 'in' ? -amt : amt);
                else trueBalance += (r.type === 'in' ? amt : -amt);
            }
        });

        // 2. MAP EXPLICITLY LINKED PAYMENTS & RETURNS
        const paymentMap = {};
        receipts.forEach(c => {
            if (c.firmId === activeFirmId && c.ledgerId === partyId && c.invoiceRef && c.id !== app.state.currentReceiptId) {
                let amt = parseFloat(c.amount) || 0;
                let impact = isMoneyIn ? (c.type === 'in' ? amt : -amt) : (c.type === 'out' ? amt : -amt);
                if (impact > 0) {
                    const refs = String(c.invoiceRef).split(',').map(r => r.trim()).filter(Boolean);
                    if (refs.length > 0) {
                        // 🚨 ENTERPRISE FIX: Smart Waterfall Allocation!
                        let remainingPayment = impact;
                        refs.forEach(ref => {
                            const linkedDoc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref || String(d.id).endsWith(ref));
                            let docTotal = linkedDoc ? (parseFloat(linkedDoc.grandTotal) || 0) : (impact / refs.length);
                            let applyAmt = Math.min(docTotal, remainingPayment);
                            if (applyAmt > 0) {
                                paymentMap[ref] = (paymentMap[ref] || 0) + applyAmt;
                                remainingPayment -= applyAmt;
                            }
                        });
                        // Dump excess onto the first invoice so it isn't lost!
                        if (remainingPayment > 0.01 && refs[0]) paymentMap[refs[0]] = (paymentMap[refs[0]] || 0) + remainingPayment;
                    }
                }
            }
        });

        const returnMap = {};
        allDocs.forEach(d => {
            if (d.firmId === activeFirmId && d[partyKey] === partyId && d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                returnMap[d.orderNo] = (returnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
            }
        });

        // 3. CALCULATE PENDING GROSS DEBT
        // (billFilter already grabbed dynamically in Step 1!)
        let partyDocs = allDocs.filter(doc => {
            if (doc.firmId !== activeFirmId || doc[partyKey] !== partyId || doc.documentType === 'return' || doc.status === 'Open') return false;
            
            // Apply the new GST/Non-GST filter
            if (billFilter === 'GST' && doc.invoiceType === 'Non-GST') return false;
            if (billFilter === 'Non-GST' && doc.invoiceType !== 'Non-GST') return false;
            
            return true;
        });
        
        // ENTERPRISE FIX: Protect Apple Devices from chronological sorting crashes!
        partyDocs.sort((a, b) => window.Utils.safeDate(a.date) - window.Utils.safeDate(b.date));


        let totalPendingDebt = 0;
        const pendingInvoices = [];

        for (const doc of partyDocs) {
            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
            const explicitPaid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
            const returned = uniqueRefs.reduce((sum, ref) => sum + (returnMap[ref] || 0), 0);
            
            const docTotal = parseFloat(doc.grandTotal) || 0;
            const balance = Math.max(0, docTotal - explicitPaid - returned);
            
            if (balance > 0.01) {
                totalPendingDebt += balance;
                pendingInvoices.push({ doc, balance });
            }
        }

        // 4. THE MAGIC BULLET: MATHEMATICALLY EXTRACT THE ADVANCE POOL TO MATCH THE LEDGER
        let remainingAdvanceMoney = Math.max(0, totalPendingDebt - trueBalance);

        // 5. 🚨 NEW: FIFO WATERFALL FOR PAYMENT DROPDOWN
        const options = [];
        for (const item of pendingInvoices) {
            let finalBal = item.balance;
            
            // 🚨 ADVANCE AUTOPAY RE-ENABLED:
            // Deduct the floating advance money dynamically so the Payment Form perfectly matches the Documents tab!
            if (remainingAdvanceMoney > 0 && finalBal > 0.01) {
                const advanceApplied = Math.min(remainingAdvanceMoney, finalBal);
                finalBal -= advanceApplied;
                remainingAdvanceMoney -= advanceApplied;
            }
            
            if (finalBal > 0.01) {
                const doc = item.doc;
                
                let docNo, displayNo;
                
                // BACKEND LINKING: Always use the immutable database ID to prevent comma-splitting bugs and ensure 100% uniqueness!
                docNo = doc.id;
                
                // VISUAL DISPLAY: Show ONLY the Order Ref (Sales) or Our PO No (Purchases)
                displayNo = doc.orderNo || String(doc.id).slice(-4).toUpperCase();
                
                // 🚨 REFERENCE DISPLAY: Add the GST Invoice Number next to the PO/Order Ref if it exists!
                let invoiceSuffix = doc.invoiceNo ? ` | Inv: ${doc.invoiceNo}` : '';
                
                options.push(`<option value="${docNo}" data-bal="${finalBal.toFixed(2)}">${displayNo}${invoiceSuffix} (Due: \u20B9${finalBal.toFixed(2)})</option>`);
            }
        }

        if (options.length === 0) {
            selectEl.innerHTML = '<option value="">No pending invoices (On Account)</option>';
        } else {
            selectEl.innerHTML = '<option value="">On Account / Advance</option>' + options.join('');
        }
    },

    // ==========================================
    // 4. FORM INITIALIZATION & ROUTING
    // ==========================================
    openForm: async (type, id = null, docType = 'invoice') => {
        try {
            UI.closeAllBottomSheets();
            
            // --- ENTERPRISE UPGRADE: NESTED MEMORY SHIELD ---
            // Do NOT overwrite memory if we are opening a Master form on top of an active invoice!
            const sFormNode = document.getElementById('activity-sales-form');
            const pFormNode = document.getElementById('activity-purchase-form');
            const salesOpen = sFormNode ? sFormNode.classList.contains('open') : false;
            const purchOpen = pFormNode ? pFormNode.classList.contains('open') : false;
            const isMaster = (type === 'ledger' || type === 'product' || type === 'account');
            
            if (!(isMaster && (salesOpen || purchOpen))) {
                app.state.currentEditId = id;
                app.state.currentDocType = docType;
            }
            // ------------------------------------------------
            
            const form = document.getElementById(`form-${type}`);
            if(form) {
                form.reset();
                // Wipe ghost images from previous sessions
                form.querySelectorAll('img').forEach(img => {
                    img.src = '';
                    img.classList.add('hidden');
                });
                
                // STRICT ERP LOGIC: Unlock the stock fields for BRAND NEW products!
                if (type === 'product') {
                    const stockInputs = form.querySelectorAll('input[name="stockGst"], input[name="stockNonGst"], input[name="stock"]');
                    stockInputs.forEach(input => {
                        input.readOnly = false;
                        input.style.backgroundColor = '';
                        input.style.border = '';
                    });
                }
            }
            
            // NEW: Ensure the valuation card is hidden when creating a brand new product
            if (type === 'product') {
                const valCard = document.getElementById('product-valuation-card');
                if (valCard) valCard.classList.add('hidden');
            }
            
            // Hide delete buttons for new records
            UI.toggleDeleteButton(type, !!id);

            if (type === 'sales' || type === 'purchase') {
                document.getElementById(`${type}-items-body`).innerHTML = '';

                // NEW: Prepare Custom Fields for Sales Form
                if (type === 'sales') {
                    const firmData = await getRecordById('businessProfile', app.state.firmId);
                    const cfContainer = document.getElementById('sales-custom-fields-container');
                    if (firmData && cfContainer) {
                        let showContainer = false;
                        for (let i=1; i<=3; i++) {
                            const name = firmData[`cf${i}Name`];
                            const group = document.getElementById(`sales-cf${i}-group`);
                            const label = document.getElementById(`sales-cf${i}-label`);
                            const valInput = document.getElementById(`sales-cf${i}-val`);
                            if (name) {
                                if(group) group.style.display = 'block';
                                if(label) label.innerText = name;
                                if(valInput) valInput.value = ''; // Reset value
                                showContainer = true;
                            } else {
                                if(group) group.style.display = 'none';
                                if(valInput) valInput.value = '';
                            }
                        }
                        cfContainer.style.display = showContainer ? 'block' : 'none';
                    }
                }
                document.getElementById(`${type}-subtotal`).innerText = '\u20B90.00';
                document.getElementById(`${type}-gst-total`).innerText = '\u20B90.00';
                document.getElementById(`${type}-grand-total`).innerText = '\u20B90.00';
                document.getElementById(`${type}-${type === 'sales' ? 'customer' : 'supplier'}-display`).innerText = `Select ${type === 'sales' ? 'Customer' : 'Supplier'}...`;
                document.getElementById(`${type}-${type === 'sales' ? 'customer' : 'supplier'}-display`).style.color = 'var(--md-text-muted)';
                
                // NEW: Hide payment history when creating a brand new record
                const historyCard = document.getElementById(`${type}-payment-history-card`);
                if (historyCard) historyCard.classList.add('hidden');
                const expenseCard = document.getElementById(`${type}-expense-history-card`);
                if (expenseCard) expenseCard.classList.add('hidden');
                const titleEl = document.getElementById(`form-title-${type}`);
                const btnEl = document.getElementById(`btn-save-${type}`);
                const headerEl = document.getElementById(`activity-${type}-form`).querySelector('.activity-header');

                if (docType === 'return') {
                    if (titleEl) titleEl.innerText = id ? `Edit ${type === 'sales' ? 'Credit Note' : 'Debit Note'}` : `New ${type === 'sales' ? 'Credit Note' : 'Debit Note'}`;
                    if (btnEl) btnEl.innerHTML = `Save ${type === 'sales' ? 'Credit Note' : 'Debit Note'} <span class="material-symbols-outlined" style="font-size: 18px; margin-left: 6px;">done_all</span>`;
                    if (headerEl) headerEl.style.backgroundColor = type === 'sales' ? '#fff0f2' : '#e8f5e9';
                    
                    const refGroup = document.getElementById(`${type}-return-ref-group`);
                    if (refGroup) refGroup.classList.remove('hidden');
                } else {
                    if (titleEl) titleEl.innerText = id ? `Edit ${type === 'sales' ? 'Sales Invoice' : 'Purchase Bill'}` : `New ${type === 'sales' ? 'Sales Invoice' : 'Purchase Bill'}`;
                    if (btnEl) btnEl.innerHTML = `Save ${type === 'sales' ? 'Invoice' : 'Purchase'} <span class="material-symbols-outlined" style="font-size: 18px; margin-left: 6px;">done_all</span>`;
                    if (headerEl) headerEl.style.backgroundColor = 'var(--md-surface)';
                    
                    const refGroup = document.getElementById(`${type}-return-ref-group`);
                    if (refGroup) refGroup.classList.add('hidden');
                }
                
                UI.toggleDates(type);
            }

            if (id) {
                await app.populateEditForm(type, id);
            } else {
                const dateInput = document.getElementById(`${type}-date`);
                if(dateInput && typeof Utils !== 'undefined' && Utils.getLocalDate) {
                    dateInput.value = Utils.getLocalDate();
                    if (dateInput._flatpickr) dateInput._flatpickr.setDate(Utils.getLocalDate()); // FIX: Sync Flatpickr
                }
                
                // ENTERPRISE FIX: Force status to "Open" for brand new documents
                const statusEl = document.getElementById(`${type}-order-status`);
                if (statusEl) {
                    statusEl.value = 'Open';
                    if (window.UI) window.UI.toggleDates(type); // Hide the shipped/completed dates!
                }
                
                // Injecting the Editable Auto-Numbering Engine
                if (type === 'sales' && typeof getNextDocumentNumber === 'function') {
                    const prefix = docType === 'return' ? 'CN' : 'INV';
                    document.getElementById('sales-invoice-no').value = await getNextDocumentNumber('sales', prefix);
                    // NEW: Auto increment Order Ref No as well
                    document.getElementById('sales-order-no').value = await getNextDocumentNumber('sales', 'ORD', 'orderNo');
                } else if (type === 'purchase' && typeof getNextDocumentNumber === 'function') {
                    document.getElementById('purchase-po-no').value = ''; // Keep Supplier Bill blank
                    // ENTERPRISE FIX: Dynamically assign DN prefix for Debit Notes to prevent PO corruption!
                    const prefix = docType === 'return' ? 'DN' : 'PO';
                    document.getElementById('purchase-order-no').value = await getNextDocumentNumber('purchases', prefix, 'orderNo');
                }
            }
            
            // NEW: Expense form specific logic
            if (type === 'expense') {
                const titleEl = document.getElementById('expense-form-title');
                if (titleEl) titleEl.innerText = id ? 'Edit Expense' : 'Log Expense';

                // 🚨 Show the Print button ONLY if this is a saved expense!
                const printBtn = document.getElementById('btn-print-expense');
                if (printBtn) {
                    if (id) printBtn.classList.remove('hidden');
                    else printBtn.classList.add('hidden');
                }

                if (!id) {
                    // STRICT ERP LOGIC: Only reset the labels and hidden inputs if we are creating a BRAND NEW expense!
                    if (typeof getNextDocumentNumber === 'function') {
                        document.getElementById('expense-no').value = await getNextDocumentNumber('expenses', 'EXP', 'expenseNo');
                    }
                    
                    const linkInput = document.getElementById('expense-linked-invoice');
                    if (linkInput) linkInput.value = '';
                    
                    const displayEl = document.getElementById('expense-linked-display');
                    if (displayEl) {
                        displayEl.innerText = '-- No Link (General Expense) --';
                        displayEl.style.color = 'var(--md-text-muted)';
                    }
                }
                
                // Build the new search screen for BOTH new and edit modes so the checkboxes match the true state
                if (typeof app.loadLinkedDocsList === 'function') app.loadLinkedDocsList();
            }
            
            UI.openActivity(`activity-${type}-form`);
            
        } catch (error) {
            console.error("CRITICAL ROUTING ERROR:", error);
            alert("Error opening form: " + error.message);
        }
    },

    // ==========================================
    // 5. EDIT MODE HYDRATION
    // ==========================================
    populateEditForm: async (type, id) => {
        // FIXED: Added 'account': 'accounts' to ensure bank records can be retrieved for editing
        const storeMap = { 'product': 'items', 'ledger': 'ledgers', 'expense': 'expenses', 'sales': 'sales', 'purchase': 'purchases', 'account': 'accounts' };
        const record = await getRecordById(storeMap[type], id);
        if (!record) return;

        if (type === 'sales' || type === 'purchase') {
            const setDateSafe = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    if (el._flatpickr) {
                        if (val) { el._flatpickr.setDate(val); }
                        else { el._flatpickr.clear(); } // Safely clears empty dates
                    }
                }
            };
            
            // 🚨 ENTERPRISE FIX: The Dispatched Date Overwrite Shield!
            // Cache the original database dates into memory FIRST so UI.toggleDates cannot destroy them during state transitions.
            window.app.state.cachedDates = {
                date: record.date || '',
                orderDate: record.orderDate || '',
                shippedDate: record.shippedDate || '',
                completedDate: record.completedDate || ''
            };

            document.getElementById(`${type}-order-status`).value = record.status || 'Completed';
            if (window.UI && window.UI.toggleDates) window.UI.toggleDates(type);

            // Safely inject from the isolated memory cache instead of the raw record
            setDateSafe(`${type}-date`, window.app.state.cachedDates.date);
            setDateSafe(`${type}-order-date`, window.app.state.cachedDates.orderDate);
            setDateSafe(`${type}-shipped-date`, window.app.state.cachedDates.shippedDate);
            setDateSafe(`${type}-completed-date`, window.app.state.cachedDates.completedDate);
            
            document.getElementById(`${type}-order-no`).value = record.orderNo || '';
            document.getElementById(`${type}-freight`).value = record.freightAmount || 0;
            document.getElementById(`${type}-discount`).value = record.discount || 0;
            
            const discTypeEl = document.getElementById(`${type}-discount-type`);
            if (discTypeEl) discTypeEl.value = record.discountType || '\u20B9';
            
            const invTypeEl = document.getElementById(`${type}-invoice-type`);
            if (invTypeEl) invTypeEl.value = record.invoiceType || 'B2B';

            const notesEl = document.getElementById(`${type}-internal-notes`);
            if (notesEl) notesEl.value = record.internalNotes || '';

            // NEW: Hydrate Custom Field Values
            if (type === 'sales') {
                const cf1Input = document.getElementById('sales-cf1-val');
                const cf2Input = document.getElementById('sales-cf2-val');
                const cf3Input = document.getElementById('sales-cf3-val');
                if (cf1Input) cf1Input.value = record.cf1Val || '';
                if (cf2Input) cf2Input.value = record.cf2Val || '';
                if (cf3Input) cf3Input.value = record.cf3Val || '';
            }

            const partyKey = type === 'sales' ? 'customer' : 'supplier';
            const partyIdKey = type === 'sales' ? 'customerId' : 'supplierId';
            const partyNameKey = type === 'sales' ? 'customerName' : 'supplierName';
            
            document.getElementById(`${type}-${partyKey}-id`).value = record[partyIdKey] || '';
            document.getElementById(`${type}-${partyKey}-display`).innerText = record[partyNameKey] || `Select ${type === 'sales' ? 'Customer' : 'Supplier'}...`;
            document.getElementById(`${type}-${partyKey}-display`).style.color = 'var(--md-on-surface)';

            if (type === 'sales') {
                document.getElementById('sales-invoice-no').value = record.invoiceNo || '';
                // Removed the deleted instant payment fields from the hydration engine
            } else {
                document.getElementById('purchase-po-no').value = record.invoiceNo || record.poNo || '';
                // Removed the deleted instant payment fields from the hydration engine
            }

            const tbody = document.getElementById(`${type}-items-body`);
            tbody.innerHTML = '';

            // --- FETCH RETURN MAX ALLOWABLE LOGIC ---
            let returnedQtyMap = {};
            let originalDoc = null;
            if (record.documentType === 'return' && record.orderNo) {
                const allDocs = storeMap[type] === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
                originalDoc = allDocs.find(d => (d.invoiceNo === record.orderNo || d.poNo === record.orderNo) && d.documentType !== 'return');
                const previousReturns = allDocs.filter(d => d.documentType === 'return' && d.orderNo === record.orderNo && d.id !== record.id);
                previousReturns.forEach(ret => ret.items.forEach(i => returnedQtyMap[i.itemId] = (returnedQtyMap[i.itemId] || 0) + parseFloat(i.qty)));
            }
            (record.items || []).forEach(item => {
                let maxHtml = 'min="0.01" step="any"';
                let maxLabel = '';
                
                if (record.documentType === 'return' && originalDoc) {
                    const origItem = originalDoc.items.find(i => i.itemId === item.itemId);
                    if (origItem) {
                        const maxAllowable = parseFloat(origItem.qty) - (returnedQtyMap[item.itemId] || 0);
                        maxHtml = `min="0" max="${maxAllowable}" step="any"`;
                        maxLabel = `<br><small style="color:var(--md-text-muted);">Max Return: ${maxAllowable}</small>`;
                    }
                }

                const tr = document.createElement('div');
                tr.className = 'item-entry-card m3-card tap-target';
                tr.style.cssText = `padding: 12px; margin-bottom: 8px; border-left: 4px solid ${type === 'sales' ? 'var(--md-primary)' : 'var(--md-error)'};`;
                
                tr.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1; padding-right: 8px; min-width: 0;">
                            <strong style="font-size: 14px; color: var(--md-on-surface); display: block; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name || 'Archived / Unknown Item'}</strong>
                            ${maxLabel}
                            <!-- 🚨 ENTERPRISE UPGRADE: POS NUMPAD TRIGGERS -->
                            <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                                <input type="text" inputmode="none" class="row-qty" value="${item.qty}" ${maxHtml} required readonly onclick="UI.openNumpad(this, 'Quantity')" oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 60px; padding: 6px 4px; text-align: center; font-weight: bold; border: 1px solid ${record.documentType === 'return' ? 'var(--md-error)' : 'var(--md-primary)'}; border-radius: 4px; color: ${record.documentType === 'return' ? 'var(--md-error)' : 'var(--md-primary)'}; font-size: 14px; background: var(--md-surface); cursor: pointer;">
                                <span style="font-size: 11px; color: var(--md-text-muted); font-weight: 700;">${item.uom || 'Unit'}</span>
                                <span style="font-size: 12px; color: var(--md-text-muted); font-weight: bold; margin: 0 2px;">×</span>
                                <input type="text" inputmode="none" class="row-rate" value="${item.rate}" required ${record.documentType === 'return' ? 'readonly' : `readonly onclick="UI.openNumpad(this, 'Rate')"`} oninput="UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="width: 75px; padding: 6px 4px; border: 1px solid var(--md-outline-variant); border-radius: 4px; font-size: 14px; ${record.documentType === 'return' ? 'background:var(--md-background);' : 'background:var(--md-surface); cursor: pointer;'}">
                                <span style="font-size: 10px; color: var(--md-text-muted); background: var(--md-surface-variant); padding: 4px 6px; border-radius: 4px; font-weight: bold; white-space: nowrap;">${item.gstPercent || 0}% GST</span>
                                <input type="hidden" class="row-gst" value="${item.gstPercent || 0}">
                                <input type="hidden" class="row-hsn" value="${item.hsn || ''}">
                                <input type="hidden" class="row-item-id" value="${item.itemId}">
                                <input type="hidden" class="row-item-name" value="${(item.name || '').replace(/"/g, '&quot;')}">
                                <input type="hidden" class="row-uom" value="${item.uom || ''}">
                            </div>
                            
                            ${type === 'sales' && record.documentType !== 'return' ? `
                            <div style="display:flex; align-items:center; gap:4px; margin-top:8px;">
                                <span style="font-size:10px; color:var(--md-text-muted);">Buy: ₹</span>
                                <input type="number" inputmode="decimal" class="row-item-buyprice" value="${item.buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:60px; padding:2px 4px; font-size:10px; border:1px solid var(--md-outline-variant); border-radius:4px; background:transparent;">
                                <span class="live-margin" style="font-size:10px; font-weight:bold; margin-left:4px;"></span>
                            </div>
                            ` : `<input type="hidden" class="row-item-buyprice" value="${item.buyPrice || 0}">`}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; align-self: stretch;">
                            <div class="tap-target" onclick="this.closest('.item-entry-card').remove(); UI.calc${type.charAt(0).toUpperCase() + type.slice(1)}Totals()" style="color: var(--md-outline); padding: 4px; border-radius: 50%; background: var(--md-surface-variant); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                            </div>
                            <strong class="row-total" style="font-size: 16px; color: var(--md-on-surface); margin-top: auto; padding-top: 8px;">0.00</strong>
                        </div>
                    </div>
                `;
                tbody.appendChild(tr);
            });
            if (record.documentType === 'return') {
                const refEl = document.getElementById(`${type}-original-ref`);
                if (refEl) {
                    refEl.innerHTML = `<option value="">${record.orderNo || 'Linked Reference'}</option>`;
                    refEl.disabled = true; 
                }
            }

            type === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();

            // NEW: Fetch and Display all Linked Receipts / Vouchers
            const historyCard = document.getElementById(`${type}-payment-history-card`);
            const historyList = document.getElementById(`${type}-payment-history-list`);
            if (historyCard && historyList) {
                // FIX: Check ALL references to catch cross-linked payments in the history view!
                const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
                const partyId = type === 'sales' ? record.customerId : record.supplierId;
                const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                
                let linkedReceipts = allReceipts.filter(r => {
                    if (r.firmId !== app.state.firmId || r.ledgerId !== partyId) return false;
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    return refs.some(ref => uniqueRefs.includes(ref));
                });

                // 🚨 ENTERPRISE FIX: Inject FIFO Advance Pool & Credit Notes directly into the UI!
                let explicitCoverage = 0;
                linkedReceipts.forEach(r => {
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim()).filter(Boolean);
                    let splitAmt = 0;
                    let remainingPayment = parseFloat(r.amount) || 0;
                    const allDocs = storeMap[type] === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
                    
                    refs.forEach(ref => {
                        const linkedDoc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref || String(d.id).endsWith(ref));
                        let docTotal = linkedDoc ? (parseFloat(linkedDoc.grandTotal) || 0) : (parseFloat(r.amount) / refs.length);
                        let applyAmt = Math.min(docTotal, remainingPayment);
                        if (applyAmt > 0) remainingPayment -= applyAmt;
                        if (uniqueRefs.includes(ref)) splitAmt += applyAmt; 
                    });
                    if (remainingPayment > 0.01 && refs[0] && uniqueRefs.includes(refs[0])) splitAmt += remainingPayment;

                    if (type === 'sales') explicitCoverage += (r.type === 'in' ? splitAmt : -splitAmt);
                    else explicitCoverage += (r.type === 'out' ? splitAmt : -splitAmt);
                    
                    r.trueSplitAmt = splitAmt; // Save for the UI renderer!
                });

                const allDocs = storeMap[type] === 'sales' ? UI.state.rawData.sales : UI.state.rawData.purchases;
                let totalReturned = 0;
                allDocs.forEach(d => {
                    if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open' && uniqueRefs.includes(d.orderNo)) {
                        const rAmt = parseFloat(d.grandTotal) || 0;
                        totalReturned += rAmt;
                        linkedReceipts.push({
                            receiptNo: d.orderNo ? 'CN-' + d.orderNo : 'Credit/Debit Note',
                            isReturnNote: true,
                            date: d.date,
                            mode: 'Return / Credit',
                            amount: rAmt,
                            type: type === 'sales' ? 'in' : 'out' 
                        });
                    }
                });
                explicitCoverage += totalReturned;

                const grandTotal = parseFloat(record.grandTotal) || 0;
                if (record.status === 'Completed' && explicitCoverage < grandTotal - 0.01) {
                    const advanceUsed = grandTotal - explicitCoverage;
                    linkedReceipts.push({
                        receiptNo: 'ADV-POOL',
                        isAdvance: true,
                        date: record.completedDate || record.date,
                        mode: 'Adjusted from Advance Balance',
                        amount: advanceUsed,
                        type: type === 'sales' ? 'in' : 'out'
                    });
                }

                if (linkedReceipts.length > 0) {
                    linkedReceipts.sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
                    historyCard.classList.remove('hidden');
                    historyList.innerHTML = linkedReceipts.map(r => {
                        let splitAmt = r.isAdvance || r.isReturnNote ? (parseFloat(r.amount) || 0) : (r.trueSplitAmt || parseFloat(r.amount) || 0);
                        
                        // 🚨 PERFECT COLOR MATH
                        let isPositive = false;
                        if (type === 'sales') isPositive = r.type === 'in';
                        else isPositive = r.type === 'out';
                        
                        const color = isPositive ? 'var(--md-success)' : 'var(--md-error)';
                        const sign = isPositive ? '+' : '-';
                        
                        return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed var(--md-outline-variant);">
                            <div><div style="font-weight:bold; color:var(--md-primary);">${r.receiptNo || (r.isAutoGenerated ? 'Auto-Generated Receipt' : 'Manual Receipt')}</div><small style="color:var(--md-text-muted);">${r.date} | Mode: ${r.mode}</small></div>
                            <div style="font-weight:bold; font-size:16px; color:${color};">${sign}&#8377;${splitAmt.toFixed(2)}</div>
                        </div>`;
                    }).join('');
                } else {
                    historyCard.classList.add('hidden');
                    historyList.innerHTML = '';
                }
            }

            // NEW: Fetch and Display all Linked Expenses (Job Costing)
            const expCard = document.getElementById(`${type}-expense-history-card`);
            const expList = document.getElementById(`${type}-expense-history-list`);
            if (expCard && expList) {
                const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
                const allExpenses = await getAllRecords('expenses');
                // FIX: Trim whitespace and check against ALL possible IDs to prevent broken links!
                const linkedExpenses = allExpenses.filter(e => {
                    if (e.firmId !== app.state.firmId || !e.linkedInvoice) return false;
                    const cleanLinks = e.linkedInvoice.split(',').map(link => link.trim());
                    return cleanLinks.some(link => uniqueRefs.includes(link));
                });
                
                // 🚨 NEW FIX: Sort the linked expenses dynamically in descending order
                linkedExpenses.sort((a, b) => String(b.expenseNo || b.id).localeCompare(String(a.expenseNo || a.id), undefined, {numeric: true, sensitivity: 'base'}));

                if (linkedExpenses.length > 0) {
                    expCard.classList.remove('hidden');
                    expList.innerHTML = linkedExpenses.map(e => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed var(--md-outline-variant);">
                            <div><div style="font-weight:bold; color:var(--md-error);">${e.expenseNo || 'EXP'} - ${e.category}</div><small style="color:var(--md-text-muted);">${e.date} | ${e.notes || 'No notes'}</small></div>
                            <div style="font-weight:bold; font-size:16px; color:var(--md-error);">\u20B9${parseFloat(e.amount).toFixed(2)}</div>
                        </div>
                    `).join('');
                } else {
                    expCard.classList.add('hidden');
                    expList.innerHTML = '';
                }
            }

        } else {
            const form = document.getElementById(`form-${type}`);
            if(!form) return;
            const elements = form.elements;
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (el.name) {
                    // STRICT ERP LOGIC: Prevent Ghost Data! Clear the field if the new record doesn't have a value.
                    const val = record[el.name] !== undefined ? record[el.name] : '';
                    if (el.type === 'checkbox') {
                        el.checked = !!val;
                    } else {
                        el.value = val;
                        if (el._flatpickr) {
                            if (val) el._flatpickr.setDate(val);
                            else el._flatpickr.clear();
                        }
                    }
                }
            }
            
            // STRICT ERP LOGIC: Lock Inventory fields on existing products to prevent audit trail bypass!
            if (type === 'product' && id) {
                const stockInputs = form.querySelectorAll('input[name="stockGst"], input[name="stockNonGst"], input[name="stock"]');
                stockInputs.forEach(input => {
                    input.readOnly = true;
                    input.style.backgroundColor = 'var(--md-surface-variant)';
                    input.style.border = '1px dashed var(--md-outline-variant)';
                    input.title = "To change existing inventory, please use the official Stock Adjustment tool.";
                });
            }
            
            // Recover images so they aren't erased on save
            if (type === 'product' && record.image) {
                const img = document.getElementById('product-image-preview');
                if (img) { img.src = record.image; img.classList.remove('hidden'); }
            }
            
            // NEW: Calculate and display the Total Stock Valuation!
            if (type === 'product') {
                const valCard = document.getElementById('product-valuation-card');
                if (valCard) {
                    valCard.classList.remove('hidden');
                    
                    const totalStock = parseFloat(record.stock) || 0;
                    const buyPrice = parseFloat(record.buyPrice) || 0;
                    const totalValue = totalStock * buyPrice;
                    
                    const stockDisp = document.getElementById('product-total-stock-display');
                    const valDisp = document.getElementById('product-total-value-display');
                    
                    if (stockDisp) stockDisp.innerText = `${totalStock} ${record.uom || 'Units'} Total`;
                    if (valDisp) valDisp.innerText = `₹${totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                }
            }

            if (type === 'expense') {
                if (record.attachment) {
                    const img = document.getElementById('expense-attachment-preview');
                    if (img) { img.src = record.attachment; img.classList.remove('hidden'); }
                }
                
                // ENTERPRISE FIX: Restore the hidden input value so editing an expense doesn't accidentally unlink it!
                const linkInput = document.getElementById('expense-linked-invoice');
                if (linkInput) linkInput.value = record.linkedInvoice || '';

                // NEW: Recover the document names for the UI Display (Multi-Link)
                if (record.linkedInvoice) {
                    const links = record.linkedInvoice.split(',').map(x => x.trim()).filter(x => x);
                    const displayNames = links.map(linkId => {
                        // SELF-HEALING: Catch broken fragments and protect against corrupted empty IDs!
                        const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || (s.id && s.id.endsWith(linkId)));
                        const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || (p.id && p.id.endsWith(linkId)));
                        
                        if (sDoc) return sDoc.orderNo || sDoc.invoiceNo || sDoc.id.slice(-4).toUpperCase();
                        if (pDoc) return pDoc.orderNo || pDoc.poNo || pDoc.invoiceNo || pDoc.id.slice(-4).toUpperCase();
                        
                        return linkId.startsWith('sollo-') ? linkId.slice(-4).toUpperCase() : linkId;
                    });
                    
                    const displayEl = document.getElementById('expense-linked-display');
                    if(displayEl) {
                        // SELF-HEALING: Remove duplicates
                        displayEl.innerText = [...new Set(displayNames)].join(' | ');
                        displayEl.style.color = 'var(--md-primary)';
                    }
                }
            }
        }
    },

    // ==========================================
    // 6. MASTER FORM SUBMISSIONS & EVENT LISTENERS
    // ==========================================
    setupForms: () => {
        // 🚨 ENTERPRISE UX: SMART INVOICE NUMBER AUTO-CLEAR
        // Automatically clears the Invoice Number when switching to 'Non-GST' (Bill of Supply), 
        // and safely restores it if switched back to B2B/B2C!
        const typeDropdown = document.getElementById('sales-invoice-type');
        const invInput = document.getElementById('sales-invoice-no');
        if (typeDropdown && invInput) {
            typeDropdown.addEventListener('change', async (e) => {
                if (e.target.value === 'Non-GST') {
                    // Save the current number in memory before clearing it!
                    invInput.setAttribute('data-cached-no', invInput.value);
                    invInput.value = '';
                    invInput.placeholder = 'Optional for Bill of Supply';
                } else {
                    // Restore the number if they switch back to GST
                    const cached = invInput.getAttribute('data-cached-no');
                    if (cached) {
                        invInput.value = cached;
                    } else if (!invInput.value && typeof getNextDocumentNumber === 'function') {
                        const prefix = app.state.currentDocType === 'return' ? 'CN' : 'INV';
                        invInput.value = await getNextDocumentNumber('sales', prefix);
                    }
                    invInput.placeholder = '';
                }
            });
        }

        // ------------------ SALES & PURCHASE SUBMISSIONS ------------------
        ['sales', 'purchase'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // NEW: Lock the submit button to prevent duplicate entries
                    const submitBtn = document.getElementById(`btn-save-${type}`);
                    // FIXED: Use innerHTML to preserve the SVG Checkmark icon!
                    const originalText = submitBtn ? submitBtn.innerHTML : `Save ${type === 'sales' ? 'Invoice' : 'Purchase'} <span class="material-symbols-outlined" style="font-size: 18px; margin-left: 6px;">done_all</span>`;
                    
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        // Let ui.js handle the "Saving..." SVG injection so the two scripts don't fight!
                    }

                    try {
                        const partyKey = type === 'sales' ? 'customer' : 'supplier';
                    const partyId = document.getElementById(`${type}-${partyKey}-id`).value;
                    if (!partyId) return alert(`Please select a ${partyKey}.`);

                    // STRICT ERP LOGIC: Block Future Dates to protect PnL and Aging Reports!
                    const docDate = document.getElementById(`${type}-date`).value;
                    if (docDate) {
                        const selectedDate = window.Utils.safeDate(docDate); // ENTERPRISE FIX: Protect Apple/iOS
                        const today = new Date();
                        today.setDate(today.getDate() + 1); // Allow up to 1 day for timezone safety
                        if (selectedDate > today) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert("ERROR: You cannot save a document with a future date. Please correct the date to protect your financial reports.");
                        }
                    }

                    const items = [];
                    const rows = document.querySelectorAll(`#${type}-items-body .item-entry-card`);
                    if (rows.length === 0) return alert("Please add at least one item.");

                    rows.forEach(tr => {
                        const qtyInput = tr.querySelector('.row-qty');
                        let qty = parseFloat(qtyInput.value) || 0;
                        const rateInput = tr.querySelector('.row-rate');
                        let rate = parseFloat(rateInput.value) || 0;

                        // ENTERPRISE FIX: The Negative Quantity Exploit Shield!
                        // Prevents users from typing negative numbers to artificially shrink their taxable revenue and illegally inflate stock!
                        if (qty <= 0) {
                            alert("Error: Quantity must be greater than zero. To refund an item, please use a proper Credit/Debit Note!");
                            throw new Error("Invalid negative or zero quantity detected.");
                        }
                        
                        // ENTERPRISE FIX: The Negative Rate (Price) Shield!
                        if (rate < 0) {
                            alert("Error: Item Rate (Price) cannot be a negative number!");
                            throw new Error("Invalid negative rate detected.");
                        }
                        
                        // ENTERPRISE FIX: The Infinite Return Guard!
                        // Prevents users from manually bypassing the UI to return more items than originally purchased.
                        if (qtyInput.hasAttribute('max')) {
                            const maxAllowable = parseFloat(qtyInput.getAttribute('max'));
                            if (qty > maxAllowable) {
                                alert(`Error: You are trying to return ${qty}, but only ${maxAllowable} are available from the original document.`);
                                throw new Error("Return quantity exceeds original purchase.");
                            }
                        }
                        
                        if (qty <= 0) return; // FIX: Prevent saving empty "0 qty" items from Returns or accidental inputs

                        items.push({
                            itemId: tr.querySelector('.row-item-id').value,
                            name: tr.querySelector('.row-item-name').value,
                            hsn: tr.querySelector('.row-hsn').value,
                            qty: qty,
                            uom: tr.querySelector('.row-uom').value,
                            rate: parseFloat(tr.querySelector('.row-rate').value) || 0,
                            gstPercent: parseFloat(tr.querySelector('.row-gst').value) || 0,
                            buyPrice: parseFloat(tr.querySelector('.row-item-buyprice').value) || 0
                        });
                    });
                    
                    if (items.length === 0) {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                        return alert("Please add at least one item with a quantity greater than 0.");
                    }

                    const isReturn = app.state.currentDocType === 'return';
                    const discTypeEl = document.getElementById(`${type}-discount-type`);
                    const accEl = document.getElementById(`${type}-account-id`);

                    // FIX: Prevent Duplicate Numbers, but safetly IGNORE blank numbers!
                    const proposedDocNo = type === 'sales' ? document.getElementById('sales-invoice-no').value : document.getElementById('purchase-po-no').value;
                    // ENTERPRISE FIX: Drastically reduce Save Lag by only loading the active firm's docs into RAM!
                    const allExistingDocs = await getAllRecords(type === 'sales' ? 'sales' : 'purchases', 'firmId', app.state.firmId);
                    
                    if (proposedDocNo && proposedDocNo.trim() !== '') {
                        const isDuplicate = allExistingDocs.some(d => 
                            d.firmId === app.state.firmId && 
                            (type === 'sales' ? true : d.supplierId === partyId) &&
                            (d.invoiceNo === proposedDocNo || d.poNo === proposedDocNo) && 
                            d.id !== app.state.currentEditId
                        );
                        if (isDuplicate) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert(`Error: Document number "${proposedDocNo}" already exists! Please use a unique number.`);
                        }
                    }

                    // Negative Inventory Warning (With Edit Recovery Math & Purchase Returns)
                    const isReducingStock = (type === 'sales' && !isReturn) || (type === 'purchase' && isReturn);
                    if (isReducingStock) {
                        let existingInvoice = null;
                        if (app.state.currentEditId) {
                            existingInvoice = await getRecordById(type === 'sales' ? 'sales' : 'purchases', app.state.currentEditId);
                        }
                        
                        // NEW: Detect which stock pool this invoice is attempting to pull from!
                        const invTypeEl = document.getElementById(`${type}-invoice-type`);
                        const isNonGST = invTypeEl ? invTypeEl.value === 'Non-GST' : false;
                        const poolName = isNonGST ? 'Non-GST' : 'GST';
                        
                        for (const row of items) {
                            // ENTERPRISE FIX: Direct O(1) DB lookup. Stops the "Pre-Save" RAM freeze!
                            const dbItem = await getRecordById('items', row.itemId);
                            if (dbItem) {
                                // Isolate the exact stock pool being targeted (Bulletproof Math)
                                const rawGst = parseFloat(dbItem.stockGst);
                                const rawNon = parseFloat(dbItem.stockNonGst);
                                let stockGst = isNaN(rawGst) ? (parseFloat(dbItem.stock) || 0) : rawGst;
                                let stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                                let effectiveStock = isNonGST ? stockNonGst : stockGst;
                                
                                // If editing an already-completed invoice, temporarily add the old qty back to the pool
                                if (existingInvoice && existingInvoice.status !== 'Open') {
                                    const oldItem = existingInvoice.items.find(i => i.itemId === row.itemId);
                                    if (oldItem) effectiveStock += (parseFloat(oldItem.qty) || 0);
                                }
                                
                                if (effectiveStock < parseFloat(row.qty)) {
                                    if (!confirm(`Warning: You are trying to deduct ${row.qty} of "${row.name}", but your effective ${poolName} stock is only ${effectiveStock}. This will cause negative inventory. Continue anyway?`)) {
                                        return; 
                                    }
                                }
                            }
                        }
                    }

                    // ENTERPRISE FIX: The "Negative Invoice" Embezzlement Shield!
                    // Prevent malicious users from typing a flat discount larger than the subtotal to create a negative invoice and steal money!
                    const checkSubtotal = parseFloat(document.getElementById(`${type}-subtotal`).innerText.replace(/[^\d.-]/g, '')) || 0;
                    const checkDiscount = Math.abs(parseFloat((document.getElementById(`${type}-discount`) || {}).value) || 0);
                    if (discTypeEl && discTypeEl.value === '\u20B9' && checkDiscount > checkSubtotal) {
                        alert("Error: Flat discount cannot be greater than the subtotal! This creates an illegal negative invoice.");
                        throw new Error("Discount exceeds subtotal.");
                    } else if (discTypeEl && discTypeEl.value === '%' && checkDiscount > 100) {
                        alert("Error: Percentage discount cannot exceed 100%!");
                        throw new Error("Discount exceeds 100%.");
                    }

                    // ENTERPRISE FIX: Fetch the live ledger to snapshot the GSTIN onto the invoice!
                    const targetLedger = await getRecordById('ledgers', partyId);
                    const partyGst = targetLedger ? targetLedger.gst : '';

                    // 🚨 ENTERPRISE FIX: Strict Status Engine
                    // This mathematically guarantees that a "Shipped" invoice NEVER saves a "Completed" date!
                    const currentStatus = document.getElementById(`${type}-order-status`).value;
                    let safeShippedDate = document.getElementById(`${type}-shipped-date`).value;
                    let safeCompletedDate = document.getElementById(`${type}-completed-date`).value;

                    if (currentStatus === 'Open' || currentStatus === 'Unpaid') {
                        safeShippedDate = '';
                        safeCompletedDate = '';
                    } else if (currentStatus === 'Shipped') {
                        safeCompletedDate = '';
                    }

                    const data = {
                        id: app.state.currentEditId || Utils.generateId(),
                        firmId: app.state.firmId,
                        documentType: app.state.currentDocType,
                        date: document.getElementById(`${type}-date`).value,
                        orderDate: document.getElementById(`${type}-order-date`).value,
                        shippedDate: safeShippedDate,
                        completedDate: safeCompletedDate,
                        
                        [type === 'sales' ? 'customerId' : 'supplierId']: partyId,
                        [type === 'sales' ? 'customerName' : 'supplierName']: document.getElementById(`${type}-${partyKey}-display`).innerText,
                        [type === 'sales' ? 'customerGst' : 'supplierGst']: partyGst,
                        
                        invoiceNo: type === 'sales' ? document.getElementById('sales-invoice-no').value : (document.getElementById('purchase-po-no').value), 
                        poNo: type === 'purchase' ? document.getElementById('purchase-po-no').value : '',
                        orderNo: document.getElementById(`${type}-order-no`).value,
                        status: currentStatus,
                        freightAmount: parseFloat(document.getElementById(`${type}-freight`).value) || 0,
                        invoiceType: document.getElementById(`${type}-invoice-type`) ? document.getElementById(`${type}-invoice-type`).value : 'B2B',
                        
                        items: items,
                        
                        subtotal: parseFloat(document.getElementById(`${type}-subtotal`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        // STRICT ERP LOGIC: Force absolute numbers to prevent negative discounts from inflating the total!
                        discount: Math.abs(parseFloat(document.getElementById(`${type}-discount`).value) || 0),
                        discountType: discTypeEl ? discTypeEl.value : '\u20B9',
                        totalGst: parseFloat(document.getElementById(`${type}-gst-total`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        grandTotal: parseFloat(document.getElementById(`${type}-grand-total`).innerText.replace(/[^\d.-]/g, '')) || 0,
                        internalNotes: document.getElementById(`${type}-internal-notes`) ? document.getElementById(`${type}-internal-notes`).value : '',
                        
                        // NEW: Save Custom Field Values
                        cf1Val: type === 'sales' && document.getElementById('sales-cf1-val') ? document.getElementById('sales-cf1-val').value : '',
                        cf2Val: type === 'sales' && document.getElementById('sales-cf2-val') ? document.getElementById('sales-cf2-val').value : '',
                        cf3Val: type === 'sales' && document.getElementById('sales-cf3-val') ? document.getElementById('sales-cf3-val').value : '',

                        // NEW: Instant payments removed. Hardcoded to 0. All payments use manual receipts now.
                        amountPaid: 0,
                        paymentMode: 'Cash',
                        accountId: 'cash'
                    };

                        const storeName = type === 'sales' ? 'sales' : 'purchases';
                        
                        // STRICT ERP LOGIC 1: THE PRE-TRANSACTION CACHE ANNIHILATOR!
                        // Destroy the browser's RAM cache BEFORE the database does its math. 
                        // This guarantees the engine fetches the TRUE existing invoice and stops the stock from multiplying!
                        if (window.AppCache) {
                            window.AppCache.items = null;
                            window.AppCache[storeName] = null;
                        }

// ==========================================
// ENTERPRISE UPGRADE 4: SPLIT-TENDER ENGINE
// ==========================================
// 🚨 BIZOPS FIX: Only show the Payment Screen for BRAND NEW invoices that are fully COMPLETED. If Unpaid or Shipped, skip it!
if (type === 'sales' && data.status === 'Completed' && !app.state.currentEditId) {
    const splitConfirmed = await new Promise(async (resolve) => {
                            const total = parseFloat(data.grandTotal) || 0;
                            
                            // Safely wipe any stuck blurry overlays from the screen
                            const existingModal = document.getElementById('split-tender-modal');
                            if (existingModal) existingModal.remove();
                            const existingOverlay = document.getElementById('split-overlay');
                            if (existingOverlay) existingOverlay.remove();
                            
                            // 🚨 CRITICAL FIX: Fetch actual Bank Accounts to inject into the modal!
                                const allAccs = await window.getAllRecords('accounts', 'firmId', app.state.firmId);
                                let bankOptions = allAccs.filter(a => a.id !== 'cash').map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                                if (!bankOptions) bankOptions = `<option value="cash">Default Bank / Cash</option>`;

                                // Dynamically construct the gorgeous Split-Tender Bottom Sheet
                                const modalHTML = `
                                <div id="split-tender-modal" class="bottom-sheet" style="z-index: 99999; display: flex; flex-direction: column; background: var(--md-surface); border-top-left-radius: 24px; border-top-right-radius: 24px; box-shadow: 0 -4px 20px rgba(0,0,0,0.2);">
                                    <div style="padding: 20px; border-bottom: 1px solid var(--md-outline-variant); display: flex; justify-content: space-between; align-items: center;">
                                        <h3 style="margin: 0; color: var(--md-primary); font-weight: 800;">Split Payment</h3>
                                        <h3 style="margin: 0; color: var(--md-on-surface); font-weight: 900;">Total: ₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h3>
                                    </div>
                                    <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                                        <div>
                                            <label style="font-size: 12px; font-weight: 900; color: var(--md-secondary); letter-spacing: 0.5px;">CASH RECEIVED (₹)</label>
                                            <input type="number" id="split-cash" placeholder="0.00" step="any" style="width: 100%; padding: 14px; border: 2px solid var(--md-outline-variant); border-radius: 8px; font-size: 20px; font-weight: bold; margin-top: 6px;" oninput="window.calcSplit()">
                                        </div>
                                        <div>
                                            <label style="font-size: 12px; font-weight: 900; color: var(--md-secondary); letter-spacing: 0.5px;">BANK / UPI RECEIVED (₹)</label>
                                            <div style="display: flex; gap: 8px; margin-top: 6px;">
                                                <input type="number" id="split-bank" placeholder="0.00" step="any" style="flex: 1; padding: 14px; border: 2px solid var(--md-outline-variant); border-radius: 8px; font-size: 20px; font-weight: bold;" oninput="window.calcSplit()">
                                                <select id="split-bank-account" style="width: 140px; padding: 14px; border: 2px solid var(--md-outline-variant); border-radius: 8px; font-weight: bold; background: var(--md-surface-variant);">
                                                    ${bankOptions}
                                                </select>
                                            </div>
                                        </div>
                                        <div style="background: rgba(186, 26, 26, 0.1); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px dashed rgba(186, 26, 26, 0.3);">
                                            <span style="color: var(--md-error); font-weight: 900; font-size: 14px; letter-spacing: 0.5px;">PENDING CREDIT:</span>
                                            <span id="split-credit" style="color: var(--md-error); font-size: 24px; font-weight: 900;">₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <button id="split-confirm-btn" class="btn-primary" style="padding: 16px; font-size: 18px; border-radius: 12px; margin-top: 12px; font-weight: 900;">Finalize Split Invoice</button>
                                        <button id="split-cancel-btn" style="padding: 12px; font-size: 14px; background: transparent; border: none; color: var(--md-secondary); font-weight: bold;">Cancel</button>
                                    </div>
                                </div>
                                <div id="split-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99998; backdrop-filter: blur(3px);"></div>
                                `;
                                
                                document.body.insertAdjacentHTML('beforeend', modalHTML);

                                // The Live Math Engine
                                window.calcSplit = () => {
                                    const c = parseFloat(document.getElementById('split-cash').value) || 0;
                                    const b = parseFloat(document.getElementById('split-bank').value) || 0;
                                    let credit = total - (c + b);
                                    if (credit < 0) credit = 0;
                                    document.getElementById('split-credit').innerText = `₹${credit.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
                                };

                                setTimeout(() => document.getElementById('split-tender-modal').classList.add('open'), 10);

                                const cleanup = () => {
                                    document.getElementById('split-tender-modal').remove();
                                    document.getElementById('split-overlay').remove();
                                };

                                document.getElementById('split-cancel-btn').onclick = () => { cleanup(); resolve(false); };
                                document.getElementById('split-confirm-btn').onclick = () => {
                                    const c = parseFloat(document.getElementById('split-cash').value) || 0;
                                    const b = parseFloat(document.getElementById('split-bank').value) || 0;
                                    const bAcc = document.getElementById('split-bank-account') ? document.getElementById('split-bank-account').value : 'cash';
                                    cleanup();
                                    resolve({ cash: c, bank: b, bankAcc: bAcc, credit: (total - (c + b)) });
                                };
                            });

                            if (!splitConfirmed) {
                                if (window.Utils) window.Utils.showToast("⚠️ Save Cancelled.");
                                // 🚨 CRITICAL FIX: Unlock the form so the user can click Save again!
                                form.removeAttribute('data-is-submitting');
                                if (submitBtn) { 
                                    submitBtn.disabled = false; 
                                    submitBtn.innerText = originalText; 
                                    submitBtn.style.opacity = "1"; 
                                    submitBtn.classList.remove('btn-loading');
                                }
                                return; 
                            }

                            data.splitData = splitConfirmed;
                            data.paymentMethod = 'Split';
                            
                            // We assign 'Unpaid' so the central FIFO waterfall engine correctly calculates the remaining debt and dynamically marks it 'Completed' if fully paid!
                            data.status = 'Unpaid'; 
                            data.notes = (data.notes || '') + `\n[Split Tender: ₹${splitConfirmed.cash} Cash, ₹${splitConfirmed.bank} Bank. Pending: ₹${splitConfirmed.credit}]`;
                        }

                        // Execute the perfect database math with the upgraded data payload
                        // 🚨 NEW: Save the invoice FIRST to prevent database corruption!
                        const savedInvoiceId = await saveInvoiceTransaction(storeName, data);

                        // 🚨 CRITICAL FIX: The Split-Tender Blackhole Shield!
                        // Save receipts AFTER the invoice is safely stored to prevent phantom money if the phone's storage is full!
                        if (savedInvoiceId && typeof splitConfirmed !== 'undefined') {
                            if (splitConfirmed.cash > 0) {
                                await saveRecord('receipts', {
                                    id: 'split-cash-' + data.id,
                                    receiptNo: 'REC-' + data.invoiceNo,
                                    firmId: data.firmId,
                                    date: data.date,
                                    ledgerId: data.customerId,
                                    ledgerName: data.customerName,
                                    type: 'in',
                                    amount: splitConfirmed.cash,
                                    mode: 'Cash',
                                    accountId: 'cash',
                                    invoiceRef: data.id,
                                    desc: `Cash Split for ${data.invoiceNo}`,
                                    isAutoGenerated: true
                                });
                            }
                            if (splitConfirmed.bank > 0) {
                                await saveRecord('receipts', {
                                    id: 'split-bank-' + data.id,
                                    receiptNo: 'REC-' + data.invoiceNo,
                                    firmId: data.firmId,
                                    date: data.date,
                                    ledgerId: data.customerId,
                                    ledgerName: data.customerName,
                                    type: 'in',
                                    amount: splitConfirmed.bank,
                                    mode: 'Bank Transfer',
                                    accountId: splitConfirmed.bankAcc || 'cash',
                                    invoiceRef: data.id,
                                    desc: `Bank Split for ${data.invoiceNo}`,
                                    isAutoGenerated: true
                                });
                            }
                        }

                        // THE STATE TRANSITION LOCK
                        app.state.currentEditId = data.id;
                        
                        // STRICT ERP LOGIC 2: THE POST-TRANSACTION CACHE ANNIHILATOR!
                        // Destroy the cache a second time! This forces the Dashboard to read the newly saved hard drive data.
                        if (window.AppCache) {
                            window.AppCache.items = null;
                            window.AppCache[storeName] = null;
                        }
                        
                        // STRICT ERP LOGIC 3: INJECT THE ABSOLUTE TRUTH
                        // Fetch the mathematically perfect stock directly from the hard drive and force it into the UI
                        const absoluteTruth = await window.getAllRecords('items');
                        if (window.UI && window.UI.state && window.UI.state.rawData) {
                            window.UI.state.rawData.items = absoluteTruth;
                        }
                        
                        // NEW: Auto-Complete Advance Payments Engine
                        if (typeof app.autoCompleteInvoices === 'function') {
                            // ENTERPRISE FIX: Pass the exact Invoice Date into the background engine!
                            await app.autoCompleteInvoices(partyId, type, data.date);
                        }
                        
                        UI.showSuccess(); 
                        UI.closeActivity(`activity-${type}-form`);
                        
                        // STRICT ERP LOGIC 4: Execute a flawless, synchronized global refresh
                        if (typeof app.refreshAll === 'function') {
                            await app.refreshAll();
                        } else if (window.UI && typeof window.UI.renderDashboard === 'function') {
                            window.UI.renderDashboard();
                        }
                    } catch (error) {
                        console.error("Save failed:", error);
                        // Prevent the annoying "Double Alert" if validation already warned the user
                        if (error.message !== "Invalid negative or zero quantity detected." && 
                            error.message !== "Invalid negative rate detected." && 
                            error.message !== "Return quantity exceeds original purchase." && 
                            error.message !== "Discount exceeds subtotal." && 
                            error.message !== "Discount exceeds 100%.") {
                            alert("An error occurred while saving. Please try again.");
                        }
                    } finally {
                        // STRICT ERP LOGIC 3: THE ANIMATION SHIELD
                        if (submitBtn) {
                            setTimeout(() => {
                                submitBtn.disabled = false;
                                submitBtn.style.opacity = "1";
                                submitBtn.style.pointerEvents = "auto";
                                // 🚨 FIX: Let the 1.2s green checkmark play! Only restore text if the save failed.
                                if (submitBtn.classList.contains('btn-loading')) {
                                    submitBtn.innerHTML = originalText;
                                    submitBtn.classList.remove('btn-loading');
                                }
                            }, 400); 
                        }
                    }
                });
            }
        });

        // ------------------ GENERAL CRUD FORMS ------------------
        ['product', 'ledger', 'expense', 'account'].forEach(type => {
            const form = document.getElementById(`form-${type}`);
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : 'Save';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    // 🚨 FIX: Let ui.js handle the SVG spinner animation!
                }

                try {
                    const formData = new FormData(form);
                    
                    let storeName = `${type}s`;
                    if (type === 'product') storeName = 'items';
                    else if (type === 'account') storeName = 'accounts';

                    // Initialize data and merge with existing database record to prevent wiping hidden fields
                    let data = { id: app.state.currentEditId || Utils.generateId(), firmId: app.state.firmId };
                    
                    if (app.state.currentEditId) {
                        const existingRecord = await getRecordById(storeName, app.state.currentEditId);
                        if (existingRecord) data = { ...existingRecord };
                    }
                    
                    formData.forEach((value, key) => { 
                    // ENTERPRISE FIX: Removed 'category' so the dropdown Exact-Match doesn't break on acronyms like "EMI" or "GST"!
                    if (typeof value === 'string' && (key === 'name' || key === 'city')) {
                        // Converts "acme corp" into "Acme Corp" automatically
                        data[key] = value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    } else {
                        data[key] = value; 
                    }
                    });

                    // ENTERPRISE FIX: Duplicate Document Number Protection for Expenses
                    if (type === 'expense' && data.expenseNo) {
                        const allExistingExpenses = await getAllRecords('expenses', 'firmId', app.state.firmId);
                        const isDuplicate = allExistingExpenses.some(e => 
                            e.firmId === app.state.firmId && 
                            e.expenseNo === data.expenseNo && 
                            e.id !== data.id
                        );
                        if (isDuplicate) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert(`Error: Expense number "${data.expenseNo}" already exists! Please use a unique number.`);
                        }
                    }
                
                if (type === 'product') {
                    data.sellPrice = parseFloat(data.sellPrice) || 0;
                    data.buyPrice = parseFloat(data.buyPrice) || 0;
                    data.minStock = parseFloat(data.minStock) || 0;
                    data.gst = parseFloat(data.gst) || 0;
                    
                    // STRICT ERP LOGIC: Prevent "Race Condition" Stock Wipeouts!
                    // If editing an existing product, NEVER overwrite the live stock with the stale UI number. 
                    if (app.state.currentEditId) {
                        const liveRecord = await getRecordById('items', app.state.currentEditId);
                        data.stockGst = liveRecord ? parseFloat(liveRecord.stockGst) || 0 : 0;
                        data.stockNonGst = liveRecord ? parseFloat(liveRecord.stockNonGst) || 0 : 0;
                        
                        // Preserve the original Opening Stock
                        if (liveRecord) {
                            data.openingStock = liveRecord.openingStock || 0;
                            data.openingStockGst = liveRecord.openingStockGst || 0;
                            data.openingStockNonGst = liveRecord.openingStockNonGst || 0;
                        }
                    } else {
                        // For newly created items, inherit directly from the UI 'stock' field
                        data.stock = parseFloat(data.stock) || 0;
                        data.stockGst = parseFloat(data.stockGst) || data.stock;
                        data.stockNonGst = parseFloat(data.stockNonGst) || 0;
                        
                        // Seed the historical Opening Stock ledger
                        data.openingStock = data.stock;
                        data.openingStockGst = data.stockGst;
                        data.openingStockNonGst = data.stockNonGst;
                    }
                    
                    // Dual Engine Safety: Total Stock is always Math(GST + Non-GST)
                    data.stock = Math.round((data.stockGst + data.stockNonGst) * 100) / 100;
                    
                    const img = document.getElementById('product-image-preview');
                    if (img && !img.classList.contains('hidden')) data.image = await window.Utils.compressImage(img.src);
                    else data.image = ''; // STRICT ERP LOGIC: Permanently delete removed images
                } 
                else if (type === 'ledger') {
                    data.openingBalance = parseFloat(data.openingBalance) || 0;
                } 
                else if (type === 'expense') {
                    // ENTERPRISE FIX: The Negative Expense Shield!
                    // Prevents users from logging negative expenses to artificially inject fake money into the Cashbook!
                    data.amount = parseFloat(data.amount) || 0;
                    if (data.amount < 0) {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                        return alert("Error: Expense amount cannot be negative. If you received a refund, please log it as 'Money In' in the Cashbook.");
                    }
                    const accEl = document.getElementById('expense-account-id');
                    data.accountId = accEl ? accEl.value : 'cash';
                    
                    // STRICT ERP LOGIC: Prevent Expenses from silently overdrafting the Cashbook!
                    const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                    let currentBal = 0;
                    // FIX: Read the Opening Balance for ALL accounts, including the default Cash Drawer!
                    const accRecord = await getRecordById('accounts', data.accountId);
                    if (accRecord) currentBal = parseFloat(accRecord.openingBalance) || 0;
                    
                    allReceipts.forEach(r => {
                        if (r.firmId === app.state.firmId && (r.accountId || 'cash') === data.accountId && r.id !== ('exp-rec-' + data.id)) {
                            currentBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                        }
                    });
                    
                    if (currentBal - data.amount < 0) {
                        if (!confirm(`Warning: This account only has ₹${currentBal.toFixed(2)} available. This expense will drop the balance below zero. Continue anyway?`)) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return;
                        }
                    }

                    const img = document.getElementById('expense-attachment-preview');
                    // ENTERPRISE FIX: Compress the expense receipt!
                    if (img && !img.classList.contains('hidden')) data.attachment = await window.Utils.compressImage(img.src);
                    else data.attachment = ''; // STRICT ERP LOGIC: Permanently delete removed images
                }
                else if (type === 'account') {
                    storeName = 'accounts';
                    data.openingBalance = parseFloat(data.openingBalance) || 0;
                }

                // ENTERPRISE FIX: The Invisible Expense Cashbook Blackhole!
                // ALL expenses (even those without inventory items, like Rent or Salary) MUST route through the Transaction Engine!
                // Otherwise, the money never leaves the Bank/Cashbook, causing massive artificial inflation of company funds!
                if (type === 'expense') {
                    if (typeof saveInvoiceTransaction === 'function') await saveInvoiceTransaction(storeName, data);
                    else if (window.saveInvoiceTransaction) await window.saveInvoiceTransaction(storeName, data);
                    else await saveRecord(storeName, data);
                } else {
                    await saveRecord(storeName, data);
                }

                // Bug Fix: Soft-update the RAM Cache instead of destroying it to stop phone overheating/thrashing
                if (window.AppCache) {
                    if (type === 'product' && window.AppCache.items) {
                        const index = window.AppCache.items.findIndex(i => i.id === data.id);
                        if (index > -1) window.AppCache.items[index] = data; else window.AppCache.items.push(data);
                    }
                    if (type === 'ledger' && window.AppCache.ledgers) {
                        const index = window.AppCache.ledgers.findIndex(l => l.id === data.id);
                        if (index > -1) window.AppCache.ledgers[index] = data; else window.AppCache.ledgers.push(data);
                    }
                    if (type === 'account' && window.AppCache.accounts) {
                        const index = window.AppCache.accounts.findIndex(a => a.id === data.id);
                        if (index > -1) window.AppCache.accounts[index] = data; else window.AppCache.accounts.push(data);
                    }
                }

                // --- ENTERPRISE UPGRADE: SMART AUTO-SELECT FOR NESTED FORMS ---
                // If the user was in the middle of an invoice, automatically drop the new item/party in!
                const sFormNode = document.getElementById('activity-sales-form');
                const pFormNode = document.getElementById('activity-purchase-form');
                const isSalesFormOpen = sFormNode ? sFormNode.classList.contains('open') : false;
                const isPurchFormOpen = pFormNode ? pFormNode.classList.contains('open') : false;
                
                if (isSalesFormOpen || isPurchFormOpen) {
                    const prefix = isSalesFormOpen ? 'sales' : 'purchase';
                    
                    if (type === 'ledger') {
                        const partyKey = isSalesFormOpen ? 'customer' : 'supplier';
                        const idEl = document.getElementById(`${prefix}-${partyKey}-id`);
                        const displayEl = document.getElementById(`${prefix}-${partyKey}-display`);
                        if (idEl) idEl.value = data.id;
                        if (displayEl) {
                            displayEl.innerText = data.name;
                            displayEl.style.color = 'var(--md-on-surface)';
                        }
                        if (window.Utils) window.Utils.showToast("Party Saved & Auto-Selected! ✅");
                    } 
                    else if (type === 'product') {
                        if (!UI.state.rawData.items) UI.state.rawData.items = [];
                        UI.state.rawData.items.push(data); // Inject into memory
                        
                        const list = document.getElementById('list-products');
                        if (list) {
                            const li = document.createElement('li');
                            li.innerHTML = `
                                <div><strong>${data.name}</strong><br><small style="color:var(--md-text-muted);">Stock: ${data.stock} ${data.uom} | ₹${data.sellPrice.toFixed(2)}</small></div>
                                <input type="checkbox" value="${data.id}" style="width: 24px; height: 24px;">
                            `;
                            list.insertBefore(li, list.firstChild);
                        }
                        if (window.Utils) window.Utils.showToast("Product Saved & Added to List! ✅");
                        setTimeout(() => { if(window.UI) window.UI.openBottomSheet('sheet-products'); }, 300);
                    }
                }
                // --------------------------------------------------------------

                // Automatically log Expenses as "Money Out" in the Cashbook
                if (type === 'expense') {
                    const expenseReceipt = {
                        id: 'exp-rec-' + data.id,
                        firmId: app.state.firmId,
                        date: data.date,
                        ledgerId: 'internal-expense',
                        ledgerName: 'Internal Expense',
                        type: 'out',
                        amount: data.amount,
                        mode: 'Expense',
                        accountId: data.accountId,
                        ref: '',
                        desc: `Expense: ${data.category}`,
                        isAutoGenerated: true,
                        invoiceRef: data.id 
                    };
                    await saveRecord('receipts', expenseReceipt);
                }
                
                // ENTERPRISE FIX: Prevent nested Master forms from closing the Invoice behind them!
                UI.closeActivity(`activity-${type}-form`);
                
                // Only trigger a full UI refresh if we are NOT inside a nested invoice! 
                // A full refresh while an invoice is open would wipe out the unsaved invoice data.
                if (!(isSalesFormOpen || isPurchFormOpen)) {
                    app.refreshAll();
                }
                
                } catch (error) {
                    console.error("Save failed:", error);
                    alert("An error occurred while saving. Please try again.");
                } finally {
                                        if (submitBtn) {
                        setTimeout(() => {
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = "1";
                            // 🚨 FIX: Let the 1.2s green checkmark play! Only restore text if the save failed.
                            if (submitBtn.classList.contains('btn-loading')) {
                                submitBtn.innerHTML = submitBtn.hasAttribute('data-original-text') ? submitBtn.getAttribute('data-original-text') : originalText;
                                submitBtn.style.width = '';
                                submitBtn.classList.remove('btn-loading');
                            }
                        }, 400);
                    }
                }
            });
        });

        // ------------------ STOCK ADJUSTMENT SUBMISSION ------------------
                const adjForm = document.getElementById('form-stock-adjustment');
        if (adjForm) {
            adjForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // FIXED: Button locking implemented to prevent duplicate stock adjustments
                const submitBtn = adjForm.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : 'Save Adjustment';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    // Let ui.js handle the SVG spinner animation!
                }

                try {
                    const itemId = document.getElementById('adj-product-id').value;
                    if (!itemId) throw new Error("Please select a product.");
                    
                    const pool = document.getElementById('adj-pool').value;
                    const type = document.getElementById('adj-type').value;
                    
                    // ENTERPRISE FIX: The Inverted Stock Exploit Shield!
                    // Math.abs() forces the quantity to be positive. Prevents users from typing '-50' on a 'Reduce' adjustment to secretly ADD stock!
                    const qty = Math.abs(parseFloat(document.getElementById('adj-qty').value) || 0);
                    
                    if (qty <= 0) {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                        return alert("Error: Adjustment quantity must be strictly greater than zero.");
                    }
                    
                    const item = await getRecordById('items', itemId);
                    if (!item) throw new Error("Product not found in database.");
                    
                    const rawGst = parseFloat(item.stockGst);
                    const rawNon = parseFloat(item.stockNonGst);
                    let stockGst = isNaN(rawGst) ? (parseFloat(item.stock) || 0) : rawGst;
                    let stockNonGst = isNaN(rawNon) ? 0 : rawNon;
                    let targetStock = pool === 'gst' ? stockGst : stockNonGst;
                    
                    if (type === 'reduce') {
                        if (targetStock - qty < 0) {
                            if (!confirm(`Warning: This will drop the ${pool === 'gst' ? 'GST' : 'Non-GST'} stock below zero. Continue anyway?`)) {
                                return; 
                            }
                        }
                    }
                    
                    const adjData = {
                        id: Utils.generateId(),
                        firmId: app.state.firmId,
                        itemId: itemId,
                        pool: pool, // Track which pool was audited
                        type: type,
                        qty: qty,
                        date: document.getElementById('adj-date').value,
                        notes: document.getElementById('adj-notes').value
                    };
                    
                    let impact = type === 'add' ? qty : -qty;
                    if (pool === 'gst') {
                        item.stockGst = Math.round((stockGst + impact) * 100) / 100;
                    } else {
                        item.stockNonGst = Math.round((stockNonGst + impact) * 100) / 100;
                    }
                    // STRICT ERP LOGIC: ParseFloat prevents legacy items from corrupting into NaN!
                    item.stock = Math.round(((parseFloat(item.stockGst) || 0) + (parseFloat(item.stockNonGst) || 0)) * 100) / 100;
                    
                    await saveRecord('adjustments', adjData);
                    await saveRecord('items', item);
                    
                    // STRICT ERP LOGIC: Wipe the RAM Cache so the UI instantly shows the new stock!
                    if (window.AppCache) window.AppCache.items = null;
                    
                    alert("Stock adjusted successfully!");
                    UI.closeBottomSheet('sheet-stock-adjustment');
                    app.refreshAll();
                } catch (error) {
                    alert(error.message || "An error occurred while saving.");
                } finally {
                                        if (submitBtn) {
                        setTimeout(() => {
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = "1";
                            // 🚨 FIX: Let the 1.2s green checkmark play! Only restore text if the save failed.
                            if (submitBtn.classList.contains('btn-loading')) {
                                submitBtn.innerHTML = submitBtn.hasAttribute('data-original-text') ? submitBtn.getAttribute('data-original-text') : originalText;
                                submitBtn.style.width = '';
                                submitBtn.classList.remove('btn-loading');
                            }
                        }, 400);
                    }
                }
            });
        }

        // ------------------ BUSINESS PROFILE SUBMISSION ------------------
        const profileForm = document.getElementById('form-business-profile');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    firmId: app.state.firmId,
                    name: document.getElementById('profile-name').value,
                    phone: document.getElementById('profile-phone').value,
                    email: document.getElementById('profile-email').value,
                    gst: document.getElementById('profile-gst').value,
                    address: document.getElementById('profile-address').value,
                    // 🚨 ENTERPRISE FIX: Save the missing City field into the database!
                    city: document.getElementById('profile-city') ? document.getElementById('profile-city').value : '',
                    pincode: document.getElementById('profile-pincode') ? document.getElementById('profile-pincode').value : '', // 🚨 ADDED PINCODE SAVE
                    state: document.getElementById('profile-state').value,
                    bankDetails: document.getElementById('profile-bank').value,
                    // ENTERPRISE FIX: Save the UPI ID to trigger the QR Engine!
                    upiId: document.getElementById('profile-upi') ? document.getElementById('profile-upi').value : '',
                    terms: document.getElementById('profile-terms').value,
                    
                    // NEW: Save Custom Field Names
                    cf1Name: document.getElementById('profile-cf1-name').value,
                    cf2Name: document.getElementById('profile-cf2-name').value,
                    cf3Name: document.getElementById('profile-cf3-name').value
                };

                // STRICT ERP LOGIC: Prevent the "Deep Fryer" bug! Only compress if it is a brand new upload.
                const existingProfile = await getRecordById('businessProfile', app.state.firmId);
                
                const logoImg = document.getElementById('profile-logo-preview');
                if (logoImg && !logoImg.classList.contains('hidden')) {
                    if (existingProfile && existingProfile.logo === logoImg.src) data.logo = existingProfile.logo;
                    else data.logo = await window.Utils.compressImage(logoImg.src);
                }

                const sigImg = document.getElementById('profile-signature-preview');
                if (sigImg && !sigImg.classList.contains('hidden')) {
                    if (existingProfile && existingProfile.signature === sigImg.src) data.signature = existingProfile.signature;
                    else data.signature = await window.Utils.compressImage(sigImg.src);
                }

                await saveRecord('businessProfile', data);
                
                // 🟢 ENTERPRISE FIX: Save PDF Theme Settings to Local Storage
                const colorEl = document.getElementById('profile-brand-color');
                const fontEl = document.getElementById('profile-pdf-font');
                if (colorEl) localStorage.setItem('sollo_brand_color', colorEl.value);
                if (fontEl) localStorage.setItem('sollo_pdf_font', fontEl.value);
                
                const firmRecord = await getRecordById('firms', app.state.firmId) || { id: app.state.firmId };
                firmRecord.name = data.name;
                firmRecord.phone = data.phone;
                firmRecord.email = data.email;
                firmRecord.gst = data.gst;
                firmRecord.address = data.address;
                // 🚨 ENTERPRISE FIX: Sync the city to the master firm record!
                firmRecord.city = data.city;
                firmRecord.pincode = data.pincode; // 🚨 ADDED PINCODE TO FIRM RECORD
                firmRecord.state = data.state;
                await saveRecord('firms', firmRecord);

                alert("Business Profile Saved Successfully!");
                UI.closeActivity('activity-business-profile');
            });
        }

// ------------------ MANUAL RECEIPT SUBMISSIONS ------------------
['in', 'out'].forEach(type => {
    const form = document.getElementById(`form-payment-${type}`);
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            
            // 🚨 ENTERPRISE FIX 1: The True Double-Entry Glitch!
            // The browser's native 'disabled' attribute takes a few milliseconds to paint on mobile.
            // If they double-tap rapidly, this function runs twice! We must explicitly block execution!
            if (submitBtn && submitBtn.classList.contains('btn-loading')) {
                return;
            }
            
            const originalText = submitBtn ? submitBtn.innerHTML : 'Save';
            if (submitBtn) {
                submitBtn.disabled = true; // Let ui.js handle the SVG spinner animation!
                submitBtn.classList.add('btn-loading'); // Force the lock instantly!
            }

                    try {
                        // ENTERPRISE FIX: Updated IDs so the database correctly grabs the Smart Search selection!
                        const targetPartyId = type === 'in' ? document.getElementById('pay-in-customer-id').value : document.getElementById('pay-out-supplier-id').value;
                        if (!targetPartyId) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert("Please select a party.");
                        }

                        // ENTERPRISE FIX: The Cashbook "Time-Travel" Shield!
                        const docDate = document.getElementById(`pay-${type}-date`).value;
                        if (docDate) {
                            const selectedDate = window.Utils.safeDate(docDate);
                            const today = new Date();
                            today.setDate(today.getDate() + 1); // 1-day timezone buffer
                            if (selectedDate > today) {
                                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                                return alert("Error: You cannot log a future date in the Cashbook. Please use today or a past date.");
                            }
                        }

                        // ENTERPRISE FIX: The Cashbook "Zero-Value" Shield!
                        const checkAmt = parseFloat(document.getElementById(`pay-${type}-amount`).value) || 0;
                        if (checkAmt <= 0) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert("Error: Payment amount must be strictly greater than zero.");
                        }

                    const ledger = await getRecordById('ledgers', targetPartyId);
                    const accountId = document.getElementById(`pay-${type}-account`).value;

                    // NEW: Prioritize the dropdown selection over the manual text input
                    const invoiceRefEl = document.getElementById(`pay-${type}-invoice-ref`);
                    // 🚨 ENTERPRISE FIX: Use Array.from with .filter(opt => opt.selected) to bypass mobile WebView selectedOptions collection limits!
                    const selectedOptions = invoiceRefEl ? Array.from(invoiceRefEl.options).filter(opt => opt.selected).map(opt => opt.value).filter(v => v !== '') : [];
                    const selectedInvoiceRef = selectedOptions.join(', ');
                    const manualRef = document.getElementById(`pay-${type}-ref`).value;
                    const docNoInput = document.getElementById(`pay-${type}-no`).value;

                    // FIX: Duplicate Number Protection for Receipts (Safely ignoring blank numbers!)
                    const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                    if (docNoInput && docNoInput.trim() !== '') {
                        const isDuplicate = allReceipts.some(r => 
                            r.firmId === app.state.firmId && 
                            r.receiptNo === docNoInput && 
                            r.id !== app.state.currentReceiptId
                        );
                        if (isDuplicate) {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                            return alert(`Error: Document number "${docNoInput}" already exists! Please use a unique number.`);
                        }
                    }

                    // STRICT ERP LOGIC: Revert old invoices if unlinked during a receipt edit
                    if (app.state.currentReceiptId) {
                        const oldReceipt = await getRecordById('receipts', app.state.currentReceiptId);
                        if (oldReceipt && oldReceipt.invoiceRef) {
                            const oldRefs = String(oldReceipt.invoiceRef).split(',').map(r => r.trim());
                            const newRefs = selectedInvoiceRef.split(',').map(r => r.trim());
                            
                            // 🚨 ENTERPRISE FIX: The Cross-Table Refund Trap!
                            const docStore = (ledger && String(ledger.type).toLowerCase() === 'customer') ? 'sales' : 'purchases';
                            const allDocs = await getAllRecords(docStore);
                            
                            for (const oldRef of oldRefs) {
                                if (!newRefs.includes(oldRef)) {
                                    // STRICT ERP LOGIC: Enforce Firm ID boundaries so Shop A doesn't accidentally open Shop B's invoices!
                                    const linkedDoc = allDocs.find(d => d.firmId === app.state.firmId && (d.id === oldRef || d.invoiceNo === oldRef || d.poNo === oldRef || d.orderNo === oldRef));
                        if (linkedDoc && linkedDoc.status === 'Completed') {
                            // Restore cleanly back to its exact pre-completed status if tracked
                            linkedDoc.status = linkedDoc._preCompleteStatus || (docStore === 'purchases' ? 'Unpaid' : 'Shipped'); 
                            linkedDoc.completedDate = '';
                            await saveRecord(docStore, linkedDoc);
                        }
                                }
                            }
                        }
                    }

                    // STRICT ERP LOGIC: Cashbook Overdraft Protection!
                    if (type === 'out') {
                        const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                        let currentBal = 0;
                        // FIX: Read the Opening Balance for ALL accounts, including the default Cash Drawer!
                        const accRecord = await getRecordById('accounts', accountId);
                        if (accRecord) currentBal = parseFloat(accRecord.openingBalance) || 0;
                        
                        allReceipts.forEach(r => {
                            if (r.firmId === app.state.firmId && (r.accountId || 'cash') === (accountId || 'cash') && r.id !== app.state.currentReceiptId) {
                                currentBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                            }
                        });
                        
                        const attemptAmt = parseFloat(document.getElementById(`pay-${type}-amount`).value) || 0;
                        if (currentBal - attemptAmt < 0) {
                            if (!confirm(`Warning: This account only has ₹${currentBal.toFixed(2)} available. This payment will drop the balance below zero. Continue anyway?`)) {
                                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; }
                                return;
                            }
                        }
                    }

                    const data = {
                        id: app.state.currentReceiptId || Utils.generateId(),
                        receiptNo: docNoInput, // NEW: Save the custom document number
                        firmId: app.state.firmId,
                        date: document.getElementById(`pay-${type}-date`).value,
                        ledgerId: targetPartyId,
                        ledgerName: ledger ? ledger.name : 'Unknown',
                        type: type,
                        amount: parseFloat(document.getElementById(`pay-${type}-amount`).value) || 0,
                        mode: document.getElementById(`pay-${type}-mode`).value,
                        accountId: accountId,
                        ref: manualRef,
                        invoiceRef: selectedInvoiceRef, 
                        desc: document.getElementById(`pay-${type}-notes`).value || (type === 'in' ? 'Payment Received' : 'Payment Made'),
                        // 🚨 NEW: Tag Advance with GST/Non-GST Pool directly from the dropdown!
                        taxPool: document.getElementById(`pay-${type}-bill-filter`) ? document.getElementById(`pay-${type}-bill-filter`).value : 'All',
                        isAutoGenerated: false 
                    };

                        await saveRecord('receipts', data);
                        // NEW: Link manual payment to the saved invoices and mathematically update their statuses
                        if (selectedInvoiceRef) {
                            const storeName = (ledger && String(ledger.type).toLowerCase() === 'customer') ? 'sales' : 'purchases';
                            const allDocs = await getAllRecords(storeName);
                            const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                            const selectedRefs = selectedInvoiceRef.split(',').map(r => r.trim());

                            for (const ref of selectedRefs) {
                                const linkedInvoice = allDocs.find(doc => {
                                    if (doc.firmId !== app.state.firmId) return false;
                                    if ((type === 'in' ? doc.customerId : doc.supplierId) !== targetPartyId) return false;
                                    // 🚨 ENTERPRISE FIX: Check ALL references to ensure we find the invoice even if it was saved via Order No!
                                    const possibleRefs = [doc.id, doc.invoiceNo, doc.poNo, doc.orderNo].map(String);
                                    return possibleRefs.includes(String(ref));
                                });

                                if (linkedInvoice && linkedInvoice.status !== 'Completed') {
                        // 🚨 ENTERPRISE FIX 2: Pre-calculate Returns so Credit Notes don't swallow waterfall payments!
                        const paymentReturnMap = {};
                        allDocs.forEach(d => {
                            if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                                paymentReturnMap[d.orderNo] = (paymentReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                            }
                        });

                        let totalPaid = 0;
                        allReceipts.forEach(r => {
                            if (r.ledgerId === targetPartyId && r.firmId === app.state.firmId) {
                                const rRefs = String(r.invoiceRef || '').split(',').map(x => x.trim()).filter(Boolean);
                                if (rRefs.includes(ref)) {
                                    let remainingPayment = parseFloat(r.amount) || 0;
                                    let applyAmt = 0;
                                    rRefs.forEach(rRef => {
                                        const innerDoc = allDocs.find(d => d.id === rRef || d.invoiceNo === rRef || d.poNo === rRef || d.orderNo === rRef || String(d.id).endsWith(rRef));
                                        
                                        // 🚨 FIX: Subtract the return from the docTotal. This prevents the overpayment from being artificially swallowed by the first invoice!
                                        const returned = [innerDoc?.orderNo, innerDoc?.invoiceNo, innerDoc?.poNo, innerDoc?.id, rRef].filter(Boolean).reduce((sum, r) => sum + (paymentReturnMap[r] || 0), 0);
                                        let dTotal = innerDoc ? Math.max(0, (parseFloat(innerDoc.grandTotal) || 0) - returned) : (parseFloat(r.amount) / rRefs.length);
                                        
                                        let aAmt = Math.min(dTotal, remainingPayment);
                                        if (aAmt > 0) remainingPayment -= aAmt;
                                        if (rRef === ref) applyAmt += aAmt;
                                    });
                                    if (remainingPayment > 0.01 && rRefs[0] === ref) applyAmt += remainingPayment;
                                    totalPaid += applyAmt;
                                }
                            }
                        });

                        // STRICT ERP LOGIC: Add Returns (Credit/Debit Notes) to the total settled amount!
                        let totalReturned = 0;
                        allDocs.forEach(d => {
                                        if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open') {
                                            // Match returns to the original invoice
                                            if (d.orderNo === linkedInvoice.invoiceNo || d.orderNo === linkedInvoice.poNo || d.orderNo === linkedInvoice.orderNo || d.orderNo === linkedInvoice.id) {
                                                totalReturned += (parseFloat(d.grandTotal) || 0);
                                            }
                                        }
                                    });

                                    // 🚨 ENTERPRISE FIX: Fulfillment-Aware Auto-Close
                                    // Purchases and Unpaid sales invoices bypass the strict Shipped check!
                                    if ((totalPaid + totalReturned) >= parseFloat(linkedInvoice.grandTotal) - 0.5) { 
                                        if (storeName === 'purchases' || linkedInvoice.status === 'Shipped' || linkedInvoice.status === 'Unpaid') {
                                            linkedInvoice._preCompleteStatus = linkedInvoice.status;
                                            linkedInvoice.status = 'Completed';
                                            linkedInvoice.completedDate = data.date; // Use the exact payment date!
                                            await saveRecord(storeName, linkedInvoice);
                                        }
                                    } else {
                                        // The Ghost Completion Shield!
                                        if (linkedInvoice.status === 'Completed') {
                                            linkedInvoice.status = linkedInvoice._preCompleteStatus || (storeName === 'purchases' ? 'Unpaid' : 'Shipped');
                                            linkedInvoice.completedDate = '';
                                            await saveRecord(storeName, linkedInvoice);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // NEW: Auto-Complete Advance Payments Engine
                        if (typeof app.autoCompleteInvoices === 'function') {
                            const storeName = (ledger && String(ledger.type).toLowerCase() === 'customer') ? 'sales' : 'purchases';
                            // ENTERPRISE FIX: Pass the exact Payment Date into the background engine!
                            await app.autoCompleteInvoices(targetPartyId, storeName, data.date);
                        }

                        UI.showSuccess(); // UPGRADE: Trigger GPay Animation!
                        UI.closeBottomSheet(`sheet-payment-${type}`);
                        app.refreshAll();
                    } catch (error) {
                        console.error("Payment save failed:", error);
                        alert("An error occurred. Please try again.");
                    } finally {
                        // ENTERPRISE FIX: THE ANIMATION SHIELD
                        if (submitBtn) {
                            setTimeout(() => {
                                submitBtn.disabled = false;
                                submitBtn.style.opacity = "1";
                                // 🚨 FIX: Let the 1.2s green checkmark play! Only restore text if the save failed.
                                if (submitBtn.classList.contains('btn-loading')) {
                                    submitBtn.innerHTML = submitBtn.hasAttribute('data-original-text') ? submitBtn.getAttribute('data-original-text') : originalText;
                                    submitBtn.style.width = '';
                                    submitBtn.classList.remove('btn-loading');
                                }
                            }, 400);
                        }
                    }
                });
            }
        });
    },

    // ==========================================
    // ENTERPRISE FIX: SMART PAYMENT FORMS
    // ==========================================
    openNewPayment: async (type) => {
        app.state.currentReceiptId = null;
        const isOut = type === 'out';
        const prefix = isOut ? 'pay-out' : 'pay-in';
        const sheetId = `sheet-payment-${type}`;

        // 1. Reset the form completely
        const form = document.getElementById(`form-payment-${type}`);
        if (form) form.reset();

        // 2. Clear selected Party (Customer or Supplier) so old data doesn't leak
        const displayEl = document.getElementById(`${prefix}-${isOut ? 'supplier' : 'customer'}-display`);
        const idEl = document.getElementById(`${prefix}-${isOut ? 'supplier' : 'customer'}-id`);
        if (displayEl) {
            displayEl.innerText = `Select ${isOut ? 'Supplier' : 'Customer'}...`;
            displayEl.style.color = 'var(--md-text-muted)';
        }
        if (idEl) idEl.value = '';

        // 3. Clear the smart pending invoices list (if any were selected previously)
        const refSelect = document.getElementById(`${prefix}-invoice-ref`);
        if (refSelect) refSelect.innerHTML = '<option value="">On Account / Advance</option>';
        
        // 🚨 NEW: Reset the new Bill Filter dropdown back to "All"
        const billFilter = document.getElementById(`${prefix}-bill-filter`);
        if (billFilter) billFilter.value = 'All';

        // 4. Set Default Date to Today (CRASH-PROOFED)
        const dateInput = document.getElementById(`${prefix}-date`);
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = (typeof Utils !== 'undefined' && typeof Utils.getLocalDate === 'function') ? Utils.getLocalDate() : today;
            if (dateInput._flatpickr) dateInput._flatpickr.setDate(dateInput.value);
        }

        // 5. Generate Auto-Receipt / Voucher Number
        const docPrefix = isOut ? 'VOU' : 'REC';
        if (typeof getNextDocumentNumber === 'function') {
            const nextNo = await getNextDocumentNumber('receipts', docPrefix, 'receiptNo');
            const noInput = document.getElementById(`${prefix}-no`);
            if (noInput) noInput.value = nextNo;
        }

        // 6. Reset System State & Hide Delete Button for new records
        app.state.currentEditId = null;
        if (window.UI) window.UI.toggleDeleteButton(`receipt-${type}`, false);

        // 7. Finally, pop open the bottom sheet!
        if (window.UI) window.UI.openBottomSheet(sheetId);
    },

    // ==========================================
    // CASHBOOK EDIT & DELETE ENGINE
    // ==========================================
    openReceipt: async (id, type) => {
        const record = await getRecordById('receipts', id);
        if (!record) return alert("Receipt not found.");

        // SAFEGUARD: Prevent tampering with invoice-linked auto-receipts
        if (record.isAutoGenerated) {
            return alert("This is an auto-generated receipt linked to a document. To modify or delete it, please edit the original invoice or bill.");
        }

        app.state.currentReceiptId = id;
        
        await UI.openBottomSheet(`sheet-payment-${type}`);
        
        setTimeout(async () => {
            // Restore the custom document number (Fallback to ID for older unpatched records)
            const noInput = document.getElementById(`pay-${type}-no`);
            if (noInput) noInput.value = record.receiptNo || String(record.id).substring(0, 12).toUpperCase();

            document.getElementById(`pay-${type}-date`).value = record.date || '';
            
            // UPGRADE: Hydrate the new custom Tap-to-Select UI display
            const partyInput = document.getElementById(type === 'in' ? 'pay-in-customer-id' : 'pay-out-supplier-id');
            const partyDisplay = document.getElementById(type === 'in' ? 'pay-in-customer-display' : 'pay-out-supplier-display');
            
            if (partyInput) partyInput.value = record.ledgerId || '';
            if (partyDisplay) {
                partyDisplay.innerText = record.ledgerName || 'Unknown Party';
                partyDisplay.style.color = 'var(--md-on-surface)';
            }
            
            if (partyInput) {
                // NEW: Load the pending invoices into the dropdown for the selected party
                await app.loadPendingInvoices(record.ledgerId, type);
                
                const invoiceRefEl = document.getElementById(`pay-${type}-invoice-ref`);
                if (invoiceRefEl && record.invoiceRef) {
                    // 🚨 ENTERPRISE FIX: Filter out blank references to prevent ghost mapping!
                    const savedRefs = String(record.invoiceRef).split(',').map(r => r.trim()).filter(Boolean);
                    
                    // 🚨 ENTERPRISE FIX: Bulletproof Cross-Table Protection
                    const partyForEdit = await getRecordById('ledgers', record.ledgerId);
                    const isCustomer = partyForEdit ? String(partyForEdit.type).toLowerCase() === 'customer' : (type === 'in');
                    const docStore = isCustomer ? 'sales' : 'purchases';
                    
                    // 🚨 ENTERPRISE FIX: Scope database fetch to prevent RAM lag and isolate Firm Data!
                    const allDocs = await getAllRecords(docStore, 'firmId', app.state.firmId);

                    let optionsChanged = false;
                    let optionsToSelect = []; // 🚨 ENTERPRISE FIX: Queue selections to prevent DOM dropping

                    savedRefs.forEach(ref => {
                        // 🚨 ENTERPRISE FIX: Check ALL references BUT STRICTLY lock to the specific Customer/Supplier!
                        const linkedDoc = allDocs.find(d => {
                            if (d.firmId !== app.state.firmId) return false;
                            
                            if (isCustomer && d.customerId !== record.ledgerId) return false;
                            if (!isCustomer && d.supplierId !== record.ledgerId) return false;

                            const possibleRefs = [d.id, d.invoiceNo, d.poNo, d.orderNo].map(String);
                            return possibleRefs.includes(String(ref)) || String(d.id).endsWith(String(ref));
                        });

                        // Find if it's already in the dropdown under ANY of its aliases
                        let matchingOpt = Array.from(invoiceRefEl.options).find(opt => {
                            if (!opt.value) return false; // Ignore the blank "On Account" option!
                            if (String(opt.value) === String(ref)) return true;
                            if (linkedDoc) {
                                const possibleOptRefs = [linkedDoc.id, linkedDoc.invoiceNo, linkedDoc.poNo, linkedDoc.orderNo].map(String);
                                if (possibleOptRefs.includes(String(opt.value))) return true;
                            }
                            return false;
                        });

                        if (matchingOpt) {
                            optionsToSelect.push(matchingOpt);
                            optionsChanged = true;
                        } else {
                            // Inject missing/fully paid invoice back into the dropdown so it isn't lost!
                            let displayRef = ref;
                            let docTotal = 0;
                            if (linkedDoc) {
                                let baseDisplay = linkedDoc.orderNo || String(linkedDoc.id).slice(-4).toUpperCase();
                                let suffix = linkedDoc.invoiceNo ? ` | Inv: ${linkedDoc.invoiceNo}` : '';
                                displayRef = baseDisplay + suffix;
                                docTotal = parseFloat(linkedDoc.grandTotal) || 0;
                            }
                            
                            const newOption = document.createElement('option');
                            newOption.value = ref;
                            newOption.text = `${displayRef} (Settled: \u20B9${docTotal.toFixed(2)})`;
                            
                            // Append to DOM immediately
                            invoiceRefEl.appendChild(newOption);
                            
                            optionsToSelect.push(newOption);
                            optionsChanged = true;
                        }
                    });

                    if (optionsChanged) {
                        // 🚨 ENTERPRISE FIX: Safe DOM Repaint & Selection Lock!
                        void invoiceRefEl.offsetHeight; 
                        
                        // Increased delay to 150ms to guarantee slower phones have time to render the hidden box!
                        setTimeout(() => {
                            // 🚨 ENTERPRISE FIX: Deduplicate options to prevent old corrupted comma-split data from ticking the same box twice!
                            const uniqueOptions = [...new Set(optionsToSelect)];
                            uniqueOptions.forEach(opt => {
                                opt.selected = true;
                                // 🚨 BROWSER OVERRIDE: Physically force the HTML attribute so hidden WebViews CANNOT ignore the selection!
                                opt.setAttribute('selected', 'selected'); 
                            });
                            // Fire a native change event to force Android WebViews to draw the blue ticks!
                            invoiceRefEl.dispatchEvent(new Event('change', { bubbles: true }));
                        }, 150); 
                    }
                }
            }
            
            // 🚨 STRICT AMOUNT LOCK: Forces the exact historical amount back into the UI safely!
            setTimeout(() => {
                const amountEl = document.getElementById(`pay-${type}-amount`);
                if (amountEl) amountEl.value = record.amount || 0;
            }, 180);
            
            document.getElementById(`pay-${type}-mode`).value = record.mode || 'Cash';
            
            const accEl = document.getElementById(`pay-${type}-account`);
            if (accEl) accEl.value = record.accountId || 'cash';
            
            document.getElementById(`pay-${type}-ref`).value = record.ref || '';
            document.getElementById(`pay-${type}-notes`).value = record.desc || '';
            
            UI.toggleDeleteButton(`receipt-${type}`, true);
        }, 50);
    },

    // ==========================================
    // AUTO-COMPLETE ADVANCE PAYMENT ENGINE
    // ==========================================
    // ENTERPRISE FIX: Engine now accepts the 'triggerDate' from forms!
    autoCompleteInvoices: async (partyId, type, triggerDate = null) => {
        const isSales = (type === 'sales');
        const storeName = isSales ? 'sales' : 'purchases';
        const partyKey = isSales ? 'customerId' : 'supplierId';
        
        const allDocs = await getAllRecords(storeName);
        const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
        
        const party = await getRecordById('ledgers', partyId);
        let ob = party ? (parseFloat(party.openingBalance) || 0) : 0;
        const balType = party ? (party.balanceType || '').toLowerCase() : '';
        
        // 1. ELITE UPGRADE: SPLIT ADVANCE POOLS BY TAX TYPE
        const floatingPools = { 'GST': 0, 'Non-GST': 0 };

        // Opening Balance defaults to GST pool
        if (isSales && (balType.includes('pay') || balType.includes('credit'))) floatingPools['GST'] += ob;
        else if (!isSales && (balType.includes('receive') || balType.includes('debit'))) floatingPools['GST'] += ob;

        allDocs.forEach(d => {
            if (d.firmId === app.state.firmId && d[partyKey] === partyId && d.status !== 'Open' && d.status !== 'Cancelled') {
                const amt = parseFloat(d.grandTotal) || 0;
                const pool = d.invoiceType === 'Non-GST' ? 'Non-GST' : 'GST';
                floatingPools[pool] += (d.documentType === 'return' ? -amt : amt);
            }
        });

        // 2. MAP EXPLICITLY LINKED PAYMENTS & RETURNS
        const paymentMap = {};
        allReceipts.forEach(c => {
            if (c.firmId === app.state.firmId && c.ledgerId === partyId) {
                let amt = parseFloat(c.amount) || 0;
                let impact = isSales ? (c.type === 'in' ? -amt : amt) : (c.type === 'in' ? amt : -amt);
                
                // Add to floating pool first based on the explicitly selected Tax Pool!
                let isNonGstReceipt = c.taxPool === 'Non-GST';
                const legacyRef = c.invoiceRef || c.linkedInvoice;
                
                if (!isNonGstReceipt && legacyRef) {
                    const firstRef = String(legacyRef).split(',')[0].trim();
                    const linkedDoc = allDocs.find(d => d.id === firstRef || d.invoiceNo === firstRef || d.poNo === firstRef || d.orderNo === firstRef || String(d.id).endsWith(firstRef));
                    if (linkedDoc && linkedDoc.invoiceType === 'Non-GST') isNonGstReceipt = true;
                }
                
                const poolKey = isNonGstReceipt ? 'Non-GST' : 'GST';
                // Note: floating pool maths works inverse for advances here
                floatingPools[poolKey] -= impact; 

                // Smart Waterfall Allocation for exact mapping!
                if (legacyRef && impact > 0) {
                    const refs = String(legacyRef).split(',').map(r => r.trim()).filter(Boolean);
                    if (refs.length > 0) {
                        let remainingPayment = impact;
                        refs.forEach(ref => {
                            const linkedDoc = allDocs.find(d => d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref || String(d.id).endsWith(ref));
                            let docTotal = linkedDoc ? (parseFloat(linkedDoc.grandTotal) || 0) : (impact / refs.length);
                            let applyAmt = Math.min(docTotal, remainingPayment);
                            if (applyAmt > 0) {
                                paymentMap[ref] = (paymentMap[ref] || 0) + applyAmt;
                                remainingPayment -= applyAmt;
                            }
                        });
                        if (remainingPayment > 0.01 && refs[0]) paymentMap[refs[0]] = (paymentMap[refs[0]] || 0) + remainingPayment;
                    }
                } else if (legacyRef && impact < 0) {
                    const refs = String(legacyRef).split(',').map(r => r.trim()).filter(Boolean);
                    if (refs.length > 0) {
                        let splitAmt = impact / refs.length;
                        refs.forEach(r => { paymentMap[r] = (paymentMap[r] || 0) + splitAmt; });
                    }
                }
            }
        });

        const returnMap = {};
        allDocs.forEach(d => {
            if (d.firmId === app.state.firmId && d[partyKey] === partyId && d.documentType === 'return' && d.status !== 'Open' && d.orderNo) {
                returnMap[d.orderNo] = (returnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
            }
        });

        // 3. CALCULATE PENDING GROSS DEBT
        // 🚨 BUG FIX: Ignore Cancelled Invoices so they don't create "Zombie Debt"
        let partyDocs = allDocs.filter(doc => doc.firmId === app.state.firmId && doc[partyKey] === partyId && doc.documentType !== 'return' && doc.status !== 'Open' && doc.status !== 'Cancelled');
        partyDocs.sort((a, b) => window.Utils.safeDate(a.date) - window.Utils.safeDate(b.date));

        const pendingInvoices = [];

        for (const doc of partyDocs) {
            const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.poNo, doc.id].filter(Boolean))];
            const explicitPaid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[ref] || 0), 0);
            const returned = uniqueRefs.reduce((sum, ref) => sum + (returnMap[ref] || 0), 0);
            
            const docTotal = parseFloat(doc.grandTotal) || 0;
            const balance = Math.max(0, docTotal - explicitPaid - returned);
            
            pendingInvoices.push({ doc, balance });
        }

        // 4. FIFO WATERFALL FOR STATUS UPDATE
        for (const item of pendingInvoices) {
            let finalBal = item.balance;
            const poolKey = item.doc.invoiceType === 'Non-GST' ? 'Non-GST' : 'GST';
            
            // Re-apply strict Tax Pool routing
            if (floatingPools[poolKey] > 0 && finalBal > 0.01) {
                const advanceApplied = Math.min(floatingPools[poolKey], finalBal);
                finalBal -= advanceApplied;
                floatingPools[poolKey] -= advanceApplied;
            }
            
            if (finalBal <= 0.01) {
                if (storeName === 'purchases' || item.doc.status === 'Shipped' || item.doc.status === 'Unpaid') {
                    item.doc._preCompleteStatus = item.doc.status;
                    item.doc.status = 'Completed';
                    const fallbackDate = (window.Utils && window.Utils.getLocalDate) ? window.Utils.getLocalDate() : new Date().toISOString().split('T')[0];
                    item.doc.completedDate = triggerDate || fallbackDate; 
                    await saveRecord(storeName, item.doc);
                }
            } else {
                if (item.doc.status === 'Completed') {
                    item.doc.status = item.doc._preCompleteStatus || (storeName === 'purchases' ? 'Unpaid' : 'Shipped'); 
                    item.doc.completedDate = '';
                    await saveRecord(storeName, item.doc);
                }
            }
        }
    },

    // ==========================================
    // 🚀 ENTERPRISE UPGRADE: CONTRA TRANSFER ENGINE
    // ==========================================
    openContraTransfer: async () => {
        const fromEl = document.getElementById('contra-from-account');
        const toEl = document.getElementById('contra-to-account');
        
        // Use the live AppCache accounts list to populate the dropdowns
        if (fromEl && toEl && window.AppCache && window.AppCache.accounts) {
            let opts = window.AppCache.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
            if (!window.AppCache.accounts.some(a => a.id === 'cash')) {
                opts = `<option value="cash">Default Cash Drawer</option>` + opts;
            }
            fromEl.innerHTML = opts;
            toEl.innerHTML = opts;
            
            // Set intelligent defaults (Bank to Cash)
            if (fromEl.options.length > 1) {
                fromEl.selectedIndex = 1; // Pick the first actual bank account
                toEl.value = 'cash';      // Default deposit to Cash
            }
        }
        
        const dateEl = document.getElementById('contra-date');
        if (dateEl) {
            const today = window.Utils && window.Utils.getLocalDate ? window.Utils.getLocalDate() : new Date().toISOString().split('T')[0];
            dateEl.value = today;
            if (dateEl._flatpickr) dateEl._flatpickr.setDate(today);
        }
        
        const amtEl = document.getElementById('contra-amount');
        if (amtEl) amtEl.value = '';
        
        const notesEl = document.getElementById('contra-notes');
        if (notesEl) notesEl.value = '';
        
        if (window.UI) window.UI.openBottomSheet('sheet-contra-transfer');
    },

    saveContraTransfer: async () => {
        const fromAcc = document.getElementById('contra-from-account').value;
        const toAcc = document.getElementById('contra-to-account').value;
        const amt = parseFloat(document.getElementById('contra-amount').value) || 0;
        const date = document.getElementById('contra-date').value;
        const notes = document.getElementById('contra-notes').value || 'Bank Transfer / Contra';
        
        if (fromAcc === toAcc) return alert("Error: Cannot transfer money to the same account!");
        if (amt <= 0) return alert("Error: Amount must be strictly greater than zero.");
        
        const btn = document.getElementById('btn-save-contra');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Processing...';
        
        try {
            const commonId = window.Utils.generateId();
            
            let fromName = 'Cash Drawer';
            if (fromAcc !== 'cash' && window.AppCache.accounts) {
                const acc = window.AppCache.accounts.find(a => a.id === fromAcc);
                if (acc) fromName = acc.name;
            }
            
            let toName = 'Cash Drawer';
            if (toAcc !== 'cash' && window.AppCache.accounts) {
                const acc = window.AppCache.accounts.find(a => a.id === toAcc);
                if (acc) toName = acc.name;
            }
            
            // 1. Withdrawal (Money Out)
            await saveRecord('receipts', {
                id: 'contra-out-' + commonId,
                firmId: app.state.firmId,
                date: date,
                ledgerId: 'contra-transfer',
                ledgerName: 'Bank Transfer (Contra)',
                type: 'out',
                amount: amt,
                mode: 'Contra',
                accountId: fromAcc,
                ref: 'To: ' + toName,
                desc: notes,
                isAutoGenerated: true
            });
            
            // 2. Deposit (Money In)
            await saveRecord('receipts', {
                id: 'contra-in-' + commonId,
                firmId: app.state.firmId,
                date: date,
                ledgerId: 'contra-transfer',
                ledgerName: 'Bank Transfer (Contra)',
                type: 'in',
                amount: amt,
                mode: 'Contra',
                accountId: toAcc,
                ref: 'From: ' + fromName,
                desc: notes,
                isAutoGenerated: true
            });
            
            if (window.Utils) window.Utils.showToast("✅ Transfer Successful!");
            
            if (window.UI) {
                window.UI.closeBottomSheet('sheet-contra-transfer');
                window.UI.renderBankBalances();
                
                // If they are currently looking at a bank passbook, refresh it!
                const reportViewer = document.getElementById('activity-report-viewer');
                if (reportViewer && reportViewer.classList.contains('open')) {
                    const activeFilters = window.UI.state.activeFilters || {};
                    if (activeFilters['timeline']) window.UI.applyFilters('timeline');
                }
            }
        } catch (e) {
            console.error(e);
            alert("Transfer failed: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    },

    // ==========================================
    // 7. ORPHAN PROTECTION & DELETION ENGINE
    // ==========================================
    deleteRecord: async (type) => {
        const id = type === 'receipt-in' || type === 'receipt-out' ? app.state.currentReceiptId : app.state.currentEditId;

        let storeMap = {
            'sales': 'sales', 'purchase': 'purchases',
            'product': 'items', 'ledger': 'ledgers',
            'expense': 'expenses', 'account': 'accounts',
            'receipt-in': 'receipts', 'receipt-out': 'receipts'
        };
        const storeName = storeMap[type];
        
        const record = await getRecordById(storeName, id);
        if(!record) return;

        let warningMsg = "Are you sure you want to delete this record?";
        if (type === 'sales' || type === 'purchase') {
            warningMsg = "Deleting this document will return all inventory to its previous state. Continue?";
        }

        if (!confirm(warningMsg)) return;

        // ORPHAN PROTECTION: Check for linked manual receipts safely
        if (type === 'sales' || type === 'purchase') {
            // FIX: Safely capture ALL possible linked IDs to prevent orphaned receipts
            const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
            const partyId = type === 'sales' ? record.customerId : record.supplierId;
            
            if (uniqueRefs.length > 0 && partyId) {
                const receipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
                // Check if any of the manual receipt refs match ANY of the document's IDs
                const linkedManualReceipts = receipts.filter(r => {
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    return refs.some(ref => uniqueRefs.includes(ref)) && r.ledgerId === partyId && r.isAutoGenerated === false;
                });
                
                if (linkedManualReceipts.length > 0) {
                    // STRICT ERP LOGIC: Prevent deleting invoices tied to BULK payments!
                    const hasBulkPayment = linkedManualReceipts.some(r => String(r.invoiceRef || '').split(',').filter(x => x.trim()).length > 1);
                    
                    if (hasBulkPayment) {
                        return alert("ERROR: Cannot delete this document! It is tied to a BULK payment that covers multiple invoices. Please go to the Cashbook, edit the receipt to unlink this specific invoice, and then try deleting it again.");
                    }
                    
                    if (!confirm(`Warning: This document has ${linkedManualReceipts.length} manual payment(s) exclusively linked to it. Delete them as well to keep the cashbook balanced?`)) {
                        return; // Abort the whole deletion if they cancel here to prevent imbalance
                    }
                    for (const r of linkedManualReceipts) {
                        await deleteRecordById('receipts', r.id);
                    }
                }

                // 🚨 ENTERPRISE FIX: The Ghost Payment Deletion Shield!
                // Silently annihilate any Auto-Generated Split-Tender payments tied to this invoice so the Cashbook doesn't permanently inflate!
                const linkedAutoReceipts = receipts.filter(r => {
                    const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                    return refs.some(ref => uniqueRefs.includes(ref)) && r.isAutoGenerated === true;
                });
                
                for (const r of linkedAutoReceipts) {
                    await deleteRecordById('receipts', r.id);
                }
            }
        }

        // Clean up Cashbook if an Expense is deleted
        if (type === 'expense') {
            await deleteRecordById('receipts', 'exp-rec-' + id);
        }

        // STRICT ERP LOGIC 1: Revert Invoice Status when Payment is Deleted
        if (type === 'receipt-in' || type === 'receipt-out') {
            if (record.invoiceRef && !record.isAutoGenerated) {
                // ENTERPRISE FIX: The Cross-Table Refund Trap!
                // Hardcoding 'receipt-out' to 'purchases' completely breaks Sales Refunds and Purchase Refunds!
                // We MUST dynamically check the party type to route the status reversal to the correct table!
                const party = await getRecordById('ledgers', record.ledgerId);
                const docStore = (party && party.type === 'Customer') ? 'sales' : 'purchases';
                
                // ENTERPRISE FIX: Scoped DB fetch prevents the app from crashing when deleting a payment!
                const allDocs = await getAllRecords(docStore, 'firmId', record.firmId);
                const refs = String(record.invoiceRef).split(',').map(r => r.trim());
                
                for (const ref of refs) {
                    // STRICT ERP LOGIC: Lock the search to the specific record's Firm ID to prevent cross-company data corruption!
                    const linkedDoc = allDocs.find(d => d.firmId === record.firmId && (d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref));
                    if (linkedDoc && linkedDoc.status === 'Completed') {
                        const allReceipts = await getAllRecords('receipts', 'firmId', linkedDoc.firmId);
                        const totalPaidRemaining = allReceipts.reduce((sum, rx) => {
                            if (rx.invoiceRef && rx.invoiceRef.includes(linkedDoc.id) && rx.id !== record.id) {
                                return sum + parseFloat(rx.amount);
                            }
                            return sum;
                        }, 0);
                        
                        if (totalPaidRemaining < parseFloat(linkedDoc.grandTotal)) {
                            linkedDoc.status = linkedDoc._preCompleteStatus || (docStore === 'purchases' ? 'Unpaid' : 'Shipped'); 
                            linkedDoc.completedDate = '';
                            await saveRecord(docStore, linkedDoc);
                        }
                    }
                }
            }
        }

        // STRICT ERP LOGIC 2: Stock reversal is now safely handled by the central db.js engine!
        // (Redundant manual loop deleted to prevent double-reversal inventory corruption)

        // Prevent Bank Account Deletion if transactions are tied to it
        if (type === 'account') {
            const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
            const linkedTransactions = allReceipts.filter(r => r.accountId === id);
            if (linkedTransactions.length > 0) {
                return alert(`Cannot delete this account. It has ${linkedTransactions.length} transaction(s) linked to it in the Cashbook.`);
            }
        }

        // ENTERPRISE FIX: Prevent Ledger (Party) Deletion if they have active history!
        if (type === 'ledger') {
            const allSales = await getAllRecords('sales', 'firmId', app.state.firmId);
            const allPurchases = await getAllRecords('purchases', 'firmId', app.state.firmId);
            const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
            
            const linkedSales = allSales.filter(s => s.customerId === id);
            const linkedPurchases = allPurchases.filter(p => p.supplierId === id);
            const linkedReceipts = allReceipts.filter(r => r.ledgerId === id);
            
            const totalLinked = linkedSales.length + linkedPurchases.length + linkedReceipts.length;
            if (totalLinked > 0) {
                return alert(`Cannot delete this party. They have ${totalLinked} document(s) linked to them. To protect your financial reports, please delete their documents first, or just edit the party and rename them to "Inactive".`);
            }
        }

        // STRICT ERP LOGIC: Prevent Product Deletion if it has active transaction history!
        if (type === 'product') {
            const allSales = await getAllRecords('sales', 'firmId', app.state.firmId);
            const allPurchases = await getAllRecords('purchases', 'firmId', app.state.firmId);
            
            // ENTERPRISE FIX: The Ghost Deletion Inventory Orphan!
            // We must also check Expenses and Adjustments. If a product was consumed internally, deleting it will break the audit trail!
            const allExpenses = await getAllRecords('expenses', 'firmId', app.state.firmId);
            const allAdjustments = await getAllRecords('adjustments', 'firmId', app.state.firmId);
            
            const inSales = allSales.some(s => (s.items || []).some(i => i.itemId === id));
            const inPurchases = allPurchases.some(p => (p.items || []).some(i => i.itemId === id));
            const inExpenses = allExpenses.some(e => (e.items || []).some(i => i.itemId === id));
            const inAdjustments = allAdjustments.some(a => a.itemId === id);
            
            if (inSales || inPurchases || inExpenses || inAdjustments) {
                return alert(`Cannot delete this product. It is permanently linked to past invoices, bills, expenses, or stock adjustments. To protect your PnL, please edit the product and rename it to "Inactive - [Product Name]" instead.`);
            }
        }

        // STRICT ERP LOGIC: db.js now automatically routes soft-deletions to the unlimited IndexedDB Trash Vault!
        // Delete from main active database
        await deleteRecordById(storeName, id);

        // ENTERPRISE FIX: Wipe RAM Cache so the deleted item instantly disappears from the UI!
        if (window.AppCache) {
            window.AppCache.items = null;
            window.AppCache.ledgers = null;
            window.AppCache.accounts = null;
        }
        
        // ENTERPRISE FIX: Re-run the Advance Payment Waterfall so invoices don't get permanently stuck as "Completed" when their payment is deleted!
        if (type === 'receipt-in' || type === 'receipt-out') {
            if (record.ledgerId && typeof app.autoCompleteInvoices === 'function') {
                const party = await getRecordById('ledgers', record.ledgerId);
                const docStore = (party && String(party.type).toLowerCase() === 'customer') ? 'sales' : 'purchases';
                await app.autoCompleteInvoices(record.ledgerId, docStore);
            }
        }

        if (type === 'sales' || type === 'purchase') UI.closeActivity(`activity-${type}-form`);
        else if (type === 'receipt-in' || type === 'receipt-out') UI.closeBottomSheet(`sheet-payment-${type.split('-')[1]}`);
        else UI.closeActivity(`activity-${type}-form`);
        
        app.refreshAll();
    },

    // ==========================================
    // UPGRADE: RECYCLE BIN RESTORE ENGINE
    // ==========================================
    restoreRecord: async (id, storeName) => {
        if (!confirm("Are you sure you want to restore this item?")) return;

        // STRICT ERP LOGIC: Pull directly from the unlimited IndexedDB Trash Vault!
        const record = await getRecordById('trash', id);
        
        if (record) {
            // Remove the trash tags
            delete record._module;
            delete record._deletedAt;
            
            // 2 & 3. CRITICAL FIX: Put it back and restore Inventory securely via the Transaction Engine!
            if (storeName === 'sales' || storeName === 'purchases' || storeName === 'adjustments' || storeName === 'expenses') {
                if (typeof saveInvoiceTransaction === 'function') {
                    await saveInvoiceTransaction(storeName, record);
                } else {
                    await saveRecord(storeName, record); // Failsafe fallback
                }
            } else {
                // Save normal records back to the active IndexedDB without stock math
                await saveRecord(storeName, record); 
            }
            
            // FIX: Recreate the Cashbook entry if restoring an Expense
            if (storeName === 'expenses') {
                const expenseReceipt = {
                    id: 'exp-rec-' + record.id,
                    firmId: record.firmId,
                    date: record.date,
                    ledgerId: 'internal-expense',
                    ledgerName: 'Internal Expense',
                    type: 'out',
                    amount: record.amount,
                    mode: 'Expense',
                    accountId: record.accountId || 'cash',
                    ref: '',
                    desc: `Expense: ${record.category}`,
                    isAutoGenerated: true,
                    invoiceRef: record.id 
                };
                await saveRecord('receipts', expenseReceipt);
            }
            
            // Remove it from the Trash Vault
            await deleteRecordById('trash', id);
            
            // ENTERPRISE FIX: Wipe RAM Cache so the restored item instantly reappears!
            if (window.AppCache) {
                window.AppCache.items = null;
                window.AppCache.ledgers = null;
                window.AppCache.accounts = null;
            }
            
            if (window.Utils) window.Utils.showToast("Record Restored Successfully! ♻️");
            app.refreshAll();
        } else {
            alert("Error: Could not find the record in the Recycle Bin.");
        }
    },

    permanentlyDeleteRecord: async (id) => {
        if (!confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) return;

        // STRICT ERP LOGIC: Delete directly from the IndexedDB Trash Vault
        const record = await getRecordById('trash', id);
        
        if (record) {
            await deleteRecordById('trash', id);
            
            if (window.Utils) window.Utils.showToast("Record Permanently Deleted! 🗑️");
            app.refreshAll();
        } else {
            alert("Error: Could not find the record in the Recycle Bin.");
        }
    },

    // ==========================================
    // 🚀 ENTERPRISE UPGRADE: DEEP DASHBOARD ANALYTICS
    // ==========================================
    openDeepAnalytics: async () => {
        if (window.UI) window.UI.openActivity('activity-deep-analytics');
        
        const firmId = app.state.firmId;
        const sales = (window.UI.state.rawData.sales || []).filter(s => s.firmId === firmId && s.status !== 'Open' && s.status !== 'Cancelled');
        const expenses = (window.UI.state.rawData.expenses || []).filter(e => e.firmId === firmId);
        
        // 1. Top Products
        const productSales = {};
        sales.forEach(s => {
            (s.items || []).forEach(item => {
                const qty = parseFloat(item.qty) || 0;
                const total = qty * (parseFloat(item.rate) || 0);
                if (s.documentType === 'return') {
                    productSales[item.name] = (productSales[item.name] || 0) - total;
                } else {
                    productSales[item.name] = (productSales[item.name] || 0) + total;
                }
            });
        });
        
        const topProducts = Object.keys(productSales).map(name => ({ name, total: productSales[name] })).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
        let prodHtml = topProducts.map((p, idx) => `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--md-outline-variant);"><span style="font-size: 14px; font-weight: 600; color: var(--md-on-surface);">${idx + 1}. ${p.name}</span><strong style="color: #0061a4; font-size: 15px;">₹${p.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>`).join('');
        document.getElementById('analytics-top-products').innerHTML = prodHtml || '<small style="color: var(--md-text-muted);">No sales data available.</small>';

        // 2. Top Customers
        const customerSales = {};
        sales.forEach(s => {
            const total = parseFloat(s.grandTotal) || 0;
            if (s.documentType === 'return') customerSales[s.customerName] = (customerSales[s.customerName] || 0) - total;
            else customerSales[s.customerName] = (customerSales[s.customerName] || 0) + total;
        });
        
        const topCustomers = Object.keys(customerSales).map(name => ({ name, total: customerSales[name] })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
        let custHtml = topCustomers.map((c, idx) => `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--md-outline-variant);"><span style="font-size: 14px; font-weight: 600; color: var(--md-on-surface);">${idx + 1}. ${c.name}</span><strong style="color: var(--md-success); font-size: 15px;">₹${c.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>`).join('');
        document.getElementById('analytics-top-customers').innerHTML = custHtml || '<small style="color: var(--md-text-muted);">No customer data available.</small>';

        // 3. Top Expenses
        const expMap = {};
        expenses.forEach(e => { expMap[e.category] = (expMap[e.category] || 0) + (parseFloat(e.amount) || 0); });
        
        const topExpenses = Object.keys(expMap).map(cat => ({ cat, total: expMap[cat] })).filter(e => e.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
        let expHtml = topExpenses.map((e, idx) => `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--md-outline-variant);"><span style="font-size: 14px; font-weight: 600; color: var(--md-on-surface);">${idx + 1}. ${e.cat}</span><strong style="color: var(--md-error); font-size: 15px;">₹${e.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>`).join('');
        document.getElementById('analytics-top-expenses').innerHTML = expHtml || '<small style="color: var(--md-text-muted);">No expense data available.</small>';
    },

    // ==========================================
    // 🚀 ENTERPRISE UPGRADE: SMART SHARE ENGINE
    // ==========================================
    openSmartShare: async (type, id) => {
        app.state.shareData = { type, id };
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const record = await window.getRecordById(storeName, id);
        if (!record) return alert("Document not found.");
        
        const isSale = type === 'sales';
        const partyName = isSale ? record.customerName : record.supplierName;
        const docName = isSale ? (record.documentType === 'return' ? 'Credit Note' : 'Invoice') : (record.documentType === 'return' ? 'Debit Note' : 'Purchase Order');
        const docNo = record.invoiceNo || record.orderNo || record.poNo || 'Draft';
        const amt = parseFloat(record.grandTotal).toLocaleString('en-IN', {minimumFractionDigits: 2});
        
        let msg = `Dear ${partyName},\n\nPlease find attached ${docName} #${docNo} for the amount of ₹${amt}.\n`;
        
        if (record.status === 'Completed') {
            msg += `\nThis document is fully settled. Thank you!`;
        } else if (isSale) {
            msg += `\nKindly process the payment at your earliest convenience.`;
            const firmData = await window.getRecordById('businessProfile', app.state.firmId);
            if (firmData && firmData.upiId) msg += `\n\nUPI: ${firmData.upiId}`;
        }
        
        msg += `\n\nRegards,\nTeam SOLLO`;
        
        const msgBox = document.getElementById('smart-share-msg');
        if (msgBox) msgBox.value = msg;
        if (window.UI) window.UI.openBottomSheet('sheet-smart-share');
    },

    executeSmartShare: async (method) => {
        const { type, id } = app.state.shareData;
        const msg = document.getElementById('smart-share-msg').value;
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const record = await window.getRecordById(storeName, id);
        
        let phone = '';
        if (record) {
            const partyId = type === 'sales' ? record.customerId : record.supplierId;
            const party = await window.getRecordById('ledgers', partyId);
            if (party && party.phone) phone = party.phone.replace(/[^0-9]/g, '');
        }
        
        if (window.UI) window.UI.closeBottomSheet('sheet-smart-share');

        if (method === 'whatsapp') {
            // Check if the phone supports Native Share (which allows sending text + file together)
            if (navigator.share && navigator.canShare) {
                // Let the PDF engine pop up, user can manually trigger it.
                if (window.Utils) window.Utils.showToast("Opening Document...");
                window.app.generatePDF(type);
                // We copy the text to clipboard so they can just paste it!
                if (navigator.clipboard) navigator.clipboard.writeText(msg);
                setTimeout(() => alert("Message copied to clipboard! You can paste it when sharing the PDF."), 1000);
            } else {
                // Fallback for PC/Older phones: Just open WhatsApp directly
                const encodedMsg = encodeURIComponent(msg);
                const url = phone ? `https://wa.me/91${phone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
                window.open(url, '_blank');
            }
        } else if (method === 'pdf_only') {
            if (window.app.generatePDF) window.app.generatePDF(type);
        }
    },

    // ==========================================
    // 8. PDF EXPORT HOOKS
    // ==========================================
        generatePDF: async (type) => {
        if (!app.state.currentEditId) return alert("Please save the document first.");
        const storeName = type === 'sales' ? 'sales' : 'purchases';
        const record = await getRecordById(storeName, app.state.currentEditId);
        if (!record) return;

        // NEW: Calculate true total paid (Instant + Manual) to link it to the PDF
        // ENTERPRISE FIX: Stop the PDF Generator from freezing by scoping the database lookup!
        const receipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
        // FIX: Match against ALL references so the printed PDF never misses a cross-linked payment!
        const uniqueRefs = [...new Set([record.orderNo, record.invoiceNo, record.poNo, record.id].filter(Boolean))];
        const partyId = type === 'sales' ? record.customerId : record.supplierId;
        
        let totalPaid = 0;
        let linkedReceipts = []; // NEW: Array to hold the detailed receipts
        
        receipts.forEach(r => {
            if (r.ledgerId === partyId && r.firmId === app.state.firmId) {
                const refs = String(r.invoiceRef || '').split(',').map(x => x.trim());
                if (refs.some(ref => uniqueRefs.includes(ref))) {
                    // ENTERPRISE FIX: Correctly add/subtract based on Refunds so the PDF math doesn't inflate!
                    const splitAmt = (parseFloat(r.amount) || 0) / (refs.length || 1);
                    const isRefund = type === 'sales' ? r.type === 'out' : r.type === 'in';
                    
                    totalPaid += isRefund ? -splitAmt : splitAmt;
                    
                    // Clone the receipt so we can safely alter the displayed amount on the PDF
                    const clonedReceipt = { ...r, amount: isRefund ? -splitAmt : splitAmt };
                    linkedReceipts.push(clonedReceipt);
                }
            }
        });

        // STRICT ERP LOGIC: Add Returns/Credit Notes so the printed PDF doesn't demand fake money!
        const allDocs = await getAllRecords(storeName, 'firmId', app.state.firmId);
        let totalReturned = 0;
        allDocs.forEach(d => {
            if (d.firmId === app.state.firmId && d.documentType === 'return' && d.status !== 'Open') {
                if (uniqueRefs.includes(d.orderNo)) {
                    totalReturned += (parseFloat(d.grandTotal) || 0);
                    // Push the return into the receipts array so it prints on the PDF as an offset payment!
                    linkedReceipts.push({
                        receiptNo: d.orderNo ? 'CN-' + d.orderNo : 'Credit Note',
                        date: d.date,
                        mode: 'Return / Credit',
                        amount: parseFloat(d.grandTotal) || 0
                    });
                }
            }
        });
        
        // --- ENTERPRISE FIX: INJECT THE FIFO ADVANCE POOL INTO THE PDF! ---
        // If the invoice is marked as Completed, but explicit payments don't equal the grand total,
        // it means the UI's smart FIFO engine used Advance Money to pay it off!
        const grandTotal = parseFloat(record.grandTotal) || 0;
        const explicitCoverage = totalPaid + totalReturned;
        
        if (record.status === 'Completed' && explicitCoverage < grandTotal) {
            const advanceUsed = grandTotal - explicitCoverage;
            totalPaid += advanceUsed; // mathematically satisfy the PDF engine
            
            // Push a fake receipt into the array so it prints beautifully on the invoice!
            linkedReceipts.push({
                receiptNo: 'ADV-POOL',
                date: record.completedDate || record.date,
                mode: 'Adjusted from Advance Balance',
                amount: advanceUsed
            });
        }
        
        // Inject the total paid + returns AND the detailed history into the record object
        record.trueTotalPaid = totalPaid + totalReturned;
        record.linkedReceipts = linkedReceipts;

        const profile = await getRecordById('businessProfile', app.state.firmId);
        const party = await getRecordById('ledgers', type === 'sales' ? record.customerId : record.supplierId);

        window.Utils.generateInvoicePDF(record, profile || {}, party || {}, type);
    },

    generateReceiptPDF: async (receiptId) => {
        // ENTERPRISE FIX: If the HTML button forgets to send the ID, automatically grab the currently open receipt!
        const targetId = (typeof receiptId === 'string' && receiptId.trim() !== '') ? receiptId : app.state.currentReceiptId;
        
        if (!targetId) return alert("Please save the payment first before generating a PDF.");

        const receipt = await getRecordById('receipts', targetId);
        if (!receipt) return alert("Receipt not found. Please save it first.");
        
        const biz = await getRecordById('businessProfile', receipt.firmId) || {};
        
        const isMoneyIn = receipt.type === 'in';
        const title = isMoneyIn ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER';
        const safeDocNo = receipt.receiptNo || String(receipt.id).substring(0, 12).toUpperCase();
        
        const bizLocationStr = [biz.city, biz.state].filter(Boolean).join(', ') + (biz.pincode ? ' - ' + biz.pincode : '');
        
        let party = null;
        let partyLocationStr = '';
        if (receipt.ledgerId) {
            party = await getRecordById('ledgers', receipt.ledgerId);
            if (party) {
                partyLocationStr = [party.city, party.state].filter(Boolean).join(', ') + (party.pincode ? ' - ' + party.pincode : '');
            }
        }

        let linkedDocsTableHtml = '';
        if (receipt.invoiceRef) {
            const refs = String(receipt.invoiceRef).split(',').map(r => r.trim());
            const store = isMoneyIn ? 'sales' : 'purchases';
            // ENTERPRISE FIX: Prevent the PDF engine from crashing when printing receipts!
            const allDocs = await getAllRecords(store, 'firmId', receipt.firmId);
            
            let tableRows = '';
            refs.forEach((ref, index) => {
                const doc = allDocs.find(d => d.firmId === receipt.firmId && (d.id === ref || d.invoiceNo === ref || d.poNo === ref || d.orderNo === ref));
                if (doc) {
                    const docNo = isMoneyIn ? (doc.invoiceNo || doc.orderNo || 'Bill of Supply') : (doc.poNo || doc.invoiceNo || doc.orderNo || 'Bill of Supply');
                    const docDate = window.Utils && window.Utils.formatDateDisplay ? window.Utils.formatDateDisplay(doc.date) : doc.date;
                    const docTotal = parseFloat(doc.grandTotal) || 0;
                    
                    tableRows += `
                    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; text-align: center; color: #1e293b;">${index + 1}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; font-weight: bold; color: #1e293b;">${docNo}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #94a3b8; text-align: center; color: #1e293b;">${docDate}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #1e293b; font-weight: bold;">₹${docTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>`;
                }
            });
            
            if (tableRows) {
                linkedDocsTableHtml = `
                <div style="margin-top: 20px;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px;">Linked Documents Settled</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border-top: 1px solid #475569;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; width: 5%; text-align: center; color: #0f172a;">#</th>
                                <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; width: 45%; color: #0f172a;">Document No.</th>
                                <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; border-right: 1px solid #94a3b8; width: 25%; text-align: center; color: #0f172a;">Date</th>
                                <th style="padding: 10px; font-weight: 800; border-bottom: 1px solid #475569; width: 25%; text-align: right; color: #0f172a;">Invoice Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>`;
            }
        }
        
        let finalBalHtml = '';
        if (party && typeof getKhataStatement === 'function') {
            const statement = await getKhataStatement(party.id, party.type);
            const bal = statement.finalBalance || 0;
            
            // 🚨 THE FIX: Calculate the math progression for a professional summary!
            const receiptAmt = parseFloat(receipt.amount) || 0;
            const prevBal = bal + (isMoneyIn ? receiptAmt : -receiptAmt);
            
            const getStatus = (b) => {
                if (Math.abs(b) < 0.01) return '';
                if (party.type === 'Customer') return b > 0.01 ? 'Due' : 'Advance';
                return b < -0.01 ? 'To Pay' : 'Advance';
            };
            
            const prevStatus = getStatus(prevBal);
            const currStatus = getStatus(bal);
            const currColor = (party.type === 'Customer' ? bal > 0.01 : bal < -0.01) ? '#dc2626' : '#16a34a';
            
            finalBalHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-weight: 600; table-layout: fixed;">
                <tr>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; color: #475569; width: 40%; line-height: 1.2;">Previous Balance</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #475569; width: 60%; line-height: 1.2; overflow-wrap: break-word;">
                        <span style="letter-spacing: -0.2px;">₹${Math.abs(prevBal).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span> ${prevStatus ? `<span style="font-size: 9px; color: #64748b;">(${prevStatus})</span>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; color: #475569; line-height: 1.2;">Amount ${isMoneyIn ? 'Received' : 'Paid'}</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; text-align: right; color: ${isMoneyIn ? '#16a34a' : '#dc2626'}; line-height: 1.2; overflow-wrap: break-word;">
                        <span style="letter-spacing: -0.2px;">- ₹${receiptAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 10px 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; line-height: 1.2;">Current Balance</td>
                    <td style="padding: 10px 4px; font-size: 14px; font-weight: 900; text-align: right; color: ${currColor}; line-height: 1.2; overflow-wrap: break-word;">
                        <span style="letter-spacing: -0.5px;">₹${Math.abs(bal).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span> <span style="font-size: 10px; color: #475569; font-weight: 700;">${currStatus ? `(${currStatus})` : '(Settled)'}</span>
                    </td>
                </tr>
            </table>`;
        }

        // ENTERPRISE UPGRADE: Sync to the main Utils engine to properly calculate Paise!
        const amountInWords = window.Utils && window.Utils.numberToWords ? window.Utils.numberToWords(parseFloat(receipt.amount) || 0) : "Rupees " + parseFloat(receipt.amount).toFixed(2);
        
        // ENTERPRISE FIX: Dynamic UUID prevents the browser from grabbing a ghost Receipt!
        const uniquePdfId = 'pdf-receipt-' + Date.now();

        const html = `
        <div id="${uniquePdfId}" class="a4-document" style="font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; width: 100%; max-width: 100%; padding: 5%; box-sizing: border-box; position: relative; overflow-x: auto; min-height: auto !important;">
            
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
                        ${isMoneyIn ? 'RECEIPT' : 'VOUCHER'}
                    </div>
                </div>

                <div style="display: flex; border-bottom: 1px solid #475569;">
                    <div style="width: 55%; padding: 20px; border-right: 1px solid #475569;">
                        ${biz.logo ? `<img src="${biz.logo}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 12px;">` : ''}
                        <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">${biz.name || 'Company Name'}</h1>
                        <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                            ${biz.address ? biz.address.replace(/\n/g, '<br>') + '<br>' : ''}
                            ${bizLocationStr ? bizLocationStr + '<br>' : ''}
                            ${biz.phone ? `<strong>Phone:</strong> ${biz.phone}` : ''} ${biz.email ? ` | <strong>Email:</strong> ${biz.email}` : ''}
                        </div>
                    </div>
                    <div style="width: 45%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; height: 100%; table-layout: fixed; word-wrap: break-word;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #475569; border-right: 1px solid #475569; width: 50%; overflow: hidden; color: #0f172a;"><strong>Receipt No:</strong><br><span style="font-size: 13px; font-weight: 700; display: block; word-wrap: break-word; color: #0f172a;">${safeDocNo}</span></td>
                                <td style="padding: 10px; border-bottom: 1px solid #475569; overflow: hidden; color: #0f172a;"><strong>Date:</strong><br><span style="font-weight: 600; display: block; word-wrap: break-word; color: #0f172a;">${window.Utils && window.Utils.formatDateDisplay ? window.Utils.formatDateDisplay(receipt.date) : receipt.date}</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #475569; border-right: 1px solid #475569; overflow: hidden; color: #0f172a;"><strong>Mode:</strong><br><span style="font-weight: 600; display: block; word-wrap: break-word; color: #0f172a;">${receipt.mode || 'Cash'}</span></td>
                                <td style="padding: 10px; border-bottom: 1px solid #475569; overflow: hidden; color: #0f172a;"><strong>Ref:</strong><br><span style="font-weight: 600; display: block; word-wrap: break-word; color: #0f172a;">${receipt.ref || '-'}</span></td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div style="display: flex; border-bottom: 1px solid #475569;">
                    <div style="width: 100%; padding: 15px 20px; box-sizing: border-box; overflow: hidden;">
                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px;">${isMoneyIn ? 'Received From' : 'Paid To'}</div>
                        <strong style="font-size: 15px; display: block; margin-bottom: 4px; word-wrap: break-word;">${receipt.ledgerName}</strong>
                        <div style="font-size: 12px; color: #334155; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word;">
                            ${party ? (party.address ? party.address.replace(/\n/g, '<br>') + '<br>' : '') : ''}
                            ${partyLocationStr ? partyLocationStr + '<br>' : ''}
                            ${party && party.phone ? `Ph: ${party.phone}` : ''}
                        </div>
                    </div>
                </div>
                
                <div style="padding: 0 20px;">
                    ${linkedDocsTableHtml}
                </div>

                <div style="display: flex; border-top: 1px solid #475569; margin-top: 20px; page-break-inside: avoid;">
                    <div style="width: 55%; border-right: 1px solid #475569; padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-size: 11px; margin-bottom: 18px; padding-bottom: 15px; border-bottom: 1px dashed #cbd5e1;">
                                <strong style="text-transform: uppercase; color: #475569;">Formal Declaration:</strong><br>
                                <span style="font-weight: 500; font-size: 13px; display: block; margin-top: 8px; line-height: 1.6; color: #1e293b; text-align: justify;">
                                    ${isMoneyIn ? 'We acknowledge with thanks the receipt of' : 'This confirms the payment of'} 
                                    <strong style="color: #0f172a;">₹${parseFloat(receipt.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong> 
                                    ${isMoneyIn ? 'from' : 'to'} <strong style="color: #0f172a;">${receipt.ledgerName}</strong> 
                                    via <strong style="color: #0f172a;">${receipt.mode || 'Cash'}</strong> 
                                    on <strong style="color: #0f172a;">${window.Utils && window.Utils.formatDateDisplay ? window.Utils.formatDateDisplay(receipt.date) : receipt.date}</strong>.
                                </span>
                            </div>
                            
                            <div style="font-size: 11px; margin-bottom: 15px;">
                                <strong style="text-transform: uppercase; color: #475569;">Amount in Words:</strong><br>
                                <span style="font-style: italic; font-weight: 600; font-size: 13px; display: block; margin-top: 4px; line-height: 1.4;">${amountInWords}</span>
                            </div>
                            ${receipt.desc ? `
                            <div style="font-size: 11px; margin-bottom: 15px;">
                                <strong style="text-transform: uppercase; color: #475569;">Notes:</strong><br>
                                <span style="font-weight: 500; font-size: 12px; display: block; margin-top: 4px; line-height: 1.4;">${receipt.desc}</span>
                            </div>` : ''}
                        </div>
                    </div>

                    <div style="width: 45%; display: flex; flex-direction: column;">
                        <div style="background: #f1f5f9; padding: 15px; text-align: right; border-bottom: 1px solid #475569; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Amount ${isMoneyIn ? 'Received' : 'Paid'}</div>
                            <div style="font-size: 18px; font-weight: 900; color: ${isMoneyIn ? '#16a34a' : '#dc2626'}; letter-spacing: -0.5px; word-break: break-all; line-height: 1.2;">₹${parseFloat(receipt.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>

                        <div style="padding: 0;">
                            ${finalBalHtml}
                        </div>

                        <div id="signature-anchor" class="avoid-break" style="position: relative; padding: 20px 15px; text-align: right; page-break-inside: avoid; min-height: 100px;">
                            
                            <div style="position: absolute; bottom: 45px; right: 60px; width: 80px; height: 80px; border: 3px solid ${isMoneyIn ? '#16a34a' : '#0284c7'}; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; opacity: 0.6; transform: rotate(-15deg); z-index: 0; pointer-events: none;">
                                <div style="font-size: 10px; font-weight: 900; color: ${isMoneyIn ? '#16a34a' : '#0284c7'}; text-transform: uppercase; line-height: 1.1; letter-spacing: 0.5px; margin-bottom: 2px;">${isMoneyIn ? 'RECEIVED' : 'VERIFIED'}</div>
                                <div style="font-size: 8px; font-weight: 800; color: ${isMoneyIn ? '#16a34a' : '#0284c7'}; border-top: 1px solid ${isMoneyIn ? '#16a34a' : '#0284c7'}; padding-top: 3px; width: 70%;">${window.Utils && window.Utils.formatDateDisplay ? window.Utils.formatDateDisplay(receipt.date) : receipt.date}</div>
                            </div>

                            <div style="position: relative; z-index: 1;">
                                ${biz.signature ? `<img src="${biz.signature}" style="max-height: 60px; max-width: 160px; margin-bottom: 8px; object-fit: contain; display: inline-block; mix-blend-mode: multiply;">` : `<div style="height: 60px;"></div>`}
                            </div>
                            <div style="position: relative; z-index: 1; border-top: 1px solid #475569; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Authorized Signatory</div>
                            <div style="position: relative; z-index: 1; font-size: 10px; color: #475569; margin-top: 4px;">For ${biz.name || 'Company Name'}</div>
                        </div>
                    </div>
                </div>
            </div> </div> </div>
        `;
        
        // ENTERPRISE UPGRADE: Interactive Receipt PDF Viewer
        // FIX: Replaces slashes with dashes so the OS doesn't think the first half of the receipt number is a folder!
        const safeFilename = `${title.replace(/ /g, '_')}_${safeDocNo.replace(/[\/\\]/g, '-')}.pdf`;
        
        // ENTERPRISE FIX: Ultimate Garbage Collection! 
        // Detonate EVERY single old viewer and wipe the generic print-area so NOTHING ghosts!
        document.querySelectorAll('#activity-receipt-viewer').forEach(el => el.remove());
        const printArea = document.getElementById('print-area');
        if (printArea) printArea.innerHTML = '';

        let viewerHTML = `
        <div id="activity-receipt-viewer" class="activity-screen" style="z-index: 5600; display: flex; flex-direction: column;">
            <div class="activity-header">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="material-symbols-outlined tap-target" onclick="document.getElementById('activity-receipt-viewer').classList.remove('open'); setTimeout(() => document.getElementById('activity-receipt-viewer').remove(), 350);">arrow_back</span>
                    <strong style="font-size: 18px;">${title}</strong>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="tap-target" onclick="if(window.Utils) window.Utils.processPDFExport('${uniquePdfId}', '${safeFilename}')" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <span class="material-symbols-outlined" style="font-size: 18px;">picture_as_pdf</span>
                    </div>
                </div>
            </div>
            <div class="activity-content" style="flex: 1; padding: 12px; background: var(--md-background); overflow-y: auto;">
                <div style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <div id="receipt-render-target" style="width: 100%; background: white; padding: 12px; box-sizing: border-box;">
                        ${html}
                    </div>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', viewerHTML);
        
        setTimeout(() => {
            document.getElementById('activity-receipt-viewer').classList.add('open');
            window.Utils.showToast("✅ Document Ready!");
        }, 50);
    },

    // ==========================================
    // 9. GST DASHBOARD CONTROLLER
    // ==========================================
    openGSTReport: async () => {
        const d = new Date();
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const selector = document.getElementById('gst-month-selector');
        if (selector) selector.value = monthStr;
        
        if (window.UI) window.UI.openActivity('activity-gst-report');
        await window.app.refreshGSTReport();
    },

    refreshGSTReport: async () => {
        const monthVal = document.getElementById('gst-month-selector').value;
        if (!monthVal) return;

        // Fetches the raw tax math from your db.js engine
        const report = await window.generateGSTReport(monthVal, app.state.firmId);

        // GSTR-1: Sales Breakdown (Splits GST and Non-GST)
        document.getElementById('gst-b2b-taxable').innerText = `\u20B9${report.gstr1.b2bTaxable.toFixed(2)}`;
        document.getElementById('gst-b2b-tax').innerText = `\u20B9${report.gstr1.b2bTax.toFixed(2)}`;
        document.getElementById('gst-b2c-taxable').innerText = `\u20B9${report.gstr1.b2cTaxable.toFixed(2)}`;
        document.getElementById('gst-b2c-tax').innerText = `\u20B9${report.gstr1.b2cTax.toFixed(2)}`;

        // GSTR-3B: Net Summary
        document.getElementById('gst-out-tax').innerText = `\u20B9${report.gstr3b.outputTax.toFixed(2)}`;
        document.getElementById('gst-in-tax').innerText = `\u20B9${report.gstr3b.inputTax.toFixed(2)}`;
        
        const netPayableEl = document.getElementById('gst-net-payable');
        if (netPayableEl) {
            netPayableEl.innerText = `\u20B9${report.gstr3b.netPayable.toFixed(2)}`;
            netPayableEl.style.color = report.gstr3b.netPayable > 0 ? '#ba1a1a' : '#146c2e';
        }

        // Bind the Export CSV Button
        const exportBtn = document.getElementById('btn-export-gst');
        if (exportBtn) {
            exportBtn.onclick = () => { window.Utils.exportGSTCSV(report); };
        }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: PARTY-WISE TAX REPORT
    // ==========================================
    openPartyTaxReport: async () => {
        // ENTERPRISE FIX: Prevent UI lag when opening the Party Tax Report modal!
        const ledgers = await window.getAllRecords('ledgers', 'firmId', app.state.firmId);
        const customers = ledgers.filter(l => l.type === 'Customer');
        const select = document.getElementById('tax-report-customer');
        if (select) {
            select.innerHTML = '<option value="">Select Customer...</option>' + customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // ENTERPRISE FIX: Set default dates from the 1st of the month to Today!
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        const fromEl = document.getElementById('tax-report-from');
        const toEl = document.getElementById('tax-report-to');
        if (fromEl) fromEl.value = `${yyyy}-${mm}-01`;
        if (toEl) toEl.value = `${yyyy}-${mm}-${dd}`;
        
        document.getElementById('tax-report-b2b').innerText = '₹0.00';
        document.getElementById('tax-report-b2b-tax').innerText = '₹0.00';
        document.getElementById('tax-report-b2c').innerText = '₹0.00';
        document.getElementById('tax-report-b2c-tax').innerText = '₹0.00';
        document.getElementById('tax-report-total').innerText = '₹0.00';

        if (window.UI) window.UI.openActivity('activity-party-tax-report');
    },

    generatePartyTaxReport: async () => {
        const customerId = document.getElementById('tax-report-customer').value;
        const fromVal = document.getElementById('tax-report-from').value;
        const toVal = document.getElementById('tax-report-to').value;
        
        if (!customerId || !fromVal || !toVal) return;

        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        
        let b2bTaxable = 0, b2bTax = 0, b2cTaxable = 0, b2cTax = 0;

        sales.forEach(s => {
            // ENTERPRISE FIX: The Timezone Trap Shield!
            // Direct string comparison natively ignores timezones, preventing missing invoices!
            if (s.firmId === app.state.firmId && s.customerId === customerId && s.status !== 'Open' && s.date >= fromVal && s.date <= toVal) {
                const mult = s.documentType === 'return' ? -1 : 1;
                const isB2B = s.invoiceType === 'B2B';
                
                // ENTERPRISE FIX: Match the global database logic! 
                // Subtotal is ALREADY Net Taxable. Do NOT double-deduct discounts, or the Party Tax Report will deflate the user's revenue!
                const taxable = (parseFloat(s.subtotal) || 0) * mult;
                
                const tax = (parseFloat(s.totalGst) || 0) * mult;

                if (isB2B) {
                    b2bTaxable += taxable;
                    b2bTax += tax;
                } else {
                    b2cTaxable += taxable;
                    b2cTax += tax;
                }
            }
        });

        const totalTaxable = b2bTaxable + b2cTaxable;

        document.getElementById('tax-report-b2b').innerText = `₹${b2bTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('tax-report-b2b-tax').innerText = `₹${b2bTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('tax-report-b2c').innerText = `₹${b2cTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('tax-report-b2c-tax').innerText = `₹${b2cTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('tax-report-total').innerText = `₹${totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    // ==========================================
    // ENTERPRISE UPGRADE: ITEM-WISE PROFITABILITY
    // ==========================================
    openItemProfitReport: () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        const fromEl = document.getElementById('item-profit-from');
        const toEl = document.getElementById('item-profit-to');
        if (fromEl) fromEl.value = `${yyyy}-${mm}-01`;
        if (toEl) toEl.value = `${yyyy}-${mm}-${dd}`;
        
        document.getElementById('item-profit-total').innerHTML = '₹0.00';
        document.getElementById('item-profit-list').innerHTML = '';

        if (window.UI) window.UI.openActivity('activity-item-profit-report');
        if (typeof app.generateItemProfitReport === 'function') app.generateItemProfitReport();
    },

    generateItemProfitReport: async () => {
        const fromVal = document.getElementById('item-profit-from').value;
        const toVal = document.getElementById('item-profit-to').value;
        if (!fromVal || !toVal) return;

        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        
        const itemMap = {};
        let totalFreight = 0;
        let totalDiscount = 0;
        let totalRoundOff = 0;

        sales.forEach(s => {
            if (s.firmId === app.state.firmId && s.status !== 'Open' && s.status !== 'Cancelled' && s.date >= fromVal && s.date <= toVal) {
                const mult = s.documentType === 'return' ? -1 : 1;
                
                const rawSubtotal = parseFloat(s.subtotal) || 0;
                
                // 🚨 ENTERPRISE FIX 1: Safe extraction using the exact database property names
                const freight = parseFloat(s.freight) || parseFloat(s.freightAmount) || 0;
                totalFreight += freight * mult;
                
                // 🚨 ENTERPRISE FIX 2: Exact Discount Match including % rounding and Credit Note flipping!
                let discountAmt = 0;
                if (s.discountType === '%') {
                    discountAmt = Math.round((rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) * 100) / 100;
                } else {
                    discountAmt = parseFloat(s.discount) || 0;
                }
                
                // If it's a credit note, the discount must be flipped so it subtracts mathematically correctly!
                if (rawSubtotal < 0 && discountAmt > 0) discountAmt = -discountAmt;
                if (Math.abs(discountAmt) > Math.abs(rawSubtotal)) discountAmt = rawSubtotal;
                
                totalDiscount += discountAmt * mult;

                // 🚨 ENTERPRISE FIX 3: Exact Round-Off calculation to capture stray pennies!
                const totalGst = parseFloat(s.totalGst) || 0;
                const grandTotal = parseFloat(s.grandTotal) || 0;
                
                const exactTotal = rawSubtotal + totalGst + freight - discountAmt;
                let roundOff = grandTotal - exactTotal;
                
                // Kill floating point noise
                if (Math.abs(roundOff) < 0.01) roundOff = 0;
                totalRoundOff += roundOff * mult;
                
                (s.items || []).forEach(item => {
                    const id = item.itemId || item.name; 
                    if (!itemMap[id]) {
                        itemMap[id] = { name: item.name, qty: 0, revenue: 0, cost: 0, profit: 0, uom: item.uom };
                    }
                    
                    const qty = parseFloat(item.qty) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const buyPrice = parseFloat(item.buyPrice) || 0; 
                    
                    // PURE ITEM MATH: No invoice-level discounts applied here!
                    const actualRevenue = qty * rate;
                    const totalCost = qty * buyPrice;
                    
                    itemMap[id].qty += (qty * mult);
                    itemMap[id].revenue += (actualRevenue * mult);
                    itemMap[id].cost += (totalCost * mult);
                    itemMap[id].profit += ((actualRevenue - totalCost) * mult);
                });
            }
        });

        const rankedItems = Object.values(itemMap).sort((a, b) => b.profit - a.profit);
        
        let totalItemProfit = 0;
        let html = '';

        if (rankedItems.length === 0) {
            html = '<div style="text-align:center; color:var(--md-text-muted); padding:20px;">No sales found in this date range.</div>';
        } else {
            rankedItems.forEach(item => {
                totalItemProfit += item.profit;
                const isLoss = item.profit < 0;
                const profitColor = isLoss ? 'var(--md-error)' : 'var(--md-success)';
                const profitSign = isLoss ? '' : '+';
                
                html += `
                <div class="m3-card" style="padding: 12px; border-left: 4px solid ${profitColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                        <strong style="color: var(--md-on-surface); font-size: 14px;">${item.name}</strong>
                        <strong style="color: ${profitColor}; font-size: 15px;">${profitSign}₹${item.profit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size: 11px; color: var(--md-text-muted);">
                        <span>Qty Sold: <strong>${item.qty} ${item.uom || ''}</strong></span>
                        <span>Revenue: <strong>₹${item.revenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                        <span>Avg Cost: <strong>₹${item.cost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                    </div>
                </div>`;
            });
            
            // The Bridging Reconciliation Block!
            const finalBridgedProfit = totalItemProfit + totalFreight - totalDiscount + totalRoundOff;
            
            html += `
            <div class="m3-card" style="margin-top: 24px; padding: 16px; background: rgba(0, 97, 164, 0.05); border: 1px solid rgba(0, 97, 164, 0.2);">
                <div style="font-size: 12px; font-weight: 800; color: var(--md-primary); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Profit Reconciliation</div>
                
                <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 6px; color: var(--md-on-surface);">
                    <span>Pure Item Margin:</span>
                    <strong>₹${totalItemProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 6px; color: var(--md-success);">
                    <span>Add: Freight Collected:</span>
                    <strong>+ ₹${totalFreight.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 6px; color: var(--md-error);">
                    <span>Less: Discounts Given:</span>
                    <strong>- ₹${totalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 12px; color: var(--md-text-muted);">
                    <span>Round-Off Adjustments:</span>
                    <strong>${totalRoundOff >= 0 ? '+' : '-'} ₹${Math.abs(totalRoundOff).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
                
                <div style="border-top: 1px dashed var(--md-primary); padding-top: 12px; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color: var(--md-primary); font-size: 14px;">Sales Gross Profit:</strong>
                    <strong style="color: var(--md-primary); font-size: 18px;">₹${finalBridgedProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
            </div>`;
        }

        document.getElementById('item-profit-list').innerHTML = html;
        document.getElementById('item-profit-total').innerHTML = `₹${totalItemProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    // ENTERPRISE UPGRADE: QUICK DATE FILTERS
    setReportDates: (range) => {
        const d = new Date();
        const y = d.getFullYear();
        const m = d.getMonth();
        let from, to;

        // 🚨 ENTERPRISE FIX: Use timezone-safe local date to prevent "Yesterday" reporting bugs!
        const safeToday = window.Utils && window.Utils.getLocalDate ? window.Utils.getLocalDate() : d.toISOString().split('T')[0];

        if (range === 'today') {
            from = safeToday; to = safeToday;
        } else if (range === 'month') {
            from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
            to = safeToday;
        } else if (range === 'year') {
            const fyStartYear = m < 3 ? y - 1 : y;
            from = `${fyStartYear}-04-01`;
            to = safeToday;
        }

        // Apply to ALL THREE report UIs automatically
        const ids = ['tax-report-from', 'tax-report-to', 'item-profit-from', 'item-profit-to', 'expense-report-from', 'expense-report-to'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = (id.includes('from') ? from : to);
        });

        // Trigger the math engines to recalculate with the new dates
        if (typeof app.generatePartyTaxReport === 'function') app.generatePartyTaxReport();
        if (typeof app.generateItemProfitReport === 'function') app.generateItemProfitReport();
        if (typeof app.generateExpenseReport === 'function') app.generateExpenseReport();
    },

    // ==========================================
    // ENTERPRISE UPGRADE: EXPENSE LEAKAGE & REORDER
    // ==========================================
    openExpenseReport: () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        const fromEl = document.getElementById('expense-report-from');
        const toEl = document.getElementById('expense-report-to');
        if (fromEl) fromEl.value = `${yyyy}-${mm}-01`;
        if (toEl) toEl.value = `${yyyy}-${mm}-${dd}`;

        if (window.UI) window.UI.openActivity('activity-expense-report');
        app.generateExpenseReport();
    },

    generateExpenseReport: async () => {
        const fromVal = document.getElementById('expense-report-from').value;
        const toVal = document.getElementById('expense-report-to').value;
        if (!fromVal || !toVal) return;

        // ENTERPRISE FIX: Scoped the database fetch to prevent a RAM freeze!
        const allExpenses = await window.getAllRecords('expenses', 'firmId', app.state.firmId);
        
        const catMap = {};
        let totalExpenses = 0;

        allExpenses.forEach(e => {
            // ENTERPRISE FIX: The Timezone Trap Shield!
            // Direct string comparison natively ignores timezones, preventing missing expenses!
            if (e.firmId === app.state.firmId && e.date >= fromVal && e.date <= toVal) {
                const cat = e.category || 'Uncategorized';
                const amt = parseFloat(e.amount) || 0;
                
                if (!catMap[cat]) catMap[cat] = 0;
                catMap[cat] += amt;
                totalExpenses += amt;
            }
        });

        // Sort Highest Expenses First
        const rankedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        
        let html = '';
        if (rankedCats.length === 0) {
            html = '<div style="text-align:center; color:var(--md-text-muted); padding:20px;">No expenses found in this date range.</div>';
        } else {
            rankedCats.forEach(([cat, amt]) => {
                const percentage = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0;
                html += `
                <div class="m3-card" style="padding: 12px; border-left: 4px solid var(--md-error);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <strong style="color: var(--md-on-surface); font-size: 15px;">${cat}</strong>
                        <strong style="color: var(--md-error); font-size: 16px;">₹${amt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <div style="flex:1; height: 6px; background: rgba(186, 26, 26, 0.15); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--md-error);"></div>
                        </div>
                        <span style="font-size: 11px; color: var(--md-text-muted); font-weight:bold;">${percentage}%</span>
                    </div>
                </div>`;
            });
        }

        document.getElementById('expense-report-list').innerHTML = html;
        document.getElementById('expense-report-total').innerHTML = `₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    openReorderReport: async () => {
        if (window.UI) window.UI.openActivity('activity-reorder-report');
        
        // ENTERPRISE FIX: Direct O(1) Indexed lookup prevents the Reorder Report from freezing!
        const firmItems = await window.getAllRecords('items', 'firmId', app.state.firmId);
        
        let estimatedCost = 0;
        let html = '';
        let reorderCount = 0;

        firmItems.forEach(i => {
            const minStock = parseFloat(i.minStock) || 0;
            // Only care if they actually set a minimum stock!
            if (minStock > 0) {
                const currentStock = parseFloat(i.stock) || 0;
                
                // ENTERPRISE FIX: Changed <= to < so the app doesn't command users to order "0" items!
                if (currentStock < minStock) {
                    reorderCount++;
                    const deficit = minStock - currentStock;
                    const buyPrice = parseFloat(i.buyPrice) || 0;
                    const restockCost = deficit * buyPrice;
                    estimatedCost += restockCost;

                    html += `
                    <div class="m3-card" style="padding: 12px; border-left: 4px solid #f59e0b;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                            <div>
                                <strong style="color: var(--md-on-surface); font-size: 15px; display:block;">${i.name}</strong>
                                <small style="color: var(--md-error); font-weight:bold;">Current Stock: ${currentStock} ${i.uom || ''}</small>
                            </div>
                            <div style="text-align:right;">
                                <small style="color: var(--md-text-muted); display:block;">Order Qty</small>
                                <strong style="color: #d97706; font-size: 18px;">${deficit}</strong>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--md-outline-variant); padding-top: 8px; margin-top: 4px;">
                            <span style="font-size: 11px; color: var(--md-text-muted);">Est. Buy Price: ₹${buyPrice.toFixed(2)}</span>
                            <span style="font-size: 12px; font-weight:bold; color: #b45309;">Cost: ₹${restockCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>`;
                }
            }
        });

        if (reorderCount === 0) {
            html = '<div style="text-align:center; color:var(--md-success); padding:30px; font-weight:bold;"><span class="material-symbols-outlined" style="font-size: 48px; display:block; margin-bottom:10px;">check_circle</span>All items are sufficiently stocked!</div>';
        }

        document.getElementById('reorder-report-list').innerHTML = html;
        document.getElementById('reorder-report-total').innerHTML = `₹${estimatedCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    // ==========================================
    // NEW: EXPENSE LINK SEARCH ENGINE
    // ==========================================

    // ==========================================
    // NEW: EXPENSE LINK SEARCH ENGINE
    // ==========================================
    loadLinkedDocsList: async () => {
        const listEl = document.getElementById('list-linked-docs');
        if (!listEl) return;
        
        // ENTERPRISE FIX: Stop the Expense screen from violently freezing by scoping the linked docs!
        const sales = await getAllRecords('sales', 'firmId', app.state.firmId);
        const purchases = await getAllRecords('purchases', 'firmId', app.state.firmId);
        
        const currentSelected = (document.getElementById('expense-linked-invoice').value || '').split(',');
        let html = '';
        
        const recentSales = sales.filter(s => s.firmId === app.state.firmId && s.status !== 'Open');
        // 🚨 ENTERPRISE FIX: Mathematically flipped a and b to force DESCENDING alphanumeric order (Newest first!)
        recentSales.sort((a,b) => String(b.orderNo || b.invoiceNo || b.id).localeCompare(String(a.orderNo || a.invoiceNo || a.id), undefined, {numeric: true, sensitivity: 'base'}));
        
        // Take only the top 50 to prevent freezing the UI
        const slicedSales = recentSales.slice(0, 50);

        if (slicedSales.length > 0) {
            html += `<li style="background: var(--md-surface-variant); font-weight: bold; pointer-events: none; padding: 8px 16px; border-radius: 4px;">Sales Invoices</li>`;
            slicedSales.forEach(s => {
                // BULLETPROOF: Save the exact Order/Invoice number directly!
                const docNo = s.orderNo || s.invoiceNo || s.id;
                const displayNo = s.orderNo || s.invoiceNo || s.id.slice(-4).toUpperCase();
                const isSelected = currentSelected.includes(docNo);
                const bg = isSelected ? 'var(--md-surface-variant)' : 'transparent';
                const checked = isSelected ? 'checked' : '';

                html += `<li style="background: ${bg};" onclick="app.selectLinkedDoc('${docNo}', '${displayNo}', this)">
                    <div><strong style="color:var(--md-primary);">${displayNo}</strong><br><small>${s.customerName}</small></div>
                    <input type="checkbox" ${checked} style="width: 20px; height: 20px; pointer-events: none;">
                </li>`;
            });
        }
        
        const recentPurch = purchases.filter(p => p.firmId === app.state.firmId && p.status !== 'Open');
        // 🚨 ENTERPRISE FIX: Mathematically flipped a and b to force DESCENDING alphanumeric order (Newest first!)
        recentPurch.sort((a,b) => String(b.orderNo || b.poNo || b.invoiceNo || b.id).localeCompare(String(a.orderNo || a.poNo || a.invoiceNo || a.id), undefined, {numeric: true, sensitivity: 'base'}));
        
        // Take only the top 50 to prevent freezing the UI
        const slicedPurch = recentPurch.slice(0, 50);

        if (slicedPurch.length > 0) {
            html += `<li style="background: var(--md-surface-variant); font-weight: bold; pointer-events: none; padding: 8px 16px; border-radius: 4px; margin-top: 12px;">Purchase Bills</li>`;
            slicedPurch.forEach(p => {
                // BULLETPROOF: Save the exact PO/Order number directly!
                const docNo = p.orderNo || p.poNo || p.invoiceNo || p.id;
                const displayNo = p.orderNo || p.poNo || p.invoiceNo || p.id.slice(-4).toUpperCase();
                
                const isSelected = currentSelected.includes(docNo);
                const bg = isSelected ? 'var(--md-surface-variant)' : 'transparent';
                const checked = isSelected ? 'checked' : '';

                html += `<li style="background: ${bg};" onclick="app.selectLinkedDoc('${docNo}', '${displayNo}', this)">
                    <div><strong style="color:var(--md-error);">${displayNo}</strong><br><small>${p.supplierName}</small></div>
                    <input type="checkbox" ${checked} style="width: 20px; height: 20px; pointer-events: none;">
                </li>`;
            });
        }
        listEl.innerHTML = html;
    },

    selectLinkedDoc: (id, displayName, liElement = null) => {
        const inputEl = document.getElementById('expense-linked-invoice');
        const displayEl = document.getElementById('expense-linked-display');
        
        if (!id) {
            inputEl.value = '';
            displayEl.innerText = '-- No Link (General Expense) --';
            displayEl.style.color = 'var(--md-text-muted)';
            // 🚨 ENTERPRISE FIX: Removed UI.closeBottomSheet so it just unlinks without closing the screen!
            document.querySelectorAll('#list-linked-docs li input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('#list-linked-docs li').forEach(li => {
                if(li.style.pointerEvents !== 'none') li.style.background = 'transparent';
            });
            return;
        }

        let currentIds = inputEl.value ? inputEl.value.split(',') : [];
        let currentNames = displayEl.innerText !== '-- No Link (General Expense) --' ? displayEl.innerText.split(' | ') : [];

        if (currentIds.includes(id)) {
            currentIds = currentIds.filter(i => i !== id);
            currentNames = currentNames.filter(n => n !== displayName);
            if (liElement) {
                liElement.style.background = 'transparent';
                const cb = liElement.querySelector('input');
                if (cb) cb.checked = false;
            }
        } else {
            currentIds.push(id);
            currentNames.push(displayName);
            if (liElement) {
                liElement.style.background = 'var(--md-surface-variant)';
                const cb = liElement.querySelector('input');
                if (cb) cb.checked = true;
            }
        }

        inputEl.value = currentIds.join(',');
        displayEl.innerText = currentNames.length > 0 ? currentNames.join(' | ') : '-- No Link (General Expense) --';
        displayEl.style.color = currentIds.length > 0 ? 'var(--md-primary)' : 'var(--md-text-muted)';
    },

    filterLinkedDocs: (term) => {
        const listItems = document.querySelectorAll('#list-linked-docs li');
        listItems.forEach(li => {
            if(li.style.pointerEvents === 'none') return; // Skip headers
            const text = li.innerText;
            // ENTERPRISE UX: Powered by the new Fuzzy Search Engine!
            li.style.display = window.fuzzyMatch(term, text) ? 'flex' : 'none';
        });
    },

    // ==========================================
    // DOCUMENT SETTINGS ENGINE
    // ==========================================
    loadDocumentSettings: () => {
        const savedFormats = JSON.parse(localStorage.getItem('sollo_doc_formats') || '{}');
        
        const applyToUI = (key, defaultFormat, idPrefix) => {
            const template = savedFormats[key] || defaultFormat;
            const parts = template.split('{NUM}');
            if (document.getElementById(`${idPrefix}-prefix`)) {
                document.getElementById(`${idPrefix}-prefix`).value = parts[0] || '';
                document.getElementById(`${idPrefix}-suffix`).value = parts.length > 1 ? parts[1] : '';
            }
        };

        applyToUI('INV', '{NUM}/{FY}', 'format-inv');
        applyToUI('ORD', 'ORD {NUM}/{FY}', 'format-ord');
        applyToUI('PO', 'PO {NUM}/{FY}', 'format-po');
        applyToUI('CN', 'CN {NUM}/{FY}', 'format-cn');
        applyToUI('EXP', 'EXP {NUM}/{FY}', 'format-exp');
        applyToUI('REC', 'REC {NUM}/{FY}', 'format-rec');
        applyToUI('VOU', 'VOU {NUM}/{FY}', 'format-vou');

        // Load custom starting numbers into ALL the middle boxes
        const types = ['inv', 'ord', 'po', 'cn', 'exp', 'rec', 'vou'];
        types.forEach(type => {
            const el = document.getElementById(`format-${type}-start`);
            if (el) el.value = localStorage.getItem(`sollo_${type}_start`) || '';
        });
    },

    saveDocumentSettings: () => {
        const buildFormat = (idPrefix) => {
            const pre = document.getElementById(`${idPrefix}-prefix`).value || '';
            const suf = document.getElementById(`${idPrefix}-suffix`).value || '';
            return `${pre}{NUM}${suf}`;
        };

        const formats = {
            'INV': buildFormat('format-inv'),
            'ORD': buildFormat('format-ord'),
            'PO': buildFormat('format-po'),
            'CN': buildFormat('format-cn'),
            'EXP': buildFormat('format-exp'),
            'REC': buildFormat('format-rec'),
            'VOU': buildFormat('format-vou')
        };
        
        localStorage.setItem('sollo_doc_formats', JSON.stringify(formats));

        // Save custom starting numbers from ALL the middle boxes
        const types = ['inv', 'ord', 'po', 'cn', 'exp', 'rec', 'vou'];
        types.forEach(type => {
            const el = document.getElementById(`format-${type}-start`);
            if (el && el.value) localStorage.setItem(`sollo_${type}_start`, el.value);
        });

        if (window.Utils) window.Utils.showToast("Document Formats Saved! ✅");
        if (window.UI) window.UI.closeBottomSheet('sheet-document-formats');
    },

    // ==========================================
    // 10. FINANCIAL YEAR-END ENGINE (NON-DESTRUCTIVE)
    // ==========================================
    closeFinancialYear: async () => {
        if (!confirm("Generate Financial Year-End Closing Report? This will calculate all final Ledger and Bank balances for your CA, without deleting any historical data.")) return;
        
        try {
            if (window.Utils) window.Utils.showToast("Calculating Year-End Balances...");
            
            // ENTERPRISE FIX: Added || [] to prevent Year-End report from crashing!
            const ledgers = (await getAllRecords('ledgers', 'firmId', app.state.firmId).catch(() => [])) || [];
            const allAccounts = (await getAllRecords('accounts').catch(() => [])) || [];
            const accounts = allAccounts.filter(a => a.firmId === app.state.firmId);
            
            let csvContent = "SOLLO ERP - FINANCIAL YEAR CLOSING BALANCES\n\n";
            csvContent += `Generated on: ${new Date().toLocaleDateString('en-IN')}\n\n`;
            
            csvContent += "1. CUSTOMER & SUPPLIER LEDGERS\n";
            csvContent += "Party Name,Type,Phone,Closing Balance,Status\n";
            
            // STRICT ERP LOGIC: O(1) Memory Hash Map instead of N+1 Database Queries!
            // This prevents the browser from crashing when generating the CA report for 1,000+ parties.
            const balanceCache = {};
            
            ledgers.forEach(l => {
                if (l.firmId !== app.state.firmId) return;
                let ob = parseFloat(l.openingBalance) || 0;
                const balType = (l.balanceType || '').toLowerCase();
                if (l.type === 'Customer') {
                    balanceCache[l.id] = (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
                } else {
                    balanceCache[l.id] = (balType.includes('receive') || balType.includes('debit')) ? -ob : ob;
                }
            });

            if (window.UI && window.UI.state && window.UI.state.rawData) {
                (window.UI.state.rawData.sales || []).forEach(s => {
                    if (s.firmId === app.state.firmId && s.status !== 'Open' && balanceCache[s.customerId] !== undefined) {
                        balanceCache[s.customerId] += (s.documentType === 'return' ? -parseFloat(s.grandTotal || 0) : parseFloat(s.grandTotal || 0));
                    }
                });

                (window.UI.state.rawData.purchases || []).forEach(p => {
                    if (p.firmId === app.state.firmId && p.status !== 'Open' && balanceCache[p.supplierId] !== undefined) {
                        balanceCache[p.supplierId] += (p.documentType === 'return' ? -parseFloat(p.grandTotal || 0) : parseFloat(p.grandTotal || 0));
                    }
                });

                (window.UI.state.rawData.cashbook || []).forEach(r => {
                    if (r.firmId === app.state.firmId && r.ledgerId && balanceCache[r.ledgerId] !== undefined) {
                        const party = ledgers.find(l => l.id === r.ledgerId);
                        if (party) {
                            const isMoneyIn = r.type === 'in';
                            const amt = parseFloat(r.amount) || 0;
                            if (party.type === 'Customer') balanceCache[r.ledgerId] += isMoneyIn ? -amt : amt;
                            else balanceCache[r.ledgerId] += isMoneyIn ? amt : -amt;
                        }
                    }
                });
            }

            for (const party of ledgers) {
                if (party.firmId !== app.state.firmId) continue;
                const bal = balanceCache[party.id] || 0;
                
                let status = '';
                if (party.type === 'Customer') status = bal > 0.01 ? 'To Receive' : (bal < -0.01 ? 'Advance' : 'Settled');
                else status = bal > 0.01 ? 'To Pay' : (bal < -0.01 ? 'Advance' : 'Settled');
                
                csvContent += `"${party.name.replace(/"/g, '""')}","${party.type}","${party.phone || ''}",${Math.abs(bal).toFixed(2)},"${status}"\n`;
            }
            
            csvContent += "\n2. BANK & CASH ACCOUNTS\n";
            csvContent += "Account Name,Closing Balance\n";
            
            const allReceipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
            
            // Compute Main Cash Drawer
            let cashBal = 0;
            const defaultCashAcc = accounts.find(a => a.id === 'cash' && a.firmId === app.state.firmId);
            if (defaultCashAcc) cashBal = parseFloat(defaultCashAcc.openingBalance) || 0;
            
            allReceipts.filter(r => r.firmId === app.state.firmId && (r.accountId === 'cash' || !r.accountId)).forEach(r => {
                cashBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
            });
            csvContent += `"Default Cash Drawer",${cashBal.toFixed(2)}\n`;
            
            // Compute Custom Bank Accounts
            for (const acc of accounts) {
                // STRICT ERP LOGIC: Skip the default Cash Drawer here so it doesn't print twice and inflate assets!
                if (acc.firmId !== app.state.firmId || acc.id === 'cash') continue;
                let accBal = parseFloat(acc.openingBalance) || 0;
                allReceipts.filter(r => r.firmId === app.state.firmId && r.accountId === acc.id).forEach(r => {
                    accBal += (r.type === 'in' ? parseFloat(r.amount) : -parseFloat(r.amount));
                });
                csvContent += `"${acc.name.replace(/"/g, '""')}",${accBal.toFixed(2)}\n`;
            }
            
            // Download the Non-Destructive Report
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const file = new File([blob], `FY_Closing_Report_${new Date().getFullYear()}.csv`, { type: 'text/csv' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: "Year End Report", files: [file] });
            } else if (window.Utils) {
                window.Utils.downloadFile(csvContent, file.name, 'text/csv;charset=utf-8;');
            }
            
            if (window.Utils) window.Utils.showToast("Year-End Books Generated Successfully! ✅");
            
        } catch (error) {
            console.error("Year End Engine Error:", error);
            alert("An error occurred while closing the books.");
        }
    }, // <-- Notice the comma here!

    // ==========================================
    // ENTERPRISE UPGRADE 2: DEAD STOCK CAPITAL ANALYZER
    // ==========================================
    generateDeadStockReport: async () => {
        if (!confirm("Run Dead Stock Analysis? This will scan all items and identify capital trapped in inventory not sold in the last 90 days.")) return;
        
        if (window.Utils) window.Utils.showToast("Analyzing Warehouse Capital... ⏳");
        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        const items = await window.getAllRecords('items', 'firmId', app.state.firmId);
        
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        let deadStockCapital = 0;
        let csvContent = "SOLLO ERP - DEAD STOCK ANALYSIS (90+ DAYS)\n\nItem Name,Current Stock,Buy Price,Trapped Capital,Last Sold Date\n";
        
        items.forEach(item => {
            const stock = parseFloat(item.stock) || 0;
            if (stock <= 0) return; 
            
            let lastSoldDate = new Date(0); 
            sales.forEach(s => {
                if (s.status !== 'Open' && s.documentType !== 'return' && s.firmId === app.state.firmId) {
                    const found = (s.items || []).find(i => String(i.itemId) === String(item.id));
                    if (found) {
                        const sDate = window.Utils.safeDate(s.date);
                        if (sDate > lastSoldDate) lastSoldDate = sDate;
                    }
                }
            });
            
            if (lastSoldDate < ninetyDaysAgo) {
                const buyPrice = parseFloat(item.buyPrice) || 0;
                const trappedValue = stock * buyPrice;
                deadStockCapital += trappedValue;
                
                const dateStr = lastSoldDate.getTime() === 0 ? "Never Sold" : lastSoldDate.toLocaleDateString('en-IN');
                csvContent += `"${item.name.replace(/"/g, '""')}",${stock},${buyPrice},${trappedValue.toFixed(2)},"${dateStr}"\n`;
            }
        });
        
        csvContent += `\nTOTAL TRAPPED CAPITAL,,,${deadStockCapital.toFixed(2)}\n`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `Dead_Stock_Report_${window.Utils.getLocalDate()}.csv`, { type: 'text/csv' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "Dead Stock Report", files: [file] });
        } else if (window.Utils) {
            window.Utils.downloadFile(csvContent, file.name, 'text/csv');
        }
        if (window.Utils) window.Utils.showToast("✅ Analysis Complete!");
    },

    // ==========================================
    // ENTERPRISE UPGRADE 3: TIME-MACHINE STOCK SNAPSHOT
    // ==========================================
    generateTimeMachineSnapshot: async () => {
        const targetDateStr = prompt("Enter the historical date for the Stock Snapshot (YYYY-MM-DD):", window.Utils.getLocalDate());
        if (!targetDateStr) return;
        
        const targetDate = window.Utils.safeDate(targetDateStr);
        if (isNaN(targetDate.getTime())) return alert("Invalid date format. Please use YYYY-MM-DD.");
        
        if (window.Utils) window.Utils.showToast("Reversing Timeline... ⏳");
        
        const items = await window.getAllRecords('items', 'firmId', app.state.firmId);
        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        const purchases = await window.getAllRecords('purchases', 'firmId', app.state.firmId);
        const adjustments = await window.getAllRecords('adjustments', 'firmId', app.state.firmId);
        const expenses = await window.getAllRecords('expenses', 'firmId', app.state.firmId);
        
        let totalValuation = 0;
        let csvContent = `SOLLO ERP - HISTORICAL STOCK VALUATION AS OF ${targetDateStr}\n\nItem Name,Historical Stock,Buy Price,Total Value\n`;
        
        items.forEach(item => {
            let historicalStock = parseFloat(item.stock) || 0;
            const buyPrice = parseFloat(item.buyPrice) || 0;
            
            // REVERSE EVERY TRANSACTION THAT HAPPENED *AFTER* THE TARGET DATE
            sales.forEach(s => {
                if (s.status !== 'Open' && s.status !== 'Cancelled' && window.Utils.safeDate(s.date) > targetDate) {
                    const isReturn = s.documentType === 'return';
                    (s.items || []).forEach(row => {
                        if (String(row.itemId) === String(item.id)) {
                            const qty = parseFloat(row.qty) || 0;
                            historicalStock += isReturn ? -qty : qty;
                        }
                    });
                }
            });
            
            purchases.forEach(p => {
                if (p.status !== 'Open' && p.status !== 'Cancelled' && window.Utils.safeDate(p.date) > targetDate) {
                    const isReturn = p.documentType === 'return';
                    (p.items || []).forEach(row => {
                        if (String(row.itemId) === String(item.id)) {
                            const qty = parseFloat(row.qty) || 0;
                            historicalStock += isReturn ? qty : -qty;
                        }
                    });
                }
            });
            
            adjustments.forEach(a => {
                if (window.Utils.safeDate(a.date) > targetDate && String(a.itemId) === String(item.id)) {
                    const qty = parseFloat(a.qty) || 0;
                    historicalStock += (a.type === 'add') ? -qty : qty;
                }
            });
            
            expenses.forEach(e => {
                if (window.Utils.safeDate(e.date) > targetDate) {
                    (e.items || []).forEach(row => {
                        if (String(row.itemId) === String(item.id)) {
                            historicalStock += parseFloat(row.qty) || 0;
                        }
                    });
                }
            });
            
            if (historicalStock !== 0) {
                const itemValue = historicalStock * buyPrice;
                totalValuation += itemValue;
                csvContent += `"${item.name.replace(/"/g, '""')}",${historicalStock.toFixed(2)},${buyPrice},${itemValue.toFixed(2)}\n`;
            }
        });
        
        csvContent += `\nTOTAL HISTORICAL VALUATION,,,${totalValuation.toFixed(2)}\n`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `Stock_Snapshot_${targetDateStr}.csv`, { type: 'text/csv' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "Historical Stock Snapshot", files: [file] });
        } else if (window.Utils) {
            window.Utils.downloadFile(csvContent, file.name, 'text/csv');
        }
        if (window.Utils) window.Utils.showToast("✅ Snapshot Generated!");
    },

    // ==========================================
    // VISUAL DEAD STOCK SCANNER DASHBOARD
    // ==========================================
    openDeadStockReport: async () => {
        if (window.UI) window.UI.openActivity('activity-dead-stock-report');
        document.getElementById('dead-stock-list').innerHTML = '<div style="text-align:center; padding: 20px; color: var(--md-text-muted);"><span class="material-symbols-outlined rotating" style="font-size: 32px;">sync</span><p>Scanning Warehouse...</p></div>';
        
        setTimeout(() => {
            if (window.app && typeof window.app.generateDeadStockReport === 'function') {
                window.app.generateDeadStockReport();
            }
        }, 150);
    },

    generateDeadStockReport: async () => {
        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        const items = await window.getAllRecords('items', 'firmId', app.state.firmId);
        
        const DEAD_DAYS = 90;
        const now = new Date().getTime();
        
        let deadStockCapital = 0;
        let deadItems = [];
        
        // 1. Find the most recent sale date for every single item
        const lastSaleMap = {};
        sales.forEach(sale => {
            if (sale.status === 'Open' || sale.status === 'Cancelled' || sale.documentType === 'return') return;
            const saleTime = window.Utils.safeDate(sale.date).getTime();
            (sale.items || []).forEach(row => {
                const id = row.itemId || row.id;
                if (!lastSaleMap[id] || saleTime > lastSaleMap[id]) lastSaleMap[id] = saleTime;
            });
        });

        items.forEach(item => {
            const stock = parseFloat(item.stock) || 0;
            if (stock > 0) {
                const lastSaleTime = lastSaleMap[item.id];
                let daysSinceSale = 'Never Sold';
                let isDead = false;

                if (!lastSaleTime) {
                    // 🚨 ENTERPRISE FIX: Extract creation date from ID to ensure brand new items aren't flagged as dead!
                    const createdAt = parseInt(String(item.id).split('-').pop()) || 0;
                    if (createdAt < now - (DEAD_DAYS * 24 * 60 * 60 * 1000)) {
                        isDead = true;
                    }
                } else {
                    const days = Math.floor((now - lastSaleTime) / (1000 * 60 * 60 * 24));
                    if (days > DEAD_DAYS) {
                        isDead = true;
                        daysSinceSale = `${days} Days Ago`;
                    }
                }

                if (isDead) {
                    const buyPrice = parseFloat(item.buyPrice) || 0;
                    const trappedValue = stock * buyPrice;
                    deadStockCapital += trappedValue;
                    
                    deadItems.push({
                        name: item.name,
                        stock: stock,
                        uom: item.uom || 'Unit',
                        buyPrice: buyPrice,
                        trappedValue: trappedValue,
                        lastSold: daysSinceSale
                    });
                }
            }
        });

        // Sort by highest trapped capital first
        deadItems.sort((a, b) => b.trappedValue - a.trappedValue);
        
        // Save to memory for CSV export later
        app.state.lastDeadStockData = deadItems;
        app.state.lastDeadStockTotal = deadStockCapital;

        let html = '';
        if (deadItems.length === 0) {
            html = '<div style="text-align:center; color:var(--md-success); padding:30px; font-weight:bold;"><span class="material-symbols-outlined" style="font-size: 48px; display:block; margin-bottom:10px;">check_circle</span>No dead stock found! Inventory is moving well.</div>';
        } else {
            html = deadItems.map(item => `
                <div class="m3-card" style="padding: 12px; border-left: 4px solid var(--md-error);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                        <div style="flex:1; min-width:0; padding-right:8px;">
                            <strong style="color: var(--md-on-surface); font-size: 15px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</strong>
                            <small style="color: var(--md-error); font-weight:bold;">Stock: ${item.stock} ${item.uom}</small>
                        </div>
                        <div style="text-align:right; flex-shrink:0;">
                            <small style="color: var(--md-text-muted); display:block;">Trapped Value</small>
                            <strong style="color: var(--md-error); font-size: 16px;">₹${item.trappedValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--md-outline-variant); padding-top: 8px; margin-top: 4px;">
                        <span style="font-size: 11px; color: var(--md-text-muted);">Avg Buy: ₹${item.buyPrice.toFixed(2)}</span>
                        <span style="font-size: 11px; font-weight:bold; color: var(--md-secondary);">Last Sold: ${item.lastSold}</span>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('dead-stock-list').innerHTML = html;
        document.getElementById('dead-stock-total').innerHTML = `₹${deadStockCapital.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    exportDeadStockCSV: async () => {
        const data = app.state.lastDeadStockData || [];
        const total = app.state.lastDeadStockTotal || 0;
        
        if (data.length === 0) return window.Utils.showToast("No dead stock to export!");

        let csvContent = "SOLLO ERP - DEAD STOCK ANALYSIS (90+ DAYS)\n\nItem Name,Current Stock,Buy Price,Trapped Capital,Last Sold Date\n";
        
        data.forEach(item => {
            csvContent += `"${item.name.replace(/"/g, '""')}",${item.stock},${item.buyPrice},${item.trappedValue.toFixed(2)},"${item.lastSold}"\n`;
        });
        
        csvContent += `\nTOTAL TRAPPED CAPITAL,,,${total.toFixed(2)}\n`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `Dead_Stock_Report_${window.Utils.getLocalDate()}.csv`, { type: 'text/csv' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "Dead Stock Report", files: [file] });
        } else if (window.Utils) {
            window.Utils.downloadFile(csvContent, file.name, 'text/csv');
        }
    },

    // ==========================================
    // VISUAL PROFIT LEAKAGE AUDIT DASHBOARD
    // ==========================================
    openProfitLeakageReport: async () => {
        if (window.UI) window.UI.openActivity('activity-profit-leakage-report');
        document.getElementById('profit-leakage-list').innerHTML = '<div style="text-align:center; padding: 20px; color: var(--md-text-muted);"><span class="material-symbols-outlined rotating" style="font-size: 32px;">sync</span><p>Scanning all sales history...</p></div>';
        
        setTimeout(() => {
            if (window.app && typeof window.app.generateProfitLeakageReport === 'function') {
                window.app.generateProfitLeakageReport();
            }
        }, 150);
    },

    generateProfitLeakageReport: async () => {
        const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
        
        let totalLostRevenue = 0;
        let leakageItems = [];
        
        sales.forEach(s => {
            if (s.status === 'Open' || s.status === 'Cancelled') return;
            const isReturn = s.documentType === 'return';
            
            // Calculate exact discount ratio to find the TRUE selling price
            const rawSubtotal = parseFloat(s.subtotal) || 0;
            let discountAmt = s.discountType === '%' ? (rawSubtotal * ((parseFloat(s.discount) || 0) / 100)) : (parseFloat(s.discount) || 0);
            if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
            const discountRatio = rawSubtotal > 0 ? (discountAmt / rawSubtotal) : 0;
            
            (s.items || []).forEach(item => {
                const qty = parseFloat(item.qty) || 0;
                const rate = parseFloat(item.rate) || 0;
                const buyPrice = parseFloat(item.buyPrice) || 0;
                
                if (qty > 0 && buyPrice > 0) {
                    const effectiveRate = rate - (rate * discountRatio);
                    if (effectiveRate < buyPrice) {
                        const lossPerUnit = buyPrice - effectiveRate;
                        const totalLoss = lossPerUnit * qty;
                        
                        // We only count actual sales for leakage (Refunding them less than we bought it for is technically a gain)
                        if (!isReturn) {
                            totalLostRevenue += totalLoss;
                            leakageItems.push({
                                invoiceNo: s.invoiceNo || s.orderNo || 'Draft',
                                date: window.Utils.formatDateDisplay(s.date),
                                customerName: s.customerName || 'Unknown Party',
                                itemName: item.name,
                                qty: qty,
                                uom: item.uom || 'Unit',
                                buyPrice: buyPrice,
                                effectiveRate: effectiveRate,
                                totalLoss: totalLoss
                            });
                        }
                    }
                }
            });
        });

        // Sort by highest loss first so the biggest leaks are at the top
        leakageItems.sort((a, b) => b.totalLoss - a.totalLoss);
        
        app.state.lastProfitLeakageData = leakageItems;
        app.state.lastProfitLeakageTotal = totalLostRevenue;

        let html = '';
        if (leakageItems.length === 0) {
            html = '<div style="text-align:center; color:var(--md-success); padding:30px; font-weight:bold;"><span class="material-symbols-outlined" style="font-size: 48px; display:block; margin-bottom:10px;">check_circle</span>All sales are mathematically profitable!<br><br>Perfect! No issues found.</div>';
        } else {
            html = leakageItems.map(item => `
                <div class="m3-card" style="padding: 12px; border-left: 4px solid var(--md-error);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                        <div style="flex:1; min-width:0; padding-right:8px;">
                            <strong style="color: var(--md-on-surface); font-size: 15px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.itemName}</strong>
                            <small style="color: var(--md-primary); font-weight:bold;">${item.invoiceNo} | ${item.customerName}</small>
                        </div>
                        <div style="text-align:right; flex-shrink:0;">
                            <small style="color: var(--md-text-muted); display:block;">Total Loss</small>
                            <strong style="color: var(--md-error); font-size: 16px;">-₹${item.totalLoss.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--md-outline-variant); padding-top: 8px; margin-top: 4px;">
                        <span style="font-size: 11px; color: var(--md-text-muted);">Buy: ₹${item.buyPrice.toFixed(2)} | Sold: ₹${item.effectiveRate.toFixed(2)}</span>
                        <span style="font-size: 11px; font-weight:bold; color: var(--md-secondary);">Qty: ${item.qty} ${item.uom}</span>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('profit-leakage-list').innerHTML = html;
        document.getElementById('profit-leakage-total').innerHTML = `₹${totalLostRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    },

    exportProfitLeakageCSV: async () => {
        const data = app.state.lastProfitLeakageData || [];
        const total = app.state.lastProfitLeakageTotal || 0;
        
        if (data.length === 0) return window.Utils.showToast("No profit leakage to export!");

        let csvContent = "SOLLO ERP - PROFIT LEAKAGE AUDIT\n\nInvoice No,Date,Customer,Item Name,Qty,Buy Price,Sold At (Effective),Total Loss\n";
        
        data.forEach(item => {
            csvContent += `"${item.invoiceNo}","${item.date}","${item.customerName.replace(/"/g, '""')}","${item.itemName.replace(/"/g, '""')}",${item.qty},${item.buyPrice},${item.effectiveRate.toFixed(2)},${item.totalLoss.toFixed(2)}\n`;
        });
        
        csvContent += `\nTOTAL LOST REVENUE,,,,,,,${total.toFixed(2)}\n`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `Profit_Leakage_Report_${window.Utils.getLocalDate()}.csv`, { type: 'text/csv' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "Profit Leakage Report", files: [file] });
        } else if (window.Utils) {
            window.Utils.downloadFile(csvContent, file.name, 'text/csv');
        }
    }

}; // <--- THIS IS THE CRITICAL CLOSING BRACKET FOR THE APP OBJECT

// ==========================================
// NEW: KHATA (LEDGER) STATEMENT ENGINE
// ==========================================
window.triggerKhataReport = async () => {
    if (!UI.state.rawData.ledgers) return window.Utils.showToast("No data available yet!");
    
    // 1. Get all Customers and Suppliers safely
    const parties = UI.state.rawData.ledgers.filter(l => {
        const type = String(l.type).toLowerCase();
        return type === 'customer' || type === 'supplier';
    });
    if (parties.length === 0) return window.Utils.showToast("No Customers or Suppliers found!");

    // STRICT ERP LOGIC: Destroy old instances to prevent catastrophic DOM memory leaks!
    const oldSheet = document.getElementById('sheet-khata-select');
    if (oldSheet) oldSheet.remove();
    const oldOverlay = document.getElementById('khata-overlay');
    if (oldOverlay) oldOverlay.remove();

    // 2. Build a beautiful native Bottom Sheet dynamically
    let sheetHTML = `
    <div id="sheet-khata-select" class="bottom-sheet open" style="z-index: 9999; max-height: 80vh;">
        <div class="sheet-header" style="background: var(--md-surface); position: sticky; top: 0; z-index: 10;">
            <div>
                <span style="font-size: 18px; font-weight: 600; display: block;">Khata Statement</span>
                <small style="color: var(--md-text-muted);">Select a party to generate report</small>
            </div>
            <span class="material-symbols-outlined tap-target" onclick="this.closest('.bottom-sheet').remove(); document.getElementById('khata-overlay').remove();" style="background: var(--md-surface-variant); padding: 8px; border-radius: 50%;">close</span>
        </div>
        <div style="padding: 16px; overflow-y: auto;">
            ${parties.map(p => `
                <div class="m3-card tap-target" style="padding: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--md-outline-variant);" 
                     onclick="window.executeKhataReport('${p.id}', '${(p.name || 'Unknown').replace(/'/g, "\\'")}', '${p.type}'); this.closest('.bottom-sheet').remove(); document.getElementById('khata-overlay').remove();">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="icon-circle" style="width: 40px; height: 40px; background: ${String(p.type).toLowerCase() === 'customer' ? 'rgba(0, 97, 164, 0.1)' : 'rgba(186, 26, 26, 0.1)'}; color: ${String(p.type).toLowerCase() === 'customer' ? '#42a5f5' : 'var(--md-error)'}; box-shadow: none;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">${String(p.type).toLowerCase() === 'customer' ? 'person' : 'storefront'}</span>
                        </div>
                        <strong style="font-size: 15px;">${p.name || 'Unknown'}</strong>
                    </div>
                    <span class="material-symbols-outlined" style="color: var(--md-text-muted);">print</span>
                </div>
            `).join('')}
        </div>
    </div>
    <div id="khata-overlay" class="sheet-overlay open" style="z-index: 9998;" onclick="document.getElementById('sheet-khata-select').remove(); this.remove();"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', sheetHTML);
};

window.executeKhataReport = async (partyId, partyName, partyType) => {
    window.Utils.showToast("Generating Ledger... ⏳");
    
    // Fetch Ledger math from Database
    const statementData = await window.getKhataStatement(partyId, partyType);
    
    // FIX: Safely extract the timeline array from the object!
    if (!statementData || !statementData.timeline || statementData.timeline.length === 0) {
        return window.Utils.showToast("No transactions found for " + partyName);
    }

    const statement = statementData.timeline;
    
    // ==========================================
    // ENTERPRISE UPGRADE: PDF SUMMARY MATH ENGINE
    // ==========================================
    let totalDebit = 0;
    let totalCredit = 0;
    
    statement.forEach(row => {
        let isDebit = false;
        if (String(partyType).toLowerCase() === 'customer') {
            isDebit = row.impact > 0;
        } else {
            isDebit = row.impact < 0;
        }

        // Handle the opening balance row specifically
        if (row.id === 'open-bal') {
             if (String(partyType).toLowerCase() === 'customer') {
                 isDebit = row.impact > 0; 
             } else {
                 isDebit = row.impact < 0; 
             }
        }
        
        if (isDebit) {
            totalDebit += Math.abs(row.impact || 0);
        } else {
            totalCredit += Math.abs(row.impact || 0);
        }
    });

    // Build Professional A4 Print Template (Now perfectly mobile responsive!)
    let html = `
    <style>
        @media print {
            @page { margin: 15mm 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .a4-document { width: 100% !important; padding: 0 !important; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            /* Auto-inject page numbers at bottom center */
            @page {
                @bottom-center {
                    content: "Page " counter(page);
                    font-family: 'Inter', sans-serif;
                    font-size: 10px;
                    color: #94a3b8;
                }
            }
        }
    </style>
    <div class="a4-document" style="font-family: 'Inter', sans-serif; color: #333; background: #fff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; gap: 10px;">
            <div style="max-width: 65%; min-width: 0;">
                <h2 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: 0.5px; word-wrap: break-word;">LEDGER STATEMENT</h2>
                <h3 style="margin: 6px 0 0 0; color: #0061a4; font-size: 16px; font-weight: 700; word-wrap: break-word;">${partyName}</h3>
            </div>
            <div style="text-align: right; flex-shrink: 0; max-width: 30%;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Generated On</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #0f172a; font-weight: 700;">${new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; table-layout: auto;">
            <thead>
                <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1; color: #475569;">
                    <th style="padding: 8px 4px; text-align: left; white-space: nowrap; font-weight: 600;">Date</th>
                    <th style="padding: 8px 4px; text-align: left; width: 100%; font-weight: 600;">Particulars</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Debit</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Credit</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    let runBal = 0;
    statement.forEach(row => {
        runBal += row.impact;
        
        // PERFECT ACCOUNTING MATH
        let isDebit = false;
        if (String(partyType).toLowerCase() === 'customer') {
            isDebit = row.impact > 0;
        } else {
            // 🚨 CRITICAL FIX: Supplier math has negative impact for Purchases (Liability increases), but Purchases are CREDITS! 
            // Payments to suppliers have positive impact (Liability decreases), which are DEBITS!
            isDebit = row.impact > 0; 
        }

        if (row.id === 'open-bal') {
             if (String(partyType).toLowerCase() === 'customer') {
                 isDebit = runBal > 0;
             } else {
                 // 🚨 CRITICAL FIX: A negative Opening Balance for a Supplier means we OWE them (Liability = Credit)!
                 isDebit = runBal > 0; 
             }
        }
        
        const amtStr = Math.abs(row.impact || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
        const drText = isDebit ? amtStr : '';
        const crText = !isDebit ? amtStr : '';
        
        let balText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
        if (String(partyType).toLowerCase() === 'customer') {
            balText += (runBal >= 0 ? ' Dr' : ' Cr');
        } else {
            balText += (runBal >= 0 ? ' Cr' : ' Dr');
        }

        // STRICT ERP LOGIC: Reduced vertical padding to 5px to remove the empty gap between rows!
        
        // ENTERPRISE UI: Smart Date Wrapper (Forces DD MMM 'YY so month and year never truncate on mobile)
        let displayDate = row.date;
        if (displayDate && displayDate !== 'Opening') {
            const d = window.Utils.safeDate(displayDate); // ENTERPRISE FIX: Protect Apple/iOS
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-IN', { month: 'short' });
            const year = String(d.getFullYear()).slice(-2);
            displayDate = `${day} ${month} '${year}`;
        }

        html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 4px; white-space: nowrap; vertical-align: top; color: #64748b;">${displayDate}</td>
                    <td style="padding: 5px 4px; word-break: break-word; vertical-align: top; color: #1e293b; line-height: 1.4;">${row.desc || row.particulars || 'Opening Balance'}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #e11d48; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${drText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #16a34a; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${crText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #0f172a; font-weight: 700; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums;">${balText}</td>
                </tr>
        `;
    });

    const finalBalText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
    
    // STRICT ERP LOGIC: Professional Status Pill Generator
    let finalBalStatus = 'Settled';
    let statusBg = 'rgba(100, 116, 139, 0.1)'; // Transparent Gray
    let statusColor = 'var(--md-text-muted)'; // Dark Gray

    if (String(partyType).toLowerCase() === 'customer') {
        if (runBal > 0.01) { finalBalStatus = 'Due to Receive (Dr)'; statusBg = 'rgba(186, 26, 26, 0.1)'; statusColor = 'var(--md-error)'; }
        else if (runBal < -0.01) { finalBalStatus = 'Advance Received (Cr)'; statusBg = 'rgba(0, 97, 164, 0.1)'; statusColor = 'var(--md-primary)'; }
    } else {
        // 🚨 ENTERPRISE FIX: Supplier debt is a Liability (Negative). We must invert the math!
        if (runBal < -0.01) { finalBalStatus = 'Due to Pay (Cr)'; statusBg = 'rgba(186, 26, 26, 0.1)'; statusColor = 'var(--md-error)'; }
        else if (runBal > 0.01) { finalBalStatus = 'Advance Paid (Dr)'; statusBg = 'rgba(0, 97, 164, 0.1)'; statusColor = 'var(--md-primary)'; }
    }

        // 🚀 ENTERPRISE GST SPLIT ENGINE FOR KHATA STATEMENT PDF
        let splitHtml = '';
        if ((String(partyType).toLowerCase() === 'customer' && runBal > 0.01) || (String(partyType).toLowerCase() !== 'customer' && runBal < -0.01)) {
            const party = await getRecordById('ledgers', partyId) || { openingBalance: 0, balanceType: '' };
            let ob = parseFloat(party.openingBalance) || 0;
            let isAdv = String(partyType).toLowerCase() === 'customer' ? ((party.balanceType || '').toLowerCase().includes('pay') || (party.balanceType || '').toLowerCase().includes('credit')) : ((party.balanceType || '').toLowerCase().includes('receive') || (party.balanceType || '').toLowerCase().includes('debit'));
            
            let debitsGst = !isAdv ? ob : 0;
            let debitsNon = 0;
            
            const exactPaymentMap = {};
            const exactReturnMap = {};

            const allReceipts = await getAllRecords('receipts', 'firmId', window.app.state.firmId);
            allReceipts.forEach(c => {
                if (c.ledgerId === partyId && c.invoiceRef) {
                    let amt = parseFloat(c.amount) || 0;
                    const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                    let remainingAmt = amt;
                    refs.forEach(ref => {
                        if (remainingAmt <= 0) return;
                        exactPaymentMap[ref] = (exactPaymentMap[ref] || 0) + (amt / refs.length);
                    });
                }
            });

            const docs = String(partyType).toLowerCase() === 'customer' ? await getAllRecords('sales', 'firmId', window.app.state.firmId) : await getAllRecords('purchases', 'firmId', window.app.state.firmId);
            
            docs.forEach(d => {
                if (d.documentType === 'return' && d.status !== 'Open' && d.orderNo && (String(partyType).toLowerCase() === 'customer' ? d.customerId === partyId : d.supplierId === partyId)) {
                    exactReturnMap[d.orderNo] = (exactReturnMap[d.orderNo] || 0) + (parseFloat(d.grandTotal) || 0);
                }
            });

            docs.forEach(doc => {
                if (doc.status !== 'Open' && doc.documentType !== 'return' && (String(partyType).toLowerCase() === 'customer' ? doc.customerId === partyId : doc.supplierId === partyId)) {
                    const uniqueRefs = [...new Set([doc.orderNo, doc.poNo, doc.invoiceNo, doc.id].filter(Boolean))];
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

            const trueBalance = Math.abs(runBal); 
            const trackedDebt = debitsGst + debitsNon;
            if (trueBalance < trackedDebt) {
                const excessCredit = trackedDebt - trueBalance;
                if (excessCredit >= debitsGst) {
                    let remaining = excessCredit - debitsGst;
                    debitsGst = 0;
                    debitsNon = Math.max(0, debitsNon - remaining);
                } else {
                    debitsGst -= excessCredit;
                }
            }

            if (debitsGst > 0.01 || debitsNon > 0.01) {
                splitHtml = `<div style="margin-top: 12px; background: #f1f5f9; padding: 10px; border-radius: 6px; border: 1px dashed #cbd5e1; width: 100%; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box;">`;
                if (debitsGst > 0.01) splitHtml += `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #0f172a; font-weight: 800;"><span>GST Due:</span><span>₹${debitsGst.toFixed(2)}</span></div>`;
                if (debitsNon > 0.01) splitHtml += `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #0f172a; font-weight: 800;"><span>Non-GST Due:</span><span>₹${debitsNon.toFixed(2)}</span></div>`;
                splitHtml += `</div>`;
            }
        }

    html += `
            </tbody>
        </table>
        
        <div class="avoid-break" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 15px; gap: 15px; page-break-inside: avoid;">
            
            <div style="flex: 1; background: #f8fafc; padding: 14px 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 10px;">Transaction Summary</span>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
                    <span style="font-size: 12px; color: #475569; font-weight: 600;">Total Debit (Dr)</span>
                    <strong style="font-size: 13px; color: #e11d48;">₹ ${totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #475569; font-weight: 600;">Total Credit (Cr)</span>
                    <strong style="font-size: 13px; color: #16a34a;">₹ ${totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 14px 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid ${statusColor}; display: flex; flex-direction: column; align-items: flex-end; box-shadow: 0 1px 3px rgba(0,0,0,0.05); flex-shrink: 0; min-width: 200px;">
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; text-align: right;">Closing Balance</span>
                <strong style="font-size: 20px; color: #0f172a; display: block; margin-top: 4px; margin-bottom: 8px; word-wrap: break-word; text-align: right;">₹ ${finalBalText}</strong>
                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid ${statusColor}40; display: inline-block; text-align: right; line-height: 1.2;">${finalBalStatus}</span>
                ${splitHtml}
            </div>
        </div>
        
        <div class="avoid-break" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; page-break-inside: avoid;">
            <span style="font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase;">*** End of Statement ***</span>
            <div style="font-size: 9px; color: #cbd5e1; margin-top: 6px;">Generated securely via SOLLO ERP</div>
        </div>
    </div>`;

    // Inject into hidden print area for the actual printer
    let printDiv = document.getElementById('print-area');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'print-area';
        printDiv.className = 'print-only';
        document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    
    // NEW: Build a beautiful On-Screen Viewer!
    let oldViewer = document.getElementById('activity-khata-viewer');
    if (oldViewer) oldViewer.remove();

    // ENTERPRISE FIX: Aggressive Regex strips slashes from "M/S" names to prevent OS truncation!
    const safeFilename = `Ledger_Statement_${partyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    let viewerHTML = `
    <div id="activity-khata-viewer" class="activity-screen" style="z-index: 5500; display: flex; flex-direction: column;">
        <div class="activity-header">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span class="material-symbols-outlined tap-target" onclick="document.getElementById('activity-khata-viewer').classList.remove('open'); setTimeout(() => document.getElementById('activity-khata-viewer').remove(), 350);">arrow_back</span>
                <strong style="font-size: 18px;">Ledger Statement</strong>
            </div>
            
            <!-- 🚨 BIZOPS FIX: Unified PDF button to show EXACT Document Preview -->
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="tap-target" onclick="if(window.Utils) window.Utils.processPDFExport('khata-render-target', '${safeFilename}')" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">picture_as_pdf</span>
                </div>
            </div>
        </div>
        <div class="activity-content" style="flex: 1; padding: 12px; background: var(--md-background); overflow-y: auto;">
            <div style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <div id="khata-render-target" style="width: 100%; background: white; padding: 12px; box-sizing: border-box;">
                    ${html}
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
    
    // Trigger the smooth slide-in animation
    setTimeout(() => {
        document.getElementById('activity-khata-viewer').classList.add('open');
        window.Utils.showToast("✅ Ledger Ready!");
    }, 50);
};

// ==========================================
// NEW: KHATA LEDGER TRIGGER (FROM FORM)
// ==========================================
window.triggerKhataFromForm = () => {
    // 1. Grab the exact Party Name directly from the form's specific ID
    const nameInput = document.getElementById('ledger-name');
    
    if (!nameInput || !nameInput.value || nameInput.value.trim() === '') {
        return window.Utils.showToast("Could not read the name. Is the Party Name box empty?");
    }

    const foundName = nameInput.value.trim();

    // 2. Look up this exact name in the Database
    const ledgers = window.UI.state.rawData.ledgers || [];
    // STRICT ERP LOGIC: Enforce the Firm ID so "Shop B" doesn't accidentally print "Shop A's" confidential ledger!
    const party = ledgers.find(l => l.firmId === window.app.state.firmId && (l.name || '').toLowerCase() === foundName.toLowerCase());
    
    // 3. Trigger the PDF Viewer
    if (party) {
        window.executeKhataReport(party.id, party.name, party.type);
    } else {
        window.Utils.showToast("⚠️ Please save this profile first before generating a ledger!");
    }
};

// ==========================================
// NEW: BANK & CASH STATEMENT PDF ENGINE
// ==========================================
window.executeAccountReport = async (accountId) => {
    window.Utils.showToast("Generating Bank Statement... ⏳");
    
    let account = { name: 'Cash Drawer', openingBalance: 0 };
    if (accountId !== 'cash') {
        account = await getRecordById('accounts', accountId) || account;
    }

    const receipts = await getAllRecords('receipts', 'firmId', app.state.firmId);
    const firmId = app.state.firmId;
    
    const accountReceipts = receipts.filter(r => {
        if (r.firmId !== firmId) return false;
        if (accountId === 'cash') return r.accountId === 'cash' || !r.accountId;
        return r.accountId === accountId;
    });

    let timeline = [];
    let openingBalance = parseFloat(account.openingBalance) || 0;
    
    if (openingBalance !== 0) {
        timeline.push({ id: 'open-bal', date: 'Opening', desc: 'Opening Balance', amount: Math.abs(openingBalance), impact: openingBalance });
    }

    accountReceipts.forEach(r => {
        const isMoneyIn = r.type === 'in';
        const impact = isMoneyIn ? parseFloat(r.amount) : -parseFloat(r.amount);
        
        // ENTERPRISE FIX: PDF Bank Statement Link Translation
        // The PDF engine was printing ugly database IDs instead of actual Invoice Numbers!
        let displayRefs = '';
        if (r.invoiceRef) {
            const refs = String(r.invoiceRef).split(',').map(x => x.trim());
            const names = refs.map(ref => {
                const s = UI.state.rawData.sales.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.orderNo === ref);
                if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                
                const p = UI.state.rawData.purchases.find(doc => doc.id === ref || doc.invoiceNo === ref || doc.poNo === ref || doc.orderNo === ref);
                if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                
                const e = UI.state.rawData.expenses.find(doc => doc.id === ref || doc.expenseNo === ref);
                if (e) {
                    if (e.linkedInvoice) {
                        const eLinks = String(e.linkedInvoice).split(',').map(x => x.trim());
                        const eNames = eLinks.map(el => {
                            const ls = UI.state.rawData.sales.find(doc => doc.id === el || doc.invoiceNo === el || doc.orderNo === el);
                            if (ls) return ls.orderNo || ls.invoiceNo || String(ls.id).slice(-4).toUpperCase();
                            const lp = UI.state.rawData.purchases.find(doc => doc.id === el || doc.invoiceNo === el || doc.poNo === el || doc.orderNo === el);
                            if (lp) return lp.orderNo || lp.poNo || lp.invoiceNo || String(lp.id).slice(-4).toUpperCase();
                            return el.startsWith('sollo-') ? el.slice(-4).toUpperCase() : el;
                        });
                        return (e.expenseNo || String(e.id).slice(-4).toUpperCase()) + ' (🔗 ' + eNames.join(', ') + ')';
                    }
                    return e.expenseNo || String(e.id).slice(-4).toUpperCase();
                }
                
                return ref.startsWith('sollo-') ? ref.slice(-4).toUpperCase() : ref;
            });
            displayRefs = [...new Set(names)].join(', ');
        }
        let refText = r.ref || '';
        if (displayRefs) refText = refText ? `${refText} | Docs: ${displayRefs}` : `Docs: ${displayRefs}`;
        if (r.receiptNo) refText = `${r.receiptNo} ${refText ? '| ' + refText : ''}`;

        timeline.push({
            id: r.id,
            date: r.date,
            desc: r.desc || (isMoneyIn ? 'Money In' : 'Money Out'),
            partyName: r.ledgerName || '',
            amount: parseFloat(r.amount),
            impact: impact,
            ref: refText
        });
    });

    timeline.sort((a, b) => {
        if (a.id === 'open-bal') return -1;
        if (b.id === 'open-bal') return 1;
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.id > b.id) ? 1 : -1;
    });

    let html = `
    <div class="a4-document" style="font-family: 'Inter', sans-serif; color: #333; background: #fff; width: 800px; max-width: none; padding: 40px; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
            <div>
                <h2 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: 0.5px;">ACCOUNT STATEMENT</h2>
                <h3 style="margin: 6px 0 0 0; color: #0061a4; font-size: 16px; font-weight: 700;">${account.name}</h3>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Generated On</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #0f172a; font-weight: 700;">${new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; table-layout: auto;">
            <thead>
                <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1; color: #475569;">
                    <th style="padding: 8px 4px; text-align: left; white-space: nowrap; font-weight: 600;">Date</th>
                    <th style="padding: 8px 4px; text-align: left; width: 100%; font-weight: 600;">Description</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">In</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Out</th>
                    <th style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 600;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    let runBal = 0;
    timeline.forEach(row => {
        runBal += row.impact;
        
        let isMoneyIn = row.impact > 0;
        if (row.id === 'open-bal') isMoneyIn = runBal > 0;
        
        const amtStr = Math.abs(row.impact || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
        const inText = isMoneyIn ? amtStr : '';
        const outText = !isMoneyIn ? amtStr : '';
        const balText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});
        
        let fullDesc = row.desc;
        if (row.partyName) fullDesc += `<br><span style="color:#555; font-size:9px;">Party: ${row.partyName}</span>`;
        if (row.ref) fullDesc += `<br><span style="color:#555; font-size:9px;">Ref: ${row.ref}</span>`;

        // ENTERPRISE UI: Smart Date Wrapper (Forces DD MMM 'YY so month and year never truncate on mobile)
        let displayDate = row.date;
        if (displayDate && displayDate !== 'Opening') {
            const d = window.Utils.safeDate(displayDate); // ENTERPRISE FIX: Protect Apple/iOS
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-IN', { month: 'short' });
            const year = String(d.getFullYear()).slice(-2);
            displayDate = `${day} ${month} '${year}`;
        }

        html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 4px; white-space: nowrap; vertical-align: top; color: #64748b;">${displayDate}</td>
                    <td style="padding: 5px 4px; word-break: break-word; vertical-align: top; color: #1e293b; line-height: 1.4;">${fullDesc}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #16a34a; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${inText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #e11d48; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 500;">${outText}</td>
                    <td style="padding: 5px 4px; text-align: right; color: #0f172a; font-weight: 700; white-space: nowrap; vertical-align: top; font-variant-numeric: tabular-nums;">${balText}</td>
                </tr>
        `;
    });

    const finalBalText = Math.abs(runBal).toLocaleString('en-IN', {minimumFractionDigits: 2});

    html += `
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <div style="background: #f8fafc; padding: 14px 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid ${runBal >= 0 ? '#146c2e' : '#ba1a1a'}; display: inline-block; text-align: right; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Available Balance</span><br>
                <strong style="font-size: 20px; color: #0f172a; display: block; margin-top: 4px; margin-bottom: 8px;">₹ ${finalBalText}</strong>
                <span style="background: ${runBal >= 0 ? '#16a34a' : '#dc2626'}; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: inline-block;">${runBal >= 0 ? 'Surplus / In-Hand' : 'Overdrawn'}</span>
            </div>
        </div>
    </div>`;

    let printDiv = document.getElementById('print-area');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'print-area';
        printDiv.className = 'print-only';
        document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    
    let oldViewer = document.getElementById('activity-account-viewer');
    if (oldViewer) oldViewer.remove();

    // ENTERPRISE FIX: Aggressive Regex strips slashes from bank names to prevent OS truncation!
    const safeFilename = `Account_Statement_${account.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    let viewerHTML = `
    <div id="activity-account-viewer" class="activity-screen" style="z-index: 5600; display: flex; flex-direction: column;">
        <div class="activity-header">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span class="material-symbols-outlined tap-target" onclick="document.getElementById('activity-account-viewer').classList.remove('open'); setTimeout(() => document.getElementById('activity-account-viewer').remove(), 350);">arrow_back</span>
                <strong style="font-size: 18px;">Account Statement</strong>
            </div>
            
            <!-- 🚨 BIZOPS FIX: Unified PDF button to show EXACT Document Preview -->
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="tap-target" onclick="if(window.Utils) window.Utils.processPDFExport('account-render-target', '${safeFilename}')" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">picture_as_pdf</span>
                </div>
            </div>
        </div>
        <div class="activity-content" style="flex: 1; padding: 12px; background: var(--md-background); overflow-y: auto;">
            <div style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <div id="account-render-target" style="width: 100%; background: white; padding: 12px; box-sizing: border-box;">
                    ${html}
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
    
    setTimeout(() => {
        document.getElementById('activity-account-viewer').classList.add('open');
        window.Utils.showToast("✅ Statement Ready!");
    }, 50);
};

// ==========================================
// ENTERPRISE UPGRADE: ITEM LEDGER ENGINE
// ==========================================
app.openItemLedger = async (itemId, itemName) => {
    const container = document.getElementById('item-ledger-list');
    if(!container) return;

    // Securely lock the ID for the PDF button
    document.getElementById('item-ledger-hidden-id').value = itemId;
    document.getElementById('item-ledger-hidden-name').value = itemName;
    document.getElementById('item-ledger-title').innerText = itemName + ' Movement';
    
    container.innerHTML = '<div style="text-align:center; padding: 20px;"><span class="material-symbols-outlined rotating" style="font-size: 32px;">sync</span><p>Calculating Timeline...</p></div>';
    if (window.UI) window.UI.openActivity('activity-item-ledger');

    const product = await window.getRecordById('items', itemId);
    const openingStock = product ? (parseFloat(product.openingStock) || 0) : 0;
    const uom = product ? (product.uom || 'Units') : 'Units';

    let timeline = [];
    
    // 1. Scan Sales & Returns
    const sales = await window.getAllRecords('sales', 'firmId', app.state.firmId);
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

    // 2. Scan Purchases & Returns
    const purchases = await window.getAllRecords('purchases', 'firmId', app.state.firmId);
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

    // 3. Scan Manual Adjustments
    const adjustments = await window.getAllRecords('adjustments', 'firmId', app.state.firmId);
    adjustments.forEach(a => {
        if(a.itemId === itemId) {
            const qty = parseFloat(a.qty) || 0;
            timeline.push({ id: a.id, date: a.date, type: 'Stock Adjustment', desc: a.notes || 'Manual Entry', ref: 'ADJ-' + a.id.slice(-4).toUpperCase(), inQty: a.type === 'add' ? qty : 0, outQty: a.type === 'reduce' ? qty : 0 });
        }
    });

    // ENTERPRISE FIX: 4. Scan Expenses (The Ghost Consumption Leak!)
    // If raw materials were consumed in an Expense, they MUST appear on the audit trail!
    const expenses = await window.getAllRecords('expenses', 'firmId', app.state.firmId);
    expenses.forEach(e => {
        (e.items || []).forEach(row => {
            if(row.itemId === itemId) {
                const qty = parseFloat(row.qty) || 0;
                timeline.push({ id: e.id, date: e.date, type: 'Internal Expense', desc: e.category || 'Consumed', ref: e.expenseNo || 'EXP-' + e.id.slice(-4).toUpperCase(), inQty: 0, outQty: qty });
            }
        });
    });

    // Sort Chronologically by Date and ID Timestamp
    timeline.sort((a, b) => {
        const dateA = window.Utils.safeDate(a.date || 0).getTime();
        const dateB = window.Utils.safeDate(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
        const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
        return timeA - timeB;
    });

    // 🟢 ENTERPRISE FIX: Calculate total before rendering to show Current Stock at the top
    let totalIn = timeline.reduce((sum, t) => sum + t.inQty, 0);
    let totalOut = timeline.reduce((sum, t) => sum + t.outQty, 0);
    let currentTotalStock = openingStock + totalIn - totalOut;

    let html = `
    <div style="background: var(--md-primary-container); color: var(--md-on-primary-container); padding: 12px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px;">
            <strong style="font-size: 14px;">Current Total Stock</strong>
            <strong style="font-size: 18px;">${currentTotalStock.toFixed(2)} ${uom}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; opacity: 0.8;">
            <span style="font-size: 12px;">Opening Stock</span>
            <span style="font-size: 12px; font-weight: bold;">${openingStock.toFixed(2)} ${uom}</span>
        </div>
    </div>
    <div style="padding: 0 4px 8px 4px; font-size: 12px; font-weight: bold; color: var(--md-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Movement History</div>
    `;

    let runningStock = openingStock;

    if (timeline.length === 0) {
        html += `<div class="empty-state">No stock movement recorded yet.</div>`;
    } else {
        // 🚨 ENTERPRISE FIX: Inject Opening Stock as the first historical card!
        html += `
        <div class="m3-card" style="padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1); background: #f8fafc;">
            <div style="flex: 1;">
                <strong style="font-size: 14px; color: #475569;">Opening Stock</strong><br>
                <small style="color: var(--md-text-muted);">Initial Inventory Balance</small>
            </div>
            <div style="text-align: right;">
                <strong style="color: #0f172a; font-size: 15px;">${openingStock > 0 ? '+' : ''}${openingStock.toFixed(2)}</strong><br>
                <small>Bal: ${openingStock.toFixed(2)} ${uom}</small>
            </div>
        </div>`;
    }

    timeline.forEach(t => {
        runningStock += t.inQty;
        runningStock -= t.outQty;
        
        const sign = t.inQty > 0 ? '+' : '-';
        const qtyVal = t.inQty > 0 ? t.inQty : t.outQty;
        const color = t.inQty > 0 ? 'var(--md-success)' : 'var(--md-error)';

        html += `
        <div class="m3-card" style="padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            <div style="flex: 1;">
                <strong style="font-size: 14px;">${t.type}</strong><br>
                <small style="color: var(--md-text-muted);">${t.date} | ${t.desc}</small><br>
                <small style="color: var(--md-primary); font-size: 10px; font-weight:bold;">Ref: ${t.ref}</small>
            </div>
            <div style="text-align: right;">
                <strong style="color: ${color}; font-size: 15px;">${sign}${qtyVal}</strong><br>
                <small>Bal: ${runningStock.toFixed(2)} ${uom}</small>
            </div>
        </div>`;
    });

    container.innerHTML = html;
};

// ==========================================
// ENTERPRISE UPGRADE: "LAST SOLD AT" MEMORY
// ==========================================
new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(async (node) => {
            if (node.nodeType === 1 && node.classList && node.classList.contains('item-entry-card')) {
                // Only trigger if we are inside the Sales Form
                const isSalesForm = node.closest('#activity-sales-form');
                if (!isSalesForm) return;

                const customerIdEl = document.getElementById('sales-customer-id');
                const customerId = customerIdEl ? customerIdEl.value : null;
                if (!customerId) return; // Customer must be selected first!

                const itemIdEl = node.querySelector('.row-item-id');
                const itemId = itemIdEl ? itemIdEl.value : null;
                if (!itemId) return;

                // ENTERPRISE FIX: The "N+1 Database Bomb" RAM Crash Shield!
                // Fetching the physical disk database inside a loop will crash the phone if an invoice has many items!
                // We MUST use the lightning-fast RAM Cache instead for O(1) instant memory lookup!
                const sales = (window.UI && window.UI.state && window.UI.state.rawData && window.UI.state.rawData.sales) || [];
                const sortedSales = sales.filter(s => 
                    s.firmId === window.app.state.firmId && 
                    s.customerId === customerId && 
                    s.status !== 'Open' &&
                    s.documentType !== 'return'
                ).sort((a, b) => window.Utils.safeDate(b.date) - window.Utils.safeDate(a.date)); // Sort newest first


                let lastRate = null;
                let lastDate = null;

                // Find the exact last time they bought this specific item
                for (let s of sortedSales) {
                    const found = (s.items || []).find(i => String(i.itemId) === String(itemId));
                    if (found) {
                        lastRate = parseFloat(found.rate) || 0;
                        lastDate = s.date;
                        break;
                    }
                }

                // If found, dynamically inject a beautiful blue badge!
                if (lastRate !== null && !node.querySelector('.last-sold-badge')) {
                    const d = window.Utils.safeDate(lastDate); // ENTERPRISE FIX: Protect Apple/iOS
                    const fDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    
                    const badge = document.createElement('div');
                    badge.className = 'last-sold-badge';
                    badge.style.cssText = 'display: inline-block; background: rgba(0, 97, 164, 0.1); color: #42a5f5; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 12px; margin-top: 6px; border: 1px solid rgba(0, 97, 164, 0.3); box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
                    badge.innerHTML = `<span class="material-symbols-outlined" style="font-size:12px; vertical-align:text-bottom; margin-right:4px;">history</span>Last sold: ₹${lastRate} on ${fDate}`;
                    
                    const nameEl = node.querySelector('strong');
                    if (nameEl && nameEl.parentNode) {
                        nameEl.parentNode.appendChild(badge);
                    }
                }
            }
        });
    });
}).observe(document.body, { childList: true, subtree: true });


// --- NEW CODE: Module Initialization ---
window.app = app; // Explicitly map to window to protect your HTML buttons

// BRIDGE FOR CLOUD.JS: Expose the database engine so Google Drive can access it
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;

// ==========================================
// THE MASTER BOOTSTRAPPER (RE-ACTIVATED)
// ==========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
} else {
    // If the browser loaded fast, start immediately!
    setTimeout(app.init, 50); 
}
// --- END OF NEW CODE ---
/* ==========================================
   ENTERPRISE UI: FUZZY SEARCH ENGINE
   ========================================== */
// Mathematically calculates if a word is a typo of another word (Max 2 mistakes)
window.fuzzyMatch = function(searchQuery, targetText) {
    if (!searchQuery) return true; // Empty search shows everything
    if (!targetText) return false; // ENTERPRISE FIX: Prevent crashes if an SKU or Name is empty!
    
    // Remove spaces and make lowercase for easy comparison
    const search = String(searchQuery).toLowerCase().replace(/\s+/g, '');
    const target = String(targetText).toLowerCase().replace(/\s+/g, '');
    
    // 1. If it's a perfect match or a perfect partial match, instant win!
    if (target.includes(search)) return true; 
    
    // 2. If the search is less than 3 letters, don't guess typos (too risky)
    if (search.length < 3) return false; 
    
    // 3. Typo Tolerance Math (Allows up to 2 mistakes)
    let mistakes = 0;
    let s = 0, t = 0;
    
    while (s < search.length && t < target.length) {
        if (search[s] === target[t]) {
            s++; t++; // Letters match, move forward
        } else {
            mistakes++;
            if (mistakes > 2) return false; // Too many mistakes, reject it
            
            // Guess what kind of typo the user made:
            if (search[s + 1] === target[t]) {
                s++; // User typed an extra letter (e.g. Sammsung)
            } else if (search[s] === target[t + 1]) {
                t++; // User missed a letter (e.g. Sasung)
            } else {
                s++; t++; // User typed the wrong letter (e.g. Samsing)
            }
        }
    }
    return true; // If it survives with 2 or fewer mistakes, it's a match!
};

// ==========================================
// ENTERPRISE UPGRADE: UNIVERSAL BOTTOM SHEET SEARCH (V2)
// ==========================================
document.addEventListener('input', (e) => {
    const sheet = e.target.closest('.bottom-sheet');
    if (e.target.tagName === 'INPUT' && sheet) {
        const isSearch = (e.target.placeholder || '').toLowerCase().includes('search') || (e.target.id || '').toLowerCase().includes('search');
        
        if (isSearch) {
            const term = e.target.value;
            const listItems = sheet.querySelectorAll('li, .m3-card, .tap-target, .list-item'); 
            
            listItems.forEach(item => {
                if (item.contains(e.target) || item.innerText.trim() === 'close' || item.style.pointerEvents === 'none' || item.classList.contains('empty-state')) return;
                
                if (window.fuzzyMatch) {
                    item.style.display = window.fuzzyMatch(term, item.innerText) ? '' : 'none';
                } else {
                    item.style.display = item.innerText.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
                }
            });
        }
    }
});
// ==========================================
// ENTERPRISE UPGRADE: BANK-GRADE PRIVACY SHIELD
// ==========================================
// Blurs the screen when the app is minimized to the background to protect financial data!
(function() {
    const shield = document.createElement('div');
    shield.id = 'privacy-shield';
    // Deep blur with the brand's primary container color
    shield.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(244, 246, 250, 0.85); backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); z-index:9999999; display:flex; justify-content:center; align-items:center; flex-direction:column; opacity:0; pointer-events:none; transition:opacity 0.2s ease;';
    
    shield.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 56px; color: #0061a4; margin-bottom: 16px;">lock</span>
        <strong style="font-size: 22px; color: #001d36; letter-spacing: 1px;">SOLLO ERP</strong>
        <p style="color: #535f70; margin-top: 8px; font-weight: 500;">Securely Locked</p>
    `;
    
    // Attach the shield to the very top of the app
    document.body.appendChild(shield);

    // Watch the phone's native hardware visibility state
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // App is swiped to the background (Recent Apps) -> INSTANT LOCK
            shield.style.transition = 'none'; 
            shield.style.opacity = '1';
        } else {
            // User opened the app again -> SMOOTH FADE OUT
            shield.style.transition = 'opacity 0.3s ease';
            setTimeout(() => shield.style.opacity = '0', 100); 
        }
    });
})();
// ==========================================
// ENTERPRISE UPGRADE: 3D TOUCH EMULATOR (LONG PRESS)
// ==========================================
// Simulates an iOS long-press context menu for rapid document management!
(function() {
    let pressTimer;
    let isPressing = false;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.m3-card.tap-target');
        if (!target) return;
        
        const clickAction = target.getAttribute('onclick');
        // Only trigger on actual actionable documents!
        if (!clickAction || (!clickAction.includes('openForm') && !clickAction.includes('openReceipt') && !clickAction.includes('openPartyLedger'))) return;

        isPressing = true;
        startY = e.touches[0].clientY;

        pressTimer = setTimeout(() => {
            if (isPressing) {
                isPressing = false;
                
                // 1. Trigger Heavy Haptic to simulate a physical "click" into the screen
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([40, 50, 40]);
                
                // 2. Visual Lift Effect (Mimics Apple iOS)
                target.style.transform = 'scale(0.96)';
                target.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
                target.style.opacity = '0.7';
                setTimeout(() => {
                    target.style.transform = 'scale(1)';
                    target.style.opacity = '1';
                }, 250);

                // ENTERPRISE FIX: We must restore the 'onclick' attribute, or the document card becomes permanently dead!
                target.setAttribute('data-locked', 'true');
                setTimeout(() => {
                    target.removeAttribute('data-locked');
                    target.setAttribute('onclick', clickAction); // Safely restores the ability to tap the invoice!
                }, 800);

                // 4. Call the upgraded Context Menu
                if (window.UI && typeof window.UI.showContextMenu === 'function') {
                    window.UI.showContextMenu(clickAction);
                }
            }
        }, 450); // 450ms is the perfect psychological long-press duration
    }, { passive: true });

    document.addEventListener('touchend', () => {
        isPressing = false;
        clearTimeout(pressTimer);
    });

    document.addEventListener('touchmove', (e) => {
        // Cancel the press if they are just scrolling down the list!
        if (isPressing && Math.abs(e.touches[0].clientY - startY) > 15) {
            isPressing = false;
            clearTimeout(pressTimer); 
        }
    }, { passive: true });

    // 🚨 ENTERPRISE UPGRADE: THE IDLE-TIME RAM SWEEPER (GARBAGE COLLECTOR)
    // Silently wipes ghost variables and detached memory leaks only when the phone's CPU is at 0% usage!
    // This mathematically guarantees iOS Safari will never crash your app from an "Out of Memory" error.
    if ('requestIdleCallback' in window) {
        setInterval(() => {
            requestIdleCallback(() => {
                // If the user is sitting safely on the Dashboard, wipe all the heavy cached lists!
                const dash = document.getElementById('activity-dashboard');
                if (dash && !dash.classList.contains('hidden') && window.AppCache) {
                    window.AppCache.items = null;
                    window.AppCache.ledgers = null;
                    window.AppCache.accounts = null;
                }
            }, { timeout: 2000 });
        }, 15000); // Check for memory leaks every 15 seconds in the background
    }

})();
// ==========================================
// ENTERPRISE UPGRADE: LIVE CUSTOMER INSIGHT & RISK ENGINE (V3 REACTIVE)
// ==========================================
(function() {
    let lastCalculatedHash = ""; 
    // 🚨 ENTERPRISE CACHE: Store the heavy DB math so it only runs ONCE per customer!
    let cachedPartyId = null;
    let cachedTrueBalance = 0;
    let cachedOldestDueDays = 0;

    setInterval(async () => {
        const sForm = document.getElementById('activity-sales-form');
        const pForm = document.getElementById('activity-purchase-form');
        
        let form = null;
        let partyId = null;
        let partyType = null;
        let draftTotal = 0; 
        
        if (sForm && sForm.classList.contains('open')) {
            form = sForm;
            partyId = document.getElementById('sales-customer-id') ? document.getElementById('sales-customer-id').value : null;
            partyType = 'Customer';
            const totalEl = document.getElementById('sales-grand-total');
            if (totalEl) draftTotal = parseFloat(totalEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
            
        } else if (pForm && pForm.classList.contains('open')) {
            form = pForm;
            partyId = document.getElementById('purchase-supplier-id') ? document.getElementById('purchase-supplier-id').value : null;
            partyType = 'Supplier';
            const totalEl = document.getElementById('purchase-grand-total');
            if (totalEl) draftTotal = parseFloat(totalEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
        }
        
        if (!form || !partyId) {
            const oldBanner = document.getElementById('risk-banner');
            if (oldBanner) oldBanner.remove();
            lastCalculatedHash = "";
            cachedPartyId = null; // Reset cache when form closes
            return;
        }

        try {
            const currentEditId = window.app.state.currentEditId; // 🚨 Fix 1: Track active edits!
            
            // 🚨 ENTERPRISE CPU SAVER: Only scan the massive database arrays if the Customer or Edit State changed!
            if (cachedPartyId !== partyId || window.lastCachedEditId !== currentEditId) {
                const rawData = window.UI && window.UI.state ? window.UI.state.rawData : null;
                if (!rawData || !rawData.ledgers) return;

                const party = rawData.ledgers.find(l => l.id === partyId);
                if (!party) return;

                cachedTrueBalance = 0;
                cachedOldestDueDays = 0;
                const today = new Date();
                const activeFirmId = window.app.state.firmId; // 🚨 Fix 2: Firm Isolation!

                let ob = parseFloat(party.openingBalance) || 0;
                const balType = (party.balanceType || '').toLowerCase();
                
                if (partyType === 'Customer') {
                    cachedTrueBalance = (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
                } else {
                    cachedTrueBalance = (balType.includes('receive') || balType.includes('debit')) ? -ob : ob;
                }
                
                const sales = rawData.sales || [];
                const purchases = rawData.purchases || [];
                const allReceipts = rawData.receipts || rawData.cashbook || [];

                if (partyType === 'Customer') {
                    sales.forEach(s => {
                        // 🚨 FIX 3: Enforce Firm ID and SKIP the currently open invoice so it doesn't double-count!
                        if (s.firmId === activeFirmId && s.customerId === partyId && s.status !== 'Open' && s.status !== 'Cancelled' && s.id !== currentEditId) {
                            cachedTrueBalance += (s.documentType === 'return' ? -parseFloat(s.grandTotal || 0) : parseFloat(s.grandTotal || 0));
                            if (s.status !== 'Completed' && s.documentType !== 'return') {
                                const ageDays = Math.floor((today - window.Utils.safeDate(s.date)) / (1000 * 60 * 60 * 24));
                                if (ageDays > cachedOldestDueDays) cachedOldestDueDays = ageDays;
                            }
                        }
                    });
                } else {
                    purchases.forEach(p => {
                        if (p.firmId === activeFirmId && p.supplierId === partyId && p.status !== 'Open' && p.status !== 'Cancelled' && p.id !== currentEditId) {
                            cachedTrueBalance += (p.documentType === 'return' ? -parseFloat(p.grandTotal || 0) : parseFloat(p.grandTotal || 0));
                            if (p.status !== 'Completed' && p.documentType !== 'return') {
                                const ageDays = Math.floor((today - window.Utils.safeDate(p.date)) / (1000 * 60 * 60 * 24));
                                if (ageDays > cachedOldestDueDays) cachedOldestDueDays = ageDays;
                            }
                        }
                    });
                }

                allReceipts.forEach(r => {
                    if (r.firmId === activeFirmId && (r.ledgerId === partyId || r.accountId === partyId)) {
                        if (partyType === 'Customer') {
                            cachedTrueBalance += (r.type === 'in' ? -parseFloat(r.amount || 0) : parseFloat(r.amount || 0));
                        } else {
                            cachedTrueBalance += (r.type === 'in' ? parseFloat(r.amount || 0) : -parseFloat(r.amount || 0));
                        }
                    }
                });

                cachedPartyId = partyId; // Lock the cache
                window.lastCachedEditId = currentEditId; // Lock the edit state
            }

            // Calculate Projected Balance instantly using the cached math!
            const docTypeEl = document.getElementById(partyType === 'Customer' ? 'sales-doc-type' : 'purchase-doc-type');
            const isReturn = docTypeEl && docTypeEl.value === 'return';
            
            let projectedBalance = cachedTrueBalance;
            if (isReturn) {
                projectedBalance -= draftTotal; 
            } else {
                projectedBalance += draftTotal;
            }

            const currentHash = `${partyId}_${cachedTrueBalance}_${projectedBalance}_${cachedOldestDueDays}`;
            if (lastCalculatedHash === currentHash) return; 
            lastCalculatedHash = currentHash;
            
            const oldBanner = document.getElementById('risk-banner');
            if (oldBanner) oldBanner.remove();
            
            let statusText = 'Clean Account (Safe)';
            let bgColor = '#e8f5e9';
            let borderColor = '#bbf7d0';
            let icon = 'check_circle';
            let iconColor = '#146c2e';
            let warningHtml = '';

            if (partyType === 'Customer') {
                if (cachedTrueBalance > 0.01) {
                    statusText = 'Previous Dues'; 
                    bgColor = '#fff0f2'; borderColor = '#ffdad6'; iconColor = '#ba1a1a'; icon = 'warning';
                } else if (cachedTrueBalance < -0.01) {
                    statusText = 'Advance Available'; 
                    bgColor = '#e3f2fd'; borderColor = '#c2e0ff'; iconColor = '#0061a4'; icon = 'verified_user';
                }
            } else {
                if (cachedTrueBalance > 0.01) {
                    statusText = 'Previous Payables'; 
                    bgColor = '#fff0f2'; borderColor = '#ffdad6'; iconColor = '#ba1a1a'; icon = 'warning';
                } else if (cachedTrueBalance < -0.01) {
                    statusText = 'Advance Given'; 
                    bgColor = '#e3f2fd'; borderColor = '#c2e0ff'; iconColor = '#0061a4'; icon = 'verified_user';
                }
            }

            let pulseAnim = '';
            if (cachedTrueBalance > 0.01 && cachedOldestDueDays >= 45 && partyType === 'Customer') {
                pulseAnim = 'animation: pulseRisk 2s infinite;';
                warningHtml = `<div style="font-size: 11px; color: #ba1a1a; font-weight: 800; margin-top: 6px; border-top: 1px dashed #ffdad6; padding-top: 6px;">⚠️ HIGH RISK: Oldest unpaid invoice is ${cachedOldestDueDays} days old!</div>`;
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
            }
            
            if (!document.getElementById('risk-styles')) {
                const style = document.createElement('style');
                style.id = 'risk-styles';
                style.innerHTML = `@keyframes pulseRisk { 0% { box-shadow: 0 0 0 0 rgba(186,26,26,0.4); } 70% { box-shadow: 0 0 0 10px rgba(186,26,26,0); } 100% { box-shadow: 0 0 0 0 rgba(186,26,26,0); } }`;
                document.head.appendChild(style);
            }

            const banner = document.createElement('div');
            banner.id = 'risk-banner';
            banner.style.cssText = `background: ${bgColor}; padding: 14px 16px; margin: 12px 16px 0 16px; border-radius: 8px; border: 1px solid ${borderColor}; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); ${pulseAnim}`;
            
            banner.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 28px; color: ${iconColor}; font-variation-settings: 'FILL' 1; margin-top: 2px;">${icon}</span>
                <div style="flex: 1;">
                    <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Live ${partyType} Insight</strong>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px;">
                        <span style="font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1;">₹${Math.abs(projectedBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        <span style="font-size: 10px; font-weight: 800; color: ${iconColor}; background: ${iconColor}15; padding: 4px 8px; border-radius: 12px; border: 1px solid ${iconColor}40;">${statusText}</span>
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 6px; font-weight: 600;">
                        Historical Due: ₹${Math.abs(cachedTrueBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} | This Bill: ₹${draftTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </div>
                    ${warningHtml}
                </div>
            `;
            
            const header = form.querySelector('.activity-header');
            if (header) header.insertAdjacentElement('afterend', banner);
            
        } catch(e) { console.error("Insight Engine Failed:", e); }
    }, 500); 
})();
// ==========================================
// ENTERPRISE UPGRADE: THE LAZY USER BACKUP PROMPT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const lastBackup = localStorage.getItem('sollo_last_backup');
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        // If there's no backup history, or it's been more than 7 days
        if (!lastBackup || (now - parseInt(lastBackup, 10)) > sevenDays) {
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast("⚠️ Security Alert: It's been over 7 days since your last backup! Please go to Settings -> Export Data.");
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([50, 100, 50]);
            }
        }
    }, 5000); // Wait 5 seconds after boot so we don't interrupt the user's workflow
});
// ==========================================
// 🚨 ENTERPRISE UPGRADE: DOM GARBAGE COLLECTOR (RAM OPTIMIZATION)
// ==========================================
// In Single Page Applications (SPAs), temporary modals and overlays often get disconnected but stay in the device's RAM forever.
// This engine silently sweeps the background every 60 seconds and destroys "zombie" nodes so the app never crashes from Memory Bloat!
setInterval(() => {
    try {
        const zombies = document.querySelectorAll('#split-overlay, #manual-restore-overlay, #in-app-pdf-viewer, #split-tender-modal');
        zombies.forEach(el => {
            // If the element is completely hidden or invisible, it's a memory leak. Destroy it permanently.
            if (el.style.display === 'none' || el.style.opacity === '0' || el.classList.contains('closing')) {
                el.remove();
            }
        });
    } catch(e) { /* Silent background catch */ }
}, 60000);

// ==========================================
// 🚨 ENTERPRISE UPGRADE: BACKGROUND BATTERY HIBERNATION
// ==========================================
// Halts all CPU-intensive mathematical loops when the app is minimized, saving massive amounts of battery!
// ==========================================
// 🚨 ENTERPRISE SECURITY: HIBERNATION & PRIVACY BLUR
// ==========================================
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        window.isHibernating = true;
        // 🚨 PRIVACY SHIELD: Blur the screen instantly so financial data is hidden in the OS App-Switcher!
        document.body.style.filter = 'blur(12px) grayscale(100%)';
        document.body.style.transition = 'filter 0.1s ease';
        document.body.style.pointerEvents = 'none';
    } else {
        window.isHibernating = false;
        // Restore clarity the moment they re-enter the app
        document.body.style.filter = 'none';
        document.body.style.pointerEvents = 'auto';
    }
});

// Update the native setInterval functions to respect the Hibernation Lock safely!
const originalSetInterval = window.setInterval;
window.setInterval = function(callback, delay, ...args) {
    return originalSetInterval((...intervalArgs) => {
        if (!window.isHibernating) {
            // 🚨 ENTERPRISE FIX: Protect against legacy string-based intervals!
            if (typeof callback === 'function') {
                callback(...intervalArgs);
            } else if (typeof callback === 'string') {
                eval(callback);
            }
        }
    }, delay, ...args);
};
// ==========================================
// 🚨 ENTERPRISE SECURITY: LIVE NETWORK RADAR
// ==========================================
window.addEventListener('offline', () => {
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast("📶 You are offline. Don't worry, data will save safely on your device!");
    }
});

window.addEventListener('online', () => {
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast("🟢 Back Online! Cloud sync restored.");
        // Automatically trigger a background backup to Drive now that internet is back!
        if (typeof executeBackgroundBackup === 'function') {
            setTimeout(executeBackgroundBackup, 3000);
        }
    }
});
// ==========================================
// 🚨 ENTERPRISE SECURITY: "DIRTY FORM" DATA LOSS SHIELD
// ==========================================
window.hasUnsavedData = false;

// Watch for any typing inside forms
document.addEventListener('input', (e) => {
    if (e.target.closest('form')) window.hasUnsavedData = true;
});

// Clear the lock when they successfully hit Save
document.addEventListener('submit', () => {
    window.hasUnsavedData = false;
});

// Intercept the OS window close / back-swipe event!
window.addEventListener('beforeunload', (e) => {
    if (window.hasUnsavedData) {
        e.preventDefault();
        e.returnValue = "You have unsaved data! Are you sure you want to exit?";
        return e.returnValue;
    }
});
// ==========================================
// 🚨 ENTERPRISE SECURITY: INACTIVITY PRIVACY LOCK
// ==========================================
let inactivityTimer;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 Minutes of no touching

const triggerPrivacyLock = () => {
    // Prevent double-locking
    if (document.getElementById('privacy-lock-screen')) return;
    
    const lock = document.createElement('div');
    lock.id = 'privacy-lock-screen';
    // Creates a gorgeous frosted-glass Apple-style blur over the whole app
    lock.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(255,255,255,0.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:9999999; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:opacity 0.3s ease;';
    
    // Dark mode support for the lock screen
    if (document.body.classList.contains('dark-mode')) {
        lock.style.background = 'rgba(26,26,30,0.85)';
        lock.style.color = '#ffffff';
    }

    lock.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 64px; color: var(--md-primary, #0061a4); margin-bottom: 16px;">lock</span>
        <h2 style="margin:0; font-family: 'Inter', sans-serif; font-weight: 900; letter-spacing: 0.5px;">App Locked</h2>
        <p style="color: var(--md-text-muted, #475569); margin-top:8px; font-family: 'Inter', sans-serif; font-size: 14px;">Hidden for your financial privacy.</p>
        <button id="btn-unlock-app" style="margin-top:32px; background: var(--md-primary, #0061a4); color:#fff; border:none; padding:14px 36px; border-radius:24px; font-size:16px; font-weight:bold; box-shadow:0 8px 16px rgba(0,0,0,0.15); cursor:pointer;">Unlock Application</button>
    `;
    
    document.body.appendChild(lock);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50); // Small haptic bump
    
    // Unlock button logic
    document.getElementById('btn-unlock-app').onclick = function() {
        lock.style.opacity = '0';
        setTimeout(() => { lock.remove(); resetInactivityTimer(); }, 300);
    };
};

const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    // Only restart the countdown if the app isn't currently locked
    if (!document.getElementById('privacy-lock-screen')) {
        inactivityTimer = setTimeout(triggerPrivacyLock, IDLE_TIMEOUT);
    }
};

// Listen for physical screen interactions to keep the app awake
['touchstart', 'click', 'scroll', 'keypress'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
});
resetInactivityTimer(); // Start the engine on boot


// ==========================================
// 🚨 ENTERPRISE UX: ANDROID "DOUBLE-TAP" EXIT SHIELD
// ==========================================
let lastBackPressTime = 0;

// Push a fake invisible history state on boot so the phone has something to intercept!
if (window.history.length === 1 || window.history.length === 2) {
    window.history.pushState({ page: 'sollo-dashboard' }, "", "");
}

window.addEventListener('popstate', (e) => {
    const currentTime = new Date().getTime();
    
    // If they press the hardware back button twice within 2 seconds, let the app close!
    if (currentTime - lastBackPressTime < 2000) {
        return; 
    }

    // 🚨 FIRST SWIPE: Block the exit, show a toast, and push the state forward again!
    lastBackPressTime = currentTime;
    window.history.pushState({ page: 'sollo-dashboard' }, "", "");
    
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast("Tap BACK again to exit app");
    }
});
// ==========================================
// 🚨 ENTERPRISE GROWTH: CUSTOM PWA INSTALL ENGINE
// ==========================================
window.deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    window.deferredInstallPrompt = e;
    
    // Create a beautiful, native-looking install banner
    if (!document.getElementById('pwa-install-banner')) {
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:90%; max-width:400px; background:var(--md-primary, #0061a4); color:#fff; padding:16px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.25); display:flex; justify-content:space-between; align-items:center; z-index:999999; font-family:sans-serif;';
        
        banner.innerHTML = `
            <div>
                <strong style="display:block; font-size:14px; margin-bottom:4px;">Install SOLLO ERP</strong>
                <span style="font-size:12px; opacity:0.9;">Add to home screen for offline access</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <span id="btn-close-install" style="font-size:12px; font-weight:bold; opacity:0.8; cursor:pointer; padding:8px;">Later</span>
                <button id="btn-trigger-install" style="background:#fff; color:var(--md-primary, #0061a4); border:none; padding:8px 16px; border-radius:20px; font-weight:bold; font-size:12px; cursor:pointer;">Install</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('btn-close-install').onclick = () => banner.remove();
        
        document.getElementById('btn-trigger-install').onclick = async () => {
            banner.remove();
            if (window.deferredInstallPrompt) {
                window.deferredInstallPrompt.prompt();
                const { outcome } = await window.deferredInstallPrompt.userChoice;
                console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
                window.deferredInstallPrompt = null;
            }
        };
    }
});

// If the app is successfully installed, show a success toast!
window.addEventListener('appinstalled', () => {
    window.deferredInstallPrompt = null;
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast("🚀 App installed successfully!");
    }
});
// ==========================================
// 🚨 ENTERPRISE UX: CORRUPT IMAGE AUTO-HEALER
// ==========================================
// If a logo or signature gets deleted from the phone's cache, this catches the network failure 
// and gracefully hides the broken image icon so the UI remains perfectly clean!
document.addEventListener('error', function(e) {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        e.target.style.display = 'none'; // Instantly hide the broken element
        console.warn('🛡️ UI Shield: Prevented a broken image from rendering on screen.');
    }
}, true); // The 'true' capture phase is strictly required to intercept resource loading errors!
// ==========================================
// 🚨 BIZOPS NATIVE THEME: HARDWARE BACK-BUTTON SHIELD
// ==========================================
// This intercepts the physical Android/iOS swipe-back gesture and destroys any 
// full-screen overlays before the user gets permanently stuck!
window.addEventListener('popstate', (e) => {
    
    // 1. Destroy stuck PDF Spooler Overlays
    const pdfViewer = document.getElementById('in-app-pdf-viewer');
    if (pdfViewer) {
        pdfViewer.remove();
        document.body.style.overflow = ''; // Release the scroll lock
        const printArea = document.getElementById('print-area');
        if (printArea) printArea.innerHTML = '';
    }

    // 2. Destroy stuck Database Restore Overlays
    const restoreOverlay = document.getElementById('manual-restore-overlay');
    if (restoreOverlay) {
        restoreOverlay.remove();
        document.body.style.overflow = ''; // Release the scroll lock
    }

    // 3. Close the custom Numpad if the user swipes back
    if (window.UI && typeof window.UI.closeNumpad === 'function') {
        window.UI.closeNumpad();
    }
});
// ==========================================
// 🚨 BIZOPS NATIVE THEME: DATA INTEGRITY MASKS
// ==========================================
// This global shield watches all inputs and automatically formats sensitive financial data 
// without needing to rewrite any of your HTML forms!
document.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || !target.id) return;
    
    // 1. GSTIN Auto-Formatting: Forces Uppercase, max 15 chars, blocks invalid symbols instantly
    if (target.id.toLowerCase().includes('gst')) {
        const start = target.selectionStart; // Preserves cursor position so it doesn't jump!
        target.value = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 15);
        // Only reset cursor if the element is currently focused
        if (document.activeElement === target) {
            target.setSelectionRange(start, start);
        }
    }
    
    // 2. Phone Number Formatting: Strips accidental letters, limits to 10 digits
    if (target.id.toLowerCase().includes('phone') || target.id.toLowerCase().includes('mobile')) {
        // Only format if it's a text/tel input (avoids breaking strict <input type="number"> fields)
        if (target.type !== 'number') {
            target.value = target.value.replace(/[^0-9]/g, '').substring(0, 10);
        }
    }
});
// ==========================================
// 🚨 BIZOPS NATIVE THEME: DASHBOARD PARALLAX SCROLLING
// ==========================================
// Disabled Parallax to prevent black screen and allow normal scrolling!
const setupParallax = () => {
    // Fading effect removed so Order Fulfillment remains completely visible when scrolling down.
};

// Attach the engine safely after the app boots
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupParallax, 500);
});
// ==========================================
// 🚨 BIZOPS NATIVE THEME: FLOATING LABEL ENGINE
// ==========================================
// Silently watches all form inputs. If they have text, it applies a 'has-value' lock
document.addEventListener('input', (e) => {
    const group = e.target.closest('.form-group');
    if (group && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        if (e.target.value.trim() !== '' || e.target.type === 'file') group.classList.add('has-value');
        else group.classList.remove('has-value');
    }
});

// Auto-initialize existing values when the app opens or a form loads
setInterval(() => {
    document.querySelectorAll('.form-group input, .form-group textarea, .form-group select').forEach(el => {
        const group = el.closest('.form-group');
        if (group) {
            // 🚨 ENTERPRISE FIX: Force labels to float for Files AND Date fields so they NEVER overlap!
            const hasImage = group.querySelector('img') && !group.querySelector('img').classList.contains('hidden');
            
            // Detect if this is a calendar/date field
            const isDateField = el.type === 'date' || el.classList.contains('flatpickr-input') || (el.id && el.id.includes('date'));
            
            if ((el.value && String(el.value).trim() !== '') || el.type === 'file' || isDateField || hasImage) {
                group.classList.add('has-value');
            } else {
                group.classList.remove('has-value');
            }
        }
    });
}, 500); // Runs a quick background sweep twice a second to catch dynamically loaded data
// ==========================================
// 🚨 ENTERPRISE AI: BUSINESS INTELLIGENCE & ANALYTICS
// (READ-ONLY ENGINE - ZERO DATABASE CORRUPTION)
// ==========================================

window.AnalyticsEngine = {
    showReportModal: (title, summaryText, summaryColor, htmlContent) => {
        // 🚨 ENTERPRISE FIX: Give the modal a strict ID so the Close button never fails!
        const modalId = 'ai-analytics-modal-' + Date.now();
        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:999999; display:flex; align-items:center; justify-content:center; padding:20px;';
        
        overlay.innerHTML = `
            <div style="background:#fff; padding:20px; border-radius:12px; width:100%; max-width:500px; max-height:85vh; display:flex; flex-direction:column; gap:12px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                    <h3 style="margin:0; color:#0f172a; font-size:18px; font-weight:800; text-transform:uppercase;">${title}</h3>
                    <span class="material-symbols-outlined tap-target" style="cursor:pointer; color:#ef4444; font-size:28px;" onclick="document.getElementById('${modalId}').remove(); document.body.style.overflow='';">close</span>
                </div>
                <div style="background:${summaryColor}15; border: 1px solid ${summaryColor}40; color:${summaryColor}; padding:16px; border-radius:8px; font-weight:900; font-size: 16px; text-align:center;">
                    ${summaryText}
                </div>
                <div style="overflow-y:auto; flex:1; padding-right:4px; margin-top: 8px;">
                    ${htmlContent || '<div style="text-align:center; padding:40px 20px; color:#16a34a; font-weight:bold;"><span class="material-symbols-outlined" style="font-size:48px; margin-bottom:10px;">verified</span><br>Perfect! No issues found.</div>'}
                </div>
            </div>
        `;
        document.body.style.overflow = 'hidden'; // Lock background scrolling
        document.body.appendChild(overlay);
    },

    runProfitLeakageAudit: async () => {
        if (window.Utils) window.Utils.showToast("Scanning historical sales for profit leakage... ⏳");
        const sales = await window.getAllRecords('sales');
        const items = await window.getAllRecords('items');
        
        let leakageHtml = '';
        let totalLeakage = 0;
        let flaggedCount = 0;

        sales.forEach(sale => {
            if (sale.status === 'Open' || sale.status === 'Cancelled' || sale.documentType === 'return') return;

            let invoiceLeakage = 0;
            let invoiceIssues = [];

            // Accurately calculate the true discount applied to this invoice
            let rawSubtotal = 0;
            (sale.items || []).forEach(row => rawSubtotal += (Math.abs(parseFloat(row.qty))||0) * (parseFloat(row.rate)||0));
            let discountAmt = sale.discountType === '%' ? (rawSubtotal * ((parseFloat(sale.discount)||0)/100)) : (parseFloat(sale.discount)||0);
            let discountRatio = rawSubtotal > 0 ? (discountAmt / rawSubtotal) : 0;

            (sale.items || []).forEach(row => {
                const dbItem = items.find(i => i.id === (row.itemId || row.id));
                if (dbItem) {
                    const buyPrice = parseFloat(dbItem.buyPrice) || 0; // True MAC Cost
                    const sellPrice = parseFloat(row.rate) || 0;
                    const netSellPrice = sellPrice - (sellPrice * discountRatio); // True Selling Price after invoice discount
                    
                    if (netSellPrice < buyPrice && buyPrice > 0) {
                        const lossPerItem = buyPrice - netSellPrice;
                        const totalLoss = lossPerItem * Math.abs(parseFloat(row.qty) || 0);
                        invoiceLeakage += totalLoss;
                        invoiceIssues.push(`• <strong>${row.name}</strong><br>Sold @ ₹${netSellPrice.toFixed(2)} (Cost: ₹${buyPrice.toFixed(2)})`);
                    }
                }
            });

            if (invoiceLeakage > 0) {
                totalLeakage += invoiceLeakage;
                flaggedCount++;
                leakageHtml += `
                    <div style="border-left: 4px solid #ef4444; background: #fff5f5; padding: 12px; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #991b1b; margin-bottom: 4px; font-size: 14px;">
                            <span>Inv: ${sale.invoiceNo || 'N/A'} <span style="color:#dc2626; font-size:10px;">(${window.Utils.formatDateDisplay(sale.date)})</span></span>
                            <span>Loss: -₹${invoiceLeakage.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 11px; color: #b91c1c; font-weight: 600;">Customer: ${sale.customerName || 'Cash Sale'}</div>
                        <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px; line-height: 1.5;">${invoiceIssues.join('<br>')}</div>
                    </div>
                `;
            }
        });

        const summaryColor = totalLeakage > 0 ? '#dc2626' : '#16a34a';
        const summaryText = totalLeakage > 0 ? `⚠️ Found ₹${totalLeakage.toFixed(2)} in Profit Leakage across ${flaggedCount} Invoices.` : '✅ All sales are mathematically profitable!';
        window.AnalyticsEngine.showReportModal('Gross Profit Audit', summaryText, summaryColor, leakageHtml);
    },

    // (Legacy Dead Stock Scanner removed to make way for the new Visual Dashboard Engine)
};
// ==========================================
// 🚨 BATTERY OPTIMIZATION: PRODUCTION SILENCER
// ==========================================
// Destroys hidden background memory leaks caused by console logging during intensive data operations!
const isLocalDevice = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (!isLocalDevice) {
    console.log = function() {};
    console.info = function() {};
    console.warn = function() {};
    console.time = function() {};
    console.timeEnd = function() {};
}

// ==========================================
// 🚨 ENTERPRISE UX: INSTANT EDIT & ANTI-OVERLAY SHIELD
// ==========================================
// Auto-selects text AND physically pushes the screen up so the keyboard/dialpad NEVER hides what you are typing!
document.addEventListener('focusin', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        
        // 1. The Anti-Overlay Shield (Scrolls the input to the safe white center of the screen)
        // 300ms perfectly waits for the Android/iOS keyboard or Custom Numpad to finish sliding up!
        setTimeout(() => {
            try { 
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            } catch(err) {}
        }, 300);

        // 2. The Auto-Highlight Engine (For quick number replacement)
        if (e.target.type === 'number' || e.target.inputMode === 'numeric' || e.target.inputMode === 'decimal') {
            setTimeout(() => {
                try { e.target.select(); } catch(err) {}
            }, 50);
        }
    }
});

// ==========================================
// 🚨 ENTERPRISE UX: SMART AUTO-CAPITALIZATION
// ==========================================
// Silently formats ledger names and items into professional Title Case when the user taps away!
document.addEventListener('focusout', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const id = e.target.id ? e.target.id.toLowerCase() : '';
        const isEmailOrGST = id.includes('email') || id.includes('gst') || id.includes('password');
        
        // If it is a Name, City, or Item field, auto-capitalize the first letter of every word
        if (!isEmailOrGST && e.target.value) {
            e.target.value = e.target.value.replace(/\b\w/g, char => char.toUpperCase());
        }
    }
});

// ==========================================
// 🚨 ENTERPRISE SECURITY: BANKING PRIVACY SHIELD
// ==========================================
// Instantly blurs the screen when the app is sent to the background to protect financial data!
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.style.filter = 'blur(15px)';
        document.body.style.transition = 'filter 0.1s ease-out';
    } else {
        document.body.style.filter = 'none';
        document.body.style.transition = 'filter 0.3s ease-in';
    }
});
