import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { ofetch, createFetch, FetchError, $Fetch, CreateFetchOptions } from 'ofetch';
import { EventBusService } from './EventBusService';
import { EventName, EventCallback } from '../types/events';
import { IPluginSettings } from '../types/settings';
import { SettingsService } from './SettingsService';
import { requestUrl } from 'obsidian';

interface ICloudflareSettings {
    accountId: string;
    imagesToken: string;
    customDomain?: string;
    defaultVariant?: string;
}

/**
 * Service gérant les interactions avec Cloudflare Images et Stream.
 * Gère les uploads et les transformations automatiques de médias.
 */
export class CloudflareMediaService extends AbstractMediaUploadService {
    private static instance: CloudflareMediaService;
    private settings?: ICloudflareSettings;
    private boundHandleSettingsUpdate: EventCallback<EventName.SETTINGS_UPDATED>;

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
        
        // Vérifier si le service est configuré pour Cloudflare
        if (data.settings.service !== 'cloudflare') {
            console.warn('[CloudflareMedia] Service non configuré pour Cloudflare');
            this.settings = undefined;
            return;
        }
        
        // Mettre à jour les paramètres
        this.settings = data.settings.cloudflare;
        
        if (this.settings) {
            console.log('[CloudflareMedia] Configuration mise à jour:', {
                accountId: this.settings.accountId,
                hasToken: !!this.settings.imagesToken,
                hasCustomDomain: !!this.settings.customDomain
            });
        } else {
            console.warn('[CloudflareMedia] Aucun paramètre Cloudflare trouvé');
        }
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
        // Utiliser le domaine personnalisé si configuré
        if (this.settings?.customDomain) {
            console.log('[CloudflareMedia] Utilisation du domaine personnalisé:', this.settings.customDomain);
            baseUrl = baseUrl.replace(/https:\/\/imagedelivery\.net\/[^/]+/, this.settings.customDomain);
        }

        // Utiliser le variant par défaut si aucun n'est spécifié
        const selectedVariant = variant || this.settings?.defaultVariant || 'public';
        const finalUrl = `${baseUrl}/${selectedVariant}`;

        console.log('[CloudflareMedia] URL formatée:', {
            baseUrl,
            variant: selectedVariant,
            finalUrl
        });

        return finalUrl;
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    private async uploadImage(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        console.log(`[CloudflareMedia] Préparation upload image: ${file.name}`);
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const url = `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`;
            console.log('[CloudflareMedia] Envoi de la requête vers:', url);

            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`,
                    'Accept': 'application/json'
                },
                body: formData
            });

            console.log('[CloudflareMedia] Réponse reçue:', response.json);

            if (!response.json?.success || !response.json?.result?.id) {
                console.error('[CloudflareMedia] Réponse invalide:', response.json);
                throw new Error('Réponse invalide de Cloudflare Images');
            }

            // Construire l'URL de l'image
            const imageId = response.json.result.id;
            const baseUrl = `https://imagedelivery.net/${this.settings.accountId}/${imageId}`;
            const imageUrl = this.formatImageUrl(baseUrl, options?.variant);

            console.log('[CloudflareMedia] URL générée:', {
                baseUrl,
                finalUrl: imageUrl,
                variant: options?.variant || 'public'
            });

            return {
                url: imageUrl,
                publicId: imageId,
                metadata: {
                    id: imageId,
                    type: 'image'
                }
            };
        } catch (error) {
            console.error('[CloudflareMedia] Erreur lors de l\'upload:', error);
            throw new Error(`Erreur d'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    private async uploadVideo(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        console.log(`[CloudflareMedia] Préparation upload vidéo: ${file.name}`);
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const url = `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/stream`;
            console.log('[CloudflareMedia] Envoi de la requête vers:', url);

            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`,
                    'Accept': 'application/json'
                },
                body: formData
            });

            console.log('[CloudflareMedia] Réponse Stream reçue:', response.json);

            if (!response.json?.success || !response.json?.result?.uid) {
                console.error('[CloudflareMedia] Réponse Stream invalide:', response.json);
                throw new Error('Réponse invalide de Cloudflare Stream');
            }

            return {
                url: response.json.result.playback.hls,
                publicId: response.json.result.uid,
                metadata: {
                    id: response.json.result.uid,
                    type: 'video',
                    playback: response.json.result.playback
                }
            };
        } catch (error) {
            console.error('[CloudflareMedia] Erreur lors de l\'upload vidéo:', error);
            throw new Error(`Erreur d'upload vidéo: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        // Détermine si c'est une vidéo ou une image basé sur le format du publicId
        const isVideo = publicId.includes('stream-');
        const url = isVideo 
            ? `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/stream/${publicId}`
            : `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/images/v1/${publicId}`;

        try {
            await requestUrl({
                url: url,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.settings!.imagesToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }
            throw error;
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
} 