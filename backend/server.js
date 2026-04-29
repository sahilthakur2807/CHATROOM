const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { createAuthRoutes } = require('./routes/authRoutes');
const { createPostsRoutes } = require('./routes/postsRoutes');
const { createChatRoutes } = require('./routes/chatRoutes');
const { initializeDatabase } = require('./database/initDatabase');
const {
  createGlobalMessage,
  listGlobalMessages,
  createPostMessage,
  listPostMessages,
  postExists,
} = require('./services/chatService');
const { listPosts } = require('./services/postService');

function createApp(io) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
    })
  );
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ ok: true, msg: 'pong' });
  });

  // Routes with io instance
  app.use('/api/auth', createAuthRoutes());
  app.use('/api/posts', createPostsRoutes(io));
  app.use('/api/chat', createChatRoutes());

  return app;
}

async function startServer() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  await initializeDatabase();

  const server = http.createServer();
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  });

  // Create app with io instance
  const app = createApp(io);
  server.on('request', app);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authorization token is required'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('JWT_SECRET is required'));
      }

      const payload = jwt.verify(token, secret);
      socket.user = payload;
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Posts list
    socket.on('posts:join', async () => {
      socket.join('posts');
      const posts = await listPosts();
      socket.emit('posts:history', posts || []);
    });

    // Global chat
    socket.on('global:join', async () => {
      const messages = await listGlobalMessages();
      socket.join('global');
      socket.emit('global:history', messages);
    });

    socket.on('global:message', async (payload) => {
      const content = String(payload && payload.content ? payload.content : '').trim();

      if (!content) {
        return;
      }

      const message = await createGlobalMessage({
        userId: socket.user.sub,
        content,
      });

      io.to('global').emit('global:message', message);
    });

    // Post-specific chat
    socket.on('post:join', async (payload) => {
      const postId = String(payload && payload.postId ? payload.postId : '').trim();
      if (!postId) return;

      const exists = await postExists(postId);
      if (!exists) {
        socket.emit('post:error', { postId, message: 'Post not found' });
        return;
      }

      const room = `post:${postId}`;
      socket.join(room);
      const messages = await listPostMessages({ postId });
      socket.emit('post:history', { postId, messages });
    });

    socket.on('post:leave', (payload) => {
      const postId = String(payload && payload.postId ? payload.postId : '').trim();
      if (!postId) return;
      socket.leave(`post:${postId}`);
    });

    socket.on('post:message', async (payload) => {
      const postId = String(payload && payload.postId ? payload.postId : '').trim();
      const content = String(payload && payload.content ? payload.content : '').trim();

      if (!postId || !content) return;

      const exists = await postExists(postId);
      if (!exists) {
        socket.emit('post:error', { postId, message: 'Post not found' });
        return;
      }

      const message = await createPostMessage({
        userId: socket.user.sub,
        postId,
        content,
      });

      io.to(`post:${postId}`).emit('post:message', message);
    });

    socket.on('disconnect', () => console.log('socket disconnected', socket.id));
  });

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

  return { app, server, io };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
