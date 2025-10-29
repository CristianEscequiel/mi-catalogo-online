import { MigrationInterface, QueryRunner } from "typeorm";

export class NewRestriction1761071986029 implements MigrationInterface {
    name = 'NewRestriction1761071986029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "cover_image" character varying(800)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "cover_image" character varying(255)`);
    }

}
