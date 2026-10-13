import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { ImageStorage } from './image-storage.port';

@Module({
  providers: [{ provide: ImageStorage, useClass: FileStorageService }],
  exports: [ImageStorage],
})
export class FilesModule {}
