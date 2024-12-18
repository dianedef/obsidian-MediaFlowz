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
        await this.loadSettings();
        
        this.eventBus = EventBusService.getInstance();
        this.editorService = EditorService.getInstance();
        this.fileNameService = FileNameService.getInstance();
        
        this.mediaUploadService = MediaUploadServiceFactory.getService(this.settings);

        this.eventBus.on(EventName.SETTINGS_UPDATED, ({ settings }) => {
            this.mediaUploadService = MediaUploadServiceFactory.getService(settings);
        });

        registerStyles();

        this.addSettingTab(new MediaFlowzSettingsTab(this.app, this));

        this.eventBus.on(EventName.MEDIA_PASTED, () => {
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
                    const prefix = await this.fileNameService.getFilePrefix(activeFile);
                    
                    const mediaFiles = Array.from(files).filter(file => 
                        file.type.startsWith('image/') || 
                        file.type.startsWith('video/') ||
                        file.type.startsWith('audio/')
                    ).map(file => this.fileNameService.createFileWithNewName(
                        file,
                        this.fileNameService.generateFileName(file, prefix)
                    ));

                    if (mediaFiles.length) {
                        evt.preventDefault();
                        const dataTransfer = new DataTransfer();
                        mediaFiles.forEach(file => dataTransfer.items.add(file));
                        this.eventBus.emit(EventName.MEDIA_PASTED, { files: dataTransfer.files });
                        return;
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

                        const dataTransfer = new DataTransfer();
                        files.forEach(file => dataTransfer.items.add(file));
                        this.eventBus.emit(EventName.MEDIA_DROPPED, { files: dataTransfer.files });
                        return;
                    }
                }
            })
        );

        this.registerEditorExtension(EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                this.editorService.handleDocumentChange();
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
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
} 