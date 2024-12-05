import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules/**/*'],
    },
    resolve: {
        alias: {
            'obsidian': resolve(__dirname, './tests/__mocks__/obsidian.ts')
        }
    }
}); 