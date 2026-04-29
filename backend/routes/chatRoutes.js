const express = require('express');
const { listGlobalMessages, listPostMessages, postExists } = require('../services/chatService');
const { requireAuth } = require('../middleware/requireAuth');

function createChatRoutes() {
  const router = express.Router();

  router.get('/global', requireAuth, async (req, res) => {
    try {
      const messages = await listGlobalMessages();
      return res.json({ ok: true, messages });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to load global chat' });
    }
  });

  router.get('/posts/:postId', requireAuth, async (req, res) => {
    try {
      const postId = String(req.params.postId || '').trim();
      if (!postId) {
        return res.status(400).json({ ok: false, message: 'postId is required' });
      }

      const exists = await postExists(postId);
      if (!exists) {
        return res.status(404).json({ ok: false, message: 'Post not found' });
      }

      const messages = await listPostMessages({ postId });
      return res.json({ ok: true, messages });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to load post chat' });
    }
  });

  return router;
}

module.exports = { createChatRoutes };
