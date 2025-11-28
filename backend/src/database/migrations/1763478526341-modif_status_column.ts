import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifStatusColumn1763478526341 implements MigrationInterface {
    name = 'ModifStatusColumn1763478526341'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`);
        await queryRunner.query(`ALTER TABLE "products" ADD "status" "public"."products_status_enum" NOT NULL DEFAULT 'DRAFT'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "status" character varying(255)`);
    }

}
