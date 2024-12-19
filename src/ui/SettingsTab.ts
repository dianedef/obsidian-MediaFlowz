import { App, PluginSettingTab, Setting } from 'obsidian';
import MediaFlowzPlugin from '../main';
import { getTranslation } from '../i18n/translations';
import { SupportedService } from '../core/types/settings';
import { EventBusService } from '../core/services/EventBusService';
import { EventName } from '../core/types/events';
import { SettingsService } from '../core/services/SettingsService';
import { showNotice, NOTICE_DURATIONS } from '../utils/notifications';

export class MediaFlowzSettingsTab extends PluginSettingTab {
    plugin: MediaFlowzPlugin;
    private eventBus: EventBusService;
    private settingsService: SettingsService;

    constructor(app: App, plugin: MediaFlowzPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.eventBus = EventBusService.getInstance();
        this.settingsService = SettingsService.getInstance();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Titre principal
        const titleText = this.plugin.settings.service 
            ? `${getTranslation('settings.title')} - ${this.plugin.settings.service.charAt(0).toUpperCase() + this.plugin.settings.service.slice(1)}`
            : getTranslation('settings.title');
        containerEl.createEl('h2', { text: titleText });

        // Section de sélection du service
        const serviceSection = containerEl.createDiv('service-section');
        serviceSection.createEl('h3', { text: getTranslation('settings.service') });

        new Setting(serviceSection)
            .setName(getTranslation('settings.service'))
            .setDesc(getTranslation('settings.serviceDesc'))
            .addDropdown(dropdown => {
                // Ajouter une option vide
                dropdown.addOption('', getTranslation('settings.selectService'));
                dropdown.addOption('cloudinary', 'Cloudinary');
                dropdown.addOption('twicpics', 'TwicPics');
                dropdown.addOption('cloudflare', 'Cloudflare');
                
                // Définir la valeur actuelle
                dropdown.setValue(this.plugin.settings.service || '');
                
                // Gérer le changement
                dropdown.onChange(async (value) => {
                    if (!value) {
                        // Si aucun service n'est sélectionné, réinitialiser les paramètres
                        await this.updateSettings({
                            service: undefined,
                            cloudinary: undefined,
                            twicpics: undefined,
                            cloudflare: undefined
                        });
                        this.display();
                        return;
                    }

                    const settingsSection = containerEl.querySelector('.service-settings-section');
                    if (settingsSection) {
                        settingsSection.addClass('fade-out');
                    }

                    try {
                        // Créer un nouvel objet de paramètres avec le service sélectionné
                        const newSettings = {
                            ...this.plugin.settings,
                            service: value as SupportedService
                        };

                        console.log('Updating settings with:', newSettings);

                        // Mettre à jour les paramètres
                        await this.updateSettings(newSettings);
                        
                        // Recharger l'interface
                        this.display();

                        // Notification
                        showNotice(
                            getTranslation('notices.serviceChanged')
                                .replace('{service}', value.charAt(0).toUpperCase() + value.slice(1)),
                            NOTICE_DURATIONS.MEDIUM
                        );

                        // Animation de fade-in
                        const newSettingsSection = containerEl.querySelector('.service-settings-section');
                        if (newSettingsSection) {
                            newSettingsSection.addClass('fade-in');
                        }
                    } catch (error) {
                        showNotice(
                            error instanceof Error ? error.message : 'Erreur lors du changement de service',
                            NOTICE_DURATIONS.LONG
                        );
                    }
                });
            });

        // Section des paramètres spécifiques au service
        if (this.plugin.settings.service) {
            const serviceSettingsSection = containerEl.createDiv('service-settings-section');

            // Afficher les paramètres selon le service sélectionné
            switch (this.plugin.settings.service) {
                case SupportedService.CLOUDINARY:
                    this.displayCloudinarySettings(serviceSettingsSection);
                    break;
                case SupportedService.TWICPICS:
                    this.displayTwicPicsSettings(serviceSettingsSection);
                    break;
                case SupportedService.CLOUDFLARE:
                    this.displayCloudflareSettings(serviceSettingsSection);
                    break;
            }
        }

        // Section des dossiers ignorés
        const ignoredFoldersSection = containerEl.createDiv('ignored-folders-section');
        ignoredFoldersSection.createEl('h3', { text: getTranslation('settings.ignoredFolders.title') });

        const ignoredFoldersList = ignoredFoldersSection.createEl('div', { cls: 'ignored-folders-list' });

        // Afficher la liste des dossiers ignorés
        this.plugin.settings.ignoredFolders.forEach((folder, index) => {
            const folderDiv = ignoredFoldersList.createEl('div', { cls: 'ignored-folder-item' });
            
            new Setting(folderDiv)
                .setName(folder)
                .addButton(button => button
                    .setIcon('trash')
                    .setTooltip(getTranslation('settings.ignoredFolders.remove'))
                    .onClick(async () => {
                        const newIgnoredFolders = [...this.plugin.settings.ignoredFolders];
                        newIgnoredFolders.splice(index, 1);
                        await this.updateSettings({
                            ignoredFolders: newIgnoredFolders
                        });
                        this.display();
                    }));
        });

        // Bouton pour ajouter un nouveau dossier
        new Setting(ignoredFoldersSection)
            .setName(getTranslation('settings.ignoredFolders.add'))
            .setDesc(getTranslation('settings.ignoredFolders.addDesc'))
            .addText(text => text
                .setPlaceholder(getTranslation('settings.ignoredFolders.placeholder'))
                .onChange(() => {
                    // Ne rien faire pendant la saisie
                })
                .then(textComponent => {
                    // Ajouter un gestionnaire d'événement pour la touche Entrée
                    const inputEl = textComponent.inputEl;
                    inputEl.addEventListener('keydown', async (e) => {
                        if (e.key === 'Enter') {
                            const value = inputEl.value;
                            if (value && !this.plugin.settings.ignoredFolders.includes(value)) {
                                const newIgnoredFolders = [...this.plugin.settings.ignoredFolders, value];
                                await this.updateSettings({
                                    ignoredFolders: newIgnoredFolders
                                });
                                this.display();
                                inputEl.value = '';
                            }
                        }
                    });
                }));
    }

