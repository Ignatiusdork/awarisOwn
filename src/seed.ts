import 'dotenv/config';
import { connect, Types } from 'mongoose';
import { UserSchema, User } from './users/user.schema';
import { PostSchema, Post } from './posts/post.schema';
import jwt from 'jsonwebtoken';

async function run() {
  const conn = await connect(process.env.MONGO_URI!);
  const UserModel = conn.model<User>('User', UserSchema);
  const PostModel = conn.model<Post>('Post', PostSchema);

  const user = await UserModel.create({ username: 'alphaB' });
  const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  const post = await PostModel.create({ authorId: new Types.ObjectId(user.id), content: 'Smashing this assessment with aura!' });
  

  console.log('✅ Seeded');
  console.log('USER_ID:', user.id);
  console.log('POST_ID:', post.id);
  console.log('JWT:', token);

  await conn.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
