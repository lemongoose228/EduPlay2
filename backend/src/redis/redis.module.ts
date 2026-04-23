import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: async (configService: ConfigService) => {
                const logger = new Logger('Redis');
                
                const redisOptions = {
                    host: configService.get<string>('REDIS_HOST') || 'localhost',
                    port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
                    password: configService.get<string>('REDIS_PASSWORD') || undefined,
                    db: parseInt(configService.get<string>('REDIS_DB') || '0', 10),
                    retryStrategy: (times: number) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    connectTimeout: 10000,
                };

                logger.log(`Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`);
                
                const client = new Redis(redisOptions);

                try {
                    await client.config('SET', 'notify-keyspace-events', 'Ex');
                    const configResult = await client.config('GET', 'notify-keyspace-events');
                    logger.log(`notify-keyspace-events configured: ${JSON.stringify(configResult)}`);
                } catch (error) {
                    logger.error(
                        `Failed to configure notify-keyspace-events. Timer expiry events may not work: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                    );
                }

                client.on('connect', () => {
                    logger.log('Redis connected successfully');
                });

                client.on('error', (error) => {
                    logger.error('Redis connection error:', error);
                });

                client.on('close', () => {
                    logger.warn('Redis connection closed');
                });

                return client;
            },
            inject: [ConfigService],
        },
        RedisService,
    ],
    exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {

}
