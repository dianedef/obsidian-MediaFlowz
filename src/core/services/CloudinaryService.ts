import { EventBusService } from './EventBusService';
import { ErrorService, ErrorType } from './ErrorService';
import { EventName } from '../types/events';
import { ICloudinarySettings } from '../types/settings';
import { ofetch, createFetch, FetchError, $Fetch, CreateFetchOptions } from 'ofetch';

/**
 * Service gérant les interactions avec l'API Cloudinary.
 * Utilise ofetch pour des requêtes HTTP robustes avec retry automatique.
 * 
 * Fonctionnalités :
 * - Upload de fichiers médias (images et vidéos)
 * - Gestion des erreurs réseau et d'upload
 * - Retry automatique en cas d'échec
 * - Signature des requêtes pour l'authentification
 * 
 * @example
 * const cloudinaryService = CloudinaryService.getInstance();
 */
export class CloudinaryService {
    private static instance: CloudinaryService;
    private readonly eventBus: EventBusService;
    private readonly errorService: ErrorService;
    private settings?: ICloudinarySettings;
    private cloudinaryFetch?: $Fetch;

    private constructor() {
        this.eventBus = EventBusService.getInstance();
        this.errorService = ErrorService.getInstance();
        
        this.setupEventListeners();
    }

    /**
     * Retourne l'instance unique du service.
     * Crée l'instance si elle n'existe pas encore.
     */
    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    /**
     * Nettoie les event listeners du service.
     * À appeler avant de réinitialiser l'instance.
     */
    public static cleanup(): void {
        if (CloudinaryService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudinaryService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, CloudinaryService.instance.boundHandleMediaUpload);
            CloudinaryService.instance = undefined;
        }
    }

    private setupEventListeners(): void {
        this.eventBus.on(EventName.SETTINGS_UPDATED, ({ settings }) => {
            this.settings = settings;
            this.setupCloudinaryFetch();
        });

        this.eventBus.on(EventName.MEDIA_PASTED, async ({ files }) => {
            await this.handleMediaUpload(files);
        });
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
                throw new Error(`Network error: ${err.message}`);
            },
            async onResponse({ response }) {
                const data = response._data as { secure_url?: string };
                if (!data.secure_url) {
                    throw new Error('Invalid response format');
                }
            },
            async onResponseError({ response }) {
                const data = response._data as string;
                throw new Error(`Upload failed: ${data || 'Unknown error'}`);
            }
        };

        this.cloudinaryFetch = createFetch(options);
    }

    /**
     * Gère l'upload des fichiers média vers Cloudinary.
     * Utilise Promise.all pour uploader plusieurs fichiers en parallèle.
     * 
     * @fires EventName.MEDIA_UPLOAD_ERROR
     * @fires EventName.MEDIA_UPLOADED
     */
    private async handleMediaUpload(files: FileList): Promise<void> {
        if (!this.isConfigured()) {
            const structuredError = this.errorService.createError(
                ErrorType.CONFIG,
                'errors.notConfigured'
            );
            this.errorService.handleError(structuredError);
            this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
                error: structuredError,
                fileName: 'unknown'
            });
            return;
        }

        const mediaFiles = Array.from(files).filter(file => this.isMediaFile(file));
        
        try {
            const results = await Promise.all(
                mediaFiles.map(file => this.uploadFile(file))
            );
            
            results.forEach((url, index) => {
                this.eventBus.emit(EventName.MEDIA_UPLOADED, {
                    url,
                    fileName: mediaFiles[index].name
                });
            });
        } catch (error) {
            const isNetwork = this.errorService.isNetworkError(error as Error);
            const structuredError = isNetwork
                ? this.errorService.createError(
                    ErrorType.NETWORK,
                    'errors.networkError',
                    error as Error,
                    { fileName: mediaFiles[0].name }
                )
                : this.errorService.createError(
                    ErrorType.UPLOAD,
                    'errors.uploadFailed',
                    error as Error,
                    { fileName: mediaFiles[0].name }
                );

            this.errorService.handleError(structuredError);
            this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
                error: error as Error,
                fileName: mediaFiles[0].name
            });
        }
    }

    private isConfigured(): boolean {
        return !!(this.settings?.cloudName && this.settings?.apiKey && this.settings?.apiSecret);
    }

    private isMediaFile(file: File): boolean {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    }

    /**
     * Upload un fichier vers Cloudinary avec retry automatique.
     * 
     * @throws {Error} Si l'upload échoue après les retries
     * @throws {FetchError} Si une erreur réseau survient
     */
    private async uploadFile(file: File): Promise<string> {
        if (!this.settings) {
            throw new Error('Cloudinary settings not configured');
        }

        if (!this.cloudinaryFetch) {
            this.setupCloudinaryFetch();
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            if (this.settings.uploadPreset) {
                formData.append('upload_preset', this.settings.uploadPreset);
            } else {
                const signature = await this.generateSignature(formData, this.settings.apiSecret);
                formData.append('signature', signature);
            }

            const response = await this.cloudinaryFetch<{ secure_url: string }>('/auto/upload', {
                method: 'POST',
                body: formData
            });

            return response.secure_url;
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Network error:')) {
                throw error;
            }
            if (error instanceof FetchError) {
                throw new Error(`Network error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Génère une signature pour l'API Cloudinary.
     * Utilise SHA-1 pour signer les paramètres.
     * 
     * @param {FormData} formData - Les données à signer
     * @param {string} apiSecret - Le secret API Cloudinary
     * @returns {Promise<string>} La signature générée
     * @private
     */
    private async generateSignature(formData: FormData, apiSecret: string): Promise<string> {
        const params = new Map<string, string>();
        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                params.set(key, value);
            }
        });

        // Trier les paramètres par clé
        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        // Générer la signature SHA-1
        const encoder = new TextEncoder();
        const data = encoder.encode(sortedParams + apiSecret);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        
        // Convertir en hexadécimal
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
} 