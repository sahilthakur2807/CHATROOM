const { query } = require('../db');

function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    userId: row.user_id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listPosts() {
  const result = await query(
    `SELECT
       posts.id,
       posts.title,
       posts.content,
       posts.user_id,
       posts.created_at,
       posts.updated_at,
       users.name AS author_name,
       users.email AS author_email
     FROM posts
     JOIN users ON users.id = posts.user_id
     ORDER BY posts.created_at DESC`
  );

  return result.rows.map(mapPost);
}

async function getPostById(postId) {
  const result = await query(
    `SELECT
       posts.id,
       posts.title,
       posts.content,
       posts.user_id,
       posts.created_at,
       posts.updated_at,
       users.name AS author_name,
       users.email AS author_email
     FROM posts
     JOIN users ON users.id = posts.user_id
     WHERE posts.id = $1`,
    [postId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapPost(result.rows[0]);
}

async function createPost({ userId, title, content }) {
  const result = await query(
    `INSERT INTO posts (user_id, title, content)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, title, content]
  );

  return getPostById(result.rows[0].id);
}

async function updatePost({ postId, userId, title, content }) {
  const result = await query(
    `UPDATE posts
     SET title = $1,
         content = $2,
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING id`,
    [title, content, postId, userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getPostById(result.rows[0].id);
}

async function deletePost({ postId, userId }) {
  const result = await query(
    'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
    [postId, userId]
  );

  return result.rowCount > 0;
}

async function deletePostsByAuthorName(authorName) {
  const result = await query(
    `DELETE FROM posts
     WHERE user_id IN (
       SELECT id
       FROM users
       WHERE LOWER(name) = LOWER($1)
     )`,
    [authorName]
  );

  return result.rowCount;
}

module.exports = {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  deletePostsByAuthorName,
};
