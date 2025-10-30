import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
//import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Post } from 'src/posts/post.schema';
import { User } from 'src/users/user.schema';
import { JwtService } from '@nestjs/jwt';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PubSub } from 'graphql-subscriptions';

describe('E2E: Reactions', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let PostModel: Model<Post>;
  let UserModel: Model<User>;
  let jwt: JwtService;

  let userId: string;
  let postId: string;
  let token: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // ✅ Let AppModule connect using its own Config (MONGO_URI)
  process.env.MONGO_URI = uri;

  const moduleRef = await Test.createTestingModule({
    imports: [
      // ❌ REMOVE: MongooseModule.forRoot(uri),
      AppModule,
    ],
  })
    .overrideProvider('PUB_SUB')
    .useValue(new PubSub() as unknown as RedisPubSub)
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();

  // grab models & services
  PostModel = app.get(getModelToken('Post'));
  UserModel = app.get(getModelToken('User'));
  jwt = app.get(JwtService);

  // seed user + post
  const user = await UserModel.create({ username: 'testy' });
  userId = user.id;

  const post = await PostModel.create({ authorId: user._id, content: 'E2E Post' });
  postId = post.id;

  token = jwt.sign({ sub: userId, username: 'testy' });
});

  afterAll(async () => {
    await app.close();
    if (mongod) await mongod.stop();
  });

  const GQL = (query: string, variables: Record<string, unknown> = {}, auth = true) => {
    const http = request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables });

    return auth ? http.set('authorization', `Bearer ${token}`) : http;
  };

  it('query post (no auth) returns counts and null viewerReaction', async () => {
    const q = `
      query($id: ID!) {
        post(id: $id) { id content likeCount dislikeCount viewerReaction }
      }
    `;
    const res = await GQL(q, { id: postId }, false);
    expect(res.status).toBe(200);
    expect(res.body.data.post.id).toBe(postId);
    expect(res.body.data.post.likeCount).toBe(0);
    expect(res.body.data.post.dislikeCount).toBe(0);
    expect(res.body.data.post.viewerReaction).toBe(null);
  });

  it('likePost increments likeCount and sets viewerReaction=LIKE', async () => {
    const m = `
      mutation($postId: ID!) {
        likePost(postId: $postId) { id likeCount dislikeCount viewerReaction }
      }
    `;
    const res = await GQL(m, { postId });
    expect(res.status).toBe(200);
    const p = res.body.data.likePost;
    expect(p.id).toBe(postId);
    expect(p.likeCount).toBe(1);
    expect(p.dislikeCount).toBe(0);
    expect(p.viewerReaction).toBe('LIKE');
  });

  it('likePost again toggles off (back to 0, null reaction)', async () => {
    const m = `
      mutation($postId: ID!) {
        likePost(postId: $postId) { id likeCount dislikeCount viewerReaction }
      }
    `;
    const res = await GQL(m, { postId });
    expect(res.status).toBe(200);
    const p = res.body.data.likePost;
    expect(p.likeCount).toBe(0);
    expect(p.dislikeCount).toBe(0);
    expect(p.viewerReaction).toBe(null);
  });

  it('dislikePost increments dislikeCount and sets viewerReaction=DISLIKE', async () => {
    const m = `
      mutation($postId: ID!) {
        dislikePost(postId: $postId) { id likeCount dislikeCount viewerReaction }
      }
    `;
    const res = await GQL(m, { postId });
    expect(res.status).toBe(200);
    const p = res.body.data.dislikePost;
    expect(p.likeCount).toBe(0);
    expect(p.dislikeCount).toBe(1);
    expect(p.viewerReaction).toBe('DISLIKE');
  });

  it('switch: likePost after dislike moves count (1 like, 0 dislike, viewer=LIKE)', async () => {
    const m = `
      mutation($postId: ID!) {
        likePost(postId: $postId) { id likeCount dislikeCount viewerReaction }
      }
    `;
    const res = await GQL(m, { postId });
    expect(res.status).toBe(200);
    const p = res.body.data.likePost;
    expect(p.likeCount).toBe(1);
    expect(p.dislikeCount).toBe(0);
    expect(p.viewerReaction).toBe('LIKE');
  });
});
