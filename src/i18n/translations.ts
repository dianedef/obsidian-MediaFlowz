import { moment } from 'obsidian';

const fr = {
    // Paramètres généraux
    'settings.title': 'Paramètres MediaFlowz',
    'settings.service': 'Service',
    'settings.serviceDesc': 'Choisissez le service que vous souhaitez utiliser pour héberger vos médias.',

    // Paramètres communs
    'settings.apiKey': 'Clé API',
    'settings.apiKeyDesc': 'Votre clé API',
    'settings.apiSecret': 'Secret API',
    'settings.apiSecretDesc': 'Votre secret API',

    // Paramètres Cloudinary
    'settings.cloudinary.title': 'Configuration Cloudinary',
    'settings.cloudinary.description': 'Cloudinary est un service de gestion de médias qui offre des fonctionnalités avancées de transformation d\'images et de vidéos.',
    'settings.cloudinary.cloudName': 'Nom du cloud',
    'settings.cloudinary.cloudNameDesc': 'Le nom de votre cloud Cloudinary (ex: my-cloud)',
    'settings.cloudinary.uploadPreset': 'Preset d\'upload',
    'settings.cloudinary.uploadPresetDesc': 'Preset d\'upload non signé (optionnel). Permet d\'éviter d\'utiliser le secret API.',

    // Paramètres TwicPics
    'settings.twicpics.title': 'Configuration TwicPics',
    'settings.twicpics.description': 'TwicPics est une solution de gestion et d\'optimisation d\'images en temps réel.',
    'settings.twicpics.domain': 'Domaine',
    'settings.twicpics.domainDesc': 'Votre domaine TwicPics (ex: your-workspace.twicpics.com)',
    'settings.twicpics.path': 'Chemin',
    'settings.twicpics.pathDesc': 'Chemin de base pour vos médias (ex: /obsidian)',

    // Paramètres Cloudflare
    'settings.cloudflare.title': 'Configuration Cloudflare',
    'settings.cloudflare.description': 'Cloudflare Images et R2 permettent de stocker et servir vos médias via le réseau CDN mondial de Cloudflare.',
    'settings.cloudflare.accountId': 'ID du compte',
    'settings.cloudflare.accountIdDesc': 'L\'identifiant de votre compte Cloudflare.',
    'settings.cloudflare.imagesToken': 'Token Images',
    'settings.cloudflare.imagesTokenDesc': 'Token API pour Cloudflare Images.',
    'settings.cloudflare.streamToken': 'Token Stream',
    'settings.cloudflare.streamTokenDesc': 'Token API pour Cloudflare Stream (optionnel, pour les vidéos).',
    'settings.cloudflare.customDomain': 'Domaine personnalisé',
    'settings.cloudflare.customDomainDesc': 'Domaine personnalisé pour servir vos médias (optionnel).',
    'settings.cloudflare.bucketName': 'Nom du bucket R2',
    'settings.cloudflare.bucketNameDesc': 'Le nom de votre bucket Cloudflare R2.',
    'settings.cloudflare.r2AccessKeyId': 'Clé d\'accès R2',
    'settings.cloudflare.r2AccessKeyIdDesc': 'L\'identifiant de votre clé d\'accès R2.',
    'settings.cloudflare.r2SecretAccessKey': 'Secret R2',
    'settings.cloudflare.r2SecretAccessKeyDesc': 'La clé secrète de votre accès R2.',

    // Notifications
    'notices.mediaPasted': '📎 Média détecté...',
    'notices.mediaUploaded': '✅ {fileName} uploadé avec succès',
    'notices.mediaUploadError': '❌ Erreur lors de l\'upload de {fileName}: {error}',
    'notices.mediaInserted': '📝 {fileName} inséré dans la note',
    'notices.settingsSaved': '⚙️ Paramètres sauvegardés',
    'notices.serviceChanged': '🔄 Service changé pour {service}',
    'notices.prefixUpdated': "Le préfixe des images a été mis à jour de '{oldPrefix}' à '{newPrefix}'",
    'notices.noImagesUpdated': "Aucune image à mettre à jour avec le préfixe '{prefix}'",
    'notices.imagesUpdated': "{count} image(s) mise(s) à jour avec le préfixe '{prefix}'",
    'notices.uploadStarted': "⏳ Upload en cours...",
    'notices.uploadProcessing': "🔄 Traitement...",
    'notices.uploadComplete': "✅ {fileName} uploadé et traité avec succès",
    'notices.uploadProgress': '⬛⬛⬛⬜⬜ {step}/5',

    // Erreurs
    'errors.notConfigured': 'Le service n\'est pas configuré',
    'errors.uploadFailed': 'L\'upload a échoué',
    'errors.networkError': 'Erreur de connexion réseau',
    'errors.checkSettings': 'Vérifiez vos paramètres dans les réglages du plugin',
    'errors.checkConnection': 'Vérifiez votre connexion internet',
    'errors.unexpectedError': 'Une erreur inattendue est survenue',

    // Paramètres des dossiers ignorés
    'settings.ignoredFolders.title': 'Dossiers ignorés',
    'settings.ignoredFolders.add': 'Ajouter un dossier',
    'settings.ignoredFolders.addDesc': 'Les médias dans ces dossiers ne seront pas uploadés automatiquement.',
    'settings.ignoredFolders.placeholder': 'Chemin du dossier (ex: Templates)',
    'settings.ignoredFolders.remove': 'Supprimer ce dossier',
};

