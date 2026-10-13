export const DEFAULT_DEVELOPMENT_CORS_ORIGINS: readonly string[] = ['http://localhost:4200', 'http://localhost:8080'];

/**
 * Devuelve la lista de orígenes permitidos. Nunca devuelve el comodín `*`:
 * sin valor, en desarrollo se usan los orígenes locales y en producción se lanza un error
 * (`validateEnv` ya impide llegar acá sin `CORS_ORIGIN`; esto es la defensa de respaldo).
 */
export function resolveCorsOrigins(raw: string | undefined, nodeEnv: string | undefined): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }
  if (nodeEnv === 'production') {
    throw new Error('CORS_ORIGIN es obligatoria en producción.');
  }
  return [...DEFAULT_DEVELOPMENT_CORS_ORIGINS];
}
