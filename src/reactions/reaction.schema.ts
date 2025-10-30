import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Reaction {
  @Prop({ type: Types.ObjectId, ref: 'Post', index: true, required: true }) postId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true }) userId: Types.ObjectId;
  @Prop({ type: String, enum: ['like', 'dislike'], required: true }) type: 'like' | 'dislike';
}
export type ReactionDocument = HydratedDocument<Reaction>;
export const ReactionSchema = SchemaFactory.createForClass(Reaction);
ReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
