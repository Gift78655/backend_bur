// routes/conversations.js
const express = require('express');
const router = express.Router();

// 🟩 Auto-initiate conversation between admin and student
router.post('/initiate', (req, res) => {
  const db = req.app.locals.db;
  const { student_id, admin_id } = req.body;

  if (!student_id || !admin_id || isNaN(student_id) || isNaN(admin_id)) {
    return res.status(400).json({ message: 'Missing or invalid student_id or admin_id' });
  }

  const checkSQL = `
    SELECT conversation_id FROM conversations
    WHERE student_id = ? AND admin_id = ?
  `;

  db.query(checkSQL, [student_id, admin_id], (checkErr, result) => {
    if (checkErr) {
      console.error('❌ Check failed:', checkErr);
      return res.status(500).json({ message: 'Check failed', error: checkErr });
    }

    if (result.length > 0) {
      return res.status(200).json({
        message: 'Conversation already exists',
        conversation_id: result[0].conversation_id
      });
    }

    const insertSQL = `
      INSERT INTO conversations (student_id, admin_id)
      VALUES (?, ?)
    `;

    db.query(insertSQL, [student_id, admin_id], (insertErr, insertResult) => {
      if (insertErr) {
        console.error('❌ Conversation insert failed:', insertErr);
        return res.status(500).json({ message: 'Conversation creation failed', error: insertErr });
      }

      res.status(201).json({
        message: 'Conversation created successfully',
        conversation_id: insertResult.insertId
      });
    });
  });
});

// 📥 Get all admins a student has conversed with
router.get('/student/:studentId', (req, res) => {
  const db = req.app.locals.db;
  const { studentId } = req.params;

  db.query(
    `SELECT c.conversation_id, a.admin_id, a.full_name, a.email
     FROM conversations c
     JOIN admins a ON a.admin_id = c.admin_id
     WHERE c.student_id = ?`,
    [studentId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch conversations for student', error: err });
      res.json(results);
    }
  );
});

// 📥 Get all students an admin has messaged
router.get('/admin/:adminId', (req, res) => {
  const db = req.app.locals.db;
  const { adminId } = req.params;

  db.query(
    `SELECT c.conversation_id, s.student_id, s.full_name, s.email
     FROM conversations c
     JOIN students s ON s.student_id = c.student_id
     WHERE c.admin_id = ?`,
    [adminId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch conversations for admin', error: err });
      res.json(results);
    }
  );
});

module.exports = router;
