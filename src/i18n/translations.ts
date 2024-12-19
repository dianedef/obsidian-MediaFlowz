import { moment } from 'obsidian';

type TranslationKey = keyof typeof fr;
type Translations = Record<'fr' | 'en', Record<TranslationKey, string>>;

const fr = {
    // Paramètres généraux
    'settings.title': 'Paramètres MediaFlowz',
    'settings.service': 'Service',
    'settings.service.title': 'Configuration du service',
    'settings.serviceDesc': 'Choisissez le service que vous souhaitez utiliser pour héberger vos médias.',
    'settings.selectService': 'Sélectionnez un service...',

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
    'settings.twicpics.apiKey': 'Clé API TwicPics',
    'settings.twicpics.apiKeyDesc': 'Votre clé API TwicPics (trouvable dans les paramètres de votre compte)',

    // Paramètres Cloudflare
    'settings.cloudflare.title': 'Configuration Cloudflare',
    'settings.cloudflare.description': 'Cloudflare Images et Stream permettent de stocker et servir vos médias via le réseau CDN mondial de Cloudflare.',
    'settings.cloudflare.accountId': 'Account ID',
    'settings.cloudflare.accountIdDesc': 'Votre identifiant de compte Cloudflare (visible dans l\'URL du dashboard)',
    'settings.cloudflare.deliveryHash': 'Hash de livraison',
    'settings.cloudflare.deliveryHashDesc': 'Le hash utilisé dans les URLs de vos images (format: imagedelivery.net/[hash]/image/variant)',
    'settings.cloudflare.token': 'Token API',
    'settings.cloudflare.tokenDesc': 'Token API avec les permissions Images et Stream',

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
    'settings.ignoredFolders.select': 'Sélectionner un dossier...',
    'settings.ignoredFolders.remove': 'Supprimer ce dossier',
    'settings.ignoredFolders.noFolders': 'Aucun dossier ignoré',
    'settings.ignoredFolders.selectFolder': 'Sélectionner un dossier',
    'settings.ignoredFolders.folderAdded': 'Dossier ajouté aux dossiers ignorés',
    'settings.ignoredFolders.folderRemoved': 'Dossier retiré des dossiers ignorés',

    // Features
    'settings.features.title': 'Fonctionnalités',
    'settings.features.imageToolbar.name': 'Barre d\'outils image',
    'settings.features.imageToolbar.desc': 'Affiche une barre d\'outils au survol des images pour accéder rapidement aux actions courantes'
};

const en = {
    // General settings
    'settings.title': 'MediaFlowz Settings',
    'settings.service': 'Service',
    'settings.service.title': 'Service Configuration',
    'settings.serviceDesc': 'Choose the service you want to use to host your media.',
    'settings.selectService': 'Select a service...',

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
    'settings.twicpics.apiKey': 'TwicPics API Key',
    'settings.twicpics.apiKeyDesc': 'Your TwicPics API key (found in your account settings)',

    // Cloudflare settings
    'settings.cloudflare.title': 'Cloudflare Configuration',
    'settings.cloudflare.description': 'Cloudflare Images and Stream allow you to store and serve your media through Cloudflare\'s global CDN.',
    'settings.cloudflare.accountId': 'Account ID',
    'settings.cloudflare.accountIdDesc': 'Your Cloudflare account identifier.',
    'settings.cloudflare.deliveryHash': 'Delivery Hash',
    'settings.cloudflare.deliveryHashDesc': 'The hash used in the URLs of your images (format: imagedelivery.net/[hash]/image/variant)',
    'settings.cloudflare.token': 'API Token',
    'settings.cloudflare.tokenDesc': 'Token created in Cloudflare Dashboard: ' +
            'Go to dash.cloudflare.com > Click on the top right menu > ' +
            'My Profile > API Tokens > Create Token > ' +
            'Use the "Cloudflare Images & Stream" template with read and write permissions',
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
    'settings.ignoredFolders.select': 'Select a folder...',
    'settings.ignoredFolders.remove': 'Remove this folder',
    'settings.ignoredFolders.noFolders': 'No ignored folders',
    'settings.ignoredFolders.selectFolder': 'Select a folder',
    'settings.ignoredFolders.folderAdded': 'Folder added to ignored folders',
    'settings.ignoredFolders.folderRemoved': 'Folder removed from ignored folders',

    // Features
    'settings.features.title': 'Features',
    'settings.features.imageToolbar.name': 'Image Toolbar',
    'settings.features.imageToolbar.desc': 'Displays a toolbar at the hover of images for quick access to common actions'
};

export const translations: Translations = { fr, en };

export function getCurrentLocale(): 'fr' | 'en' {
    const locale = moment.locale() || 'en';
    return locale === 'fr' ? 'fr' : 'en';
}

export function getTranslation(key: TranslationKey): string {
    const currentLocale = getCurrentLocale();
    const lang = translations[currentLocale] ? currentLocale : 'en';
    
    if (!translations[lang][key]) {
        console.warn(`Missing translation for key: ${key} in language: ${lang}`);
        return key;
    }
    
    return translations[lang][key];
} 