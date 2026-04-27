// ==========================================
// SOLLO ERP - UI & ANIMATION CONTROLLER (v6.1 Enterprise)
// ==========================================

// ENTERPRISE FIX: Securely import the database engine to prevent background crashes!
import { getRecordById, getAllRecords, getKhataStatement } from './db.js?v=6.1';

const UI = {

    // --- PREMIUM UX: NATIVE HAPTICS & SCROLL NAV ---
    triggerHaptic: (type = 'light') => {
        if (!navigator.vibrate) return;
        if (type === 'light') navigator.vibrate(10);
        if (type === 'medium') navigator.vibrate(25);
        if (type === 'heavy') navigator.vibrate([30, 50, 30]);
    },

    initPremiumUX: () => {
        // ENTERPRISE UPGRADE: Lightning-Fast Data Entry!
        // Automatically highlights the entire number when a user taps a quantity or rate box.
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && (e.target.type === 'number' || e.target.inputMode === 'decimal')) {
                // A 50ms delay ensures mobile keyboards don't instantly un-select the text
                setTimeout(() => e.target.select(), 50);
            }
        });

        // 1. Universal Auto-Haptics (Zero HTML changes required!)
        document.addEventListener('pointerdown', (e) => {
            const target = e.target.closest('.tap-target, .btn-primary, .btn-primary-small, .list-view li, .nav-item, .chip');
            if (target) {
                if (target.classList.contains('btn-primary') || target.id === 'main-fab') {
                    UI.triggerHaptic('medium'); // Stronger feel for main buttons
                } else {
                    UI.triggerHaptic('light'); // Soft tick for lists and menus
                }
            }
        }, { passive: true });
        
        // --- ENTERPRISE FIX: SMART MOBILE KEYBOARDS ---
        // Automatically forces native Number Pads and "Next" buttons across the entire app
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.setAttribute('inputmode', 'decimal');
            input.setAttribute('enterkeyhint', 'next');
        });
        
        // Forces the pure phone dialer keyboard for all phone number inputs
        document.querySelectorAll('input[id*="phone"], input[name*="phone"]').forEach(input => {
            input.setAttribute('type', 'tel');
            input.setAttribute('inputmode', 'tel');
            input.setAttribute('enterkeyhint', 'next');
        });
        
        // Changes the default mobile "Go/Search" button to a smooth "Next" button
        document.querySelectorAll('input[type="text"], input[type="date"]').forEach(input => {
            if(!input.getAttribute('enterkeyhint')) input.setAttribute('enterkeyhint', 'next');
        });
        
        // --- ENTERPRISE FIX: PREMIUM EMPTY STATES ---
        // Dynamically upgrades all boring blank text into beautiful M3 graphic cards!
        const emptyStyle = document.createElement('style');
        emptyStyle.innerHTML = `
            .empty-state {
                display: flex !important; flex-direction: column !important; align-items: center !important; 
                justify-content: center !important; padding: 48px 20px !important; text-align: center !important; 
                background: var(--md-surface) !important; border-radius: 16px !important; 
                border: 2px dashed var(--md-outline-variant) !important; margin: 16px 0 !important; 
                color: var(--md-on-surface) !important; font-weight: 500 !important; font-size: 15px !important;
            }
            .empty-state::before {
                content: 'inbox'; font-family: 'Material Symbols Outlined';
                font-size: 48px; color: var(--md-primary); margin-bottom: 16px;
                background: var(--md-primary-container); padding: 16px; border-radius: 50%;
            }
        `;
        document.head.appendChild(emptyStyle);
    },

    // --- NEW CODE: DARK MODE CONTROLLERS ---
    initTheme: () => {
        const isDark = localStorage.getItem('sollo_theme') === 'dark';
        if (isDark) {
            document.body.classList.add('dark-mode');
            const metaTheme = document.getElementById('meta-theme-color');
            if (metaTheme) metaTheme.setAttribute('content', '#111315'); // Matches dark background
        }
    },

    toggleTheme: (event) => {
        // ENTERPRISE FIX: Prevent rapid-tap crashes by locking the animation state
        if (UI.isAnimatingTheme) return; 
        
        const applyTheme = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('sollo_theme', isDark ? 'dark' : 'light');
            UI.resetStatusBarColor();
            if (window.Utils) window.Utils.showToast(isDark ? "Dark Mode Enabled 🌙" : "Light Mode Enabled ☀️");
        };

        if (!document.startViewTransition || !event || !event.clientX) { applyTheme(); return; }

        UI.isAnimatingTheme = true; // Lock the animation

        const x = event.clientX;
        const y = event.clientY;
        const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const isDark = !document.body.classList.contains('dark-mode');

        const transition = document.startViewTransition(() => applyTheme());

        transition.ready.then(() => {
            const clipPath = [ `circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)` ];
            const animation = document.documentElement.animate(
                { clipPath: isDark ? clipPath : [...clipPath].reverse() },
                { duration: 600, easing: "ease-out", pseudoElement: isDark ? "::view-transition-new(root)" : "::view-transition-old(root)" }
            );
            
            // Unlock safely when the cinematic transition completely finishes
            animation.onfinish = () => { UI.isAnimatingTheme = false; };
        }).catch(() => {
            // Failsafe unlock if the browser forcibly aborts the transition
            UI.isAnimatingTheme = false; 
        });
    },

    triggerError: (elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.classList.remove('shake-error');
            void el.offsetWidth; 
            el.classList.add('shake-error');
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([40, 50, 40]); 
            setTimeout(() => el.classList.remove('shake-error'), 500);
        }
    },

    resetStatusBarColor: () => {
        const isDark = document.body.classList.contains('dark-mode');
        const metaTheme = document.getElementById('meta-theme-color');
        if (metaTheme) metaTheme.setAttribute('content', isDark ? '#111315' : '#0061a4');
    },

    setStatusBarColor: (color) => {
        const metaTheme = document.getElementById('meta-theme-color');
        if (metaTheme) metaTheme.setAttribute('content', color);
    },

    safeUpdateDOM: (container, htmlContent) => {
        if (!container) return;
        // FIX: Removed the nested animation that was colliding with the Tab Switcher
        // This instantly stops the Background Crash popup!
        container.innerHTML = htmlContent;
    },

    // --- NATIVE SCROLLING (NO VIRTUALIZATION BUGS) ---
    renderVirtualList: (container, dataArray, renderRowFn, emptyStateHTML) => {
        if (!container) return;
        if (!dataArray || dataArray.length === 0) {
            container.innerHTML = emptyStateHTML;
            return;
        }
        
        // ENTERPRISE FIX: True DOM Pagination with Scroll Preservation!
        let currentIndex = 0;
        const chunkSize = 50;
        
        container.innerHTML = ''; // Clear container exactly once at start
        
        const renderNextChunk = () => {
            const chunk = dataArray.slice(currentIndex, currentIndex + chunkSize);
            const chunkHTML = chunk.map(item => renderRowFn(item)).join('');
            
            // Safely inject new DOM nodes without destroying existing elements or losing scroll position
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chunkHTML;
            while(tempDiv.firstChild) container.appendChild(tempDiv.firstChild);
            
            currentIndex += chunkSize;
            
            // Clean up old Load More button and spawn a fresh one at the new bottom
            const oldBtn = document.getElementById('btn-load-more-virtual');
            if (oldBtn) oldBtn.remove();
            
            if (currentIndex < dataArray.length) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'btn-load-more-virtual';
                btnContainer.style.cssText = 'text-align: center; padding: 16px; width: 100%;';
                btnContainer.innerHTML = `<button class="btn-primary-small" style="padding: 8px 16px; background: var(--md-surface-variant); color: var(--md-on-surface);">Load More Records...</button>`;
                btnContainer.onclick = renderNextChunk;
                container.appendChild(btnContainer);
            }
        };
        renderNextChunk();
    },
    // --- END OF NEW CODE ---
    
    // ==========================================
    // LIVE BANK BALANCE CALCULATOR
    // ==========================================
    renderBankBalances: () => {
        // ENTERPRISE FIX: Actually apply the Firm ID filter so bank balances don't mathematically merge across companies!
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
        const accounts = (UI.state.rawData.accounts || []).filter(a => !activeFirmId || a.firmId === activeFirmId);
        const receipts = (UI.state.rawData.cashbook || []).filter(r => !activeFirmId || r.firmId === activeFirmId);
        const expenses = (UI.state.rawData.expenses || []).filter(e => !activeFirmId || e.firmId === activeFirmId);
        const container = document.getElementById('bank-balances-container');
        if (!container) return;

        // Use a shallow copy so we don't accidentally mutate the master state
        const displayAccounts = [...accounts];
        if (!displayAccounts.find(a => a.id === 'cash')) {
            displayAccounts.unshift({ id: 'cash', name: 'Cash Drawer', openingBalance: 0 });
        }

        let html = '';
        displayAccounts.forEach(acc => {
            let balance = parseFloat(acc.openingBalance) || 0;
            receipts.forEach(r => {
                // Included a fallback logic in case older receipts don't have an explicit accountId
                if (r.accountId === acc.id || (acc.id === 'cash' && !r.accountId)) {
                    if (r.type === 'in') balance += parseFloat(r.amount);
                    else if (r.type === 'out') balance -= parseFloat(r.amount);
                }
            });
            
            // STRICT ERP LOGIC: Removed double-deduction bug! The cashbook 'receipts' array already contains the auto-generated expense entries.
            
            const color = balance >= 0 ? 'var(--md-success)' : 'var(--md-error)';
            
            // NEW: Clicking a bank balance card now opens its complete pin-to-pin passbook statement!
            const clickAction = `app.openAccountLedger('${acc.id}')`;

            // UPGRADE: Vertical premium card layout for accounts
            const icon = acc.id === 'cash' ? 'payments' : 'account_balance';
            
            html += `
                <div class="m3-card tap-target" onclick="${clickAction}" style="display: flex; align-items: center; gap: 16px; padding: 16px; margin-bottom: 0;">
                    <div class="icon-circle" style="background: var(--md-surface-variant); color: var(--md-on-surface-variant); width: 48px; height: 48px; flex-shrink: 0;">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div style="flex: 1; min-width: 0; overflow: hidden;">
                        <strong class="large-text" style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${acc.name}</strong>
                        <small style="color: var(--md-text-muted);">View Statement</small>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <strong style="font-size: 16px; color: ${color};">&#8377;${balance.toFixed(2)}</strong>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    state: { 
        activeActivity: null, 
        selectedProducts: [], 
        activeMasterTab: 'products',
        currentMasterType: 'products',
        currentMasterTitle: 'Inventory Master',
        rawData: { sales: [], purchases: [], items: [], ledgers: [], expenses: [], cashbook: [], timeline: [], accounts: [] },
        activeFilters: { sales: 'All', purchases: 'All', masters: 'All', expenses: 'All', cashbook: 'All', timeline: 'All' }
    },

    // ==========================================
    // 1. SPLASH SCREEN & INSTANT NAVIGATION
    // ==========================================
    showSuccess: () => {
        const el = document.getElementById('success-animation');
        if(el) {
            el.classList.remove('hidden');
            const svg = el.querySelector('.checkmark-svg');
            if (svg) {
                const newSvg = svg.cloneNode(true);
                svg.parentNode.replaceChild(newSvg, svg);
            }
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]); 
            setTimeout(() => el.classList.add('hidden'), 1500); 
        }
    },

    hideSplash: () => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.classList.add('hidden'), 500); 
        }
        
        // ENTERPRISE FIX: Removed the redundant PWA Shortcut parser from here. 
        // app.init() already handles it, preventing the forms from glitching and opening twice!
    },

    switchTab: (tabId, title, navElement) => {
        const doSwitch = () => {
            document.querySelectorAll('.screen-section').forEach(el => {
                el.classList.remove('active-screen');
                el.classList.add('hidden'); 
            });

            const titleEl = document.getElementById('screen-title');
            if (titleEl) titleEl.innerText = title;

            const target = document.getElementById(tabId);
            if(target) {
                target.classList.remove('hidden');
                target.classList.add('active-screen');
            }

            if (navElement) {
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                navElement.classList.add('active');
            }

            // --- ENTERPRISE FIX: THREAD YIELDING ---
            // 20ms delay lets the browser paint the button animation FIRST before doing heavy math!
            setTimeout(() => {
                if (tabId === 'tab-dashboard') UI.renderDashboard();
                else if (tabId === 'tab-documents') { UI.applyFilters('sales'); UI.applyFilters('purchases'); }
                else if (tabId === 'tab-cashbook') UI.applyFilters('cashbook');
                else if (tabId === 'tab-expenses') UI.applyFilters('expenses');
                else if (tabId === 'tab-masters') UI.applyFilters('masters');
                else if (tabId === 'tab-timeline') UI.applyFilters('timeline'); // STRICT ERP LOGIC: Fixed Dead Tab!
            }, 20); 
        };

        // UPGRADE 4: Cinematic View Transitions
        if (document.startViewTransition) {
            document.startViewTransition(doSwitch);
        } else {
            doSwitch();
        }
    },

    handleFabClick: () => UI.openBottomSheet('sheet-fab-menu'),

    openActivity: (activityId) => {
        const a = document.getElementById(activityId);
        if(a) {
            history.pushState({ modalOpen: true }, ''); 
            
            let highestZ = 4000;
            document.querySelectorAll('.activity-screen.open').forEach(el => {
                const z = parseInt(window.getComputedStyle(el).zIndex, 10);
                if (!isNaN(z) && z > highestZ) highestZ = z;
            });
            a.style.zIndex = highestZ + 10;

            a.classList.remove('hidden'); 
            a.style.display = 'flex'; /* FIX: Changed to flex so scrolling content doesn't stretch infinitely */
            // FIX: Removed 'willChange' which was locking Android WebView scrolling!
            void a.offsetWidth; 
            
            requestAnimationFrame(() => { a.classList.add('open'); });
            
            if (activityId === 'activity-sales-form') {
                UI.state.activeActivity = 'sales';
            } else if (activityId === 'activity-purchase-form') {
                UI.state.activeActivity = 'purchase';
            }
        }
    },

    closeActivity: (activityId) => {
        const a = document.getElementById(activityId);
        if(a) {
            a.classList.remove('open'); 
            setTimeout(() => { 
                a.classList.add('hidden');
                a.style.display = '';
                a.style.zIndex = ''; 
            }, 300); 
            
            if (activityId === 'activity-sales-form' || activityId === 'activity-purchase-form') {
                UI.state.activeActivity = null;
            }
            
            if (history.state && history.state.modalOpen) { window._ignoreNextPop = true; history.back(); } 
        }
    },

    toggleDeleteButton: (type, show) => {
        const btnMap = {
            'sales': 'btn-delete-sales', 'purchase': 'btn-delete-purchase',
            'product': 'btn-delete-product', 'ledger': 'btn-delete-ledger',
            'expense': 'btn-delete-expense', 'receipt-in': 'btn-delete-receipt-in',
            'receipt-out': 'btn-delete-receipt-out', 'account': 'btn-delete-account'
        };
        const btnId = btnMap[type];
        if (!btnId) return;

        const btn = document.getElementById(btnId);
        if (btn) {
            if (show) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        }
    },

    // ==========================================
    // 2. MASTER VIEW NAVIGATION
    // ==========================================
    openMasterView: async (type, title) => {
        // CRITICAL FIX: Tracking the state correctly so search & filters remember what list you are looking at
        UI.state.activeMasterTab = type;
        UI.state.currentMasterType = type;
        UI.state.currentMasterTitle = title;
        
        document.getElementById('master-view-title').innerText = title;
        UI.openActivity('activity-master-view');
        
        const container = document.getElementById('master-list-container');
        // UPGRADE 3: Premium Shimmer Loaders instead of the old circular spinner
        container.innerHTML = `
            <div style="padding: 8px 0;">
                <div class="skeleton-card"></div>
                <div class="skeleton-card" style="animation-delay: 0.1s"></div>
                <div class="skeleton-card" style="animation-delay: 0.2s"></div>
                <div class="skeleton-card" style="animation-delay: 0.3s"></div>
                <div class="skeleton-card" style="animation-delay: 0.4s"></div>
            </div>
        `;
        
        // Handle Stock Adjustments Audit Trail
        if (type === 'adjustments') {
            const searchInput = document.getElementById('search-master-view');
            if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = 'none';

            // ENTERPRISE FIX: Ensure multi-company data isolation for the Stock Ledger
            const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
            const records = (await getAllRecords('adjustments')).filter(a => !activeFirmId || a.firmId === activeFirmId);
            const products = (await getAllRecords('items')).filter(p => !activeFirmId || p.firmId === activeFirmId);
            
            const actionBtn = document.getElementById('btn-master-action');
            if (actionBtn) actionBtn.classList.add('hidden');

            const emptyHTML = '<p class="empty-state">No stock adjustments logged yet.</p>';
            
            // Sort chronologically before feeding to Virtual Engine
            records.sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));

            UI.renderVirtualList(container, records, (adj) => {
                const prod = products.find(p => p.id === adj.itemId);
                const prodName = prod ? prod.name : 'Deleted Product';
                const sign = adj.type === 'add' ? '+' : '-';
                const color = adj.type === 'add' ? 'var(--md-success)' : 'var(--md-error)';
                
                // NEW: Dual Inventory Audit Badge
                const isGST = adj.pool === 'gst';
                const poolBadge = adj.pool ? `<span style="background: ${isGST ? '#e3f2fd' : '#fff8e1'}; color: ${isGST ? '#0061a4' : '#f57f17'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 8px; border: 1px solid ${isGST ? '#bbdefb' : '#ffecb3'};">${isGST ? 'GST Pool' : 'Non-GST Pool'}</span>` : '';

                return `
                    <div class="m3-card" style="padding: 12px; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
                                <strong style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prodName}</strong>
                                ${poolBadge}
                            </div>
                            <strong style="font-size: 16px; color: ${color}; flex-shrink: 0; margin-left: 8px;">${sign}${parseFloat(adj.qty).toFixed(2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 6px; font-size: 12px; color: var(--md-text-muted);">
                            <span>${adj.date}</span>
                            <span>${adj.notes || 'No Reason Provided'}</span>
                        </div>
                    </div>
                `;
            }, emptyHTML);
            return; 
        }

        const searchInput = document.getElementById('search-master-view');
        if (searchInput) {
            // FIX: Restore the search bar for Products, Customers, etc.
            if (searchInput.parentElement) searchInput.parentElement.style.display = 'flex'; 
            searchInput.value = '';
            searchInput.placeholder = `Search ${title}...`;
        }
        
        const actionBtn = document.getElementById('btn-master-action');
        if (actionBtn) {
            actionBtn.classList.add('hidden'); // Removed clunky Receivables button from UI
        }

        // UPGRADE: Show 3-Dot menu only for Products, Customers, and Suppliers
        const moreOptionsBtn = document.getElementById('master-more-options');
        if (moreOptionsBtn) {
            if (['products', 'customers', 'suppliers'].includes(type)) moreOptionsBtn.classList.remove('hidden');
            else moreOptionsBtn.classList.add('hidden');
        }

        const filterSelect = document.getElementById('filter-master-view');
        const sortSelect = document.getElementById('sort-master-view');
        
        // FIX: Populate the Master View Dropdowns immediately when the screen opens so they are never empty!
        if (filterSelect) {
            if (type === 'customers' || type === 'suppliers' || type === 'contacts') {
                filterSelect.innerHTML = `<option value="All">All Status</option><option value="To Receive">To Receive (Due)</option><option value="To Pay">To Pay (Due)</option><option value="Advance">Advance (Paid / Received)</option><option value="GST">GST Registered</option><option value="Non-GST">Non-GST</option><option value="Money In">Money In (Received)</option><option value="Money Out">Money Out (Paid)</option>`;
                if(sortSelect) sortSelect.innerHTML = `<option value="name-asc">A to Z</option><option value="bal-desc">Balance: High to Low</option><option value="bal-asc">Balance: Low to High</option>`;
            } else if (type === 'pay-in' || type === 'pay-out') {
                filterSelect.innerHTML = `<option value="All">All Modes</option><option value="Cash">Cash Only</option><option value="Bank">Bank / Online Only</option>`;
                if(sortSelect) sortSelect.innerHTML = `<option value="date-desc">Newest First</option><option value="date-asc">Oldest First</option>`;
            } else if (type === 'trash') {
                filterSelect.innerHTML = `<option value="All">All Trashed Items</option>`;
                if(sortSelect) sortSelect.innerHTML = `<option value="date-desc">Recently Deleted</option>`;
            } else {
                filterSelect.innerHTML = `<option value="All">All Products</option><option value="In Stock">Stock Available</option>`;
                if(sortSelect) sortSelect.innerHTML = `<option value="name-asc">A to Z</option><option value="stock-asc">Lowest Stock First</option>`;
            }
            filterSelect.value = 'All';
        }

        UI.applyFilters('masters'); 
    },

    renderRowWiseItem: (title, subtitle, rightText, rightSub, icon, iconColor, onClickAction) => {
        return `
        <div class="m3-card tap-target virtual-item" style="padding: 12px; margin-bottom: 8px; border-radius: 8px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" onclick="${onClickAction}">
            <div class="icon-circle" style="width: 40px; height: 40px; background: var(--md-surface-variant); color: ${iconColor}; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
            </div>
            <div style="flex: 1; min-width: 0; overflow: hidden;">
                <strong style="font-size: 14px; color: var(--md-on-surface); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</strong>
                <small style="color: var(--md-text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subtitle}</small>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
                <strong style="font-size: 14px; color: var(--md-on-surface);">${rightText}</strong><br>
                <small style="color: var(--md-text-muted);">${rightSub}</small>
            </div>
        </div>`;
    },

    // ==========================================
    // 3. STRICT MATH, DATES & TAX DISTRIBUTION
    // ==========================================
    toggleDates: (type) => {
        const statusEl = document.getElementById(`${type}-order-status`);
        if(!statusEl) return;
        const status = statusEl.value;
        const shippedGroup = document.getElementById(`${type}-shipped-date-group`);
        const completedGroup = document.getElementById(`${type}-completed-date-group`);
        const shippedInput = document.getElementById(`${type}-shipped-date`);
        
        // Reset visibility and editability by default
        if (shippedGroup) shippedGroup.classList.add('hidden');
        if (completedGroup) completedGroup.classList.add('hidden');
        if (shippedInput) shippedInput.disabled = false;
        
        if (status === 'Shipped') {
            if (shippedGroup) shippedGroup.classList.remove('hidden');
        } else if (status === 'Completed') {
            // Keep the shipped date visible to retain history, but lock it
            if (shippedGroup) {
                shippedGroup.classList.remove('hidden');
                if (shippedInput) shippedInput.disabled = true;
            }
            if (completedGroup) completedGroup.classList.remove('hidden');
        }
    },

    calcSalesTotals: () => {
        let rawSubtotal = 0;
        const typeEl = document.getElementById('sales-invoice-type');
        const isGST = typeEl ? typeEl.value !== 'Non-GST' : true;

        const rows = document.querySelectorAll('#sales-items-body .item-entry-card');
        
        rows.forEach(tr => {
            const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.row-rate').value) || 0;
            // ENTERPRISE FIX: Strict 2-decimal rounding to prevent floating-point drift
            const lineTotal = qty * rate;
            rawSubtotal += Math.round(lineTotal * 100) / 100;
        });

        // STRICT ERP LOGIC: Block "Reverse Discount" fraud where negative numbers inflate the invoice total!
        const discountInput = Math.abs(parseFloat(document.getElementById('sales-discount').value) || 0);
        const discountTypeEl = document.getElementById('sales-discount-type');
        const discountType = discountTypeEl ? discountTypeEl.value : '\u20B9';
        // ENTERPRISE FIX: Strict rounding on percentage discounts
        let discountAmt = discountType === '%' 
            ? Math.round((rawSubtotal * (discountInput / 100)) * 100) / 100 
            : discountInput;
        
        // FIX: Prevent negative invoices by capping the discount at the subtotal maximum
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        
        const discountRatio = rawSubtotal > 0 ? (discountAmt / rawSubtotal) : 0;
        
        let finalSubtotal = 0;
        let totalGst = 0;

        rows.forEach(tr => {
            const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.row-rate').value) || 0;
            const gstPercent = isGST ? (parseFloat(tr.querySelector('.row-gst').value) || 0) : 0;
            
            const baseAmount = qty * rate;
            const discountedBase = baseAmount - (baseAmount * discountRatio);
            const gstAmount = discountedBase * (gstPercent / 100);
            
            const roundedDiscountedBase = Math.round(discountedBase * 100) / 100;
            const roundedGst = Math.round(gstAmount * 100) / 100;
            const rowTotal = roundedDiscountedBase + roundedGst;
            
            tr.querySelector('.row-total').innerText = rowTotal.toFixed(2);
            
            finalSubtotal += roundedDiscountedBase;
            totalGst += roundedGst;

            const buyPrice = parseFloat(tr.querySelector('.row-item-buyprice').value) || 0;
            const marginSpan = tr.querySelector('.live-margin');
            if (marginSpan) {
                const effectiveRate = rate - (rate * discountRatio); 
                const profitAmt = effectiveRate - buyPrice;
                const marginPercent = effectiveRate > 0 ? ((profitAmt / effectiveRate) * 100).toFixed(1) : 0;
                // Upgrade: Shows the exact profit amount per unit based on the custom editable buy price
                marginSpan.innerText = `Margin: ${marginPercent}% (\u20B9${profitAmt.toFixed(2)}/unit)`;
                marginSpan.style.color = profitAmt < 0 ? 'var(--md-error)' : 'var(--md-success)';
            }
        });

        const freight = parseFloat(document.getElementById('sales-freight').value) || 0;
        const exactTotal = finalSubtotal + totalGst + freight;
        const roundedTotal = Math.round(exactTotal);
        const roundOff = roundedTotal - exactTotal;

        document.getElementById('sales-subtotal').innerText = `\u20B9${finalSubtotal.toFixed(2)}`;
        document.getElementById('sales-gst-total').innerText = `\u20B9${totalGst.toFixed(2)}`;
        
        const roundOffEl = document.getElementById('sales-round-off');
        if (roundOffEl) {
            roundOffEl.innerText = `${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}`;
        }
        
        document.getElementById('sales-grand-total').innerText = `\u20B9${roundedTotal.toFixed(2)}`;
    },

    calcPurchaseTotals: () => {
        let rawSubtotal = 0;
        const typeEl = document.getElementById('purchase-invoice-type');
        const isGST = typeEl ? typeEl.value !== 'Non-GST' : true;

        const rows = document.querySelectorAll('#purchase-items-body .item-entry-card');
        
        rows.forEach(tr => {
            const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.row-rate').value) || 0;
            // ENTERPRISE FIX: Strict 2-decimal rounding to prevent floating-point drift
            const lineTotal = qty * rate;
            rawSubtotal += Math.round(lineTotal * 100) / 100;
        });

        // STRICT ERP LOGIC: Block "Reverse Discount" fraud where negative numbers inflate the PO total!
        const discountInput = Math.abs(parseFloat(document.getElementById('purchase-discount').value) || 0);
        const discountTypeEl = document.getElementById('purchase-discount-type');
        const discountType = discountTypeEl ? discountTypeEl.value : '\u20B9';
        // ENTERPRISE FIX: Strict rounding on percentage discounts
        let discountAmt = discountType === '%' 
            ? Math.round((rawSubtotal * (discountInput / 100)) * 100) / 100 
            : discountInput;
        
        // FIX: Prevent negative invoices by capping the discount at the subtotal maximum
        if (discountAmt > rawSubtotal) discountAmt = rawSubtotal;
        
        const discountRatio = rawSubtotal > 0 ? (discountAmt / rawSubtotal) : 0;

        let finalSubtotal = 0;
        let totalGst = 0;

        rows.forEach(tr => {
            const qty = parseFloat(tr.querySelector('.row-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.row-rate').value) || 0;
            const gstPercent = isGST ? (parseFloat(tr.querySelector('.row-gst').value) || 0) : 0;
            
            const baseAmount = qty * rate;
            const discountedBase = baseAmount - (baseAmount * discountRatio);
            const gstAmount = discountedBase * (gstPercent / 100);
            
            const roundedDiscountedBase = Math.round(discountedBase * 100) / 100;
            const roundedGst = Math.round(gstAmount * 100) / 100;
            const rowTotal = roundedDiscountedBase + roundedGst;
            
            tr.querySelector('.row-total').innerText = rowTotal.toFixed(2);
            
            finalSubtotal += roundedDiscountedBase;
            totalGst += roundedGst;
        });

        const freight = parseFloat(document.getElementById('purchase-freight').value) || 0;
        const exactTotal = finalSubtotal + totalGst + freight;
        const roundedTotal = Math.round(exactTotal);
        const roundOff = roundedTotal - exactTotal;

        document.getElementById('purchase-subtotal').innerText = `\u20B9${finalSubtotal.toFixed(2)}`;
        document.getElementById('purchase-gst-total').innerText = `\u20B9${totalGst.toFixed(2)}`;
        
        const roundOffEl = document.getElementById('purchase-round-off');
        if (roundOffEl) {
            roundOffEl.innerText = `${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}`;
        }
        
        document.getElementById('purchase-grand-total').innerText = `\u20B9${roundedTotal.toFixed(2)}`;
    },

    // ==========================================
    // 4. UNIVERSAL SEARCH & DYNAMIC FILTERS
    // ==========================================
    highlightText: (text, term) => {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
        return String(text).replace(regex, '<span style="background: rgba(0,97,164,0.15); color: var(--md-primary); border-radius: 3px; font-weight: bold; padding: 0 2px;">$1</span>');
    },

    setFilter: (tab, filterValue, chipElement) => {
        // FIX: Safely ignore the color-changing logic if we are using the new Bottom Sheet menus (which send a null chipElement)
        if (chipElement) {
            const chips = chipElement.parentElement.querySelectorAll('.chip');
            chips.forEach(c => c.classList.remove('active'));
            chipElement.classList.add('active');
        }

        UI.state.activeFilters[tab] = filterValue;
        UI.applyFilters(tab);
    },

    applyFilters: (tab) => {
        const searchInput = tab === 'masters' ? document.getElementById('search-master-view') : document.getElementById(`search-${tab}`);
        const searchTerm = searchInput ? (searchInput.value || '').toLowerCase() : '';
        
        const sortSelect = tab === 'masters' ? document.getElementById('sort-master-view') : document.getElementById(`sort-${tab}`);
        const sortOption = sortSelect ? sortSelect.value : null;
        
        const activeFilter = UI.state.activeFilters[tab];
        
        let data = [];
        let containerId = '';
        let sumValue = 0;

        // Cashbook Map logic for True Balances (WITH REFUND & COLLISION FIX)
        const paymentMap = {};
        const ledgerTotalPaid = {}; 
        const ledgerExplicitlyLinked = {}; 

        if (tab === 'sales' || tab === 'purchases') {
            // STRICT ERP LOGIC: Build an O(1) Document Hash Map to prevent O(N^2) Search Bar Freezes!
            const docMap = {};
            UI.state.rawData.sales.forEach(d => { docMap[d.id] = d; if(d.invoiceNo) docMap[d.invoiceNo] = d; if(d.orderNo) docMap[d.orderNo] = d; });
            UI.state.rawData.purchases.forEach(d => { docMap[d.id] = d; if(d.poNo) docMap[d.poNo] = d; if(d.invoiceNo) docMap[d.invoiceNo] = d; if(d.orderNo) docMap[d.orderNo] = d; });

            // ENTERPRISE FIX: Inject Opening Balances into the allocation pool so they can pay off invoices!
            UI.state.rawData.ledgers.forEach(l => {
                let ob = parseFloat(l.openingBalance) || 0;
                const bType = (l.balanceType || '').toLowerCase();
                if (tab === 'sales' && (bType.includes('pay') || bType.includes('credit'))) ledgerTotalPaid[l.id] = (ledgerTotalPaid[l.id] || 0) + ob;
                if (tab === 'purchases' && (bType.includes('receive') || bType.includes('debit'))) ledgerTotalPaid[l.id] = (ledgerTotalPaid[l.id] || 0) + ob;
            });

            UI.state.rawData.cashbook.forEach(c => {
                if (c.ledgerId) {
                    let amt = parseFloat(c.amount) || 0;
                    if (tab === 'sales') amt = c.type === 'in' ? amt : -amt;
                    if (tab === 'purchases') amt = c.type === 'out' ? amt : -amt;
                    
                    ledgerTotalPaid[c.ledgerId] = (ledgerTotalPaid[c.ledgerId] || 0) + amt;

                    if (c.invoiceRef) {
                        const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                        let remainingAmt = amt;
                        
                        // Waterfall Allocation (FIFO)
                        const matchedDocs = refs.map(ref => docMap[ref] || { id: ref, grandTotal: Infinity, date: '1970-01-01' });
                        
                        matchedDocs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                        
                        matchedDocs.forEach(doc => {
                            if (Math.abs(remainingAmt) < 0.01) return; // Allow negative amounts for refunds!
                            const key = `${c.ledgerId}_${doc.id}`;
                            const currentPaid = paymentMap[key] || 0;
                            const docTotal = doc.grandTotal === Infinity ? Infinity : (parseFloat(doc.grandTotal) || 0);
                            
                            let allocation = 0;
                            if (remainingAmt > 0) {
                                allocation = Math.min(Math.max(0, docTotal - currentPaid), remainingAmt);
                            } else {
                                // Mathematical Refund: Deduct from what was previously paid
                                allocation = Math.max(-currentPaid, remainingAmt); 
                            }
                            
                            if (Math.abs(allocation) > 0) {
                                paymentMap[key] = currentPaid + allocation;
                                ledgerExplicitlyLinked[c.ledgerId] = (ledgerExplicitlyLinked[c.ledgerId] || 0) + allocation;
                                remainingAmt -= allocation;
                            }
                        });
                    }
                }
            });

            // --- ENTERPRISE UPGRADE: AUTO-KNOCKOFF (FIFO) FOR ADVANCE PAYMENTS ---
            const advancePool = {};
            Object.keys(ledgerTotalPaid).forEach(ledgerId => {
                const totalPaid = ledgerTotalPaid[ledgerId] || 0;
                const explicitlyLinked = ledgerExplicitlyLinked[ledgerId] || 0;
                if (totalPaid > explicitlyLinked) advancePool[ledgerId] = totalPaid - explicitlyLinked;
                else advancePool[ledgerId] = 0;
            });

            const docsToProcess = tab === 'sales' ? [...UI.state.rawData.sales] : [...UI.state.rawData.purchases];
            // Sort Oldest First for true chronological FIFO allocation
            docsToProcess.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

            docsToProcess.forEach(doc => {
                if (doc.status !== 'Open' && doc.documentType !== 'return') {
                    const partyId = tab === 'sales' ? doc.customerId : doc.supplierId;
                    if (advancePool[partyId] > 0.01) {
                        const uniqueRefs = [...new Set([doc.orderNo, doc.poNo, doc.invoiceNo, doc.id].filter(Boolean))];
                        const explicitPaid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${partyId}_${ref}`] || 0), 0);
                        const due = (parseFloat(doc.grandTotal) || 0) - explicitPaid;
                        
                        // If invoice is due, consume the advance pool to pay it off automatically
                        if (due > 0.01) {
                            const allocated = Math.min(due, advancePool[partyId]);
                            advancePool[partyId] -= allocated;
                            paymentMap[`${partyId}_${doc.id}`] = (paymentMap[`${partyId}_${doc.id}`] || 0) + allocated;
                        }
                    }
                }
            });
        }

        // ------------------ SALES ------------------
        if (tab === 'sales') {
            containerId = 'sales-history-container';
            data = UI.state.rawData.sales.filter(s => {
                // STRICT ERP LOGIC: Ensure all 3 document references (Invoice, Order, and Database ID) are fully searchable!
                const matchSearch = (s.customerName || '').toLowerCase().includes(searchTerm) || (s.invoiceNo || s.orderNo || s.id || '').toLowerCase().includes(searchTerm);
                let matchFilter = true;
                
                // FIX: Check ALL references to catch cross-linked payments, and respect FIFO completion!
                const uniqueRefs = [...new Set([s.orderNo, s.invoiceNo, s.id].filter(Boolean))];
                const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${s.customerId}_${ref}`] || 0), 0);
                
                // ENTERPRISE FIX: Subtract Returns so honest customers don't show a red "Due" badge in the main list!
                const linkedReturns = UI.state.rawData.sales.filter(d => d.documentType === 'return' && d.status !== 'Open' && uniqueRefs.includes(d.orderNo));
                const returnTotal = linkedReturns.reduce((sum, ret) => sum + (parseFloat(ret.grandTotal) || 0), 0);
                
                const balance = Math.max(0, (parseFloat(s.grandTotal) || 0) - paid - returnTotal);
                
                if (activeFilter === 'Open') matchFilter = s.status === 'Open';
                else if (activeFilter === 'Completed') matchFilter = s.status === 'Completed'; // Removed balance restriction
                else if (activeFilter === 'Shipped') matchFilter = s.status === 'Shipped';
                else if (activeFilter === 'To Receive') matchFilter = balance > 0 && s.status !== 'Open' && s.documentType !== 'return';
                else if (activeFilter === 'GST') matchFilter = s.invoiceType !== 'Non-GST';
                else if (activeFilter === 'Non-GST') matchFilter = s.invoiceType === 'Non-GST';
                
                return matchSearch && matchFilter;
            });

            data.forEach(s => sumValue += (s.documentType === 'return' ? -(s.grandTotal || 0) : (s.grandTotal || 0)));
            if (document.getElementById('sum-sales')) document.getElementById('sum-sales').innerText = `\u20B9${sumValue.toFixed(2)}`;

            // BULLETPROOF SORTING: Prevents WebView crashes!
            if(sortOption === 'date-desc') data.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            if(sortOption === 'date-asc') data.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
            if(sortOption === 'amt-desc') data.sort((a,b) => (parseFloat(b.grandTotal) || 0) - (parseFloat(a.grandTotal) || 0));
            if(sortOption === 'amt-asc') data.sort((a,b) => (parseFloat(a.grandTotal) || 0) - (parseFloat(b.grandTotal) || 0));
            // NEW CODE: Smart Document Sorting (Order No primary, Invoice No fallback)
            if(sortOption === 'doc-desc') data.sort((a,b) => String(b.orderNo || b.invoiceNo || '').localeCompare(String(a.orderNo || a.invoiceNo || ''), undefined, {numeric: true, sensitivity: 'base'}));
            if(sortOption === 'doc-asc') data.sort((a,b) => String(a.orderNo || a.invoiceNo || '').localeCompare(String(b.orderNo || b.invoiceNo || ''), undefined, {numeric: true, sensitivity: 'base'}));

            const container = document.getElementById(containerId);
            if (container) {
                const emptyHTML = `
                <div class="empty-state">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--md-outline-variant)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p style="margin: 0 0 16px 0; font-size: 16px;">No sales invoices match your filters.</p>
                    <button class="btn-primary" onclick="app.openForm('sales', null, 'invoice')">+ Create Sales Invoice</button>
                </div>`;

                UI.renderVirtualList(container, data, (s) => {
                    const isReturn = s.documentType === 'return';
                    const uniqueRefs = [...new Set([s.orderNo, s.invoiceNo, s.id].filter(Boolean))];
                    const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${s.customerId}_${ref}`] || 0), 0);
                    const balance = Math.max(0, (parseFloat(s.grandTotal) || 0) - paid);
                    const statusText = s.status === 'Open' ? 'Draft' : (balance > 0 && !isReturn ? `Due: \u20B9${balance.toFixed(2)}` : 'Paid');
                    
                    // STRICT ERP LOGIC: Hardcode exact HEX colors so older Android WebViews can never break the UI!
                    const statusColor = s.status === 'Open' ? '#73777f' : (balance > 0 && !isReturn ? '#ba1a1a' : '#146c2e');
                    const statusBg = s.status === 'Open' ? '#f1f3f4' : (balance > 0 && !isReturn ? '#fff0f2' : '#e8f5e9'); 
                    
                    return `
                    <div class="m3-card tap-target list-card" style="${isReturn ? 'border-left: 4px solid var(--md-error);' : ''}" onclick="app.openForm('sales', '${s.id}', '${s.documentType}')">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                            <div style="flex:1; min-width:0; overflow:hidden;">
                                <div class="large-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.customerName || 'Unknown Party'} ${isReturn ? '<span style="color:var(--md-error); font-size:12px;">(Credit Note)</span>' : ''}</div>
                                <small class="color-primary" style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:4px;">${s.orderNo || s.invoiceNo || 'Draft'} | ${s.date || 'Unknown Date'}</small>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                                <small style="display:block; width:max-content; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; background:${statusBg}; color:${statusColor}; border:none;">${statusText}</small>
                                <strong style="font-size:16px; color:${isReturn ? 'var(--md-error)' : 'inherit'}; line-height:1;">${isReturn ? '-' : ''}\u20B9${(s.grandTotal || 0).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>`;
                }, emptyHTML);
            }
        }

        // ------------------ PURCHASES ------------------
        else if (tab === 'purchases') {
            containerId = 'purchase-history-container';
            data = UI.state.rawData.purchases.filter(p => {
                // STRICT ERP LOGIC: Ensure all 3 document references (Invoice, PO, and Internal Order) are fully searchable!
                const matchSearch = (p.supplierName || '').toLowerCase().includes(searchTerm) || (p.invoiceNo || p.poNo || p.orderNo || '').toLowerCase().includes(searchTerm);
                let matchFilter = true;

                // FIX: Check ALL references to catch cross-linked payments, and respect FIFO completion!
                const uniqueRefs = [...new Set([p.orderNo, p.poNo, p.invoiceNo, p.id].filter(Boolean))];
                const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${p.supplierId}_${ref}`] || 0), 0);
                const balance = Math.max(0, (parseFloat(p.grandTotal) || 0) - paid);

                if (activeFilter === 'To Pay') matchFilter = balance > 0 && p.status !== 'Open' && p.documentType !== 'return';
                else if (activeFilter === 'Completed') matchFilter = p.status === 'Completed'; // Removed balance restriction
                else if (activeFilter === 'GST') matchFilter = p.invoiceType !== 'Non-GST';
                else if (activeFilter === 'Non-GST') matchFilter = p.invoiceType === 'Non-GST';

                return matchSearch && matchFilter;
            });

            data.forEach(p => sumValue += (p.documentType === 'return' ? -(p.grandTotal || 0) : (p.grandTotal || 0)));
            if (document.getElementById('sum-purchases')) document.getElementById('sum-purchases').innerText = `\u20B9${sumValue.toFixed(2)}`;

            // BULLETPROOF SORTING: Prevents WebView crashes!
            if(sortOption === 'date-desc') data.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            if(sortOption === 'date-asc') data.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
            if(sortOption === 'amt-desc') data.sort((a,b) => (parseFloat(b.grandTotal) || 0) - (parseFloat(a.grandTotal) || 0));
            if(sortOption === 'amt-asc') data.sort((a,b) => (parseFloat(a.grandTotal) || 0) - (parseFloat(b.grandTotal) || 0));
            // NEW CODE: Smart Document Sorting (Order/PO No primary, Invoice No fallback)
            if(sortOption === 'doc-desc') data.sort((a,b) => String(b.orderNo || b.poNo || b.invoiceNo || '').localeCompare(String(a.orderNo || a.poNo || a.invoiceNo || ''), undefined, {numeric: true, sensitivity: 'base'}));
            if(sortOption === 'doc-asc') data.sort((a,b) => String(a.orderNo || a.poNo || a.invoiceNo || '').localeCompare(String(b.orderNo || b.poNo || b.invoiceNo || ''), undefined, {numeric: true, sensitivity: 'base'}));

            const container = document.getElementById(containerId);
            if (container) {
                const emptyHTML = `
                <div class="empty-state">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--md-outline-variant)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <p style="margin: 0 0 16px 0; font-size: 16px;">No purchase bills match your filters.</p>
                    <button class="btn-primary" onclick="app.openForm('purchase', null, 'invoice')">+ Create Purchase Bill</button>
                </div>`;

                UI.renderVirtualList(container, data, (p) => {
                    const isReturn = p.documentType === 'return';
                    const uniqueRefs = [...new Set([p.orderNo, p.poNo, p.invoiceNo, p.id].filter(Boolean))];
                    const paid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${p.supplierId}_${ref}`] || 0), 0);
                    const balance = Math.max(0, (parseFloat(p.grandTotal) || 0) - paid);
                    const statusText = p.status === 'Open' ? 'Draft PO' : (balance > 0 && !isReturn ? `To Pay: \u20B9${balance.toFixed(2)}` : 'Paid');
                    
                    // STRICT ERP LOGIC: Hardcode exact HEX colors so older Android WebViews can never break the UI!
                    const statusColor = p.status === 'Open' ? '#73777f' : (balance > 0 && !isReturn ? '#ba1a1a' : '#146c2e');
                    const statusBg = p.status === 'Open' ? '#f1f3f4' : (balance > 0 && !isReturn ? '#fff0f2' : '#e8f5e9');

                    return `
                    <div class="m3-card tap-target" style="${isReturn ? 'border-left: 4px solid var(--md-error);' : ''}" onclick="app.openForm('purchase', '${p.id}', '${p.documentType}')">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                            <div style="flex:1; min-width:0; overflow:hidden;">
                                <div class="large-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.supplierName || 'Unknown Party'} ${isReturn ? '<span style="color:var(--md-error); font-size:12px;">(Debit Note)</span>' : ''}</div>
                                <small class="color-primary" style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:4px;">${p.orderNo || p.poNo || p.invoiceNo || 'Draft'} | ${p.date || 'Unknown Date'}</small>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                                <small style="display:block; width:max-content; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; background:${statusBg}; color:${statusColor}; border:none;">${statusText}</small>
                                <strong style="font-size:16px; color:${isReturn ? 'var(--md-success)' : 'inherit'}; line-height:1;">${isReturn ? '-' : ''}\u20B9${(p.grandTotal || 0).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>`;
                }, emptyHTML);
            }
        }

        // ------------------ ROW-WISE MASTERS ------------------
        else if (tab === 'masters') {
            containerId = 'master-list-container';
            const activeTab = UI.state.activeMasterTab || 'products';
            const filterSelect = document.getElementById('filter-master-view');
            const activeMasterFilter = filterSelect ? filterSelect.value : 'All';

            const container = document.getElementById(containerId);
            if (!container) return;

            const emptyHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--md-outline-variant)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">
                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <strong style="font-size: 18px; color: var(--md-on-surface); display:block;">No records found</strong>
                <p style="margin: 8px 0 0 0; color: var(--md-text-muted);">Try adjusting your search or filters.</p>
            </div>`;

            // 🚀 ENTERPRISE UPGRADE: O(1) HASH MAP BALANCE ENGINE
            // Prevents 600+ Million loop iterations from freezing the phone!
            const balanceCache = {};
            const isCustCache = {};
            
            UI.state.rawData.ledgers.forEach(l => {
                const isCustomer = String(l.type).toLowerCase() === 'customer';
                isCustCache[l.id] = isCustomer;
                let ob = parseFloat(l.openingBalance) || 0;
                const balType = (l.balanceType || '').toLowerCase();
                let bal = 0;
                if (isCustomer) bal += (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
                else bal += (balType.includes('receive') || balType.includes('debit')) ? -ob : ob;
                balanceCache[l.id] = bal;
            });

            UI.state.rawData.sales.forEach(s => { 
                if (s.status !== 'Open' && balanceCache[s.customerId] !== undefined) {
                    balanceCache[s.customerId] += (s.documentType === 'return' ? -parseFloat(s.grandTotal || 0) : parseFloat(s.grandTotal || 0)); 
                }
            });
            UI.state.rawData.purchases.forEach(p => { 
                if (p.status !== 'Open' && balanceCache[p.supplierId] !== undefined) {
                    balanceCache[p.supplierId] += (p.documentType === 'return' ? -parseFloat(p.grandTotal || 0) : parseFloat(p.grandTotal || 0)); 
                }
            });
            UI.state.rawData.cashbook.forEach(c => { 
                if (c.ledgerId && balanceCache[c.ledgerId] !== undefined) {
                    let amt = parseFloat(c.amount || 0);
                    if (isCustCache[c.ledgerId]) balanceCache[c.ledgerId] += (c.type === 'in' ? -amt : amt);
                    else balanceCache[c.ledgerId] += (c.type === 'out' ? -amt : amt);
                }
            });

            const getBal = (id, type) => balanceCache[id] || 0;

            if (activeTab === 'products') {
                data = UI.state.rawData.items.filter(i => {
                    const matchSearch = (i.name || '').toLowerCase().includes(searchTerm) || (i.sku || '').toLowerCase().includes(searchTerm);
                    let matchFilter = true;
                    
                    // Bulletproof Math
                    const rawGst = parseFloat(i.stockGst);
                    const rawNon = parseFloat(i.stockNonGst);
                    const gst = isNaN(rawGst) ? (parseFloat(i.stock) || 0) : rawGst;
                    const non = isNaN(rawNon) ? 0 : rawNon;
                    const tot = parseFloat(i.stock) || 0;
                    const min = parseFloat(i.minStock) || 0;

                    if (activeMasterFilter === 'In Stock') matchFilter = tot > 0;
                    else if (activeMasterFilter === 'Out of Stock') matchFilter = tot <= 0;
                    else if (activeMasterFilter === 'Low Stock') matchFilter = min > 0 && tot <= min;
                    else if (activeMasterFilter === 'GST Stock') matchFilter = gst > 0;
                    else if (activeMasterFilter === 'Non-GST Stock') matchFilter = non > 0;
                    
                    return matchSearch && matchFilter;
                });
                
                if(sortOption === 'name-asc') data.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
                if(sortOption === 'stock-asc' || sortOption === 'stock-desc') {
                    data.sort((a,b) => {
                        const getVal = (item) => {
                            if (activeMasterFilter === 'GST Stock') return isNaN(parseFloat(item.stockGst)) ? (parseFloat(item.stock) || 0) : parseFloat(item.stockGst);
                            if (activeMasterFilter === 'Non-GST Stock') return parseFloat(item.stockNonGst) || 0;
                            return parseFloat(item.stock) || 0;
                        };
                        return sortOption === 'stock-asc' ? getVal(a) - getVal(b) : getVal(b) - getVal(a);
                    });
                }

                UI.renderVirtualList(container, data, (i) => {
                    const currentStock = parseFloat(i.stock) || 0;
                    const minStock = parseFloat(i.minStock) || 0;
                    const isLowStock = minStock > 0 && currentStock <= minStock;
                    
                    // Bulletproof Math
                    const rawGst = parseFloat(i.stockGst);
                    const rawNon = parseFloat(i.stockNonGst);
                    const gstStock = isNaN(rawGst) ? currentStock : rawGst;
                    const nonGstStock = isNaN(rawNon) ? 0 : rawNon;
                    
                    // Smart Highlight Display based on the active filter
                    let primaryStockLabel = `Tot: ${currentStock}`;
                    if (activeMasterFilter === 'GST Stock') primaryStockLabel = `GST: ${gstStock}`;
                    else if (activeMasterFilter === 'Non-GST Stock') primaryStockLabel = `Non-GST: ${nonGstStock}`;
                    
                    const stockLabel = `
                        <span style="${isLowStock ? 'color:var(--md-error); font-weight:bold;' : ''}">${primaryStockLabel} ${i.uom || ''} ${isLowStock ? '⚠️' : ''}</span>
                        <span style="font-size: 11px; color: var(--md-text-muted); display: block; margin-top: 2px;">GST: ${gstStock} | Non-GST: ${nonGstStock}</span>
                    `;

                    return UI.renderRowWiseItem(
                        UI.highlightText(i.name || 'Unnamed Product', searchTerm), 
                        stockLabel, 
                        `\u20B9${(i.sellPrice || 0).toFixed(2)}`, 
                        `Buy: \u20B9${(i.buyPrice || 0).toFixed(2)}`, 
                        'inventory_2', 
                        isLowStock ? 'var(--md-error)' : 'var(--md-primary)', 
                        `app.openForm('product', '${i.id}')`
                    );
                }, emptyHTML);
            } 
            else if (activeTab === 'customers' || activeTab === 'suppliers' || activeTab === 'contacts') {
                const typeFilter = activeTab === 'customers' ? 'customer' : (activeTab === 'suppliers' ? 'supplier' : 'all');

                data = UI.state.rawData.ledgers.filter(l => {
                    const safeType = String(l.type).toLowerCase();
                    // STRICT ERP LOGIC: Case-insensitive matching so no parties become ghosts!
                    const matchSearch = (typeFilter === 'all' || safeType === typeFilter) && ((l.name || '').toLowerCase().includes(searchTerm) || (l.phone || '').toLowerCase().includes(searchTerm));
                    let matchFilter = true;
                    const bal = getBal(l.id, l.type);

                    if (activeMasterFilter === 'To Receive') matchFilter = safeType === 'customer' && bal > 0.01;
                    else if (activeMasterFilter === 'To Pay') matchFilter = safeType === 'supplier' && bal > 0.01;
                    else if (activeMasterFilter === 'Advance') matchFilter = bal < -0.01; 
                    else if (activeMasterFilter === 'GST') matchFilter = l.gst && l.gst.trim() !== '';
                    else if (activeMasterFilter === 'Non-GST') matchFilter = !l.gst || l.gst.trim() === '';
                    else if (activeMasterFilter === 'Money In') matchFilter = UI.state.rawData.cashbook.some(c => c.ledgerId === l.id && c.type === 'in');
                    else if (activeMasterFilter === 'Money Out') matchFilter = UI.state.rawData.cashbook.some(c => c.ledgerId === l.id && c.type === 'out');
                    
                    return matchSearch && matchFilter;
                });
                
                if(sortOption === 'name-asc') data.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
                if(sortOption === 'bal-desc') data.sort((a,b) => getBal(b.id, b.type) - getBal(a.id, a.type));
                if(sortOption === 'bal-asc') data.sort((a,b) => getBal(a.id, a.type) - getBal(b.id, b.type));

                UI.renderVirtualList(container, data, (l) => {
                    const isCustomer = String(l.type).toLowerCase() === 'customer';
                    let bal = getBal(l.id, l.type);
                    let balText = '';
                    let balColor = 'var(--md-text-muted)';
                    
                    if (isCustomer) {
                        if (bal > 0.01) { balText = `\u20B9${bal.toFixed(2)} (Receive)`; balColor = 'var(--md-error)'; }
                        else if (bal < -0.01) { balText = `\u20B9${Math.abs(bal).toFixed(2)} (Advance)`; balColor = 'var(--md-success)'; }
                        else { balText = `\u20B90.00`; }
                    } else {
                        if (bal > 0.01) { balText = `\u20B9${bal.toFixed(2)} (Pay)`; balColor = 'var(--md-error)'; }
                        else if (bal < -0.01) { balText = `\u20B9${Math.abs(bal).toFixed(2)} (Advance)`; balColor = 'var(--md-success)'; }
                        else { balText = `\u20B90.00`; }
                    }
                    
                    const rowIcon = isCustomer ? 'person' : 'storefront';
                    const rowColor = isCustomer ? '#0061a4' : '#ba1a1a';

                    // STRICT ERP LOGIC: Custom Card with 1-Click View & PDF Action Buttons!
                    const safeName = (l.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                    return `
                    <div class="m3-card" style="padding: 12px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <div class="tap-target" style="display: flex; align-items: center; gap: 12px;" onclick="app.openPartyLedger('${l.id}', '${l.type}', '${safeName}')">
                            <div class="icon-circle" style="width: 40px; height: 40px; background: var(--md-surface-variant); color: ${rowColor}; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">${rowIcon}</span>
                            </div>
                            <div style="flex: 1; min-width: 0; overflow: hidden;">
                                <strong style="font-size: 15px; color: var(--md-on-surface); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${UI.highlightText(l.name || 'Unnamed Party', searchTerm)}</strong>
                                <small style="color: var(--md-text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${UI.highlightText(l.phone || 'No Phone', searchTerm)}</small>
                            </div>
                            <div style="text-align: right; flex-shrink: 0;">
                                <strong style="font-size: 15px; color: ${balColor};">${balText}</strong>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                            <div class="tap-target" style="width: 36px; height: 36px; border-radius: 50%; background: #e3f2fd; color: #1565c0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onclick="app.openPartyLedger('${l.id}', '${l.type}', '${safeName}')">
                                <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
                            </div>
                            
                            <div class="tap-target" style="width: 36px; height: 36px; border-radius: 50%; background: #fff3e0; color: #e65100; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onclick="window.executeKhataReport('${l.id}', '${safeName}', '${l.type}')">
                                <span class="material-symbols-outlined" style="font-size: 18px;">picture_as_pdf</span>
                            </div>
                        </div>
                    </div>`;
                }, emptyHTML);
            }
            else if (activeTab === 'pay-in' || activeTab === 'pay-out') {
                const targetType = activeTab === 'pay-in' ? 'in' : 'out';
                data = UI.state.rawData.cashbook.filter(c => {
                    const matchSearch = c.type === targetType && ((c.desc || '').toLowerCase().includes(searchTerm));
                    let matchFilter = true;
                    if (activeMasterFilter === 'Cash') matchFilter = (c.mode || '').toLowerCase() === 'cash';
                    if (activeMasterFilter === 'Bank') matchFilter = (c.mode || '').toLowerCase() !== 'cash';
                    return matchSearch && matchFilter && !(c.desc || '').startsWith('Expense');
                });

                UI.renderVirtualList(container, data, (c) => {
                    return UI.renderRowWiseItem(
                        c.desc || 'Transaction', 
                        `${c.date} | ${c.mode || 'Cash'}`, 
                        `${targetType === 'in' ? '+' : '-'}\u20B9${(parseFloat(c.amount) || 0).toFixed(2)}`, 
                        targetType === 'in' ? 'Received' : 'Paid', 
                        targetType === 'in' ? 'arrow_downward' : 'arrow_upward', 
                        targetType === 'in' ? 'var(--md-success)' : 'var(--md-error)', 
                        `app.openReceipt('${c.id}', '${targetType}')`
                    );
                }, emptyHTML);
            }
            else if (activeTab === 'trash') {
                const trashData = UI.state.rawData.trash || [];
                data = trashData.filter(t => (t.name || t.desc || t.invoiceNo || t.poNo || t.expenseNo || t.customerName || t.supplierName || t.category || t.amount || '').toString().toLowerCase().includes(searchTerm));
                
                UI.renderVirtualList(container, data, (t) => {
                    const displayTitle = t.name || t.desc || t.invoiceNo || t.poNo || t.expenseNo || t.category || 'Deleted Item';
                    return `
                    <div class="m3-card" style="padding: 12px; margin-bottom: 8px; border-radius: 8px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <div class="icon-circle" style="width: 40px; height: 40px; background: #fff0f2; color: var(--md-error); border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                        </div>
                        <div style="flex: 1; min-width: 0; overflow: hidden;">
                            <strong style="font-size: 14px; color: var(--md-on-surface); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${UI.highlightText(displayTitle, searchTerm)}</strong>
                            <small style="color: var(--md-text-muted); display: block;">${t.date || 'Unknown Date'} | Mod: ${t._module}</small>
                        </div>
                        <div style="text-align: right; flex-shrink: 0; display: flex; gap: 8px;">
                            <button class="btn-primary-small tap-target" style="padding: 6px 12px; font-size: 12px;" onclick="app.restoreRecord('${t.id}', '${t._module}')">Restore</button>
                            <button class="btn-primary-small tap-target" style="padding: 6px 12px; font-size: 12px; background: transparent; color: var(--md-error); border: 1px solid var(--md-error);" onclick="app.permanentlyDeleteRecord('${t.id}')">Delete</button>
                        </div>
                    </div>`;
                }, emptyHTML);
            }
        }

        // ------------------ EXPENSES ------------------
        else if (tab === 'expenses') {
            containerId = 'expense-history-container';
            data = UI.state.rawData.expenses.filter(e => {
                const matchSearch = (e.category || '').toLowerCase().includes(searchTerm) || (e.notes || '').toLowerCase().includes(searchTerm);
                let matchFilter = true;
                if (activeFilter !== 'All') matchFilter = e.category === activeFilter;
                return matchSearch && matchFilter;
            });

            data.forEach(e => sumValue += (parseFloat(e.amount) || 0));
            if (document.getElementById('sum-expenses')) document.getElementById('sum-expenses').innerText = `\u20B9${sumValue.toFixed(2)}`;

            // BULLETPROOF SORTING: Prevents WebView crashes!
            if(sortOption === 'date-desc') data.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            if(sortOption === 'date-asc') data.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
            if(sortOption === 'amt-desc') data.sort((a,b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
            // NEW: Added Low to High sorting for expenses
            if(sortOption === 'amt-asc') data.sort((a,b) => (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));

            const container = document.getElementById(containerId);
            if (container) {
                const emptyHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined" style="font-size: 64px; color: var(--md-surface-variant);">account_balance_wallet</span>
                    <p style="margin: 12px 0;">No expenses match your filters.</p>
                    <button class="btn-primary" onclick="app.openForm('expense')">+ Log New Expense</button>
                </div>`;

                UI.renderVirtualList(container, data, (e) => {
                    let displayLink = e.linkedInvoice;
                    if (displayLink) {
                        const links = displayLink.split(',').map(x => x.trim()).filter(x => x);
                        const displayNames = links.map(linkId => {
                            const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || s.id.endsWith(linkId));
                            const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || p.id.endsWith(linkId));
                            if (sDoc) return sDoc.orderNo || sDoc.invoiceNo || sDoc.id.slice(-4).toUpperCase();
                            if (pDoc) return pDoc.orderNo || pDoc.poNo || pDoc.invoiceNo || pDoc.id.slice(-4).toUpperCase();
                            return linkId.startsWith('sollo-') ? linkId.slice(-4).toUpperCase() : linkId;
                        });
                        displayLink = [...new Set(displayNames)].join(', ');
                    }
                    
                    return `
                    <div class="m3-card tap-target" style="display:flex; justify-content:space-between; align-items:center;" onclick="app.openForm('expense', '${e.id}')">
                        <div>
                            <strong class="large-text">${e.expenseNo ? e.expenseNo + ' - ' : ''}${e.category || 'General Expense'}</strong><br>
                            <small>${e.date || ''} ${displayLink ? `| <span style="background:var(--md-primary-container); color:var(--md-primary); padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">🔗 ${displayLink}</span>` : ''} | ${e.notes || 'No notes'}</small>
                        </div>
                        <strong style="color:var(--md-error);">\u20B9${(parseFloat(e.amount) || 0).toFixed(2)}</strong>
                    </div>`;
                }, emptyHTML);
            }
        }

        // ------------------ CASHBOOK ------------------
        else if (tab === 'cashbook') {
            // CRITICAL FIX: Ensure the Live Balance Bank calculator fires when tab is rendered
            UI.renderBankBalances(); 
            
            containerId = 'cashbook-container';
            data = UI.state.rawData.cashbook.filter(c => {
                const matchSearch = (c.desc || '').toLowerCase().includes(searchTerm) || 
                                    (c.mode || '').toLowerCase().includes(searchTerm) ||
                                    (c.ledgerName || '').toLowerCase().includes(searchTerm) ||
                                    (c.receiptNo || '').toLowerCase().includes(searchTerm) ||
                                    String(c.amount).includes(searchTerm);
                let matchFilter = true;
                if (activeFilter === 'In') matchFilter = c.type === 'in';
                if (activeFilter === 'Out') matchFilter = c.type === 'out';
                return matchSearch && matchFilter;
            });

            // BULLETPROOF SORTING: Prevents WebView crashes!
            if(sortOption === 'date-desc') data.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            if(sortOption === 'date-asc') data.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));

            const container = document.getElementById(containerId);
            if (container) {
                const emptyHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined" style="font-size: 64px; color: var(--md-surface-variant);">account_balance</span>
                    <p style="margin: 12px 0;">No bank transactions match your filters.</p>
                </div>`;

                UI.renderVirtualList(container, data, (t) => {
                    let displayLink = '';
                    const refData = t.invoiceRef || t.linkedInvoice;
                    if (refData) {
                        const links = String(refData).split(',').map(x => x.trim()).filter(x => x);
                        const displayNames = links.map(linkId => {
                            const eDoc = UI.state.rawData.expenses.find(e => e.id === linkId || e.expenseNo === linkId);
                            if (eDoc && eDoc.linkedInvoice) {
                                const eLinks = String(eDoc.linkedInvoice).split(',').map(x => x.trim());
                                const eNames = eLinks.map(el => {
                                    const s = UI.state.rawData.sales.find(doc => doc.id === el || doc.invoiceNo === el || doc.orderNo === el);
                                    if (s) return s.orderNo || s.invoiceNo || String(s.id).slice(-4).toUpperCase();
                                    const p = UI.state.rawData.purchases.find(doc => doc.id === el || doc.invoiceNo === el || doc.poNo === el || doc.orderNo === el);
                                    if (p) return p.orderNo || p.poNo || p.invoiceNo || String(p.id).slice(-4).toUpperCase();
                                    return el.startsWith('sollo-') ? el.slice(-4).toUpperCase() : el;
                                });
                                return (eDoc.expenseNo || 'EXP') + ' (🔗 ' + eNames.join(', ') + ')';
                            }

                            const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || s.id.endsWith(linkId));
                            const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || p.id.endsWith(linkId));
                            
                            if (sDoc) {
                                let ref = sDoc.invoiceNo || sDoc.orderNo || sDoc.id.slice(-4).toUpperCase();
                                return /^\d+$/.test(ref) ? 'INV-' + ref : ref;
                            }
                            if (pDoc) {
                                let ref = pDoc.invoiceNo || pDoc.poNo || pDoc.orderNo || pDoc.id.slice(-4).toUpperCase();
                                return /^\d+$/.test(ref) ? 'PO-' + ref : ref;
                            }
                            if (eDoc) return eDoc.expenseNo || 'EXP';

                            if (linkId.includes('sales')) return 'INV-' + linkId.slice(-4).toUpperCase();
                            if (linkId.includes('purchase')) return 'PO-' + linkId.slice(-4).toUpperCase();
                            
                            return linkId.startsWith('sollo-') ? linkId.slice(-4).toUpperCase() : (/^\d+$/.test(linkId) ? 'DOC-' + linkId : linkId);
                        });
                        displayLink = [...new Set(displayNames)].join(', ');
                    }

                    const safeMode = String(t.mode || '').toLowerCase();
                    const safeLedger = String(t.ledgerName || '').toLowerCase();
                    const isExpense = safeMode.includes('expense') || safeLedger.includes('expense');
                    
                    const thirdLine = isExpense 
                        ? '' 
                        : `<br><small>Party: <strong style="color:var(--md-primary)">${t.ledgerName || 'N/A'}</strong> | Mode: ${t.mode || 'Cash'}</small>`;

                    return `
                    <div class="m3-card tap-target" style="display:flex; justify-content:space-between; align-items:center;" onclick="app.openReceipt('${t.id}', '${t.type}')">
                        <div>
                            <strong class="large-text">${t.receiptNo ? t.receiptNo + ' - ' : ''}${t.desc || 'Transaction'}</strong><br>
                            <small>${t.date || ''} ${displayLink ? `| <span style="background:var(--md-primary-container); color:var(--md-primary); padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">🔗 ${displayLink}</span>` : ''}</small>${thirdLine}
                        </div>
                        <strong style="font-size:16px; color:${t.type === 'in' ? 'var(--md-success)' : 'var(--md-error)'};">
                            ${t.type === 'in' ? '+' : '-'}\u20B9${(parseFloat(t.amount) || 0).toFixed(2)}
                        </strong>
                    </div>`;
                }, emptyHTML);
            }
        }

        // ------------------ TIMELINE ------------------
        else if (tab === 'timeline') {
            containerId = 'timeline-list';
            
            // Get Custom Dates if set
            const startEl = document.getElementById('timeline-start-date');
            const endEl = document.getElementById('timeline-end-date');
            const startDate = startEl ? startEl.value : '';
            const endDate = endEl ? endEl.value : '';

            data = UI.state.rawData.timeline.filter(t => {
                const descStr = t.desc || (t.type === 'IN' ? 'Purchase' : (t.type === 'OUT' ? 'Sale' : ''));
                // STRICT ERP LOGIC: Allow accountants to instantly search the global timeline by exact Transaction Amount or Balance!
                const matchSearch = descStr.toLowerCase().includes(searchTerm) || String(t.amount || 0).includes(searchTerm) || String(t.runningBalance || 0).includes(searchTerm);
                let matchFilter = true;
                let matchDate = true;

                // 1. Check Date Range
                if (startDate && endDate && t.date) {
                    matchDate = (t.date >= startDate && t.date <= endDate);
                }
                
                // 2. Universal Type Check (Works for Banks, Parties, AND Expenses)
                if (activeFilter === 'Money In') {
                    if (t.hasOwnProperty('isInvoice')) matchFilter = t.isInvoice === false; 
                    else matchFilter = String(t.type).toUpperCase() === 'IN'; // STRICT ERP LOGIC: Fix case sensitivity and remove broken fallback
                } else if (activeFilter === 'Money Out') {
                    if (t.hasOwnProperty('isInvoice')) matchFilter = t.isInvoice === true; 
                    else matchFilter = String(t.type).toUpperCase() === 'OUT'; // STRICT ERP LOGIC: Fix case sensitivity and remove broken fallback
                } else if (activeFilter === 'Expenses') {
                    matchFilter = descStr.toLowerCase().includes('expense');
                }
                
                return matchSearch && matchFilter && matchDate;
            });

            // STRICT ERP LOGIC: Sort by Date AND Time (Descending) to fix Backdated Receipt chronological desync!
            data.sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                if (dateB !== dateA) return dateB - dateA;
                // ENTERPRISE FIX: Extract the integer timestamp to prevent Timeline same-day scrambling!
                const timeA = parseInt(String(a.id || '').split('-').pop()) || 0;
                const timeB = parseInt(String(b.id || '').split('-').pop()) || 0;
                return timeB - timeA;
            });

            const container = document.getElementById(containerId);
            if (container) {
                const emptyHTML = '<p class="empty-state">No records match your filters.</p>';

                UI.renderVirtualList(container, data, (t) => {
                    let displayLink = '';
                    const refData = t.invoiceRef || t.linkedInvoice;
                    if (refData) {
                        const links = String(refData).split(',').map(x => x.trim()).filter(x => x);
                        const displayNames = links.map(linkId => {
                            const sDoc = UI.state.rawData.sales.find(s => s.id === linkId || s.invoiceNo === linkId || s.orderNo === linkId || s.id.endsWith(linkId));
                            const pDoc = UI.state.rawData.purchases.find(p => p.id === linkId || p.poNo === linkId || p.invoiceNo === linkId || p.orderNo === linkId || p.id.endsWith(linkId));
                            if (sDoc) return sDoc.orderNo || sDoc.invoiceNo || sDoc.id.slice(-4).toUpperCase();
                            if (pDoc) return pDoc.orderNo || pDoc.poNo || pDoc.invoiceNo || pDoc.id.slice(-4).toUpperCase();
                            return linkId.startsWith('sollo-') ? linkId.slice(-4).toUpperCase() : linkId;
                        });
                        displayLink = [...new Set(displayNames)].join(', ');
                    }

                    if (t.hasOwnProperty('isInvoice')) {
                        return `
                        <div class="m3-card" style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong class="large-text">${t.desc || 'Document'}</strong><br>
                                <small>${t.date} ${displayLink ? `| <span style="background:var(--md-primary-container); color:var(--md-primary); padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">🔗 ${displayLink}</span>` : ''}</small>
                            </div>
                            <div style="text-align:right;">
                                <strong style="color:${t.isInvoice ? 'var(--md-error)' : 'var(--md-success)'};">\u20B9${parseFloat(t.amount || 0).toFixed(2)}</strong><br>
                                <small>Bal: \u20B9${(t.runningBalance || 0).toFixed(2)}</small>
                            </div>
                        </div>`;
                    } else {
                        // STRICT ERP LOGIC: Properly render BOTH Invoices and Receipts in the Global Timeline without "undefined" corruption!
                        const safeType = String(t.type).toUpperCase();
                        const isMoneyIn = safeType === 'IN';
                        const sign = isMoneyIn ? '+' : '-';
                        const color = isMoneyIn ? 'var(--md-success)' : 'var(--md-error)';
                        
                        const title = t.party ? `${isMoneyIn ? 'Purchase' : 'Sale'} - ${t.party}` : (t.desc || 'Transaction');
                        const subtitle = t.ref ? `${t.date} | Ref: ${t.ref}` : `${t.date} | Mode: ${t.mode || 'Cash'}`;
                        const rightVal = t.qty ? t.qty : `${sign}\u20B9${parseFloat(t.amount || 0).toFixed(2)}`;

                        return `
                        <div class="m3-card" style="display:flex; justify-content:space-between; align-items:center;">
                            <div><strong class="large-text">${title}</strong><br><small>${subtitle}</small></div>
                            <strong style="font-size:16px; color:${color};">${rightVal}</strong>
                        </div>`;
                    }
                }, emptyHTML);
            }
        }
    },

    // ==========================================
    // 5. TRUE PROFIT DASHBOARD & DATE FILTERS
    // ==========================================
    renderDashboard: () => {
        const filterEl = document.getElementById('dashboard-date-filter');
        const dateFilter = filterEl ? filterEl.value : 'all';
        const todayStr = typeof Utils !== 'undefined' && Utils.getLocalDate ? Utils.getLocalDate() : new Date().toISOString().split('T')[0];
        
        // ENTERPRISE FIX: Absolute Timezone-Safe Date Math
        const currentYear = parseInt(todayStr.split('-')[0], 10);
        const currentMonth = parseInt(todayStr.split('-')[1], 10) - 1;

        const isDateInRange = (dateStr) => {
            if (dateFilter === 'all') return true;
            if (!dateStr) return false;
            if (dateFilter === 'today') return dateStr === todayStr;
            
            const [yearStr, monthStr, dayStr] = dateStr.split('-');
            const itemYear = parseInt(yearStr, 10);
            const itemMonth = parseInt(monthStr, 10) - 1;
            
            if (dateFilter === 'month') return itemMonth === currentMonth && itemYear === currentYear;
            if (dateFilter === 'year') return itemYear === currentYear;
            return true;
        };

        // ENTERPRISE FIX: Secure Data Isolation (Prevent Multi-Firm Data Leaks)
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;

        const sales = UI.state.rawData.sales.filter(s => !activeFirmId || s.firmId === activeFirmId);
        const purchases = UI.state.rawData.purchases.filter(p => !activeFirmId || p.firmId === activeFirmId);
        const expenses = UI.state.rawData.expenses.filter(e => !activeFirmId || e.firmId === activeFirmId);
        const cashbook = UI.state.rawData.cashbook.filter(c => !activeFirmId || c.firmId === activeFirmId);

        let totalSales = 0, outputGst = 0, totalPurchases = 0, inputGst = 0, totalExpenses = 0;
        let cogs = 0; 

        // CRITICAL FIX: Dashboard Payment Map Math & Collision Guard
        const paymentMap = {};
        const ledgerTotalPaid = {}; 
        const ledgerExplicitlyLinked = {}; 

        // STRICT ERP LOGIC: Build an O(1) Document Hash Map to prevent O(N^2) Dashboard Boot-Up Freezes!
        const dashDocMap = {};
        sales.forEach(d => { dashDocMap[d.id] = d; if(d.invoiceNo) dashDocMap[d.invoiceNo] = d; if(d.orderNo) dashDocMap[d.orderNo] = d; });
        purchases.forEach(d => { dashDocMap[d.id] = d; if(d.poNo) dashDocMap[d.poNo] = d; if(d.invoiceNo) dashDocMap[d.invoiceNo] = d; if(d.orderNo) dashDocMap[d.orderNo] = d; });

        // ENTERPRISE FIX: Inject Opening Balances into the Dashboard's Math Engine so "Overdue Defaulters" aren't artificially inflated!
        UI.state.rawData.ledgers.forEach(l => {
            let ob = parseFloat(l.openingBalance) || 0;
            const bType = (l.balanceType || '').toLowerCase();
            if (bType.includes('pay') || bType.includes('credit')) ledgerTotalPaid[l.id] = (ledgerTotalPaid[l.id] || 0) + ob;
        });

        cashbook.forEach(c => {
            if (c.ledgerId) {
                let amt = c.type === 'in' ? parseFloat(c.amount) : -parseFloat(c.amount);
                ledgerTotalPaid[c.ledgerId] = (ledgerTotalPaid[c.ledgerId] || 0) + amt;

                if (c.invoiceRef) {
                    const refs = String(c.invoiceRef).split(',').map(r => r.trim());
                    let remainingAmt = amt;
                    
                    // Waterfall Allocation (FIFO)
                    const matchedDocs = refs.map(ref => dashDocMap[ref] || { id: ref, grandTotal: Infinity, date: '1970-01-01' });
                    
                    matchedDocs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                    
                    matchedDocs.forEach(doc => {
                        if (Math.abs(remainingAmt) < 0.01) return; // Allow negative amounts for supplier payments & refunds!
                        const key = `${c.ledgerId}_${doc.id}`;
                        const currentPaid = paymentMap[key] || 0;
                        const docTotal = doc.grandTotal === Infinity ? Infinity : (parseFloat(doc.grandTotal) || 0);
                        
                        let allocation = 0;
                        if (remainingAmt > 0) {
                            allocation = Math.min(Math.max(0, docTotal - currentPaid), remainingAmt);
                        } else {
                            allocation = Math.max(-currentPaid, remainingAmt); 
                        }
                        
                        if (Math.abs(allocation) > 0) {
                            paymentMap[key] = currentPaid + allocation;
                            ledgerExplicitlyLinked[c.ledgerId] = (ledgerExplicitlyLinked[c.ledgerId] || 0) + allocation;
                            remainingAmt -= allocation;
                        }
                    });
                }
            }
        });

        // --- ENTERPRISE UPGRADE: DASHBOARD FIFO KNOCKOFF FOR OVERDUE SALES ---
        const advancePool = {};
        Object.keys(ledgerTotalPaid).forEach(ledgerId => {
            const totalPaid = ledgerTotalPaid[ledgerId] || 0;
            const explicitlyLinked = ledgerExplicitlyLinked[ledgerId] || 0;
            if (totalPaid > explicitlyLinked) advancePool[ledgerId] = totalPaid - explicitlyLinked;
            else advancePool[ledgerId] = 0;
        });

        const sortedSales = [...sales].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        sortedSales.forEach(doc => {
            if (doc.status !== 'Open' && doc.documentType !== 'return') {
                if (advancePool[doc.customerId] > 0.01) {
                    const uniqueRefs = [...new Set([doc.orderNo, doc.invoiceNo, doc.id].filter(Boolean))];
                    const explicitPaid = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${doc.customerId}_${ref}`] || 0), 0);
                    const due = (parseFloat(doc.grandTotal) || 0) - explicitPaid;
                    
                    if (due > 0.01) {
                        const allocated = Math.min(due, advancePool[doc.customerId]);
                        advancePool[doc.customerId] -= allocated;
                        paymentMap[`${doc.customerId}_${doc.id}`] = (paymentMap[`${doc.customerId}_${doc.id}`] || 0) + allocated;
                    }
                }
            }
        });

        sales.forEach(s => { 
            if(s.status !== 'Open' && isDateInRange(s.date)) { 
                const isReturn = s.documentType === 'return';
                const modifier = isReturn ? -1 : 1;

                // UX FIX: Show Full Invoice Value (including GST) so it matches your Sales Tab
                totalSales += (parseFloat(s.grandTotal) || 0) * modifier; 
                outputGst += (parseFloat(s.totalGst) || 0) * modifier; 
                
                (s.items || []).forEach(item => {
                    const historicalCost = parseFloat(item.buyPrice) || 0;
                    cogs += ((parseFloat(item.qty) || 0) * historicalCost) * modifier;
                });
            }
        });        
        purchases.forEach(p => { 
            if (p.status !== 'Open' && isDateInRange(p.date)) { 
                const isReturn = p.documentType === 'return';
                const modifier = isReturn ? -1 : 1;
                const netPurchase = (parseFloat(p.grandTotal) || 0) - (parseFloat(p.totalGst) || 0);
                totalPurchases += netPurchase * modifier; 
                inputGst += (p.totalGst || 0) * modifier; 
            } 
        });
        
        // --- CLEAN DASHBOARD: CALCULATE TOTAL EXPENSES (Hidden from UI) ---
        expenses.forEach(e => { 
            if(isDateInRange(e.date)) {
                totalExpenses += parseFloat(e.amount) || 0; 
            }
        });
        
        // Ensure the old expense container is completely hidden to keep the UI clean
        const expenseContainer = document.getElementById('expense-ledger-container');
        if (expenseContainer) expenseContainer.style.display = 'none';

        // --- ENTERPRISE UPGRADE: CATCHING INDIRECT INCOME & STOCK LOSS ---
        let indirectIncome = 0;
        cashbook.forEach(c => {
            if (isDateInRange(c.date) && c.type === 'in' && !c.invoiceRef && !c.linkedInvoice) {
                // STRICT ERP LOGIC: Prevent deleted customers from artificially inflating Net Profit!
                const isCustomerOrSupplier = UI.state.rawData.ledgers.some(l => l.id === c.ledgerId) || 
                                             UI.state.rawData.sales.some(s => s.customerId === c.ledgerId) || 
                                             UI.state.rawData.purchases.some(p => p.supplierId === c.ledgerId);
                const ledgerName = (c.ledgerName || '').toLowerCase();
                if (!isCustomerOrSupplier && !ledgerName.includes('cash drawer') && !ledgerName.includes('advance')) {
                    indirectIncome += parseFloat(c.amount) || 0;
                }
            }
        });

        // Optional: If you sync adjustments to UI.state.rawData, deduct lost stock here
        let stockLoss = 0;
        if (UI.state.rawData.adjustments) {
            UI.state.rawData.adjustments.forEach(adj => {
                // ENTERPRISE FIX: Enforce Firm ID isolation so Company B's stock loss doesn't destroy Company A's Net Profit!
                if ((!activeFirmId || adj.firmId === activeFirmId) && adj.type === 'reduce' && isDateInRange(adj.date)) {
                    const product = UI.state.rawData.items.find(i => i.id === adj.itemId);
                    stockLoss += (parseFloat(adj.qty) || 0) * (product ? parseFloat(product.buyPrice) || 0 : 0);
                }
            });
        }

        // TRUE ACCRUAL PROFIT MATH (Upgraded)
        const netRevenue = (totalSales - outputGst) + indirectIncome; 
        const grossMargin = netRevenue - cogs;
        const trueNetProfit = grossMargin - (totalExpenses + stockLoss); 

        // UPGRADE 1: Count-Up Animation Engine
        const animateValue = (id, start, end, duration) => {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                // Ease-out formula for smoother deceleration
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentVal = (easeOut * (end - start) + start);
                // STRICT ERP LOGIC: Safely format negative currency numbers (e.g. -₹500 instead of ₹-500)
                obj.innerHTML = currentVal < 0 
                    ? '-\u20B9' + Math.abs(currentVal).toFixed(2) 
                    : '\u20B9' + currentVal.toFixed(2);
                if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
        };

        // Update DOM with Animation (Duration: 800ms)
        animateValue('dash-total-sales', 0, totalSales, 800);
        
        const netProfitEl = document.getElementById('dash-net-profit');
        if(netProfitEl) {
            animateValue('dash-net-profit', 0, trueNetProfit, 800);
            netProfitEl.style.color = trueNetProfit >= 0 ? 'var(--md-success)' : 'var(--md-error)';
        }
        
        if(document.getElementById('profit-breakdown')) document.getElementById('profit-breakdown').innerText = `Gross: \u20B9${grossMargin.toFixed(0)} | Exp: \u20B9${totalExpenses.toFixed(0)}`;
        
        // NEW: Operational Order Volume Tracking (Open, Shipped, Completed)
        let openOrders = 0, shippedOrders = 0, completedOrders = 0;
        let openCount = 0, shippedCount = 0, completedCount = 0;

        sales.forEach(s => {
            // Apply the global dashboard date filter to the pipeline
            if (isDateInRange(s.date)) {
                const isReturn = s.documentType === 'return';
                const modifier = isReturn ? -1 : 1;
                const val = (parseFloat(s.grandTotal) || 0) * modifier;
                
                if (s.status === 'Open') {
                    openOrders += val;
                    if (!isReturn) openCount++;
                } else if (s.status === 'Shipped') {
                    shippedOrders += val;
                    if (!isReturn) shippedCount++;
                } else if (s.status === 'Completed') {
                    completedOrders += val;
                    if (!isReturn) completedCount++;
                }
            }
        });

        if(document.getElementById('dash-orders-open')) document.getElementById('dash-orders-open').innerHTML = `${openCount} Orders <strong style="color:var(--md-error); margin-left:8px;">\u20B9${openOrders.toFixed(2)}</strong>`;
        if(document.getElementById('dash-orders-shipped')) document.getElementById('dash-orders-shipped').innerHTML = `${shippedCount} Orders <strong style="color:#f57f17; margin-left:8px;">\u20B9${shippedOrders.toFixed(2)}</strong>`;
        if(document.getElementById('dash-orders-completed')) document.getElementById('dash-orders-completed').innerHTML = `${completedCount} Orders <strong style="color:var(--md-success); margin-left:8px;">\u20B9${completedOrders.toFixed(2)}</strong>`;
        // --- NEW CODE: Call the chart updater ---
        UI.updateChart(totalSales, totalPurchases, totalExpenses);
        // --- END OF NEW CODE ---

        // --- OVERDUE REMINDERS SAFELY INSIDE THE FUNCTION ---
        const overdueSales = sales.filter(s => {
            if (s.status === 'Open' || s.documentType === 'return') return false;
            
            // FIX: Check ALL references to catch cross-linked payments, and respect FIFO completion!
            const uniqueRefs = [...new Set([s.orderNo, s.invoiceNo, s.id].filter(Boolean))];
            const totalReceived = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${s.customerId}_${ref}`] || 0), 0);
            
            // ENTERPRISE FIX: Subtract Credit Notes so returned items don't turn honest customers into false Defaulters!
            const linkedReturns = sales.filter(d => d.documentType === 'return' && d.status !== 'Open' && uniqueRefs.includes(d.orderNo));
            const returnTotal = linkedReturns.reduce((sum, ret) => sum + (parseFloat(ret.grandTotal) || 0), 0);
            
            const balance = Math.max(0, (parseFloat(s.grandTotal) || 0) - totalReceived - returnTotal);
            if (balance <= 0) return false;
            
            if (!s.date) return false;
            // BULLETPROOF DATE MATH: Manually parse YYYY-MM-DD so old WebViews don't panic!
            const parts = s.date.split('-'); 
            const invoiceDate = new Date(parts[0], parts[1] - 1, parts[2]); 
            
            // ENTERPRISE FIX: Safely recreate 'today' using the timezone-safe string!
            const tParts = todayStr.split('-');
            const todayDate = new Date(tParts[0], tParts[1] - 1, tParts[2]);
            
            const diffTime = todayDate - invoiceDate;
            if (diffTime < 0) return false; // Prevent future/post-dated invoices from being flagged!
            
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays > 15;
        });

        // UPGRADE 2: Update Bottom Nav Notification Badge for Actionable Documents
        const pendingPurchases = purchases.filter(p => p.status === 'Open').length;
        const totalAlerts = overdueSales.length + pendingPurchases;
        const badgeEl = document.getElementById('badge-docs');
        if (badgeEl) {
            if (totalAlerts > 0) {
                badgeEl.innerText = totalAlerts;
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        }

        // UPGRADE 3: Native OS Home Screen App Badging
        if ('setAppBadge' in navigator) {
            if (totalAlerts > 0) {
                navigator.setAppBadge(totalAlerts).catch(e => console.error("Badging error", e));
            } else {
                navigator.clearAppBadge().catch(e => console.error("Badging clear error", e));
            }
        }

        const overdueContainer = document.getElementById('overdue-reminders-container');
        if (overdueContainer) {
            if (overdueSales.length > 0) {
                overdueContainer.classList.remove('hidden');
                document.getElementById('overdue-text').innerText = `${overdueSales.length} invoices pending over 15 days.`;
                
                document.getElementById('list-overdue').innerHTML = overdueSales.map(s => {
                    // FIX: Update the dashboard display to match the new cross-linked math!
                    const uniqueRefs = [...new Set([s.orderNo, s.invoiceNo, s.id].filter(Boolean))];
                    const totalReceived = uniqueRefs.reduce((sum, ref) => sum + (paymentMap[`${s.customerId}_${ref}`] || 0), 0);
                    const balance = Math.max(0, (parseFloat(s.grandTotal) || 0) - totalReceived);
                    return `
                    <li>
                        <div>
                            <strong class="large-text">${s.customerName || 'Unknown Party'}</strong><br>
                            <small class="color-primary">Inv: ${s.invoiceNo || 'Draft'} | Bal: <strong style="color:var(--md-error)">\u20B9${balance.toFixed(2)}</strong></small>
                        </div>
                        <span style="background:#fff0f2; color:#be123c; border:1px solid #be123c; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Overdue</span>
                    </li>`;
                }).join('');
            } else {
                overdueContainer.classList.add('hidden');
            }
        }
    }, // <-- ADDED THIS MISSING BRACKET AND COMMA!
    // ==========================================
    // NEW CODE: DYNAMIC CHART ENGINE
    // ==========================================
    chartInstance: null,

    updateChart: (salesAmt, purchaseAmt, expenseAmt) => {
        const canvas = document.getElementById('dashboard-chart');
        if (!canvas) return;
        
        // ENTERPRISE FIX: Prevent a fatal white-screen crash if the app is launched offline and Chart.js is unreachable!
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is offline. Skipping graph rendering to protect Dashboard.');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Destroy the old chart before drawing a new one
        if (UI.chartInstance) {
            UI.chartInstance.destroy();
        }

        // Create the premium fade-out gradient under the line
        const fluidGradient = ctx.createLinearGradient(0, 0, 0, 300);
        fluidGradient.addColorStop(0, 'rgba(0, 97, 164, 0.4)'); // Darker blue at top
        fluidGradient.addColorStop(1, 'rgba(0, 97, 164, 0.0)'); // Fades to transparent at bottom

        UI.chartInstance = new Chart(ctx, {
            type: 'line', // CHANGED: Fluid Line Chart
            data: {
                labels: ['Sales', 'Purchases', 'Expenses'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [salesAmt, purchaseAmt, expenseAmt],
                    borderColor: 'var(--md-primary)', // Deep Blue Line
                    backgroundColor: fluidGradient, // Fluid transparency
                    borderWidth: 3,
                    tension: 0.4, // Creates the smooth Apple-style curves
                    fill: true, // Fills the area under the curve
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: 'var(--md-primary)',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false } // Hides the legend since our labels are self-explanatory
                },
                scales: {
                    x: { 
                        grid: { display: false } // Hides vertical grid lines for a cleaner look
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [4, 4], color: 'var(--md-surface-variant)' }, // Soft dashed horizontal lines
                        ticks: {
                            callback: function(value) { return '₹' + value; }
                        }
                    }
                }
            }
        });
    },
    // ==========================================
    // END OF NEW CODE
    // ==========================================

    // ==========================================
    // 6. BOTTOM SHEETS & PRODUCT CRUD
    // ==========================================
    openBottomSheet: (sheetId) => {
        const sheet = document.getElementById(sheetId);
        const overlay = document.getElementById('sheet-overlay');
        
        if (sheet && sheet.classList.contains('open')) return; 

        history.pushState({ modalOpen: true }, ''); 

        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'block';
            void overlay.offsetWidth; 
            requestAnimationFrame(() => overlay.classList.add('open'));
        }

        if (sheet) {
            sheet.classList.remove('hidden'); 
            sheet.style.display = 'flex'; /* FIX: Restores bottom-sheet flex layout */
            // FIX: Removed 'willChange' which was locking Android WebView scrolling!
            void sheet.offsetWidth; 
            requestAnimationFrame(() => { sheet.classList.add('open'); });
        }
        
        // UPGRADE: Dynamic Status Bar Colors!
        if (sheetId === 'sheet-payment-in') { UI.toggleDeleteButton('receipt-in', false); UI.setStatusBarColor('#146c2e'); }
        if (sheetId === 'sheet-payment-out') { UI.toggleDeleteButton('receipt-out', false); UI.setStatusBarColor('#ba1a1a'); }
        if (sheetId === 'sheet-stock-adjustment') { UI.setStatusBarColor('#f57f17'); }

        if (sheetId === 'sheet-master-sort') {
            const filterSelect = document.getElementById('filter-master-view');
            const sortSelect = document.getElementById('sort-master-view');

            if (filterSelect) {
                const tab = UI.state.activeMasterTab;
                
                // --- FIX: SAVE PREVIOUS SELECTIONS ---
                const savedFilter = filterSelect.value;
                const savedSort = sortSelect ? sortSelect.value : null;

                // NEW: Unified Filtering & Sorting for all Ledger types!
                if (tab === 'customers' || tab === 'suppliers' || tab === 'contacts') {
                    filterSelect.innerHTML = `
                        <option value="All">All Status</option>
                        <option value="To Receive">To Receive (Due)</option>
                        <option value="To Pay">To Pay (Due)</option>
                        <option value="Advance">Advance (Paid / Received)</option>
                        <option value="GST">GST Registered</option>
                        <option value="Non-GST">Non-GST</option>
                        <option value="Money In">Money In (Received)</option>
                        <option value="Money Out">Money Out (Paid)</option>
                    `;
                    if(sortSelect) sortSelect.innerHTML = `
                        <option value="name-asc">A to Z</option>
                        <option value="bal-desc">Balance: High to Low</option>
                        <option value="bal-asc">Balance: Low to High</option>
                    `;
                } else if (tab === 'pay-in' || tab === 'pay-out') {
                    filterSelect.innerHTML = `<option value="All">All Modes</option><option value="Cash">Cash Only</option><option value="Bank">Bank / Online Only</option>`;
                    if(sortSelect) sortSelect.innerHTML = `<option value="date-desc">Newest First</option><option value="date-asc">Oldest First</option>`;
                } else if (tab === 'trash') {
                    filterSelect.innerHTML = `<option value="All">All Trashed Items</option>`;
                    if(sortSelect) sortSelect.innerHTML = `<option value="date-desc">Recently Deleted</option>`;
                } else {
                    // NEW: Products gets the 'Stock Available' filter, but keeps its original sorting
                    filterSelect.innerHTML = `<option value="All">All Products</option><option value="In Stock">Stock Available</option>`;
                    if(sortSelect) sortSelect.innerHTML = `<option value="name-asc">A to Z</option><option value="stock-asc">Lowest Stock First</option>`;
                }

                // --- FIX: RESTORE PREVIOUS SELECTIONS ---
                // Re-apply the user's choices to the newly drawn menu
                if (savedFilter) filterSelect.value = savedFilter;
                if (savedSort && sortSelect) sortSelect.value = savedSort;
            }
        }

        if (sheetId === 'sheet-customers') {
            const searchBox = document.getElementById('search-customers');
            if (searchBox) { searchBox.value = ''; setTimeout(() => searchBox.focus(), 350); } // UPGRADE: Auto-focus keyboard!
            // ENTERPRISE FIX: Case-insensitive match to prevent database casing bugs
            const customers = UI.state.rawData.ledgers.filter(l => String(l.type).toLowerCase() === 'customer');
            UI.renderLedgerList('list-customers', customers, UI.state.currentPrefix || 'sales');
            document.querySelectorAll('#list-customers li').forEach(li => li.style.display = ''); // Force list to be visible
        }
        else if (sheetId === 'sheet-suppliers') {
            const searchBox = document.getElementById('search-suppliers');
            if (searchBox) { searchBox.value = ''; setTimeout(() => searchBox.focus(), 350); } // UPGRADE: Auto-focus keyboard!
            // ENTERPRISE FIX: Case-insensitive match to prevent database casing bugs
            const suppliers = UI.state.rawData.ledgers.filter(l => String(l.type).toLowerCase() === 'supplier');
            UI.renderLedgerList('list-suppliers', suppliers, UI.state.currentPrefix || 'purchase');
            document.querySelectorAll('#list-suppliers li').forEach(li => li.style.display = ''); // Force list to be visible
        }
        else if (sheetId === 'sheet-products') {
            const searchBox = document.getElementById('search-products');
            if (searchBox) { searchBox.value = ''; setTimeout(() => searchBox.focus(), 350); } // UPGRADE: Auto-focus keyboard!
            UI.renderProductList(UI.state.rawData.items);
            document.querySelectorAll('#list-products li').forEach(li => li.style.display = ''); // Force list to be visible
        }
        else if (sheetId === 'sheet-stock-adjustment') {
            // STRICT ERP LOGIC: Let app.js handle the dropdown so the Dual-Stock GST/Non-GST pools aren't erased!
            const dateInput = document.getElementById('adj-date');
            if(dateInput) {
                const today = typeof Utils !== 'undefined' && Utils.getLocalDate ? Utils.getLocalDate() : new Date().toISOString().split('T')[0];
                dateInput.value = today;
                if (dateInput._flatpickr) dateInput._flatpickr.setDate(today); // FIX: Sync Flatpickr
            }
        }
        else if (sheetId === 'sheet-payment-in' || sheetId === 'sheet-payment-out') {
            // UPGRADE: Reset the display card when opening a new payment form
            const prefix = sheetId === 'sheet-payment-in' ? 'pay-in' : 'pay-out';
            const display = document.getElementById(`${prefix}-customer-display`) || document.getElementById(`${prefix}-supplier-display`);
            const input = document.getElementById(`${prefix}-customer`) || document.getElementById(`${prefix}-supplier`);
            
            if (display) {
                display.innerText = sheetId === 'sheet-payment-in' ? 'Select Customer...' : 'Select Supplier...';
                display.style.color = 'var(--md-text-muted)';
            }
            if (input) input.value = '';
        }
    },

        closeBottomSheet: (sheetId) => {
        const sheet = document.getElementById(sheetId);
        // ENTERPRISE FIX: Prevent double-tapping from popping multiple history states and crashing the main form!
        if (!sheet || !sheet.classList.contains('open')) return;
        
        sheet.classList.remove('open');

        // --- ENTERPRISE FIX: MULTI-LAYER OVERLAY PROTECTOR ---
        // Only close the dark overlay if NO OTHER bottom sheets are currently open
        const remainingSheets = Array.from(document.querySelectorAll('.bottom-sheet.open')).filter(s => s.id !== sheetId);
        const overlay = document.getElementById('sheet-overlay');

        if (remainingSheets.length === 0 && overlay) {
            overlay.classList.remove('open');
            UI.resetStatusBarColor(); // Only reset the status bar if ALL sheets are gone
        }

        setTimeout(() => { 
            if (sheet) sheet.classList.add('hidden');
            // STRICT ERP LOGIC: Re-check the DOM dynamically to prevent vanishing overlays on rapid switching, and ignore the haptic menu!
            const currentlyOpen = document.querySelectorAll('.bottom-sheet.open:not(#haptic-menu)').length;
            if (currentlyOpen === 0 && overlay) overlay.classList.add('hidden'); 
        }, 300);

        // ENTERPRISE FIX: Only clear the Receipt ID if we are actually closing the Cashbook form!
        if ((sheetId === 'sheet-payment-in' || sheetId === 'sheet-payment-out') && typeof app !== 'undefined' && app.state) {
            app.state.currentReceiptId = null;
        }
        
        // ENTERPRISE FIX: Smart Search does not use history states! 
        // Returning here prevents the search menu from stealing the Cashbook's state and closing the entire form!
        if (sheetId === 'sheet-smart-search') return;
        
        // FIXED: Added an ignore flag to prevent double-closing
        if (history.state && history.state.modalOpen) { window._ignoreNextPop = true; history.back(); }
    },

    // ==========================================
    // ENTERPRISE UPGRADE: SMART SEARCH ENGINE
    // ==========================================
    // ==========================================
    // ENTERPRISE UPGRADE: DEDICATED SMART SEARCH
    // ==========================================
    openSmartSearch: (targetType, formPrefix) => {
        UI.state.smartSearchTarget = targetType;
        UI.state.smartSearchPrefix = formPrefix;
        
        const titleEl = document.getElementById('smart-search-title');
        const inputEl = document.getElementById('smart-search-input');
        
        if (targetType === 'customer') titleEl.innerText = "Select Customer";
        else if (targetType === 'supplier') titleEl.innerText = "Select Supplier";
        else if (targetType === 'item') titleEl.innerText = "Add Product";
        
        inputEl.value = '';
        UI.executeSmartSearch(); // Load initial list
        UI.openBottomSheet('sheet-smart-search');
        
        // UX Polish: Wait for the sheet to slide up, then auto-focus the keyboard!
        setTimeout(() => inputEl.focus(), 350);
    },

    // NEW: Handles the "+" icon tap inside the search bar header!
    createNewFromSearch: () => {
        UI.closeBottomSheet('sheet-smart-search');
        if (UI.state.smartSearchTarget === 'item') {
            if(window.app) window.app.openForm('product');
        } else {
            if(window.app) window.app.openForm('ledger');
        }
    },

    executeSmartSearch: () => {
        const query = (document.getElementById('smart-search-input').value || '').toLowerCase();
        const resultsContainer = document.getElementById('smart-search-results');
        const targetType = UI.state.smartSearchTarget;
        const prefix = UI.state.smartSearchPrefix;
        
        let results = [];
        let html = '';

        if (targetType === 'customer' || targetType === 'supplier') {
            const isCust = targetType === 'customer';
            const dbType = isCust ? 'Customer' : 'Supplier';
            results = UI.state.rawData.ledgers.filter(l => String(l.type).toLowerCase() === dbType.toLowerCase() && (l.name || '').toLowerCase().includes(query));
            
            results.slice(0, 30).forEach(l => {
                const safeName = (l.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                html += `
                <div class="tap-target" onclick="UI.selectSmartParty('${prefix}-${targetType}', '${l.id}', '${safeName}')" style="padding: 16px; border-bottom: 1px solid var(--md-surface-variant); display: flex; align-items: center; gap: 16px; cursor: pointer;">
                    <div class="icon-circle" style="width: 40px; height: 40px; background: var(--md-surface-variant); color: var(--md-primary);"><span class="material-symbols-outlined" style="font-size: 20px;">${isCust?'person':'storefront'}</span></div>
                    <div><strong style="display: block; font-size: 16px;">${UI.highlightText(l.name, query)}</strong><small style="color: var(--md-text-muted);">${l.phone || 'No Phone'}</small></div>
                </div>`;
            });
            if (results.length === 0) html = `<div style="padding: 24px; text-align: center; color: var(--md-text-muted);">No matches found.</div>`;
            // Bottom '+ Create New' button has been intentionally removed!
            
        } else if (targetType === 'item') {
            const isSales = prefix === 'sales';
            
            // ENTERPRISE UPGRADE: Smart Frequent Items Sorting Engine
            const freqMap = {};
            const historyData = isSales ? UI.state.rawData.sales : UI.state.rawData.purchases;
            historyData.forEach(doc => {
                if (doc.status !== 'Open') { // Ignore drafts
                    (doc.items || []).forEach(row => {
                        freqMap[row.itemId] = (freqMap[row.itemId] || 0) + 1;
                    });
                }
            });

            results = UI.state.rawData.items.filter(i => (i.name || '').toLowerCase().includes(query) || (i.sku || '').toLowerCase().includes(query));
            
            // Sort by most frequently used first, falling back to alphabetical order
            results.sort((a, b) => {
                const freqA = freqMap[a.id] || 0;
                const freqB = freqMap[b.id] || 0;
                if (freqB !== freqA) return freqB - freqA; // Descending frequency
                return (a.name || '').localeCompare(b.name || '');
            });
            
            results.slice(0, 30).forEach(i => {
                const price = isSales ? (parseFloat(i.sellPrice) || 0) : (parseFloat(i.buyPrice) || 0);
                const safeName = (i.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const safeUom = (i.uom || '').replace(/'/g, "\\'");
                const safeHsn = (i.hsn || '').replace(/'/g, "\\'");
                const stockVal = parseFloat(i.stock) || 0;
                const stockStr = `<span style="color: ${stockVal<=0 ? 'var(--md-error)' : 'var(--md-success)'}; font-weight: bold;">Stock: ${stockVal}</span>`;
                
                // ENTERPRISE UX: Done & Done and New Buttons!
                html += `
                <div style="padding: 16px; border-bottom: 1px solid var(--md-surface-variant); display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div><strong style="display: block; font-size: 16px;">${UI.highlightText(i.name, query)}</strong><small>${stockStr}</small></div>
                        <div style="text-align: right;"><strong style="color: var(--md-primary); font-size: 18px;">₹${price.toFixed(2)}</strong></div>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn-primary-small tap-target" style="background: var(--md-surface-variant); color: var(--md-on-surface); padding: 8px 16px;" 
                            onclick="UI.addSmartItemRow('${prefix}', '${i.id}', '${safeName}', ${price}, ${i.gst || 0}, '${safeUom}', '${safeHsn}', ${i.buyPrice || 0}); document.getElementById('smart-search-input').value=''; UI.executeSmartSearch(); document.getElementById('smart-search-input').focus(); if(window.Utils) window.Utils.showToast('✅ Added to invoice');">
                            Done & New
                        </button>
                        <button class="btn-primary-small tap-target" style="padding: 8px 16px;" 
                            onclick="UI.addSmartItemRow('${prefix}', '${i.id}', '${safeName}', ${price}, ${i.gst || 0}, '${safeUom}', '${safeHsn}', ${i.buyPrice || 0}); UI.closeBottomSheet('sheet-smart-search');">
                            Done
                        </button>
                    </div>
                </div>`;
            });
            if (results.length === 0) html = `<div style="padding: 24px; text-align: center; color: var(--md-text-muted);">No products found.</div>`;
            // Bottom '+ Create New' button has been intentionally removed!
        }

        resultsContainer.innerHTML = html;
    },

    // ENTERPRISE FIX: Added 'async' lock to prevent UI crashes!
    selectSmartParty: async (typeId, id, name) => {
        const inputId = document.getElementById(`${typeId}-id`);
        const display = document.getElementById(`${typeId}-display`);
        
        if(inputId) inputId.value = id;
        if(display) {
            display.innerText = name;
            display.style.color = 'var(--md-on-surface)';
        }
        
        // ENTERPRISE FIX: Correctly parse Cashbook prefixes AND await the database fetch BEFORE closing!
        const prefix = typeId.replace('-customer', '').replace('-supplier', ''); 
        if (typeof app !== 'undefined') {
            if ((prefix === 'sales' || prefix === 'purchase') && typeof app.loadOriginalDocuments === 'function') {
                app.loadOriginalDocuments(id, prefix);
            } else if (prefix === 'pay-in' && typeof app.loadPendingInvoices === 'function') {
                await app.loadPendingInvoices(id, 'in'); // Added await
            } else if (prefix === 'pay-out' && typeof app.loadPendingInvoices === 'function') {
                await app.loadPendingInvoices(id, 'out'); // Added await
            }
        }
        
        // MOVED: Safely close the sheet only AFTER the database has finished loading!
        UI.closeBottomSheet('sheet-smart-search');
    },

    addSmartItemRow: (prefix, id, name, price, gst, uom, hsn, buyPrice) => {
        const container = document.getElementById(`${prefix}-items-body`);
        const emptyState = document.getElementById(`${prefix}-empty-items`);
        if(!container) return;
        if(emptyState) emptyState.style.display = 'none';
        
        const itemCard = document.createElement('div');
        itemCard.className = 'item-entry-card m3-card';
        itemCard.style.padding = '14px';
        itemCard.style.marginBottom = '0';
        itemCard.style.borderLeft = prefix === 'sales' ? '4px solid var(--md-primary)' : '4px solid #f57f17';
        
        const hiddenInputs = `<input type="hidden" class="row-item-id" value="${id}"><input type="hidden" class="row-item-name" value="${name.replace(/"/g, '&quot;')}"><input type="hidden" class="row-uom" value="${uom}">`;

        itemCard.innerHTML = `
            ${hiddenInputs}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div style="font-weight:600; font-size:15px; color:var(--md-on-surface); flex:1; line-height:1.3;">
                    ${name}
                    <div style="font-size:11px; color:var(--md-text-muted); font-weight:normal; margin-top:2px;">HSN: <input type="text" class="row-hsn" value="${hsn}" style="border:none; background:transparent; width:60px; color:inherit;" readonly></div>
                </div>
                <span class="material-symbols-outlined tap-target" style="color:var(--md-error); font-size:22px; padding:4px; margin-right:-4px; margin-top:-4px;" onclick="this.closest('.item-entry-card').remove(); UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()">delete</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div>
                    <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Qty (${uom || 'Unit'})</small>
                    <input type="number" inputmode="decimal" class="row-qty" value="1" min="0.01" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;" onfocus="this.select()">
                </div>
                <div>
                    <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Rate (₹)</small>
                    <input type="number" inputmode="decimal" class="row-rate" value="${price}" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                </div>
                <div>
                    <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">GST %</small>
                    <input type="number" inputmode="decimal" class="row-gst" value="${gst}" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:8px; border-top:1px dashed var(--md-surface-variant);">
                <div style="display:flex; gap:8px;">
                    ${prefix === 'sales' ? `
                    <div>
                        <small style="color:var(--md-text-muted); font-size:10px; display:block;">Buy Price</small>
                        <input type="number" inputmode="decimal" class="row-item-buyprice" value="${buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:70px; padding:4px 6px; font-size:11px; border:1px solid var(--md-outline-variant); background:var(--md-surface); border-radius:4px;">
                    </div>
                    ` : `<input type="hidden" class="row-item-buyprice" value="${buyPrice || 0}">`}
                </div>
                <div style="text-align:right;">
                    <small style="color:var(--md-text-muted); font-size:11px;">Total (₹)</small><br>
                    <strong class="row-total" style="font-size:18px; color:var(--md-on-surface);">0.00</strong>
                </div>
            </div>
            ${prefix === 'sales' ? `<small class="live-margin" style="font-size:10px; display:block; margin-top:8px; text-align:right;"></small>` : ''}
        `;
        container.appendChild(itemCard);
        
        prefix === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
        
        // UX Magic: Auto-focus the Qty box of the newly added row!
        setTimeout(() => {
            const newQty = itemCard.querySelector('.row-qty');
            if (newQty) newQty.focus();
        }, 100);
    },

    closeAllBottomSheets: () => {
        let closedSomething = false;
        document.querySelectorAll('.bottom-sheet.open').forEach(sheet => {
            sheet.classList.remove('open');
            setTimeout(() => sheet.classList.add('hidden'), 300);
            closedSomething = true;
        });
        
        const overlay = document.getElementById('sheet-overlay');
        if (overlay && overlay.classList.contains('open')) {
            overlay.classList.remove('open');
            setTimeout(() => {
                // STRICT ERP LOGIC: Re-check dynamically so rapid tapping doesn't break the background!
                const currentlyOpen = document.querySelectorAll('.bottom-sheet.open:not(#haptic-menu)').length;
                if (currentlyOpen === 0) overlay.classList.add('hidden');
            }, 300);
            closedSomething = true;
        }
        
        // FIXED: Restored the missing closing logic!
        if (closedSomething && history.state && history.state.modalOpen) { window._ignoreNextPop = true; history.back(); }
    },
        
    // UPGRADE: iOS-Style Haptic Context Menu
    showContextMenu: (clickAction) => {
        let overlay = document.getElementById('haptic-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'haptic-overlay';
            overlay.className = 'sheet-overlay hidden'; // Reuses your premium blur effect!
            overlay.style.zIndex = '6500'; // STRICT ERP LOGIC: Must be higher than standard bottom-sheets (5100)
            
            overlay.innerHTML = `
                <div id="haptic-menu" class="bottom-sheet" style="z-index: 6501; padding: 0 0 calc(24px + env(safe-area-inset-bottom, 0px)) 0; background: transparent !important; box-shadow: none;">
                    
                    <div style="margin: 0 16px 16px 16px; background: var(--md-surface); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); overflow: hidden;">
                        <div style="padding: 14px; text-align: center; font-size: 12px; font-weight: bold; color: var(--md-text-muted); border-bottom: 1px solid var(--md-surface-variant); background: rgba(0,0,0,0.02);">
                            DOCUMENT OPTIONS
                        </div>
                        
                        <div class="tap-target" onclick="document.getElementById('haptic-overlay').click(); setTimeout(() => { ${clickAction} }, 300);" style="padding: 16px 20px; display: flex; align-items: center; gap: 16px; font-size: 16px; font-weight: 500; color: var(--md-on-surface); border-bottom: 1px solid var(--md-surface-variant); background: var(--md-surface);">
                            <div class="icon-circle" style="width:36px; height:36px; background: var(--md-primary-container); color: var(--md-primary);"><span class="material-symbols-outlined" style="font-size:20px;">edit_document</span></div>
                            Open & Edit Document
                        </div>
                        
                        <div class="tap-target" onclick="document.getElementById('haptic-overlay').click(); setTimeout(() => { if(window.Utils) window.Utils.showToast('Open the document to generate a PDF'); }, 300);" style="padding: 16px 20px; display: flex; align-items: center; gap: 16px; font-size: 16px; font-weight: 500; color: var(--md-on-surface); background: var(--md-surface);">
                            <div class="icon-circle" style="width:36px; height:36px; background: #fff8e1; color: #f57f17;"><span class="material-symbols-outlined" style="font-size:20px;">picture_as_pdf</span></div>
                            Generate PDF
                        </div>
                    </div>

                    <div class="tap-target" onclick="document.getElementById('haptic-overlay').click();" style="margin: 0 16px; padding: 16px; text-align: center; background: var(--md-surface); border-radius: 20px; font-size: 16px; font-weight: bold; color: var(--md-error); box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                        Cancel
                    </div>

                </div>
            `;
            document.body.appendChild(overlay);
            
            // Close logic
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.getElementById('haptic-menu').classList.remove('open');
                    overlay.classList.remove('open');
                    setTimeout(() => overlay.classList.add('hidden'), 300);
                }
            });
        }
        
        // Show the menu
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            document.getElementById('haptic-menu').classList.add('open');
        });
        
        // Micro-vibration when the menu pops up
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
    },
    renderLedgerList: (containerId, ledgers, prefix) => {
        const container = document.getElementById(containerId);
        if(!container) return;
        
        const emptyHTML = `<div style="padding: 24px; text-align: center; color: var(--md-text-muted);">No records found. Please add one first!</div>`;

        // ENTERPRISE FIX: Route the bottom sheet lists through the Virtualizer so they never freeze!
        UI.renderVirtualList(container, ledgers, (l) => {
            return `
            <li class="virtual-item tap-target" onclick="if(window.UI) window.UI.selectLedger('${l.id}', '${(l.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${prefix}')">
                <div><div class="large-text">${l.name || 'Unnamed'}</div><small class="color-primary">${l.phone || 'No Phone'}</small></div>
            </li>`;
        }, emptyHTML);
    },

    selectLedger: async (id, name, prefix) => {
        const inputId = document.getElementById(`${prefix}-customer-id`) || document.getElementById(`${prefix}-supplier-id`) || document.getElementById(`${prefix}-customer`) || document.getElementById(`${prefix}-supplier`);
        if (inputId) inputId.value = id;
        
        const display = document.getElementById(`${prefix}-customer-display`) || document.getElementById(`${prefix}-supplier-display`);
        if(display) {
            display.innerText = name; 
            display.style.color = 'var(--md-on-surface)';
        }
        
        if (typeof app !== 'undefined') {
            if ((prefix === 'sales' || prefix === 'purchase') && typeof app.loadOriginalDocuments === 'function') {
                app.loadOriginalDocuments(id, prefix);
            } else if (prefix === 'pay-in' && typeof app.loadPendingInvoices === 'function') {
                await app.loadPendingInvoices(id, 'in'); // ENTERPRISE FIX: Added await!
            } else if (prefix === 'pay-out' && typeof app.loadPendingInvoices === 'function') {
                await app.loadPendingInvoices(id, 'out'); // ENTERPRISE FIX: Added await!
            }
        }

        UI.closeBottomSheet(prefix === 'sales' || prefix === 'pay-in' ? 'sheet-customers' : 'sheet-suppliers');
    },

    renderProductList: (items) => {
        UI.state.selectedProducts = [];
        const isPurchase = UI.state.activeActivity === 'purchase';
        const container = document.getElementById('list-products');
        if(!container) return;
        
        const emptyHTML = `<div style="padding: 24px; text-align: center; color: var(--md-text-muted);">No products found. Please add one first!</div>`;

        // ENTERPRISE FIX: Route the products bottom sheet through the Virtualizer so it never freezes!
        UI.renderVirtualList(container, items, (item) => {
            const price = parseFloat(isPurchase ? (item.buyPrice || 0) : (item.sellPrice || 0)) || 0;
            const currentStock = parseFloat(item.stock) || 0;
            const minStock = parseFloat(item.minStock) || 0;
            const isLowStock = minStock > 0 && currentStock <= minStock;
            
            // NEW: Bulletproof Dual Stock Math (Fixes "undefined" text)
            const rawGst = parseFloat(item.stockGst);
            const rawNon = parseFloat(item.stockNonGst);
            const gstStock = isNaN(rawGst) ? currentStock : rawGst;
            const nonGstStock = isNaN(rawNon) ? 0 : rawNon;
            
            return `
            <li class="virtual-item tap-target" onclick="if(window.UI) window.UI.toggleProductSelection(this, '${item.id}', '${(item.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;")}', ${price}, ${item.gst || 0}, '${(item.uom || '').replace(/'/g, "\\'")}', '${(item.hsn || '').replace(/'/g, "\\'")}', ${item.buyPrice || 0})">
                <div>
                    <div class="large-text">${item.name || 'Unnamed Product'}</div>
                    <small>
                        <span style="${isLowStock ? 'color:var(--md-error); font-weight:bold;' : ''}">Tot: ${currentStock} ${item.uom || ''} ${isLowStock ? '⚠️' : ''}</span> 
                        | Rate: \u20B9${price.toFixed(2)}
                        <br><span style="font-size: 10px; color: var(--md-text-muted);">GST: ${gstStock} | Non-GST: ${nonGstStock}</span>
                    </small>
                </div>
                <input type="checkbox" style="width: 20px; height: 20px; pointer-events: none;">
            </li>`;
        }, emptyHTML);
    },

    toggleProductSelection: (li, id, name, price, gst, uom, hsn, buyPrice) => {
        const cb = li.querySelector('input'); cb.checked = !cb.checked;
        if (cb.checked) { 
            UI.state.selectedProducts.push({ id, name, price, gst, uom, hsn, buyPrice }); 
            li.style.background = 'var(--md-surface-variant)'; 
        } else { 
            UI.state.selectedProducts = UI.state.selectedProducts.filter(p => p.id !== id); 
            li.style.background = 'transparent'; 
        }
    },

    confirmProducts: () => {
        const prefix = UI.state.activeActivity;
        const container = document.getElementById(`${prefix}-items-body`);
        if(!container) return;
        
        UI.state.selectedProducts.forEach(p => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-entry-card m3-card';
            itemCard.style.padding = '14px';
            itemCard.style.marginBottom = '0';
            itemCard.style.borderLeft = prefix === 'sales' ? '4px solid var(--md-primary)' : '4px solid #f57f17';
            
            const hiddenInputs = `
                <input type="hidden" class="row-item-id" value="${p.id}">
                <input type="hidden" class="row-item-name" value="${(p.name || '').replace(/"/g, '&quot;')}">
                <input type="hidden" class="row-uom" value="${p.uom || ''}">
            `;

            itemCard.innerHTML = `
                ${hiddenInputs}
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div style="font-weight:600; font-size:15px; color:var(--md-on-surface); flex:1; line-height:1.3;">
                        ${p.name}
                        <div style="font-size:11px; color:var(--md-text-muted); font-weight:normal; margin-top:2px;">HSN: <input type="text" class="row-hsn" value="${p.hsn || ''}" style="border:none; background:transparent; width:60px; color:inherit;" readonly></div>
                    </div>
                    <span class="material-symbols-outlined tap-target" style="color:var(--md-error); font-size:22px; padding:4px; margin-right:-4px; margin-top:-4px;" onclick="this.closest('.item-entry-card').remove(); UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()">delete</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                    <div>
                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Qty (${p.uom || 'Unit'})</small>
                        <input type="number" inputmode="decimal" class="row-qty" value="1" min="0.01" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                    </div>
                    <div>
                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">Rate (₹)</small>
                        <input type="number" inputmode="decimal" class="row-rate" value="${p.price}" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                    </div>
                    <div>
                        <small style="color:var(--md-text-muted); font-size:11px; display:block; margin-bottom:4px;">GST %</small>
                        <input type="number" inputmode="decimal" class="row-gst" value="${p.gst || 0}" step="any" oninput="UI.calc${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Totals()" style="width:100%; padding:8px; border:1px solid var(--md-outline-variant); border-radius:6px; background:var(--md-surface); font-size:14px;">
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:8px; border-top:1px dashed var(--md-surface-variant);">
                    <div style="display:flex; gap:8px;">
                        ${prefix === 'sales' ? `
                        <div>
                            <small style="color:var(--md-text-muted); font-size:10px; display:block;">Buy Price</small>
                            <input type="number" inputmode="decimal" class="row-item-buyprice" value="${p.buyPrice || 0}" step="any" oninput="UI.calcSalesTotals()" style="width:70px; padding:4px 6px; font-size:11px; border:1px solid var(--md-outline-variant); background:var(--md-surface); border-radius:4px;">
                        </div>
                        ` : `<input type="hidden" class="row-item-buyprice" value="${p.buyPrice || 0}">`}
                    </div>
                    <div style="text-align:right;">
                        <small style="color:var(--md-text-muted); font-size:11px;">Total (₹)</small><br>
                        <strong class="row-total" style="font-size:18px; color:var(--md-on-surface);">0.00</strong>
                    </div>
                </div>
                ${prefix === 'sales' ? `<small class="live-margin" style="font-size:10px; display:block; margin-top:8px; text-align:right;"></small>` : ''}
            `;
            container.appendChild(itemCard);
        });
        
        prefix === 'sales' ? UI.calcSalesTotals() : UI.calcPurchaseTotals();
        UI.closeBottomSheet('sheet-products');
    },

    // ==========================================
    // 7. RECEIVABLES REPORT ENGINE
    // ==========================================
    downloadReceivablesReport: async () => {
        // STRICT ERP LOGIC: Use window.Utils to prevent ES6 Module ReferenceError crash!
        if (!window.Utils || typeof window.Utils.printReceivablesReport !== 'function') return alert("Print engine unavailable.");
        
        // ENTERPRISE FIX: Enforce Firm ID isolation so Company B's customers don't leak into Company A's report!
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
        const customerLedgers = UI.state.rawData.ledgers.filter(l => String(l.type).toLowerCase() === 'customer' && (!activeFirmId || l.firmId === activeFirmId));
        
        const reportData = [];
        let grandTotal = 0;

        // STRICT ERP LOGIC: O(1) Memory Hash Map instead of N+1 Database Queries!
        // This prevents the app from freezing for 10+ seconds when exporting thousands of customers.
        const balanceCache = {};
        customerLedgers.forEach(l => {
            let ob = parseFloat(l.openingBalance) || 0;
            const balType = (l.balanceType || '').toLowerCase();
            balanceCache[l.id] = (balType.includes('pay') || balType.includes('credit')) ? -ob : ob;
        });

        UI.state.rawData.sales.forEach(s => { 
            if ((!activeFirmId || s.firmId === activeFirmId) && s.status !== 'Open' && balanceCache[s.customerId] !== undefined) {
                balanceCache[s.customerId] += (s.documentType === 'return' ? -parseFloat(s.grandTotal || 0) : parseFloat(s.grandTotal || 0)); 
            }
        });
        UI.state.rawData.cashbook.forEach(c => { 
            if ((!activeFirmId || c.firmId === activeFirmId) && c.ledgerId && balanceCache[c.ledgerId] !== undefined) {
                balanceCache[c.ledgerId] += (c.type === 'in' ? -parseFloat(c.amount || 0) : parseFloat(c.amount || 0));
            }
        });

        customerLedgers.forEach(ledger => {
            const bal = balanceCache[ledger.id] || 0;
            if (bal > 0.01) {
                reportData.push({
                    name: ledger.name || 'Unknown',
                    phone: ledger.phone || 'N/A',
                    balance: bal
                });
                grandTotal += bal;
            }
        });
        
        if (reportData.length === 0) return alert("No pending receivables found.");
        window.Utils.printReceivablesReport(reportData, grandTotal);
    },

    // ==========================================
    // ADVANCED REPORTING SUITE
    // ==========================================
    switchReportTab: (tab) => {
        document.getElementById('view-daybook').classList.add('hidden');
        document.getElementById('view-pnl').classList.add('hidden');
        document.getElementById('btn-tab-daybook').style.background = 'transparent';
        document.getElementById('btn-tab-daybook').style.boxShadow = 'none';
        document.getElementById('btn-tab-pnl').style.background = 'transparent';
        document.getElementById('btn-tab-pnl').style.boxShadow = 'none';

        if (tab === 'daybook') {
            document.getElementById('view-daybook').classList.remove('hidden');
            document.getElementById('btn-tab-daybook').style.background = 'var(--md-surface)';
            document.getElementById('btn-tab-daybook').style.boxShadow = 'var(--elevation-1)';
            UI.renderDayBook();
        } else {
            document.getElementById('view-pnl').classList.remove('hidden');
            document.getElementById('btn-tab-pnl').style.background = 'var(--md-surface)';
            document.getElementById('btn-tab-pnl').style.boxShadow = 'var(--elevation-1)';
            UI.renderPnL();
        }
    },

    renderDayBook: () => {
        const dateInput = document.getElementById('report-daybook-date');
        if (!dateInput.value) {
            dateInput.value = typeof Utils !== 'undefined' ? Utils.getLocalDate() : new Date().toISOString().split('T')[0];
        }
        const targetDate = dateInput.value;
        const container = document.getElementById('daybook-container');
        let html = '';

        // Combine all relevant activity into one chronological stream
        const dailyActivity = [];
        
        UI.state.rawData.sales.filter(s => s.date === targetDate && s.status !== 'Open').forEach(s => {
            const isRet = s.documentType === 'return';
            const isNonGST = s.invoiceType === 'Non-GST';
            const docLabel = isRet ? 'Credit Note' : (isNonGST ? 'Bill of Supply' : 'Sales Invoice');
            dailyActivity.push({ time: s.id, type: docLabel, desc: s.customerName, amount: s.grandTotal, icon: isRet ? 'assignment_return' : 'receipt_long', color: isRet ? 'var(--md-error)' : 'var(--md-success)', sign: isRet ? '-' : '+' });
        });
        
        UI.state.rawData.purchases.filter(p => p.date === targetDate && p.status !== 'Open').forEach(p => {
            const isRet = p.documentType === 'return';
            const isNonGST = p.invoiceType === 'Non-GST';
            const docLabel = isRet ? 'Debit Note' : (isNonGST ? 'Bill of Supply' : 'Purchase Bill');
            dailyActivity.push({ time: p.id, type: docLabel, desc: p.supplierName, amount: p.grandTotal, icon: isRet ? 'assignment_returned' : 'local_shipping', color: isRet ? 'var(--md-success)' : 'var(--md-error)', sign: isRet ? '+' : '-' });
        });
        
        UI.state.rawData.cashbook.filter(c => c.date === targetDate && !c.isAutoGenerated).forEach(c => {
            const isIn = c.type === 'in';
            dailyActivity.push({ time: c.id, type: isIn ? 'Money In' : 'Money Out', desc: c.ledgerName, amount: parseFloat(c.amount), icon: isIn ? 'arrow_downward' : 'arrow_upward', color: isIn ? 'var(--md-success)' : 'var(--md-error)', sign: isIn ? '+' : '-' });
        });
        
        UI.state.rawData.expenses.filter(e => e.date === targetDate).forEach(e => {
            dailyActivity.push({ time: e.id, type: 'Expense', desc: e.category, amount: parseFloat(e.amount), icon: 'account_balance_wallet', color: 'var(--md-error)', sign: '-' });
        });

        if (dailyActivity.length === 0) {
            container.innerHTML = '<p class="empty-state">No financial activity recorded on this date.</p>';
            return;
        }

        // FIX: Extract the actual timestamp chunk from the end of the ID string to sort chronologically!
        dailyActivity.sort((a, b) => {
            const timeA = parseInt(a.time.split('-').pop()) || 0;
            const timeB = parseInt(b.time.split('-').pop()) || 0;
            return timeB - timeA;
        });

        // UPGRADE: Added Export CSV Button dynamically
        html += `
            <div style="display:flex; justify-content:flex-end; margin-bottom: 12px; padding: 0 4px;">
                <button class="btn-primary-small tap-target" onclick="UI.exportDaybookCSV()" style="display:flex; align-items:center; gap:4px; background: #e8f5e9; color: #146c2e; border: 1px solid rgba(20, 108, 46, 0.3);">
                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Export CSV
                </button>
            </div>
        `;

        html += dailyActivity.map(t => `
            <div class="m3-card" style="display:flex; align-items:center; gap: 12px; padding: 12px; margin-bottom: 8px;">
                <div class="icon-circle" style="background: var(--md-surface-variant); color: ${t.color}; width: 40px; height: 40px; flex-shrink: 0;"><span class="material-symbols-outlined" style="font-size:20px;">${t.icon}</span></div>
                <div style="flex: 1;"><strong class="large-text">${t.type}</strong><br><small style="color: var(--md-text-muted);">${t.desc}</small></div>
                <strong style="font-size: 16px; color: ${t.color};">${t.sign}&#8377;${(t.amount || 0).toFixed(2)}</strong>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    renderPnL: () => {
        const startEl = document.getElementById('report-pnl-start');
        const endEl = document.getElementById('report-pnl-end');
        
        if (!startEl.value || !endEl.value) {
            const d = new Date();
            endEl.value = typeof Utils !== 'undefined' ? Utils.getLocalDate() : d.toISOString().split('T')[0];
            d.setDate(1); // Set to first of month
            startEl.value = d.toISOString().split('T')[0];
        }

        const startDate = startEl.value;
        const endDate = endEl.value;
        const container = document.getElementById('pnl-container');

        // ENTERPRISE FIX: Multi-Company Data Isolation for PnL
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;

        let totalRevenue = 0, totalCOGS = 0, totalExpenses = 0;

        // 1. Calculate Accrual Revenue & COGS
        UI.state.rawData.sales.forEach(s => {
            if ((!activeFirmId || s.firmId === activeFirmId) && s.date >= startDate && s.date <= endDate && s.status !== 'Open') {
                const modifier = s.documentType === 'return' ? -1 : 1;
                const netSales = (parseFloat(s.grandTotal) || 0) - (parseFloat(s.totalGst) || 0); // Profit excludes tax
                totalRevenue += netSales * modifier;

                (s.items || []).forEach(item => {
                    const cost = parseFloat(item.buyPrice) || 0;
                    totalCOGS += ((parseFloat(item.qty) || 0) * cost) * modifier;
                });
            }
        });

        // 2. Calculate Expenses
        UI.state.rawData.expenses.forEach(e => {
            if ((!activeFirmId || e.firmId === activeFirmId) && e.date >= startDate && e.date <= endDate) {
                totalExpenses += parseFloat(e.amount) || 0;
            }
        });

        let indirectIncome = 0;
        let stockLoss = 0;
        
        UI.state.rawData.cashbook.forEach(c => {
            // ENTERPRISE FIX: Enforce Firm ID isolation so Shop B's income doesn't mathematically merge into Shop A's live PnL!
            if ((!activeFirmId || c.firmId === activeFirmId) && c.date >= startDate && c.date <= endDate && c.type === 'in' && !c.invoiceRef && !c.linkedInvoice) {
                // STRICT ERP LOGIC: Prevent deleted customers from artificially inflating Net Profit!
                const isCustomerOrSupplier = UI.state.rawData.ledgers.some(l => l.id === c.ledgerId) || 
                                             UI.state.rawData.sales.some(s => s.customerId === c.ledgerId) || 
                                             UI.state.rawData.purchases.some(p => p.supplierId === c.ledgerId);
                const ledgerName = (c.ledgerName || '').toLowerCase();
                if (!isCustomerOrSupplier && !ledgerName.includes('cash drawer') && !ledgerName.includes('advance')) {
                    indirectIncome += parseFloat(c.amount) || 0;
                }
            }
        });

        if (UI.state.rawData.adjustments) {
            UI.state.rawData.adjustments.forEach(adj => {
                // FIX: Match the exact 'reduce' value submitted by the HTML dropdown
                if (adj.type === 'reduce' && adj.date >= startDate && adj.date <= endDate) {
                    const product = UI.state.rawData.items.find(i => i.id === adj.itemId);
                    stockLoss += (parseFloat(adj.qty) || 0) * (product ? parseFloat(product.buyPrice) || 0 : 0);
                }
            });
        }

        const grossProfit = (totalRevenue + indirectIncome) - totalCOGS;
        const netProfit = grossProfit - (totalExpenses + stockLoss);
        const isProfitable = netProfit >= 0;

        container.innerHTML = `
            <div style="display:flex; justify-content:flex-end; margin-bottom: 12px; padding: 0 4px;">
                <button class="btn-primary-small tap-target" onclick="UI.exportPnLCSV()" style="display:flex; align-items:center; gap:4px; background: #e8f5e9; color: #146c2e; border: 1px solid rgba(20, 108, 46, 0.3);">
                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Export CSV
                </button>
            </div>

            <div class="m3-card" style="padding: 16px; margin-bottom: 12px; border-left: 4px solid var(--md-success);">
                <small style="color: var(--md-text-muted);">Trading Account</small>
                <div style="display:flex; justify-content:space-between; margin-top:8px;"><span>Total Net Revenue</span><strong>&#8377;${totalRevenue.toFixed(2)}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-top:4px;"><span>Cost of Goods Sold (COGS)</span><strong style="color:var(--md-error);">-&#8377;${totalCOGS.toFixed(2)}</strong></div>
                <hr style="border:0; border-top:1px dashed var(--md-outline-variant); margin: 8px 0;">
                <div style="display:flex; justify-content:space-between; font-size:16px;"><strong>Gross Profit</strong><strong style="color:var(--md-success);">&#8377;${grossProfit.toFixed(2)}</strong></div>
            </div>

            <div class="m3-card" style="padding: 16px; margin-bottom: 12px; border-left: 4px solid var(--md-error);">
                <small style="color: var(--md-text-muted);">Operating Account</small>
                <div style="display:flex; justify-content:space-between; margin-top:8px;"><span>Total Operating Expenses</span><strong>&#8377;${totalExpenses.toFixed(2)}</strong></div>
            </div>

            <div class="m3-card" style="padding: 16px; background: ${isProfitable ? '#e8f5e9' : '#fff0f2'}; border: 1px solid ${isProfitable ? 'var(--md-success)' : 'var(--md-error)'};">
                <small style="color: ${isProfitable ? 'var(--md-success)' : 'var(--md-error)'}; font-weight:bold; text-transform:uppercase;">Bottom Line Summary</small>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <strong style="font-size:18px;">Net ${isProfitable ? 'Profit' : 'Loss'}</strong>
                    <strong style="font-size:24px; color:${isProfitable ? 'var(--md-success)' : 'var(--md-error)'};">&#8377;${Math.abs(netProfit).toFixed(2)}</strong>
                </div>
            </div>
        `;
    },

    // ==========================================
    // UPGRADE: EXPORT ENGINES (CSV)
    // ==========================================
    exportDaybookCSV: () => {
        const dateInput = document.getElementById('report-daybook-date').value;
        const dailyActivity = [];
        
        // --- ENTERPRISE FIX: STRICT CSV DATA ISOLATION ---
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
        
        UI.state.rawData.sales.filter(s => (!activeFirmId || s.firmId === activeFirmId) && s.date === dateInput && s.status !== 'Open').forEach(s => {
            const isRet = s.documentType === 'return';
            const isNonGST = s.invoiceType === 'Non-GST';
            const docLabel = isRet ? 'Credit Note' : (isNonGST ? 'Bill of Supply' : 'Sales Invoice');
            dailyActivity.push({ time: s.id, type: docLabel, desc: s.customerName, amount: s.grandTotal, sign: isRet ? '-' : '+' });
        });
        UI.state.rawData.purchases.filter(p => (!activeFirmId || p.firmId === activeFirmId) && p.date === dateInput && p.status !== 'Open').forEach(p => {
            const isRet = p.documentType === 'return';
            const isNonGST = p.invoiceType === 'Non-GST';
            const docLabel = isRet ? 'Debit Note' : (isNonGST ? 'Bill of Supply' : 'Purchase Bill');
            dailyActivity.push({ time: p.id, type: docLabel, desc: p.supplierName, amount: p.grandTotal, sign: isRet ? '+' : '-' });
        });
        UI.state.rawData.cashbook.filter(c => (!activeFirmId || c.firmId === activeFirmId) && c.date === dateInput && !c.isAutoGenerated).forEach(c => {
            const isIn = c.type === 'in';
            dailyActivity.push({ time: c.id, type: isIn ? 'Money In' : 'Money Out', desc: c.ledgerName, amount: parseFloat(c.amount), sign: isIn ? '+' : '-' });
        });
        UI.state.rawData.expenses.filter(e => (!activeFirmId || e.firmId === activeFirmId) && e.date === dateInput).forEach(e => {
            dailyActivity.push({ time: e.id, type: 'Expense', desc: e.category, amount: parseFloat(e.amount), sign: '-' });
        });

        if (dailyActivity.length === 0) return alert("No data to export for this date.");

        // FIX: Extract the actual timestamp chunk from the end of the ID string to sort chronologically!
        dailyActivity.sort((a, b) => {
            const timeA = parseInt(a.time.split('-').pop()) || 0;
            const timeB = parseInt(b.time.split('-').pop()) || 0;
            return timeB - timeA;
        });

        let csv = "Type,Description,Amount (INR)\n";
        dailyActivity.forEach(t => {
            // STRICT ERP LOGIC: Strip hidden newlines to prevent CSV row-break spreadsheet corruption!
            const safeDesc = String(t.desc || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' '); 
            csv += `"${t.type}","${safeDesc}","${t.sign}${(t.amount || 0).toFixed(2)}"\n`;
        });

        // ENTERPRISE FIX: Inject the UTF-8 BOM (\ufeff) so Microsoft Excel doesn't scramble the Rupee (₹) symbol!
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Daybook_${dateInput}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // FIX: Give the mobile browser 1 second to grab the file before destroying it!
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000); 
    },

    exportPnLCSV: () => {
        const start = document.getElementById('report-pnl-start').value;
        const end = document.getElementById('report-pnl-end').value;
        
        // --- ENTERPRISE FIX: STRICT CSV DATA ISOLATION ---
        const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : null;
        
        let totalRevenue = 0, totalCOGS = 0, totalExpenses = 0;
        let indirectIncome = 0, stockLoss = 0;

        UI.state.rawData.sales.forEach(s => {
            if ((!activeFirmId || s.firmId === activeFirmId) && s.date >= start && s.date <= end && s.status !== 'Open') {
                const modifier = s.documentType === 'return' ? -1 : 1;
                totalRevenue += ((parseFloat(s.grandTotal) || 0) - (parseFloat(s.totalGst) || 0)) * modifier;
                (s.items || []).forEach(item => totalCOGS += ((parseFloat(item.qty) || 0) * (parseFloat(item.buyPrice) || 0)) * modifier);
            }
        });
        UI.state.rawData.expenses.forEach(e => {
            if ((!activeFirmId || e.firmId === activeFirmId) && e.date >= start && e.date <= end) totalExpenses += parseFloat(e.amount) || 0;
        });
        
        // STRICT ERP LOGIC: Synchronize CSV Export with On-Screen PnL
        UI.state.rawData.cashbook.forEach(c => {
            // STRICT ERP LOGIC: Enforce the activeFirmId boundary so Shop B's income doesn't leak into Shop A's CSV!
            if ((!activeFirmId || c.firmId === activeFirmId) && c.date >= start && c.date <= end && c.type === 'in' && !c.invoiceRef && !c.linkedInvoice) {
                // STRICT ERP LOGIC: Prevent deleted customers from artificially inflating Net Profit in the CSV!
                const isCustomerOrSupplier = UI.state.rawData.ledgers.some(l => l.id === c.ledgerId) || 
                                             UI.state.rawData.sales.some(s => s.customerId === c.ledgerId) || 
                                             UI.state.rawData.purchases.some(p => p.supplierId === c.ledgerId);
                const ledgerName = (c.ledgerName || '').toLowerCase();
                if (!isCustomerOrSupplier && !ledgerName.includes('cash drawer') && !ledgerName.includes('advance')) {
                    indirectIncome += parseFloat(c.amount) || 0;
                }
            }
        });
        if (UI.state.rawData.adjustments) {
            UI.state.rawData.adjustments.forEach(adj => {
                // FIX: Match the exact 'reduce' value submitted by the HTML dropdown
                if (adj.type === 'reduce' && adj.date >= start && adj.date <= end) {
                    const product = UI.state.rawData.items.find(i => i.id === adj.itemId);
                    stockLoss += (parseFloat(adj.qty) || 0) * (product ? parseFloat(product.buyPrice) || 0 : 0);
                }
            });
        }

        const grossProfit = (totalRevenue + indirectIncome) - totalCOGS;
        const netProfit = grossProfit - (totalExpenses + stockLoss);

        let csv = `Profit & Loss Statement (${start} to ${end})\n\n`;
        csv += `Account,Amount (INR)\n`;
        csv += `"Total Net Revenue","${totalRevenue.toFixed(2)}"\n`;
        if (indirectIncome > 0) csv += `"Indirect Income","${indirectIncome.toFixed(2)}"\n`;
        csv += `"Cost of Goods Sold (COGS)","-${totalCOGS.toFixed(2)}"\n`;
        csv += `"Gross Profit","${grossProfit.toFixed(2)}"\n`;
        csv += `"Operating Expenses","-${totalExpenses.toFixed(2)}"\n`;
        if (stockLoss > 0) csv += `"Stock Loss (Adjustments)","-${stockLoss.toFixed(2)}"\n`;
        csv += `"Net ${netProfit >= 0 ? 'Profit' : 'Loss'}","${netProfit.toFixed(2)}"\n`;

        // ENTERPRISE FIX: Inject the UTF-8 BOM (\ufeff) so Microsoft Excel doesn't scramble the Rupee (₹) symbol!
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PnL_${start}_to_${end}.csv`;
        document.body.appendChild(a);
        a.click();
        
        // STRICT ERP LOGIC: Give Android 1 second to intercept the PnL file before destroying memory!
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
    },

    // ==========================================
    // DATABASE OPTIMIZATION ENGINE
    // ==========================================
    optimizeMemory: () => {
        // FIX: Memory optimization disabled! Pruning arrays from RAM breaks the Address Book's running balance math. 
        // Modern devices have plenty of RAM for text arrays, so we keep all data loaded for perfect accuracy.
        return;
    }

}; // <--- MAKE SURE YOU HAVE THIS CLOSING BRACKET AND SEMICOLON!

