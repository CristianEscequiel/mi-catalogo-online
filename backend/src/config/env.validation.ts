type RawEnv = Record<string, unknown>;

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const MIN_JWT_SECRET_LENGTH_IN_PRODUCTION = 32;

// Las variables de entorno son texto; cualquier otro tipo (p. ej. un objeto) se trata como ausente.
const text = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
};

// Cada conexión acepta el nombre DB_* o su alternativa POSTGRES_* (igual que `ormconfig.ts` y `AppModule`).
const DB_VARIABLES: ReadonlyArray<readonly [string, string]> = [
  ['DB_HOST', 'POSTGRES_HOST'],
  ['DB_NAME', 'POSTGRES_DB'],
  ['DB_USER', 'POSTGRES_USER'],
  ['DB_PASSWORD', 'POSTGRES_PASSWORD'],
];

const DB_PORT_VARIABLES: readonly [string, string] = ['DB_PORT', 'POSTGRES_PORT'];

// Los constructores de OpenaiService, MailService y ContactService ya lanzan un error si falta alguna:
// se exigen acá para fallar al arrancar y con todos los errores juntos.
const REQUIRED_VARIABLES = ['OPENAI_API_KEY', 'RESEND_API_KEY', 'CONTACT_TO_EMAIL'] as const;

const POSITIVE_INTEGER_VARIABLES = ['PORT', 'ORDER_PAYMENT_TTL_HOURS', 'AI_RATE_LIMIT', 'AI_RATE_TTL_SECONDS'] as const;

/**
 * Valida el entorno al arrancar. Acumula todos los errores y lanza uno solo con la lista completa.
 * Devuelve `raw` sin transformarlo: los servicios siguen leyendo y aplicando sus valores por defecto como hoy.
 */
export function validateEnv(raw: RawEnv): RawEnv {
  const errors: string[] = [];
  const isProduction = text(raw.NODE_ENV) === 'production';

  const jwtSecret = text(raw.JWT_SECRET);
  if (!jwtSecret) {
    errors.push('JWT_SECRET es obligatoria.');
  } else if (isProduction && jwtSecret.length < MIN_JWT_SECRET_LENGTH_IN_PRODUCTION) {
    errors.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH_IN_PRODUCTION} caracteres en producción.`);
  }

  for (const [primary, fallback] of DB_VARIABLES) {
    if (!text(raw[primary]) && !text(raw[fallback])) {
      errors.push(`${primary} (o ${fallback}) es obligatoria.`);
    }
  }

  for (const name of REQUIRED_VARIABLES) {
    if (!text(raw[name])) {
      errors.push(`${name} es obligatoria.`);
    }
  }

  for (const name of POSITIVE_INTEGER_VARIABLES) {
    checkPositiveInteger(name, raw[name], errors);
  }
  for (const name of DB_PORT_VARIABLES) {
    checkPositiveInteger(name, raw[name], errors);
  }

  if (isProduction) {
    checkProductionCorsOrigin(raw.CORS_ORIGIN, errors);
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n${errors.map((message) => `- ${message}`).join('\n')}`);
  }
  return raw;
}

// Una variable ausente no es un error: rige el valor por defecto del servicio que la lee.
function checkPositiveInteger(name: string, value: unknown, errors: string[]): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!POSITIVE_INTEGER.test(text(value))) {
    errors.push(`${name} debe ser un entero positivo (valor recibido: "${text(value)}").`);
  }
}

function checkProductionCorsOrigin(value: unknown, errors: string[]): void {
  const raw = text(value);
  if (!raw) {
    errors.push('CORS_ORIGIN es obligatoria en producción (lista de orígenes separados por coma).');
    return;
  }
  const origins = raw.split(',').map((origin) => origin.trim());
  if (origins.some((origin) => !origin || origin === '*')) {
    errors.push('CORS_ORIGIN no puede ser "*" ni contener elementos vacíos en producción.');
  }
}
