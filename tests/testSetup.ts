import { vi } from 'vitest';

// Mock ResizeObserver qui est utilisé dans PlayerService
global.ResizeObserver = vi.fn().mockImplementation(() => ({
   observe: vi.fn(),
   unobserve: vi.fn(),
   disconnect: vi.fn(),
}));

// Mock des APIs du navigateur nécessaires
global.matchMedia = vi.fn().mockImplementation(query => ({
   matches: false,
   media: query,
   onchange: null,
   addListener: vi.fn(),
   removeListener: vi.fn(),
   addEventListener: vi.fn(),
   removeEventListener: vi.fn(),
   dispatchEvent: vi.fn(),
})); 