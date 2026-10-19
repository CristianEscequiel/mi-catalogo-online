import { HttpErrorResponse } from '@angular/common/http';

// Deben igualar ALLOWED_IMAGE_MIME_TYPES y DEFAULT_MAX_IMAGE_SIZE_BYTES / MAX_IMAGE_SIZE_BYTES
// de backend/src/files/file.constants.ts. El 413/415 del backend es la red de seguridad.
export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const BYTES_PER_MB = 1024 * 1024;
const MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE_BYTES / BYTES_PER_MB;

export const IMAGE_RULES_HINT = `Formatos permitidos: JPG, PNG o WebP. Tamaño máximo: ${MAX_IMAGE_SIZE_MB} MB.`;
export const IMAGE_FORMAT_ERROR = 'Formato no permitido. Usa JPG, PNG o WebP.';
export const IMAGE_UPLOAD_GENERIC_ERROR = 'No se pudo subir la imagen.';
export const IMAGE_TOO_LARGE_SERVER_ERROR = `La imagen supera el máximo de ${MAX_IMAGE_SIZE_MB} MB.`;

/** null si el archivo es válido; si no, el mensaje de rechazo. Formato primero, después tamaño. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return IMAGE_FORMAT_ERROR;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return imageTooLargeMessage(file.size);
  }
  return null;
}

/** "La imagen pesa 7,2 MB y el máximo es 5 MB." Una decimal hacia arriba, coma decimal. */
export function imageTooLargeMessage(sizeBytes: number): string {
  const tenths = Math.ceil((sizeBytes * 10) / BYTES_PER_MB);
  const size = (tenths / 10).toFixed(1).replace('.', ',');
  return `La imagen pesa ${size} MB y el máximo es ${MAX_IMAGE_SIZE_MB} MB.`;
}

/** 415 → formato; 413 → máximo; cualquier otro → `generic`. */
export function imageUploadErrorMessage(
  error: unknown,
  generic: string = IMAGE_UPLOAD_GENERIC_ERROR,
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 415) return IMAGE_FORMAT_ERROR;
    if (error.status === 413) return IMAGE_TOO_LARGE_SERVER_ERROR;
  }
  return generic;
}
