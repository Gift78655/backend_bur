// routes/documents.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 🗂️ Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 🧩 Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 📤 Upload Document
router.post('/upload', upload.single('file'), (req, res) => {
  const db = req.app.locals.db;
  const { application_id, student_id, category } = req.body;
  const file = req.file;

  if (!file || !application_id || !student_id || !category) {
    return res.status(400).json({ message: 'Missing required fields or file.' });
  }

  const {
    filename: file_name,
    originalname: original_name,
    path: file_path,
    mimetype: file_type,
    size: file_size
  } = file;

  const sql = `
    INSERT INTO documents (
      application_id, student_id, file_name, original_name,
      file_path, file_type, file_size, file_category, uploaded_by_role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    application_id, student_id, file_name, original_name,
    file_path, file_type, file_size, category, 'student'
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error('❌ Upload failed:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(201).json({ message: 'Document uploaded successfully.' });
  });
});

// 📄 Get All Documents for a Student
router.get('/student/:studentId', (req, res) => {
  const db = req.app.locals.db;
  const studentId = req.params.studentId;

  db.query(
    `SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC`,
    [studentId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch documents', error: err });
      res.json(results);
    }
  );
});

// 📄 Get Documents for an Application
router.get('/application/:applicationId', (req, res) => {
  const db = req.app.locals.db;
  const applicationId = req.params.applicationId;

  db.query(
    `SELECT document_id, original_name, file_type, file_size, uploaded_at, file_category, file_path
     FROM documents
     WHERE application_id = ?
     ORDER BY uploaded_at DESC`,
    [applicationId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch documents', error: err });
      res.json(results);
    }
  );
});

// ❌ Delete Document by ID
router.delete('/delete/:documentId', (req, res) => {
  const db = req.app.locals.db;
  const documentId = req.params.documentId;

  // Step 1: Get file path
  db.query('SELECT file_path FROM documents WHERE document_id = ?', [documentId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Document not found' });

    const filePath = results[0].file_path;

    // Step 2: Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.warn('⚠️ Could not delete file from disk:', unlinkErr);
      });
    }

    // Step 3: Delete from DB
    db.query('DELETE FROM documents WHERE document_id = ?', [documentId], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ message: 'Failed to delete document', error: deleteErr });
      res.json({ message: 'Document deleted successfully' });
    });
  });
});

module.exports = router;
