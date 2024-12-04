import { DEFAULT_SETTINGS, type IPluginSettings } from '../types/settings';

export class SettingsService {
    private settings: IPluginSettings;

    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
    }

    getSettings(): IPluginSettings {
        return { ...this.settings };
    }

    async updateSettings(newSettings: Partial<IPluginSettings>): Promise<void> {
        this.settings = {
            ...this.settings,
            ...newSettings
        };
    }
} 