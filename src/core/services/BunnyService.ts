import { AbstractMediaUploadService } from './AbstractMediaUploadService';
import { IUploadResponse, IUploadOptions } from './interfaces/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { IPluginSettings, IBunnyStorageZone } from '../types/settings';
import { requestUrl, RequestUrlParam } from "obsidian";

/**
 * Service gérant les interactions avec l'API Bunny.net
 * Permet l'upload et la gestion des médias via le CDN Bunny.net
 */
export class BunnyService extends AbstractMediaUploadService {
    private static instance: BunnyService;
    private settings: IPluginSettings['bunny'] | undefined;
    private boundHandleSettingsUpdate: (data: { settings: IPluginSettings }) => void;
    private readonly API_BASE_URL = 'https://storage.bunnycdn.com';

    private constructor() {
        super();
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        
        const currentSettings = this.settingsService.getSettings();
        if (currentSettings.bunny) {
            this.settings = {
                apiKey: currentSettings.bunny.apiKey || '',
                storageZones: currentSettings.bunny.storageZones || [],
                defaultStorageZone: currentSettings.bunny.defaultStorageZone || '',
                useFolderMapping: currentSettings.bunny.useFolderMapping ?? true
            };
        } else {
            this.settings = {
                apiKey: '',
                storageZones: [],
                defaultStorageZone: '',
                useFolderMapping: true
            };
        }
    }

    public static getInstance(): BunnyService {
        if (!BunnyService.instance) {
            BunnyService.instance = new BunnyService();
        }
        return BunnyService.instance;
    }

    private handleSettingsUpdate({ settings }: { settings: IPluginSettings }): void {
        if (settings.bunny) {
            this.settings = {
                apiKey: settings.bunny.apiKey || '',
                storageZones: settings.bunny.storageZones || [],
                defaultStorageZone: settings.bunny.defaultStorageZone || '',
                useFolderMapping: settings.bunny.useFolderMapping ?? true
            };
            console.log('[BunnyService] Paramètres mis à jour:', {
                hasApiKey: !!this.settings.apiKey,
                storageZonesCount: this.settings.storageZones.length
            });
        }
    }

    /**
     * Détermine la zone de stockage à utiliser en fonction du chemin du fichier
     * @param filePath Chemin du fichier
     * @returns Zone de stockage à utiliser
     */
    private getStorageZoneForPath(filePath: string): IBunnyStorageZone {
        if (!this.settings?.useFolderMapping || !this.settings?.storageZones?.length) {
            return this.getDefaultStorageZone();
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        
        for (const zone of this.settings.storageZones) {
            if (!zone.folders) continue;
            for (const folder of zone.folders) {
                const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                if (normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder) {
                    return zone;
                }
            }
        }

        return this.getDefaultStorageZone();
    }

    /**
     * Retourne la zone de stockage par défaut
     * @returns Zone de stockage par défaut
     * @throws Error si aucune zone de stockage n'est configurée
     */
    private getDefaultStorageZone(): IBunnyStorageZone {
        if (!this.settings?.storageZones?.length) {
            throw new Error('Aucune zone de stockage configurée');
        }

        if (this.settings.defaultStorageZone) {
            const defaultZone = this.settings.storageZones.find(zone => zone.name === this.settings.defaultStorageZone);
            if (defaultZone) {
                return defaultZone;
            }
        }

        return this.settings.storageZones[0];
    }

    private getCustomCDNForPath(path: string): string | undefined {
        if (!this.settings?.customCDNs) return undefined;

        const normalizedPath = path.replace(/\\/g, '/');
        for (const [folder, cdnUrl] of Object.entries(this.settings.customCDNs)) {
            const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
            if (normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder) {
                return cdnUrl;
            }
        }
        return undefined;
    }

    private getCDNUrl(path: string, storageZone: IBunnyStorageZone): string {
        // Vérifier d'abord s'il y a un CDN personnalisé pour ce chemin
        const customCDN = this.getCustomCDNForPath(path);
        if (customCDN) {
            return customCDN;
        }
        return storageZone.pullZoneUrl;
    }

    public async upload(file: File, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny.net manquante');
        }

        try {
            const storageZone = options?.path 
                ? this.getStorageZoneForPath(options.path)
                : this.getDefaultStorageZone();

            const isVideo = this.isVideoFile(file);
            if (isVideo) {
                return await this.uploadVideo(file, storageZone, options);
            } else {
                return await this.uploadImage(file, storageZone, options);
            }
        } catch (error) {
            console.error('❌ Erreur pendant l\'upload:', error);
            throw error;
        }
    }

