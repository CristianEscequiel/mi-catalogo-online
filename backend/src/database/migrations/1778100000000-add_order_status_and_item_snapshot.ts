import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStatusAndItemSnapshot1778100000000 implements MigrationInterface {
  name = 'AddOrderStatusAndItemSnapshot1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
          CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'DELIVERED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD COLUMN IF NOT EXISTS "product_name" character varying(255)
    `);

    await queryRunner.query(`
      UPDATE "order_items" oi
      SET "product_name" = p."name"
      FROM "products" p
      WHERE oi."product_id" = p."id" AND oi."product_name" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "order_items"
      SET "product_name" = ''
      WHERE "product_name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ALTER COLUMN "product_name" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP COLUMN IF EXISTS "product_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."orders_status_enum"
    `);
  }
}
