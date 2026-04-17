import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerify1776269542564 implements MigrationInterface {
    name = 'AddEmailVerify1776269542564'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_token" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_expires_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
    }

}
