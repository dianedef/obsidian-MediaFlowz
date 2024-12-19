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

    protected isMediaFile(file: File): boolean {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    }

    abstract upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    abstract delete(publicId: string): Promise<void>;
    abstract getUrl(publicId: string, transformation?: string): string;
    abstract isConfigured(): boolean;
} 