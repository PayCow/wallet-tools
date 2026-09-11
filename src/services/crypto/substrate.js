const nacl = require('tweetnacl');
const { blake2b } = require('blakejs');
const { getBip39Seed, derivePathEd25519, generateRandomMnemonic, bs58 } = require('./utils');

function deriveSubstrateAddress(publicKeyBytes, prefixByte = 0x00) {
  const prefix = Buffer.from([prefixByte]);
  const payload = Buffer.concat([prefix, Buffer.from(publicKeyBytes)]);
  const ss58Hash = blake2b(Buffer.concat([Buffer.from('SS58PRE'), payload]), null, 64);
  const checksum = Buffer.from(ss58Hash).slice(0, 2);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

function deriveSubstrateFromMnemonic(mnemonic, netId = 'DOT', name = 'Polkadot (DOT)', prefixByte = 0x00) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = netId === 'KSM' ? "m/44'/434'/0'/0'/0'" : "m/44'/354'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  const keypair = nacl.sign.keyPair.fromSeed(derived.key);
  const address = deriveSubstrateAddress(keypair.publicKey, prefixByte);

  return {
    network: netId,
    networkName: name,
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateSubstrate(mnemonicWords = 12, netId = 'DOT', name = 'Polkadot (DOT)', prefixByte = 0x00) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveSubstrateFromMnemonic(mnemonic, netId, name, prefixByte);
}

function importSubstrateFromPrivateKey(secretKeyInput, prefixByte = 0x00) {
  const secretKeyBytes = bs58.decode(secretKeyInput.trim());
  const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const address = deriveSubstrateAddress(keypair.publicKey, prefixByte);
  return {
    address: address,
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: bs58.encode(keypair.publicKey)
  };
}

module.exports = {
  generateSubstrate,
  deriveSubstrateFromMnemonic,
  importSubstrateFromPrivateKey,
  deriveSubstrateAddress
};
