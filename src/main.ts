import { Plugin, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, type IPluginSettings } from './core/types/settings';
import { getTranslation } from './i18n/translations';
import { CloudinarySettingTab } from './ui/SettingsTab';
import { EventBusService } from './core/services/EventBusService';
import { CloudinaryService } from './core/services/CloudinaryService';
import { EditorService } from './core/services/EditorService';
import { EventName } from './core/types/events';

export default class MediaFlowz extends Plugin {
   settings!: IPluginSettings;
   private eventBus: EventBusService;
   private cloudinaryService: CloudinaryService;
   private editorService: EditorService;

   async onload() {
      await this.loadSettings();
      this.eventBus = EventBusService.getInstance();
      this.cloudinaryService = CloudinaryService.getInstance();
      this.editorService = EditorService.getInstance();

      // Add settings tab
      this.addSettingTab(new CloudinarySettingTab(this.app, this));

      // Écouter les événements de média pour les notifications
      this.eventBus.on(EventName.MEDIA_PASTED, () => {
         new Notice(getTranslation('notices.mediaPasted'));
      });

      this.eventBus.on(EventName.MEDIA_UPLOADED, ({ fileName }) => {
         new Notice(getTranslation('notices.mediaUploaded').replace('{fileName}', fileName));
      });

      this.eventBus.on(EventName.MEDIA_UPLOAD_ERROR, ({ error, fileName }) => {
         new Notice(getTranslation('notices.mediaUploadError')
            .replace('{fileName}', fileName)
            .replace('{error}', error.message)
         );
      });

      this.eventBus.on(EventName.EDITOR_MEDIA_INSERTED, ({ fileName }) => {
         new Notice(getTranslation('notices.mediaInserted').replace('{fileName}', fileName));
      });

      // Register event for paste handling
      this.registerEvent(
         this.app.workspace.on('editor-paste', async (evt: ClipboardEvent) => {
            const files = evt.clipboardData?.files;
            if (!files?.length) return;

            const isMedia = Array.from(files).some(file => 
               file.type.startsWith('image/') || file.type.startsWith('video/')
            );

            if (isMedia) {
               this.eventBus.emit(EventName.MEDIA_PASTED, { files });
            }
         })
      );
   }

   async loadSettings() {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
      // Émettre l'événement de mise à jour des settings
      this.eventBus?.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
   }

   async saveSettings() {
      await this.saveData(this.settings);
      this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
   }
} 