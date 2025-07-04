// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const log = (...args) => console.log('[DEBUG]', ...args);
console.log("🚀 Running backend_bur from:", __filename);



// Load environment variables
dotenv.config();

// Import email templates
const { generateApplicationEmail, generateWithdrawalEmail } = require('./emailNotifications');

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global request logger
app.use((req, res, next) => {
  log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// Ensure /uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Bursary Portal" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// Database connection
let db;
log('DEPLOYMENT_ENVIRONMENT =', process.env.DEPLOYMENT_ENVIRONMENT);
if (process.env.DEPLOYMENT_ENVIRONMENT === 'production') {
  const certPath = path.join(__dirname, 'certs', 'DigiCertGlobalRootG2.pem');
  log('Reading SSL cert from:', certPath);
  const ca = fs.readFileSync(certPath);
  log('SSL certificate loaded ✅');
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {
      ca,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
  });
} else {
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// Share across routes
app.locals.db = db;
app.locals.transporter = transporter;
app.locals.sendEmail = sendEmail;
app.locals.generateApplicationEmail = generateApplicationEmail;
app.locals.generateWithdrawalEmail = generateWithdrawalEmail;

// ✅ Modular Routes
app.use('/api', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/bursaries', require('./routes/bursaries'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', require('./routes/conversations'));

// 🧪 Sanity check
app.get('/', (req, res) => {
  res.send('✅ Bursary API is running');
});

// 🚀 Launch server (Render requires 0.0.0.0 for Docker)
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
