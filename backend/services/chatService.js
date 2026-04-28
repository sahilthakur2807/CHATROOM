const { query } = require('../db');

function mapMessage(row) {
  return {
    id: row.id,
    content: row.content,
    roomType: row.room_type,
    postId: row.post_id,
    userId: row.user_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    createdAt: row.created_at,
  };
}

async function listGlobalMessages(limit = 50) {
  const result = await query(
    `SELECT
       messages.id,
       messages.content,
       messages.room_type,
       messages.post_id,
       messages.user_id,
       messages.created_at,
       users.name AS sender_name,
       users.email AS sender_email
     FROM messages
     LEFT JOIN users ON users.id = messages.user_id
     WHERE messages.room_type = 'global'
     ORDER BY messages.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.reverse().map(mapMessage);
}

async function createGlobalMessage({ userId, content }) {
  const result = await query(
    `INSERT INTO messages (user_id, room_type, content)
     VALUES ($1, 'global', $2)
     RETURNING id, content, room_type, post_id, user_id, created_at`,
    [userId, content]
  );

  const message = result.rows[0];

  const senderResult = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
  const sender = senderResult.rows[0] || { name: 'Unknown', email: '' };

  return {
    id: message.id,
    content: message.content,
    roomType: message.room_type,
    postId: message.post_id,
    userId: message.user_id,
    senderName: sender.name,
    senderEmail: sender.email,
    createdAt: message.created_at,
  };
}

async function postExists(postId) {
  const result = await query('SELECT id FROM posts WHERE id = $1', [postId]);
  return result.rowCount > 0;
}

async function listPostMessages({ postId, limit = 50 }) {
  const result = await query(
    `SELECT
       messages.id,
       messages.content,
       messages.room_type,
       messages.post_id,
       messages.user_id,
       messages.created_at,
       users.name AS sender_name,
       users.email AS sender_email
     FROM messages
     LEFT JOIN users ON users.id = messages.user_id
     WHERE messages.room_type = 'post' AND messages.post_id = $1
     ORDER BY messages.created_at DESC
     LIMIT $2`,
    [postId, limit]
  );

  return result.rows.reverse().map(mapMessage);
}

async function createPostMessage({ userId, postId, content }) {
  const result = await query(
    `INSERT INTO messages (user_id, post_id, room_type, content)
     VALUES ($1, $2, 'post', $3)
     RETURNING id, content, room_type, post_id, user_id, created_at`,
    [userId, postId, content]
  );

  const message = result.rows[0];

  const senderResult = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
  const sender = senderResult.rows[0] || { name: 'Unknown', email: '' };

  return {
    id: message.id,
    content: message.content,
    roomType: message.room_type,
    postId: message.post_id,
    userId: message.user_id,
    senderName: sender.name,
    senderEmail: sender.email,
    createdAt: message.created_at,
  };
}

module.exports = {
  listGlobalMessages,
  createGlobalMessage,
  postExists,
  listPostMessages,
  createPostMessage,
};
