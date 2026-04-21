import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'quiz_game',
  /** Работает и при `node dist/main.js`, и при `ts-node src/main.ts` */
  entities: [
    join(__dirname, '..', '**', '*.entity.ts'),
    join(__dirname, '..', '**', '*.entity.js'),
  ],
  migrations: [
    join(__dirname, '..', 'database', 'migrations', '*.ts'),
    join(__dirname, '..', 'database', 'migrations', '*.js'),
  ],
  // Всегда включаем автоматическое создание/обновление схемы
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
}));