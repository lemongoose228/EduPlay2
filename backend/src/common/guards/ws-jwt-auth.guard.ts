import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const client = context.switchToWs().getClient<Socket>();
    const handshake = client.handshake;
    const authToken = handshake.auth?.token;
    const headerToken = handshake.headers.authorization;

    if (!headerToken && typeof authToken === 'string' && authToken.trim()) {
      handshake.headers.authorization = authToken.startsWith('Bearer ')
        ? authToken
        : `Bearer ${authToken}`;
    }

    return handshake;
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Необходима авторизация');
    }

    const client = context.switchToWs().getClient<Socket>();
    client.data.user = user;
    (client.handshake as any).user = user;
    (client.request as any).user = user;

    return user as TUser;
  }
}
