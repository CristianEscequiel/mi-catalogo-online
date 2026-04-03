import { UnsupportedMediaTypeException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_SIZE_BYTES, UploadFolder } from './file.constants';
import { existsSync, mkdirSync } from 'fs';

const sanitizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export const createImageMulterOptions = (folder: UploadFolder): MulterOptions => ({
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      const uploadsRoot = resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
      const absoluteFolderPath = join(uploadsRoot, folder);
      if (!existsSync(absoluteFolderPath)) {
        mkdirSync(absoluteFolderPath, { recursive: true });
      }
      callback(null, absoluteFolderPath);
    },
    filename: (req, file, callback) => {
      const entityId = String(req.params?.id ?? 'entity');
      const extension = extname(file.originalname).toLowerCase();
      const safeExtension = ALLOWED_IMAGE_EXTENSIONS.includes(extension) ? extension : '.jpg';
      const filename = `${sanitizeName(entityId)}-${Date.now()}${safeExtension}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_IMAGE_SIZE_BYTES ?? DEFAULT_MAX_IMAGE_SIZE_BYTES),
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(new UnsupportedMediaTypeException('Only jpg, jpeg, png and webp files are allowed'), false);
      return;
    }

    callback(null, true);
  },
});
