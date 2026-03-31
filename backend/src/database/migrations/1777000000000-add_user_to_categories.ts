import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserToCategories1777000000000 implements MigrationInterface {
  name = 'AddUserToCategories1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "categories" ADD "user_id" integer');
    await queryRunner.query('ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_user"');
    await queryRunner.query('ALTER TABLE "categories" DROP COLUMN "user_id"');
  }
}