const en = {
    // General settings
    'settings.title': 'MediaFlowz Settings',
    'settings.service': 'Service',
    'settings.serviceDesc': 'Choose the service you want to use to host your media.',

    // Common settings
    'settings.apiKey': 'API Key',
    'settings.apiKeyDesc': 'Your API key',
    'settings.apiSecret': 'API Secret',
    'settings.apiSecretDesc': 'Your API secret',

    // Cloudinary settings
    'settings.cloudinary.title': 'Cloudinary Configuration',
    'settings.cloudinary.description': 'Cloudinary is a media management service that offers advanced image and video transformation features.',
    'settings.cloudinary.cloudName': 'Cloud name',
    'settings.cloudinary.cloudNameDesc': 'Your cloud name (e.g. my-cloud)',
    'settings.cloudinary.uploadPreset': 'Upload preset',
    'settings.cloudinary.uploadPresetDesc': 'Unsigned upload preset for better security',

    // TwicPics settings
    'settings.twicpics.title': 'TwicPics Configuration',
    'settings.twicpics.description': 'TwicPics is a real-time image management and optimization solution.',
    'settings.twicpics.domain': 'Domain',
    'settings.twicpics.domainDesc': 'Your TwicPics domain (e.g. your-workspace.twicpics.com)',
    'settings.twicpics.path': 'Path',
    'settings.twicpics.pathDesc': 'Base path for your media (e.g. /obsidian)',

    // Cloudflare settings
    'settings.cloudflare.title': 'Cloudflare Configuration',
    'settings.cloudflare.description': 'Cloudflare Images and R2 allow you to store and serve your media through Cloudflare\'s global CDN.',
    'settings.cloudflare.accountId': 'Account ID',
    'settings.cloudflare.accountIdDesc': 'Your Cloudflare account identifier.',
    'settings.cloudflare.imagesToken': 'Images Token',
    'settings.cloudflare.imagesTokenDesc': 'API Token for Cloudflare Images.',
    'settings.cloudflare.streamToken': 'Stream Token',
    'settings.cloudflare.streamTokenDesc': 'API Token for Cloudflare Stream (optional, for videos).',
    'settings.cloudflare.customDomain': 'Custom Domain',
    'settings.cloudflare.customDomainDesc': 'Custom domain to serve your media (optional).',
    'settings.cloudflare.bucketName': 'R2 Bucket Name',
    'settings.cloudflare.bucketNameDesc': 'Your Cloudflare R2 bucket name.',
    'settings.cloudflare.r2AccessKeyId': 'R2 Access Key',
    'settings.cloudflare.r2AccessKeyIdDesc': 'Your R2 access key identifier.',
    'settings.cloudflare.r2SecretAccessKey': 'R2 Secret',
    'settings.cloudflare.r2SecretAccessKeyDesc': 'Your R2 access key secret.',

    // Notifications
    'notices.mediaPasted': '📎 Media detected...',
    'notices.mediaUploaded': '✅ {fileName} uploaded successfully',
    'notices.mediaUploadError': '❌ Error uploading {fileName}: {error}',
    'notices.mediaInserted': '📝 {fileName} inserted in note',
    'notices.settingsSaved': '⚙️ Settings saved',
    'notices.serviceChanged': '🔄 Service changed to {service}',
    'notices.prefixUpdated': "The image prefix has been updated from '{oldPrefix}' to '{newPrefix}'",
    'notices.noImagesUpdated': "No images to update with the prefix '{prefix}'",
    'notices.imagesUpdated': "{count} image(s) updated with the prefix '{prefix}'",
    'notices.uploadStarted': "⏳ Starting upload...",
    'notices.uploadProcessing': "🔄 Processing...",
    'notices.uploadComplete': "✅ {fileName} uploaded and processed successfully",
    'notices.uploadProgress': '⬛⬛⬛⬜⬜ {step}/5',

    // Errors
    'errors.notConfigured': 'Service is not configured',
    'errors.uploadFailed': 'Upload failed',
    'errors.networkError': 'Network connection error',
    'errors.checkSettings': 'Please check your settings in the plugin configuration',
    'errors.checkConnection': 'Please check your internet connection',
    'errors.unexpectedError': 'An unexpected error occurred',

    // Ignored folders settings
    'settings.ignoredFolders.title': 'Ignored Folders',
    'settings.ignoredFolders.add': 'Add folder',
    'settings.ignoredFolders.addDesc': 'Media in these folders will not be automatically uploaded.',
    'settings.ignoredFolders.placeholder': 'Folder path (e.g. Templates)',
    'settings.ignoredFolders.remove': 'Remove this folder',
};

export const translations = { fr, en };

export function getCurrentLocale(): string {
    const locale = moment.locale() || 'en';
    console.log('Current locale detected:', locale);
    return locale;
}

export function getTranslation(key: string): string {
    const currentLocale = getCurrentLocale();
    const lang = translations[currentLocale] ? currentLocale : 'en';
    console.log('Translation request:', {
        requestedKey: key,
        detectedLocale: currentLocale,
        usedLanguage: lang,
        translationFound: translations[lang][key] !== undefined
    });
    
    if (!translations[lang][key]) {
        console.warn(`Missing translation for key: ${key} in language: ${lang}`);
    }
    
    return translations[lang][key] || key;
} 