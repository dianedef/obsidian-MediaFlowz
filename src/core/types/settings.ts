/**
 * Types pour les paramètres de configuration des différents services.
 * Chaque service a ses propres paramètres spécifiques.
 */

/**
 * Paramètres Cloudinary
 * @see {@link https://cloudinary.com/documentation/upload_images#upload_options}
 */
export interface ICloudinarySettings {
    /** Clé API Cloudinary */
    apiKey: string;
    /** Secret API Cloudinary */
    apiSecret: string;
    /** Nom du cloud Cloudinary */
    cloudName: string;
    /** Preset d'upload non signé (optionnel) */
    uploadPreset?: string;
}

/**
 * Paramètres TwicPics
 * @see {@link https://www.twicpics.com/docs/api/upload}
 */
export interface ITwicPicsSettings {
    /** Domaine TwicPics (ex: your-workspace.twicpics.com) */
    domain: string;
    /** Clé API TwicPics */
    apiKey: string;
    /** Chemin TwicPics (optionnel) */
    path?: string;
}

/**
 * Paramètres Cloudflare
 * @see {@link https://developers.cloudflare.com/images}
 * @see {@link https://developers.cloudflare.com/stream}
 */
export interface ICloudflareSettings {
    /** ID du compte Cloudflare */
    accountId: string;
    /** Token API pour Cloudflare Images et Stream */
    imagesToken: string;
    /** Hash de livraison pour les URLs d'images */
    deliveryHash?: string;
    /** Variant par défaut pour les images */
    defaultVariant?: string;
    /** Domaine personnalisé */
    customDomain?: string;
}

/**
 * Type des services supportés
 */
export enum SupportedService {
    CLOUDINARY = 'cloudinary',
    TWICPICS = 'twicpics',
    CLOUDFLARE = 'cloudflare'
}

/**
 * Configuration globale du plugin
 */
export interface IPluginSettings {
    /** Service actif */
    service: 'cloudflare' | 'cloudinary' | 'twicpics';
    /** Configuration Cloudinary */
    cloudinary?: ICloudinarySettings;
    /** Configuration TwicPics */
    twicpics?: ITwicPicsSettings;
    /** Configuration Cloudflare */
    cloudflare?: ICloudflareSettings;
    /** Liste des dossiers à ignorer */
    ignoredFolders: string[];
    /** Barre d'outils */
    showImageToolbar: boolean;
    /** Boutons de la barre d'outils */
    toolbarButtons: {
        copyImage: boolean;
        copyLink: boolean;
        fullscreen: boolean;
        openInDefaultApp: boolean;
        showInExplorer: boolean;
        revealInNavigation: boolean;
        renameImage: boolean;
        addCaption: boolean;
    };
    /** Types de médias activés */
    enabledMediaTypes: {
        images: boolean;
        videos: boolean;
        gifs: boolean;
    };
    /** Taille par défaut des images */
    defaultImageWidth: 'small' | 'medium' | 'large' | 'original';
    /** Modifier la taille avec alt + scroll */
    enableAltScroll: boolean;
    /** Actions des clics de souris */
    mouseActions: {
        /** Action du clic du milieu */
        middleClick: {
            enabled: boolean;
            action: string;
        };
        /** Action du clic droit */
        rightClick: {
            enabled: boolean;
            action: string;
        };
    };
    /** Paramètres d'optimisation des images */
    imageOptimization: {
        /** Mode d'optimisation */
        mode: 'smart' | 'manual';
        /** Paramètres du mode intelligent */
        smartMode: {
            /** Taille maximale en Ko */
            maxSizeKb: number;
            /** Qualité minimale acceptable (1-100) */
            minQuality: number;
            /** DPI cible */
            targetDPI: number;
        };
        /** Paramètres du mode manuel */
        manualMode: {
            /** Qualité de compression (1-100) */
            quality: number;
        };
    };
}

/**
 * Structure minimale des paramètres initiaux
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
    service: 'cloudflare',
    ignoredFolders: [],
    showImageToolbar: true,
    toolbarButtons: {
        copyImage: true,
        copyLink: true,
        fullscreen: true,
        openInDefaultApp: true,
        showInExplorer: true,
        revealInNavigation: true,
        renameImage: true,
        addCaption: true
    },
    cloudflare: {
        accountId: '',
        imagesToken: ''
    },
    enabledMediaTypes: {
        images: true,
        videos: true,
        gifs: true
    },
    defaultImageWidth: 'medium',
    enableAltScroll: true,
    mouseActions: {
        middleClick: {
            enabled: true,
            action: 'none'
        },
        rightClick: {
            enabled: true,
            action: 'none'
        }
    },
    imageOptimization: {
        mode: 'smart',
        smartMode: {
            maxSizeKb: 500,  // 500Ko max par défaut
            minQuality: 80,  // Ne pas descendre sous 80% de qualité
            targetDPI: 144   // DPI standard pour écrans haute résolution
        },
        manualMode: {
            quality: 85
        }
    }
}; 