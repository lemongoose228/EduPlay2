import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GamesModule } from './modules/games/games.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { LibraryModule } from './modules/library/library.module';
import databaseConfig from './config/database.config';
import { RedisModule } from './redis/redis.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicIdSchemaService } from './database/public-id-schema.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    SessionsModule,
    LibraryModule,
    ReportsModule,
    AdminModule,
    RedisModule,
  ],
  providers: [PublicIdSchemaService],
})
export class AppModule {}