const nacl = require('tweetnacl');
const { ethers } = require('ethers');
const { bech32 } = require('bech32');
const { blake2b, blake2bHex } = require('blakejs');
const { sha256, sha3_256, sha512_256, ripemd160, base32Encode, base32Decode, getBip39Seed, derivePathEd25519, generateRandomMnemonic, bs58 } = require('./utils');

function deriveSolanaFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/501'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const address = bs58.encode(keypair.publicKey);
  const secretKey = bs58.encode(keypair.secretKey);

  return {
    network: 'SOL',
    networkName: 'Solana (SOL)',
    address: address,
    privateKey: secretKey,
    publicKey: address,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateSolana(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveSolanaFromMnemonic(mnemonic);
}

function importSolanaFromPrivateKey(secretKeyInput) {
  let secretKeyBytes;
  const trimmed = secretKeyInput.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    secretKeyBytes = new Uint8Array(JSON.parse(trimmed));
  } else {
    secretKeyBytes = bs58.decode(trimmed);
  }
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const address = bs58.encode(keypair.publicKey);
  return {
    network: 'SOL',
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: address
  };
}

function deriveNearFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/397'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const address = Buffer.from(keypair.publicKey).toString('hex');
  return {
    network: 'NEAR',
    networkName: 'Near Protocol (NEAR)',
    address: address,
    privateKey: 'ed25519:' + bs58.encode(keypair.secretKey),
    publicKey: 'ed25519:' + bs58.encode(keypair.publicKey),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateNear(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveNearFromMnemonic(mnemonic);
}

function importNearFromPrivateKey(privateKeyInput) {
  let cleanKey = privateKeyInput.trim();
  if (cleanKey.startsWith('ed25519:')) cleanKey = cleanKey.slice(8);
  const secretKeyBytes = bs58.decode(cleanKey);
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const address = Buffer.from(keypair.publicKey).toString('hex');
  return {
    network: 'NEAR',
    address: address,
    privateKey: 'ed25519:' + bs58.encode(keypair.secretKey),
    publicKey: 'ed25519:' + bs58.encode(keypair.publicKey)
  };
}

function deriveAptosFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/637'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const pubBuf = Buffer.from(keypair.publicKey);
  const authKey = sha3_256(Buffer.concat([pubBuf, Buffer.from([0x00])]));
  const address = '0x' + authKey.toString('hex');
  return {
    network: 'APT',
    networkName: 'Aptos (APT)',
    address: address,
    privateKey: '0x' + Buffer.from(keypair.secretKey.slice(0, 32)).toString('hex'),
    publicKey: '0x' + pubBuf.toString('hex'),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateAptos(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveAptosFromMnemonic(mnemonic);
}

function importAptosFromPrivateKey(privateKeyHex) {
  const cleanHex = privateKeyHex.trim().startsWith('0x') ? privateKeyHex.trim().slice(2) : privateKeyHex.trim();
  const seedBytes = Buffer.from(cleanHex, 'hex');
  const keypair = nacl.sign.keyPair.fromSeed(seedBytes);
  const pubBuf = Buffer.from(keypair.publicKey);
  const authKey = sha3_256(Buffer.concat([pubBuf, Buffer.from([0x00])]));
  return {
    network: 'APT',
    address: '0x' + authKey.toString('hex'),
    privateKey: '0x' + cleanHex,
    publicKey: '0x' + pubBuf.toString('hex')
  };
}

function deriveSuiFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/784'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const pubBuf = Buffer.from(keypair.publicKey);
  const payload = Buffer.concat([Buffer.from([0x00]), pubBuf]);
  const address = '0x' + blake2bHex(payload, null, 32);
  return {
    network: 'SUI',
    networkName: 'Sui Network (SUI)',
    address: address,
    privateKey: '0x' + Buffer.from(keypair.secretKey.slice(0, 32)).toString('hex'),
    publicKey: '0x' + pubBuf.toString('hex'),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateSui(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveSuiFromMnemonic(mnemonic);
}

function importSuiFromPrivateKey(privateKeyHex) {
  const cleanHex = privateKeyHex.trim().startsWith('0x') ? privateKeyHex.trim().slice(2) : privateKeyHex.trim();
  const seedBytes = Buffer.from(cleanHex, 'hex');
  const keypair = nacl.sign.keyPair.fromSeed(seedBytes);
  const pubBuf = Buffer.from(keypair.publicKey);
  const payload = Buffer.concat([Buffer.from([0x00]), pubBuf]);
  const address = '0x' + blake2bHex(payload, null, 32);
  return {
    network: 'SUI',
    address: address,
    privateKey: '0x' + cleanHex,
    publicKey: '0x' + pubBuf.toString('hex')
  };
}

function deriveCardanoFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/1852'/1815'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const pubBuf = Buffer.from(keypair.publicKey);
  const pkh = Buffer.from(blake2b(pubBuf, null, 28));
  
  const payload = Buffer.concat([Buffer.from([0x61]), pkh]);
  const words = bech32.toWords(payload);
  const address = bech32.encode('addr', words);

  return {
    network: 'ADA',
    networkName: 'Cardano (ADA)',
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateCardano(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveCardanoFromMnemonic(mnemonic);
}

function importCardanoFromPrivateKey(secretKeyInput) {
  const secretKeyBytes = bs58.decode(secretKeyInput.trim());
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const pubBuf = Buffer.from(keypair.publicKey);
  const pkh = Buffer.from(blake2b(pubBuf, null, 28));
  const payload = Buffer.concat([Buffer.from([0x61]), pkh]);
  const words = bech32.toWords(payload);
  const address = bech32.encode('addr', words);

  return {
    network: 'ADA',
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey)
  };
}

function deriveAlgorandFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/283'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const pubBuf = Buffer.from(keypair.publicKey);
  
  const checksum = sha512_256(pubBuf).slice(28, 32);
  const address = base32Encode(Buffer.concat([pubBuf, checksum]));

  return {
    network: 'ALGO',
    networkName: 'Algorand (ALGO)',
    address: address,
    privateKey: '0x' + Buffer.from(keypair.secretKey.slice(0, 32)).toString('hex'),
    publicKey: '0x' + pubBuf.toString('hex'),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateAlgorand(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveAlgorandFromMnemonic(mnemonic);
}

function importAlgorandFromPrivateKey(privateKeyHex) {
  const cleanHex = privateKeyHex.trim().startsWith('0x') ? privateKeyHex.trim().slice(2) : privateKeyHex.trim();
  const seedBytes = Buffer.from(cleanHex, 'hex');
  const keypair = nacl.sign.keyPair.fromSeed(seedBytes);
  const pubBuf = Buffer.from(keypair.publicKey);
  const checksum = sha512_256(pubBuf).slice(28, 32);
  const address = base32Encode(Buffer.concat([pubBuf, checksum]));

  return {
    network: 'ALGO',
    address: address,
    privateKey: '0x' + cleanHex,
    publicKey: '0x' + pubBuf.toString('hex')
  };
}

module.exports = {
  generateSolana,
  deriveSolanaFromMnemonic,
  importSolanaFromPrivateKey,
  generateNear,
  deriveNearFromMnemonic,
  importNearFromPrivateKey,
  generateAptos,
  deriveAptosFromMnemonic,
  importAptosFromPrivateKey,
  generateSui,
  deriveSuiFromMnemonic,
  importSuiFromPrivateKey,
  generateCardano,
  deriveCardanoFromMnemonic,
  importCardanoFromPrivateKey,
  generateAlgorand,
  deriveAlgorandFromMnemonic,
  importAlgorandFromPrivateKey
};
