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
                    host: 'localhost',
                    port: 6379,
                    password: '123',
                    db: 0,
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

                await client.config('SET', 'notify-keyspace-events', 'Ex');

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