    private async uploadImage(file: File, storageZone: IBunnyStorageZone, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        const path = options?.path || `${Date.now()}-${file.name}`;
        const arrayBuffer = await file.arrayBuffer();

        const response = await this.makeRequest({
            url: `${this.API_BASE_URL}/${storageZone.storageZone}/${path}`,
            method: 'PUT',
            headers: {
                'AccessKey': storageZone.accessKey,
                'Content-Type': file.type
            },
            body: arrayBuffer
        });

        const cdnUrl = `${this.API_BASE_URL}/${storageZone.storageZone}/${path}`;

        return {
            url: cdnUrl,
            publicId: path,
            metadata: {
                id: path,
                type: 'image',
                path: path,
                storageZone: storageZone.name
            }
        };
    }

    private async uploadVideo(file: File, storageZone: IBunnyStorageZone, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        const path = options?.path || `videos/${Date.now()}-${file.name}`;
        const arrayBuffer = await file.arrayBuffer();

        const response = await this.makeRequest({
            url: `${this.API_BASE_URL}/${storageZone.name}/${path}`,
            method: 'PUT',
            headers: {
                'AccessKey': storageZone.accessKey,
                'Content-Type': file.type
            },
            body: arrayBuffer
        });

        const cdnUrl = `${this.getCDNUrl(path, storageZone)}/${path}`;

        return {
            url: cdnUrl,
            publicId: path,
            metadata: {
                id: path,
                type: 'video',
                path: path,
                storageZone: storageZone.name
            }
        };
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny.net manquante');
        }

        // Trouver la zone de stockage à partir des métadonnées
        const storageZone = this.settings!.storageZones.find(zone => 
            publicId.includes(zone.pullZoneUrl.replace(/^https?:\/\//, ''))
        ) || this.getDefaultStorageZone();

        try {
            const response = await this.makeRequest({
                url: `${this.API_BASE_URL}/${storageZone.name}/${publicId}`,
                method: 'DELETE',
                headers: {
                    'AccessKey': storageZone.accessKey
                }
            });

            if (response?.HttpCode !== 200) {
                throw new Error(`Erreur de suppression: ${response.Message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            throw new Error(`Erreur de suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    getUrl(publicId: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny.net manquante');
        }

        // Vérifier d'abord s'il y a un CDN personnalisé pour ce chemin
        const customCDN = this.getCustomCDNForPath(publicId);
        if (customCDN) {
            return `${customCDN}/${publicId}`;
        }

        // Sinon, utiliser la zone de stockage
        const storageZone = this.settings!.storageZones.find(zone => 
            publicId.includes(zone.pullZoneUrl.replace(/^https?:\/\//, ''))
        ) || this.getDefaultStorageZone();

        return `${storageZone.pullZoneUrl}/${publicId}`;
    }

    private async makeRequest(options: RequestUrlParam): Promise<any> {
        try {
            const response = await requestUrl(options);
            return response.json;
        } catch (error) {
            console.error('❌ Erreur de réponse API:', error);
            throw error;
        }
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    public isConfigured(): boolean {
        return !!(this.settings?.storageZones?.length > 0 && 
                 this.settings.storageZones.every(zone => zone.accessKey && zone.name && zone.pullZoneUrl));
    }

    public static cleanup(): void {
        if (BunnyService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, BunnyService.instance.boundHandleSettingsUpdate);
            BunnyService.instance = null as unknown as BunnyService;
        }
    }
}
