import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameAgeRange20260516120000 implements MigrationInterface {
  name = 'AddGameAgeRange20260516120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "ageFrom" integer`);
    await queryRunner.query(`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "ageTo" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN IF EXISTS "ageTo"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN IF EXISTS "ageFrom"`);
  }
}
