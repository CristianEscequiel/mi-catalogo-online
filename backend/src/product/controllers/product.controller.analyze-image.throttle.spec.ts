import { INestApplication, ValidationPipeOptions } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../../test/controller-testing';
import { AiContentGenerator } from '../../ai/ai-content-generator.port';
import { AI_THROTTLER_NAME } from '../../ai/ai-throttler.guard';
import { Payload } from '../../auth/models/payload.model';
import { ProductService } from '../services/product.service';
import type { ProductController as ProductControllerType } from './product.controller';

const productionPipe: ValidationPipeOptions = { whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } };

// AiThrottlerGuard REAL (no se saltea) con un tope bajo.
describe('Tope de IA de POST /products/analyze-image', () => {
  const LIMIT = 3;
  const MAX = 1024;
  const ai = { generateProductContent: jest.fn(), generateProductFromImage: jest.fn() };
  const suggestion = { name: 'Teclado', description: 'd', categoryId: 1, categoryName: 'Teclados', slug: 'teclado' };
  const categoriesJson = JSON.stringify([{ id: 1, name: 'Teclados' }]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const admin: Payload = { sub: 1, role: 'ADMIN' };

  let ProductController: typeof ProductControllerType;
  let app: INestApplication<App>;
  const originalMax = process.env.MAX_IMAGE_SIZE_BYTES;

  // El tope de tamaño se lee al definir el decorador: hay que fijar el entorno antes de cargar el controller.
  beforeAll(() => {
    process.env.MAX_IMAGE_SIZE_BYTES = String(MAX);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ ProductController } = require('./product.controller') as typeof import('./product.controller'));
  });
  afterAll(() => {
    if (originalMax === undefined) delete process.env.MAX_IMAGE_SIZE_BYTES;
    else process.env.MAX_IMAGE_SIZE_BYTES = originalMax;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    ai.generateProductContent.mockResolvedValue({ description: 'x', slug: 'x' });
    ai.generateProductFromImage.mockResolvedValue(suggestion);
  });
  afterEach(() => app?.close());

  // Un ThrottlerModule nuevo por test: el contador empieza en cero.
  const appFor = (user?: Payload) =>
    createControllerApp(
      ProductController,
      [
        { provide: ProductService, useValue: {} },
        { provide: AiContentGenerator, useValue: ai },
      ],
      user,
      [],
      {
        imports: [ThrottlerModule.forRoot({ throttlers: [{ name: AI_THROTTLER_NAME, ttl: 60_000, limit: LIMIT }] })],
        validationPipeOptions: productionPipe,
        rejectUnauthenticatedWith401: true,
      },
    );

  const analyze = (contentType = 'image/png', file: Buffer = png, categories = categoriesJson) => request(app.getHttpServer()).post('/products/analyze-image').attach('file', file, { filename: 'a.bin', contentType }).field('categories', categories);
  const generateAi = () => request(app.getHttpServer()).get('/products/generate-ai/teclado');
  const fromImage = () =>
    request(app.getHttpServer())
      .post('/products/generate-from-image')
      .send({ imageUrl: '/uploads/products/1.jpg', categories: [{ id: 1, name: 'Teclados' }] });

  it('REQ-2.12: la llamada que supera el tope responde 429 y no llega a la IA', async () => {
    app = await appFor(admin);

    for (let i = 0; i < LIMIT; i++) await analyze().expect(201);
    await analyze().expect(429);
    expect(ai.generateProductFromImage).toHaveBeenCalledTimes(LIMIT);
  });

  it('REQ-2.13: analyze-image y generate-ai comparten el mismo contador', async () => {
    app = await appFor(admin);

    await generateAi().expect(200);
    await generateAi().expect(200);
    await analyze().expect(201);
    await analyze().expect(429);
    await generateAi().expect(429);
  });

  it('REQ-2.13: analyze-image y generate-from-image comparten el mismo contador', async () => {
    app = await appFor(admin);

    await fromImage().expect(201);
    await analyze().expect(201);
    await fromImage().expect(201);
    await analyze().expect(429);
    await fromImage().expect(429);
  });

  it('REQ-2.14: un 415, un 413 y un 400 consumen tope', async () => {
    app = await appFor(admin);

    await analyze('image/gif').expect(415);
    await analyze('image/png', Buffer.alloc(MAX + 500, 1)).expect(413);
    await analyze('image/png', png, 'no-es-json').expect(400);
    await analyze().expect(429);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.14: las peticiones rechazadas con 401 no consumen tope', async () => {
    app = await appFor(undefined);

    for (let i = 0; i < LIMIT + 2; i++) await analyze().expect(401);
  });

  it('REQ-2.14: las peticiones rechazadas con 403 no consumen tope', async () => {
    app = await appFor({ sub: 9, role: 'CLIENT' });

    for (let i = 0; i < LIMIT + 2; i++) await analyze().expect(403);
  });
});
