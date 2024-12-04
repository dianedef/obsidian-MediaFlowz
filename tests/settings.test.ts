import { describe, it, expect, beforeEach, vi } from 'vitest';
import MediaFlowz from '../src/main';
import { App, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from '../src/core/types/settings';
import manifest from '../manifest.json';

describe('MediaFlowz Plugin', () => {
   let app: App;
   let plugin: MediaFlowz;

   beforeEach(() => {
      app = new App();
      plugin = new MediaFlowz(app, manifest);
   });

   describe('Settings Management', () => {
      it('should initialize with default settings', async () => {
         await plugin.loadSettings();
         expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
      });

      it('should save settings correctly', async () => {
         const newSettings = {
               ...DEFAULT_SETTINGS,
               apiKey: 'test-key',
               cloudName: 'test-cloud'
         };
         plugin.settings = newSettings;
         await plugin.saveSettings();
         
         // Verify that saveData was called with the correct settings
         expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
      });
   });

   describe('Translation System', () => {
      it('should return correct translation for existing key', () => {
         plugin.settings = { ...DEFAULT_SETTINGS, language: 'fr' };
         const translation = plugin.getTranslation('notices.mediaPasted');
         expect(translation).not.toBe('notices.mediaPasted');
         expect(typeof translation).toBe('string');
      });

      it('should return key for non-existing translation', () => {
         plugin.settings = { ...DEFAULT_SETTINGS, language: 'fr' };
         const nonExistingKey = 'nonexistent.key';
         const translation = plugin.getTranslation(nonExistingKey);
         expect(translation).toBe(nonExistingKey);
      });
   });

   describe('Event Handling', () => {
      it('should handle media paste events', async () => {
         // Initialiser le plugin
         await plugin.onload();

         // Créer un mock de FileList
         const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
         const mockFileList = {
              0: mockFile,
              length: 1,
              item: (index: number) => index === 0 ? mockFile : null
         };

         // Créer l'événement avec le FileList
         const mockClipboardEvent = new ClipboardEvent('paste', {
               clipboardData: new DataTransfer()
         });

         // Remplacer la propriété files
         Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
               value: mockFileList,
               writable: false
         });

         // Simuler l'événement de collage
         const pasteHandler = vi.mocked(app.workspace.on).mock.calls[0][1] as Function;
         await pasteHandler(mockClipboardEvent);

         // Vérifier que Notice a été appelé
         expect(vi.mocked(Notice)).toHaveBeenCalled();
      });

      it('should not handle non-media paste events', async () => {
         // Initialiser le plugin
         await plugin.onload();

         // Créer un mock de FileList
         const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
         const mockFileList = {
              0: mockFile,
              length: 1,
              item: (index: number) => index === 0 ? mockFile : null
         };

         // Créer l'événement avec le FileList
         const mockClipboardEvent = new ClipboardEvent('paste', {
               clipboardData: new DataTransfer()
         });

         // Remplacer la propriété files
         Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
               value: mockFileList,
               writable: false
         });

         // Simuler l'événement de collage
         const pasteHandler = vi.mocked(app.workspace.on).mock.calls[0][1] as Function;
         await pasteHandler(mockClipboardEvent);

         // Vérifier que Notice n'a pas été appelé
         expect(vi.mocked(Notice)).not.toHaveBeenCalled();
      });
   });
}); 