import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentWsUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const client = context.switchToWs().getClient();
    return client.data?.user ?? client.handshake?.user ?? client.request?.user;
  },
);
