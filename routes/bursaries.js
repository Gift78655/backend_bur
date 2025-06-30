// routes/bursaries.js
const express = require('express');
const router = express.Router();

// ➕ Create Bursary
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    title, description, eligibility, field_of_study, institution,
    sponsor, amount, closing_date, application_url, contact_email,
    tags, created_by
  } = req.body;

  db.query(
    `INSERT INTO bursaries
     (title, description, eligibility, field_of_study, institution,
      sponsor, amount, closing_date, application_url, contact_email,
      tags, created_by, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    [title, description, eligibility, field_of_study, institution,
     sponsor, amount, closing_date, application_url, contact_email,
     tags, created_by],
    (err) => {
      if (err) return res.status(500).json({ message: 'Insert failed', error: err });
      res.status(201).json({ message: 'Bursary created' });
    }
  );
});

// 📥 Get All Bursaries
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  db.query('SELECT * FROM bursaries ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ message: 'Query failed', error: err });
    res.json(results);
  });
});

// 📥 Get Only Available Bursaries
router.get('/available', (req, res) => {
  const db = req.app.locals.db;

  db.query(
    'SELECT * FROM bursaries WHERE is_active = 1 AND is_verified = 1 ORDER BY closing_date ASC',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Query failed', error: err });
      res.json(results);
    }
  );
});

// ✏️ Update Bursary
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  const {
    title, description, eligibility, field_of_study, institution,
    sponsor, amount, closing_date, application_url, contact_email, tags
  } = req.body;

  db.query(
    `UPDATE bursaries SET title = ?, description = ?, eligibility = ?, field_of_study = ?, institution = ?,
     sponsor = ?, amount = ?, closing_date = ?, application_url = ?, contact_email = ?, tags = ?
     WHERE bursary_id = ?`,
    [title, description, eligibility, field_of_study, institution, sponsor,
     amount, closing_date, application_url, contact_email, tags, id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Update failed', error: err });
      res.json({ message: 'Bursary updated' });
    }
  );
});

// ❌ Delete Bursary
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  db.query('DELETE FROM bursaries WHERE bursary_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Delete failed', error: err });
    res.json({ message: 'Bursary deleted' });
  });
});

module.exports = router;
