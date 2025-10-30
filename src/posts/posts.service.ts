import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Post } from './post.schema';
import { Model } from 'mongoose';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<Post>) {}

  findById(id: string) { return this.postModel.findById(id); }
  create(authorId: string, content: string) { return this.postModel.create({ authorId, content }); }
}
