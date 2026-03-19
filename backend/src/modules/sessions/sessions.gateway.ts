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
import { UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'sessions',
})
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map();

  constructor(private sessionsService: SessionsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Удаляем пользователя из маппинга
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    client.join(`session-${data.sessionId}`);
    this.userSockets.set(data.userId, client.id);
    
    const session = await this.sessionsService.findOne(data.sessionId);
    this.server.to(`session-${data.sessionId}`).emit('session-updated', session);
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.leave(`session-${data.sessionId}`);
  }

  @SubscribeMessage('question-opened')
  async handleQuestionOpened(
    @MessageBody() data: { sessionId: string; categoryId: string; questionId: string },
  ) {
    this.server.to(`session-${data.sessionId}`).emit('question-opened', {
      categoryId: data.categoryId,
      questionId: data.questionId,
    });
  }

  @SubscribeMessage('score-updated')
  async handleScoreUpdated(
    @MessageBody() data: { sessionId: string; teamId: string; newScore: number },
  ) {
    this.server.to(`session-${data.sessionId}`).emit('score-updated', {
      teamId: data.teamId,
      newScore: data.newScore,
    });
  }

  @SubscribeMessage('game-started')
  async handleGameStarted(@MessageBody() data: { sessionId: string }) {
    this.server.to(`session-${data.sessionId}`).emit('game-started');
  }

  @SubscribeMessage('game-finished')
  async handleGameFinished(@MessageBody() data: { sessionId: string }) {
    this.server.to(`session-${data.sessionId}`).emit('game-finished');
  }
}