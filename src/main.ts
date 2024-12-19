import { Plugin, MarkdownView, Editor } from 'obsidian';
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
import { CloudflareMediaService } from './core/services/CloudflareMediaService';

export default class MediaFlowzPlugin extends Plugin {
    settings: IPluginSettings;
    private eventBus: EventBusService;
    private editorService: EditorService;
    private fileNameService: FileNameService;
    private mediaUploadService: IMediaUploadService;
    private uploadLock = new Set<string>();
    private processingLock = {
        paste: false,
        upload: false
    };
    private timeouts = {
        paste: null as NodeJS.Timeout | null
    };
    private readonly TIMEOUTS = {
        PASTE: 1000
    };

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
            this.settings = settings;
            if (this.mediaUploadService) {
                this.mediaUploadService = MediaUploadServiceFactory.getService(settings);
            }
        });

        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
                if (this.processingLock.paste) {
                    console.log('⚠️ Un paste est déjà en cours, ignoré');
                    evt.preventDefault();
                    evt.stopPropagation();
                    return;
                }

                const files = evt.clipboardData?.files;
                if (!files?.length) return;

                try {
                    this.processingLock.paste = true;
                    if (this.timeouts.paste) {
                        clearTimeout(this.timeouts.paste);
                    }

                    // Empêcher le comportement par défaut d'Obsidian
                    evt.preventDefault();
                    evt.stopPropagation();

                    const activeFile = this.app.workspace.getActiveFile();
                    if (!activeFile) {
                        console.log('⚠️ Pas de fichier actif');
                        return;
                    }

                    console.log('📋 Fichiers détectés dans le presse-papier:', {
                        count: files.length,
                        types: Array.from(files).map(f => f.type)
                    });

                    const prefix = await this.fileNameService.getFilePrefix(activeFile);
                    console.log('📎 Préfixe pour les fichiers:', prefix);
                    
                    const mediaFiles = Array.from(files).filter(file => {
                        const isMedia = file.type.startsWith('image/') || 
                            file.type.startsWith('video/') ||
                            file.type.startsWith('audio/');
                        console.log(`🔍 Vérification du fichier ${file.name}:`, {
                            type: file.type,
                            isMedia
                        });
                        return isMedia;
                    });

                    if (mediaFiles.length) {
                        console.log('📤 Envoi des fichiers médias:', {
                            count: mediaFiles.length,
                            files: mediaFiles.map(f => ({
                                name: f.name,
                                type: f.type,
                                size: f.size
                            }))
                        });

                        // Insérer un placeholder unique à la position du curseur
                        const cursor = editor.getCursor();
                        const placeholderId = `upload-${Date.now()}`;
                        const placeholder = `![Uploading...${placeholderId}](...)\n`;
                        editor.replaceRange(placeholder, cursor);

                        // Upload immédiat sans passer par l'événement MEDIA_PASTED
                        for (const file of mediaFiles) {
                            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                            if (this.uploadLock.has(fileId)) {
                                console.log('⚠️ Upload déjà en cours pour:', fileId);
                                continue;
                            }

                            try {
                                this.uploadLock.add(fileId);
                                console.log('📤 Upload du fichier:', file.name);
                                
                                const newName = this.fileNameService.generateFileName(file, prefix);
                                const newFile = this.fileNameService.createFileWithNewName(file, newName);
                                
                                const response = await this.mediaUploadService.upload(newFile);
                                console.log('✅ Upload réussi:', response);

                                // Remplacer le placeholder directement
                                const content = editor.getValue();
                                const placeholderPattern = new RegExp(`!\\[Uploading\\.\\.\\.${placeholderId}\\]\\(\\.\\.\\.\\)\\n`);
                                const newContent = content.replace(placeholderPattern, `![](${response.url})\n`);
                                
                                if (content !== newContent) {
                                    editor.setValue(newContent);
                                    console.log('✅ Lien remplacé dans l\'éditeur');
                                    
                                    showNotice(
                                        getTranslation('notices.mediaUploaded').replace('{fileName}', newFile.name),
                                        NOTICE_DURATIONS.UPLOAD
                                    );
                                }
                            } catch (error) {
                                console.error('❌ Erreur lors de l\'upload:', error);
                                showNotice(
                                    getTranslation('notices.mediaUploadError')
                                        .replace('{fileName}', file.name)
                                        .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                                    NOTICE_DURATIONS.ERROR
                                );
                            } finally {
                                this.uploadLock.delete(fileId);
                            }
                        }
                    }
                } finally {
                    // Réinitialiser le verrou après un délai
                    this.timeouts.paste = setTimeout(() => {
                        this.processingLock.paste = false;
                        this.timeouts.paste = null;
                    }, this.TIMEOUTS.PASTE);
                }
            })
        );

        this.registerEditorExtension(EditorView.domEventHandlers({
            paste: (event: ClipboardEvent, view) => {
                const metadata = event.clipboardData?.getData('application/obsidian-media');
                if (metadata) {
                    event.preventDefault();
                    return;
                }
            }
        }));
    }

    onunload() {
        unregisterStyles();
        this.eventBus.off(EventName.SETTINGS_UPDATED, ({ settings }) => {
            this.settings = settings;
            if (this.mediaUploadService) {
                this.mediaUploadService = MediaUploadServiceFactory.getService(settings);
            }
        });
        
        if (this.mediaUploadService instanceof CloudflareMediaService) {
            CloudflareMediaService.cleanup();
        }

        Object.values(this.timeouts).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });

        this.processingLock.paste = false;
        this.processingLock.upload = false;
        this.uploadLock.clear();

        EventBusService.cleanup();
        EditorService.cleanup();
        FileNameService.cleanup();
    }

    async loadSettings() {
        const savedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
        
        // S'assurer que le service est défini
        if (!this.settings.service) {
            this.settings.service = DEFAULT_SETTINGS.service;
        }

        // S'assurer que la configuration Cloudflare existe
        if (this.settings.service === 'cloudflare' && !this.settings.cloudflare) {
            this.settings.cloudflare = DEFAULT_SETTINGS.cloudflare;
        }

        console.log('[MediaFlowz] Paramètres chargés:', {
            service: this.settings.service,
            hasCloudflareConfig: !!this.settings.cloudflare,
            cloudflareAccountId: this.settings.cloudflare?.accountId,
            hasCloudflareToken: !!this.settings.cloudflare?.imagesToken
        });

        // Émettre l'événement de mise à jour des paramètres
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }
} 