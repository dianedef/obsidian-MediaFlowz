import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        deps: {
            optimizer: {
                web: {
                    include: ['obsidian']
                }
            }
        }
    },
    resolve: {
        alias: {
            'obsidian': resolve(__dirname, './src/mocks/obsidian.ts')
        }
    },
    json: {
        stringify: true
    }
}); 