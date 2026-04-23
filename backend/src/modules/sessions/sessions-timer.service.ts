import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type QuizTimerExpiredHandler = (
  sessionId: string,
  questionIndex: number,
) => Promise<void> | void;

@Injectable()
export class SessionsTimerService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionsTimerService.name);
  private readonly quizTimerPrefix = 'quiz:timer:';
  private readonly subscribers = new Set<QuizTimerExpiredHandler>();
  private subscriberClient: Redis | null = null;
  private isSubscriptionInitialized = false;

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  getQuizTimerPrefix(): string {
    return this.quizTimerPrefix;
  }

  async scheduleQuizQuestionTimer(
    sessionId: string,
    questionIndex: number,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      const safeTtl = Math.max(1, Math.floor(ttlSeconds));
      const key = this.buildQuizTimerKey(sessionId, questionIndex);
      await this.redisClient.set(key, '1', 'EX', safeTtl);
      this.logger.log(`Timer scheduled for session ${sessionId}, question ${questionIndex}, TTL ${safeTtl}s`);
    } catch (error) {
      this.logger.error(`Failed to schedule timer: ${error}`);
    }
  }

  async clearQuizQuestionTimer(sessionId: string, questionIndex: number): Promise<void> {
    try {
      const key = this.buildQuizTimerKey(sessionId, questionIndex);
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Failed to clear timer: ${error}`);
    }
  }

  async subscribeToQuizTimerExpired(handler: QuizTimerExpiredHandler): Promise<void> {
    this.subscribers.add(handler);
    if (this.isSubscriptionInitialized) {
      this.logger.log(`Redis timer subscription already initialized. Handlers count: ${this.subscribers.size}`);
      return;
    }

    this.isSubscriptionInitialized = true;
    this.subscriberClient = this.redisClient.duplicate({
      // Dedicated subscriber connection: avoid ready-check commands in subscriber mode.
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    const dbIndex = this.redisClient.options.db ?? 0;
    const keyEventPattern = `__keyevent@${dbIndex}__:expired`;
    this.logger.log(`Initializing quiz timer subscription. dbIndex=${dbIndex}, pattern=${keyEventPattern}`);

    try {
      const currentNotifyConfig = await this.redisClient.config('GET', 'notify-keyspace-events');
      const rawConfig =
        Array.isArray(currentNotifyConfig) && currentNotifyConfig.length > 1
          ? String(currentNotifyConfig[1] ?? '')
          : '';
      this.logger.log(`Current notify-keyspace-events value: "${rawConfig}"`);
      if (!rawConfig.includes('E') || !rawConfig.includes('x')) {
        this.logger.warn(
          'notify-keyspace-events does not include Ex. Expired events may be missing for quiz timers.',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Unable to read notify-keyspace-events config: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    this.subscriberClient.on('psubscribe', (pattern, count) => {
      this.logger.log(`Redis psubscribe confirmed. pattern=${pattern}, subscriptions=${count}`);
    });

    this.subscriberClient.on('ready', () => {
      this.logger.log(`Redis subscriber connection ready. pattern=${keyEventPattern}`);
    });

    this.subscriberClient.on('reconnecting', () => {
      this.logger.warn('Redis subscriber reconnecting');
    });

    this.subscriberClient.on('pmessage', (pattern, channel, message) => {
      this.logger.log(
        `Redis expired event received. pattern=${pattern}, channel=${channel}, message=${message}`,
      );
      void this.handleExpiredKey(message);
    });

    this.subscriberClient.on('error', (error) => {
      this.logger.error(
        `Redis timer subscriber error: ${error.message}. This usually means a non-subscriber command was sent on subscriber connection.`,
      );
    });

    await this.subscriberClient.psubscribe(keyEventPattern);
    this.logger.log(
      `Subscribed to Redis key expiration events. dbIndex=${dbIndex}, pattern=${keyEventPattern}`,
    );
  }

  async onModuleDestroy() {
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
      this.subscriberClient = null;
    }
    this.isSubscriptionInitialized = false;
  }

  buildQuizTimerKey(sessionId: string, questionIndex: number): string {
    return `${this.quizTimerPrefix}${sessionId}:${questionIndex}`;
  }

  parseQuizTimerKey(key: string): { sessionId: string; questionIndex: number } | null {
    if (!key.startsWith(this.quizTimerPrefix)) {
      return null;
    }

    const raw = key.slice(this.quizTimerPrefix.length);
    const [sessionId, indexText] = raw.split(':');
    const questionIndex = Number(indexText);
    if (!sessionId || Number.isNaN(questionIndex)) {
      return null;
    }

    return { sessionId, questionIndex };
  }

  private async handleExpiredKey(key: string) {
    const parsed = this.parseQuizTimerKey(key);
    if (!parsed) return;

    this.logger.log(`Timer expired for session ${parsed.sessionId}, question ${parsed.questionIndex}`);

    for (const subscriber of this.subscribers) {
      try {
        await subscriber(parsed.sessionId, parsed.questionIndex);
      } catch (error) {
        this.logger.error(
          `Failed handling expired quiz timer ${key}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}