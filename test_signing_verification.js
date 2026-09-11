const { ethers } = require('ethers');
const nacl = require('tweetnacl');
const cryptoEngine = require('./src/services/crypto/index');
const { bs58 } = require('./src/services/crypto/utils');
const assert = require('assert');

async function runSigningAndUsabilityTests() {
  console.log('=================================================================================');
  console.log('  PAYCOW CRYPTOGRAPHIC KEY USABILITY & MESSAGE SIGNING VERIFICATION               ');
  console.log('=================================================================================\n');

  const testMessage = 'PayCow Non-Custodial Cryptographic Verification Payload 2026';
  const msgBytes = Buffer.from(testMessage, 'utf8');
  let passed = 0;

  const ethWallet = cryptoEngine.generateWalletByNetwork('ETH', 12);
  const signerWallet = new ethers.Wallet(ethWallet.privateKey);
  const ethSig = await signerWallet.signMessage(testMessage);
  const recoveredEthAddr = ethers.verifyMessage(testMessage, ethSig);
  assert.strictEqual(
    recoveredEthAddr.toLowerCase(),
    ethWallet.address.toLowerCase(),
    'Recovered Ethereum signature address mismatch!'
  );
  console.log(`[PASS] Secp256k1 ECDSA (Ethereum/EVM): Signature verified -> ${recoveredEthAddr}`);
  passed++;

  const btcWallet = cryptoEngine.generateWalletByNetwork('BTC', 12, 'p2wpkh');
  const btcSigner = new ethers.SigningKey(btcWallet.privateKey);
  const msgHash = ethers.sha256(msgBytes);
  const btcSig = btcSigner.sign(msgHash);
  const recoveredBtcPub = ethers.SigningKey.recoverPublicKey(msgHash, btcSig);
  const compRecoveredPub = ethers.SigningKey.computePublicKey(recoveredBtcPub, true);
  assert.strictEqual(
    compRecoveredPub,
    btcWallet.publicKey,
    'Recovered Bitcoin public key from ECDSA signature mismatch!'
  );
  console.log(`[PASS] Secp256k1 ECDSA (Bitcoin/UTXO): Signature verified against public key`);
  passed++;

  const solWallet = cryptoEngine.generateWalletByNetwork('SOL', 12);
  const keypairBytes = bs58.decode(solWallet.privateKey);
  const solSig = nacl.sign.detached(msgBytes, keypairBytes);
  const pubBytes = bs58.decode(solWallet.address);
  const solVerified = nacl.sign.detached.verify(msgBytes, solSig, pubBytes);
  assert(solVerified, 'Solana Ed25519 signature verification failed!');
  console.log(`[PASS] Ed25519 Detached (Solana): Signature verified -> ${solWallet.address.slice(0, 24)}...`);
  passed++;

  const nearWallet = cryptoEngine.generateWalletByNetwork('NEAR', 12);
  const nearCleanKey = nearWallet.privateKey.replace('ed25519:', '');
  const nearKpBytes = bs58.decode(nearCleanKey);
  const nearSig = nacl.sign.detached(msgBytes, nearKpBytes);
  const nearPubBytes = Buffer.from(nearWallet.address, 'hex');
  const nearVerified = nacl.sign.detached.verify(msgBytes, nearSig, nearPubBytes);
  assert(nearVerified, 'Near Protocol Ed25519 signature verification failed!');
  console.log(`[PASS] Ed25519 Detached (Near Protocol): Signature verified`);
  passed++;

  const adaWallet = cryptoEngine.generateWalletByNetwork('ADA', 12);
  const adaKpBytes = bs58.decode(adaWallet.privateKey);
  const adaPubBytes = bs58.decode(adaWallet.publicKey);
  const adaSig = nacl.sign.detached(msgBytes, adaKpBytes);
  const adaVerified = nacl.sign.detached.verify(msgBytes, adaSig, adaPubBytes);
  assert(adaVerified, 'Cardano Ed25519 signature verification failed!');
  console.log(`[PASS] Ed25519 Detached (Cardano CIP-1852): Signature verified`);
  passed++;

  console.log('\n=================================================================================');
  console.log(`  ALL ${passed} CRYPTOGRAPHIC SIGNING & USABILITY TESTS VERIFIED!`);
  console.log('=================================================================================');
}

runSigningAndUsabilityTests().catch(err => {
  console.error('Signing test error:', err);
  process.exit(1);
});
