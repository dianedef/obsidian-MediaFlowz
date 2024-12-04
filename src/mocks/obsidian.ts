import { vi } from 'vitest';

export class App {
    workspace = {
        on: vi.fn((name: string, callback: Function) => {
            // Stocker le callback pour pouvoir l'appeler via trigger
            this.workspace.trigger = vi.fn((eventName: string, ...args: any[]) => {
                if (eventName === name) {
                    return callback(...args);
                }
            });
            return callback;
        }),
        trigger: vi.fn(),
        activeLeaf: null,
        leftSplit: null,
        rightSplit: null,
        rootSplit: null,
        floatingSplit: null,
        containerEl: document.createElement('div')
    };
}

export class Plugin {
    app: App;
    manifest: any;

    constructor(app: App, manifest: any) {
        this.app = app;
        this.manifest = manifest;
    }

    // Méthodes de base de Plugin
    loadData = vi.fn().mockResolvedValue({});
    saveData = vi.fn().mockResolvedValue(undefined);
    addSettingTab = vi.fn();
    registerEvent = vi.fn();
    registerInterval = vi.fn();
    registerDomEvent = vi.fn();
    registerMarkdownPostProcessor = vi.fn();
    registerMarkdownCodeBlockProcessor = vi.fn();
    registerCodeMirror = vi.fn();
    registerEditorExtension = vi.fn();
    registerExtensions = vi.fn();
    registerView = vi.fn();
    registerViewType = vi.fn();
    registerObsidianProtocolHandler = vi.fn();
    registerRibbonExtension = vi.fn();
    registerGlobalCommand = vi.fn();
    registerFileExplorer = vi.fn();
    registerFileMenu = vi.fn();
    registerFilesystem = vi.fn();
    registerSearch = vi.fn();
    registerHoverLinkSource = vi.fn();
    registerWorkspaceDropHandler = vi.fn();
}

export class PluginSettingTab {
    app: App;
    plugin: Plugin;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }
}

export class Setting {
    constructor(containerEl: HTMLElement) {}

    setName(name: string): this {
        return this;
    }

    setDesc(desc: string): this {
        return this;
    }

    addText(cb: (text: any) => any): this {
        return this;
    }
}

export class Notice {
    constructor(message: string) {}
} 