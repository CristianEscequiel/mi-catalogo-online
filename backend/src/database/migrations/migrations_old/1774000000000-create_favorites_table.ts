import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFavoritesTable1774000000000 implements MigrationInterface {
  name = 'CreateFavoritesTable1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorites_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_favorites_user_product"
      ON "favorites" ("user_id", "product_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "FK_favorites_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "FK_favorites_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_favorites_product"`);
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_favorites_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_favorites_user_product"`);
    await queryRunner.query(`DROP TABLE "favorites"`);
  }
}
