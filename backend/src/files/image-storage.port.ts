import { UploadFolder } from './file.constants';

// Puerto de almacenamiento de imágenes. Es una clase abstracta para que sirva de token de inyección de Nest
// (los consumidores piden `ImageStorage`, no el disco). El adaptador actual es `FileStorageService` (disco local).
// La subida en sí la hace Multer en la capa HTTP: este puerto solo cubre lo que usan los servicios de dominio.
export abstract class ImageStorage {
  abstract buildPublicPath(folder: UploadFolder, filename: string): string;
  abstract deleteByPublicPath(publicPath?: string | null): Promise<void>;
}
