import { App, PluginSettingTab, Setting, Menu, TFolder } from 'obsidian';
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

        // Section des fonctionnalités
        containerEl.createEl('h3', { text: getTranslation('settings.features.title') });
        
        new Setting(containerEl)
            .setName(getTranslation('settings.features.imageToolbar.name'))
            .setDesc(getTranslation('settings.features.imageToolbar.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showImageToolbar)
                .onChange(async (value) => {
                    this.plugin.settings.showImageToolbar = value;
                    await this.plugin.saveSettings();
                })
            );

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
        this.displayIgnoredFoldersSection(containerEl);
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

    // Récupérer tous les dossiers du vault de manière hiérarchique
    private getAllFolders(): { [key: string]: TFolder } {
        const folderMap: { [key: string]: TFolder } = {};
        const vault = this.app.vault;
        
        // Fonction récursive pour parcourir les dossiers
        const traverse = (folder: TFolder) => {
            const path = folder.path;
            if (path !== '/') {
                folderMap[path] = folder;
            }
            
            folder.children
                .filter((child): child is TFolder => child instanceof TFolder)
                .forEach(traverse);
        };

        // Commencer la traversée depuis la racine
        traverse(vault.getRoot());
        return folderMap;
    }

    // Construire le menu hiérarchique des dossiers
    private buildFolderMenu(menu: Menu, folder: TFolder, level: number = 0) {
        const subFolders = folder.children.filter((child): child is TFolder => child instanceof TFolder);
        
        subFolders.forEach(subFolder => {
            const hasChildren = subFolder.children.some(child => child instanceof TFolder);
            
            if (hasChildren) {
                // Pour les dossiers avec des enfants, créer un sous-menu
                menu.addItem(item => {
                    const titleEl = createSpan({ cls: 'menu-item-title' });
                    titleEl.appendText(subFolder.name);
                    titleEl.appendChild(createSpan({ cls: 'menu-item-arrow', text: ' →' }));

                    item.dom.querySelector('.menu-item-title')?.replaceWith(titleEl);
                    item.setIcon('folder');

                    // Créer le sous-menu
                    const subMenu = new Menu();
                    this.buildFolderMenu(subMenu, subFolder, level + 1);

                    // Configurer l'événement de survol
                    const itemDom = (item as any).dom as HTMLElement;
                    if (itemDom) {
                        let isOverItem = false;
                        let isOverMenu = false;
                        let hideTimeout: NodeJS.Timeout;

                        const showSubMenu = () => {
                            const rect = itemDom.getBoundingClientRect();
                            subMenu.showAtPosition({
                                x: rect.right,
                                y: rect.top
                            });
                        };

                        const hideSubMenu = () => {
                            hideTimeout = setTimeout(() => {
                                if (!isOverItem && !isOverMenu) {
                                    subMenu.hide();
                                }
                            }, 100);
                        };

                        itemDom.addEventListener('mouseenter', () => {
                            isOverItem = true;
                            if (hideTimeout) clearTimeout(hideTimeout);
                            showSubMenu();
                        });

                        itemDom.addEventListener('mouseleave', () => {
                            isOverItem = false;
                            hideSubMenu();
                        });

                        // Gérer le survol du sous-menu lui-même
                        const subMenuEl = (subMenu as any).dom;
                        if (subMenuEl) {
                            subMenuEl.addEventListener('mouseenter', () => {
                                isOverMenu = true;
                                if (hideTimeout) clearTimeout(hideTimeout);
                            });

                            subMenuEl.addEventListener('mouseleave', () => {
                                isOverMenu = false;
                                hideSubMenu();
                            });
                        }
                    }

                    // Ajouter également un gestionnaire de clic pour le dossier parent
                    item.onClick(async () => {
                        if (!this.plugin.settings.ignoredFolders.includes(subFolder.path)) {
                            const newIgnoredFolders = [...this.plugin.settings.ignoredFolders, subFolder.path];
                            await this.updateSettings({
                                ignoredFolders: newIgnoredFolders
                            });
                            this.display();
                        }
                    });
                });
            } else {
                // Pour les dossiers sans enfants, ajouter simplement un élément de menu
                menu.addItem(item => {
                    item.setTitle(subFolder.name)
                        .setIcon('folder')
                        .onClick(async () => {
                            if (!this.plugin.settings.ignoredFolders.includes(subFolder.path)) {
                                const newIgnoredFolders = [...this.plugin.settings.ignoredFolders, subFolder.path];
                                await this.updateSettings({
                                    ignoredFolders: newIgnoredFolders
                                });
                                this.display();
                            }
                        });
                });
            }
        });
    }

    // Section des dossiers ignorés
    private displayIgnoredFoldersSection(containerEl: HTMLElement): void {
        const ignoredFoldersSection = containerEl.createDiv('ignored-folders-section');
        ignoredFoldersSection.createEl('h3', { text: getTranslation('settings.ignoredFolders.title') });

        // Liste des dossiers ignorés actuels
        const ignoredFoldersList = ignoredFoldersSection.createEl('div', { cls: 'ignored-folders-list' });
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
            .addButton(button => button
                .setButtonText(getTranslation('settings.ignoredFolders.select'))
                .onClick((e: MouseEvent) => {
                    // Créer le menu de sélection principal
                    const menu = new Menu();
                    
                    // Construire la hiérarchie des dossiers à partir de la racine
                    this.buildFolderMenu(menu, this.app.vault.getRoot());

                    // Afficher le menu à la position du clic
                    menu.showAtMouseEvent(e);
                }));
    }
} 