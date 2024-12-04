import { beforeEach } from 'vitest';
import { vi } from 'vitest';

// Mock des fonctionnalités d'Obsidian
vi.mock('obsidian', () => {
    const mockApp = {
        workspace: {
            on: vi.fn(),
            trigger: vi.fn(),
            activeLeaf: null,
            leftSplit: null,
            rightSplit: null,
            rootSplit: null,
            floatingSplit: null,
            containerEl: document.createElement('div')
        }
    };

    class MockPlugin {
        app: any;
        manifest: any;
        loadData: () => Promise<any>;
        saveData: (data: any) => Promise<void>;

        constructor(app: any, manifest: any) {
            this.app = app;
            this.manifest = manifest;
            this.loadData = vi.fn().mockResolvedValue({});
            this.saveData = vi.fn().mockResolvedValue(undefined);
        }
    }

    return {
        App: vi.fn(() => mockApp),
        Plugin: MockPlugin,
        PluginSettingTab: vi.fn(),
        Setting: vi.fn(() => ({
            setName: vi.fn().mockReturnThis(),
            setDesc: vi.fn().mockReturnThis(),
            addText: vi.fn().mockReturnThis()
        })),
        Notice: vi.fn()
    };
});

// Mock des classes du DOM
class MockDataTransfer implements DataTransfer {
    dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none';
    effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized' = 'none';
    items: DataTransferItemList = {
        add: vi.fn(),
        clear: vi.fn(),
        remove: vi.fn(),
        length: 0,
        [Symbol.iterator]: function* () { yield* []; }
    } as any;
    types: string[] = [];
    files: FileList = { length: 0, item: () => null } as any;

    clearData(): void {}
    getData(): string { return ''; }
    setData(): boolean { return false; }
    setDragImage(): void {}
}

class MockFile implements File {
    lastModified: number = Date.now();
    name: string;
    size: number = 0;
    type: string;
    webkitRelativePath: string = '';

    constructor(bits: BlobPart[], fileName: string, options?: FilePropertyBag) {
        this.name = fileName;
        this.type = options?.type || 'application/octet-stream';
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(0));
    }

    slice(): Blob {
        return new Blob();
    }

    stream(): ReadableStream {
        return new ReadableStream();
    }

    text(): Promise<string> {
        return Promise.resolve('');
    }
}

// Mock de ClipboardEvent
function createMockClipboardEvent() {
    const MockClipboardEventClass = function(type: string, eventInitDict?: ClipboardEventInit) {
        const event = new Event(type, eventInitDict);
        Object.defineProperty(event, 'clipboardData', {
            value: eventInitDict?.clipboardData || null,
            writable: false
        });
        return event;
    } as any;

    // Définir les propriétés statiques
    MockClipboardEventClass.NONE = 0;
    MockClipboardEventClass.CAPTURING_PHASE = 1;
    MockClipboardEventClass.AT_TARGET = 2;
    MockClipboardEventClass.BUBBLING_PHASE = 3;

    return MockClipboardEventClass;
}

const MockClipboardEvent = vi.fn(createMockClipboardEvent());

// Remplacer les constructeurs globaux
vi.stubGlobal('DataTransfer', MockDataTransfer);
vi.stubGlobal('File', MockFile);
vi.stubGlobal('ClipboardEvent', MockClipboardEvent);

// Configuration globale pour Vitest
beforeEach(() => {
    vi.clearAllMocks();
}); 