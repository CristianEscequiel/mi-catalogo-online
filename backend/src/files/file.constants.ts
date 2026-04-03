export const UPLOAD_FOLDERS = {
  products: 'products',
  categories: 'categories',
  profiles: 'profiles',
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
