import { FileNameService } from '../src/core/services/FileNameService';
import { TFile } from 'obsidian';
import { EventBusService } from '../src/core/services/EventBusService';
import { EventName } from '../src/core/types/events';
import { Notice } from 'obsidian';

describe('FileNameService', () => {
   let service: FileNameService;
   let mockApp: any;

   beforeEach(() => {
      service = FileNameService.getInstance();
      mockApp = {
         metadataCache: {
            getFileCache: vi.fn()
         }
      };
   });

   test('should generate prefix from frontmatter if available', async () => {
      const mockFile = {
         basename: 'My Test Note'
      } as TFile;

      mockApp.metadataCache.getFileCache.mockReturnValue({
         frontmatter: {
            'img-prefix': 'custom-prefix'
         }
      });

      const prefix = await service.getFilePrefix(mockFile, mockApp);
      expect(prefix).toBe('custom-prefix');
   });

   test('should fallback to note title if no frontmatter', async () => {
      const mockFile = {
         basename: 'My Test Note'
      } as TFile;

      mockApp.metadataCache.getFileCache.mockReturnValue({});

      const prefix = await service.getFilePrefix(mockFile, mockApp);
      expect(prefix).toBe('my-test-note');
   });

   test('should handle special characters in title', async () => {
      const mockFile = {
         basename: 'My Test & Note!'
      } as TFile;

      mockApp.metadataCache.getFileCache.mockReturnValue({});

      const prefix = await service.getFilePrefix(mockFile, mockApp);
      expect(prefix).toBe('my-test-and-note');
   });

   test('should generate unique filenames with timestamps', () => {
      const mockFile = new File([], 'test.jpg', { type: 'image/jpeg' });
      const prefix = 'my-note';

      const fileName1 = service.generateFileName(mockFile, prefix);
      const fileName2 = service.generateFileName(mockFile, prefix);

      expect(fileName1).not.toBe(fileName2);
      expect(fileName1).toMatch(/^my-note_\d+\.jpg$/);
      expect(fileName2).toMatch(/^my-note_\d+\.jpg$/);
   });

   test('should preserve file type when creating new file', () => {
      const originalFile = new File([], 'test.jpg', { 
         type: 'image/jpeg',
         lastModified: 123456789
      });

      const newFile = service.createFileWithNewName(originalFile, 'new-name.jpg');

      expect(newFile.type).toBe('image/jpeg');
      expect(newFile.lastModified).toBe(123456789);
      expect(newFile.name).toBe('new-name.jpg');
   });

   test('should update image prefixes when frontmatter changes', async () => {
      const mockFile = {
         basename: 'Test Note',
         vault: {
            read: vi.fn().mockResolvedValue(
               '![image1](path/old-prefix_123456.jpg)\n' +
               '![image2](path/old-prefix_789012.png)'
            ),
            modify: vi.fn()
         }
      } as unknown as TFile;

      const eventBus = EventBusService.getInstance();
      
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      // Attendre que les promesses soient résolues
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFile.vault.read).toHaveBeenCalled();
      expect(mockFile.vault.modify).toHaveBeenCalled();
      
      const newContent = mockFile.vault.modify.mock.calls[0][1];
      expect(newContent).toMatch(/new-prefix_\d+\.jpg/);
      expect(newContent).toMatch(/new-prefix_\d+\.png/);
   });

   test('should show notifications when updating image prefixes', async () => {
      const mockFile = {
         basename: 'Test Note',
         vault: {
            read: vi.fn().mockResolvedValue(
               '![image1](path/old-prefix_123456.jpg)\n' +
               '![image2](path/old-prefix_789012.png)'
            ),
            modify: vi.fn()
         }
      } as unknown as TFile;

      const noticeSpy = vi.spyOn(Notice.prototype, 'constructor');
      
      const eventBus = EventBusService.getInstance();
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(noticeSpy).toHaveBeenCalledTimes(2); // Une pour le compte, une pour le changement
      expect(mockFile.vault.modify).toHaveBeenCalled();
   });

   test('should show notification when no images to update', async () => {
      const mockFile = {
         basename: 'Test Note',
         vault: {
            read: vi.fn().mockResolvedValue('No images here'),
            modify: vi.fn()
         }
      } as unknown as TFile;

      const noticeSpy = vi.spyOn(Notice.prototype, 'constructor');
      
      const eventBus = EventBusService.getInstance();
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(noticeSpy).toHaveBeenCalledTimes(1); // Une notification "aucune image"
      expect(mockFile.vault.modify).not.toHaveBeenCalled();
   });
}); 