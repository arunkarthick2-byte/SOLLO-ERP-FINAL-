// state.js
    
// 1. We create the "Brain" (The Proxy State Manager)
window.AppState = new Proxy({
    // These are our starting values
    totalSalesDisplay: '₹0.00',
    businessName: 'SOLLO ENTERPRISES',
    profileName: '',
    profilePhone: '',
    profileEmail: '',
    profileGst: '',
    profileAddress: ''
}, {
    // 2. This runs automatically ANY time a value is changed!
    set(target, property, value) {
        // Update the actual data memory
        target[property] = value;
        
        // Go find EVERY HTML element on the screen that has a matching data-bind tag
        const elements = document.querySelectorAll(`[data-bind="${property}"]`);
        
        // Loop through them and inject the new value automatically
        elements.forEach(el => {
            // 🚨 BUG FIX: Checkboxes use .checked, not .value!
            if (el.type === 'checkbox') {
                if (el.checked !== !!value) el.checked = !!value;
            }
            // If it's a typing box, update the .value
            else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                if (el.value !== String(value)) el.value = value;
            } 
            // If it's just normal text on the screen, update the .innerText
            else {
                if (el.innerText !== String(value)) el.innerText = value;
            }
        });
        
        return true; // Tell the browser it was successful
    }
});

// Add this to the very bottom of state.js

// 3. The Global Event Listener (Two-Way Binding)
// This listens to EVERY typing box on the screen automatically
document.addEventListener('input', (e) => {
    // Check if the box we are typing in has a "data-bind" tag
    const bindProp = e.target.getAttribute('data-bind');
    
    if (bindProp) {
        // Grab the text you just typed on your phone keyboard
        const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        
        // Send it directly to the Brain! The Brain will instantly update the screen.
        window.AppState[bindProp] = newValue;
    }
});

// ==========================================
// 4. THE ARRAY PROXY ENGINE (Virtual List Binding)
// ==========================================
// This watches a JavaScript array. When you push() or splice() an item, 
// it surgically injects or removes the HTML without wiping the whole list!

window.createObservableArray = function(initialArray, containerId, renderCallback) {
    const container = document.getElementById(containerId);
    
    // Wipe the container clean on initialization
    if (container) container.innerHTML = '';

    return new Proxy(initialArray, {
        get(target, property) {
            const origMethod = target[property];
            
            // Intercept the array.push() method
            if (property === 'push') {
                return function(...args) {
                    const newItem = args[0];
                    const result = origMethod.apply(target, args); // Do the actual array math
                    
                    // Surgically inject JUST the new HTML item at the bottom of the list
                    const actualContainer = document.getElementById(containerId);
                    if (actualContainer) {
                        const htmlString = renderCallback(newItem);
                        actualContainer.insertAdjacentHTML('beforeend', htmlString);
                    }
                    return result;
                };
            }
            
            // Intercept the array.splice() method (for deletions)
            if (property === 'splice') {
                return function(...args) {
                    const startIndex = args[0];
                    const deleteCount = args[1];
                    const removedItems = origMethod.apply(target, args); // Do the actual array math
                    
                    // Surgically remove JUST the deleted HTML nodes
                    const actualContainer = document.getElementById(containerId);
                    if (actualContainer) {
                        for (let i = 0; i < deleteCount; i++) {
                            // Always remove at startIndex because the DOM shifts up as items are removed
                            if (actualContainer.children[startIndex]) {
                                actualContainer.children[startIndex].remove();
                            }
                        }
                    }
                    return removedItems;
                };
            }
            
            // Return standard array properties (like .length or .map) normally
            return origMethod;
        }
    });
};
