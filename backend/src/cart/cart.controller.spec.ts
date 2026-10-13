import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../test/controller-testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let app: INestApplication<App>;
  const cart = { findAllByUser: jest.fn(), upsertItem: jest.fn(), removeItem: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    app = await createControllerApp(CartController, [{ provide: CartService, useValue: cart }], { sub: 7, role: 'CLIENT' });
  });

  afterEach(() => app.close());

  it('GET /cart pide el carrito del usuario autenticado', async () => {
    cart.findAllByUser.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/cart').expect(200);
    expect(cart.findAllByUser).toHaveBeenCalledWith(7);
  });

  it('PATCH /cart/items/:productId usa el sub del token, el producto de la URL y la cantidad del body', async () => {
    cart.upsertItem.mockResolvedValue({});

    await request(app.getHttpServer()).patch('/cart/items/5').send({ quantity: 3 }).expect(200);
    expect(cart.upsertItem).toHaveBeenCalledWith(7, 5, 3);
  });

  it('DELETE /cart/items/:productId borra del carrito del usuario autenticado', async () => {
    cart.removeItem.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/cart/items/5').expect(200);
    expect(cart.removeItem).toHaveBeenCalledWith(7, 5);
  });

  it('no deja a un cliente indicar de quién es el carrito: un userId en el body se rechaza', async () => {
    await request(app.getHttpServer()).patch('/cart/items/5').send({ quantity: 3, userId: 99 }).expect(400);
    expect(cart.upsertItem).not.toHaveBeenCalled();
  });

  it('sin usuario autenticado no llega al servicio', async () => {
    const anon = await createControllerApp(CartController, [{ provide: CartService, useValue: cart }]);

    await request(anon.getHttpServer()).get('/cart').expect(403);
    expect(cart.findAllByUser).not.toHaveBeenCalled();
    await anon.close();
  });
});
