# Backend Engineer Assessment — README

This README is the **single source of truth** to run, understand, and verify the project. It follows the submission instructions exactly and adds a few practical tips learned during setup.

---

## 3.1. Setup & Execution

### Prerequisites
- **Node.js**: v20.x (project builds on Node 20; other recent LTS may work but is not guaranteed)
- **Docker** & **Docker Compose v2**: `docker compose` CLI available
- **Git**: any recent version  
- *(Optional, for local non-Docker dev)* **MongoDB** and **Redis** installed locally

### One-Command Local Run (via Docker)
From the project root:
```bash
docker compose up -d --build
```
First run only (initialize single-node replica set for MongoDB transactions):
```bash
docker compose exec mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"snappy-mongo:27017"}]})'
```
### Seed sample data (prints USER_ID, POST_ID, and JWT):
```bash
docker compose exec api node dist/seed.js
# or
docker compose exec api npm run seed
```
### Environment used by the API container (see .env.docker):
```bash
PORT=3000
MONGO_URI=mongodb://mongo:27017/snappy
JWT_SECRET=dev-secret
REDIS_HOST=redis
REDIS_PORT=6379
```
If you prefer to run the API outside Docker and only Mongo/Redis in Docker, expose ports in docker-compose.yml and set your local .env to 127.0.0.1. The Docker “all-in” path above is recommended for reviewing.

### API Endpoint
- **GraphQL** (HTTP & WS): http://localhost:3000/graphql
Use Apollo Sandbox (or Playground if enabled) to run queries, mutations, and subscriptions.

# 3.2. Design Decisions

## Data Model (MongoDB)
**Post document** (simplified):
```bash
{
  _id: ObjectId,
  authorId: ObjectId,
  content: string,
  likeCount: number,      // aggregate counter
  dislikeCount: number,   // aggregate counter
  createdAt: Date,
  updatedAt: Date
}
```
**Reaction document** (separate collection):
```bash
{
  _id: ObjectId,
  postId: ObjectId,
  userId: ObjectId,
  type: 'like' | 'dislike', // mutually exclusive per user+post
  createdAt: Date
}
```
**Why referencing for likes (not embedding)?**

- **Cardinality / size**: Popular posts can accumulate many reacting users. Embedding user IDs inside Post risks oversized documents and heavy rewrites.
- **Uniqueness & constraints**: A separate Reactions collection enforces a unique compound index (postId, userId) to guarantee at most one reaction per user per post.
- **Query flexibility**: Counting, toggling, and auditing user actions are expressed naturally with targeted queries and indexes.
- **Performance**: The Post keeps denormalized counters (likeCount, dislikeCount) for fast reads, while Reactions tracks per-user state to avoid N-sized embedded arrays.

## Real-Time Flow (Like Mutation & Subscriptions)
1 **Mutation** likePost(postId):
  - Validate current user (JWT or x-user-id).
  - Toggle user’s reaction in Reactions (create/update/delete).
  - Update counters on the Post and persist.
2 **Publish**:
  - Emit a message on Redis PubSub with topic post:<postId> including fresh counts.
3 **Broadcast**:
  - GraphQL Subscription onPostUpdate(postId) picks the payload and pushes to all clients subscribed to that postId.

## Security / Auth Mock
For the assessment, authentication is intentionally simple with two accepted mechanisms:
- **JWT header**
  GraphQL headers:
```bash
{ "authorization": "Bearer <JWT_FROM_SEED>" }
```
The JwtOrHeaderGuard verifies HS256 using JWT_SECRET and extracts sub as the user ID.
- **OR** developer shortcut header
```bash
{ "x-user-id": "<USER_ID_FROM_SEED>" }
```
This bypasses JWT for fast local testing. In production, disable this fallback.

## 3.3. Testing & 

## Test Case 1 — Mutation (Like a Post)
### Headers (pick one method):
```bash
{ "authorization": "Bearer <JWT_FROM_SEED>" }
```
or
```bash
{ "x-user-id": "<USER_ID_FROM_SEED>" }
```
### Mutation:

