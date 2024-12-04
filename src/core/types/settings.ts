export interface ICloudinarySettings {
    apiKey: string;
    apiSecret: string;
    cloudName: string;
    uploadPreset?: string;
}

export interface IPluginSettings extends ICloudinarySettings {
    language: 'fr' | 'en';
}

export const DEFAULT_SETTINGS: IPluginSettings = {
    apiKey: '',
    apiSecret: '',
    cloudName: '',
    language: 'en'
}; 