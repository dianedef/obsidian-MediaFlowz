import { requestUrl } from 'obsidian';

export interface IPicGoConfig {
    accountId: string;
    token: string;
    customDomain?: string;
}

export class PicGoService {
    private config: IPicGoConfig;

    constructor(config: IPicGoConfig) {
        this.config = config;
    }

    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result as string;
                // Enlever le préfixe "data:image/xxx;base64,"
                resolve(base64.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    }

    async upload(file: File): Promise<{ url: string; id: string }> {
        try {
            console.log('[PicGo] Préparation de l\'upload...', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                accountId: this.config.accountId,
                hasToken: !!this.config.token
            });

            const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/images/v1`;

            // Créer le boundary pour le multipart
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

            // Créer le corps de la requête
            let body = '';
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
            body += `Content-Type: ${file.type}\r\n\r\n`;
            body += await this.fileToBase64(file);
            body += `\r\n--${boundary}--\r\n`;

            // Envoyer la requête
            const response = await requestUrl({
                url: apiUrl,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`
                },
                body: body
            });

            console.log('[PicGo] Réponse complète:', {
                status: response.status,
                headers: response.headers,
                data: response.json
            });

            const data = response.json;
            
            if (!data.success || !data.result?.id) {
                console.error('[PicGo] Erreur de réponse:', {
                    success: data.success,
                    errors: data.errors,
                    messages: data.messages,
                    result: data.result
                });
                throw new Error(data.errors?.[0]?.message || 'Upload failed');
            }

            const imageId = data.result.id;
            const baseUrl = this.config.customDomain || `https://imagedelivery.net/${this.config.accountId}`;
            const imageUrl = `${baseUrl}/${imageId}/public`;

            console.log('[PicGo] Upload réussi:', {
                imageId,
                imageUrl,
                result: data.result
            });

            return {
                url: imageUrl,
                id: imageId
            };
        } catch (requestError) {
            console.error('[PicGo] Erreur de requête détaillée:', {
                error: requestError,
                message: requestError.message,
                stack: requestError.stack,
                cause: requestError.cause
            });
            throw requestError;
        }
    }

    async delete(imageId: string): Promise<void> {
        try {
            console.log('[PicGo] Tentative de suppression:', { imageId });

            const response = await requestUrl({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/images/v1/${imageId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json'
                }
            });

            console.log('[PicGo] Réponse de suppression:', response.json);

            if (!response.json.success) {
                console.error('[PicGo] Échec de la suppression:', response.json);
                throw new Error('Delete failed');
            }

            console.log('[PicGo] Suppression réussie');
        } catch (error) {
            console.error('[PicGo] Erreur de suppression:', {
                error,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
} 