```bash
mutation Like($postId: ID!) {
  likePost(postId: $postId) {
    id
    content
    likeCount
    dislikeCount
    viewerReaction
  }
}
```
### Variables:
```bash
{ "postId": "<POST_ID_FROM_SEED>" }
```
**Expected**: likeCount increments (or toggles appropriately), and viewerReaction becomes `LIKE`.
dislikePost(postId: ID!) mirrors the behavior for dislikes.

## Test Case 2 — Subscription (Watch Post Updates)
### Subscription:
```bash
subscription Watch($postId: ID!) {
  onPostUpdate(postId: $postId) {
    postId
    likeCount
    dislikeCount
  }
}
```
### Variables:
```bash
{ "postId": "<POST_ID_FROM_SEED>" }
```
Expected: When a like/dislike mutation occurs for the same postId, you immediately receive an update with fresh counters.

### Test Scenario Instructions (Step-by-Step)
1. - **Start services**
```bash
docker compose up -d --build
docker compose exec mongo mongosh --eval 'rs.status()'   # should show PRIMARY
docker compose exec api node dist/seed.js                # prints USER_ID / POST_ID / JWT
```
2. - **Open three tabs** at http://localhost:3000/graphql:
  - **Tab A (Subscription)**: paste the Watch subscription above, set variables with the seeded `POST_ID`, then Run (it should say “listening”).
  - **Tab B (Mutation)**: in Headers, set either the JWT or x-user-id (from the seed output). Paste the Like mutation above, set postId to the same `POST_ID`, then Run.
  - **Mutation (like)**:
  ```bash
    mutation Like($postId: ID!) {
      likePost(postId: $postId) { id content likeCount dislikeCount viewerReaction }
    }
  ```
  - **Mutation (dislike)**:
  ```bash
  mutation Dislike($postId: ID!) {
    dislikePost(postId: $postId) { id content likeCount dislikeCount viewerReaction }
  }
  ```
3. **Observe real-time update**
  Tab A should receive a payload on onPostUpdate with updated likeCount/dislikeCount instantly.
4. **Tab C (View A Post)**
   Tab C is for fetching a single Post by ID, including the current total likeCount, dislikeCount, and a flag indicating if the requesting user has already liked/disliked it.
   ```bash
   query($id: ID!) { post(id: $id) { id content likeCount dislikeCount } }
   ```

## Troubleshooting Quick Notes
  ```bash
    ECONNREFUSED 127.0.0.1:6379 / 127.0.0.1:27017
   ```
  API is trying to reach host services, but Redis/Mongo run inside Docker. Use compose service hosts via
  ```bash
  .env.docker:
  ```
  ```bash
  MONGO_URI=mongodb://mongo:27017/snappy
  REDIS_HOST=redis
  ```
  Restart the stack.

- **Mongo transactions error**
 Ensure replica set is initialized:
 ```bash
 docker compose exec mongo mongosh --eval 'rs.initiate({...})'
 ```
 Then `rs.status()` shows `PRIMARY`.
- **JWT not recognized**
  Ensure `JWT_SECRET` used to sign in the seed equals the one the app uses to verify `(.env.docker)`. You can also test with the x-user-id header
- **WebSocket / subscriptions**
  Apollo Sandbox is enabled; the server uses modern `graphql-ws`. If you switch clients, ensure they speak the same protocol.
  
# Appendix — Project Notes

- **Stack**: NestJS (GraphQL code-first, Apollo), MongoDB (Mongoose), Redis (PubSub), Docker Compose.
- **Modules**: `Posts`, `Reactions`, `Users`, `Auth`, `PubSub`.
- **Guards & Context**: `JwtOrHeaderGuard` on mutations; GraphQL context passes `req` to access headers.
- **Counters**: Denormalized counts on Post for fast reads; authoritative per-user state in Reactions.