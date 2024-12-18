import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type IPluginSettings } from './core/types/settings';
import { getTranslation } from './i18n/translations';
import { MediaFlowzSettingsTab } from './ui/SettingsTab';
import { EventBusService } from './core/services/EventBusService';
import { CloudinaryService } from './core/services/CloudinaryService';
import { EditorService } from './core/services/EditorService';
import { EventName } from './core/types/events';
import { EditorView } from '@codemirror/view'
import { FileNameService } from './core/services/FileNameService';
import { registerStyles, unregisterStyles } from './styles';
import { showNotice, NOTICE_DURATIONS } from './utils/notifications';

export default class MediaFlowz extends Plugin {
   settings!: IPluginSettings;
   private eventBus: EventBusService;
   private cloudinaryService: CloudinaryService;
   private editorService: EditorService;
   private fileNameService: FileNameService;

   async onload() {
      await this.loadSettings();
      this.eventBus = EventBusService.getInstance();
      this.cloudinaryService = CloudinaryService.getInstance();
      this.editorService = EditorService.getInstance();
      this.fileNameService = FileNameService.getInstance();

      // Enregistrer les styles
      registerStyles();

      // Add settings tab
      this.addSettingTab(new MediaFlowzSettingsTab(this.app, this));

      // Écouter les événements de média pour les notifications
      this.eventBus.on(EventName.MEDIA_PASTED, () => {
         showNotice(getTranslation('notices.mediaPasted'), NOTICE_DURATIONS.MEDIUM);
      });

      this.eventBus.on(EventName.MEDIA_UPLOADED, ({ fileName }) => {
         showNotice(
            getTranslation('notices.mediaUploaded').replace('{fileName}', fileName),
            NOTICE_DURATIONS.UPLOAD
         );
      });

      this.eventBus.on(EventName.MEDIA_UPLOAD_ERROR, ({ error, fileName }) => {
         showNotice(
            getTranslation('notices.mediaUploadError')
               .replace('{fileName}', fileName)
               .replace('{error}', error.message),
            NOTICE_DURATIONS.ERROR
         );
      });

      this.eventBus.on(EventName.EDITOR_MEDIA_INSERTED, ({ fileName }) => {
         showNotice(
            getTranslation('notices.mediaInserted').replace('{fileName}', fileName),
            NOTICE_DURATIONS.UPLOAD
         );
      });

      // Register event for paste handling
      this.registerEvent(
         this.app.workspace.on('editor-paste', async (evt: ClipboardEvent) => {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) return;

            const files = evt.clipboardData?.files;
            if (files?.length) {
               const prefix = await this.fileNameService.getFilePrefix(activeFile, this.app);
               
               const mediaFiles = Array.from(files).filter(file => 
                  file.type.startsWith('image/') || 
                  file.type.startsWith('video/') ||
                  file.type.startsWith('audio/')
               ).map(file => this.fileNameService.createFileWithNewName(
                  file,
                  this.fileNameService.generateFileName(file, prefix)
               ));

               if (mediaFiles.length) {
                  evt.preventDefault();
                  this.eventBus.emit(EventName.MEDIA_PASTED, { files: mediaFiles });
                  return;
               }
            }

            // 2. Gérer le paste d'images depuis une URL
            const text = evt.clipboardData?.getData('text');
            if (text) {
               const imageUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i;
               if (imageUrlRegex.test(text)) {
                  evt.preventDefault();
                  this.eventBus.emit(EventName.MEDIA_URL_PASTED, { url: text });
                  return;
               }
            }

            // 3. Gérer le paste d'images depuis un glisser-déposer
            if (evt.dataTransfer?.items) {
               const items = Array.from(evt.dataTransfer.items);
               const mediaItems = items.filter(item => 
                  item.kind === 'file' && 
                  (item.type.startsWith('image/') || 
                   item.type.startsWith('video/') ||
                   item.type.startsWith('audio/'))
               );

               if (mediaItems.length) {
                  evt.preventDefault();
                  const activeFile = this.app.workspace.getActiveFile();
                  if (!activeFile) return;

                  const prefix = await this.fileNameService.getFilePrefix(activeFile, this.app);
                  const files = mediaItems
                     .map(item => item.getAsFile())
                     .filter(Boolean)
                     .map(file => this.fileNameService.createFileWithNewName(
                        file as File,
                        this.fileNameService.generateFileName(file as File, prefix)
                     ));

                  this.eventBus.emit(EventName.MEDIA_DROPPED, { files });
                  return;
               }
            }
         })
      );

      this.registerEditorExtension(EditorView.domEventHandlers({
         paste: (event, view) => {
            // Vérifier si le contenu collé vient de notre application
            const metadata = event.clipboardData?.getData('application/obsidian-media');
            if (metadata) {
               const data = JSON.parse(metadata);
               // Traitement spécial pour notre contenu
               this.eventBus.emit(EventName.MEDIA_PASTED_INTERNAL, { data });
               event.preventDefault();
               return;
            }
         }
      }))
   }

   onunload() {
      // Supprimer les styles
      unregisterStyles();
   }

   async loadSettings() {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
      this.eventBus?.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
   }

   async saveSettings() {
      await this.saveData(this.settings);
      this.eventBus.emit(EventName.SETTINGS_SAVED, { settings: this.settings });
      showNotice(getTranslation('notices.settingsSaved'), NOTICE_DURATIONS.MEDIUM);
   }
} 