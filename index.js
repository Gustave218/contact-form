require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const users = require('./users'); // 👈 API key → email mapping

const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* =======================
   ROOT ROUTE
======================= */
app.get('/', (req, res) => {
  res.send('✅ Contact Form API is running');
});

/* =======================
   EMAIL CONFIG
======================= */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

/* =======================
   FORM SUBMISSION (MULTI-USER)
======================= */
app.post('/submit', async (req, res) => {
  const { apiKey, name, phone, email, message } = req.body;

  // 1️⃣ API KEY VALIDATION
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key is required.'
    });
  }

  const user = users[apiKey];
  if (!user) {
    return res.status(403).json({
      error: 'Invalid API key.'
    });
  }

  // 2️⃣ REQUIRED FIELDS VALIDATION
  if (!name || !phone || !message) {
    return res.status(400).json({
      error: 'Name, phone number, and message are required.'
    });
  }

  // 3️⃣ TRANSPORTER CHECK
  const transporter = getTransporter();
  if (!transporter) {
    return res.status(500).json({
      error: 'Email service is not configured.'
    });
  }

  // 4️⃣ EMAIL CONTENT
  const mailOptions = {
    from: `"${user.name} Contact Form" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `📩 New contact message from ${name}`,
    text: `
New contact form submission

Client: ${user.name}
Name: ${name}
Phone: ${phone}
Email: ${email || 'Not provided'}

Message:
${message}
    `,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Client:</strong> ${user.name}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email || 'Not provided'}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  };

  // 5️⃣ SEND EMAIL
  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      error: 'Failed to send email.'
    });
  }
});

/* =======================
   HEALTH CHECK
======================= */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
