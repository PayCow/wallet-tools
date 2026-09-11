const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { NETWORKS_REGISTRY } = require('../services/crypto/networks');
const { requireAuth } = require('../middleware/authMiddleware');

const ALLOWED_SAVE_FIELDS = new Set(['network', 'address', 'derivation_path', 'label']);
const SENSITIVE_KEYWORDS = [
  'privatekey',
  'private_key',
  'privkey',
  'secret',
  'secretkey',
  'secret_key',
  'mnemonic',
  'seed',
  'seedphrase',
  'recoveryphrase',
  'wif',
  'xprv',
  'keypair'
];

function enforcePublicFieldsAllowlist(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const keys = Object.keys(req.body);
    
    for (const key of keys) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEYWORDS.includes(lowerKey)) {
        return res.status(400).json({
          success: false,
          error: 'SECURITY VIOLATION: Private keys, seeds, or mnemonic phrases must NEVER be transmitted to the server.'
        });
      }
      if (!ALLOWED_SAVE_FIELDS.has(key)) {
        return res.status(400).json({
          success: false,
          error: `UNRECOGNIZED FIELD: Field "${key}" is not permitted in public ledger entries.`
        });
      }
    }
  }
  next();
}

router.get('/networks', (req, res) => {
  return res.json({
    success: true,
    networks: NETWORKS_REGISTRY
  });
});

router.all(['/generate', '/bulk', '/universal-seed'], (req, res) => {
  return res.status(403).json({
    success: false,
    securityNotice: 'NON-CUSTODIAL CLIENT EXECUTION REQUIRED',
    error: 'Private keys are strictly forbidden from being generated on or transmitted to the server. All cryptographic generation runs 100% client-side in your browser via window.PayCowCrypto.'
  });
});

router.post('/save-public', enforcePublicFieldsAllowlist, requireAuth, (req, res) => {
  try {
    const { network, address, derivation_path, label } = req.body;

    if (!network || !address) {
      return res.status(400).json({ success: false, error: 'Network and public address are required.' });
    }

    const cleanNetwork = String(network).toUpperCase().trim();
    const cleanAddress = String(address).trim();
    const cleanPath = derivation_path ? String(derivation_path).trim() : null;
    const cleanLabel = label ? String(label).trim().slice(0, 50) : `${cleanNetwork} Wallet`;

    const stmt = db.prepare(`
      INSERT INTO user_saved_wallets (user_id, network, address, derivation_path, label)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, cleanNetwork, cleanAddress, cleanPath, cleanLabel);

    return res.status(201).json({
      success: true,
      message: 'Public address saved to account ledger.',
      savedId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Save public wallet error:', err);
    return res.status(500).json({ success: false, error: 'Error saving public address.' });
  }
});

router.get('/history', requireAuth, (req, res) => {
  try {
    const wallets = db.prepare(`
      SELECT id, network, address, derivation_path, label, created_at
      FROM user_saved_wallets
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 100
    `).all(req.user.id);

    return res.json({
      success: true,
      wallets
    });
  } catch (err) {
    console.error('Get history error:', err);
    return res.status(500).json({ success: false, error: 'Error loading history.' });
  }
});

router.delete('/history/:id', requireAuth, (req, res) => {
  try {
    const walletId = parseInt(req.params.id, 10);
    const result = db.prepare('DELETE FROM user_saved_wallets WHERE id = ? AND user_id = ?').run(walletId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }

    return res.json({ success: true, message: 'Address record deleted.' });
  } catch (err) {
    console.error('Delete history error:', err);
    return res.status(500).json({ success: false, error: 'Error deleting record.' });
  }
});

router.get('/stats/overview', requireAuth, (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM user_saved_wallets WHERE user_id = ?').get(req.user.id);

    return res.json({
      success: true,
      stats: {
        userSavedCount: userCount ? userCount.count : 0,
        activeNetworksCount: NETWORKS_REGISTRY.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Could not load stats.' });
  }
});

module.exports = router;
