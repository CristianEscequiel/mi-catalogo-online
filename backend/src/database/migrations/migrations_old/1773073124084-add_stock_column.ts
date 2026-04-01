import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockColumn1773073124084 implements MigrationInterface {
    name = 'AddStockColumn1773073124084'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "stock" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "reservedStock" integer DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "reservedStock"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "stock"`);
    }

}
