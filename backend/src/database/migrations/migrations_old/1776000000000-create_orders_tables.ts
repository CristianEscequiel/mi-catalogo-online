import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTables1776000000000 implements MigrationInterface {
  name = 'CreateOrdersTables1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "customer_name" character varying(255) NOT NULL,
        "customer_email" character varying(255) NOT NULL,
        "shipping_address" text NOT NULL,
        "total" double precision NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user"
      ON "orders" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" SERIAL NOT NULL,
        "order_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" double precision NOT NULL,
        "subtotal" double precision NOT NULL,
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_items_order"
      ON "order_items" ("order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_items_product"
      ON "order_items" ("product_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_product"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_product"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_user"`);
    await queryRunner.query(`DROP TABLE "orders"`);
  }
}
