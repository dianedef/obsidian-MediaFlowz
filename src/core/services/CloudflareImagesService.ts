import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { ICloudflareSettings } from '../types/settings';
import { ErrorService, ErrorType } from './ErrorService';
import { EventBusService } from './EventBusService';
import { SettingsService } from './SettingsService';
import { EventName } from '../types/events';

export class CloudflareImagesService extends AbstractMediaUploadService {
    private settings: ICloudflareSettings;
    private baseUrl: string;
    private static instance: CloudflareImagesService;

    private constructor(
        settingsService: SettingsService,
        eventBus: EventBusService,
        errorService: ErrorService
    ) {
        super(settingsService, eventBus, errorService);
        this.settings = this.settingsService.getSettings().cloudflare || {} as ICloudflareSettings;
        this.baseUrl = this.settings.customDomain || 'imagedelivery.net';
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        this.eventBus.on(EventName.SETTINGS_UPDATED, this.handleSettingsUpdate.bind(this));
        this.eventBus.on(EventName.MEDIA_PASTED, this.handleMediaUpload.bind(this));
    }

    private handleSettingsUpdate(data: { settings: { cloudflare?: ICloudflareSettings } }): void {
        this.settings = data.settings.cloudflare || {} as ICloudflareSettings;
        this.baseUrl = this.settings.customDomain || 'imagedelivery.net';
    }

    protected async handleMediaUpload(data: { files: FileList }): Promise<void> {
        for (let i = 0; i < data.files.length; i++) {
            const file = data.files[i];
            try {
                const response = await this.upload(file);
                this.eventBus.emit(EventName.MEDIA_UPLOADED, {
                    url: response.url,
                    fileName: file.name
                });
            } catch (error) {
                this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
                    error: error as Error,
                    fileName: file.name
                });
            }
        }
    }

    public static getInstance(
        settingsService: SettingsService,
        eventBus: EventBusService,
        errorService: ErrorService
    ): CloudflareImagesService {
        if (!CloudflareImagesService.instance) {
            CloudflareImagesService.instance = new CloudflareImagesService(
                settingsService,
                eventBus,
                errorService
            );
        }
        return CloudflareImagesService.instance;
    }

    public isConfigured(): boolean {
        return !!(
            this.settings.accountId &&
            this.settings.imagesToken
        );
    }

    public async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw this.errorService.createError(
                ErrorType.CONFIG,
                'errors.notConfigured'
            );
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            if (options?.folder) {
                formData.append('requireSignedURLs', 'true');
            }

            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.settings.imagesToken}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.errors?.[0]?.message || 'Upload failed');
            }

            const variant = this.settings.defaultVariant || 'public';
            const imageId = data.result.id;
            
            return {
                url: this.getUrl(imageId),
                publicId: imageId,
                width: data.result.metadata?.width,
                height: data.result.metadata?.height,
                format: data.result.metadata?.type
            };
        } catch (error) {
            if (this.errorService.isNetworkError(error)) {
                throw this.errorService.createError(
                    ErrorType.NETWORK,
                    'errors.networkError',
                    error as Error
                );
            }
            throw this.errorService.createError(
                ErrorType.UPLOAD,
                'errors.uploadFailed',
                error as Error
            );
        }
    }

    public async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw this.errorService.createError(
                ErrorType.CONFIG,
                'errors.notConfigured'
            );
        }

        try {
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1/${publicId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.settings.imagesToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.errors?.[0]?.message || 'Delete failed');
            }
        } catch (error) {
            if (this.errorService.isNetworkError(error)) {
                throw this.errorService.createError(
                    ErrorType.NETWORK,
                    'errors.networkError',
                    error as Error
                );
            }
            throw this.errorService.createError(
                ErrorType.UNEXPECTED,
                'errors.deleteFailed',
                error as Error
            );
        }
    }

    public getUrl(publicId: string, transformation?: string): string {
        const variant = transformation || this.settings.defaultVariant || 'public';
        return `https://${this.baseUrl}/${this.settings.accountId}/${publicId}/${variant}`;
    }

    public static cleanup(): void {
        CloudflareImagesService.instance = undefined;
    }
} 