import { DEFAULT_SETTINGS, type IPluginSettings } from '../types/settings';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';

export class SettingsService {
    private static instance: SettingsService | undefined;
    private settings: IPluginSettings;
    private eventBus: EventBusService;
    private isEditing: boolean = false;

    private constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.eventBus = EventBusService.getInstance();
    }

    public static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    getSettings(): IPluginSettings {
        return { ...this.settings };
    }

    async updateSettings(newSettings: Partial<IPluginSettings>, validate: boolean = false): Promise<void> {
        // Fusionner les nouveaux paramètres avec les existants
        this.settings = {
            ...this.settings,
            ...newSettings,
            // Gérer spécifiquement les paramètres de Cloudflare
            cloudflare: {
                ...this.settings.cloudflare,
                ...(newSettings.cloudflare || {})
            }
        };

        // Ne valider que si demandé explicitement
        if (validate) {
            this.validateSettings();
        }

        // Notifier les autres services du changement
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }

    private validateSettings(): void {
        // Si on change juste de service, on ne valide pas les paramètres
        if (!this.settings[this.settings.service]) {
            return;
        }

        switch (this.settings.service) {
            case 'cloudinary':
                if (this.settings.cloudinary) {
                    const { cloudName, apiKey, apiSecret, uploadPreset } = this.settings.cloudinary;
                    if (cloudName && apiKey) {
                        if (!uploadPreset && !apiSecret) {
                            throw new Error('Cloudinary requiert soit un Upload Preset, soit une API Secret');
                        }
                    }
                }
                break;

            case 'twicpics':
                if (this.settings.twicpics) {
                    const { domain, apiKey } = this.settings.twicpics;
                    if (domain && !apiKey) {
                        throw new Error('TwicPics requiert une API Key');
                    }
                    if (!domain && apiKey) {
                        throw new Error('TwicPics requiert un domaine');
                    }
                }
                break;

            case 'cloudflare':
                if (this.settings.cloudflare) {
                    const { accountId, imagesToken } = this.settings.cloudflare;
                    // Ne valider que si les deux champs sont présents
                    if (accountId && imagesToken) {
                        // Tout est bon, les deux champs sont remplis
                        return;
                    }
                }
                break;

            default:
                throw new Error('Service non supporté');
        }
    }

    isConfigured(): boolean {
        if (!this.settings[this.settings.service]) {
            return false;
        }

        try {
            this.validateSettings();
            return true;
        } catch {
            return false;
        }
    }

    public static cleanup(): void {
        SettingsService.instance = undefined;
    }
} 