const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.join(__dirname, '../../jwt_secret.key');
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  const generatedSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, generatedSecret, { mode: 0o600 });
  } catch (e) {}
  return generatedSecret;
}

const JWT_SECRET = getJwtSecret();
const COOKIE_NAME = 'paycow_auth_token';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d'
    }
  );
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please sign in again.' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

const genLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Wallet generation rate limit reached. Please wait a moment.' }
});

module.exports = {
  COOKIE_NAME,
  generateToken,
  requireAuth,
  optionalAuth,
  authLimiter,
  genLimiter
};
