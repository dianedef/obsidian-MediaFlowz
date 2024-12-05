/**
 * Interface définissant les paramètres de configuration Cloudinary.
 * Contient toutes les informations nécessaires pour se connecter à l'API.
 * 
 * @interface
 * @see {@link https://cloudinary.com/documentation/upload_images#upload_options|Documentation Cloudinary}
 */
export interface ICloudinarySettings {
    /** Clé API fournie par Cloudinary */
    apiKey: string;

    /** Secret API fourni par Cloudinary */
    apiSecret: string;

    /** Nom de votre cloud Cloudinary */
    cloudName: string;

    /**
     * Preset d'upload non signé (optionnel).
     * Si fourni, permet d'utiliser l'API d'upload non signé.
     * @see {@link https://cloudinary.com/documentation/upload_presets|Documentation des presets}
     */
    uploadPreset?: string;
}

/**
 * Type principal des paramètres du plugin.
 * Actuellement identique à ICloudinarySettings car nous n'avons
 * pas d'autres paramètres, mais peut être étendu à l'avenir.
 */
export type IPluginSettings = ICloudinarySettings;

/**
 * Paramètres par défaut du plugin.
 * Utilisés lors de la première initialisation ou en cas de reset.
 * 
 * @constant
 * @type {IPluginSettings}
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
    apiKey: '',
    apiSecret: '',
    cloudName: ''
}; 