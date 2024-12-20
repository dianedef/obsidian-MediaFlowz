import { Plugin, MarkdownView, Editor, TFile, TAbstractFile, TFolder } from 'obsidian';
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
                const files = evt.clipboardData?.files;
                if (!files?.length) return;

                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    console.log('⚠️ Pas de fichier actif');
                    return;
                }

                // Vérifier si le fichier actif est dans un dossier ignoré
                const isIgnored = this.settings.ignoredFolders.some(folder => {
                    const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                    const normalizedPath = activeFile.path.replace(/\\/g, '/');
                    return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
                });

                if (isIgnored) {
                    console.log('📝 Note dans un dossier ignoré, comportement par défaut');
                    
                    // Si l'option est activée, créer un dossier pour la note
                    if (this.settings.ignoredFoldersSettings.useNoteFolders) {
                        // Empêcher le comportement par défaut immédiatement
                        evt.preventDefault();
                        evt.stopPropagation();

                        const notePath = activeFile.path;
                        const noteBasename = activeFile.basename;
                        const noteDirPath = notePath.substring(0, notePath.lastIndexOf('/'));
                        const assetsFolderPath = `${noteDirPath}/${noteBasename}`;

                        try {
                            // Vérifier si le dossier existe déjà
                            const folder = this.app.vault.getAbstractFileByPath(assetsFolderPath);
                            if (!folder) {
                                // Créer le dossier
                                await this.app.vault.createFolder(assetsFolderPath);
                                console.log('📁 Dossier créé pour la note:', assetsFolderPath);
                                showNotice(
                                    getTranslation('settings.ignoredFolders.useNoteFolders.created')
                                        .replace('{noteName}', noteBasename),
                                    NOTICE_DURATIONS.MEDIUM
                                );
                            }

                            // Gérer chaque fichier du presse-papier
                            for (const file of Array.from(files)) {
                                const fileName = this.fileNameService.generateFileName(file);
                                const filePath = `${assetsFolderPath}/${fileName}`;
                                
                                try {
                                    // Convertir le File en ArrayBuffer
                                    const buffer = await file.arrayBuffer();
                                    
                                    // Créer le fichier dans le bon dossier
                                    await this.app.vault.createBinary(filePath, buffer);
                                    console.log('✅ Fichier créé:', filePath);
                                    
                                    // Insérer le lien dans l'éditeur
                                    const cursor = editor.getCursor();
                                    const relativePath = this.app.metadataCache.getFirstLinkpathDest(fileName, activeFile.path)?.path || fileName;
                                    const markdownLink = `![[${relativePath}]]`;
                                    editor.replaceRange(markdownLink + '\n', cursor);
                                    
                                    showNotice(
                                        getTranslation('settings.ignoredFolders.fileCreated')
                                            .replace('{fileName}', fileName),
                                        NOTICE_DURATIONS.MEDIUM
                                    );
                                } catch (error) {
                                    console.error('❌ Erreur lors de la création du fichier:', error);
                                    showNotice(
                                        getTranslation('errors.fileCreationError')
                                            .replace('{fileName}', fileName)
                                            .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                                        NOTICE_DURATIONS.ERROR
                                    );
                                }
                            }
                        } catch (error) {
                            console.error('❌ Erreur lors de la gestion des fichiers:', error);
                            showNotice(
                                getTranslation('errors.unexpectedError'),
                                NOTICE_DURATIONS.ERROR
                            );
                        }
                        return;
                    }
                    
                    return; // Laisser Obsidian gérer le collage normalement si l'option n'est pas activée
                }

                try {
                    this.processingLock.paste = true;
                    if (this.timeouts.paste) {
                        clearTimeout(this.timeouts.paste);
                    }

                    // Empêcher le comportement par défaut d'Obsidian
                    evt.preventDefault();
                    evt.stopPropagation();

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

        // Ajouter l'écouteur pour le renommage des fichiers
        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
                if (!this.settings.ignoredFoldersSettings.useNoteFolders) return;
                
                // Vérifier si c'est une note markdown
                if (!(file instanceof TFile) || file.extension !== 'md') return;

                // Vérifier si la note est dans un dossier ignoré
                const isIgnored = this.settings.ignoredFolders.some(folder => {
                    const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                    const normalizedPath = file.path.replace(/\\/g, '/');
                    return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
                });

                if (!isIgnored) return;

                try {
                    // Construire les anciens et nouveaux chemins des dossiers
                    const oldDirPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                    const oldBasename = oldPath.substring(oldPath.lastIndexOf('/') + 1).replace('.md', '');
                    const oldFolderPath = `${oldDirPath}/${oldBasename}`;

                    const newDirPath = file.path.substring(0, file.path.lastIndexOf('/'));
                    const newBasename = file.basename;
                    const newFolderPath = `${newDirPath}/${newBasename}`;

                    // Vérifier si l'ancien dossier existe
                    const oldFolder = this.app.vault.getAbstractFileByPath(oldFolderPath);
                    if (!oldFolder || !(oldFolder instanceof TFolder)) return;

                    // Renommer le dossier
                    await this.app.vault.rename(oldFolder, newFolderPath);
                    console.log('📁 Dossier renommé:', {
                        de: oldFolderPath,
                        vers: newFolderPath
                    });

                    // Attendre un peu pour s'assurer que le système de fichiers est à jour
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Mettre à jour les liens dans toutes les notes
                    const files = this.app.vault.getMarkdownFiles();
                    console.log('📝 Analyse des fichiers markdown:', files.length);

                    const newFolder = this.app.vault.getAbstractFileByPath(newFolderPath);
                    if (!newFolder || !(newFolder instanceof TFolder)) {
                        console.error('❌ Nouveau dossier non trouvé:', newFolderPath);
                        return;
                    }

                    // Créer une map des fichiers dans le nouveau dossier
                    const fileMap = new Map();
                    newFolder.children.forEach(file => {
                        if (file instanceof TFile) {
                            fileMap.set(file.name, file);
                            fileMap.set(file.basename, file); // Ajouter aussi sans extension
                        }
                    });

                    console.log('📁 Fichiers dans le nouveau dossier:', Array.from(fileMap.keys()));

                    for (const noteFile of files) {
                        const cache = this.app.metadataCache.getFileCache(noteFile);
                        const embeds = cache?.embeds || [];
                        let hasChanges = false;
                        let content = await this.app.vault.read(noteFile);

                        console.log('🔍 Analyse des embeds dans:', noteFile.path, {
                            nombreEmbeds: embeds.length,
                            embeds: embeds.map(e => ({
                                link: e.link,
                                path: e.path,
                                source: e.source,
                                displayText: e.displayText,
                                position: e.position
                            }))
                        });

                        for (const embed of embeds) {
                            // Construire le chemin complet pour la comparaison
                            const embedPath = embed.link;
                            console.log('📝 Vérification du lien:', {
                                embedPath,
                                oldFolderPath,
                                oldBasename
                            });

                            // Vérifier si le lien est dans l'ancien dossier (plusieurs cas possibles)
                            const isInOldFolder = 
                                // Cas 1: Chemin complet (ex: RSS/ll/tb/image.png)
                                embedPath.includes(oldFolderPath) || 
                                embedPath.includes(`/${oldBasename}/`) ||
                                // Cas 2: Nom de fichier seul, mais le fichier est dans le dossier
                                fileMap.has(embedPath);

                            if (isInOldFolder) {
                                console.log('🎯 Lien trouvé dans l\'ancien dossier:', embedPath);
                                
                                let targetFile: TFile | null = null;

                                if (fileMap.has(embedPath)) {
                                    // Cas où on a juste le nom du fichier
                                    targetFile = fileMap.get(embedPath);
                                    console.log('📄 Fichier trouvé via nom:', embedPath);
                                } else {
                                    // Cas où on a le chemin complet
                                    const newPath = embedPath.replace(
                                        new RegExp(`(^|/)${oldBasename}/`),
                                        `$1${newBasename}/`
                                    );
                                    console.log('🔄 Nouveau chemin:', newPath);
                                    const file = this.app.vault.getAbstractFileByPath(newPath);
                                    if (file instanceof TFile) {
                                        targetFile = file;
                                        console.log('📄 Fichier trouvé via chemin:', newPath);
                                    }
                                }

                                if (targetFile) {
                                    const newLink = this.app.metadataCache.fileToLinktext(targetFile, noteFile.path, true);
                                    const oldPattern = `![[${embed.link}]]`;
                                    const newPattern = `![[${newLink}]]`;

                                    console.log('🔄 Remplacement:', {
                                        ancien: oldPattern,
                                        nouveau: newPattern,
                                        contientAncien: content.includes(oldPattern)
                                    });

                                    if (content.includes(oldPattern)) {
                                        content = content.replace(oldPattern, newPattern);
                                        hasChanges = true;
                                        console.log('✅ Lien mis à jour:', {
                                            de: embed.link,
                                            vers: newLink,
                                            dansLeFichier: noteFile.path
                                        });
                                    }
                                } else {
                                    console.log('❌ Fichier non trouvé');
                                }
                            }
                        }

                        if (hasChanges) {
                            await this.app.vault.modify(noteFile, content);
                            console.log('✅ Fichier mis à jour:', noteFile.path);
                        }
                    }

                    showNotice(
                        getTranslation('notices.folderRenamed')
                            .replace('{oldName}', oldBasename)
                            .replace('{newName}', newBasename),
                        NOTICE_DURATIONS.MEDIUM
                    );
                } catch (error) {
                    console.error('❌ Erreur lors du renommage du dossier:', error);
                    showNotice(
                        getTranslation('errors.folderRenameError')
                            .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                        NOTICE_DURATIONS.ERROR
                    );
                }
            })
        );
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