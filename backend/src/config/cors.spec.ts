import { DEFAULT_DEVELOPMENT_CORS_ORIGINS, resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins', () => {
  it('separa por coma y recorta espacios (REQ-4.3)', () => {
    expect(resolveCorsOrigins('https://a.com, https://b.com ', 'production')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('descarta elementos vacíos', () => {
    expect(resolveCorsOrigins('https://a.com,, ,https://b.com', 'development')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('sin valor en desarrollo usa solo los orígenes locales (REQ-4.4)', () => {
    expect(resolveCorsOrigins(undefined, 'development')).toEqual([...DEFAULT_DEVELOPMENT_CORS_ORIGINS]);
    expect(resolveCorsOrigins('', undefined)).toEqual(['http://localhost:4200', 'http://localhost:8080']);
  });

  it('sin valor en producción lanza y nunca devuelve "*"', () => {
    expect(() => resolveCorsOrigins(undefined, 'production')).toThrow('CORS_ORIGIN');
    expect(() => resolveCorsOrigins('  ', 'production')).toThrow('CORS_ORIGIN');
  });

  it('la lista de desarrollo devuelta es una copia: modificarla no altera el valor por defecto', () => {
    resolveCorsOrigins(undefined, 'development').push('http://evil.test');
    expect(resolveCorsOrigins(undefined, 'development')).toEqual(['http://localhost:4200', 'http://localhost:8080']);
  });
});
