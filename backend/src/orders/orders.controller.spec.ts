import { INestApplication } from '@nestjs/common';
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
});
