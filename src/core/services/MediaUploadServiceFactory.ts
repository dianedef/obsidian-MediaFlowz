import { IPluginSettings } from '../types/settings';
import { CloudflareMediaService } from './CloudflareMediaService';
import { CloudinaryService } from './CloudinaryService';
import { TwicPicsService } from './TwicPicsService';
import { BunnyService } from './BunnyService';
import { IMediaUploadService } from './interfaces/IMediaUploadService';

export class MediaUploadServiceFactory {
    private static currentService: IMediaUploadService | null = null;

    public static getService(settings: IPluginSettings): IMediaUploadService {
        // Si le service actuel correspond au type demandé, le retourner
        if (this.currentService) {
            if (
                (settings.service === 'cloudflare' && this.currentService instanceof CloudflareMediaService) ||
                (settings.service === 'cloudinary' && this.currentService instanceof CloudinaryService) ||
                (settings.service === 'twicpics' && this.currentService instanceof TwicPicsService) ||
                (settings.service === 'bunny' && this.currentService instanceof BunnyService)
            ) {
                return this.currentService;
            }
            
            // Si le service a changé, nettoyer l'ancien
            if (this.currentService instanceof CloudflareMediaService) {
                CloudflareMediaService.cleanup();
            } else if (this.currentService instanceof CloudinaryService) {
                CloudinaryService.cleanup();
            } else if (this.currentService instanceof TwicPicsService) {
                TwicPicsService.cleanup();
            } else if (this.currentService instanceof BunnyService) {
                BunnyService.cleanup();
            }
        }

        // Créer le nouveau service
        switch (settings.service) {
            case 'cloudflare':
                this.currentService = CloudflareMediaService.getInstance();
                break;
            case 'cloudinary':
                this.currentService = CloudinaryService.getInstance();
                break;
            case 'twicpics':
                this.currentService = TwicPicsService.getInstance();
                break;
            case 'bunny':
                this.currentService = BunnyService.getInstance();
                break;
            default:
                throw new Error(`Service non supporté: ${settings.service}`);
        }

        return this.currentService;
    }
} 