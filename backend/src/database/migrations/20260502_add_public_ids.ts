import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicIds20260502 implements MigrationInterface {
  name = 'AddPublicIds20260502';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
    `);
    await queryRunner.query(`
      UPDATE "users" u
      SET "publicId" = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
        FROM "users"
        WHERE "publicId" IS NULL
      ) sub
      WHERE u.id = sub.id;
    `);
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS users_public_id_seq;
    `);
    await queryRunner.query(`
      SELECT setval(
        'users_public_id_seq',
        COALESCE((SELECT MAX("publicId") FROM "users"), 0)
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "publicId" SET DEFAULT nextval('users_public_id_seq'),
      ALTER COLUMN "publicId" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER SEQUENCE users_public_id_seq OWNED BY "users"."publicId";
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_publicId" ON "users" ("publicId");
    `);

    await queryRunner.query(`
      ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
    `);
    await queryRunner.query(`
      UPDATE "games" g
      SET "publicId" = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
        FROM "games"
        WHERE "publicId" IS NULL
      ) sub
      WHERE g.id = sub.id;
    `);
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS games_public_id_seq;
    `);
    await queryRunner.query(`
      SELECT setval(
        'games_public_id_seq',
        COALESCE((SELECT MAX("publicId") FROM "games"), 0)
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "games"
      ALTER COLUMN "publicId" SET DEFAULT nextval('games_public_id_seq'),
      ALTER COLUMN "publicId" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER SEQUENCE games_public_id_seq OWNED BY "games"."publicId";
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_games_publicId" ON "games" ("publicId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_games_publicId";`);
    await queryRunner.query(`
      ALTER TABLE "games" DROP COLUMN IF EXISTS "publicId";
    `);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS games_public_id_seq;`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_publicId";`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "publicId";
    `);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS users_public_id_seq;`);
  }
}
