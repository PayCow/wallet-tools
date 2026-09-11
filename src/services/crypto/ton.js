const nacl = require('tweetnacl');
const { sha256, tonCrc16, getBip39Seed, derivePathEd25519, generateRandomMnemonic, bs58 } = require('./utils');

function deriveTonAddress(publicKeyBytes) {
  const pubKeyHash = sha256(Buffer.from(publicKeyBytes));
  const tag = Buffer.from([0x11, 0x00]);
  const payload = Buffer.concat([tag, pubKeyHash]);
  const checksum = tonCrc16(payload);
  return Buffer.concat([payload, checksum]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

function deriveTonFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/607'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const rawBase64 = deriveTonAddress(keypair.publicKey);

  return {
    network: 'TON',
    networkName: 'The Open Network (TON)',
    address: rawBase64,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateTon(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveTonFromMnemonic(mnemonic);
}

function importTonFromPrivateKey(secretKeyInput) {
  const secretKeyBytes = bs58.decode(secretKeyInput.trim());
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const address = deriveTonAddress(keypair.publicKey);
  return {
    network: 'TON',
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey)
  };
}

module.exports = {
  generateTon,
  deriveTonFromMnemonic,
  importTonFromPrivateKey,
  deriveTonAddress
};
