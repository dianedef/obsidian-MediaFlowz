import { vi } from 'vitest';

export class App {
    workspace = {
        on: vi.fn(),
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
    loadData: () => Promise<any>;
    saveData: (data: any) => Promise<void>;

    constructor(app: App, manifest: any) {
        this.app = app;
        this.manifest = manifest;
        this.loadData = vi.fn().mockResolvedValue({});
        this.saveData = vi.fn().mockResolvedValue(undefined);
    }
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