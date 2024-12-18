import { IMediaUploadService } from './interfaces/IMediaUploadService';
import { CloudinaryService } from './CloudinaryService';
import { TwicPicsService } from './TwicPicsService';
import { CloudflareImagesService } from './CloudflareImagesService';
import { IPluginSettings } from '../types/settings';

export class MediaUploadServiceFactory {
    static getService(settings: IPluginSettings): IMediaUploadService {
        switch (settings.service) {
            case 'cloudinary':
                return CloudinaryService.getInstance();
            case 'twicpics':
                return TwicPicsService.getInstance();
            case 'cloudflare':
                return CloudflareImagesService.getInstance();
            default:
                throw new Error('Service de gestion des médias non configuré');
        }
    }
} 