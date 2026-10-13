import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../../test/controller-testing';
import { Payload } from '../../auth/models/payload.model';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';
import { CategoryController } from './category.controller';

describe('CategoryController', () => {
  const categories = { create: jest.fn(), update: jest.fn(), remove: jest.fn(), uploadImage: jest.fn(), deleteImage: jest.fn() };
  let app: INestApplication<App>;

  const appFor = (user?: Payload) =>
    createControllerApp(
      CategoryController,
      [
        { provide: CategoryService, useValue: categories },
        { provide: ProductService, useValue: {} },
      ],
      user,
    );

  beforeEach(() => jest.resetAllMocks());
  afterEach(() => app.close());

  it('POST /categories de un GUEST pasa al servicio su sub y su rol', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    categories.create.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer()).post('/categories').send({ name: 'Teclados', description: 'Periféricos' }).expect(201);
    expect(categories.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Teclados' }), 7, 'GUEST');
  });

  it('POST /categories de un ADMIN pasa su sub y el rol ADMIN', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    categories.create.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer()).post('/categories').send({ name: 'Teclados', description: 'Periféricos' }).expect(201);
    expect(categories.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Teclados' }), 1, 'ADMIN');
  });

  it('POST /categories de un CLIENT se rechaza por rol antes del servicio', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });

    await request(app.getHttpServer()).post('/categories').send({ name: 'Teclados', description: 'Periféricos' }).expect(403);
    expect(categories.create).not.toHaveBeenCalled();
  });

  it('PUT /categories/:id entrega al servicio el usuario completo como actor', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    categories.update.mockResolvedValue({ id: 2 });

    await request(app.getHttpServer()).put('/categories/2').send({ name: 'Nuevo' }).expect(200);
    expect(categories.update).toHaveBeenCalledWith(2, expect.objectContaining({ name: 'Nuevo' }), { sub: 7, role: 'GUEST' });
  });

  it('DELETE /categories/:id entrega el usuario como actor', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    categories.remove.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/categories/2').expect(200);
    expect(categories.remove).toHaveBeenCalledWith(2, { sub: 1, role: 'ADMIN' });
  });

  it('DELETE /categories/:id/image entrega el usuario como actor', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });
    categories.deleteImage.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/categories/2/image').expect(200);
    expect(categories.deleteImage).toHaveBeenCalledWith(2, { sub: 7, role: 'GUEST' });
  });

  it('POST /categories/:id/image sin archivo responde 400 y no llega al servicio', async () => {
    app = await appFor({ sub: 7, role: 'GUEST' });

    await request(app.getHttpServer()).post('/categories/2/image').expect(400);
    expect(categories.uploadImage).not.toHaveBeenCalled();
  });

  it('sin usuario autenticado ninguna ruta protegida llega al servicio', async () => {
    app = await appFor();

    await request(app.getHttpServer()).delete('/categories/2').expect(403);
    expect(categories.remove).not.toHaveBeenCalled();
  });
});
