import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionImageUrl20260505 implements MigrationInterface {
  name = 'AddQuestionImageUrl20260505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "imageUrl" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "questions" DROP COLUMN IF EXISTS "imageUrl"`,
    );
  }
}
