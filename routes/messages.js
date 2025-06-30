// routes/messages.js
const express = require('express');
const router = express.Router();

// 📨 Send Message
router.post('/send', (req, res) => {
  const db = req.app.locals.db;
  const {
    conversation_id, sender_id, receiver_id,
    sender_role, message, message_type, attachment_url
  } = req.body;

  if (!conversation_id || !sender_id || !receiver_id || !sender_role || typeof message !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid fields to send message' });
  }

  const receiverTable = sender_role === 'admin' ? 'students' : 'admins';
  const receiverField = sender_role === 'admin' ? 'student_id' : 'admin_id';

  db.query(`SELECT ${receiverField} FROM ${receiverTable} WHERE ${receiverField} = ?`, [receiver_id], (checkErr, result) => {
    if (checkErr || result.length === 0) {
      return res.status(400).json({ message: 'Receiver does not exist' });
    }

    const insertSQL = `
      INSERT INTO messages (
        conversation_id, sender_id, receiver_id, sender_role,
        message, message_type, attachment_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSQL, [
      conversation_id, sender_id, receiver_id, sender_role,
      message, message_type || 'text', attachment_url || null
    ], (err, result) => {
      if (err) {
        console.error('❌ Message insert failed:', err);
        return res.status(500).json({ message: 'Failed to send message', error: err.message || err });
      }

      res.status(201).json({
        message: 'Message sent successfully',
        message_id: result.insertId
      });
    });
  });
});

// 💬 Get Messages for a Conversation
router.get('/conversation/:conversationId', (req, res) => {
  const db = req.app.locals.db;
  const { conversationId } = req.params;

  db.query(
    `SELECT * FROM messages
     WHERE conversation_id = ?
     AND sender_deleted = 0 AND receiver_deleted = 0
     ORDER BY sent_at ASC`,
    [conversationId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to load messages', error: err });
      res.json(results);
    }
  );
});

// ✅ Mark All Messages as Read
router.post('/mark-read', (req, res) => {
  const db = req.app.locals.db;
  const { conversation_id, user_id, role } = req.body;

  if (!conversation_id || !user_id || !role) {
    return res.status(400).json({ message: 'Missing required fields to mark as read' });
  }

  db.query(
    `UPDATE messages
     SET is_read = 1
     WHERE conversation_id = ? AND receiver_id = ? AND sender_role != ?`,
    [conversation_id, user_id, role],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to mark messages as read', error: err });
      res.json({ message: 'Messages marked as read' });
    }
  );
});

module.exports = router;
