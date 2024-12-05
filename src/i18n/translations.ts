import { moment } from 'obsidian';

export interface Translations {
    settings: {
        title: string;
        cloudName: string;
        cloudNameDesc: string;
        apiKey: string;
        apiKeyDesc: string;
        apiSecret: string;
        apiSecretDesc: string;
        uploadPreset: string;
        uploadPresetDesc: string;
    };
    notices: {
        mediaPasted: string;
        mediaUploaded: string;
        mediaUploadError: string;
        mediaInserted: string;
    };
    errors: {
        notConfigured: string;
        uploadFailed: string;
        networkError: string;
        checkSettings: string;
        checkConnection: string;
        unexpectedError: string;
    };
}

const fr: Translations = {
    settings: {
        title: 'Paramètres Cloudinary',
        cloudName: 'Nom du cloud',
        cloudNameDesc: 'Le nom de votre cloud Cloudinary',
        apiKey: 'Clé API',
        apiKeyDesc: 'Votre clé API Cloudinary',
        apiSecret: 'Secret API',
        apiSecretDesc: 'Votre secret API Cloudinary',
        uploadPreset: 'Preset d\'upload (optionnel)',
        uploadPresetDesc: 'Preset d\'upload non signé pour plus de sécurité'
    },
    notices: {
        mediaPasted: '📎 Média détecté, envoi vers Cloudinary...',
        mediaUploaded: '✅ {fileName} uploadé avec succès',
        mediaUploadError: '❌ Erreur lors de l\'upload de {fileName}: {error}',
        mediaInserted: '📝 {fileName} inséré dans la note'
    },
    errors: {
        notConfigured: 'Cloudinary n\'est pas configuré',
        uploadFailed: 'L\'upload a échoué',
        networkError: 'Erreur de connexion réseau',
        checkSettings: 'Vérifiez vos paramètres dans les réglages du plugin',
        checkConnection: 'Vérifiez votre connexion internet',
        unexpectedError: 'Une erreur inattendue est survenue'
    }
};

const en: Translations = {
    settings: {
        title: 'Cloudinary Settings',
        cloudName: 'Cloud name',
        cloudNameDesc: 'Your Cloudinary cloud name',
        apiKey: 'API Key',
        apiKeyDesc: 'Your Cloudinary API key',
        apiSecret: 'API Secret',
        apiSecretDesc: 'Your Cloudinary API secret',
        uploadPreset: 'Upload preset (optional)',
        uploadPresetDesc: 'Unsigned upload preset for better security'
    },
    notices: {
        mediaPasted: '📎 Media detected, uploading to Cloudinary...',
        mediaUploaded: '✅ {fileName} uploaded successfully',
        mediaUploadError: '❌ Error uploading {fileName}: {error}',
        mediaInserted: '📝 {fileName} inserted in note'
    },
    errors: {
        notConfigured: 'Cloudinary is not configured',
        uploadFailed: 'Upload failed',
        networkError: 'Network connection error',
        checkSettings: 'Please check your settings in the plugin configuration',
        checkConnection: 'Please check your internet connection',
        unexpectedError: 'An unexpected error occurred'
    }
};

export const translations: Record<string, Translations> = {
    fr,
    en
};

export function getCurrentLocale(): string {
    return moment.locale() || 'en';
}

export function getTranslation(key: string, locale?: string): string {
    const currentLocale = locale || getCurrentLocale();
    const lang = translations[currentLocale] ? currentLocale : 'en';
    
    return key.split('.').reduce((obj: any, part: string) => obj?.[part], translations[lang]) || key;
} 