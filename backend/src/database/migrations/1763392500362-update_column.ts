import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateColumn1763392500362 implements MigrationInterface {
    name = 'UpdateColumn1763392500362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "descripcion" TO "description"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "description" TO "descripcion"`);
    }

}
