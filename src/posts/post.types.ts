import { registerEnumType } from '@nestjs/graphql';

export enum ReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

registerEnumType(ReactionType, { name: 'ReactionType' });
