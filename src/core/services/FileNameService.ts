import { TFile } from 'obsidian';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { Notice } from 'obsidian';
import { getTranslation } from '../../i18n/translations';
import { App } from 'obsidian';

export class FileNameService {
   private static instance: FileNameService;
   private eventBus: EventBusService;
   private app: App;

   private constructor(app: App) {
      this.app = app;
      this.eventBus = EventBusService.getInstance();
      
      // Écouter les changements de frontmatter
      this.eventBus.on(EventName.FRONTMATTER_UPDATED, async ({ file, oldPrefix, newPrefix }) => {
         if (oldPrefix && newPrefix && oldPrefix !== newPrefix) {
            // Trouver toutes les images dans le contenu qui utilisent l'ancien préfixe
            // et les mettre à jour avec le nouveau
            await this.updateImagePrefixes(file, oldPrefix, newPrefix);
         }
      });
   }

   static getInstance(app: App): FileNameService {
      if (!FileNameService.instance) {
         FileNameService.instance = new FileNameService(app);
      }
      return FileNameService.instance;
   }

   public static cleanup(): void {
      if (FileNameService.instance) {
         FileNameService.instance = null as unknown as FileNameService;
      }
   }

   private toKebabCase(str: string): string {
      return str
         .replace(/([a-z])([A-Z])/g, '$1-$2')
         .replace(/[\s_]+/g, '-')
         .replace(/[&]+/g, 'and')
         .replace(/[^a-zA-Z0-9-]/g, '')
         .toLowerCase();
   }

   async getFilePrefix(file: TFile): Promise<string> {
      // Essayer d'abord de récupérer depuis le frontmatter
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      
      if (frontmatter?.['img-prefix']) {
         return frontmatter['img-prefix'];
      }

      // Sinon utiliser le titre de la note en kebab-case
      const title = file.basename;
      return this.toKebabCase(title);
   }

   generateFileName(file: File, prefix: string = ''): string {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || '';
      const baseFileName = this.toKebabCase(prefix || file.name.split('.')[0]);
      const newFileName = `${baseFileName}_${timestamp}.${fileExtension}`;

      console.log('[FileNameService] Génération du nom de fichier:', {
         original: file.name,
         prefix,
         timestamp,
         extension: fileExtension,
         newName: newFileName
      });

      return newFileName;
   }

   createFileWithNewName(file: File, newName: string): File {
      console.log(`[FileNameService] Création d'un nouveau fichier avec le nom ${newName}`, {
         originalName: file.name,
         originalType: file.type,
         originalSize: file.size
      });

      // Créer un nouveau fichier avec le nouveau nom
      const blob = file.slice(0, file.size, file.type);
      const newFile = new File([blob], newName, { type: file.type });

      console.log('[FileNameService] Nouveau fichier créé:', {
         name: newFile.name,
         type: newFile.type,
         size: newFile.size
      });

      return newFile;
   }

   private async updateImagePrefixes(file: TFile, oldPrefix: string, newPrefix: string) {
      // Récupérer le contenu du fichier
      const content = await file.vault.read(file);
      
      // Regex pour trouver les images avec l'ancien préfixe
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(([^\\)]*)${oldPrefix}_\\d+\\.[a-zA-Z]+\\)`, 'g');
      
      // Compter les occurrences
      const matches = content.match(regex);
      if (!matches?.length) {
         new Notice(getTranslation('notices.noImagesUpdated')
            .replace('{prefix}', oldPrefix));
         return;
      }

      // Remplacer les occurrences
      const newContent = content.replace(regex, (match, alt, path) => {
         const timestamp = new Date().getTime();
         const extension = match.split('.').pop()?.replace(')', '') || '';
         return `![${alt}](${path}${newPrefix}_${timestamp}.${extension})`;
      });

      // Sauvegarder le fichier si des modifications ont été faites
      if (content !== newContent) {
         await file.vault.modify(file, newContent);
         
         new Notice(
            getTranslation('notices.imagesUpdated')
               .replace('{count}', matches.length.toString())
               .replace('{prefix}', newPrefix), 
            10000 // durée en millisecondes
         );
         
         new Notice(getTranslation('notices.prefixUpdated')
            .replace('{oldPrefix}', oldPrefix)
            .replace('{newPrefix}', newPrefix));
      }
   }
} 