import { BadGatewayException, BadRequestException, INestApplication, ValidationPipeOptions } from '@nestjs/common';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../../test/controller-testing';
import { AiContentGenerator } from '../../ai/ai-content-generator.port';
import { AiThrottlerGuard } from '../../ai/ai-throttler.guard';
import { Payload } from '../../auth/models/payload.model';
import { ProductService } from '../services/product.service';
import type { ProductController as ProductControllerType } from './product.controller';

// Opciones de producción (app.setup.ts).
const productionPipe: ValidationPipeOptions = { whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } };

describe('POST /products/analyze-image', () => {
  const MAX = 1024;
  const products = {};
  const ai = { generateProductContent: jest.fn(), generateProductFromImage: jest.fn() };
  const suggestion = { name: 'Teclado mecánico', description: 'Un teclado', categoryId: 1, categoryName: 'Teclados', slug: 'teclado-mecanico' };
  const categoriesJson = JSON.stringify([
    { id: 1, name: 'Teclados' },
    { id: 2, name: 'Mouses' },
  ]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

  let ProductController: typeof ProductControllerType;
  let app: INestApplication<App>;
  let uploadsDir: string;
  const originalEnv = { max: process.env.MAX_IMAGE_SIZE_BYTES, uploads: process.env.UPLOADS_DIR };

  // El tope de tamaño se lee al definir el decorador: hay que fijar el entorno antes de cargar el controller.
  beforeAll(() => {
    process.env.MAX_IMAGE_SIZE_BYTES = String(MAX);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ ProductController } = require('./product.controller') as typeof import('./product.controller'));
  });
  afterAll(() => {
    if (originalEnv.max === undefined) delete process.env.MAX_IMAGE_SIZE_BYTES;
    else process.env.MAX_IMAGE_SIZE_BYTES = originalEnv.max;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    uploadsDir = mkdtempSync(join(tmpdir(), 'analyze-image-'));
    process.env.UPLOADS_DIR = uploadsDir;
  });
  afterEach(async () => {
    await app?.close();
    rmSync(uploadsDir, { recursive: true, force: true });
    if (originalEnv.uploads === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = originalEnv.uploads;
  });

  const appFor = (user?: Payload) =>
    createControllerApp(
      ProductController,
      [
        { provide: ProductService, useValue: products },
        { provide: AiContentGenerator, useValue: ai },
      ],
      user,
      [AiThrottlerGuard],
      { validationPipeOptions: productionPipe, rejectUnauthenticatedWith401: true },
    );
  const admin: Payload = { sub: 1, role: 'ADMIN' };

  const post = () => request(app.getHttpServer()).post('/products/analyze-image');
  const listUploads = () => readdirSync(uploadsDir, { recursive: true });

  it.each([
    ['ADMIN', 'image/jpeg', { sub: 1, role: 'ADMIN' }],
    ['GUEST', 'image/png', { sub: 2, role: 'GUEST' }],
    ['ADMIN', 'image/webp', { sub: 1, role: 'ADMIN' }],
  ] as const)('REQ-2.1: %s con %s y categories válido recibe 201 con la forma de generate-from-image', async (_role, contentType, user) => {
    app = await appFor(user);
    ai.generateProductFromImage.mockResolvedValue(suggestion);

    const res = await post().attach('file', png, { filename: 'foto', contentType }).field('categories', categoriesJson).expect(201);

    expect(res.body).toEqual(suggestion);
  });

  it('REQ-2.2: sin usuario autenticado responde 401 y no llama a la IA', async () => {
    app = await appFor(undefined);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(401);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.3: un CLIENT recibe 403 y no se llama a la IA', async () => {
    app = await appFor({ sub: 5, role: 'CLIENT' });

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(403);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it.each(['image/gif', 'application/pdf', 'text/plain'])('REQ-2.4: un archivo %s responde 415 sin llamar a la IA', async (contentType) => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.bin', contentType }).field('categories', categoriesJson).expect(415);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.5: un archivo mayor que MAX_IMAGE_SIZE_BYTES responde 413 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post()
      .attach('file', Buffer.alloc(MAX + 500, 1), { filename: 'grande.png', contentType: 'image/png' })
      .field('categories', categoriesJson)
      .expect(413);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.6: sin archivo responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().field('categories', categoriesJson).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.6: un archivo en un campo con otro nombre responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('imagen', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.7: un archivo de 0 bytes responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', Buffer.alloc(0), { filename: 'vacio.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.8: sin categories responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.8: categories como lista vacía responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', '[]').expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.9: categories que no es JSON responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', 'no-es-json').expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it.each([
    ['un objeto en vez de lista', '{"id":1,"name":"Teclados"}'],
    ['id 0', '[{"id":0,"name":"Teclados"}]'],
    ['name vacío', '[{"id":1,"name":""}]'],
    ['un campo extra', '[{"id":1,"name":"Teclados","extra":1}]'],
  ])('REQ-2.10: categories con %s responde 400 sin llamar a la IA', async (_label, categories) => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categories).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.11: una petición exitosa no escribe nada en uploads/', async () => {
    app = await appFor(admin);
    ai.generateProductFromImage.mockResolvedValue(suggestion);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(201);
    expect(listUploads()).toEqual([]);
  });

  it('REQ-2.11: una petición rechazada tampoco escribe en uploads/', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', 'no-es-json').expect(400);
    await post().attach('file', png, { filename: 'a.gif', contentType: 'image/gif' }).field('categories', categoriesJson).expect(415);
    expect(listUploads()).toEqual([]);
  });

  it('REQ-2.15: si el proveedor falla responde 502 con OpenAI request failed', async () => {
    app = await appFor(admin);
    ai.generateProductFromImage.mockRejectedValue(new BadGatewayException('OpenAI request failed'));

    const res = await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(502);
    expect((res.body as { message: string }).message).toBe('OpenAI request failed');
  });

  it('REQ-2.16: si la respuesta de la IA es inválida responde 400', async () => {
    app = await appFor(admin);
    ai.generateProductFromImage.mockRejectedValue(new BadRequestException('Invalid AI response format'));

    const res = await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(400);
    expect((res.body as { message: string }).message).toBe('Invalid AI response format');
  });

  it('REQ-2.17: el proveedor recibe el data: URL de la imagen y las categorías interpretadas', async () => {
    app = await appFor(admin);
    ai.generateProductFromImage.mockResolvedValue(suggestion);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(201);

    expect(ai.generateProductFromImage).toHaveBeenCalledTimes(1);
    const [imageUrl, categories] = ai.generateProductFromImage.mock.calls[0] as [string, unknown];
    expect(imageUrl).toBe(`data:image/png;base64,${png.toString('base64')}`);
    expect(categories).toEqual([
      { id: 1, name: 'Teclados' },
      { id: 2, name: 'Mouses' },
    ]);
  });

  const manyCategories = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Categoria ${i + 1}` })));

  it('REQ-2.18: exactamente 200 categorías válidas responde 201', async () => {
    app = await appFor(admin);
    ai.generateProductFromImage.mockResolvedValue(suggestion);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', manyCategories(200)).expect(201);
    expect(ai.generateProductFromImage).toHaveBeenCalledTimes(1);
  });

  it('REQ-2.18: 201 categorías responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', manyCategories(201)).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.19: dos archivos en el campo file responden 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).attach('file', png, { filename: 'b.png', contentType: 'image/png' }).field('categories', categoriesJson).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.20: un segundo campo de texto además de categories responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', categoriesJson).field('extra', 'x').expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });

  it('REQ-2.21: un campo categories de más de 64 KB responde 400 sin llamar a la IA', async () => {
    app = await appFor(admin);
    const huge = JSON.stringify([{ id: 1, name: 'a'.repeat(64 * 1024) }]);
    expect(Buffer.byteLength(huge)).toBeGreaterThan(64 * 1024);

    await post().attach('file', png, { filename: 'a.png', contentType: 'image/png' }).field('categories', huge).expect(400);
    expect(ai.generateProductFromImage).not.toHaveBeenCalled();
  });
});
