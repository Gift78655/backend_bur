// routes/students.js
const express = require('express');
const router = express.Router();

// ✅ Get student profile by ID
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const studentId = req.params.id;

  db.query(
    `SELECT full_name, email, phone, institution, field_of_study, year_of_study
     FROM students WHERE student_id = ?`,
    [studentId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'Student not found' });
      res.json(results[0]);
    }
  );
});

// ✏️ Update student profile
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const studentId = req.params.id;
  const { phone, institution, field_of_study, year_of_study } = req.body;

  db.query(
    `UPDATE students SET phone = ?, institution = ?, field_of_study = ?, year_of_study = ? WHERE student_id = ?`,
    [phone, institution, field_of_study, year_of_study, studentId],
    (err) => {
      if (err) return res.status(500).json({ message: 'Update failed', error: err });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// 📋 Get all students (for admin dropdown/chat)
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  db.query(
    `SELECT student_id, full_name, email FROM students ORDER BY full_name ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch students', error: err });
      res.json(results);
    }
  );
});

module.exports = router;

