import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-role.enum';
import { GamesService } from '../games/games.service';
import { ReportsService } from '../reports/reports.service';
import { ReportStatus } from '../reports/entities/report.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly gamesService: GamesService,
    private readonly reportsService: ReportsService,
  ) {}

  async setAdminRole(targetUserId: string, isAdmin: boolean) {
    const uuid = await this.usersService.resolveIdToUuid(targetUserId);
    const targetUser = await this.usersService.findById(uuid);
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Нельзя менять роль super admin');
    }
    return this.usersService.setRole(
      uuid,
      isAdmin ? UserRole.ADMIN : UserRole.USER,
    );
  }

  async blockUser(userId: string, isBlocked: boolean, reason?: string | null) {
    const uuid = await this.usersService.resolveIdToUuid(userId);
    const targetUser = await this.usersService.findById(uuid);
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Нельзя блокировать super admin');
    }
    return this.usersService.setBlocked(uuid, isBlocked, reason);
  }

  async blockGame(
    gameId: string,
    adminUserId: string,
    isBlocked: boolean,
    reason?: string | null,
  ) {
    return this.gamesService.setBlocked(gameId, adminUserId, isBlocked, reason);
  }

  async getReports(status?: ReportStatus) {
    return this.reportsService.list(status);
  }

  async approveReport(
    reportId: string,
    reviewerUserId: string,
    comment?: string | null,
    gameBlockReason?: string | null,
  ) {
    const report = await this.reportsService.approve(reportId, reviewerUserId, comment);
    await this.gamesService.setBlocked(
      report.gameId,
      reviewerUserId,
      true,
      gameBlockReason || 'Игра заблокирована по жалобе',
    );
    return this.reportsService.findById(reportId);
  }

  async rejectReport(reportId: string, reviewerUserId: string, comment?: string | null) {
    return this.reportsService.reject(reportId, reviewerUserId, comment);
  }
}
