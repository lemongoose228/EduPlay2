import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixGameAgeColumnTypes20260516130000 implements MigrationInterface {
  name = 'FixGameAgeColumnTypes20260516130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'ageFrom'
        ) THEN
          ALTER TABLE "games"
            ALTER COLUMN "ageFrom" TYPE integer
            USING (
              CASE
                WHEN "ageFrom" IS NULL OR TRIM("ageFrom"::text) = '' THEN NULL
                ELSE "ageFrom"::integer
              END
            );
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'ageTo'
        ) THEN
          ALTER TABLE "games"
            ALTER COLUMN "ageTo" TYPE integer
            USING (
              CASE
                WHEN "ageTo" IS NULL OR TRIM("ageTo"::text) = '' THEN NULL
                ELSE "ageTo"::integer
              END
            );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "games" ALTER COLUMN "ageFrom" TYPE text USING "ageFrom"::text;
      ALTER TABLE "games" ALTER COLUMN "ageTo" TYPE text USING "ageTo"::text;
    `);
  }
}
