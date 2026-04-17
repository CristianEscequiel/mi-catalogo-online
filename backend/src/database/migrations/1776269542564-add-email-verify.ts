import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerify1776269542564 implements MigrationInterface {
    name = 'AddEmailVerify1776269542564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_user"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_token" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_expires_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
