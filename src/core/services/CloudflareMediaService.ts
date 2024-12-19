import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { EventName, EventCallback } from '../types/events';
import { IPluginSettings } from '../types/settings';
import { SettingsService } from './SettingsService';
import { PicGoService } from './PicGoService';
import { requestUrl, RequestUrlParam } from "obsidian";

interface ICloudflareSettings {
    accountId: string;
    imagesToken: string;
    customDomain?: string;
    defaultVariant?: string;
    deliveryHash?: string;
}

/**
 * Service gérant les interactions avec Cloudflare Images et Stream.
 * Gère les uploads et les transformations automatiques de médias.
 */
export class CloudflareMediaService extends AbstractMediaUploadService {
    private static instance: CloudflareMediaService;
    private settings?: ICloudflareSettings;
    private boundHandleSettingsUpdate: EventCallback<EventName.SETTINGS_UPDATED>;
    private picgo?: PicGoService;

    private constructor() {
        super();
        console.log('[CloudflareMedia] Initialisation du service');
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.initializeEventListeners();
    }

    public static getInstance(): CloudflareMediaService {
        if (!CloudflareMediaService.instance) {
            CloudflareMediaService.instance = new CloudflareMediaService();
        }
        return CloudflareMediaService.instance;
    }

    private initializeEventListeners(): void {
        const eventBus = EventBusService.getInstance();
        eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
    }

    private handleSettingsUpdate(data: { settings: IPluginSettings }): void {
        console.log('[CloudflareMedia] Mise à jour des paramètres:', {
            service: data.settings.service,
            hasCloudflare: !!data.settings.cloudflare,
            accountId: data.settings.cloudflare?.accountId,
            hasToken: !!data.settings.cloudflare?.imagesToken
        });
        
        if (data.settings.service !== 'cloudflare') {
            console.warn('[CloudflareMedia] Service non configuré pour Cloudflare');
            this.settings = undefined;
            return;
        }
        
        this.settings = data.settings.cloudflare;
        
        if (this.settings) {
            console.log('[CloudflareMedia] Configuration mise à jour:', {
                accountId: this.settings.accountId,
                hasToken: !!this.settings.imagesToken,
                hasCustomDomain: !!this.settings.customDomain
            });
            this.setupPicGo();
        } else {
            console.warn('[CloudflareMedia] Aucun paramètre Cloudflare trouvé');
        }
    }

    private setupPicGo(): void {
        if (!this.settings) return;

        this.picgo = new PicGoService({
            accountId: this.settings.accountId,
            token: this.settings.imagesToken,
            customDomain: this.settings.customDomain
        });
    }

    public async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        console.log(`[CloudflareMedia] Début du processus d'upload pour ${file.name}`);
        
        if (!this.isConfigured()) {
            console.error('[CloudflareMedia] Service non configuré');
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = this.isVideoFile(file);
        console.log(`[CloudflareMedia] Type de fichier détecté: ${isVideo ? 'vidéo' : 'image'}`);

        if (isVideo && !this.settings?.imagesToken) {
            console.error('[CloudflareMedia] Token manquant pour l\'upload de vidéo');
            throw new Error('Configuration Cloudflare Stream manquante pour les vidéos');
        }

        if (!isVideo && !this.settings?.imagesToken) {
            console.error('[CloudflareMedia] Token manquant pour l\'upload d\'image');
            throw new Error('Configuration Cloudflare Images manquante pour les images');
        }

        try {
            if (isVideo) {
                console.log('[CloudflareMedia] Démarrage upload vidéo vers Stream');
                return await this.uploadVideo(file, options);
            } else {
                console.log('[CloudflareMedia] Démarrage upload image vers Images');
                return await this.uploadImage(file, options);
            }
        } catch (error) {
            console.error('[CloudflareMedia] Erreur pendant l\'upload:', error);
            if (error instanceof Error) {
                throw new Error(`Erreur d'upload: ${error.message}`);
            }
            throw error;
        }
    }

