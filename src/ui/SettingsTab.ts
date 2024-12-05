import { App, PluginSettingTab, Setting } from 'obsidian';
import type MediaFlowz from '../main';
import { getTranslation } from '../i18n/translations';

export class CloudinarySettingTab extends PluginSettingTab {
    plugin: MediaFlowz;

    constructor(app: App, plugin: MediaFlowz) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName(getTranslation('settings.cloudName'))
            .setDesc(getTranslation('settings.cloudNameDesc'))
            .addText(text => text
                .setPlaceholder('my-cloud')
                .setValue(this.plugin.settings.cloudName)
                .onChange(async (value) => {
                    this.plugin.settings.cloudName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiKey'))
            .setDesc(getTranslation('settings.apiKeyDesc'))
            .addText(text => text
                .setPlaceholder('123456789012345')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiSecret'))
            .setDesc(getTranslation('settings.apiSecretDesc'))
            .addText(text => text
                .setPlaceholder('abcdefghijklmnopqrstuvwxyz123456')
                .setValue(this.plugin.settings.apiSecret)
                .onChange(async (value) => {
                    this.plugin.settings.apiSecret = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.uploadPreset'))
            .setDesc(getTranslation('settings.uploadPresetDesc'))
            .addText(text => text
                .setPlaceholder('my-preset')
                .setValue(this.plugin.settings.uploadPreset || '')
                .onChange(async (value) => {
                    this.plugin.settings.uploadPreset = value || undefined;
                    await this.plugin.saveSettings();
                }));
    }
} 