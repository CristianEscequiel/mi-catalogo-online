import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiUrl;

export const resolveImageUrl = (imagePath?: string | null) => {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${normalizedBase}${normalizedPath}`;
};
