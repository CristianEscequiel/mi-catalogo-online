import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { Role } from '../src/auth/roles/roles.enum';
import { Status } from '../src/product/models/status.enum';
import { User } from '../src/users/entities/user.entity';
import { asUser, createCatalogApp, createCatalogTestModule, describeWithDb, getStock, resetData, rows, seedCartItem, seedProduct, seedUser } from './catalog-access.helpers';

const checkout = { name: 'Cliente', email: 'cliente@test.local', address: 'Calle Falsa 123, CABA' };

describeWithDb('catalog-access: favoritos, carrito y checkout (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let seller: User;
  let customer: User;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createCatalogTestModule());
    app = await createCatalogApp(moduleRef);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
    seller = await seedUser(dataSource, Role.ADMIN);
    customer = await seedUser(dataSource, Role.CLIENT);
  });

  const me = () => asUser(customer.id, 'CLIENT');
  const patchCart = (productId: number, quantity = 1) => request(app.getHttpServer()).patch(`/cart/items/${productId}`).set('x-test-user', me()).send({ quantity });
  const getCart = () => request(app.getHttpServer()).get('/cart').set('x-test-user', me());
  const placeOrder = () => request(app.getHttpServer()).post('/orders').set('x-test-user', me()).send(checkout);
  const count = async (table: string) => Number((await rows(dataSource, `SELECT count(*)::int AS n FROM "${table}"`))[0].n);
  const setStatus = (productId: number, status: Status) => dataSource.query('UPDATE "products" SET "status" = $1 WHERE "id" = $2', [status, productId]);

  describe('favoritos (REQ-1.5, 1.6)', () => {
    it.each([Status.DRAFT, Status.ARCHIVED])('agregar un producto %s responde 404 y no crea el favorito (REQ-1.5)', async (status) => {
      const product = await seedProduct(dataSource, { userId: seller.id, status });

      await request(app.getHttpServer()).post(`/favorites/${product.id}`).set('x-test-user', me()).expect(404);

      expect(await count('favorites')).toBe(0);
    });

    it('agregar un producto publicado sigue funcionando', async () => {
      const product = await seedProduct(dataSource, { userId: seller.id });

      await request(app.getHttpServer()).post(`/favorites/${product.id}`).set('x-test-user', me()).expect(201);

      expect(await count('favorites')).toBe(1);
    });

    it('el listado omite los productos que dejaron de estar publicados (REQ-1.6)', async () => {
      const visible = await seedProduct(dataSource, { userId: seller.id, name: 'Visible' });
      const hidden = await seedProduct(dataSource, { userId: seller.id, name: 'Retirado' });
      const favorites = dataSource.getRepository(Favorite);
      await favorites.save([favorites.create({ userId: customer.id, productId: visible.id }), favorites.create({ userId: customer.id, productId: hidden.id })]);
      await setStatus(hidden.id, Status.ARCHIVED);

      const response = await request(app.getHttpServer()).get('/favorites').set('x-test-user', me()).expect(200);

      expect((response.body as Array<{ name: string }>).map((product) => product.name)).toEqual(['Visible']);
    });
  });

  describe('carrito (REQ-4.1, 4.2)', () => {
    it.each([Status.DRAFT, Status.ARCHIVED])('agregar un producto %s responde 404 y no modifica el carrito (REQ-4.1)', async (status) => {
      const product = await seedProduct(dataSource, { userId: seller.id, status });

      await patchCart(product.id).expect(404);

      expect(await count('cart_items')).toBe(0);
    });

    it('un producto publicado se agrega con normalidad', async () => {
      const product = await seedProduct(dataSource, { userId: seller.id, price: 10, stock: 5 });

      const response = await patchCart(product.id, 2).expect(200);

      expect(response.body).toMatchObject({ total: 20, items: [{ productId: product.id, quantity: 2 }] });
    });

    it('un producto archivado después de estar en el carrito sigue listado y se puede quitar (REQ-4.2)', async () => {
      const product = await seedProduct(dataSource, { userId: seller.id, name: 'Se retira' });
      await seedCartItem(dataSource, customer.id, product.id, 1);
      await setStatus(product.id, Status.ARCHIVED);

      const cart = await getCart().expect(200);
      expect((cart.body as { items: Array<{ name: string }> }).items.map((item) => item.name)).toEqual(['Se retira']);

      await request(app.getHttpServer()).delete(`/cart/items/${product.id}`).set('x-test-user', me()).expect(200);
      expect(await count('cart_items')).toBe(0);
    });
  });

  describe('checkout (REQ-4.3, 4.4, 4.5)', () => {
    it.each([Status.DRAFT, Status.ARCHIVED])('con un producto %s rechaza la orden completa con 400 nombrándolo (REQ-4.3)', async (status) => {
      const good = await seedProduct(dataSource, { userId: seller.id, name: 'Bueno', price: 10, stock: 5 });
      const bad = await seedProduct(dataSource, { userId: seller.id, name: 'Retirado', price: 10, stock: 5 });
      await seedCartItem(dataSource, customer.id, good.id, 2);
      await seedCartItem(dataSource, customer.id, bad.id, 1);
      await setStatus(bad.id, status);

      const response = await placeOrder().expect(400);

      expect((response.body as { message: string }).message).toContain('Retirado');
      expect(await getStock(dataSource, good.id)).toBe(5);
      expect(await getStock(dataSource, bad.id)).toBe(5);
      expect(await count('orders')).toBe(0);
      expect(await count('order_items')).toBe(0);
      expect(await count('cart_items')).toBe(2); // el carrito se conserva
    });

    it('con todos los productos publicados se comporta como antes (REQ-4.4)', async () => {
      const a = await seedProduct(dataSource, { userId: seller.id, name: 'A', price: 0.1, stock: 5 });
      const b = await seedProduct(dataSource, { userId: seller.id, name: 'B', price: 4, stock: 9 });
      await seedCartItem(dataSource, customer.id, a.id, 3);
      await seedCartItem(dataSource, customer.id, b.id, 2);

      const response = await placeOrder().expect(201);

      expect((response.body as { total: number }).total).toBe(8.3);
      expect(await getStock(dataSource, a.id)).toBe(2);
      expect(await getStock(dataSource, b.id)).toBe(7);
      expect(await count('cart_items')).toBe(0);
    });

    it('una orden ya creada se lee igual aunque el producto deje de estar publicado (REQ-4.5)', async () => {
      const product = await seedProduct(dataSource, { userId: seller.id, name: 'Vendido', price: 25, stock: 4 });
      await seedCartItem(dataSource, customer.id, product.id, 2);
      const created = (await placeOrder().expect(201)).body as { id: number; total: number; items: Array<{ productName: string; unitPrice: number }> };

      await setStatus(product.id, Status.ARCHIVED);
      const fetched = await request(app.getHttpServer()).get(`/orders/${created.id}`).set('x-test-user', me()).expect(200);

      const detail = fetched.body as { total: number; items: Array<{ productName: string; unitPrice: number }> };
      expect(detail.total).toBe(created.total);
      expect(detail.items).toEqual(created.items);
      expect(detail.items[0]).toMatchObject({ productName: 'Vendido', unitPrice: 25 });
    });
  });
});
