import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './post.schema';
import { PostsService } from './posts.service';
import { PostsResolver } from './posts.resolver';
import { ReactionsModule } from '../reactions/reactions.module';
import { PubSubModule } from '../gql/pubsub.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    ReactionsModule,
    PubSubModule, 
    AuthModule,
  ],
  providers: [PostsService, PostsResolver],
  exports: [PostsService],
})
export class PostsModule {}
