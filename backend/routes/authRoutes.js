const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }

  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' }
  );
}

function createAuthRoutes() {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');

      if (!name || !email || !password) {
        return res.status(400).json({ ok: false, message: 'name, email, and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ ok: false, message: 'password must be at least 8 characters' });
      }

      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rowCount > 0) {
        return res.status(409).json({ ok: false, message: 'An account with that email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at, updated_at`,
        [name, email, passwordHash]
      );

      const user = result.rows[0];
      const token = signToken(user);

      return res.status(201).json({ ok: true, user: sanitizeUser(user), token });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to create user' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');

      if (!email || !password) {
        return res.status(400).json({ ok: false, message: 'email and password are required' });
      }

      const result = await query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rowCount === 0) {
        return res.status(401).json({ ok: false, message: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ ok: false, message: 'Invalid email or password' });
      }

      const token = signToken(user);
      return res.json({ ok: true, user: sanitizeUser(user), token });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to log in' });
    }
  });

  router.get('/me', requireAuth, async (req, res) => {
    try {
      const result = await query(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
        [req.user.sub]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ ok: false, message: 'User not found' });
      }

      return res.json({ ok: true, user: sanitizeUser(result.rows[0]) });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to fetch user' });
    }
  });

  return router;
}

module.exports = { createAuthRoutes };
