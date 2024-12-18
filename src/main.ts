import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type IPluginSettings } from './core/types/settings';
import { getTranslation } from './i18n/translations';
import { MediaFlowzSettingsTab } from './ui/SettingsTab';
import { EventBusService } from './core/services/EventBusService';
import { EditorService } from './core/services/EditorService';
import { EventName } from './core/types/events';
import { EditorView } from '@codemirror/view';
import { FileNameService } from './core/services/FileNameService';
import { registerStyles, unregisterStyles } from './styles';
import { showNotice, NOTICE_DURATIONS } from './utils/notifications';
import { MediaUploadServiceFactory } from './core/services/MediaUploadServiceFactory';
import { IMediaUploadService } from './core/services/interfaces/IMediaUploadService';

export default class MediaFlowzPlugin extends Plugin {
    settings: IPluginSettings;
    private eventBus: EventBusService;
    private editorService: EditorService;
    private fileNameService: FileNameService;
    private mediaUploadService: IMediaUploadService;

    async onload() {
        this.eventBus = EventBusService.getInstance();
        this.editorService = EditorService.getInstance();
        this.fileNameService = FileNameService.getInstance(this.app);
        
        await this.loadSettings();
        console.log('[MediaFlowz] Paramètres chargés:', this.settings);
        
        this.mediaUploadService = MediaUploadServiceFactory.getService(this.settings);
        console.log('[MediaFlowz] Service créé:', this.settings.service);
        
        this.setupEventListeners();
        
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
        
        registerStyles();
        this.addSettingTab(new MediaFlowzSettingsTab(this.app, this));
    }

    private setupEventListeners(): void {
        this.eventBus.on(EventName.SETTINGS_UPDATED, ({ settings }) => {
            console.log('[MediaFlowz] Mise à jour des paramètres:', settings);
            this.settings = settings;
            if (this.mediaUploadService) {
                this.mediaUploadService = MediaUploadServiceFactory.getService(settings);
                console.log('[MediaFlowz] Service mis à jour:', settings.service);
            }
        });

        this.eventBus.on(EventName.MEDIA_PASTED, ({ files }) => {
            console.log('[MediaFlowz] Média collé:', {
                count: files.length,
                files: Array.from(files).map(f => ({
                    name: f.name,
                    type: f.type,
                    size: f.size
                }))
            });
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

        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;

                const files = evt.clipboardData?.files;
                if (files?.length) {
                    console.log('[MediaFlowz] Fichiers détectés dans le presse-papier:', files.length);
                    const prefix = await this.fileNameService.getFilePrefix(activeFile);
                    
                    const mediaFiles = Array.from(files).filter(file => {
                        const isMedia = file.type.startsWith('image/') || 
                            file.type.startsWith('video/') ||
                            file.type.startsWith('audio/');
                        console.log(`[MediaFlowz] Vérification du fichier ${file.name}:`, {
                            type: file.type,
                            isMedia
                        });
                        return isMedia;
                    }).map(file => {
                        const newName = this.fileNameService.generateFileName(file, prefix);
                        console.log(`[MediaFlowz] Renommage du fichier ${file.name} en ${newName}`);
                        return this.fileNameService.createFileWithNewName(file, newName);
                    });

                    if (mediaFiles.length) {
                        console.log('[MediaFlowz] Fichiers médias trouvés:', mediaFiles.length);
                        evt.preventDefault();
                        mediaFiles.forEach(file => {
                            console.log(`[MediaFlowz] Traitement du fichier:`, {
                                name: file.name,
                                type: file.type,
                                size: file.size
                            });
                        });
                        this.eventBus.emit(EventName.MEDIA_PASTED, { files: mediaFiles });
                        return;
                    } else {
                        console.log('[MediaFlowz] Aucun fichier média trouvé dans le presse-papier');
                    }
                }

                const text = evt.clipboardData?.getData('text');
                if (text) {
                    const imageUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i;
                    if (imageUrlRegex.test(text)) {
                        evt.preventDefault();
                        this.eventBus.emit(EventName.MEDIA_URL_PASTED, { url: text });
                        return;
                    }
                }

                if (evt.clipboardData?.items) {
                    const items = Array.from(evt.clipboardData.items);
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

                        const prefix = await this.fileNameService.getFilePrefix(activeFile);
                        const files = mediaItems
                            .map(item => item.getAsFile())
                            .filter((file): file is File => file !== null)
                            .map(file => this.fileNameService.createFileWithNewName(
                                file,
                                this.fileNameService.generateFileName(file, prefix)
                            ));

                        console.log('[MediaFlowz] Fichiers médias trouvés depuis items:', files.length);
                        files.forEach(file => {
                            console.log(`[MediaFlowz] Traitement du fichier:`, {
                                name: file.name,
                                type: file.type,
                                size: file.size
                            });
                        });
                        
                        // Envoyer directement le tableau de fichiers
                        this.eventBus.emit(EventName.MEDIA_PASTED, { files });
                        return;
                    }
                }
            })
        );

        this.registerEditorExtension(EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                // Supprimé car la méthode n'existe pas
                // this.editorService.handleDocumentChange();
            }
        }));

        this.registerEditorExtension(EditorView.domEventHandlers({
            paste: (event: ClipboardEvent, view) => {
                const metadata = event.clipboardData?.getData('application/obsidian-media');
                if (metadata) {
                    const data = JSON.parse(metadata);
                    this.eventBus.emit(EventName.MEDIA_PASTED_INTERNAL, { data });
                    event.preventDefault();
                    return;
                }
            }
        }));
    }

    onunload() {
        unregisterStyles();
    }

    async loadSettings() {
        const savedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
        
        // S'assurer que le service est correctement défini
        if (!this.settings.service) {
            this.settings.service = DEFAULT_SETTINGS.service;
        }

        // Vérifier que les paramètres Cloudflare sont complets
        if (this.settings.service === 'cloudflare' && this.settings.cloudflare) {
            console.log('[MediaFlowz] Vérification des paramètres Cloudflare:', {
                accountId: this.settings.cloudflare.accountId,
                hasToken: !!this.settings.cloudflare.imagesToken
            });
        }

        console.log('[MediaFlowz] Paramètres chargés depuis le stockage:', {
            service: this.settings.service,
            hasCloudflareConfig: !!this.settings.cloudflare,
            cloudflareAccountId: this.settings.cloudflare?.accountId,
            hasCloudflareToken: !!this.settings.cloudflare?.imagesToken
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }
} 