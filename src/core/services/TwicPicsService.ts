import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { ITwicPicsSettings } from '../types/settings';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { createFetch, $Fetch, CreateFetchOptions } from 'ofetch';

export class TwicPicsService extends AbstractMediaUploadService {
    private static instance: TwicPicsService;
    private settings?: ITwicPicsSettings;
    private twicFetch?: $Fetch;
    private boundHandleSettingsUpdate: (settings: any) => void;
    private boundHandleMediaUpload: (file: File) => void;

    private constructor() {
        super();
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.boundHandleMediaUpload = this.handleMediaUpload.bind(this);
        this.initializeEventListeners();
    }

    static getInstance(): TwicPicsService {
        if (!TwicPicsService.instance) {
            TwicPicsService.instance = new TwicPicsService();
        }
        return TwicPicsService.instance;
    }

    private initializeEventListeners(): void {
        const eventBus = EventBusService.getInstance();
        eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
    }

    private handleSettingsUpdate(settings: any): void {
        this.settings = settings.twicpics;
        this.setupTwicFetch();
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

    private setupTwicFetch(): void {
        if (!this.settings) return;

        const options: CreateFetchOptions = {
            baseURL: `https://${this.settings.domain}/v1`,
            retry: 2,
            retryDelay: 1000,
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            async onRequestError({ error }) {
                const err = error as Error;
                throw new Error(`Erreur réseau TwicPics: ${err.message}`);
            },
            async onResponseError({ response }) {
                const error = await response.text();
                throw new Error(`Erreur TwicPics: ${error}`);
            }
        };

        this.twicFetch = createFetch(options);
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('TwicPics n\'est pas configuré');
        }

        if (!this.twicFetch) {
            this.setupTwicFetch();
        }

        const isVideo = this.isVideoFile(file);

        try {
            const formData = new FormData();
            formData.append('media', file);
            
            if (options?.folder) {
                formData.append('path', options.folder);
            }

            const response = await this.twicFetch<{
                path: string;
                metadata?: {
                    width?: number;
                    height?: number;
                    format?: string;
                    duration?: number;
                };
            }>('/upload', {
                method: 'POST',
                body: formData
            });
            
            return {
                url: `https://${this.settings!.domain}/${response.path}`,
                publicId: response.path,
                width: response.metadata?.width,
                height: response.metadata?.height,
                format: response.metadata?.format,
                metadata: {
                    ...response.metadata,
                    type: isVideo ? 'video' : 'image'
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
            throw new Error('TwicPics n\'est pas configuré');
        }

        if (!this.twicFetch) {
            this.setupTwicFetch();
        }

        try {
            await this.twicFetch(`/remove/${publicId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }
            throw error;
        }
    }

    getUrl(publicId: string, transformation?: string): string {
        if (!this.settings?.domain) {
            throw new Error('Domaine TwicPics non configuré');
        }
        
        const baseUrl = `https://${this.settings.domain}`;
        if (!transformation) {
            return `${baseUrl}/${publicId}`;
        }
        
        return `${baseUrl}/${transformation}/${publicId}`;
    }

    isConfigured(): boolean {
        return !!(this.settings?.domain && this.settings?.apiKey);
    }

    public static cleanup(): void {
        if (TwicPicsService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, TwicPicsService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, TwicPicsService.instance.boundHandleMediaUpload);
            TwicPicsService.instance = undefined;
        }
    }
} 