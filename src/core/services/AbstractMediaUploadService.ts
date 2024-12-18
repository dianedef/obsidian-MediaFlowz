import { IMediaUploadService, IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { ErrorService, ErrorType } from './ErrorService';
import { EventName } from '../types/events';
import { SettingsService } from './SettingsService';
import { TFile } from 'obsidian';

export abstract class AbstractMediaUploadService implements IMediaUploadService {
    protected readonly eventBus: EventBusService;
    protected readonly errorService: ErrorService;
    protected readonly settingsService: SettingsService;

    constructor() {
        this.eventBus = EventBusService.getInstance();
        this.errorService = ErrorService.getInstance();
        this.settingsService = SettingsService.getInstance();
        this.setupEventListeners();
    }

    protected setupEventListeners(): void {
        this.eventBus.on(EventName.MEDIA_PASTED, async ({ files }) => {
            await this.handleMediaUpload(files);
        });
    }

    /**
     * Vérifie si un fichier est dans un dossier ignoré
     * @param filePath Le chemin du fichier à vérifier
     * @returns true si le fichier est dans un dossier ignoré
     */
    protected isInIgnoredFolder(filePath: string): boolean {
        const settings = this.settingsService.getSettings();
        if (!settings.ignoredFolders || settings.ignoredFolders.length === 0) {
            return false;
        }

        // Normaliser le chemin pour utiliser des slashes avant
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Vérifier si le chemin commence par un des dossiers ignorés
        return settings.ignoredFolders.some(folder => {
            const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
            return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
        });
    }

    /**
     * Gère l'upload des fichiers média.
     * Méthode commune pour tous les services.
     */
    protected async handleMediaUpload(files: FileList): Promise<void> {
        if (!this.isConfigured()) {
            this.handleConfigurationError();
            return;
        }

        const mediaFiles = Array.from(files).filter(file => {
            // Vérifier si c'est un fichier média
            if (!this.isMediaFile(file)) {
                return false;
            }

            // Vérifier si le fichier est dans un dossier ignoré
            const activeFile = app.workspace.getActiveFile();
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

    // Méthodes abstraites à implémenter par les services spécifiques
    abstract upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    abstract delete(publicId: string): Promise<void>;
    abstract getUrl(publicId: string, transformation?: string): string;
    abstract isConfigured(): boolean;
} 