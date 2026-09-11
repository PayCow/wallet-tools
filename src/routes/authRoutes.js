const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, COOKIE_NAME, requireAuth, authLimiter } = require('../middleware/authMiddleware');

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 30 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Username or email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(username.trim(), email.trim().toLowerCase(), passwordHash);

    const user = { id: result.lastInsertRowid, username: username.trim(), email: email.trim().toLowerCase() };
    const token = generateToken(user);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration error occurred.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login.trim(), login.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const token = generateToken(user);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Sign in successful.',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Sign in error occurred.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true, message: 'Signed out successfully.' });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  return res.json({ success: true, user });
});

module.exports = router;
