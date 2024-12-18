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
    /** Token pour Cloudflare Images */
    imagesToken: string;
    /** Token pour Cloudflare Stream (optionnel) */
    streamToken?: string;
    /** Variant par défaut pour les images */
    defaultVariant?: string;
    /** Domaine personnalisé */
    customDomain?: string;
    /** Nom du bucket Cloudflare R2 */
    bucketName?: string;
    /** ID de la clé d'accès Cloudflare R2 */
    r2AccessKeyId?: string;
    /** Secret de la clé d'accès Cloudflare R2 */
    r2SecretAccessKey?: string;
}

/**
 * Type des services supportés
 */
export type SupportedService = 'cloudinary' | 'twicpics' | 'cloudflare';

/**
 * Configuration globale du plugin
 */
export interface IPluginSettings {
    /** Service actif */
    service: SupportedService;
    /** Configuration Cloudinary */
    cloudinary?: ICloudinarySettings;
    /** Configuration TwicPics */
    twicpics?: ITwicPicsSettings;
    /** Configuration Cloudflare */
    cloudflare?: ICloudflareSettings;
    /** Liste des dossiers à ignorer */
    ignoredFolders: string[];
}

/**
 * Paramètres par défaut
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
    service: 'cloudinary',
    cloudinary: {
        apiKey: '',
        apiSecret: '',
        cloudName: ''
    },
    twicpics: {
        domain: '',
        apiKey: '',
        path: ''
    },
    cloudflare: {
        accountId: '',
        imagesToken: '',
        bucketName: '',
        r2AccessKeyId: '',
        r2SecretAccessKey: ''
    },
    ignoredFolders: []
}; 