import { validateEnv } from './env.validation';

const validEnv = (): Record<string, unknown> => ({
  JWT_SECRET: 'a'.repeat(32),
  DB_HOST: 'db',
  DB_NAME: 'catalog',
  DB_USER: 'catalog_user',
  DB_PASSWORD: 'secret',
  OPENAI_API_KEY: 'sk-test',
  RESEND_API_KEY: 're_test',
  CONTACT_TO_EMAIL: 'contacto@example.com',
});

const messageOf = (env: Record<string, unknown>): string => {
  try {
    validateEnv(env);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('validateEnv no lanzó');
};

describe('validateEnv', () => {
  it('acepta un entorno completo y devuelve el mismo objeto sin tocarlo (REQ-5.7)', () => {
    const env = validEnv();
    expect(validateEnv(env)).toBe(env);
    expect(env).toEqual(validEnv());
  });

  it('acepta POSTGRES_* como alternativa a DB_* (REQ-5.3, 5.4)', () => {
    const env = {
      JWT_SECRET: 'a'.repeat(32),
      POSTGRES_HOST: 'db',
      POSTGRES_DB: 'catalog',
      POSTGRES_USER: 'catalog_user',
      POSTGRES_PASSWORD: 'secret',
      OPENAI_API_KEY: 'sk-test',
      RESEND_API_KEY: 're_test',
      CONTACT_TO_EMAIL: 'contacto@example.com',
    };
    expect(() => validateEnv(env)).not.toThrow();
  });

  it.each(['OPENAI_API_KEY', 'RESEND_API_KEY', 'CONTACT_TO_EMAIL'])('falla si falta %s y nombra la variable (REQ-5.8)', (name) => {
    const env = validEnv();
    delete env[name];
    expect(messageOf(env)).toContain(name);
    expect(messageOf({ ...validEnv(), [name]: '  ' })).toContain(name);
  });

  describe('JWT_SECRET (REQ-5.1, 5.2)', () => {
    it('falla si falta y nombra la variable', () => {
      const env = validEnv();
      delete env.JWT_SECRET;
      expect(messageOf(env)).toContain('JWT_SECRET');
    });

    it('falla si está vacía o es solo espacios', () => {
      expect(messageOf({ ...validEnv(), JWT_SECRET: '   ' })).toContain('JWT_SECRET');
    });

    it('en producción falla con 31 caracteres y pasa con 32', () => {
      expect(messageOf({ ...validEnv(), NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com', JWT_SECRET: 'a'.repeat(31) })).toContain('JWT_SECRET');
      expect(() => validateEnv({ ...validEnv(), NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com', JWT_SECRET: 'a'.repeat(32) })).not.toThrow();
    });

    it('fuera de producción acepta un secreto corto', () => {
      expect(() => validateEnv({ ...validEnv(), JWT_SECRET: 'corto' })).not.toThrow();
    });
  });

  describe('base de datos (REQ-5.3, 5.4)', () => {
    it.each([
      ['DB_HOST', 'POSTGRES_HOST'],
      ['DB_NAME', 'POSTGRES_DB'],
      ['DB_USER', 'POSTGRES_USER'],
      ['DB_PASSWORD', 'POSTGRES_PASSWORD'],
    ])('falla si faltan %s y %s, y el mensaje nombra la variable', (primary, fallback) => {
      const env = validEnv();
      delete env[primary];
      const message = messageOf(env);
      expect(message).toContain(primary);
      expect(message).toContain(fallback);
    });
  });

  describe('enteros positivos (REQ-5.5)', () => {
    const variables = ['PORT', 'DB_PORT', 'POSTGRES_PORT', 'ORDER_PAYMENT_TTL_HOURS', 'AI_RATE_LIMIT', 'AI_RATE_TTL_SECONDS'];

    it.each(variables.flatMap((name) => ['0', '-1', '1.5', 'abc', ''].map((value) => [name, value])))('%s rechaza "%s"', (name, value) => {
      expect(messageOf({ ...validEnv(), [name]: value })).toContain(name);
    });

    it.each(variables)('%s acepta un entero positivo y también ausente', (name) => {
      expect(() => validateEnv({ ...validEnv(), [name]: '3000' })).not.toThrow();
      expect(() => validateEnv(validEnv())).not.toThrow();
    });
  });

  describe('CORS_ORIGIN (REQ-4.1, 4.2)', () => {
    const production = (corsOrigin?: string) => ({ ...validEnv(), NODE_ENV: 'production', CORS_ORIGIN: corsOrigin });

    it('en producción falla si falta', () => {
      expect(messageOf(production())).toContain('CORS_ORIGIN');
    });

    it('en producción falla si es "*" o la lista lo contiene', () => {
      expect(messageOf(production('*'))).toContain('CORS_ORIGIN');
      expect(messageOf(production('https://a.com,*'))).toContain('CORS_ORIGIN');
    });

    it('en producción falla si la lista tiene un elemento vacío', () => {
      expect(messageOf(production('https://a.com,,https://b.com'))).toContain('CORS_ORIGIN');
    });

    it('en producción acepta una lista de orígenes', () => {
      expect(() => validateEnv(production('https://a.com, https://b.com'))).not.toThrow();
    });

    it('fuera de producción no la exige', () => {
      expect(() => validateEnv(validEnv())).not.toThrow();
      expect(() => validateEnv({ ...validEnv(), NODE_ENV: 'development' })).not.toThrow();
    });
  });

  it('lista todas las variables inválidas en un único error (REQ-5.6)', () => {
    const env = validEnv();
    delete env.JWT_SECRET;
    delete env.DB_HOST;
    const message = messageOf({ ...env, PORT: 'abc', AI_RATE_LIMIT: '0' });
    for (const name of ['JWT_SECRET', 'DB_HOST', 'PORT', 'AI_RATE_LIMIT']) {
      expect(message).toContain(name);
    }
  });
});