    private async updateSettings(newSettings: Partial<typeof this.plugin.settings>): Promise<void> {
        try {
            // Ne garder que les paramètres du service actif
            const service = newSettings.service || this.plugin.settings.service;
            const mergedSettings = {
                ...this.plugin.settings,  // Garder les paramètres existants
                ...newSettings  // Appliquer les nouveaux paramètres
            };

            // Sauvegarder les paramètres sur le disque
            await this.plugin.saveData(mergedSettings);

            // Mettre à jour les paramètres du plugin
            this.plugin.settings = mergedSettings;

            console.log('Settings saved:', mergedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            showNotice(
                error instanceof Error ? error.message : 'Erreur de configuration',
                NOTICE_DURATIONS.LONG
            );
        }
    }

    private displayCloudinarySettings(containerEl: HTMLElement): void {
        const titleKey = 'settings.cloudinary.title';
        const descKey = 'settings.cloudinary.description';

        containerEl.createEl('h3', { text: getTranslation(titleKey) });
        containerEl.createEl('p', { 
            text: getTranslation(descKey),
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName(getTranslation('settings.cloudinary.cloudName'))
            .setDesc(getTranslation('settings.cloudinary.cloudNameDesc'))
            .addText(text => text
                .setPlaceholder('my-cloud')
                .setValue(this.plugin.settings.cloudinary?.cloudName ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudinary: {
                            ...this.plugin.settings.cloudinary,
                            cloudName: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiKey'))
            .setDesc(getTranslation('settings.apiKeyDesc'))
            .addText(text => text
                .setPlaceholder('123456789012345')
                .setValue(this.plugin.settings.cloudinary?.apiKey ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudinary: {
                            ...this.plugin.settings.cloudinary,
                            apiKey: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiSecret'))
            .setDesc(getTranslation('settings.apiSecretDesc'))
            .addText(text => text
                .setPlaceholder('abcdefghijklmnopqrstuvwxyz123456')
                .setValue(this.plugin.settings.cloudinary?.apiSecret ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudinary: {
                            ...this.plugin.settings.cloudinary,
                            apiSecret: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.cloudinary.uploadPreset'))
            .setDesc(getTranslation('settings.cloudinary.uploadPresetDesc'))
            .addText(text => text
                .setPlaceholder('my-preset')
                .setValue(this.plugin.settings.cloudinary?.uploadPreset ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudinary: {
                            ...this.plugin.settings.cloudinary,
                            uploadPreset: value || undefined
                        }
                    });
                }));
    }

    private displayTwicPicsSettings(containerEl: HTMLElement): void {
        const titleKey = 'settings.twicpics.title';
        const descKey = 'settings.twicpics.description';

        containerEl.createEl('h3', { text: getTranslation(titleKey) });
        containerEl.createEl('p', { 
            text: getTranslation(descKey),
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.domain'))
            .setDesc(getTranslation('settings.twicpics.domainDesc'))
            .addText(text => text
                .setPlaceholder('your-workspace.twicpics.com')
                .setValue(this.plugin.settings.twicpics?.domain ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        twicpics: {
                            ...this.plugin.settings.twicpics,
                            domain: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.apiKey'))
            .setDesc(getTranslation('settings.twicpics.apiKeyDesc'))
            .addText(text => text
                .setPlaceholder('your-api-key')
                .setValue(this.plugin.settings.twicpics?.apiKey ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        twicpics: {
                            ...this.plugin.settings.twicpics,
                            apiKey: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.path'))
            .setDesc(getTranslation('settings.twicpics.pathDesc'))
            .addText(text => text
                .setPlaceholder('/obsidian')
                .setValue(this.plugin.settings.twicpics?.path ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        twicpics: {
                            ...this.plugin.settings.twicpics,
                            path: value
                        }
                    });
                }));
    }

    private displayCloudflareSettings(containerEl: HTMLElement): void {
        console.log('DisplayingCloudflare settings');
        const titleKey = 'settings.cloudflare.title';
        const descKey = 'settings.cloudflare.description';

        containerEl.createEl('h3', { text: getTranslation(titleKey) });
        containerEl.createEl('p', { 
            text: getTranslation(descKey),
            cls: 'setting-item-description'
        });

        // Account ID
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.accountId'))
            .setDesc(getTranslation('settings.cloudflare.accountIdDesc'))
            .addText(text => text
                .setPlaceholder('Ex: 1a2b3c4d5e6f7g8h9i0j')
                .setValue(this.plugin.settings.cloudflare?.accountId ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudflare: {
                            ...this.plugin.settings.cloudflare,
                            accountId: value
                        }
                    });
                }));

        // Hash de livraison
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.deliveryHash'))
            .setDesc(getTranslation('settings.cloudflare.deliveryHashDesc'))
            .addText(text => text
                .setPlaceholder('Ex: abcdef123456')
                .setValue(this.plugin.settings.cloudflare?.deliveryHash ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudflare: {
                            ...this.plugin.settings.cloudflare,
                            deliveryHash: value
                        }
                    });
                }));

        // API Token
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.token'))
            .setDesc(getTranslation('settings.cloudflare.tokenDesc'))
            .addText(text => text
                .setPlaceholder('Ex: XyZ_123-ABC...')
                .setValue(this.plugin.settings.cloudflare?.imagesToken ?? '')
                .onChange(async (value) => {
                    await this.updateSettings({
                        cloudflare: {
                            ...this.plugin.settings.cloudflare,
                            imagesToken: value,
                            streamToken: value
                        }
                    });
                }));
    }
} 