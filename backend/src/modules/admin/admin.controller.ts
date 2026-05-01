import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { SetAdminRoleDto } from './dto/set-admin-role.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { BlockGameDto } from './dto/block-game.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReportStatus } from '../reports/entities/report.entity';
import { ReviewReportDto } from './dto/review-report.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('users/role')
  @Roles(UserRole.SUPER_ADMIN)
  setAdminRole(@Body() dto: SetAdminRoleDto) {
    return this.adminService.setAdminRole(dto.userId, dto.isAdmin);
  }

  @Patch('users/block')
  blockUser(@Body() dto: BlockUserDto) {
    return this.adminService.blockUser(dto.userId, dto.isBlocked, dto.reason);
  }

  @Patch('games/block')
  blockGame(@CurrentUser() user: User, @Body() dto: BlockGameDto) {
    return this.adminService.blockGame(dto.gameId, user.id, dto.isBlocked, dto.reason);
  }

  @Get('reports')
  getReports(@Query('status') status?: ReportStatus) {
    return this.adminService.getReports(status);
  }

  @Patch('reports/:id/approve')
  approveReport(
    @Param('id') reportId: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewReportDto,
  ) {
    return this.adminService.approveReport(
      reportId,
      user.id,
      dto.comment,
      dto.gameBlockReason,
    );
  }

  @Patch('reports/:id/reject')
  rejectReport(
    @Param('id') reportId: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewReportDto,
  ) {
    return this.adminService.rejectReport(reportId, user.id, dto.comment);
  }
}
