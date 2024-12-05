import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, Notice, Plugin } from 'obsidian';
import MediaFlowz from '../src/main';
import { DEFAULT_SETTINGS } from '../src/core/types/settings';
import { getTranslation } from '../src/i18n/translations';
import { EventBusService } from '../src/core/services/EventBusService';
import { EventName } from '../src/core/types/events';
import manifest from '../manifest.json';

// Mock CloudinarySettingTab
vi.mock('../src/ui/SettingsTab', () => ({
    CloudinarySettingTab: vi.fn().mockImplementation(function(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.display = vi.fn();
        return this;
    })
}));

// Mock Plugin
vi.mock('obsidian', () => {
    const mockApp = {
        workspace: {
            on: vi.fn((event, callback) => callback),
            trigger: vi.fn(),
            activeLeaf: null,
            leftSplit: null,
            rightSplit: null,
            rootSplit: null,
            floatingSplit: null,
            containerEl: document.createElement('div'),
            _events: {}
        }
    };

    const MockPlugin = vi.fn().mockImplementation(function(app, manifest) {
        this.app = app;
        this.manifest = manifest;
        this.loadData = vi.fn().mockResolvedValue({});
        this.saveData = vi.fn().mockResolvedValue(undefined);
        this.addSettingTab = vi.fn();
        this.registerEvent = vi.fn((cb) => {
            return { unsubscribe: vi.fn() };
        });
    });

    return {
        App: vi.fn(() => mockApp),
        Plugin: MockPlugin,
        Notice: vi.fn(),
        PluginSettingTab: vi.fn(),
        moment: {
            locale: () => 'fr'
        }
    };
});

// Mock EventBusService
vi.mock('../src/core/services/EventBusService', () => {
    const mockEventBus = {
        on: vi.fn(),
        emit: vi.fn(),
        getInstance: vi.fn()
    };
    return {
        EventBusService: {
            getInstance: () => mockEventBus
        }
    };
});

describe('MediaFlowz Plugin', () => {
    let app: App;
    let plugin: MediaFlowz;
    let eventBus: ReturnType<typeof EventBusService.getInstance>;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = new App();
        plugin = new MediaFlowz(app, manifest);
        eventBus = EventBusService.getInstance();
        await plugin.onload();
    });

    describe('Settings Management', () => {
        it('should load default settings', async () => {
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should save settings', async () => {
            const newSettings = { ...DEFAULT_SETTINGS, cloudName: 'test-cloud' };
            plugin.settings = newSettings;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
        });
    });

    describe('Translation System', () => {
        it('should return correct translation for existing key', () => {
            const translation = getTranslation('notices.mediaPasted');
            expect(translation).not.toBe('notices.mediaPasted');
            expect(typeof translation).toBe('string');
        });

        it('should return key for non-existing translation', () => {
            const nonExistingKey = 'nonexistent.key';
            const translation = getTranslation(nonExistingKey);
            expect(translation).toBe(nonExistingKey);
        });

        it('should handle nested translation keys correctly', () => {
            const translation = getTranslation('notices.mediaPasted');
            expect(translation).not.toBe('notices.mediaPasted');
            expect(typeof translation).toBe('string');
        });
    });

    describe('Event Handling', () => {
        let pasteCallback: (evt: ClipboardEvent) => void;

        beforeEach(() => {
            // @ts-ignore - Accès à la propriété privée pour les tests
            const events = app.workspace._events;
            const onCall = vi.mocked(app.workspace.on).mock.calls.find(call => call[0] === 'editor-paste');
            pasteCallback = onCall?.[1];
            expect(pasteCallback).toBeDefined();
        });

        it('should handle media paste events', async () => {
            const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).toHaveBeenCalledWith(
                EventName.MEDIA_PASTED,
                expect.objectContaining({
                    files: expect.any(Object)
                })
            );
        });

        it('should handle video paste events', async () => {
            const mockFile = new File([''], 'test.mp4', { type: 'video/mp4' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).toHaveBeenCalledWith(
                EventName.MEDIA_PASTED,
                expect.objectContaining({
                    files: expect.any(Object)
                })
            );
        });

        it('should not handle non-media paste events', async () => {
            const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).not.toHaveBeenCalled();
        });

        it('should handle multiple files in paste event', async () => {
            const mockFiles = [
                new File([''], 'test1.jpg', { type: 'image/jpeg' }),
                new File([''], 'test2.mp4', { type: 'video/mp4' })
            ];
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: mockFiles,
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).toHaveBeenCalledWith(
                EventName.MEDIA_PASTED,
                expect.objectContaining({
                    files: expect.any(Object)
                })
            );
        });
    });
}); 