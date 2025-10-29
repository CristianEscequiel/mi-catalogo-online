import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewFields1761071761817 implements MigrationInterface {
  name = 'NewFields1761071761817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD "descripcion" character varying(800)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "descripcion"`);
  }
}
