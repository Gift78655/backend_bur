// routes/applications.js
const express = require('express');
const router = express.Router();

// 📝 Submit Application
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { sendEmail, generateApplicationEmail } = req.app.locals;
  const { student_id, bursary_id } = req.body;

  db.query(
    'SELECT * FROM applications WHERE student_id = ? AND bursary_id = ?',
    [student_id, bursary_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Query error', error: err });
      if (results.length > 0) return res.status(400).json({ message: 'Already applied' });

      db.query(
        'INSERT INTO applications (student_id, bursary_id) VALUES (?, ?)',
        [student_id, bursary_id],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Insert failed', error: err });

          const application_id = result.insertId;

          db.query(`
            INSERT INTO status_updates (application_id, status, updated_by, remarks, updated_by_role, is_visible_to_student, action_type)
            VALUES (?, 'Submitted', ?, 'Application submitted by student', 'student', 1, 'Initial Submission')
          `, [application_id, student_id]);

          db.query(
            `SELECT s.email, s.full_name, b.title AS bursary_title
             FROM students s JOIN bursaries b ON b.bursary_id = ? WHERE s.student_id = ?`,
            [bursary_id, student_id],
            (err2, result2) => {
              if (!err2 && result2.length > 0) {
                const { email, full_name, bursary_title } = result2[0];
                const { subject, html } = generateApplicationEmail({ full_name, bursary_title });
                sendEmail(email, subject, html).catch(console.error);
              }
            }
          );

          res.status(201).json({ message: 'Application submitted and status logged' });
        }
      );
    }
  );
});

// 🔄 Withdraw Application
router.post('/withdraw', (req, res) => {
  const db = req.app.locals.db;
  const { sendEmail, generateWithdrawalEmail } = req.app.locals;
  const { student_id, bursary_id } = req.body;

  if (!student_id || !bursary_id) {
    return res.status(400).json({ message: 'Missing student_id or bursary_id' });
  }

  db.query(
    'DELETE FROM applications WHERE student_id = ? AND bursary_id = ?',
    [student_id, bursary_id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Withdraw failed', error: err });

      db.query(
        `SELECT s.email, s.full_name, b.title AS bursary_title
         FROM students s JOIN bursaries b ON b.bursary_id = ? WHERE s.student_id = ?`,
        [bursary_id, student_id],
        (err2, result) => {
          if (!err2 && result.length > 0) {
            const { email, full_name, bursary_title } = result[0];
            const { subject, html } = generateWithdrawalEmail({ full_name, bursary_title });
            sendEmail(email, subject, html).catch(console.error);
          }
        }
      );

      res.json({ message: 'Application withdrawn' });
    }
  );
});

// 📂 Get Applications by Student
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { student_id } = req.query;

  if (!student_id) return res.status(400).json({ message: 'student_id is required' });

  db.query(
    'SELECT bursary_id FROM applications WHERE student_id = ?',
    [student_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch', error: err });
      res.json(results);
    }
  );
});

// 🗂️ Admin View: Get all applications + status history
router.get('/admin/all', (req, res) => {
  const db = req.app.locals.db;

  const baseSQL = `
    SELECT 
      a.application_id,
      a.application_date,
      a.current_status,
      s.student_id, s.full_name AS student_name, s.email, s.phone,
      s.institution, s.field_of_study, s.year_of_study,
      b.bursary_id, b.title AS bursary_title, b.sponsor, b.amount, b.closing_date
    FROM applications a
    JOIN students s ON a.student_id = s.student_id
    JOIN bursaries b ON a.bursary_id = b.bursary_id
    ORDER BY a.application_date DESC
  `;

  db.query(baseSQL, (err, applications) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch applications', error: err });

    const appIds = applications.map(app => app.application_id);
    if (appIds.length === 0) return res.json([]);

    const placeholders = appIds.map(() => '?').join(',');
    const historySQL = `
      SELECT * FROM status_updates
      WHERE application_id IN (${placeholders})
      ORDER BY updated_at ASC
    `;

    db.query(historySQL, appIds, (err2, historyResults) => {
      if (err2) return res.status(500).json({ message: 'Failed to fetch status history', error: err2 });

      const historyMap = {};
      historyResults.forEach(update => {
        if (!historyMap[update.application_id]) historyMap[update.application_id] = [];
        historyMap[update.application_id].push(update);
      });

      const merged = applications.map(app => ({
        ...app,
        status_history: historyMap[app.application_id] || []
      }));

      res.json(merged);
    });
  });
});

// ✅ Admin Updates Application Status
router.post('/status/update', (req, res) => {
  const db = req.app.locals.db;
  const { sendEmail } = req.app.locals;
  const {
    application_id, status, remarks, updated_by,
    updated_by_role, is_visible_to_student,
    action_type, attachment_url
  } = req.body;

  if (!application_id || !status || !updated_by || !updated_by_role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  db.query(
    `INSERT INTO status_updates
     (application_id, status, remarks, updated_by,
      updated_by_role, is_visible_to_student, action_type, attachment_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      application_id, status, remarks || '', updated_by,
      updated_by_role, is_visible_to_student ?? 1,
      action_type || '', attachment_url || ''
    ],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update status', error: err });

      db.query(
        `UPDATE applications SET current_status = ? WHERE application_id = ?`,
        [status, application_id],
        (err2) => {
          if (err2) console.error('Failed to sync current_status', err2);
        }
      );

      db.query(`
        SELECT s.full_name, s.email, b.title AS bursary_title
        FROM applications a
        JOIN students s ON a.student_id = s.student_id
        JOIN bursaries b ON a.bursary_id = b.bursary_id
        WHERE a.application_id = ?`,
        [application_id], (err3, results) => {
          if (err3) return res.status(500).json({ message: 'Status updated but email failed' });
          if (results.length === 0) return res.status(404).json({ message: 'No student/email found' });

          const { full_name, email, bursary_title } = results[0];
          const emailHTML = `
            <p>Dear ${full_name},</p>
            <p>Your application for the bursary <strong>${bursary_title}</strong> has been marked as: <strong>${status}</strong>.</p>
            <p>${remarks || 'Thank you for applying.'}</p>
            <p>Best regards,<br/>Bursary Office</p>
          `;
          const subject = `Bursary Status Update: ${status}`;

          sendEmail(email, subject, emailHTML)
            .then(() => res.json({ message: 'Status updated and email sent' }))
            .catch(err4 => {
              console.error('❌ Email failed:', err4);
              res.status(500).json({ message: 'Status updated but failed to send email', error: err4 });
            });
        }
      );
    }
  );
});

module.exports = router;
