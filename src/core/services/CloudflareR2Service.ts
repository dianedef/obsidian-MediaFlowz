import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { ofetch, createFetch, FetchError, $Fetch, CreateFetchOptions } from 'ofetch';
import { EventBusService } from '../EventBusService';
import { EventName } from '../types/events';

interface ICloudflareSettings {
    accountId: string;
    imagesToken: string;
    streamToken?: string;
    defaultVariant?: string;
    customDomain?: string;
}

/**
 * Service gérant les interactions avec Cloudflare Images et Stream.
 * Gère les uploads et les transformations automatiques de médias.
 */
export class CloudflareMediaService extends AbstractMediaUploadService {
    private static instance: CloudflareMediaService;
    private settings?: ICloudflareSettings;
    private imagesFetch?: $Fetch;
    private streamFetch?: $Fetch;
    private boundHandleSettingsUpdate: (settings: any) => void;
    private boundHandleMediaUpload: (file: File) => void;

    private constructor() {
        super();
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.boundHandleMediaUpload = this.handleMediaUpload.bind(this);
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
        eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
    }

    private handleSettingsUpdate(settings: any): void {
        this.settings = settings.cloudflare;
        this.setupFetch();
    }

    private async handleMediaUpload(file: File): Promise<void> {
        try {
            const response = await this.upload(file);
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOADED, {
                url: response.url,
                fileName: file.name
            });
        } catch (error) {
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOAD_ERROR, {
                error: error instanceof Error ? error : new Error('Unknown error'),
                fileName: file.name
            });
        }
    }

    private setupFetch(): void {
        if (!this.settings) return;

        // Setup pour Cloudflare Images
        if (this.settings.imagesToken) {
            this.imagesFetch = createFetch({
                baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`,
                retry: 2,
                retryDelay: 1000,
                timeout: 30000,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.settings.imagesToken}`
                },
                async onRequestError({ error }) {
                    const err = error as Error;
                    throw new Error(`Erreur réseau Images: ${err.message}`);
                },
                async onResponseError({ response }) {
                    const data = response._data as { errors?: Array<{ message: string }> };
                    const message = data.errors?.[0]?.message || 'Erreur inconnue';
                    throw new Error(`Upload Images échoué: ${message}`);
                }
            });
        }

        // Setup pour Cloudflare Stream
        if (this.settings.streamToken) {
            this.streamFetch = createFetch({
                baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/stream`,
                retry: 2,
                retryDelay: 1000,
                timeout: 60000, // Plus long pour les vidéos
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.settings.streamToken}`
                },
                async onRequestError({ error }) {
                    const err = error as Error;
                    throw new Error(`Erreur réseau Stream: ${err.message}`);
                },
                async onResponseError({ response }) {
                    const data = response._data as { errors?: Array<{ message: string }> };
                    const message = data.errors?.[0]?.message || 'Erreur inconnue';
                    throw new Error(`Upload Stream échoué: ${message}`);
                }
            });
        }
    }

    private formatImageUrl(baseUrl: string, variant?: string): string {
        if (this.settings?.customDomain) {
            baseUrl = baseUrl.replace(/https:\/\/imagedelivery\.net\/[^/]+/, this.settings.customDomain);
        }
        const selectedVariant = variant || this.settings?.defaultVariant || 'public';
        return `${baseUrl}/${selectedVariant}`;
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = this.isVideoFile(file);

        if (isVideo && !this.settings?.streamToken) {
            throw new Error('Configuration Cloudflare Stream manquante pour les vidéos');
        }

        if (!isVideo && !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare Images manquante pour les images');
        }

        try {
            if (isVideo) {
                return await this.uploadVideo(file, options);
            } else {
                return await this.uploadImage(file, options);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur d'upload: ${error.message}`);
            }
            throw error;
        }
    }

    private async uploadImage(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.imagesFetch) this.setupFetch();

        const formData = new FormData();
        formData.append('file', file);
        
        if (options?.metadata) {
            formData.append('metadata', JSON.stringify(options.metadata));
        }

        const response = await this.imagesFetch<{ result: { id: string, variants: string[] } }>('', {
            method: 'POST',
            body: formData
        });

        const imageUrl = this.formatImageUrl(response.result.variants[0], options?.variant);

        return {
            url: imageUrl,
            success: true,
            publicId: response.result.id,
            metadata: {
                id: response.result.id,
                variants: response.result.variants,
                type: 'image'
            }
        };
    }

    private async uploadVideo(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.streamFetch) this.setupFetch();

        const formData = new FormData();
        formData.append('file', file);

        if (options?.metadata) {
            formData.append('meta', JSON.stringify(options.metadata));
        }

        const response = await this.streamFetch<{ result: { uid: string, playback: { hls: string, dash: string } } }>('', {
            method: 'POST',
            body: formData
        });

        return {
            url: response.result.playback.hls,
            success: true,
            publicId: response.result.uid,
            metadata: {
                id: response.result.uid,
                type: 'video',
                playback: response.result.playback
            }
        };
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        // Détermine si c'est une vidéo ou une image basé sur le format du publicId
        const isVideo = publicId.includes('stream-');

        try {
            if (isVideo) {
                if (!this.streamFetch) this.setupFetch();
                await this.streamFetch(`/${publicId}`, { method: 'DELETE' });
            } else {
                if (!this.imagesFetch) this.setupFetch();
                await this.imagesFetch(`/${publicId}`, { method: 'DELETE' });
            }
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

    isConfigured(): boolean {
        return !!(this.settings?.accountId && (this.settings?.imagesToken || this.settings?.streamToken));
    }

    public static cleanup(): void {
        if (CloudflareMediaService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudflareMediaService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, CloudflareMediaService.instance.boundHandleMediaUpload);
            CloudflareMediaService.instance = undefined;
        }
    }
} 