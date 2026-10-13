import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { OrderStatus } from '../src/orders/entities/order-status.enum';
import { Order } from '../src/orders/entities/order.entity';
import { User } from '../src/users/entities/user.entity';
import { asUser, createHttpApp, createOrdersTestModule, describeWithDb, getStock, resetData, seedOrder, seedProduct, seedUser } from './orders-integrity.helpers';

const { PENDING_PAYMENT, PAID, DELIVERED, CANCELLED } = OrderStatus;

describeWithDb('orders: estados y devolución de stock (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let customer: User;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createOrdersTestModule());
    app = await createHttpApp(moduleRef);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
    customer = await seedUser(dataSource);
  });

  const patch = (orderId: number, status: string, user = asUser(1, 'ADMIN')) => request(app.getHttpServer()).patch(`/orders/${orderId}/status`).set('x-test-user', user).send({ status });

  const statusOf = async (orderId: number) => (await dataSource.getRepository(Order).findOneByOrFail({ id: orderId })).status;

  // Fuerza la carrera: el test retiene FOR UPDATE sobre la orden, deja que las solicitudes lleguen y recién
  // entonces lo libera. Con el lock real quedan encoladas y se serializan; sin lock, todas leen el estado viejo.
  const concurrently = async (orderId: number, requests: Array<() => request.Test>) => {
    const holder = dataSource.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await holder.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    const pending = Promise.all(requests.map((send) => send()));
    await new Promise((resolve) => setTimeout(resolve, 400));
    await holder.commitTransaction();
    await holder.release();
    return pending;
  };

  // Orden con dos productos ya descontados del stock (como queda después del checkout).
  const seedOrderWithTwoProducts = async (status: OrderStatus) => {
    const a = await seedProduct(dataSource, { userId: customer.id, name: 'A', stock: 3 });
    const b = await seedProduct(dataSource, { userId: customer.id, name: 'B', stock: 7 });
    const order = await seedOrder(dataSource, {
      userId: customer.id,
      status,
      items: [
        { productId: a.id, productName: 'A', quantity: 2, unitPrice: 10 },
        { productId: b.id, productName: 'B', quantity: 5, unitPrice: 4 },
      ],
    });
    return { order, a, b };
  };

  describe('transiciones (REQ-3)', () => {
    it.each([
      [PENDING_PAYMENT, PAID, ['DELIVERED', 'CANCELLED']],
      [PENDING_PAYMENT, CANCELLED, []],
      [PAID, DELIVERED, []],
      [PAID, CANCELLED, []],
    ])('ADMIN: %s → %s responde 200 con id, estado y allowedTransitions (REQ-3.1)', async (from, to, allowed) => {
      const { order } = await seedOrderWithTwoProducts(from);

      const res = await patch(order.id, to);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: order.id, status: to, allowedTransitions: allowed });
      expect(await statusOf(order.id)).toBe(to);
    });

    it.each([
      [DELIVERED, PENDING_PAYMENT],
      [DELIVERED, CANCELLED],
      [CANCELLED, PAID],
      [CANCELLED, CANCELLED],
      [PENDING_PAYMENT, DELIVERED],
      [PAID, PENDING_PAYMENT],
      [PAID, PAID],
    ])('transición no permitida %s → %s: 409 con ambos estados y orden sin cambios (REQ-3.2)', async (from, to) => {
      const { order } = await seedOrderWithTwoProducts(from);

      const res = await patch(order.id, to);

      expect(res.status).toBe(409);
      const { message } = res.body as { message: string };
      expect(message).toContain(from);
      expect(message).toContain(to);
      expect(await statusOf(order.id)).toBe(from);
    });

    it('estado fuera del enum → 400 (REQ-3.3)', async () => {
      const { order } = await seedOrderWithTwoProducts(PENDING_PAYMENT);
      expect((await patch(order.id, 'ENVIADO')).status).toBe(400);
      expect(await statusOf(order.id)).toBe(PENDING_PAYMENT);
    });

    it('orden inexistente → 404 (REQ-3.4)', async () => {
      expect((await patch(99999, PAID)).status).toBe(404);
    });

    it.each(['CLIENT', 'GUEST'] as const)('usuario %s → 403 y orden sin cambios (REQ-3.6)', async (role) => {
      const { order } = await seedOrderWithTwoProducts(PENDING_PAYMENT);

      const res = await patch(order.id, PAID, asUser(customer.id, role));

      expect(res.status).toBe(403);
      expect(await statusOf(order.id)).toBe(PENDING_PAYMENT);
    });

    it('dos cambios simultáneos sobre la misma orden → uno 200 y otro 409 (REQ-3.5)', async () => {
      const { order } = await seedOrderWithTwoProducts(PENDING_PAYMENT);

      const results = await concurrently(order.id, [() => patch(order.id, PAID), () => patch(order.id, PAID), () => patch(order.id, PAID)]);

      const codes = results.map((r) => r.status).sort();
      expect(codes).toEqual([200, 409, 409]);
      expect(await statusOf(order.id)).toBe(PAID);
    });
  });

  describe('devolución de stock (REQ-4)', () => {
    it.each([PENDING_PAYMENT, PAID])('cancelar desde %s suma al stock la cantidad de cada ítem (REQ-4.1)', async (from) => {
      const { order, a, b } = await seedOrderWithTwoProducts(from);

      expect((await patch(order.id, CANCELLED)).status).toBe(200);

      expect(await getStock(dataSource, a.id)).toBe(3 + 2);
      expect(await getStock(dataSource, b.id)).toBe(7 + 5);
    });

    it('cancelar dos veces devuelve el stock una sola vez (REQ-4.4)', async () => {
      const { order, a } = await seedOrderWithTwoProducts(PENDING_PAYMENT);

      expect((await patch(order.id, CANCELLED)).status).toBe(200);
      expect((await patch(order.id, CANCELLED)).status).toBe(409);

      expect(await getStock(dataSource, a.id)).toBe(5);
    });

    it('cancelaciones simultáneas devuelven el stock una sola vez (REQ-3.5, 4.4)', async () => {
      const { order, a, b } = await seedOrderWithTwoProducts(PENDING_PAYMENT);

      const results = await concurrently(order.id, [() => patch(order.id, CANCELLED), () => patch(order.id, CANCELLED), () => patch(order.id, CANCELLED)]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
      expect(await getStock(dataSource, a.id)).toBe(5);
      expect(await getStock(dataSource, b.id)).toBe(12);
    });

    it('PAID y DELIVERED no tocan el stock (REQ-4.5)', async () => {
      const { order, a, b } = await seedOrderWithTwoProducts(PENDING_PAYMENT);

      expect((await patch(order.id, PAID)).status).toBe(200);
      expect((await patch(order.id, DELIVERED)).status).toBe(200);

      expect(await getStock(dataSource, a.id)).toBe(3);
      expect(await getStock(dataSource, b.id)).toBe(7);
    });

    it('restock sobre stock NULL lo trata como 0', async () => {
      const product = await seedProduct(dataSource, { userId: customer.id, stock: null });
      const order = await seedOrder(dataSource, { userId: customer.id, items: [{ productId: product.id, quantity: 4, unitPrice: 10 }] });

      expect((await patch(order.id, CANCELLED)).status).toBe(200);

      expect(await getStock(dataSource, product.id)).toBe(4);
    });

    it('si falla la devolución de un ítem, el estado y el stock de TODOS quedan como estaban (REQ-4.2, 4.3)', async () => {
      const first = await seedProduct(dataSource, { userId: customer.id, name: 'Primero', stock: 3 });
      const second = await seedProduct(dataSource, { userId: customer.id, name: 'Segundo', stock: 2147483647 }); // integer máximo: sumar desborda
      const order = await seedOrder(dataSource, {
        userId: customer.id,
        items: [
          { productId: first.id, quantity: 2, unitPrice: 10 },
          { productId: second.id, quantity: 1, unitPrice: 10 },
        ],
      });

      const res = await patch(order.id, CANCELLED);

      expect(res.status).toBe(500);
      expect(await statusOf(order.id)).toBe(PENDING_PAYMENT);
      expect(await getStock(dataSource, first.id)).toBe(3); // el primer ítem se revirtió
      expect(await getStock(dataSource, second.id)).toBe(2147483647);
    });
  });

  describe('lecturas con allowedTransitions (REQ-6.1, 6.2, NFR-4)', () => {
    it('GET /orders/:id (ADMIN) incluye allowedTransitions y conserva los campos actuales', async () => {
      const { order } = await seedOrderWithTwoProducts(PAID);

      const res = await request(app.getHttpServer()).get(`/orders/${order.id}`).set('x-test-user', asUser(1, 'ADMIN'));

      expect(res.status).toBe(200);
      expect((res.body as { allowedTransitions: string[] }).allowedTransitions).toEqual(['DELIVERED', 'CANCELLED']);
      expect(res.body).toMatchObject({ id: order.id, status: 'PAID', customerName: 'Cliente', total: 40 });
      expect((res.body as { items: unknown[] }).items).toHaveLength(2);
    });

    it('GET /orders (ADMIN) incluye allowedTransitions por orden', async () => {
      await seedOrderWithTwoProducts(DELIVERED);
      await seedOrderWithTwoProducts(PENDING_PAYMENT);

      const res = await request(app.getHttpServer()).get('/orders').set('x-test-user', asUser(1, 'ADMIN'));

      expect(res.status).toBe(200);
      const byStatus = Object.fromEntries((res.body as Array<{ status: string; allowedTransitions: string[] }>).map((o): [string, string[]] => [o.status, o.allowedTransitions]));
      expect(byStatus).toEqual({ DELIVERED: [], PENDING_PAYMENT: ['PAID', 'CANCELLED'] });
    });
  });
});
