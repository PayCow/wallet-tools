const cryptoEngine = require('./src/services/crypto/index');
const assert = require('assert');

async function runNegativeAndBoundaryTests() {
  console.log('=================================================================================');
  console.log('  PAYCOW NEGATIVE & BOUNDARY FAILURE TESTS (FAIL-CLOSED SECURITY CHECKS)          ');
  console.log('=================================================================================\n');

  let passed = 0;

  assert.throws(
    () => {
      cryptoEngine.deriveWalletFromMnemonic('BTC', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', 'invalid_format_xyz');
    },
    /Unsupported BTC address format/,
    'Engine must reject unknown Bitcoin address format with explicit exception'
  );
  console.log('[PASS] Rejection: Unknown Bitcoin addressFormat fails closed (no silent fallback)');
  passed++;

  assert.throws(
    () => {
      cryptoEngine.deriveWalletFromMnemonic('UNKNOWN_CHAIN_XYZ', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    },
    /Unsupported blockchain network/,
    'Engine must reject unsupported network'
  );
  console.log('[PASS] Rejection: Unsupported network name fails closed');
  passed++;

  assert.throws(
    () => {
      cryptoEngine.importWalletFromPrivateKey('ETH', '0x123');
    },
    /invalid private key|invalid BytesLike value/i,
    'Engine must reject truncated/odd-length private key hex'
  );
  console.log('[PASS] Rejection: Truncated odd-length private key hex rejected');
  passed++;

  assert.throws(
    () => {
      cryptoEngine.importWalletFromPrivateKey('ETH', '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
    },
    /invalid BytesLike value|invalid hex|bad character/i,
    'Engine must reject non-hex characters in private key'
  );
  console.log('[PASS] Rejection: Non-hex characters in private key rejected');
  passed++;

  const validBtcWif = 'KxZ9p1P1hP8u7D7G9qF5y3m8b9n7p6c4x2v1z3q5w7e9r1t3y5u7';
  const corruptedWif = validBtcWif.slice(0, -1) + (validBtcWif.slice(-1) === 'A' ? 'B' : 'A');
  assert.throws(
    () => {
      cryptoEngine.importWalletFromPrivateKey('BTC', corruptedWif);
    },
    /Invalid Base58Check checksum|WIF/i,
    'Engine must reject corrupted WIF checksum'
  );
  console.log('[PASS] Rejection: Corrupted WIF checksum rejected');
  passed++;

  const ltcWallet = cryptoEngine.generateWalletByNetwork('LTC', 12);
  if (ltcWallet.wifPrivateKey) {
    assert.throws(
      () => {
        cryptoEngine.importWalletFromPrivateKey('BTC', ltcWallet.wifPrivateKey);
      },
      /WIF version byte mismatch|Invalid Base58Check/i,
      'Bitcoin importer must reject Litecoin WIF (version byte mismatch)'
    );
    console.log('[PASS] Rejection: Cross-network WIF version byte mismatch rejected');
    passed++;
  }

  assert.throws(
    () => {
      cryptoEngine.importWalletFromPrivateKey('SOL', '0OIl_invalid_base58');
    },
    /Non-base58 character|Invalid/i,
    'Solana importer must reject non-base58 characters (0, O, I, l)'
  );
  console.log('[PASS] Rejection: Invalid Base58 characters in Ed25519 secret rejected');
  passed++;

  console.log('\n=================================================================================');
  console.log(`  ALL ${passed} NEGATIVE & BOUNDARY FAILURE TESTS PASSED!`);
  console.log('=================================================================================');
}

runNegativeAndBoundaryTests().catch(err => {
  console.error('Negative test error:', err);
  process.exit(1);
});
