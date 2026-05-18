import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTictactoeGameType20260519120000 implements MigrationInterface {
  name = 'AddTictactoeGameType20260519120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "games_type_enum" ADD VALUE IF NOT EXISTS 'tictactoe'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "tictactoeState" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "tictactoeState"`);
  }
}
