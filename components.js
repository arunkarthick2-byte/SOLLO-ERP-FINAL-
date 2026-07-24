// 1. We create a blueprint for a new HTML tag
class SolloTest extends HTMLElement {
    // 2. This runs the moment the tag appears on the screen
    connectedCallback() {
        this.innerHTML = `
            <div style="background: #e8f5e9; border: 2px solid #146c2e; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <strong style="color: #146c2e; font-size: 16px;">🎉 Hello! I am your first Web Component!</strong>
                <p style="color: #146c2e; margin: 4px 0 0 0;">If you can see this, your new architecture is working.</p>
            </div>
        `;
    }
}

// 3. We tell the browser that <sollo-test> is now a real, valid HTML tag!
customElements.define('sollo-test', SolloTest);

// A reusable component for your Menu and Report cards
class SolloNavCard extends HTMLElement {
    // This runs the moment the tag appears on screen
    connectedCallback() {
        // We read the custom attributes you type into the HTML tag
        const title = this.getAttribute('title') || 'Menu Item';
        const subtitle = this.getAttribute('subtitle') || 'Tap to view';
        const icon = this.getAttribute('icon') || 'chevron_right';
        const iconColor = this.getAttribute('icon-color') || 'var(--md-primary)';
        const iconBg = this.getAttribute('icon-bg') || 'rgba(0, 97, 164, 0.1)';
        const action = this.getAttribute('onclick-action') || '';

        // We inject your exact existing HTML structure, dynamically inserting the variables!
        this.innerHTML = `
            <div class="m3-card tap-target" style="display: flex; align-items: center; gap: 16px; padding: 16px; margin: 0; border-bottom: 1px solid var(--md-surface-variant);" onclick="${action}">
                <div class="icon-circle" style="background: ${iconBg}; color: ${iconColor}; width: 40px; height: 40px;">
                    <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
                </div>
                <div style="flex: 1;">
                    <strong style="font-size:15px; color: var(--md-on-surface);">${title}</strong>
                    <small style="display:block; color: var(--md-text-muted); margin-top: 2px;">${subtitle}</small>
                </div>
                <span class="material-symbols-outlined" style="color: var(--md-outline-variant);">chevron_right</span>
            </div>
        `;
    }
}

// Tell the browser this new tag exists!
customElements.define('sollo-nav-card', SolloNavCard);
