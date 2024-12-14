import { vi } from 'vitest';
import { Plugin } from 'obsidian';

const mockCommandService = {
    registerCommand: vi.fn(),
    unregisterCommand: vi.fn(),
    clearCommands: vi.fn()
};

export class MockCommandService {
    private static instance: typeof mockCommandService | undefined;
    
    static getInstance(plugin?: Plugin) {
        if (!MockCommandService.instance) {
            MockCommandService.instance = mockCommandService;
        }
        return MockCommandService.instance;
    }

    static cleanup() {
        MockCommandService.instance = undefined;
    }
}

export const mockCommandServiceFactory = () => ({
    CommandService: MockCommandService
}); 