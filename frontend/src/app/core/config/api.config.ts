import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiUrl;

export const resolveImageUrl = (imagePath?: string | null) => {
  if (!imagePath) {
    return null;
  }

  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const parsedUrl = new URL(imagePath);
      if (parsedUrl.pathname.startsWith('/uploads/')) {
        return `${normalizedBase}${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch {
      return imagePath;
    }
    return imagePath;
  }

  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${normalizedBase}${normalizedPath}`;
};
