const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Render puts a proxy in front of the app, this makes req.ip the real visitor ip
app.set('trust proxy', 1);

// CSP is off because the page loads Google Fonts; the other helmet headers stay on
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// slows down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again after some time.' },
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// in production the same server also serves the built React app
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

module.exports = app;
