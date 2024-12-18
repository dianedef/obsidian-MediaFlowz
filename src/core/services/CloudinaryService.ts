import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { ICloudinarySettings } from '../types/settings';
import { ofetch, createFetch, FetchError, $Fetch, CreateFetchOptions } from 'ofetch';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';

/**
 * Service gérant les interactions avec l'API Cloudinary.
 * Gère les uploads et transformations d'images et vidéos.
 * 
 * Fonctionnalités :
 * - Upload de fichiers médias (images et vidéos)
 * - Transformations automatiques
 * - Gestion des erreurs réseau
 * - Retry automatique
 * - Signature des requêtes
 */
export class CloudinaryService extends AbstractMediaUploadService {
    private static instance: CloudinaryService;
    private settings?: ICloudinarySettings;
    private cloudinaryFetch?: $Fetch;
    private boundHandleSettingsUpdate: (settings: any) => void;
    private boundHandleMediaUpload: (file: File) => void;

    private constructor() {
        super();
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.boundHandleMediaUpload = this.handleMediaUpload.bind(this);
        this.initializeEventListeners();
    }

    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    private initializeEventListeners(): void {
        const eventBus = EventBusService.getInstance();
        eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
    }

    private handleSettingsUpdate(settings: any): void {
        this.settings = settings.cloudinary;
        this.setupCloudinaryFetch();
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

    private setupCloudinaryFetch(): void {
        if (!this.settings) return;

        const options: CreateFetchOptions = {
            baseURL: `https://api.cloudinary.com/v1_1/${this.settings.cloudName}`,
            retry: 2,
            retryDelay: 1000,
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
            },
            async onRequest({ options }) {
                const opts = options as { body?: FormData };
                if (opts.body instanceof FormData) {
                    opts.body.append('timestamp', String(Math.round(Date.now() / 1000)));
                    opts.body.append('api_key', this.settings!.apiKey);
                }
            },
            async onRequestError({ error }) {
                const err = error as Error;
                throw new Error(`Erreur réseau: ${err.message}`);
            },
            async onResponse({ response }) {
                const data = response._data as { secure_url?: string, resource_type?: string };
                if (!data.secure_url) {
                    throw new Error('Format de réponse invalide');
                }
            },
            async onResponseError({ response }) {
                const data = response._data as { error?: { message: string } };
                throw new Error(`Upload échoué: ${data.error?.message || 'Erreur inconnue'}`);
            }
        };

        this.cloudinaryFetch = createFetch(options);
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        if (!this.cloudinaryFetch) {
            this.setupCloudinaryFetch();
        }

        const isVideo = this.isVideoFile(file);
        const resourceType = isVideo ? 'video' : 'image';

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            if (this.settings!.uploadPreset) {
                formData.append('upload_preset', this.settings!.uploadPreset);
            } else {
                const signature = await this.generateSignature(formData, this.settings!.apiSecret);
                formData.append('signature', signature);
            }

            // Ajouter les options de transformation si présentes
            if (options?.transformation) {
                formData.append('transformation', options.transformation);
            }

            if (options?.folder) {
                formData.append('folder', options.folder);
            }

            if (options?.tags) {
                formData.append('tags', options.tags.join(','));
            }

            const response = await this.cloudinaryFetch<{
                secure_url: string;
                public_id: string;
                resource_type: string;
                width?: number;
                height?: number;
                format?: string;
                duration?: number;
            }>(`/${resourceType}/upload`, {
                method: 'POST',
                body: formData
            });

            return {
                url: response.secure_url,
                publicId: response.public_id,
                width: response.width,
                height: response.height,
                format: response.format,
                metadata: {
                    type: resourceType,
                    duration: response.duration
                }
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Erreur d\'upload inconnue');
        }
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        if (!this.cloudinaryFetch) {
            this.setupCloudinaryFetch();
        }

        try {
            const formData = new FormData();
            formData.append('public_id', publicId);

            if (!this.settings!.uploadPreset) {
                const signature = await this.generateSignature(formData, this.settings!.apiSecret);
                formData.append('signature', signature);
            }

            await this.cloudinaryFetch('/delete', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }
            throw error;
        }
    }

    getUrl(publicId: string, transformation?: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        const baseUrl = `https://res.cloudinary.com/${this.settings!.cloudName}`;
        if (!transformation) {
            return `${baseUrl}/image/upload/${publicId}`;
        }

        return `${baseUrl}/image/upload/${transformation}/${publicId}`;
    }

    private async generateSignature(formData: FormData, apiSecret: string): Promise<string> {
        const params = new Map<string, string>();
        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                params.set(key, value);
            }
        });

        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        const encoder = new TextEncoder();
        const data = encoder.encode(sortedParams + apiSecret);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    isConfigured(): boolean {
        return !!(
            this.settings?.cloudName && 
            this.settings?.apiKey && 
            (this.settings?.apiSecret || this.settings?.uploadPreset)
        );
    }

    public static cleanup(): void {
        if (CloudinaryService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudinaryService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, CloudinaryService.instance.boundHandleMediaUpload);
            CloudinaryService.instance = undefined;
        }
    }
} 