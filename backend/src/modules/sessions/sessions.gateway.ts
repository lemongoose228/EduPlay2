import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CurrentWsUser } from '../../common/decorators/current-ws-user.decorator';
import { WsJwtAuthGuard } from '../../common/guards/ws-jwt-auth.guard';
import {
  WsQuizAnswerDto,
  WsQuizRevealDto,
  WsSessionJoinDto,
  WsSessionScoreDto,
} from './dto/ws-session.dto';
import { User } from '../users/entities/user.entity';
import { SessionsTimerService } from './sessions-timer.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'sessions',
})
@UseGuards(WsJwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsTimerService: SessionsTimerService,
  ) {}

  handleConnection(client: Socket) {
    const user = (client.data?.user ??
      (client.handshake as any)?.user ??
      (client.request as any)?.user) as User | undefined;
    if (user?.id) {
      this.userSockets.set(user.id, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  emitSessionState(sessionId: string, session: unknown) {
    this.server.to(`session-${sessionId}`).emit('session:state', session);
  }

  emitQuizRevealed(
    sessionId: string,
    reveal: {
      categoryId: string;
      questionId: string;
      questionText: string;
      correctAnswer: string;
      value: number;
      index: number;
    },
    reason: 'manual' | 'timer',
  ) {
    this.server.to(`session-${sessionId}`).emit('quiz:revealed', {
      ...reveal,
      reason,
    });
  }

  private getUserOrThrow(client: Socket, user?: User): User {
    const resolved = (user ??
      client.data?.user ??
      (client.handshake as any)?.user ??
      (client.request as any)?.user) as User | undefined;
    if (!resolved?.id) {
      throw new UnauthorizedException('Необходима авторизация');
    }
    return resolved;
  }

  private emitSessionError(client: Socket, error: unknown) {
    const message = this.extractErrorMessage(error);
    client.emit('session:error', {
      code: 'SESSION_ERROR',
      message,
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Ошибка обработки события';
  }

  private ensureSessionRoom(client: Socket, sessionId: string) {
    client.join(`session-${sessionId}`);
  }

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsSessionJoinDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      client.join(`session-${data.sessionId}`);
      this.userSockets.set(currentUser.id, client.id);

      const session = await this.sessionsService.findOne(data.sessionId);
      this.emitSessionState(data.sessionId, session);
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('session:leave')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSessionJoinDto,
  ) {
    client.leave(`session-${data.sessionId}`);
    return { ok: true };
  }

  @SubscribeMessage('session:state:request')
  async handleStateRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSessionJoinDto,
  ) {
    try {
      this.ensureSessionRoom(client, data.sessionId);
      const session = await this.sessionsService.findOne(data.sessionId);
      this.emitSessionState(data.sessionId, session);
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('quiz:start')
  async handleQuizStart(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsSessionJoinDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      this.ensureSessionRoom(client, data.sessionId);
      const session = await this.sessionsService.start(data.sessionId, currentUser.id);
      this.emitSessionState(data.sessionId, session);

      if (session.game?.type === 'quiz' && session.status === 'active') {
        await this.sessionsTimerService.scheduleQuizQuestionTimer(
          session.id,
          session.currentQuestionIndex ?? 0,
          session.settings?.timePerQuestion ?? 30,
        );
      }
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('quiz:answer')
  async handleQuizAnswer(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsQuizAnswerDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      const session = await this.sessionsService.answerQuestion(
        data.sessionId,
        currentUser.id,
        data.categoryId,
        data.questionId,
        { answer: data.answer },
      );
      this.emitSessionState(data.sessionId, session);
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('quiz:reveal')
  async handleQuizReveal(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsQuizRevealDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      fetch('http://127.0.0.1:7371/ingest/ba8791ae-2c1d-4028-b905-067af634ec4d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35aeb'},body:JSON.stringify({sessionId:'b35aeb',runId:'run1',hypothesisId:'H2',location:'backend/src/modules/sessions/sessions.gateway.ts:handleQuizReveal:start',message:'quiz reveal handler entered',data:{sessionId:data.sessionId,categoryId:data.categoryId,questionId:data.questionId,userId:currentUser.id},timestamp:Date.now()})}).catch(()=>{});
      const reveal = await this.sessionsService.getQuizRevealInfoForCurrentQuestion(
        data.sessionId,
      );
      const session = await this.sessionsService.revealQuizQuestion(
        data.sessionId,
        currentUser.id,
        data.categoryId,
        data.questionId,
      );

      if (reveal) {
        await this.sessionsTimerService.clearQuizQuestionTimer(
          data.sessionId,
          reveal.index,
        );
        this.emitQuizRevealed(data.sessionId, reveal, 'manual');
      }
      this.emitSessionState(data.sessionId, session);

      if (session.status === 'active' && session.game?.type === 'quiz') {
        await this.sessionsTimerService.scheduleQuizQuestionTimer(
          session.id,
          session.currentQuestionIndex ?? 0,
          session.settings?.timePerQuestion ?? 30,
        );
      }
      fetch('http://127.0.0.1:7371/ingest/ba8791ae-2c1d-4028-b905-067af634ec4d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35aeb'},body:JSON.stringify({sessionId:'b35aeb',runId:'run1',hypothesisId:'H2',location:'backend/src/modules/sessions/sessions.gateway.ts:handleQuizReveal:success',message:'quiz reveal handler succeeded',data:{sessionId:data.sessionId,nextQuestionIndex:session.currentQuestionIndex ?? null,status:session.status},timestamp:Date.now()})}).catch(()=>{});
      return { ok: true };
    } catch (error) {
      fetch('http://127.0.0.1:7371/ingest/ba8791ae-2c1d-4028-b905-067af634ec4d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35aeb'},body:JSON.stringify({sessionId:'b35aeb',runId:'run1',hypothesisId:'H2',location:'backend/src/modules/sessions/sessions.gateway.ts:handleQuizReveal:error',message:'quiz reveal handler failed',data:{sessionId:data.sessionId,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('session:score:update')
  async handleScoreUpdated(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsSessionScoreDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      const session = await this.sessionsService.updateScore(data.sessionId, currentUser.id, {
        teamId: data.teamId,
        points: data.points,
      });
      this.emitSessionState(data.sessionId, session);
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('session:finish')
  async handleGameFinished(
    @ConnectedSocket() client: Socket,
    @CurrentWsUser() user: User,
    @MessageBody() data: WsSessionJoinDto,
  ) {
    try {
      const currentUser = this.getUserOrThrow(client, user);
      const before = await this.sessionsService.findOne(data.sessionId);
      const session = await this.sessionsService.finish(data.sessionId, currentUser.id);
      if (before.game?.type === 'quiz') {
        await this.sessionsTimerService.clearQuizQuestionTimer(
          data.sessionId,
          before.currentQuestionIndex ?? 0,
        );
      }
      this.emitSessionState(data.sessionId, session);
      return { ok: true };
    } catch (error) {
      this.emitSessionError(client, error);
      return { ok: false };
    }
  }
}