export function registerStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'mediaflowz-styles';
    
    styleEl.textContent = `

        /* Style pour les champs de saisie sensibles (clés API, secrets) */
        .setting-item input[type="password"],
        .setting-item input[data-type="password"] {
            font-family: monospace;
            letter-spacing: 0.1em;
        }

        /* Animations de transition */
        .service-settings-section {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
        }

        .service-settings-section.fade-out {
            opacity: 0;
            transform: translateY(-10px);
        }

        .service-settings-section.fade-in {
            animation: fadeIn 150ms ease-in-out forwards;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Styles pour la liste des dossiers ignorés */
        .ignored-folders-list {
            margin: 1em 0;
        }

        .ignored-folder-item {
            display: flex;
            align-items: center;
            padding: 0.5em;
            margin-bottom: 0.5em;
            background: var(--background-secondary);
            border-radius: 4px;
            transition: background-color 150ms ease-in-out;
        }

        .ignored-folder-item:hover {
            background: var(--background-secondary-alt);
        }

        .ignored-folder-item .setting-item {
            border: none;
            padding: 0;
            margin: 0;
            flex-grow: 1;
        }

        .ignored-folder-item .setting-item-control {
            justify-content: flex-end;
            padding-right: 0;
        }

        .ignored-folder-item .setting-item-name {
            padding: 0 1em;
            font-family: var(--font-monospace);
            color: var(--text-normal);
        }

        /* Animation pour l'ajout/suppression de dossiers */
        .ignored-folder-item {
            animation: slideIn 150ms ease-out forwards;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-10px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;

    document.head.appendChild(styleEl);
}

export function unregisterStyles() {
    const styleEl = document.getElementById('mediaflowz-styles');
    if (styleEl) {
        styleEl.remove();
    }
} 