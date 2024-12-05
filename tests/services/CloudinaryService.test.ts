import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudinaryService } from '../../src/core/services/CloudinaryService';
import { EventBusService } from '../../src/core/services/EventBusService';
import { ErrorService, ErrorType } from '../../src/core/services/ErrorService';
import { EventName } from '../../src/core/types/events';
import { IPluginSettings } from '../../src/core/types/settings';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { networkErrorHandler } from '../mocks/api/cloudinary.handlers';

// Mock Obsidian
vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    moment: {
        locale: () => 'fr'
    }
}));

describe('CloudinaryService', () => {
    let cloudinaryService: CloudinaryService;
    let eventBus: ReturnType<typeof EventBusService.getInstance>;
    let errorService: ReturnType<typeof ErrorService.getInstance>;

    const mockSettings: IPluginSettings = {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        cloudName: 'test-cloud'
    };

    beforeEach(() => {
        // Nettoyer les singletons et leurs event listeners
        CloudinaryService.cleanup();
        // @ts-ignore
        EventBusService.instance = undefined;
        // @ts-ignore
        ErrorService.instance = undefined;

        // Reset des mocks
        vi.clearAllMocks();
        
        // Setup des services
        eventBus = EventBusService.getInstance();
        errorService = ErrorService.getInstance();
        cloudinaryService = CloudinaryService.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = CloudinaryService.getInstance();
        const instance2 = CloudinaryService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should update settings when receiving SETTINGS_UPDATED event', () => {
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });
        
        // @ts-ignore - Accès aux propriétés privées pour les tests
        expect(cloudinaryService.settings).toEqual(mockSettings);
    });

    it('should handle configuration error when uploading without settings', async () => {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        // Vérifier que handleError a été appelé
        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.CONFIG,
                message: 'errors.notConfigured'
            })
        );

        // Vérifier que l'événement d'erreur a été émis
        const emitCalls = vi.mocked(eventBus.emit).mock.calls;
        const errorEmit = emitCalls.find(
            call => call[0] === EventName.MEDIA_UPLOAD_ERROR
        );
        
        expect(errorEmit).toBeDefined();
        expect(errorEmit?.[1]).toEqual({
            error: expect.objectContaining({
                type: ErrorType.CONFIG,
                message: 'errors.notConfigured'
            }),
            fileName: 'unknown'
        });
    });

    it('should handle successful file upload', async () => {
        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Créer un faux fichier et déclencher l'upload
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.objectContaining({
                url: expect.stringContaining('cloudinary.com'),
                fileName: 'test.jpg'
            })
        );
    });

    it('should handle upload errors', async () => {
        // Setup du mock pour simuler une erreur d'upload
        server.use(
            http.post('*/auto/upload', () => {
                return new HttpResponse(null, {
                    status: 400,
                    statusText: 'Invalid upload parameters'
                });
            })
        );

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Test
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.UPLOAD,
                message: expect.any(String),
                originalError: expect.any(Error)
            })
        );
    });

    it('should handle network errors', async () => {
        // Setup du mock pour simuler une erreur réseau
        server.use(networkErrorHandler);

        // Mock isNetworkError pour retourner true pour les erreurs réseau
        vi.spyOn(errorService, 'isNetworkError').mockReturnValue(true);

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Test
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.NETWORK,
                message: expect.any(String),
                originalError: expect.any(Error)
            })
        );
    });
}); 