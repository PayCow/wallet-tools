const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./src/routes/authRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const { requireAuth } = require('./src/middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3849;
let isRunningTests = false;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://static.cloudflareinsights.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://cloudflareinsights.com"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

const ALLOWED_FILES = {
  'src/services/crypto/index.js': path.join(__dirname, 'src/services/crypto/index.js'),
  'src/services/crypto/evm.js': path.join(__dirname, 'src/services/crypto/evm.js'),
  'src/services/crypto/utxo.js': path.join(__dirname, 'src/services/crypto/utxo.js'),
  'src/services/crypto/ed25519.js': path.join(__dirname, 'src/services/crypto/ed25519.js'),
  'src/services/crypto/substrate.js': path.join(__dirname, 'src/services/crypto/substrate.js'),
  'src/services/crypto/cosmos.js': path.join(__dirname, 'src/services/crypto/cosmos.js'),
  'src/services/crypto/ripple.js': path.join(__dirname, 'src/services/crypto/ripple.js'),
  'src/services/crypto/tron.js': path.join(__dirname, 'src/services/crypto/tron.js'),
  'src/services/crypto/privacy.js': path.join(__dirname, 'src/services/crypto/privacy.js'),
  'src/services/crypto/ton.js': path.join(__dirname, 'src/services/crypto/ton.js'),
  'src/services/crypto/utils.js': path.join(__dirname, 'src/services/crypto/utils.js'),
  'src/services/crypto/networks.js': path.join(__dirname, 'src/services/crypto/networks.js'),
  'public/js/app.js': path.join(__dirname, 'public/js/app.js'),
  'tests/test_suite.js': path.join(__dirname, 'test_suite.js'),
  'tests/test_wallet_import.js': path.join(__dirname, 'test_wallet_import.js'),
  'tests/test_signing_verification.js': path.join(__dirname, 'test_signing_verification.js'),
  'tests/test_negative_cases.js': path.join(__dirname, 'test_negative_cases.js'),
  'tests/test_security_audit.js': path.join(__dirname, 'test_security_audit.js'),
  'tests/test_results.log': path.join(__dirname, 'test_results.log')
};

app.get('/api/file-explorer/tree', (req, res) => {
  const tree = [
    {
      name: 'src',
      type: 'directory',
      children: [
        {
          name: 'services',
          type: 'directory',
          children: [
            {
              name: 'crypto',
              type: 'directory',
              children: [
                { name: 'index.js', type: 'file', path: 'src/services/crypto/index.js', icon: 'fa-brands fa-js' },
                { name: 'evm.js', type: 'file', path: 'src/services/crypto/evm.js', icon: 'fa-brands fa-ethereum' },
                { name: 'utxo.js', type: 'file', path: 'src/services/crypto/utxo.js', icon: 'fa-brands fa-bitcoin' },
                { name: 'ed25519.js', type: 'file', path: 'src/services/crypto/ed25519.js', icon: 'fa-solid fa-sun' },
                { name: 'substrate.js', type: 'file', path: 'src/services/crypto/substrate.js', icon: 'fa-solid fa-circle-nodes' },
                { name: 'cosmos.js', type: 'file', path: 'src/services/crypto/cosmos.js', icon: 'fa-solid fa-atom' },
                { name: 'ripple.js', type: 'file', path: 'src/services/crypto/ripple.js', icon: 'fa-solid fa-water' },
                { name: 'tron.js', type: 'file', path: 'src/services/crypto/tron.js', icon: 'fa-solid fa-gem' },
                { name: 'privacy.js', type: 'file', path: 'src/services/crypto/privacy.js', icon: 'fa-solid fa-user-secret' },
                { name: 'ton.js', type: 'file', path: 'src/services/crypto/ton.js', icon: 'fa-solid fa-paper-plane' },
                { name: 'utils.js', type: 'file', path: 'src/services/crypto/utils.js', icon: 'fa-solid fa-screwdriver-wrench' },
                { name: 'networks.js', type: 'file', path: 'src/services/crypto/networks.js', icon: 'fa-solid fa-network-wired' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'public',
      type: 'directory',
      children: [
        {
          name: 'js',
          type: 'directory',
          children: [
            { name: 'app.js', type: 'file', path: 'public/js/app.js', icon: 'fa-brands fa-js' }
          ]
        }
      ]
    },
    {
      name: 'tests',
      type: 'directory',
      children: [
        { name: 'test_suite.js (Deterministic Vectors)', type: 'file', path: 'tests/test_suite.js', icon: 'fa-solid fa-flask-vial' },
        { name: 'test_wallet_import.js (35-Chain Roundtrip)', type: 'file', path: 'tests/test_wallet_import.js', icon: 'fa-solid fa-vial-circle-check' },
        { name: 'test_signing_verification.js (Signing & Crypto Verification)', type: 'file', path: 'tests/test_signing_verification.js', icon: 'fa-solid fa-signature' },
        { name: 'test_negative_cases.js (Fail-Closed Boundary Checks)', type: 'file', path: 'tests/test_negative_cases.js', icon: 'fa-solid fa-triangle-exclamation' },
        { name: 'test_security_audit.js (Client Isolation & Firewall Checks)', type: 'file', path: 'tests/test_security_audit.js', icon: 'fa-solid fa-shield-virus' },
        { name: 'test_results.log (Live Execution Report)', type: 'file', path: 'tests/test_results.log', icon: 'fa-solid fa-file-lines' }
      ]
    }
  ];

  return res.json({ success: true, tree });
});

app.get('/api/file-explorer/read', (req, res) => {
  const requestedPath = req.query.path;
  const target = ALLOWED_FILES[requestedPath];
  if (!target || !fs.existsSync(target)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  const stat = fs.statSync(target);
  const content = fs.readFileSync(target, 'utf8');
  return res.json({
    success: true,
    path: requestedPath,
    name: path.basename(target),
    size: stat.size,
    content
  });
});

app.post('/api/file-explorer/run-tests', requireAuth, (req, res) => {
  if (isRunningTests) {
    const existingLog = fs.existsSync(path.join(__dirname, 'test_results.log'))
      ? fs.readFileSync(path.join(__dirname, 'test_results.log'), 'utf8')
      : 'Tests are currently running in the background...';
    return res.json({
      success: true,
      output: existingLog,
      status: 'already_running'
    });
  }

  isRunningTests = true;
  exec('node test_suite.js && node test_wallet_import.js && node test_signing_verification.js && node test_negative_cases.js && node test_security_audit.js', { cwd: __dirname, timeout: 60000 }, (error, stdout, stderr) => {
    isRunningTests = false;
    const output = (stdout || '') + (stderr ? '\n' + stderr : '');
    fs.writeFileSync(path.join(__dirname, 'test_results.log'), output, 'utf8');
    return res.json({
      success: !error,
      output: output,
      exitCode: error ? (error.code || 1) : 0
    });
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api', walletRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'PayCow Wallet Generator Suite' });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PayCow Tools Wallet Suite running on http://localhost:${PORT}`);
});
