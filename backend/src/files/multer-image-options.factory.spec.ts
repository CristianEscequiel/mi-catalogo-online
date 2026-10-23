import { UnsupportedMediaTypeException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { DEFAULT_MAX_IMAGE_SIZE_BYTES, UPLOAD_FOLDERS } from './file.constants';
import { createImageMemoryMulterOptions, createImageMulterOptions, imageFileFilter, imageFileSizeLimit } from './multer-image-options.factory';

type FilterCallback = (error: Error | null, accept: boolean) => void;
const runFilter = (filter: unknown, mimetype: string) => {
  const callback = jest.fn<void, Parameters<FilterCallback>>();
  (filter as (req: object, file: { mimetype: string }, cb: FilterCallback) => void)({}, { mimetype }, callback);
  return callback;
};

const runOptionsFilter = (options: MulterOptions, mimetype: string) => {
  const callback = jest.fn<void, Parameters<FilterCallback>>();
  options.fileFilter?.({}, { mimetype } as never, callback);
  return callback;
};

describe('multer-image-options.factory', () => {
  const originalMax = process.env.MAX_IMAGE_SIZE_BYTES;
  afterEach(() => {
    if (originalMax === undefined) delete process.env.MAX_IMAGE_SIZE_BYTES;
    else process.env.MAX_IMAGE_SIZE_BYTES = originalMax;
  });

  describe('imageFileFilter', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])('REQ-2.4: acepta %s', (mimetype) => {
      expect(runFilter(imageFileFilter, mimetype)).toHaveBeenCalledWith(null, true);
    });

    it.each(['image/gif', 'application/pdf', 'text/plain', 'image/svg+xml'])('REQ-2.4: rechaza %s con 415', (mimetype) => {
      const callback = runFilter(imageFileFilter, mimetype);
      expect(callback).toHaveBeenCalledTimes(1);
      const [error, accept] = callback.mock.calls[0];
      expect(error).toBeInstanceOf(UnsupportedMediaTypeException);
      expect(accept).toBe(false);
    });
  });

  describe('imageFileSizeLimit', () => {
    it('REQ-2.5: sin MAX_IMAGE_SIZE_BYTES usa 5 MB', () => {
      delete process.env.MAX_IMAGE_SIZE_BYTES;
      expect(imageFileSizeLimit()).toBe(DEFAULT_MAX_IMAGE_SIZE_BYTES);
      expect(imageFileSizeLimit()).toBe(5 * 1024 * 1024);
    });

    it('REQ-2.5: con MAX_IMAGE_SIZE_BYTES usa ese valor (se lee en cada llamada)', () => {
      process.env.MAX_IMAGE_SIZE_BYTES = '1234';
      expect(imageFileSizeLimit()).toBe(1234);
    });
  });

  describe('createImageMemoryMulterOptions', () => {
    it('REQ-2.11: el storage conserva el archivo en buffer y no escribe path', async () => {
      const options = createImageMemoryMulterOptions();
      const storage = options.storage as unknown as {
        _handleFile: (req: object, file: object, cb: (error: Error | null, info?: Record<string, unknown>) => void) => void;
      };
      expect(storage).toBeDefined();
      const content = Buffer.from([1, 2, 3, 4]);
      const info = await new Promise<Record<string, unknown>>((resolve, reject) => {
        storage._handleFile({}, { stream: Readable.from([content]), fieldname: 'file', originalname: 'a.png' }, (error, result) => (error ? reject(error) : resolve(result ?? {})));
      });
      expect(Buffer.isBuffer(info.buffer)).toBe(true);
      expect((info.buffer as Buffer).equals(content)).toBe(true);
      expect(info.path).toBeUndefined();
    });

    it('REQ-2.19/2.20/2.21: limits acota archivos, campos, partes y tamaño del campo de texto', () => {
      expect(createImageMemoryMulterOptions().limits).toEqual(expect.objectContaining({ files: 1, fields: 1, parts: 2, fieldSize: 65536 }));
    });

    it('REQ-2.5: el tope de tamaño es el de imageFileSizeLimit', () => {
      process.env.MAX_IMAGE_SIZE_BYTES = '777';
      expect(createImageMemoryMulterOptions().limits?.fileSize).toBe(777);
    });

    it('REQ-2.4: rechaza con 415 un MIME fuera de la lista y acepta uno permitido', () => {
      const options = createImageMemoryMulterOptions();
      const rejected = runOptionsFilter(options, 'application/pdf');
      expect(rejected.mock.calls[0][0]).toBeInstanceOf(UnsupportedMediaTypeException);
      expect(runOptionsFilter(options, 'image/png')).toHaveBeenCalledWith(null, true);
    });
  });

  describe('createImageMulterOptions (a disco) mantiene su comportamiento', () => {
    let uploadsDir: string;
    const originalUploadsDir = process.env.UPLOADS_DIR;
    beforeEach(() => {
      uploadsDir = mkdtempSync(join(tmpdir(), 'multer-opts-'));
      process.env.UPLOADS_DIR = uploadsDir;
    });
    afterEach(() => {
      rmSync(uploadsDir, { recursive: true, force: true });
      if (originalUploadsDir === undefined) delete process.env.UPLOADS_DIR;
      else process.env.UPLOADS_DIR = originalUploadsDir;
    });

    it('REQ-2.4: sigue usando diskStorage', () => {
      const options = createImageMulterOptions(UPLOAD_FOLDERS.products);
      expect(typeof (options.storage as unknown as Record<string, unknown>).getDestination).toBe('function');
    });

    it('REQ-2.5: el tope es MAX_IMAGE_SIZE_BYTES o 5 MB', () => {
      delete process.env.MAX_IMAGE_SIZE_BYTES;
      expect(createImageMulterOptions(UPLOAD_FOLDERS.products).limits?.fileSize).toBe(DEFAULT_MAX_IMAGE_SIZE_BYTES);
      process.env.MAX_IMAGE_SIZE_BYTES = '999';
      expect(createImageMulterOptions(UPLOAD_FOLDERS.products).limits?.fileSize).toBe(999);
    });

    it('REQ-2.19/2.20/2.21: no incluye los topes de files, fields, parts ni fieldSize', () => {
      const limits = createImageMulterOptions(UPLOAD_FOLDERS.products).limits ?? {};
      for (const key of ['files', 'fields', 'parts', 'fieldSize']) {
        expect(limits).not.toHaveProperty(key);
      }
    });

    it('REQ-2.4: sigue rechazando con 415 un MIME no permitido', () => {
      const options = createImageMulterOptions(UPLOAD_FOLDERS.products);
      expect(runOptionsFilter(options, 'application/pdf').mock.calls[0][0]).toBeInstanceOf(UnsupportedMediaTypeException);
      expect(runOptionsFilter(options, 'image/webp')).toHaveBeenCalledWith(null, true);
    });
  });
});
