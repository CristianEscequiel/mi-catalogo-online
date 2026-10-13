import { INestApplication, Logger } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { asUser, createCatalogApp, createCatalogTestModule, describeWithDb, OpenaiDouble } from './catalog-access.helpers';

const imageBody = { imageUrl: '/uploads/products/1.jpg', categories: [{ id: 1, name: 'Teclados' }] };

describeWithDb('catalog-access: tope de uso de la IA (Postgres real)', () => {
  // Cada test usa un usuario distinto: el contador vive en memoria durante toda la suite.
  let nextUser = 1000;
  const newUser = () => ++nextUser;

  const start = async (env: Record<string, string>) => {
    const created = await createCatalogTestModule(env);
    const app = await createCatalogApp(created.moduleRef);
    return { ...created, app };
  };

  describe('con AI_RATE_LIMIT=3', () => {
    let moduleRef: TestingModule;
    let app: INestApplication<App>;
    let openai: OpenaiDouble;

    beforeAll(async () => {
      ({ moduleRef, app, openai } = await start({ AI_RATE_LIMIT: '3', AI_RATE_TTL_SECONDS: '3600' }));
    });

    afterAll(async () => {
      await app?.close();
      await moduleRef?.close();
    });

    beforeEach(() => {
      openai.generateProductContent.mockClear();
      openai.generateProductFromImage.mockClear();
    });

    const text = (sub: number, role: 'ADMIN' | 'GUEST' | 'CLIENT' = 'GUEST') => request(app.getHttpServer()).get('/products/generate-ai/teclado').set('x-test-user', asUser(sub, role));
    const image = (sub: number, role: 'ADMIN' | 'GUEST' | 'CLIENT' = 'GUEST') => request(app.getHttpServer()).post('/products/generate-from-image').set('x-test-user', asUser(sub, role)).send(imageBody);
    const calls = () => openai.generateProductContent.mock.calls.length + openai.generateProductFromImage.mock.calls.length;

    it('las llamadas dentro del tope se atienden y la que lo supera recibe 429 sin llegar a OpenAI (REQ-5.1, 5.2, 5.3)', async () => {
      const sub = newUser();

      await text(sub).expect(200);
      await image(sub).expect(201);
      await text(sub).expect(200);
      const blocked = await image(sub).expect(429); // la 4.ª, por el otro endpoint: comparten contador

      expect((blocked.body as { message: string }).message).toBe('Llegaste al límite de usos de la IA. Probá de nuevo más tarde.');
      expect(calls()).toBe(3);
    });

    it('agotar el tope de un usuario no afecta a otro (REQ-5.4)', async () => {
      const heavy = newUser();
      for (let i = 0; i < 3; i++) {
        await text(heavy).expect(200);
      }
      await text(heavy).expect(429);

      await text(newUser()).expect(200);
      await text(newUser(), 'ADMIN').expect(200);
    });

    it('una llamada que falla en OpenAI cuenta igual contra el tope (REQ-5.7)', async () => {
      const sub = newUser();
      openai.generateProductContent.mockRejectedValueOnce(new Error('OpenAI caído'));

      await text(sub).expect(500);
      await text(sub).expect(200);
      await text(sub).expect(200);
      await text(sub).expect(429);
    });

    it('un rechazo por rol no consume tope: el mismo usuario conserva sus 3 llamadas (REQ-5.8)', async () => {
      const sub = newUser();
      for (let i = 0; i < 5; i++) {
        await text(sub, 'CLIENT').expect(403);
      }
      expect(calls()).toBe(0);

      await text(sub, 'GUEST').expect(200);
      await text(sub, 'GUEST').expect(200);
      await text(sub, 'GUEST').expect(200);
      await text(sub, 'GUEST').expect(429);
    });

    it('sin sesión se rechaza y no llama a OpenAI (REQ-5.8)', async () => {
      // El arnés reemplaza AuthGuard('jwt') por uno que devuelve false: Nest responde 403 (en producción, 401).
      await request(app.getHttpServer()).get('/products/generate-ai/teclado').expect(403);
      await request(app.getHttpServer()).post('/products/generate-from-image').send(imageBody).expect(403);

      expect(calls()).toBe(0);
    });

    it('el tope no afecta a los demás endpoints', async () => {
      const sub = newUser();
      for (let i = 0; i < 3; i++) {
        await text(sub).expect(200);
      }

      await request(app.getHttpServer()).get('/products').set('x-test-user', asUser(sub, 'GUEST')).expect(200);
    });
  });

  describe('con una variable inválida (REQ-5.5, 5.6)', () => {
    let moduleRef: TestingModule;
    let app: INestApplication<App>;
    let warn: jest.SpyInstance;

    beforeAll(async () => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      ({ moduleRef, app } = await start({ AI_RATE_LIMIT: 'abc' }));
    });

    afterAll(async () => {
      warn.mockRestore();
      await app?.close();
      await moduleRef?.close();
    });

    it('usa el tope por defecto de 20 y registra una advertencia', async () => {
      const sub = newUser();
      const call = () => request(app.getHttpServer()).get('/products/generate-ai/teclado').set('x-test-user', asUser(sub, 'GUEST'));

      for (let i = 0; i < 20; i++) {
        await call().expect(200);
      }
      await call().expect(429);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('AI_RATE_LIMIT'));
    });
  });
});
