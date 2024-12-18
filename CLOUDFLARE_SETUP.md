# Configuration de Cloudflare Images pour MediaFlowz

## Prérequis

1. **Compte Cloudflare**
   - Un compte Cloudflare actif
   - Un domaine configuré sur Cloudflare (pour servir les images)

2. **Abonnement Cloudflare Images**
   - Rendez-vous sur [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Allez dans la section "Images"
   - Activez le service Cloudflare Images

## Configuration de Cloudflare Images

1. **Créer une clé API**
   - Dans le dashboard Cloudflare, allez dans "Gérer le compte"
   - Cliquez sur "Jetons d'API"
   - Sélectionnez "Créer un jeton"
   - Utilisez le modèle "Cloudflare Images & Stream"
   - Vérifiez que les permissions incluent :
     - Images : Lecture et Écriture
     - Stream : Lecture et Écriture
   - Cliquez sur "Continuer vers le résumé"
   - Cliquez sur "Créer un jeton"
   - **Important** : Copiez et conservez le jeton généré, il ne sera plus affiché ensuite

2. **Récupérer les informations nécessaires**
   - **Account ID** : Visible dans l'URL du dashboard ou dans "Account Home"
   - **API Token** : Le jeton que vous venez de créer
   - **Domaine de livraison** : Votre sous-domaine Cloudflare Images (format : imagedelivery.net)

## Configuration du plugin MediaFlowz

1. **Dans Obsidian**
   - Ouvrez les paramètres (Settings)
   - Allez dans la section MediaFlowz
   - Sélectionnez "Cloudflare" comme service

2. **Remplissez les champs**
   - Account ID
   - API Token (le jeton créé précédemment)
   - Variant par défaut (optionnel, "public" par défaut)

## Fonctionnement

1. **Upload d'images**
   - Copiez-collez une image dans votre note Obsidian
   - L'image est automatiquement uploadée vers Cloudflare Images
   - Le lien est remplacé par l'URL Cloudflare Images

2. **Format des URLs**
   ```
   https://imagedelivery.net/votre-account-hash/image-id/variant
   ```

## Sécurité

- Ne partagez JAMAIS votre jeton API
- Conservez-le dans un gestionnaire de mots de passe sécurisé
- En cas de compromission, révoqué immédiatement le jeton dans le dashboard Cloudflare
- Surveillez régulièrement l'utilisation dans le dashboard Cloudflare

## Support

- [Documentation Cloudflare Images](https://developers.cloudflare.com/images/)
- [Documentation Cloudflare Stream](https://developers.cloudflare.com/stream/) 