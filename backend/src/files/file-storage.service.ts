import { Injectable, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { UPLOAD_FOLDERS, UploadFolder } from './file.constants';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly uploadsRoot = resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');

  async onModuleInit() {
    await this.ensureBaseDirectories();
  }

  getUploadAbsoluteDir(folder: UploadFolder) {
    return join(this.uploadsRoot, folder);
  }

  buildPublicPath(folder: UploadFolder, filename: string) {
    return `/uploads/${folder}/${filename}`;
  }

  async deleteByPublicPath(publicPath?: string | null) {
    if (!publicPath) {
      return;
    }

    const normalized = publicPath.replace(/\\/g, '/');
    if (!normalized.startsWith('/uploads/')) {
      return;
    }

    const relativePath = normalized.replace('/uploads/', '');
    const absolutePath = join(this.uploadsRoot, relativePath);

    try {
      await fs.unlink(absolutePath);
    } catch {
      return;
    }
  }

  private async ensureBaseDirectories() {
    await fs.mkdir(this.uploadsRoot, { recursive: true });

    await Promise.all(Object.values(UPLOAD_FOLDERS).map((folder) => fs.mkdir(this.getUploadAbsoluteDir(folder), { recursive: true })));
  }
}
