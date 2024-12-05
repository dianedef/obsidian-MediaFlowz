import { EventBusService } from './EventBusService';
import { ErrorService, ErrorType } from './ErrorService';
import { EventName } from '../types/events';
import { ICloudinarySettings } from '../types/settings';

/**
 * Service gérant les interactions avec l'API Cloudinary.
 * Implémente le pattern Singleton pour assurer une instance unique.
 * 
 * @example
 * const cloudinaryService = CloudinaryService.getInstance();
 */
export class CloudinaryService {
   private static instance: CloudinaryService;
   private eventBus: EventBusService;
   private errorService: ErrorService;
   private settings?: ICloudinarySettings;
   private boundHandleMediaUpload: (data: { files: FileList }) => Promise<void>;
   private boundHandleSettingsUpdate: (data: { settings: ICloudinarySettings }) => void;

   private constructor() {
      this.eventBus = EventBusService.getInstance();
      this.errorService = ErrorService.getInstance();
      
      // Créer des fonctions liées pour pouvoir les retirer plus tard
      this.boundHandleSettingsUpdate = ({ settings }) => {
         this.settings = settings;
      };
      
      this.boundHandleMediaUpload = async ({ files }) => {
         await this.handleMediaUpload(files);
      };
      
      this.setupEventListeners();
   }

   /**
    * Nettoie les event listeners du service.
    * À appeler avant de réinitialiser l'instance.
    */
   static cleanup(): void {
      if (CloudinaryService.instance) {
         const eventBus = EventBusService.getInstance();
         eventBus.off(EventName.SETTINGS_UPDATED, CloudinaryService.instance.boundHandleSettingsUpdate);
         eventBus.off(EventName.MEDIA_PASTED, CloudinaryService.instance.boundHandleMediaUpload);
         CloudinaryService.instance = undefined;
      }
   }

   /**
    * Retourne l'instance unique du service.
    * Crée l'instance si elle n'existe pas encore.
    * 
    * @returns {CloudinaryService} L'instance unique du service
    */
   static getInstance(): CloudinaryService {
      if (!CloudinaryService.instance) {
         CloudinaryService.instance = new CloudinaryService();
      }
      return CloudinaryService.instance;
   }

   /**
    * Configure les écouteurs d'événements pour le service.
    * Écoute les événements de settings et de média.
    * 
    * @private
    */
   private setupEventListeners(): void {
      this.eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
      this.eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
   }

   /**
    * Gère l'upload des fichiers média vers Cloudinary.
    * Vérifie la configuration et le type des fichiers avant l'upload.
    * Émet des événements de succès ou d'erreur.
    * 
    * @param {FileList} files - Liste des fichiers à uploader
    * @fires EventName.MEDIA_UPLOAD_ERROR
    * @fires EventName.MEDIA_UPLOADED
    * @private
    */
   private async handleMediaUpload(files: FileList): Promise<void> {
      if (!this.isConfigured()) {
         const error = this.errorService.createError(
            ErrorType.CONFIG,
            'errors.notConfigured'
         );
         this.errorService.handleError(error);
         this.eventBus.emit(EventName.MEDIA_UPLOAD_ERROR, {
               error: new Error(error.message),
               fileName: 'unknown'
         });
         return;
      }

      const mediaFiles = Array.from(files).filter(file => this.isMediaFile(file));
      
      try {
         const results = await Promise.all(
            mediaFiles.map(file => this.uploadFile(file))
         );
         
         // Émettre les événements de succès
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

   /**
    * Vérifie si le service est correctement configuré.
    * 
    * @returns {boolean} true si tous les paramètres requis sont présents
    * @private
    */
   private isConfigured(): boolean {
      return !!(this.settings?.cloudName && this.settings?.apiKey && this.settings?.apiSecret);
   }

   /**
    * Vérifie si le fichier est un média supporté (image ou vidéo).
    * 
    * @param {File} file - Le fichier à vérifier
    * @returns {boolean} true si le fichier est une image ou une vidéo
    * @private
    */
   private isMediaFile(file: File): boolean {
      return file.type.startsWith('image/') || file.type.startsWith('video/');
   }

   /**
    * Upload un fichier vers Cloudinary.
    * Utilise l'API de upload non signé si un preset est configuré,
    * sinon utilise l'API signée.
    * 
    * @param {File} file - Le fichier à uploader
    * @returns {Promise<string>} L'URL du fichier uploadé
    * @throws {Error} Si l'upload échoue
    * @private
    */
   private async uploadFile(file: File): Promise<string> {
      if (!this.settings) {
         throw new Error('Cloudinary settings not configured');
      }

      try {
         const formData = new FormData();
         formData.append('file', file);
         formData.append('api_key', this.settings.apiKey);
         formData.append('timestamp', String(Math.round(Date.now() / 1000)));
         
         if (this.settings.uploadPreset) {
            formData.append('upload_preset', this.settings.uploadPreset);
         } else {
            const signature = await this.generateSignature(formData, this.settings.apiSecret);
            formData.append('signature', signature);
         }

         let response;
         try {
            response = await fetch(
               `https://api.cloudinary.com/v1_1/${this.settings.cloudName}/auto/upload`,
               {
                  method: 'POST',
                  body: formData
               }
            );
         } catch (error) {
            throw new Error(`Network error: ${error.message}`);
         }

         if (!response.ok) {
            const error = await response.text();
            throw new Error(`Upload failed: ${error}`);
         }

         const data = await response.json();
         return data.secure_url;
      } catch (error) {
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