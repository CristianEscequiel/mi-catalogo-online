import { existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { HealthModule } from '../src/health/health.module';

// La primera app tarda en compilar ts-jest en frío; el resto responde en milisegundos.
jest.setTimeout(30000);

// Módulo mínimo (solo /health, sin base de datos) con el mismo cableado que usa main.ts.
const ENV_KEYS = ['NODE_ENV', 'CORS_ORIGIN', 'UPLOADS_DIR'];

const createApp = async (env: Record<string, string | undefined>): Promise<NestExpressApplication> => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), HealthModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
};

describe('infra-config: Swagger, CORS y uploads', () => {
  const apps: NestExpressApplication[] = [];
  const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const uploadsDir = () => join(mkdtempSync(join(tmpdir(), 'infra-config-')), 'uploads');

  const start = async (env: Record<string, string | undefined>) => {
    const app = await createApp({ UPLOADS_DIR: uploadsDir(), ...env });
    apps.push(app);
    return app;
  };

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  describe('Swagger', () => {
    it('REQ-3.1: con NODE_ENV=production GET /docs responde 404', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com' });
      await request(app.getHttpServer()).get('/docs').expect(404);
    });

    it('REQ-3.2: con NODE_ENV=production GET /swagger/json responde 404', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com' });
      await request(app.getHttpServer()).get('/swagger/json').expect(404);
    });

    it('REQ-3.3: con NODE_ENV=development GET /docs y /swagger/json responden 200', async () => {
      const app = await start({ NODE_ENV: 'development' });
      await request(app.getHttpServer()).get('/docs').expect(200);
      const json = await request(app.getHttpServer()).get('/swagger/json').expect(200);
      expect((json.body as { openapi?: string }).openapi).toBeDefined();
    });

    it('REQ-3.3: sin NODE_ENV (desarrollo por defecto) también publica Swagger', async () => {
      const app = await start({});
      await request(app.getHttpServer()).get('/swagger/json').expect(200);
    });

    it('la API sigue respondiendo en producción aunque Swagger esté apagado', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com' });
      await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    });
  });

  describe('CORS', () => {
    it('REQ-4.3: acepta solo los orígenes de la lista, sin espacios sobrantes', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com, https://b.com' });
      for (const origin of ['https://a.com', 'https://b.com']) {
        const res = await request(app.getHttpServer()).get('/health').set('Origin', origin).expect(200);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('REQ-4.5: un origen que no está en la lista no recibe Access-Control-Allow-Origin', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com' });
      const res = await request(app.getHttpServer()).get('/health').set('Origin', 'https://evil.test').expect(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('REQ-4.5: la respuesta al preflight de un origen no listado tampoco lo incluye', async () => {
      const app = await start({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com' });
      const res = await request(app.getHttpServer()).options('/health').set('Origin', 'https://evil.test').set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('REQ-4.4: sin CORS_ORIGIN fuera de producción permite solo los orígenes locales', async () => {
      const app = await start({ NODE_ENV: 'development' });
      for (const origin of ['http://localhost:4200', 'http://localhost:8080']) {
        const res = await request(app.getHttpServer()).get('/health').set('Origin', origin);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
      }
      const other = await request(app.getHttpServer()).get('/health').set('Origin', 'https://evil.test');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('nunca responde con comodín "*"', async () => {
      const app = await start({ NODE_ENV: 'development' });
      const res = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:4200');
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });
  });

  describe('uploads', () => {
    it('REQ-6.5: crea el directorio de uploads si no existe', async () => {
      const dir = uploadsDir();
      expect(existsSync(dir)).toBe(false);
      await start({ NODE_ENV: 'development', UPLOADS_DIR: dir });
      expect(existsSync(dir)).toBe(true);
    });
  });
});
