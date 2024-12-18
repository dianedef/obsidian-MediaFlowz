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
    service?: SupportedService;
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
 * Structure minimale des paramètres initiaux
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
    ignoredFolders: []
}; 