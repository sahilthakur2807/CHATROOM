const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} = require('../services/postService');

function normalizePostPayload(body) {
  return {
    title: String(body.title || '').trim(),
    content: String(body.content || '').trim(),
  };
}

function createPostsRoutes(io) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const posts = await listPosts();
      return res.json({ ok: true, posts });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to load posts' });
    }
  });

  router.get('/:postId', async (req, res) => {
    try {
      const post = await getPostById(req.params.postId);

      if (!post) {
        return res.status(404).json({ ok: false, message: 'Post not found' });
      }

      return res.json({ ok: true, post });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to load post' });
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const { title, content } = normalizePostPayload(req.body);

      if (!title || !content) {
        return res.status(400).json({ ok: false, message: 'title and content are required' });
      }

      const post = await createPost({
        userId: req.user.sub,
        title,
        content,
      });

      // Emit post creation event to all connected clients
      if (io) {
        io.to('posts').emit('post:created', post);
      }

      return res.status(201).json({ ok: true, post });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to create post' });
    }
  });

  router.put('/:postId', requireAuth, async (req, res) => {
    try {
      const { title, content } = normalizePostPayload(req.body);

      if (!title || !content) {
        return res.status(400).json({ ok: false, message: 'title and content are required' });
      }

      const post = await updatePost({
        postId: req.params.postId,
        userId: req.user.sub,
        title,
        content,
      });

      if (!post) {
        return res.status(404).json({ ok: false, message: 'Post not found or not owned by user' });
      }

      // Emit post update event to all connected clients
      if (io) {
        io.to('posts').emit('post:updated', post);
      }

      return res.json({ ok: true, post });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to update post' });
    }
  });

  router.delete('/:postId', requireAuth, async (req, res) => {
    try {
      const deleted = await deletePost({
        postId: req.params.postId,
        userId: req.user.sub,
      });

      if (!deleted) {
        return res.status(404).json({ ok: false, message: 'Post not found or not owned by user' });
      }

      // Emit post deletion event to all connected clients
      if (io) {
        io.to('posts').emit('post:deleted', { postId: req.params.postId });
      }

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Unable to delete post' });
    }
  });

  return router;
}

module.exports = { createPostsRoutes };
