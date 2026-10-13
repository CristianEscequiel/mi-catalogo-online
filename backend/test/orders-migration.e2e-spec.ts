import { DataSource } from 'typeorm';
import { AddEmailVerify1776269542564 } from '../src/database/migrations/1776269542564-add-email-verify';
import { AddResetPass1776436587568 } from '../src/database/migrations/1776436587568-add-reset-pass';
import { AddOrderStatusAndItemSnapshot1778100000000 } from '../src/database/migrations/1778100000000-add_order_status_and_item_snapshot';
import { Init1775049641434 } from '../src/database/migrations/1775049641434-init';
import { dbOptions, describeWithDb, rows } from './orders-integrity.helpers';

const MIGRATION_DB = 'orders_it_migration';
const PREVIOUS_MIGRATIONS = [Init1775049641434, AddEmailVerify1776269542564, AddResetPass1776436587568, AddOrderStatusAndItemSnapshot1778100000000];

const columnTypes = async (ds: DataSource) => {
  const found = await rows(
    ds,
    `SELECT table_name || '.' || column_name AS k, data_type || COALESCE('(' || numeric_precision || ',' || numeric_scale || ')', '') AS t
     FROM information_schema.columns
     WHERE (table_name, column_name) IN (('products','price'),('orders','total'),('order_items','unit_price'),('order_items','subtotal'))`,
  );
  return Object.fromEntries(found.map((r): [string, string] => [String(r.k), String(r.t)]));
};

describeWithDb('migración orders-money-and-stock-check (Postgres real)', () => {
  let admin: DataSource;
  let previous: DataSource;
  let current: DataSource;

  beforeAll(async () => {
    admin = new DataSource({ ...dbOptions(), entities: [], migrations: [] });
    await admin.initialize();
    await admin.query(`DROP DATABASE IF EXISTS ${MIGRATION_DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${MIGRATION_DB}`);
  });

  afterAll(async () => {
    await previous?.destroy().catch(() => undefined);
    await current?.destroy().catch(() => undefined);
    await admin?.query(`DROP DATABASE IF EXISTS ${MIGRATION_DB} WITH (FORCE)`);
    await admin?.destroy();
  });

  it('up y down sobre datos de ejemplo (REQ-1.6, 2.6, 2.7)', async () => {
    // 1) Esquema anterior a la migración, con datos "sucios" de ejemplo.
    previous = new DataSource({ ...dbOptions(MIGRATION_DB), entities: [], migrations: PREVIOUS_MIGRATIONS });
    await previous.initialize();
    await previous.runMigrations();

    const [{ id: profileId }] = await rows(previous, `INSERT INTO profiles (name, last_name) VALUES ('Ana', 'Test') RETURNING id`);
    const [{ id: userId }] = await rows(previous, `INSERT INTO users (password, email, role, profile_id) VALUES ('x', 'ana@test.local', 'CLIENT', $1) RETURNING id`, [profileId]);
    const insertProduct = async (name: string, price: number | null, stock: number | null) => {
      const [{ id }] = await rows(previous, `INSERT INTO products (name, price, stock, user_id) VALUES ($1, $2, $3, $4) RETURNING id`, [name, price, stock, userId]);
      return id as number;
    };
    const idRounded = await insertProduct('redondeo', 10.555, 5);
    const idNegative = await insertProduct('stock negativo', 2.999, -3);
    const idNulls = await insertProduct('nulos', null, null);
    const [{ id: orderId }] = await rows(previous, `INSERT INTO orders (user_id, customer_name, customer_email, shipping_address, total) VALUES ($1, 'Ana', 'ana@test.local', 'Calle 1', $2) RETURNING id`, [userId, 0.1 + 0.2]);
    await rows(previous, `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES ($1, $2, 'redondeo', 3, 0.1, $3)`, [orderId, idRounded, 0.1 * 3]);

    expect(await columnTypes(previous)).toEqual({
      'products.price': 'double precision',
      'orders.total': 'double precision',
      'order_items.unit_price': 'double precision',
      'order_items.subtotal': 'double precision',
    });
    await previous.destroy();

    // 2) up: se aplica solo la migración nueva.
    current = new DataSource(dbOptions(MIGRATION_DB));
    await current.initialize();
    const applied = await current.runMigrations();
    expect(applied.map((m) => m.name)).toEqual(['OrdersMoneyAndStockCheck1779000000000']);

    expect(await columnTypes(current)).toEqual({
      'products.price': 'numeric(12,2)',
      'orders.total': 'numeric(12,2)',
      'order_items.unit_price': 'numeric(12,2)',
      'order_items.subtotal': 'numeric(12,2)',
    });

    const product = async (id: number) => (await rows(current, `SELECT price::text AS price, stock FROM products WHERE id = $1`, [id]))[0];
    expect(await product(idRounded)).toEqual({ price: '10.56', stock: 5 }); // 10.555 → 10.56
    expect(await product(idNegative)).toEqual({ price: '3.00', stock: 0 }); // 2.999 → 3.00 y stock -3 → 0
    expect(await product(idNulls)).toEqual({ price: null, stock: null }); // nulos intactos
    expect((await rows(current, `SELECT total::text AS total FROM orders WHERE id = $1`, [orderId]))[0].total).toBe('0.30');
    expect((await rows(current, `SELECT unit_price::text AS u, subtotal::text AS s FROM order_items WHERE order_id = $1`, [orderId]))[0]).toEqual({ u: '0.10', s: '0.30' });
    expect((await rows(current, `SELECT column_default FROM information_schema.columns WHERE table_name='orders' AND column_name='total'`))[0].column_default).toBe('0');

    // El CHECK impide un stock negativo directo por SQL (REQ-1.6)
    await expect(current.query(`UPDATE products SET stock = -1 WHERE id = $1`, [idRounded])).rejects.toThrow(/CHK_products_stock_non_negative/);

    // 3) down: vuelve a double precision conservando los montos y sin el CHECK.
    await current.undoLastMigration();
    const reverted = await columnTypes(current);
    for (const type of Object.values(reverted)) {
      expect(type).toContain('double precision');
    }
    expect((await rows(current, `SELECT price FROM products WHERE id = $1`, [idRounded]))[0].price).toBe(10.56);
    expect((await rows(current, `SELECT total FROM orders WHERE id = $1`, [orderId]))[0].total).toBe(0.3);
    await expect(current.query(`UPDATE products SET stock = -1 WHERE id = $1`, [idRounded])).resolves.toBeDefined();
  });
});
