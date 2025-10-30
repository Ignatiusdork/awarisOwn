import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { PubSubModule } from './gql/pubsub.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';
import { ReactionsModule } from './reactions/reactions.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,             
      sortSchema: true,
      playground: true,                  
      context: ({ req }) => ({ req }),
      subscriptions: {
        'graphql-ws': true,             
        'subscriptions-transport-ws': true,
      },
      
    }),
    PubSubModule,
    UsersModule,
    PostsModule,
    ReactionsModule,
    AuthModule
  ],
})
export class AppModule {}