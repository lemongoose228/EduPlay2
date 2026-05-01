import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { Game } from '../games/entities/game.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Game)
    private readonly gamesRepository: Repository<Game>,
  ) {}

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    const game = await this.gamesRepository.findOne({ where: { id: dto.gameId } });
    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }
    if (game.authorId === userId) {
      throw new BadRequestException('Нельзя пожаловаться на свою игру');
    }
    if (game.isBlocked) {
      throw new BadRequestException('Игра уже заблокирована');
    }

    const report = this.reportsRepository.create({
      gameId: dto.gameId,
      reporterUserId: userId,
      reason: dto.reason.trim(),
      status: ReportStatus.PENDING,
    });

    return this.reportsRepository.save(report);
  }

  async list(status?: ReportStatus): Promise<Report[]> {
    return this.reportsRepository.find({
      where: status ? { status } : {},
      relations: ['game', 'reporter', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(reportId: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['game', 'reporter', 'reviewedBy'],
    });
    if (!report) {
      throw new NotFoundException('Жалоба не найдена');
    }
    return report;
  }

  async approve(
    reportId: string,
    reviewerUserId: string,
    comment?: string | null,
  ): Promise<Report> {
    const report = await this.findById(reportId);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Жалоба уже обработана');
    }

    report.status = ReportStatus.APPROVED;
    report.reviewedByUserId = reviewerUserId;
    report.reviewedAt = new Date();
    report.decisionComment = comment?.trim() || null;

    return this.reportsRepository.save(report);
  }

  async reject(
    reportId: string,
    reviewerUserId: string,
    comment?: string | null,
  ): Promise<Report> {
    const report = await this.findById(reportId);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Жалоба уже обработана');
    }

    report.status = ReportStatus.REJECTED;
    report.reviewedByUserId = reviewerUserId;
    report.reviewedAt = new Date();
    report.decisionComment = comment?.trim() || null;

    return this.reportsRepository.save(report);
  }
}
