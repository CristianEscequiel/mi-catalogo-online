import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResetPass1776436587568 implements MigrationInterface {
    name = 'AddResetPass1776436587568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_token" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_expires_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_token"`);
    }

}
