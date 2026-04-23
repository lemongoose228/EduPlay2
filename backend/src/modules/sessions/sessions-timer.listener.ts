import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsGateway } from './sessions.gateway';
import { SessionsTimerService } from './sessions-timer.service';

@Injectable()
export class SessionsTimerListener implements OnModuleInit {
  private readonly logger = new Logger(SessionsTimerListener.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsGateway: SessionsGateway,
    private readonly sessionsTimerService: SessionsTimerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Redis quiz timer listener');
    await this.sessionsTimerService.subscribeToQuizTimerExpired(
      async (sessionId, questionIndex) => {
        this.logger.log(`Timer expired callback for session ${sessionId}, question ${questionIndex}`);
        
        const result = await this.sessionsService.revealQuizQuestionByTimer(
          sessionId,
          questionIndex,
        );
        
        if (!result) {
          try {
            const current = await this.sessionsService.findOne(sessionId);
            this.logger.warn(
              `Timer callback ignored for session ${sessionId}. expectedIndex=${questionIndex}, currentIndex=${
                current.currentQuestionIndex ?? 0
              }, status=${current.status}, gameType=${current.game?.type ?? 'unknown'}`,
            );
          } catch (error) {
            this.logger.warn(
              `Timer callback ignored for session ${sessionId}, question ${questionIndex}. Failed to fetch current state: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
          return;
        }

        const newIndex = result.session.currentQuestionIndex ?? 0;
        this.logger.log(
          `Timer transition applied for session ${sessionId}: oldIndex=${questionIndex} -> newIndex=${newIndex}, status=${result.session.status}`,
        );
        this.sessionsGateway.emitQuizRevealed(sessionId, result.reveal, 'timer');
        this.sessionsGateway.emitSessionState(sessionId, result.session);

        if (result.session.status === 'active' && result.session.game?.type === 'quiz') {
          const nextIndex = newIndex;
          const ttl = result.session.settings?.timePerQuestion ?? 30;
          await this.sessionsTimerService.scheduleQuizQuestionTimer(
            sessionId,
            nextIndex,
            ttl,
          );
          this.logger.log(`Scheduled next timer for session ${sessionId}, question ${nextIndex}`);
          return;
        }

        this.logger.log(
          `Quiz session ${sessionId} finished after timer question index ${questionIndex}`,
        );
      },
    );
  }
}