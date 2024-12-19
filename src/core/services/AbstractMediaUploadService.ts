import { IMediaUploadService, IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { ErrorService, ErrorType } from './ErrorService';
import { EventName } from '../types/events';
import { SettingsService } from './SettingsService';
import { App } from 'obsidian';

export abstract class AbstractMediaUploadService implements IMediaUploadService {
    protected readonly eventBus: EventBusService;
    protected readonly errorService: ErrorService;
    protected readonly settingsService: SettingsService;
    protected readonly app: App;

    constructor() {
        this.eventBus = EventBusService.getInstance();
        this.errorService = ErrorService.getInstance();
        this.settingsService = SettingsService.getInstance();
        this.app = (window as any).app;
        this.setupEventListeners();
    }

    protected setupEventListeners(): void {
        this.eventBus.on(EventName.MEDIA_PASTED, async (data) => {
            await this.handleMediaUpload(data);
        });
    }

    protected isInIgnoredFolder(filePath: string): boolean {
        const settings = this.settingsService.getSettings();
        if (!settings.ignoredFolders || settings.ignoredFolders.length === 0) {
            return false;
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        
        return settings.ignoredFolders.some(folder => {
            const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
            return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
        });
    }

    protected async handleMediaUpload(data: { files: FileList | File[] }): Promise<void> {
        if (!this.isConfigured()) {
            this.handleConfigurationError();
            return;
        }

        const mediaFiles = Array.from(data.files).filter(file => {
            if (!this.isMediaFile(file)) {
                return false;
            }

            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && this.isInIgnoredFolder(activeFile.path)) {
                console.log(`Fichier ignoré car dans un dossier ignoré: ${activeFile.path}`);
                return false;
            }

            return true;
        });
        
        if (mediaFiles.length === 0) {
            return;
        }

        try {
            const results = await Promise.all(
                mediaFiles.map(file => this.upload(file))
            );
            
            results.forEach((result, index) => {
                this.eventBus.emit(EventName.MEDIA_UPLOADED, {
                    url: result.url,
                    fileName: mediaFiles[index].name
                });
            });
        } catch (error) {
            this.handleUploadError(error as Error, mediaFiles[0].name);
        }
    }

    protected handleConfigurationError(): void {
        const structuredError = this.errorService.createError(
            ErrorType.CONFIG,
            'errors.notConfigured'
        );
        this.errorService.handleError(structuredError);
        this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
            error: new Error(structuredError.message),
            fileName: 'unknown'
        });
    }

    protected handleUploadError(error: Error, fileName: string): void {
        const isNetwork = this.errorService.isNetworkError(error);
        const structuredError = isNetwork
            ? this.errorService.createError(
                ErrorType.NETWORK,
                'errors.networkError',
                error,
                { fileName }
            )
            : this.errorService.createError(
                ErrorType.UPLOAD,
                'errors.uploadFailed',
                error,
                { fileName }
            );

        this.errorService.handleError(structuredError);
        this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
            error: new Error(structuredError.message),
            fileName
        });
    }

    protected isMediaFile(file: File): boolean {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    }

    abstract upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    abstract delete(publicId: string): Promise<void>;
    abstract getUrl(publicId: string, transformation?: string): string;
    abstract isConfigured(): boolean;
} 