// Bind Listeners for Live Search Filtering
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // FINAL POLISH: MATERIAL RIPPLES & HAPTICS
    // ==========================================
    document.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.tap-target, .btn-primary, .btn-primary-small, .nav-item, .list-view li, .chip');
        if (target) {
            // 1. Trigger Micro-Haptic Vibration (15ms tick for physical weight)
            if (window.navigator && window.navigator.vibrate) {
                try { window.navigator.vibrate(15); } catch(err){}
            }

            // 2. True Material Touch Ripple (Calculates exact X/Y finger coordinates)
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            
            // Center the ripple exactly under the finger
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            // FIXED: Restored the missing ripple cleanup!
            target.appendChild(ripple);
            setTimeout(() => { if(ripple.parentElement) ripple.remove(); }, 600);
        }
    });

    // UPGRADE 3: Smart Visual Viewport Keyboard Engine
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const activeSheet = document.querySelector('.bottom-sheet.open');
            const activeScreen = document.querySelector('.activity-screen.open .activity-content');
            
            // Calculate how much the keyboard squeezed the screen
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            
            if (keyboardHeight > 100) {
                // Keyboard is open! Safely stretch the padding to lift the content above the keyboard
                if (activeSheet) activeSheet.style.paddingBottom = `${keyboardHeight}px`;
                if (activeScreen) activeScreen.style.paddingBottom = `${keyboardHeight + 40}px`;
                
                // Keep the active input perfectly centered
                if (document.activeElement) {
                    setTimeout(() => {
                        document.activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                }
            } else {
                // Keyboard is closed! Snap the padding back to normal instantly
                if (activeSheet) activeSheet.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
                if (activeScreen) activeScreen.style.paddingBottom = 'calc(40px + env(safe-area-inset-bottom, 0px))';
            }
        });
    } else {
        // Fallback for very old devices
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
            }
        });
    }

    // UPGRADE 4: Enter-to-Next Data Entry Engine
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
            e.preventDefault(); // Prevent accidental form submission
            
            // Find all focusable inputs inside the current active screen/modal
            const activeContainer = e.target.closest('.activity-screen.open') || e.target.closest('.bottom-sheet.open') || document;
            const focusable = Array.from(activeContainer.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled])'));
            
            const index = focusable.indexOf(e.target);
            if (index > -1 && index + 1 < focusable.length) {
                focusable[index + 1].focus(); // Jump to next input
                if (focusable[index + 1].select) focusable[index + 1].select(); // Highlight text for fast replacing
            } else {
                e.target.blur(); // If it's the last input, close the keyboard
            }
        }
    });

    ['sales', 'purchases', 'expenses', 'cashbook', 'timeline'].forEach(tab => {
        const searchInput = document.getElementById(`search-${tab}`);
        // UPGRADE: 300ms Debounce prevents keyboard lag when typing fast
        if(searchInput) searchInput.addEventListener('input', window.Utils.debounce(() => UI.applyFilters(tab), 300));
        
        // FIX: Bind the Sort dropdowns so they actually update the lists!
        const sortSelect = document.getElementById(`sort-${tab}`);
        if(sortSelect) sortSelect.addEventListener('change', () => UI.applyFilters(tab));
    });
    
    // Master View Hook
    const searchMasterView = document.getElementById('search-master-view');
    // UPGRADE: 300ms Debounce for the massive Master List
    if(searchMasterView) searchMasterView.addEventListener('input', window.Utils.debounce(() => UI.applyFilters('masters'), 300));

    // FIX: Bind the Filter and Sort dropdowns for the Master Views!
    const filterMasterView = document.getElementById('filter-master-view');
    if (filterMasterView) filterMasterView.addEventListener('change', () => UI.applyFilters('masters'));

    const sortMasterView = document.getElementById('sort-master-view');
    if (sortMasterView) sortMasterView.addEventListener('change', () => UI.applyFilters('masters'));

    // UPGRADE 5: Smart Search Clear Buttons (Flagship UI)
    // Automatically injects a clear 'X' into every search bar in the entire app
    document.querySelectorAll('.search-bar').forEach(bar => {
        const input = bar.querySelector('input');
        if (!input) return;
        
        const clearBtn = document.createElement('span');
        clearBtn.className = 'material-symbols-outlined tap-target hidden';
        clearBtn.innerText = 'close';
        clearBtn.style.cssText = 'font-size: 16px; color: var(--md-on-surface-variant); padding: 4px; margin-left: 4px; margin-right: 4px; border-radius: 50%; background: var(--md-surface-variant); cursor: pointer;';
        
        input.parentNode.insertBefore(clearBtn, input.nextSibling);

        input.addEventListener('input', () => {
            if (input.value.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.add('hidden');
            input.focus(); 
            input.dispatchEvent(new Event('input')); // Instantly updates the list below it
        });
    });

    // UPGRADE 6: Swipe-to-Switch Main Tabs (Gesture Navigation)
    let touchStartX = 0;
    let touchStartY = 0;
    const mainAppShell = document.getElementById('app-shell');

    if (mainAppShell) {
        mainAppShell.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        mainAppShell.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            // Block 1: Don't swipe if a menu or modal is open
            if (document.querySelector('.bottom-sheet.open') || document.querySelector('.activity-screen.open')) return;

            // Block 2: Don't swipe if the user is scrolling horizontally on a table
            if (e.target.closest('table') || e.target.closest('.filter-chips')) return;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Block 3: If they are scrolling vertically (up/down), ignore the swipe
            if (Math.abs(diffY) > Math.abs(diffX)) return;

            const swipeThreshold = 80; // Minimum pixel drag to trigger a screen change
            if (Math.abs(diffX) < swipeThreshold) return;

            const tabs = [
                { id: 'tab-dashboard', title: 'Dashboard', navId: 'nav-dash' },
                { id: 'tab-masters', title: 'Master Data', navId: 'nav-masters' },
                { id: 'tab-documents', title: 'Documents', navId: 'nav-docs' },
                { id: 'tab-cashbook', title: 'Cashbook', navId: 'nav-cashbook' },
                { id: 'tab-menu', title: 'Settings', navId: 'nav-menu' }
            ];

            const currentIndex = tabs.findIndex(t => document.getElementById(t.id) && document.getElementById(t.id).classList.contains('active-screen'));
            if (currentIndex === -1) return;

            if (diffX < 0 && currentIndex < tabs.length - 1) {
                // Swipe Left -> Go to Next Tab
                const nextTab = tabs[currentIndex + 1];
                UI.switchTab(nextTab.id, nextTab.title, document.getElementById(nextTab.navId));
                if (nextTab.id === 'tab-masters') UI.renderBankBalances();
            } else if (diffX > 0 && currentIndex > 0) {
                // Swipe Right -> Go to Previous Tab
                const prevTab = tabs[currentIndex - 1];
                UI.switchTab(prevTab.id, prevTab.title, document.getElementById(prevTab.navId));
                if (prevTab.id === 'tab-masters') UI.renderBankBalances();
            }
        }, { passive: true });
    }

    // UPGRADE: Auto-Hiding FAB & Bottom Nav on Scroll
    let lastScrollY = 0;
    let isScrolling = false;
    const mainContent = document.querySelector('.main-content');
    const fab = document.querySelector('.floating-action-button');
    const bottomNav = document.querySelector('.bottom-nav'); // <-- NEW
    
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            lastScrollY = mainContent.scrollTop;
            
            // STRICT ERP LOGIC: Debounce the DOM paint to prevent CPU layout-thrashing on mobile devices!
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    if (lastScrollY > 50) {
                        if (fab) fab.classList.add('fab-hidden'); 
                        if (bottomNav) bottomNav.style.transform = 'translateY(150%)'; 
                    } else {
                        if (fab) fab.classList.remove('fab-hidden'); 
                        if (bottomNav) bottomNav.style.transform = 'translateY(0)'; 
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }, {passive: true});
    }
    
    // Bottom Sheet Searches
    ['customers', 'suppliers', 'products'].forEach(type => {
        const input = document.getElementById(`search-${type}`);
        if(input) input.addEventListener('input', window.Utils.debounce((e) => {
            const term = (e.target.value || '').toLowerCase();
            document.querySelectorAll(`#list-${type} li`).forEach(li => {
                li.style.display = (li.innerText || '').toLowerCase().includes(term) ? '' : 'none';
            });
        }, 300)); // UPGRADE: 300ms Debounce for instant bottom sheet typing
    });

    // (Swipe Gesture Engine Removed to prevent accidental deletions)

    // ==========================================
    // HARDWARE BACK BUTTON GESTURE INTERCEPTOR
    // ==========================================
    window.addEventListener('popstate', () => {
        if (window._ignoreNextPop) {
            window._ignoreNextPop = false;
            return;
        }

        // ENTERPRISE FIX: Unified Z-Index Back Stack Manager
        // Grabs every open layer (sheets AND activities) and kills ONLY the absolute top one
        const openSheets = Array.from(document.querySelectorAll('.bottom-sheet.open'));
        const openActivities = Array.from(document.querySelectorAll('.activity-screen.open'));
        const allOpenLayers = [...openSheets, ...openActivities];

        if (allOpenLayers.length > 0) {
            // Sort by absolute Z-Index so we always kill what the user is currently looking at
            allOpenLayers.sort((a, b) => {
                const zA = parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
                const zB = parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
                return zA - zB; 
            });
            
            // Pop only the topmost layer
            const topLayer = allOpenLayers.pop(); 
            topLayer.classList.remove('open');
            setTimeout(() => topLayer.classList.add('hidden'), 300);
            
            // If we closed a bottom sheet, check if we need to drop the dark overlay
            if (topLayer.classList.contains('bottom-sheet')) {
                const remainingSheets = openSheets.filter(s => s !== topLayer && s.classList.contains('open'));
                if (remainingSheets.length === 0) {
                    const overlay = document.getElementById('sheet-overlay');
                    if (overlay) {
                        overlay.classList.remove('open');
                        setTimeout(() => {
                            // STRICT ERP LOGIC: Re-check dynamically
                            const currentlyOpen = document.querySelectorAll('.bottom-sheet.open:not(#haptic-menu)').length;
                            if (currentlyOpen === 0) overlay.classList.add('hidden');
                        }, 300);
                    }
                }
                if (typeof app !== 'undefined' && app.state) app.state.currentReceiptId = null;
            }
            
            // If we closed a main form activity, clear the UI active state tracker
            if (topLayer.id === 'activity-sales-form' || topLayer.id === 'activity-purchase-form') {
                UI.state.activeActivity = null;
            }
        }
    });
});

