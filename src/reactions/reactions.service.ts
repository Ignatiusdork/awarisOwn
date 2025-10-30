import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Reaction } from './reaction.schema';
import { Post } from '../posts/post.schema';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectConnection() private connection: Connection,
  ) {}

  findByPostAndUser(postId: string, userId: string) {
    return this.reactionModel.findOne({ postId, userId });
  }

  /**
   * Toggle to nextType: 'like' | 'dislike'
   * - new: add reaction (+1)
   * - same: remove reaction (-1)
   * - switch: change type (+1/-1)
   */
  async toggle(postId: string, userId: string, nextType: 'like' | 'dislike') {
    
    if (!Types.ObjectId.isValid(postId)) {
    throw new NotFoundException('Post not found');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const pid = new Types.ObjectId(postId);
      const uid = new Types.ObjectId(userId);

      const existing = await this.reactionModel.findOne({ postId: pid, userId: uid }).session(session);

      let likeDelta = 0, dislikeDelta = 0;

      if (!existing) {
        await this.reactionModel.create([{ postId: pid, userId: uid, type: nextType }], { session });
        if (nextType === 'like') likeDelta = 1; else dislikeDelta = 1;
      } else if (existing.type === nextType) {
        await this.reactionModel.deleteOne({ _id: existing._id }).session(session);
        if (nextType === 'like') likeDelta = -1; else dislikeDelta = -1;
      } else {
        await this.reactionModel.updateOne({ _id: existing._id }, { $set: { type: nextType } }).session(session);
        if (nextType === 'like') { likeDelta = +1; dislikeDelta = -1; }
        else { likeDelta = -1; dislikeDelta = +1; }
      }

      const updated = await this.postModel.findByIdAndUpdate(
        pid,
        { $inc: { likeCount: likeDelta, dislikeCount: dislikeDelta } },
        { new: true, session }
      );

      await session.commitTransaction();
      return updated!;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }
}
