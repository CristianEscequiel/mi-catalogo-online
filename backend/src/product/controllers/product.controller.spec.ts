import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../../test/controller-testing';
import { AiContentGenerator } from '../../ai/ai-content-generator.port';
import { AiThrottlerGuard } from '../../ai/ai-throttler.guard';
import { Payload } from '../../auth/models/payload.model';
import { ProductService } from '../services/product.service';
import { ProductController } from './product.controller';

describe('ProductController', () => {
  const products = { create: jest.fn(), update: jest.fn(), publish: jest.fn(), remove: jest.fn(), uploadImage: jest.fn(), deleteImage: jest.fn() };
  const ai = { generateProductContent: jest.fn(), generateProductFromImage: jest.fn() };
  const newProduct = { name: 'Teclado', status: 'PUBLISHED' };
  let app: INestApplication<App>;

  const appFor = (user?: Payload) =>
    createControllerApp(
      ProductController,
      [
        { provide: ProductService, useValue: products },
        { provide: AiContentGenerator, useValue: ai },
      ],
      user,
      [AiThrottlerGuard],
    );

  beforeEach(() => jest.resetAllMocks());
  afterEach(() => app.close());

  it('POST /products de un GUEST pasa al servicio su sub y su rol', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    products.create.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer()).post('/products').send(newProduct).expect(201);
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Teclado' }), 7, 'GUEST');
  });

  it('POST /products de un ADMIN pasa su sub y el rol ADMIN', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    products.create.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer()).post('/products').send(newProduct).expect(201);
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Teclado' }), 1, 'ADMIN');
  });

  it('POST /products de un CLIENT se rechaza por rol antes del servicio', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });

    await request(app.getHttpServer()).post('/products').send(newProduct).expect(403);
    expect(products.create).not.toHaveBeenCalled();
  });

  it('PUT /products/:id entrega al servicio el usuario completo como actor', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    products.update.mockResolvedValue({ id: 3 });

    await request(app.getHttpServer()).put('/products/3').send({ name: 'Nuevo' }).expect(200);
    expect(products.update).toHaveBeenCalledWith(3, expect.objectContaining({ name: 'Nuevo' }), { sub: 7, role: 'GUEST' });
  });

  it('PUT /products/:id/publish usa el sub del token', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    products.publish.mockResolvedValue({ id: 3 });

    await request(app.getHttpServer()).put('/products/3/publish').expect(200);
    expect(products.publish).toHaveBeenCalledWith(3, 7);
  });

  it('DELETE /products/:id entrega el usuario como actor', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    products.remove.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/products/3').expect(200);
    expect(products.remove).toHaveBeenCalledWith(3, { sub: 1, role: 'ADMIN' });
  });

  it('DELETE /products/:id/image entrega el usuario como actor', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    products.deleteImage.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/products/3/image').expect(200);
    expect(products.deleteImage).toHaveBeenCalledWith(3, { sub: 7, role: 'GUEST' });
  });

  it('POST /products/:id/image sin archivo responde 400 y no llega al servicio', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });

    await request(app.getHttpServer()).post('/products/3/image').expect(400);
    expect(products.uploadImage).not.toHaveBeenCalled();
  });

  it('sin usuario autenticado ninguna ruta protegida llega al servicio', async () => {
    app = await appFor();

    await request(app.getHttpServer()).delete('/products/3').expect(403);
    expect(products.remove).not.toHaveBeenCalled();
  });

  it('GET /products/generate-ai/:name delega en la IA con el nombre de la URL', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    ai.generateProductContent.mockResolvedValue({ description: 'Teclado', slug: 'teclado' });

    await request(app.getHttpServer()).get('/products/generate-ai/Teclado').expect(200);
    expect(ai.generateProductContent).toHaveBeenCalledWith('Teclado');
  });

  it('POST /products/generate-from-image delega en la IA con la imagen y las categorías', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    const body = { imageUrl: '/uploads/products/a.png', categories: [{ id: 1, name: 'Teclados' }] };
    ai.generateProductFromImage.mockResolvedValue({ name: 'Teclado' });

    await request(app.getHttpServer()).post('/products/generate-from-image').send(body).expect(201);
    expect(ai.generateProductFromImage).toHaveBeenCalledWith(body.imageUrl, body.categories);
  });
});
