import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAndReports20260501 implements MigrationInterface {
  name = 'AddAdminAndReports20260501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS "isBlocked" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "blockedReason" text;
    `);

    await queryRunner.query(`
      ALTER TABLE "games"
      ADD COLUMN IF NOT EXISTS "isBlocked" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "blockedReason" text,
      ADD COLUMN IF NOT EXISTS "blockedByUserId" uuid;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."reports_status_enum" AS ENUM('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gameId" uuid NOT NULL,
        "reporterUserId" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."reports_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP,
        "decisionComment" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reports"
        ADD CONSTRAINT "FK_reports_game" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reports"
        ADD CONSTRAINT "FK_reports_reporter" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reports"
        ADD CONSTRAINT "FK_reports_reviewer" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reports";`);
    await queryRunner.query(`
      ALTER TABLE "games"
      DROP COLUMN IF EXISTS "blockedByUserId",
      DROP COLUMN IF EXISTS "blockedReason",
      DROP COLUMN IF EXISTS "blockedAt",
      DROP COLUMN IF EXISTS "isBlocked";
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "blockedReason",
      DROP COLUMN IF EXISTS "blockedAt",
      DROP COLUMN IF EXISTS "isBlocked",
      DROP COLUMN IF EXISTS "role";
    `);
  }
}
