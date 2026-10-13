// Escapa los comodines de LIKE/ILIKE (`\`, `%`, `_`) para buscar el texto del usuario de forma literal.
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, '\\$&');
