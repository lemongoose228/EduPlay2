import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import {
  getSessionRetentionCutoffDate,
  getSessionRetentionDays,
  SESSION_EXPIRED_WHERE,
} from './session-retention.util';

@Injectable()
export class SessionsCleanupService implements OnModuleInit {
  private readonly logger = new Logger(SessionsCleanupService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.purgeExpiredSessions();
  }

  @Cron('0 3 * * *')
  async handleDailyCleanup(): Promise<void> {
    await this.purgeExpiredSessions();
  }

  async purgeExpiredSessions(): Promise<number> {
    const cutoff = getSessionRetentionCutoffDate();
    const result = await this.sessionsRepository
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where(SESSION_EXPIRED_WHERE, { cutoff })
      .execute();

    const deleted = result.affected ?? 0;
    if (deleted > 0) {
      this.logger.log(
        `Purged ${deleted} expired session(s) (retention: ${getSessionRetentionDays()} days, cutoff: ${cutoff.toISOString()})`,
      );
    }
    return deleted;
  }
}
