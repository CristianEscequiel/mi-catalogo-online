import { BadRequestException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CartItem } from '../src/cart/entities/cart-item.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { OrdersService } from '../src/orders/orders.service';
import { Product } from '../src/product/entities/product.entity';
import { User } from '../src/users/entities/user.entity';
import { createOrdersTestModule, describeWithDb, getStock, resetData, rows, seedCartItem, seedProduct, seedUser } from './orders-integrity.helpers';

const checkout = { name: 'Cliente', email: 'cliente@test.local', address: 'Calle Falsa 123, CABA' };

describeWithDb('orders-integrity (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let orders: OrdersService;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createOrdersTestModule());
    orders = moduleRef.get(OrdersService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
  });

  const count = (entity: typeof Order | typeof OrderItem | typeof CartItem) => dataSource.getRepository(entity).count();

  describe('arnés', () => {
    it('inserta y lee un producto con precio numeric como number', async () => {
      const user = await seedUser(dataSource);
      const product = await seedProduct(dataSource, { userId: user.id, price: 12.5, stock: 3 });

      const found = await dataSource.getRepository(Product).findOneByOrFail({ id: product.id });
      expect(found.price).toBe(12.5);
      expect(await getStock(dataSource, product.id)).toBe(3);
    });
  });

  describe('createOrder (REQ-1, REQ-2.2, REQ-2.5)', () => {
    it('descuenta exactamente la cantidad pedida y vacía el carrito (REQ-1.1)', async () => {
      const user = await seedUser(dataSource);
      const a = await seedProduct(dataSource, { userId: user.id, name: 'A', price: 10, stock: 5 });
      const b = await seedProduct(dataSource, { userId: user.id, name: 'B', price: 4, stock: 9 });
      await seedCartItem(dataSource, user.id, a.id, 2);
      await seedCartItem(dataSource, user.id, b.id, 3);

      const order = await orders.createOrder(user.id, checkout);

      expect(await getStock(dataSource, a.id)).toBe(3);
      expect(await getStock(dataSource, b.id)).toBe(6);
      expect(order.total).toBe(32);
      expect(order.items).toHaveLength(2);
      expect(order.allowedTransitions).toEqual(['PAID', 'CANCELLED']);
      expect(await count(CartItem)).toBe(0);
    });

    it('10 checkouts simultáneos con stock 3 → exactamente 3 órdenes y stock 0 (REQ-1.2)', async () => {
      const owner = await seedUser(dataSource);
      const product = await seedProduct(dataSource, { userId: owner.id, price: 10, stock: 3 });
      const buyers: User[] = [];
      for (let i = 0; i < 10; i += 1) {
        const buyer = await seedUser(dataSource);
        await seedCartItem(dataSource, buyer.id, product.id, 1);
        buyers.push(buyer);
      }

      const results = await Promise.allSettled(buyers.map((buyer) => orders.createOrder(buyer.id, checkout)));

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(fulfilled).toHaveLength(3);
      expect(rejected).toHaveLength(7);
      for (const r of rejected) {
        expect(r.reason).toBeInstanceOf(BadRequestException);
      }
      expect(await getStock(dataSource, product.id)).toBe(0);
      expect(await count(Order)).toBe(3);
    });

    it('checkouts simultáneos con varios productos no se traban entre sí (sin deadlock)', async () => {
      const owner = await seedUser(dataSource);
      const a = await seedProduct(dataSource, { userId: owner.id, name: 'A', stock: 3 });
      const b = await seedProduct(dataSource, { userId: owner.id, name: 'B', stock: 3 });
      const buyers: User[] = [];
      for (let i = 0; i < 8; i += 1) {
        const buyer = await seedUser(dataSource);
        // se agregan en orden distinto a propósito
        await seedCartItem(dataSource, buyer.id, i % 2 === 0 ? a.id : b.id, 1);
        await seedCartItem(dataSource, buyer.id, i % 2 === 0 ? b.id : a.id, 1);
        buyers.push(buyer);
      }

      const results = await Promise.allSettled(buyers.map((buyer) => orders.createOrder(buyer.id, checkout)));

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
      for (const r of results) {
        if (r.status === 'rejected') {
          expect(r.reason).toBeInstanceOf(BadRequestException); // nunca "deadlock detected"
        }
      }
      expect(await getStock(dataSource, a.id)).toBe(0);
      expect(await getStock(dataSource, b.id)).toBe(0);
    });

    it('si un producto no alcanza, aborta todo: stock intacto, sin orden, carrito conservado (REQ-1.3, 1.4)', async () => {
      const user = await seedUser(dataSource);
      const a = await seedProduct(dataSource, { userId: user.id, name: 'Alcanza', stock: 5 });
      const b = await seedProduct(dataSource, { userId: user.id, name: 'No alcanza', stock: 1 });
      await seedCartItem(dataSource, user.id, a.id, 2);
      await seedCartItem(dataSource, user.id, b.id, 2);

      await expect(orders.createOrder(user.id, checkout)).rejects.toThrow(/No alcanza/);

      expect(await getStock(dataSource, a.id)).toBe(5);
      expect(await getStock(dataSource, b.id)).toBe(1);
      expect(await count(Order)).toBe(0);
      expect(await count(OrderItem)).toBe(0);
      expect(await count(CartItem)).toBe(2);
    });

    it('carrito vacío → 400 y no crea orden (REQ-1.5)', async () => {
      const user = await seedUser(dataSource);
      await expect(orders.createOrder(user.id, checkout)).rejects.toThrow(BadRequestException);
      expect(await count(Order)).toBe(0);
    });

    it.each([
      ['sin precio (NULL)', null],
      ['con precio 0', 0],
    ])('producto %s → 400 con el nombre y sin orden (REQ-2.5)', async (_label, price) => {
      const user = await seedUser(dataSource);
      const free = await seedProduct(dataSource, { userId: user.id, name: 'Consultar precio', price, stock: 5 });
      await seedCartItem(dataSource, user.id, free.id, 1);

      await expect(orders.createOrder(user.id, checkout)).rejects.toThrow(/Consultar precio/);

      expect(await count(Order)).toBe(0);
      expect(await getStock(dataSource, free.id)).toBe(5);
      expect(await count(CartItem)).toBe(1);
    });

    it('3 unidades a 0.10 → total 0.3 exacto en la base y en la respuesta (REQ-2.2, 2.3)', async () => {
      const user = await seedUser(dataSource);
      const product = await seedProduct(dataSource, { userId: user.id, price: 0.1, stock: 10 });
      await seedCartItem(dataSource, user.id, product.id, 3);

      const order = await orders.createOrder(user.id, checkout);

      expect(order.total).toBe(0.3);
      expect(order.items[0]).toMatchObject({ unitPrice: 0.1, quantity: 3, subtotal: 0.3 });
      const [row] = await rows(dataSource, `SELECT total::text AS total FROM orders WHERE id = $1`, [order.id]);
      expect(row.total).toBe('0.30');
    });
  });
});
