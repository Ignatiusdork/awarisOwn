import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reaction, ReactionSchema } from './reaction.schema';
import { ReactionsService } from './reactions.service';
import { Post, PostSchema } from '../posts/post.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Reaction.name, schema: ReactionSchema },
    { name: Post.name, schema: PostSchema },
  ])],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
