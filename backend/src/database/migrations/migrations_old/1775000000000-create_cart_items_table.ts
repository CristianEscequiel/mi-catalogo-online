import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCartItemsTable1775000000000 implements MigrationInterface {
  name = 'CreateCartItemsTable1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "quantity" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cart_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cart_items_user"
      ON "cart_items" ("user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_cart_items_user_product"
      ON "cart_items" ("user_id", "product_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_product"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cart_items_user_product"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cart_items_user"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
  }
}
