// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Register Student
router.post('/register/student', async (req, res) => {
  const db = req.app.locals.db;
  const { full_name, email, password, phone, institution, field_of_study, year_of_study } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      `INSERT INTO students (full_name, email, password_hash, phone, institution, field_of_study, year_of_study)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, hashed, phone, institution, field_of_study, year_of_study],
      (err) => {
        if (err) return res.status(500).json({ message: 'Student already exists or DB error', error: err });
        res.json({ message: 'Student registered successfully' });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Register Admin
router.post('/register/admin', async (req, res) => {
  const db = req.app.locals.db;
  const {
    full_name, email, password, role = 'admin',
    profile_photo_url = '', address = '', phone = '',
    department = '', position_title = '', bio = ''
  } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields: full_name, email, or password.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const insertSQL = `
      INSERT INTO admins (
        full_name, email, password_hash, role,
        profile_photo_url, address, phone,
        department, position_title, bio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      full_name.trim(), email.trim().toLowerCase(), hashed, role,
      profile_photo_url.trim(), address.trim(), phone.trim(),
      department.trim(), position_title.trim(), bio.trim()
    ];

    db.query(insertSQL, values, (err) => {
      if (err) {
        console.error('❌ Admin registration error:', err);
        return res.status(500).json({ message: 'Admin already exists or database error', error: err });
      }
      res.status(201).json({ message: '✅ Admin registered successfully' });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err });
  }
});

// Login for Student or Admin
router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const JWT_SECRET = process.env.JWT_SECRET;
  const { email, password, role } = req.body;
  const table = role === 'admin' ? 'admins' : 'students';

  db.query(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(401).json({ message: 'Email not found' });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Incorrect password' });

    const idField = role === 'admin' ? 'admin_id' : 'student_id';
    const token = jwt.sign({ id: user[idField], role }, JWT_SECRET, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        ...user,
        [idField]: user[idField] // expose id field
      }
    });
  });
});

module.exports = router;
