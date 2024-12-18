export function registerStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'mediaflowz-styles';
    
    styleEl.textContent = `

    `;

    document.head.appendChild(styleEl);
}

export function unregisterStyles() {
    const styleEl = document.getElementById('mediaflowz-styles');
    if (styleEl) {
        styleEl.remove();
    }
} 