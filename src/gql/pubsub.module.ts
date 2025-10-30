import { Module } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const pubSubProvider = {
  provide: 'PUB_SUB',
  useFactory: () => {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = +(process.env.REDIS_PORT || 6379);
    
    const options = { host, port, retryStrategy: (times: number) => Math.min(times * 50, 2000) };
    return new RedisPubSub({
      publisher: new Redis(options),
      subscriber: new Redis(options),
    });
  },
};

@Module({
  providers: [pubSubProvider],
  exports: ['PUB_SUB'],
})
export class PubSubModule {}
