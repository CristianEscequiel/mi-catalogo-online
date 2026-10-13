import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dinero exacto y stock no negativo (spec orders-integrity).
 *
 * up:   products.stock < 0 pasa a 0; price/total/unit_price/subtotal pasan de double precision a
 *       numeric(12,2) redondeando a 2 decimales; se agrega CHECK (stock >= 0).
 * down: vuelve a double precision y quita el CHECK.
 *
 * IRRECUPERABLE al revertir: el stock negativo normalizado a 0 y los centavos que `up` redondeó.
 * Si algún importe tiene más de 10 dígitos enteros, `up` falla por desborde (Postgres revierte el DDL).
 */
export class OrdersMoneyAndStockCheck1779000000000 implements MigrationInterface {
  name = 'OrdersMoneyAndStockCheck1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "products" SET "stock" = 0 WHERE "stock" < 0`);

    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE numeric(12,2) USING ROUND("price"::numeric, 2)`);

    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric(12,2) USING ROUND("total"::numeric, 2)`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" SET DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "unit_price" TYPE numeric(12,2) USING ROUND("unit_price"::numeric, 2)`);
    await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "subtotal" TYPE numeric(12,2) USING ROUND("subtotal"::numeric, 2)`);

    await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "CHK_products_stock_non_negative" CHECK ("stock" >= 0)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "CHK_products_stock_non_negative"`);

    await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "subtotal" TYPE double precision USING "subtotal"::double precision`);
    await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "unit_price" TYPE double precision USING "unit_price"::double precision`);

    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE double precision USING "total"::double precision`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" SET DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE double precision USING "price"::double precision`);
  }
}