    private formatImageUrl(baseUrl: string, variant?: string): string {
        if (!this.settings?.accountId || !this.settings?.deliveryHash) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const imageId = baseUrl.split('/').pop() || '';
        const selectedVariant = variant || this.settings?.defaultVariant || 'public';
        
        if (this.settings?.customDomain) {
            return `https://${this.settings.customDomain}/${imageId}/${selectedVariant}`;
        }

        return `https://imagedelivery.net/${this.settings.deliveryHash}/${imageId}/${selectedVariant}`;
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    private async makeRequest(options: RequestUrlParam): Promise<any> {
        try {
            const response = await requestUrl(options);
            return response.json;
        } catch (error) {
            if (error.response) {
                console.error('[CloudflareMedia] Erreur avec réponse:', await error.response.json());
            }
            throw error;
        }
    }

    private async uploadImage(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        console.log(`[CloudflareMedia] Préparation upload image: ${file.name}`);
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            // Créer le boundary
            const boundary = '----CloudflareFormBoundary' + Math.random().toString(36).substring(2);

            // Construire le corps multipart/form-data
            const arrayBuffer = await file.arrayBuffer();
            const encoder = new TextEncoder();

            // Début du multipart
            const start = encoder.encode(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
                `Content-Type: ${file.type}\r\n\r\n`
            );

            // Fin du multipart
            const end = encoder.encode(`\r\n--${boundary}--\r\n`);

            // Combiner les parties
            const body = new Uint8Array(start.length + arrayBuffer.byteLength + end.length);
            body.set(start, 0);
            body.set(new Uint8Array(arrayBuffer), start.length);
            body.set(end, start.length + arrayBuffer.byteLength);

            const response = await this.makeRequest({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                body: body.buffer
            });

            if (!response?.success || !response?.result?.id) {
                console.error('[CloudflareMedia] Réponse invalide:', response);
                throw new Error(`Réponse invalide de Cloudflare Images: ${JSON.stringify(response)}`);
            }

            const imageId = response.result.id;
            const imageUrl = this.formatImageUrl(`https://imagedelivery.net/${this.settings.accountId}/${imageId}`);

            return {
                url: imageUrl,
                publicId: imageId,
                metadata: {
                    id: imageId,
                    type: 'image'
                }
            };
        } catch (error) {
            console.error('[CloudflareMedia] Erreur détaillée:', {
                error,
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            throw error;
        }
    }

    private async uploadVideo(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        console.log(`[CloudflareMedia] Préparation upload vidéo: ${file.name}`);
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();

            const response = await this.makeRequest({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/stream`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`
                },
                body: arrayBuffer
            });

            if (!response?.success || !response?.result?.uid) {
                console.error('[CloudflareMedia] Réponse Stream invalide:', response);
                throw new Error('Réponse invalide de Cloudflare Stream');
            }

            const videoId = response.result.uid;
            const videoUrl = `https://customer-${this.settings.accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;

            return {
                url: videoUrl,
                publicId: videoId,
                metadata: {
                    id: videoId,
                    type: 'video',
                    playback: response.result.playback
                }
            };
        } catch (error) {
            console.error('[CloudflareMedia] Erreur détaillée:', {
                error,
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            throw error;
        }
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = publicId.includes('stream-');
        const url = isVideo 
            ? `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/stream/${publicId}`
            : `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/images/v1/${publicId}`;

        try {
            const response = await this.makeRequest(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.settings!.imagesToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response?.success) {
                console.error('[CloudflareMedia] Erreur lors de la suppression:', response);
                throw new Error(`Erreur de suppression: ${response.status}`);
            }
        } catch (error) {
            console.error('[CloudflareMedia] Erreur lors de la suppression:', error);
            throw new Error(`Erreur de suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    getUrl(publicId: string, variant?: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        // Détermine si c'est une vidéo ou une image basé sur le format du publicId
        const isVideo = publicId.includes('stream-');

        if (isVideo) {
            return `https://customer-${this.settings!.accountId}.cloudflarestream.com/${publicId}/manifest/video.m3u8`;
        } else {
            const baseUrl = `https://imagedelivery.net/${this.settings!.accountId}/${publicId}`;
            return this.formatImageUrl(baseUrl, variant);
        }
    }

    public isConfigured(): boolean {
        const configured = !!(
            this.settings?.accountId &&
            this.settings?.imagesToken
        );
        console.log('[CloudflareMedia] Vérification de la configuration:', {
            hasSettings: !!this.settings,
            accountId: this.settings?.accountId,
            hasToken: !!this.settings?.imagesToken,
            isConfigured: configured
        });
        return configured;
    }

    public static cleanup(): void {
        if (CloudflareMediaService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudflareMediaService.instance.boundHandleSettingsUpdate);
            CloudflareMediaService.instance = null as unknown as CloudflareMediaService;
        }
    }

    async uploadFile(fileData: ArrayBuffer, fileName: string): Promise<string> {
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const formData = new FormData();
            const blob = new Blob([fileData], { type: 'application/octet-stream' });
            formData.append('file', blob, fileName);

            console.log('Envoi de la requête à Cloudflare...');

            const response = await requestUrl({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`
                },
                body: formData as unknown as string // Type cast nécessaire pour Obsidian API
            });

            if (!response.json.success) {
                console.error('Erreur Cloudflare:', response.json.errors);
                throw new Error(`Échec de l'upload: ${JSON.stringify(response.json.errors)}`);
            }

            const imageId = response.json.result.id;
            const imageUrl = this.formatImageUrl(`https://imagedelivery.net/${this.settings.accountId}/${imageId}`);
            
            console.log('URL générée:', imageUrl);
            return imageUrl;
        } catch (error) {
            console.error('Erreur lors de l\'upload vers Cloudflare:', error);
            throw error;
        }
    }
} 