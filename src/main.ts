import { Plugin, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, type IPluginSettings } from './core/types/settings';
import { translations } from './i18n/translations';
import { CloudinarySettingTab } from './ui/SettingsTab';

export default class MediaFlowz extends Plugin {
   settings!: IPluginSettings;

   async onload() {
      await this.loadSettings();

      // Add settings tab
      this.addSettingTab(new CloudinarySettingTab(this.app, this));

      // Register event for paste handling
      this.registerEvent(
         this.app.workspace.on('editor-paste', async (evt: ClipboardEvent) => {
               const files = evt.clipboardData?.files;
               if (!files?.length) return;

               // For now, just show a notice when media is pasted
               const isMedia = Array.from(files).some(file => 
                  file.type.startsWith('image/') || file.type.startsWith('video/')
               );

               if (isMedia) {
                  new Notice(this.getTranslation('notices.mediaPasted'));
               }
         })
      );
   }

   async loadSettings() {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
   }

   async saveSettings() {
      await this.saveData(this.settings);
   }

   getTranslation(key: string): string {
      const lang = this.settings.language;
      return this.getNestedTranslation(translations[lang], key);
   }

   private getNestedTranslation(obj: any, path: string): string {
      return path.split('.').reduce((acc, part) => acc?.[part], obj) || path;
   }
} 