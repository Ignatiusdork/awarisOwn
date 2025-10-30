import { Resolver, Query, Args, ObjectType, Field, ID, Mutation, Subscription } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { PostsService } from './posts.service';
import { ReactionsService } from '../reactions/reactions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtOrHeaderGuard } from '../common/guards/jwt-or-header.guard';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { ReactionType } from './post.types';
import { NotFoundException } from '@nestjs/common';

@ObjectType()
class PostGQL {
  @Field(() => ID) id: string;
  @Field() content: string;
  @Field() likeCount: number;
  @Field() dislikeCount: number;

  @Field(() => ReactionType, { nullable: true })
  viewerReaction?: ReactionType | null;
}

@ObjectType()
class PostUpdate {
  @Field(() => ID) postId: string;
  @Field() likeCount: number;
  @Field() dislikeCount: number;
}

@Resolver(() => PostGQL)
export class PostsResolver {
  constructor(
    private readonly posts: PostsService,
    private readonly reactions: ReactionsService,
    @Inject('PUB_SUB') private pubSub: RedisPubSub,
  ) {}

  @Query(() => PostGQL, { nullable: true })
  async post(@Args('id', {type: () => ID }) id: string, @CurrentUser() user?: { id: string }): Promise<PostGQL | null> {
    const p = await this.posts.findById(id);
    if (!p) return null;
    const r = user?.id ? await this.reactions.findByPostAndUser(id, user.id) : null;
    return {
      id: p.id,
      content: p.content,
      likeCount: p.likeCount,
      dislikeCount: p.dislikeCount,
      viewerReaction: r ? (r.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE) : null,
    };
  }

  @UseGuards(JwtOrHeaderGuard)
  @Mutation(() => PostGQL)
  async likePost(
    @Args('postId', { type: () => ID }) postId: string,
    @CurrentUser() user: { id: string },
  ): Promise<PostGQL> {
    const updated = await this.reactions.toggle(postId, user.id, 'like');

    if (!updated) {
      // either the post didn't exist or toggle failed to return an updated doc
      throw new NotFoundException('Post not found');
    }

    await this.pubSub.publish(`post:${postId}`, {
      onPostUpdate: { postId, likeCount: updated.likeCount, dislikeCount: updated.dislikeCount },
    });

    const r = await this.reactions.findByPostAndUser(postId, user.id);
    return {
      id: updated.id,
      content: updated.content,
      likeCount: updated.likeCount,
      dislikeCount: updated.dislikeCount,
      viewerReaction: r ? (r.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE) : null,
    };
  }

  @UseGuards(JwtOrHeaderGuard)
  @Mutation(() => PostGQL)
 async dislikePost(
    @Args('postId', { type: () => ID }) postId: string,
    @CurrentUser() user: { id: string },
  ): Promise<PostGQL> {
    const updated = await this.reactions.toggle(postId, user.id, 'dislike');

    if (!updated) {
      // either the post didn't exist or toggle failed to return an updated doc
      throw new NotFoundException('Post not found');
    }

    await this.pubSub.publish(`post:${postId}`, {
      onPostUpdate: { postId, likeCount: updated.likeCount, dislikeCount: updated.dislikeCount },
    });

    const r = await this.reactions.findByPostAndUser(postId, user.id);
    return {
      id: updated.id,
      content: updated.content,
      likeCount: updated.likeCount,
      dislikeCount: updated.dislikeCount,
      viewerReaction: r ? (r.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE) : null,
    };
  }

  @Subscription(() => PostUpdate, {
    filter: (payload: any, vars: { postId: string }) => payload.onPostUpdate.postId === vars.postId,
    resolve: (payload: any) => payload.onPostUpdate,
  })
  onPostUpdate(@Args('postId', {type: () => ID }) postId: string) {
    return this.pubSub.asyncIterator(`post:${postId}`);
  }
}
