// routes/admins.js
const express = require('express');
const router = express.Router();

// 👤 Get Admin Profile
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const adminId = req.params.id;

  db.query(
    `SELECT full_name, email, role FROM admins WHERE admin_id = ?`,
    [adminId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'Admin not found' });
      res.json(results[0]);
    }
  );
});

// ✏️ Update Admin Profile
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const adminId = req.params.id;
  const { full_name, email, role } = req.body;

  if (!full_name || !email || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  db.query(
    `UPDATE admins SET full_name = ?, email = ?, role = ? WHERE admin_id = ?`,
    [full_name, email, role, adminId],
    (err) => {
      if (err) return res.status(500).json({ message: 'Update failed', error: err });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// 📋 Get all Admins (for student dropdown/chat)
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  db.query(
    `SELECT admin_id, full_name, email FROM admins ORDER BY full_name ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch admins', error: err });
      res.json(results);
    }
  );
});

module.exports = router;
