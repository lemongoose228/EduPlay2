import { io, Socket } from 'socket.io-client';
import { config } from '../../../shared/config';

let sessionsSocket: Socket | null = null;

export function getSessionsSocket(): Socket {
  const token = localStorage.getItem('token');

  if (sessionsSocket) {
    sessionsSocket.auth = token ? { token } : {};
    return sessionsSocket;
  }

  sessionsSocket = io(`${config.wsUrl}/sessions`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });

  return sessionsSocket;
}

export async function waitForSessionsSocketConnected(timeoutMs = 2000): Promise<Socket> {
  const socket = getSessionsSocket();
  if (socket.connected) {
    return socket;
  }

  return new Promise<Socket>((resolve, reject) => {
    const onConnect = () => {
      window.clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      resolve(socket);
    };
    const onError = (error: Error) => {
      window.clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(error);
    };

    const timer = window.setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(new Error('WebSocket connection timeout'));
    }, timeoutMs);

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);
    socket.connect();
  });
}

export function disconnectSessionsSocket() {
  if (!sessionsSocket) return;
  sessionsSocket.disconnect();
  sessionsSocket = null;
}
