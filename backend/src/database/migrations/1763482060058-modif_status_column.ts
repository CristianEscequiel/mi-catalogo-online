import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifStatusColumn1763482060058 implements MigrationInterface {
    name = 'ModifStatusColumn1763482060058'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "slug" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL`);
    }

}
