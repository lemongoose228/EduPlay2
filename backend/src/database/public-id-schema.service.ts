import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * При synchronize: true TypeORM добавляет publicId как nullable; старые строки остаются NULL.
 * Здесь безопасно выдаём уникальные значения (поверх текущего MAX) и вешаем DEFAULT nextval.
 */
@Injectable()
export class PublicIdSchemaService implements OnModuleInit {
  private readonly logger = new Logger(PublicIdSchemaService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    try {
      await this.ensureTable('users', 'users_public_id_seq');
      await this.ensureTable('games', 'games_public_id_seq');
    } catch (e) {
      this.logger.error('Не удалось нормализовать publicId', e);
    }
  }

  private async ensureTable(table: string, seqName: string) {
    const col = await this.ds.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'publicId'`,
      [table],
    );
    if (!col?.length) {
      return;
    }

    await this.ds.query(`
      WITH missing AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
        FROM "${table}"
        WHERE "publicId" IS NULL
      ),
      mx AS (SELECT COALESCE(MAX("publicId"), 0)::bigint AS m FROM "${table}")
      UPDATE "${table}" t
      SET "publicId" = mx.m + missing.rn
      FROM missing, mx
      WHERE t.id = missing.id
    `);

    await this.ds.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`);

    const maxRows = await this.ds.query(
      `SELECT COALESCE(MAX("publicId"), 0)::bigint AS m FROM "${table}"`,
    );
    const m = maxRows[0]?.m ?? 0;
    await this.ds.query(`SELECT setval('${seqName}', $1::bigint)`, [String(m)]);

    await this.ds.query(
      `ALTER TABLE "${table}" ALTER COLUMN "publicId" SET DEFAULT nextval('${seqName}')`,
    );
    await this.ds.query(`ALTER SEQUENCE ${seqName} OWNED BY "${table}"."publicId"`);
  }
}
