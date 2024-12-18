import { TFile } from 'obsidian';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { Notice } from 'obsidian';
import { getTranslation } from '../../i18n/translations';

export class FileNameService {
   private static instance: FileNameService;
   private eventBus: EventBusService;

   private constructor() {
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

   static getInstance(): FileNameService {
      if (!FileNameService.instance) {
         FileNameService.instance = new FileNameService();
      }
      return FileNameService.instance;
   }

   private toKebabCase(str: string): string {
      return str
         .replace(/([a-z])([A-Z])/g, '$1-$2')
         .replace(/[\s_]+/g, '-')
         .replace(/[&]+/g, 'and')
         .replace(/[^a-zA-Z0-9-]/g, '')
         .toLowerCase();
   }

   async getFilePrefix(file: TFile, app: any): Promise<string> {
      // Essayer d'abord de récupérer depuis le frontmatter
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      
      if (frontmatter?.['img-prefix']) {
         return frontmatter['img-prefix'];
      }

      // Sinon utiliser le titre de la note en kebab-case
      const title = file.basename;
      return this.toKebabCase(title);
   }

   generateFileName(originalFile: File, prefix: string): string {
      const timestamp = new Date().getTime();
      const extension = originalFile.name.split('.').pop();
      return `${prefix}_${timestamp}.${extension}`;
   }

   createFileWithNewName(originalFile: File, newName?: string): File {
      const fileName = newName || this.generateFileName(originalFile);
      return new File([originalFile], fileName, {
         type: originalFile.type,
         lastModified: originalFile.lastModified
      });
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