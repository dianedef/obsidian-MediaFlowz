import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorService } from '../../src/core/services/EditorService';
import { EventBusService } from '../../src/core/services/EventBusService';
import { EventName } from '../../src/core/types/events';
import { Editor } from 'obsidian';

describe('EditorService', () => {
    let editorService: EditorService;
    let eventBus: EventBusService;
    let mockEditor: Partial<Editor>;
    let mockWorkspace: any;

    beforeEach(() => {
        // Reset les singletons
        // @ts-ignore - Accès aux propriétés privées pour les tests
        EditorService.instance = undefined;
        // @ts-ignore
        EventBusService.instance = undefined;

        // Setup du mock editor
        mockEditor = {
            getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
            getLine: vi.fn(() => ''),
            replaceRange: vi.fn(),
            setCursor: vi.fn()
        };

        // Setup du mock workspace
        mockWorkspace = {
            activeLeaf: {
                view: {
                    editor: mockEditor
                }
            }
        };

        // Mock global app
        (global as any).app = {
            workspace: mockWorkspace
        };

        // Setup des services
        eventBus = EventBusService.getInstance();
        editorService = EditorService.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = EditorService.getInstance();
        const instance2 = EditorService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should handle image upload and insert markdown', () => {
        const mockInsertCallback = vi.fn();
        eventBus.on(EventName.EDITOR_MEDIA_INSERTED, mockInsertCallback);

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '![image.jpg](https://example.com/image.jpg)',
            expect.any(Object)
        );
        expect(mockInsertCallback).toHaveBeenCalled();
    });

    it('should handle video upload and insert HTML', () => {
        const mockInsertCallback = vi.fn();
        eventBus.on(EventName.EDITOR_MEDIA_INSERTED, mockInsertCallback);

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/video.mp4',
            fileName: 'video.mp4'
        });

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '<video src="https://example.com/video.mp4" controls title="video.mp4"></video>',
            expect.any(Object)
        );
        expect(mockInsertCallback).toHaveBeenCalled();
    });

    it('should handle cursor position correctly', () => {
        // Test milieu de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 5 }));
        mockEditor.getLine = vi.fn(() => 'Hello world');

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            ' ![image.jpg](https://example.com/image.jpg) ',
            expect.any(Object)
        );

        // Test début de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 0 }));
        mockEditor.getLine = vi.fn(() => 'Hello');

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '![image.jpg](https://example.com/image.jpg) ',
            expect.any(Object)
        );

        // Test fin de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 5 }));
        mockEditor.getLine = vi.fn(() => 'Hello');

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            ' ![image.jpg](https://example.com/image.jpg)',
            expect.any(Object)
        );
    });

    it('should not insert when no active editor', () => {
        // Simuler pas d'éditeur actif
        (global as any).app.workspace.activeLeaf = null;

        const mockInsertCallback = vi.fn();
        eventBus.on(EventName.EDITOR_MEDIA_INSERTED, mockInsertCallback);

        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).not.toHaveBeenCalled();
        expect(mockInsertCallback).not.toHaveBeenCalled();
    });
}); 