// ==========================================
// NEW CODE: ES MODULE EXPORT & GLOBAL MAP
// ==========================================
// ==========================================
// ENTERPRISE UPGRADE: SMART SEARCH WATCHERS
// ==========================================
// 1. Hide dropdowns when clicking outside of them
document.addEventListener('click', (e) => {
    if (!e.target.closest('.smart-dropdown') && !e.target.closest('input[id$="-search"]')) {
        document.querySelectorAll('.smart-dropdown').forEach(d => d.classList.add('hidden'));
    }
});

// 2. Strict Fallback Observer: Wrapped in an event listener to prevent DOM Race Conditions!
document.addEventListener('DOMContentLoaded', () => {
    ['sales-customer', 'purchase-supplier'].forEach(prefix => {
        const display = document.getElementById(`${prefix}-display`);
        const search = document.getElementById(`${prefix}-search`);
        if(display && search) {
            new MutationObserver(() => {
                if(display.innerText && display.innerText !== 'Select Customer...' && display.innerText !== 'Select Supplier...') {
                    search.value = display.innerText;
                }
            }).observe(display, { childList: true, characterData: true, subtree: true });
        }
    });
});

// 1. Export the module so app.js can import it
export default UI;

// 2. Attach to window so index.html inline scripts don't break
window.UI = UI;

// 3. Boot up the Premium UX Engine automatically
document.addEventListener('DOMContentLoaded', UI.initPremiumUX);
