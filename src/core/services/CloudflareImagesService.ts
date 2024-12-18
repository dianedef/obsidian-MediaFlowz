import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { ICloudflareSettings } from '../types/settings';
import { ErrorService, ErrorType } from './ErrorService';
import { EventBusService } from './EventBusService';
import { SettingsService } from './SettingsService';

export class CloudflareImagesService extends AbstractMediaUploadService {
    private settings: ICloudflareSettings;
    private baseUrl: string;

    constructor(
        settingsService: SettingsService,
        eventBus: EventBusService,
        errorService: ErrorService
    ) {
        super(settingsService, eventBus, errorService);
        this.settings = this.settingsService.getSettings().cloudflare || {};
        this.baseUrl = this.settings.customDomain || 'imagedelivery.net';
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
} 