// state.js
    
// 1. We create the "Brain" (The Proxy State Manager)
window.AppState = new Proxy({
    // These are our starting values
    totalSalesDisplay: '₹0.00',
    businessName: 'My Awesome Business',
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
            // If it's a typing box, update the .value
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
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
