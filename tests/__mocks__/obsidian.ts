import { vi } from 'vitest';

export class App {
    vault = {
        getConfig: vi.fn(),
        setConfig: vi.fn(),
        configDir: '/test/vault/.obsidian',
        adapter: {
            exists: vi.fn(),
            read: vi.fn(),
            write: vi.fn(),
            mkdir: vi.fn(),
            remove: vi.fn()
        }
    };
    workspace = {
        getActiveViewOfType: vi.fn(),
        getActiveFile: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    };
}

export class Plugin {
    app: App;
    manifest: any;

    constructor(app: App, manifest: any) {
        this.app = app;
        this.manifest = manifest;
    }

    loadData = vi.fn().mockResolvedValue({});
    saveData = vi.fn().mockResolvedValue(undefined);
}

export class PluginSettingTab {
    app: App;
    containerEl: HTMLElement;

    constructor(app: App, containerEl: HTMLElement) {
        this.app = app;
        this.containerEl = containerEl;
    }

    display(): void {}
    hide(): void {}
}

export class Notice {
    constructor(message: string) {}
    setMessage(message: string): this { return this; }
    hide(): void {}
}

export class Setting {
    constructor(containerEl: HTMLElement) {}
    setName(name: string): this { return this; }
    setDesc(desc: string): this { return this; }
    addText(cb: (text: TextComponent) => any): this { return this; }
    addToggle(cb: (toggle: ToggleComponent) => any): this { return this; }
    addButton(cb: (button: ButtonComponent) => any): this { return this; }
}

export class TextComponent {
    constructor(containerEl: HTMLElement) {}
    setValue(value: string): this { return this; }
    getValue(): string { return ''; }
    onChange(callback: (value: string) => any): this { return this; }
}

export class ToggleComponent {
    constructor(containerEl: HTMLElement) {}
    setValue(value: boolean): this { return this; }
    getValue(): boolean { return false; }
    onChange(callback: (value: boolean) => any): this { return this; }
}

export class ButtonComponent {
    constructor(containerEl: HTMLElement) {}
    setButtonText(name: string): this { return this; }
    onClick(callback: () => any): this { return this; }
}

export const moment = {
    locale: vi.fn()
}; 