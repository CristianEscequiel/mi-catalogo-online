import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../auth/roles/roles.enum';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { OrdersService } from './orders.service';

// Doble de la base: solo se simula la frontera (DataSource/repositorios). El servicio real corre completo.
const makeOrder = (id: number, userId: number, createdAt = new Date('2026-10-01T10:00:00Z')) =>
  Object.assign(new Order(), {
    id,
    userId,
    customerName: 'Ana',
    customerEmail: 'ana@test.local',
    shippingAddress: 'Calle 1',
    total: 100 + id,
    status: OrderStatus.PENDING_PAYMENT,
    createdAt,
    items: [Object.assign(new OrderItem(), { id: id * 10, orderId: id, productId: 9, productName: 'Lapicera', quantity: 2, unitPrice: 50, subtotal: 100 })],
  });

interface Setup {
  service: OrdersService;
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  countCalls: jest.Mock;
}

// `countRows` es lo que "devuelve la base" para el conteo agrupado de líneas, sea cual sea el modo de consulta.
const setup = (stored: Order[], countRows: Array<{ orderId: number; count: unknown }> = [], total = stored.length): Setup => {
  const rows = countRows.map((row) => ({ order_id: row.orderId, orderId: row.orderId, count: row.count }));
  const countCalls = jest.fn();
  const findAndCount = jest.fn().mockResolvedValue([stored, total]);
  const findOne = jest.fn(({ where }: { where: { id: number; userId?: number } }) => Promise.resolve(stored.find((o) => o.id === where.id && (where.userId === undefined || o.userId === where.userId)) ?? null));
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'addSelect', 'from', 'where', 'andWhere', 'groupBy', 'addGroupBy', 'setParameter', 'setParameters', 'innerJoin', 'leftJoin']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.getRawMany = jest.fn(() => {
    countCalls();
    return Promise.resolve(rows);
  });
  const query = jest.fn(() => {
    countCalls();
    return Promise.resolve(rows);
  });
  const repo = { findAndCount, findOne, find: jest.fn().mockResolvedValue([]), query, createQueryBuilder: jest.fn(() => chain) };
  const dataSource = { getRepository: jest.fn(() => repo), createQueryBuilder: jest.fn(() => chain), query };
  return { service: new OrdersService(dataSource as unknown as DataSource), findAndCount, findOne, countCalls };
};

describe('OrdersService.getMyOrders', () => {
  it('REQ-1.1: devuelve { items, total, page, limit, totalPages }', async () => {
    const { service } = setup(
      [makeOrder(2, 7), makeOrder(1, 7)],
      [
        { orderId: 2, count: 3 },
        { orderId: 1, count: 1 },
      ],
      12,
    );

    const result = await service.getMyOrders(7, { page: 1, limit: 5 });

    expect(Object.keys(result).sort()).toEqual(['items', 'limit', 'page', 'total', 'totalPages']);
    expect(result).toMatchObject({ total: 12, page: 1, limit: 5, totalPages: 3 });
    expect(result.items.map((i) => i.id)).toEqual([2, 1]);
  });

  it('REQ-1.2: consulta solo las órdenes del userId recibido', async () => {
    const { service, findAndCount } = setup([makeOrder(1, 7)], [{ orderId: 1, count: 1 }]);

    await service.getMyOrders(7, { page: 1, limit: 10 });

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
  });

  it('REQ-1.3: ordena por createdAt descendente y, a igual fecha, por id descendente', async () => {
    const { service, findAndCount } = setup([makeOrder(1, 7)], [{ orderId: 1, count: 1 }]);

    await service.getMyOrders(7, { page: 1, limit: 10 });

    const options = (findAndCount.mock.calls as unknown[][])[0][0] as { order: Record<string, string> };
    expect(options.order).toEqual({ createdAt: 'DESC', id: 'DESC' });
    expect(Object.keys(options.order)).toEqual(['createdAt', 'id']);
  });

  it('REQ-1.4: itemCount es número aunque la base devuelva el conteo como string', async () => {
    const { service } = setup([makeOrder(1, 7)], [{ orderId: 1, count: '3' }]);

    const { items } = await service.getMyOrders(7, { page: 1, limit: 10 });

    expect(items[0].itemCount).toBe(3);
    expect(Object.keys(items[0]).sort()).toEqual(['createdAt', 'id', 'itemCount', 'status', 'total']);
  });

  it('REQ-1.4: itemCount es 0 si la orden no tiene filas de líneas', async () => {
    const { service } = setup([makeOrder(1, 7), makeOrder(2, 7)], [{ orderId: 2, count: 2 }]);

    const { items } = await service.getMyOrders(7, { page: 1, limit: 10 });

    expect(items.find((i) => i.id === 1)?.itemCount).toBe(0);
    expect(items.find((i) => i.id === 2)?.itemCount).toBe(2);
  });

  it('REQ-1.4: pagina con skip y take sin cargar las líneas', async () => {
    const { service, findAndCount } = setup([makeOrder(1, 7)], [{ orderId: 1, count: 1 }], 25);

    await service.getMyOrders(7, { page: 3, limit: 10 });

    const options = (findAndCount.mock.calls as unknown[][])[0][0] as { skip: number; take: number; relations?: unknown };
    expect(options.skip).toBe(20);
    expect(options.take).toBe(10);
    expect(options.relations).toBeUndefined();
  });

  it('REQ-1.7: sin órdenes devuelve [], total 0, totalPages 0 y no consulta el conteo', async () => {
    const { service, countCalls } = setup([], [], 0);

    const result = await service.getMyOrders(7, { page: 1, limit: 10 });

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    expect(countCalls).not.toHaveBeenCalled();
  });

  it('REQ-1.8: una página fuera de rango devuelve items [] y el total real', async () => {
    const { service } = setup([], [], 12);

    const result = await service.getMyOrders(7, { page: 9, limit: 10 });

    expect(result).toEqual({ items: [], total: 12, page: 9, limit: 10, totalPages: 2 });
  });

  it('REQ-1.10: el servicio filtra por el userId recibido sin distinguir rol (un ADMIN ve solo lo suyo)', async () => {
    const { service, findAndCount } = setup([makeOrder(1, 1)], [{ orderId: 1, count: 1 }]);

    expect(service.getMyOrders.length).toBe(2);
    await service.getMyOrders(1, { page: 1, limit: 10 });

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 1 } }));
  });
});

describe('OrdersService.getOrderByIdForRole', () => {
  it('REQ-2.1: un no ADMIN que pide la orden de otro usuario recibe NotFoundException', async () => {
    const { service } = setup([makeOrder(5, 99)]);

    await expect(service.getOrderByIdForRole(5, 7, Role.CLIENT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('REQ-2.2: el dueño recibe la orden con sus líneas', async () => {
    const { service } = setup([makeOrder(5, 7)]);

    const order = await service.getOrderByIdForRole(5, 7, Role.CLIENT);

    expect(order).toMatchObject({ id: 5, customerName: 'Ana', customerEmail: 'ana@test.local', customerAddress: 'Calle 1' });
    expect(order.items).toEqual([{ productId: 9, productName: 'Lapicera', unitPrice: 50, quantity: 2, subtotal: 100 }]);
  });
});
