import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../test/controller-testing';
import { Payload } from '../auth/models/payload.model';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  const orders = { getAllOrders: jest.fn(), createOrder: jest.fn(), getOrderByIdForRole: jest.fn(), updateStatus: jest.fn() };
  const body = { name: 'Ana', email: 'ana@ejemplo.com', address: 'Calle 123' };
  let app: INestApplication<App>;

  const appFor = (user: Payload) => createControllerApp(OrdersController, [{ provide: OrdersService, useValue: orders }], user);

  beforeEach(() => jest.resetAllMocks());
  afterEach(() => app.close());

  it('POST /orders crea la orden para el usuario autenticado', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });
    orders.createOrder.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer()).post('/orders').send(body).expect(201);
    expect(orders.createOrder).toHaveBeenCalledWith(7, body);
  });

  it('GET /orders/:id pasa el id de la URL y el sub y el rol del token', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });
    orders.getOrderByIdForRole.mockResolvedValue({ id: 9 });

    await request(app.getHttpServer()).get('/orders/9').expect(200);
    expect(orders.getOrderByIdForRole).toHaveBeenCalledWith(9, 7, 'CLIENT');
  });

  it('GET /orders/:id de un ADMIN lleva el rol ADMIN al servicio', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    orders.getOrderByIdForRole.mockResolvedValue({ id: 9 });

    await request(app.getHttpServer()).get('/orders/9').expect(200);
    expect(orders.getOrderByIdForRole).toHaveBeenCalledWith(9, 1, 'ADMIN');
  });

  it('GET /orders (listado completo) responde 403 a un CLIENT y no llega al servicio', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });

    await request(app.getHttpServer()).get('/orders').expect(403);
    expect(orders.getAllOrders).not.toHaveBeenCalled();
  });

  it('GET /orders (listado completo) lo permite a un ADMIN', async () => {
    app = await appFor({ sub: 1, role: 'ADMIN' });
    orders.getAllOrders.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/orders').expect(200);
    expect(orders.getAllOrders).toHaveBeenCalledTimes(1);
  });

  it('PATCH /orders/:id/status es exclusivo de ADMIN', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });

    await request(app.getHttpServer()).patch('/orders/9/status').send({ status: 'PAID' }).expect(403);
    expect(orders.updateStatus).not.toHaveBeenCalled();
  });

  describe('GET /orders/me', () => {
    const prodPipe = { whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } };
    const page = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    const meApp = (user?: Payload) =>
      createControllerApp(OrdersController, [{ provide: OrdersService, useValue: { ...orders, getMyOrders } }], user, [], {
        validationPipeOptions: prodPipe,
        rejectUnauthenticatedWith401: true,
      });
    const getMyOrders = jest.fn();

    beforeEach(() => getMyOrders.mockReset());

    it('REQ-1.1: responde 200 con la página y llama a getMyOrders con el sub del token', async () => {
      app = await meApp({ sub: 7, role: 'CLIENT' });
      getMyOrders.mockResolvedValue(page);

      const res = await request(app.getHttpServer()).get('/orders/me?page=2&limit=5').expect(200);

      expect(res.body).toEqual(page);
      expect(getMyOrders).toHaveBeenCalledWith(7, expect.objectContaining({ page: 2, limit: 5 }));
    });

    it('REQ-1.5: sin parámetros usa page 1 y limit 10', async () => {
      app = await meApp({ sub: 7, role: 'CLIENT' });
      getMyOrders.mockResolvedValue(page);

      await request(app.getHttpServer()).get('/orders/me').expect(200);

      expect(getMyOrders).toHaveBeenCalledWith(7, expect.objectContaining({ page: 1, limit: 10 }));
    });

    it.each([['page=0'], ['limit=51'], ['limit=0'], ['page=abc']])('REQ-1.6: responde 400 con %s y no llega al servicio', async (qs) => {
      app = await meApp({ sub: 7, role: 'CLIENT' });

      await request(app.getHttpServer()).get(`/orders/me?${qs}`).expect(400);
      expect(getMyOrders).not.toHaveBeenCalled();
    });

    it('REQ-1.9: sin usuario autenticado responde 401', async () => {
      app = await meApp(undefined);

      await request(app.getHttpServer()).get('/orders/me').expect(401);
      expect(getMyOrders).not.toHaveBeenCalled();
    });

    it('REQ-1.10: un ADMIN consulta con su propio sub', async () => {
      app = await meApp({ sub: 1, role: 'ADMIN' });
      getMyOrders.mockResolvedValue(page);

      await request(app.getHttpServer()).get('/orders/me').expect(200);

      expect(getMyOrders).toHaveBeenCalledWith(1, expect.anything());
    });

    it('REQ-1.11: se resuelve como listado propio y no como GET /orders/:id', async () => {
      app = await meApp({ sub: 7, role: 'CLIENT' });
      getMyOrders.mockResolvedValue(page);

      await request(app.getHttpServer()).get('/orders/me').expect(200);

      expect(orders.getOrderByIdForRole).not.toHaveBeenCalled();
      expect(getMyOrders).toHaveBeenCalledTimes(1);
    });
  });

  it('REQ-2.1: GET /orders/:id propaga el 404 del servicio para una orden ajena', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });
    orders.getOrderByIdForRole.mockRejectedValue(new NotFoundException('Order with id 9 not found'));

    await request(app.getHttpServer()).get('/orders/9').expect(404);
    expect(orders.getOrderByIdForRole).toHaveBeenCalledWith(9, 7, 'CLIENT');
  });

  it('REQ-2.2: GET /orders/:id devuelve la orden al dueño', async () => {
    app = await appFor({ sub: 7, role: 'CLIENT' });
    const order = { id: 9, items: [{ productId: 1 }] };
    orders.getOrderByIdForRole.mockResolvedValue(order);

    const res = await request(app.getHttpServer()).get('/orders/9').expect(200);
    expect(res.body).toEqual(order);
  });
});
