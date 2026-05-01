import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { GamesModule } from '../games/games.module';
import { ReportsModule } from '../reports/reports.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [UsersModule, GamesModule, ReportsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
