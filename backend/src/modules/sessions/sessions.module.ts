import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsGateway } from './sessions.gateway';
import { Session } from './entities/session.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { GamesModule } from '../games/games.module';
import { SessionsTimerService } from './sessions-timer.service';
import { SessionsTimerListener } from './sessions-timer.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Team, Player]),
    GamesModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionsGateway,
    SessionsTimerService,
    SessionsTimerListener,
  ],
  exports: [SessionsService],
})
export class SessionsModule {
  constructor(private readonly _sessionsTimerListener: SessionsTimerListener) {}
}