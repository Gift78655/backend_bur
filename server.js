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

// ✅ CORS Setup
const allowedOrigins = [
  'https://bursary-frontend.onrender.com',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 🔁 Preflight support for all routes

// ✅ Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🧾 Request Logger
app.use((req, res, next) => {
  log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// 📁 Ensure /uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✉️ Email Transport
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

// 🗄️ MySQL Database Setup
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

// 🌐 Global Locals
app.locals.db = db;
app.locals.transporter = transporter;
app.locals.sendEmail = sendEmail;
app.locals.generateApplicationEmail = generateApplicationEmail;
app.locals.generateWithdrawalEmail = generateWithdrawalEmail;

// 🔀 Modular Routes
app.use('/api', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/bursaries', require('./routes/bursaries'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', require('./routes/conversations'));

// 🧪 API Sanity Check
app.get('/', (req, res) => {
  res.send('✅ Bursary API is running');
});

// 🚀 Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
