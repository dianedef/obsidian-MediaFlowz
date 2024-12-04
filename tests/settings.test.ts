import { describe, it, expect, beforeEach, vi } from 'vitest';
import MediaFlowz from '../src/main';
import { App, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from '../src/core/types/settings';
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
            containerEl: document.createElement('div')
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
        PluginSettingTab: vi.fn()
    };
});

describe('MediaFlowz Plugin', () => {
    let app: App;
    let plugin: MediaFlowz;
    let pasteCallback: Function;

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();

        // Setup app and plugin
        app = new App();
        plugin = new MediaFlowz(app, manifest);

        // Initialize plugin
        await plugin.onload();

        // Get the paste callback
        const workspaceOnMock = vi.mocked(app.workspace.on);
        const onCall = workspaceOnMock.mock.calls.find(call => call[0] === 'editor-paste');
        pasteCallback = onCall?.[1];
        expect(pasteCallback).toBeDefined();
    });

    describe('Settings Management', () => {
        it('should initialize with default settings', async () => {
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should save settings correctly', async () => {
            const newSettings = {
                ...DEFAULT_SETTINGS,
                apiKey: 'test-key',
                cloudName: 'test-cloud'
            };
            plugin.settings = newSettings;
            await plugin.saveSettings();
            
            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
        });
    });

    describe('Translation System', () => {
        it('should return correct translation for existing key', () => {
            plugin.settings = { ...DEFAULT_SETTINGS, language: 'fr' };
            const translation = plugin.getTranslation('notices.mediaPasted');
            expect(translation).not.toBe('notices.mediaPasted');
            expect(typeof translation).toBe('string');
        });

        it('should return key for non-existing translation', () => {
            plugin.settings = { ...DEFAULT_SETTINGS, language: 'fr' };
            const nonExistingKey = 'nonexistent.key';
            const translation = plugin.getTranslation(nonExistingKey);
            expect(translation).toBe(nonExistingKey);
        });
    });

    describe('Event Handling', () => {
        it('should handle media paste events', async () => {
            // Create a mock file
            const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
            
            // Create a FileList-like object
            const mockFileList = {
                0: mockFile,
                length: 1,
                item: (index: number) => index === 0 ? mockFile : null,
                [Symbol.iterator]: function* () {
                    yield mockFile;
                }
            };

            // Create the clipboard event
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });

            // Mock the files property
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: mockFileList,
                configurable: true
            });

            // Call the paste callback directly
            await pasteCallback(mockClipboardEvent);

            // Verify that Notice was called
            expect(vi.mocked(Notice)).toHaveBeenCalled();
        });

        it('should not handle non-media paste events', async () => {
            // Create a mock file
            const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
            
            // Create a FileList-like object
            const mockFileList = {
                0: mockFile,
                length: 1,
                item: (index: number) => index === 0 ? mockFile : null,
                [Symbol.iterator]: function* () {
                    yield mockFile;
                }
            };

            // Create the clipboard event
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });

            // Mock the files property
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: mockFileList,
                configurable: true
            });

            // Call the paste callback directly
            await pasteCallback(mockClipboardEvent);

            // Verify that Notice was not called
            expect(vi.mocked(Notice)).not.toHaveBeenCalled();
        });
    });
}); 