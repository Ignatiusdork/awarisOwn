import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true }) authorId: Types.ObjectId;
  @Prop({ required: true }) content: string;
  @Prop({ type: Number, default: 0 }) likeCount: number;
  @Prop({ type: Number, default: 0 }) dislikeCount: number;
}
export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);
