import { App, PluginSettingTab, Setting } from 'obsidian';
import type MediaFlowz from '../main';

export class MediaFlowzSettingTab extends PluginSettingTab {
   plugin: MediaFlowz;

   constructor(app: App, plugin: MediaFlowz) {
      super(app, plugin);
      this.plugin = plugin;
   }

   display(): void {
      const { containerEl } = this;
      containerEl.empty();

      new Setting(containerEl)
         .setName(this.plugin.getTranslation('settings.apiKey'))
         .setDesc(this.plugin.getTranslation('settings.apiKeyDesc'))
         .addText(text => text
               .setPlaceholder('Enter your API key')
               .setValue(this.plugin.settings.apiKey)
               .onChange(async (value) => {
                  this.plugin.settings.apiKey = value;
                  await this.plugin.saveSettings();
               }));

      new Setting(containerEl)
         .setName(this.plugin.getTranslation('settings.apiSecret'))
         .setDesc(this.plugin.getTranslation('settings.apiSecretDesc'))
         .addText(text => text
               .setPlaceholder('Enter your API secret')
               .setValue(this.plugin.settings.apiSecret)
               .onChange(async (value) => {
                  this.plugin.settings.apiSecret = value;
                  await this.plugin.saveSettings();
               }));

      new Setting(containerEl)
         .setName(this.plugin.getTranslation('settings.cloudName'))
         .setDesc(this.plugin.getTranslation('settings.cloudNameDesc'))
         .addText(text => text
               .setPlaceholder('Enter your cloud name')
               .setValue(this.plugin.settings.cloudName)
               .onChange(async (value) => {
                  this.plugin.settings.cloudName = value;
                  await this.plugin.saveSettings();
               }));
   }
} 