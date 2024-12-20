// Styles de base pour le plugin
const baseStyles = `
.mediaflowz-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
`;

// Styles pour la barre d'outils des images
const toolbarStyles = `
.mediaflowz-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--background-secondary);
    border-radius: 4px;
}
`;

// Styles pour les boutons de la section des dossiers ignorés
const ignoredFoldersStyles = `
.ignored-folders-section {
    margin-top: 2rem;
}

.ignored-folders-list {
    margin-top: 1rem;
}

.ignored-folder-item {
    margin: 0.5rem 0;
}

.ignored-folder-item .setting-item {
    padding: 0.3rem 0.5rem;
    border: none;
}

.ignored-folder-item .setting-item-control {
    padding: 0;
}

.ignored-folder-item .setting-item-name {
    padding: 0;
}

.setting-item-control button {
    margin-left: 0.5rem;
    padding: 4px 8px;
}
`;

/**
 * Enregistre les styles du plugin dans le DOM
 */
export function registerStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'mediaflowz-styles';
    styleEl.textContent = `
        ${baseStyles}
        ${toolbarStyles}
        ${ignoredFoldersStyles}
    `;
    document.head.appendChild(styleEl);
}

/**
 * Supprime les styles du plugin du DOM
 */
export function unregisterStyles() {
    const styleEl = document.getElementById('mediaflowz-styles');
    if (styleEl) {
        styleEl.remove();
    }
} 