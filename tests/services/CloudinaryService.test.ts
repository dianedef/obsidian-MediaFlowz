import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudinaryService } from '../../src/core/services/CloudinaryService';
import { EventBusService } from '../../src/core/services/EventBusService';
import { ErrorService, ErrorType } from '../../src/core/services/ErrorService';
import { EventName } from '../../src/core/types/events';
import { IPluginSettings } from '../../src/core/types/settings';

// Mock Obsidian
vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    moment: {
        locale: () => 'fr'
    }
}));

// Mock EventBusService
vi.mock('../../src/core/services/EventBusService', () => {
    const eventHandlers = new Map<string, Function[]>();
    const mockEventBus = {
        on: vi.fn((event: string, callback: Function) => {
            if (!eventHandlers.has(event)) {
                eventHandlers.set(event, []);
            }
            eventHandlers.get(event)?.push(callback);
        }),
        off: vi.fn((event: string, callback: Function) => {
            const handlers = eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(callback);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }),
        emit: vi.fn((event: string, data: any) => {
            const handlers = eventHandlers.get(event) || [];
            handlers.forEach(handler => handler(data));
        }),
        getInstance: vi.fn()
    };
    return {
        EventBusService: {
            getInstance: () => mockEventBus
        }
    };
});

// Mock ErrorService
vi.mock('../../src/core/services/ErrorService', () => {
    const mockErrorService = {
        handleError: vi.fn(),
        createError: vi.fn((type: string, message: string, originalError?: Error) => ({
            type,
            message,
            originalError: originalError || new Error('Test error')
        })),
        isNetworkError: vi.fn(() => false),
        getInstance: vi.fn()
    };
    return {
        ErrorService: {
            getInstance: () => mockErrorService
        },
        ErrorType: {
            CONFIG: 'config',
            UPLOAD: 'upload',
            EDITOR: 'editor',
            NETWORK: 'network',
            UNEXPECTED: 'unexpected'
        }
    };
});

describe('CloudinaryService', () => {
    let cloudinaryService: CloudinaryService;
    let eventBus: ReturnType<typeof EventBusService.getInstance>;
    let errorService: ReturnType<typeof ErrorService.getInstance>;
    let mockFetch: ReturnType<typeof vi.fn>;

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

        // Reset tous les mocks
        vi.clearAllMocks();

        // Setup du mock fetch
        mockFetch = vi.fn().mockImplementation(() => {
            throw new Error('Unexpected fetch call');
        });
        global.fetch = mockFetch;

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

        expect(errorService.handleError).toHaveBeenCalled();
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOAD_ERROR,
            expect.objectContaining({
                error: expect.any(Error),
                fileName: 'unknown'
            })
        );
    });

    it('should handle successful file upload', async () => {
        // Setup des mocks
        const mockSuccessResponse = {
            secure_url: 'https://test.cloudinary.com/image.jpg'
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockSuccessResponse)
        });

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

        expect(mockFetch).toHaveBeenCalled();
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.objectContaining({
                url: 'https://test.cloudinary.com/image.jpg',
                fileName: 'test.jpg'
            })
        );
    });

    it('should handle upload errors', async () => {
        // Setup des mocks
        mockFetch.mockResolvedValueOnce({
            ok: false,
            text: () => Promise.resolve('Upload failed')
        });

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

        expect(errorService.handleError).toHaveBeenCalled();
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOAD_ERROR,
            expect.objectContaining({
                error: expect.any(Error),
                fileName: 'test.jpg'
            })
        );
    });

    it('should handle non-media files', async () => {
        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Créer un faux fichier texte
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockFetch).not.toHaveBeenCalled();
        expect(eventBus.emit).not.toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.any(Object)
        );
    });

    it('should generate correct signature for upload', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ secure_url: 'test-url' })
        });

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockFetch).toHaveBeenCalled();
        const fetchCall = mockFetch.mock.calls[0];
        const formData = fetchCall[1].body as FormData;
        expect(formData.has('signature')).toBe(true);
    });

    it('should handle multiple files upload', async () => {
        // Setup des mocks
        const mockResponses = [
            { secure_url: 'https://test.cloudinary.com/image1.jpg' },
            { secure_url: 'https://test.cloudinary.com/image2.jpg' }
        ];

        // Reset le mock et configurer les réponses
        mockFetch.mockReset();
        mockFetch.mockImplementation(() => {
            throw new Error('Unexpected fetch call');
        });

        let callCount = 0;
        mockFetch
            .mockImplementationOnce(() => {
                callCount++;
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponses[0])
                });
            })
            .mockImplementationOnce(() => {
                callCount++;
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponses[1])
                });
            });

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Créer plusieurs fichiers
        const files = {
            0: new File(['test1'], 'image1.jpg', { type: 'image/jpeg' }),
            1: new File(['test2'], 'image2.jpg', { type: 'image/jpeg' }),
            length: 2,
            item: (index: number) => files[index as keyof typeof files]
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(callCount).toBe(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.objectContaining({
                url: 'https://test.cloudinary.com/image1.jpg',
                fileName: 'image1.jpg'
            })
        );
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.objectContaining({
                url: 'https://test.cloudinary.com/image2.jpg',
                fileName: 'image2.jpg'
            })
        );
    });

    it('should handle network errors', async () => {
        // Setup du mock pour simuler une erreur réseau
        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        errorService.isNetworkError.mockReturnValueOnce(true);

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        // Créer un fichier et déclencher l'upload
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });

        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        // Vérifier que l'erreur est traitée comme une erreur réseau
        expect(errorService.isNetworkError).toHaveBeenCalled();
        expect(errorService.createError).toHaveBeenCalledWith(
            ErrorType.NETWORK,
            'errors.networkError',
            expect.any(Error),
            expect.objectContaining({ fileName: 'test.jpg' })
        );
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOAD_ERROR,
            expect.objectContaining({
                error: expect.any(Error),
                fileName: 'test.jpg'
            })
        );
    });
}); 