export const translations = {
   en: {
      settings: {
         title: 'Cloudinary Settings',
         apiKey: 'API Key',
         apiKeyDesc: 'Your Cloudinary API key',
         apiSecret: 'API Secret',
         apiSecretDesc: 'Your Cloudinary API secret',
         cloudName: 'Cloud Name',
         cloudNameDesc: 'Your Cloudinary cloud name'
      },
      notices: {
         mediaPasted: 'Media file detected'
      }
   },
   fr: {
      settings: {
         title: 'Paramètres Cloudinary',
         apiKey: 'Clé API',
         apiKeyDesc: 'Votre clé API Cloudinary',
         apiSecret: 'Secret API',
         apiSecretDesc: 'Votre secret API Cloudinary',
         cloudName: 'Nom du Cloud',
         cloudNameDesc: 'Le nom de votre cloud Cloudinary'
      },
      notices: {
         mediaPasted: 'Fichier média détecté'
      }
   }
};

export type TranslationKey = keyof typeof translations.en; 