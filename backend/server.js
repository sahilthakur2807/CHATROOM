const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { authRoutes } = require('./routes/authRoutes');
const { initializeDatabase } = require('./database/initDatabase');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
    })
  );
  app.use(express.json());

  app.get('/api/ping', (req, res) => {
    res.json({ ok: true, msg: 'pong' });
  });

  app.use('/api/auth', authRoutes);

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

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
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
