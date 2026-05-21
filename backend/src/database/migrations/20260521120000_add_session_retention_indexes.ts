import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionRetentionIndexes20260521120000 implements MigrationInterface {
  name = 'AddSessionRetentionIndexes20260521120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_finishedAt" ON "sessions" ("finishedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_createdAt" ON "sessions" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_finishedAt"`);
  }
}
