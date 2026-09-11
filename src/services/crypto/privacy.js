const nacl = require('tweetnacl');
const { ethers } = require('ethers');
const { sha256, ripemd160, base58CheckDecode, xmrBase58Encode, getBip39Seed, derivePathEd25519, generateRandomMnemonic, bs58 } = require('./utils');

function deriveMoneroFromMnemonic(mnemonic) {
  const bip39Seed = getBip39Seed(mnemonic.trim());
  const path = "m/44'/128'/0'/0'/0'";
  const derived = derivePathEd25519(bip39Seed, path);
  
  const spendKp = nacl.sign.keyPair.fromSeed(derived.key);
  const privateSpendKey = Buffer.from(spendKp.secretKey.slice(0, 32)).toString('hex');
  const publicSpendKey = Buffer.from(spendKp.publicKey).toString('hex');
  
  const viewSeed = sha256(Buffer.from(privateSpendKey, 'hex'));
  const viewKp = nacl.sign.keyPair.fromSeed(viewSeed);
  const privateViewKey = Buffer.from(viewKp.secretKey.slice(0, 32)).toString('hex');
  const publicViewKey = Buffer.from(viewKp.publicKey).toString('hex');

  const netByte = Buffer.from([0x12]);
  const payload = Buffer.concat([netByte, Buffer.from(spendKp.publicKey), Buffer.from(viewKp.publicKey)]);
  const checksum = Buffer.from(ethers.getBytes(ethers.keccak256(payload))).slice(0, 4);
  const address = xmrBase58Encode(Buffer.concat([payload, checksum]));

  return {
    network: 'XMR',
    networkName: 'Monero (XMR)',
    address: address,
    privateSpendKey: privateSpendKey,
    privateViewKey: privateViewKey,
    privateKey: `${privateSpendKey}:${privateViewKey}`,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateMonero(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveMoneroFromMnemonic(mnemonic);
}

function importMoneroFromPrivateKey(keyInput) {
  const [spendHex, viewHex] = keyInput.trim().split(':');
  const spendKp = nacl.sign.keyPair.fromSeed(Buffer.from(spendHex, 'hex'));
  let viewKp;
  if (viewHex) {
    viewKp = nacl.sign.keyPair.fromSeed(Buffer.from(viewHex, 'hex'));
  } else {
    const viewSeed = sha256(Buffer.from(spendHex, 'hex'));
    viewKp = nacl.sign.keyPair.fromSeed(viewSeed);
  }
  const netByte = Buffer.from([0x12]);
  const payload = Buffer.concat([netByte, Buffer.from(spendKp.publicKey), Buffer.from(viewKp.publicKey)]);
  const checksum = Buffer.from(ethers.getBytes(ethers.keccak256(payload))).slice(0, 4);
  const address = xmrBase58Encode(Buffer.concat([payload, checksum]));
  return {
    network: 'XMR',
    address: address,
    privateSpendKey: spendHex,
    privateViewKey: Buffer.from(viewKp.secretKey.slice(0, 32)).toString('hex')
  };
}

function deriveZcashAddress(compPub) {
  const pubKeyHash = ripemd160(sha256(compPub));
  const payload = Buffer.concat([Buffer.from([0x1c, 0xb8]), pubKeyHash]);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

function deriveZcashFromMnemonic(mnemonic) {
  const path = "m/44'/133'/0'/0/0";
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
  const address = deriveZcashAddress(compPub);
  const privKeyBuf = Buffer.from(ethers.getBytes(hdNode.privateKey));
  const wif = bs58.encode(Buffer.concat([Buffer.from([0x80]), privKeyBuf, Buffer.from([0x01]), sha256(sha256(Buffer.concat([Buffer.from([0x80]), privKeyBuf, Buffer.from([0x01])]))).slice(0, 4)]));
  return { network: 'ZEC', networkName: 'Zcash (ZEC)', address: address, privateKey: hdNode.privateKey, wifPrivateKey: wif, mnemonic: mnemonic.trim(), derivationPath: path };
}

function generateZcash(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveZcashFromMnemonic(mnemonic);
}

function importZcashFromPrivateKey(keyInput) {
  let privKeyHex = keyInput.trim();
  if (privKeyHex.length > 50 && !privKeyHex.startsWith('0x')) {
    const decoded = base58CheckDecode(privKeyHex);
    let privKeyBytes = decoded.data;
    if (privKeyBytes.length === 33 && privKeyBytes[32] === 0x01) {
      privKeyBytes = privKeyBytes.slice(0, 32);
    }
    privKeyHex = '0x' + Buffer.from(privKeyBytes).toString('hex');
  }
  if (!privKeyHex.startsWith('0x')) privKeyHex = '0x' + privKeyHex;

  const compPub = ethers.SigningKey.computePublicKey(privKeyHex, true);
  const address = deriveZcashAddress(compPub);
  return {
    network: 'ZEC',
    address: address,
    privateKey: privKeyHex
  };
}

module.exports = {
  generateMonero,
  deriveMoneroFromMnemonic,
  importMoneroFromPrivateKey,
  generateZcash,
  deriveZcashFromMnemonic,
  importZcashFromPrivateKey,
  deriveZcashAddress
};
