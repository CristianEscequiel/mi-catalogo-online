import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OrderStatus } from '../src/orders/entities/order-status.enum';
import { Order } from '../src/orders/entities/order.entity';
import { OrderExpirationService } from '../src/orders/order-expiration.service';
import { OrdersService } from '../src/orders/orders.service';
import { User } from '../src/users/entities/user.entity';
import { createOrdersTestModule, describeWithDb, getStock, resetData, seedOrder, seedProduct, seedUser } from './orders-integrity.helpers';

const { PENDING_PAYMENT, PAID, DELIVERED, CANCELLED } = OrderStatus;

describeWithDb('orders: vencimiento automático (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let orders: OrdersService;
  let expiration: OrderExpirationService;
  let customer: User;
  let errorLog: jest.SpyInstance;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createOrdersTestModule());
    orders = moduleRef.get(OrdersService);
    expiration = moduleRef.get(OrderExpirationService); // sin ORDER_PAYMENT_TTL_HOURS → 48 h
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
    customer = await seedUser(dataSource);
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Una orden de 2 unidades de un producto propio (stock 10 ya descontado), creada hace `hoursAgo` horas.
  const seedAged = async (status: OrderStatus, hoursAgo: number, stock = 10) => {
    const product = await seedProduct(dataSource, { userId: customer.id, stock });
    const order = await seedOrder(dataSource, { userId: customer.id, status, createdAtHoursAgo: hoursAgo, items: [{ productId: product.id, quantity: 2, unitPrice: 10 }] });
    return { order, product };
  };

  const statusOf = async (orderId: number) => (await dataSource.getRepository(Order).findOneByOrFail({ id: orderId })).status;

  it('cancela solo la PENDING_PAYMENT vencida y le devuelve el stock; ignora recientes y otros estados (REQ-5.1, 5.6)', async () => {
    const stale = await seedAged(PENDING_PAYMENT, 50);
    const recent = await seedAged(PENDING_PAYMENT, 1);
    const oldPaid = await seedAged(PAID, 100);
    const oldDelivered = await seedAged(DELIVERED, 100);
    const oldCancelled = await seedAged(CANCELLED, 100);

    expect(await expiration.run()).toBe(1);

    expect(await statusOf(stale.order.id)).toBe(CANCELLED);
    expect(await getStock(dataSource, stale.product.id)).toBe(12);
    for (const untouched of [recent, oldPaid, oldDelivered, oldCancelled]) {
      expect(await getStock(dataSource, untouched.product.id)).toBe(10);
    }
    expect(await statusOf(recent.order.id)).toBe(PENDING_PAYMENT);
    expect(await statusOf(oldPaid.order.id)).toBe(PAID);
    expect(await statusOf(oldDelivered.order.id)).toBe(DELIVERED);
    expect(await statusOf(oldCancelled.order.id)).toBe(CANCELLED);
  });

  it('respeta el límite exacto del plazo: 47.9 h no vence y 48.1 h sí (REQ-5.1)', async () => {
    const almost = await seedAged(PENDING_PAYMENT, 47.9);
    const over = await seedAged(PENDING_PAYMENT, 48.1);

    await expiration.run();

    expect(await statusOf(almost.order.id)).toBe(PENDING_PAYMENT);
    expect(await statusOf(over.order.id)).toBe(CANCELLED);
  });

  it('usa el plazo configurado en ORDER_PAYMENT_TTL_HOURS (REQ-5.2)', async () => {
    const twoHoursOld = await seedAged(PENDING_PAYMENT, 2);
    const oneHour = new OrderExpirationService({ get: () => '1' } as unknown as ConfigService, orders);

    expect(await expiration.run()).toBe(0); // con 48 h no vence
    expect(await oneHour.run()).toBe(1); // con 1 h sí

    expect(await statusOf(twoHoursOld.order.id)).toBe(CANCELLED);
  });

  it('una segunda ejecución sobre las mismas órdenes no devuelve el stock otra vez (REQ-5.9)', async () => {
    const { order, product } = await seedAged(PENDING_PAYMENT, 60);

    expect(await expiration.run()).toBe(1);
    expect(await expiration.run()).toBe(0);

    expect(await statusOf(order.id)).toBe(CANCELLED);
    expect(await getStock(dataSource, product.id)).toBe(12);
  });

  it('dos ejecuciones simultáneas devuelven el stock una sola vez (REQ-5.9)', async () => {
    const { order, product } = await seedAged(PENDING_PAYMENT, 60);

    const [a, b] = await Promise.all([expiration.run(), expiration.run()]);

    expect(a + b).toBe(1);
    expect(await statusOf(order.id)).toBe(CANCELLED);
    expect(await getStock(dataSource, product.id)).toBe(12);
  });

  it('una orden ya cancelada a mano antes de la revisión no suma el stock dos veces (REQ-4.4, 5.9)', async () => {
    const { order, product } = await seedAged(PENDING_PAYMENT, 60);

    await orders.updateStatus(order.id, CANCELLED);
    expect(await getStock(dataSource, product.id)).toBe(12);

    expect(await expiration.run()).toBe(0);
    expect(await getStock(dataSource, product.id)).toBe(12);
  });

  it('si una orden falla, registra su id y sigue con las demás sin tocar la que falló (REQ-5.7, 5.8)', async () => {
    const broken = await seedAged(PENDING_PAYMENT, 70, 2147483647); // sumar al stock desborda el integer
    const healthy = await seedAged(PENDING_PAYMENT, 60);

    expect(await expiration.run()).toBe(1);

    expect(await statusOf(broken.order.id)).toBe(PENDING_PAYMENT);
    expect(await getStock(dataSource, broken.product.id)).toBe(2147483647);
    expect(await statusOf(healthy.order.id)).toBe(CANCELLED);
    expect(await getStock(dataSource, healthy.product.id)).toBe(12);

    expect(errorLog).toHaveBeenCalledTimes(1);
    const [message] = errorLog.mock.calls[0] as [string];
    expect(message).toContain(`orden ${broken.order.id}:`);
    expect(message).not.toContain(customer.email); // sin datos personales (NFR-3)
    expect(message).not.toContain('Cliente');
  });
});
