interface Env {
    BUCKET: R2Bucket;
    ACCOUNT_ID: string;
    API_TOKEN: string;
    IMAGES_TOKEN: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Vérification de l'authentification
        const authId = request.headers.get('X-Auth-Id');
        const authKey = request.headers.get('X-Auth-Key');
        
        if (!authId || !authKey) {
            return new Response('Non autorisé', { status: 401 });
        }

        if (request.method === 'POST') {
            try {
                const formData = await request.formData();
                const file = formData.get('file') as File;
                
                if (!file) {
                    return new Response('Fichier manquant', { status: 400 });
                }

                // Upload vers Cloudflare Images directement
                const imageResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/images/v1`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.IMAGES_TOKEN}`
                    },
                    body: file
                });

                const imageData = await imageResponse.json();
                
                if (!imageData.success) {
                    throw new Error('Échec de l'upload vers Cloudflare Images');
                }

                // L'URL retournée inclut déjà les optimisations automatiques
                // Cloudflare Images applique automatiquement :
                // - Compression intelligente
                // - Format optimal (WebP/AVIF selon le navigateur)
                // - Mise en cache globale
                // - Redimensionnement adaptatif
                return new Response(JSON.stringify({
                    url: imageData.result.variants[0],
                    success: true
                }), {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

            } catch (error) {
                return new Response(`Erreur: ${error.message}`, { status: 500 });
            }
        }

        // Pour les requêtes GET, Cloudflare Images gère tout automatiquement
        // Pas besoin de code supplémentaire car les URLs sont déjà optimisées

        return new Response('Méthode non supportée', { status: 405 });
    },
}; 