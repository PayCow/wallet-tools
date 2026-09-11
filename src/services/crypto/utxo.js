const { ethers } = require('ethers');
const { bech32, bech32m } = require('bech32');
const { sha256, ripemd160, base58CheckEncode, base58CheckDecode, encodeCashAddr, encodeKaspaAddress, generateRandomMnemonic, bs58 } = require('./utils');

const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BB5BF589E94412564');

function taggedHash(tag, data) {
  const tagHash = ethers.getBytes(ethers.sha256(Buffer.from(tag, 'utf8')));
  return ethers.getBytes(ethers.sha256(Buffer.concat([tagHash, tagHash, data])));
}

function deriveTaprootAddressFromPrivate(privateKeyHex) {
  let privBig = BigInt(privateKeyHex);
  const uncompPub = ethers.SigningKey.computePublicKey(privateKeyHex, false);
  const uncompBytes = ethers.getBytes(uncompPub);
  const yByte = uncompBytes[64];
  
  if (yByte % 2 !== 0) {
    privBig = (SECP256K1_N - privBig) % SECP256K1_N;
  }
  
  const internalPrivHex = '0x' + privBig.toString(16).padStart(64, '0');
  const compPub = ethers.SigningKey.computePublicKey(internalPrivHex, true);
  const internalXOnly = ethers.getBytes(compPub).slice(1, 33);
  
  const tweak = BigInt('0x' + Buffer.from(taggedHash('TapTweak', internalXOnly)).toString('hex'));
  const tweakedPrivBig = (privBig + tweak) % SECP256K1_N;
  const tweakedPrivHex = '0x' + tweakedPrivBig.toString(16).padStart(64, '0');
  
  const outputPub = ethers.SigningKey.computePublicKey(tweakedPrivHex, true);
  const outputXOnly = ethers.getBytes(outputPub).slice(1, 33);
  
  const words = [1, ...bech32m.toWords(outputXOnly)];
  const p2trAddress = bech32m.encode('bc', words);
  return { p2trAddress, outputXOnly: '0x' + Buffer.from(outputXOnly).toString('hex'), internalXOnly: '0x' + Buffer.from(internalXOnly).toString('hex') };
}

function deriveBitcoinAddresses(compPub, privateKeyHex = null) {
  const pubKeyHash = ripemd160(sha256(compPub));
  
  const wordsSegwit = [0, ...bech32.toWords(pubKeyHash)];
  const p2wpkhAddress = bech32.encode('bc', wordsSegwit);
  
  const p2pkhAddress = base58CheckEncode(0x00, pubKeyHash);
  
  let p2trAddress;
  let xOnlyPub;
  if (privateKeyHex) {
    const tr = deriveTaprootAddressFromPrivate(privateKeyHex);
    p2trAddress = tr.p2trAddress;
    xOnlyPub = tr.outputXOnly;
  } else {
    const internalXOnly = ethers.getBytes(compPub).slice(1, 33);
    const tweak = BigInt('0x' + Buffer.from(taggedHash('TapTweak', internalXOnly)).toString('hex'));
    p2trAddress = bech32m.encode('bc', [1, ...bech32m.toWords(internalXOnly)]);
    xOnlyPub = '0x' + Buffer.from(internalXOnly).toString('hex');
  }

  return { p2wpkhAddress, p2trAddress, p2pkhAddress, pubKeyHash, xOnlyPub };
}

function encodeWIF(privateKeyHex, versionByte = 0x80) {
  const privKeyBuf = Buffer.from(ethers.getBytes(privateKeyHex));
  const payload = Buffer.concat([Buffer.from([versionByte]), privKeyBuf, Buffer.from([0x01])]);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

function decodeWIF(wifString, expectedVersion = 0x80) {
  const decoded = base58CheckDecode(wifString);
  if (expectedVersion !== null && decoded.prefix !== expectedVersion) {
    throw new Error(`WIF version byte mismatch: expected 0x${expectedVersion.toString(16)}, got 0x${decoded.prefix.toString(16)}`);
  }
  let privKeyBytes = decoded.data;
  if (privKeyBytes.length === 33 && privKeyBytes[32] === 0x01) {
    privKeyBytes = privKeyBytes.slice(0, 32);
  }
  if (privKeyBytes.length !== 32) {
    throw new Error(`Invalid WIF private key length: expected 32 bytes, got ${privKeyBytes.length}`);
  }
  return {
    version: decoded.prefix,
    privateKey: '0x' + Buffer.from(privKeyBytes).toString('hex')
  };
}

function deriveBitcoinFromMnemonic(mnemonic, addressFormat = 'p2wpkh') {
  const fmt = (addressFormat || 'p2wpkh').toLowerCase();
  let path = "m/84'/0'/0'/0/0";

  if (fmt === 'p2wpkh' || fmt === 'segwit') {
    path = "m/84'/0'/0'/0/0";
  } else if (fmt === 'p2tr' || fmt === 'taproot') {
    path = "m/86'/0'/0'/0/0";
  } else if (fmt === 'p2pkh' || fmt === 'legacy') {
    path = "m/44'/0'/0'/0/0";
  } else {
    throw new Error(`Unsupported BTC address format: "${addressFormat}". Supported formats: p2wpkh, p2tr, p2pkh`);
  }

  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
  const addrs = deriveBitcoinAddresses(compPub, hdNode.privateKey);
  const wifKey = encodeWIF(hdNode.privateKey, 0x80);

  let selectedAddress = addrs.p2wpkhAddress;
  if (fmt === 'p2tr' || fmt === 'taproot') selectedAddress = addrs.p2trAddress;
  if (fmt === 'p2pkh' || fmt === 'legacy') selectedAddress = addrs.p2pkhAddress;

  return {
    network: 'BTC',
    networkName: 'Bitcoin (BTC)',
    address: selectedAddress,
    addressFormat: fmt,
    p2wpkhAddress: addrs.p2wpkhAddress,
    p2trAddress: addrs.p2trAddress,
    p2pkhAddress: addrs.p2pkhAddress,
    privateKey: hdNode.privateKey,
    wifPrivateKey: wifKey,
    publicKey: compPub,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateBitcoin(mnemonicWords = 12, addressFormat = 'p2wpkh') {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveBitcoinFromMnemonic(mnemonic, addressFormat);
}

function importBitcoinFromPrivateKey(keyInput, addressFormat = 'p2wpkh') {
  const fmt = (addressFormat || 'p2wpkh').toLowerCase();
  let privKeyHex = keyInput.trim();

  if (privKeyHex.length > 50 && !privKeyHex.startsWith('0x')) {
    const decoded = decodeWIF(privKeyHex, 0x80);
    privKeyHex = decoded.privateKey;
  }
  if (!privKeyHex.startsWith('0x')) privKeyHex = '0x' + privKeyHex;

  if (privKeyHex.length !== 66) {
    throw new Error(`Invalid private key length: expected 32 bytes (64 hex chars), got ${privKeyHex.length - 2} chars`);
  }

  const compPub = ethers.SigningKey.computePublicKey(privKeyHex, true);
  const addrs = deriveBitcoinAddresses(compPub, privKeyHex);
  const wifKey = encodeWIF(privKeyHex, 0x80);

  let selectedAddress = addrs.p2wpkhAddress;
  if (fmt === 'p2tr' || fmt === 'taproot') selectedAddress = addrs.p2trAddress;
  if (fmt === 'p2pkh' || fmt === 'legacy') selectedAddress = addrs.p2pkhAddress;

  return {
    network: 'BTC',
    address: selectedAddress,
    addressFormat: fmt,
    p2wpkhAddress: addrs.p2wpkhAddress,
    p2trAddress: addrs.p2trAddress,
    p2pkhAddress: addrs.p2pkhAddress,
    privateKey: privKeyHex,
    wifPrivateKey: wifKey,
    publicKey: compPub
  };
}

function deriveUTXOFromMnemonic(mnemonic, netId = 'LTC') {
  const trimmed = mnemonic.trim();
  if (netId === 'LTC') {
    const path = "m/84'/2'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const words = [0, ...bech32.toWords(pubKeyHash)];
    const segwit = bech32.encode('ltc', words);
    const wif = encodeWIF(hdNode.privateKey, 0xb0);
    return { network: 'LTC', networkName: 'Litecoin (LTC)', address: segwit, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'DOGE') {
    const path = "m/44'/3'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const addr = base58CheckEncode(0x1e, pubKeyHash);
    const wif = encodeWIF(hdNode.privateKey, 0x9e);
    return { network: 'DOGE', networkName: 'Dogecoin (DOGE)', address: addr, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'BCH') {
    const path = "m/44'/145'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const addr = encodeCashAddr('bitcoincash', 'P2PKH', ethers.getBytes(pubKeyHash));
    const wif = encodeWIF(hdNode.privateKey, 0x80);
    return { network: 'BCH', networkName: 'Bitcoin Cash (BCH)', address: addr, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'DASH') {
    const path = "m/44'/5'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const addr = base58CheckEncode(0x4c, pubKeyHash);
    const wif = encodeWIF(hdNode.privateKey, 0xcc);
    return { network: 'DASH', networkName: 'Dash (DASH)', address: addr, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'RVN') {
    const path = "m/44'/175'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const addr = base58CheckEncode(0x3c, pubKeyHash);
    const wif = encodeWIF(hdNode.privateKey, 0x80);
    return { network: 'RVN', networkName: 'Ravencoin (RVN)', address: addr, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'DGB') {
    const path = "m/84'/20'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const pubKeyHash = ripemd160(sha256(compPub));
    const words = [0, ...bech32.toWords(pubKeyHash)];
    const addr = bech32.encode('dgb', words);
    const wif = encodeWIF(hdNode.privateKey, 0x80);
    return { network: 'DGB', networkName: 'DigiByte (DGB)', address: addr, privateKey: hdNode.privateKey, wifPrivateKey: wif, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  if (netId === 'KAS') {
    const path = "m/44'/111111'/0'/0/0";
    const hdNode = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
    const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
    const xOnly = ethers.getBytes(compPub).slice(1, 33);
    const addr = encodeKaspaAddress('kaspa', xOnly);
    return { network: 'KAS', networkName: 'Kaspa (KAS)', address: addr, privateKey: hdNode.privateKey, publicKey: compPub, mnemonic: trimmed, derivationPath: path };
  }

  return deriveBitcoinFromMnemonic(trimmed);
}

function generateUTXO(mnemonicWords = 12, netId = 'LTC') {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveUTXOFromMnemonic(mnemonic, netId);
}

function importUTXOFromPrivateKey(keyInput, netId = 'LTC') {
  let privKeyHex = keyInput.trim();
  const net = (netId || 'LTC').toUpperCase();

  const wifVersionMap = {
    'LTC': 0xb0,
    'DOGE': 0x9e,
    'BCH': 0x80,
    'DASH': 0xcc,
    'RVN': 0x80,
    'DGB': 0x80
  };

  if (privKeyHex.length > 50 && !privKeyHex.startsWith('0x')) {
    const expectedVer = wifVersionMap[net] !== undefined ? wifVersionMap[net] : null;
    const decoded = decodeWIF(privKeyHex, expectedVer);
    privKeyHex = decoded.privateKey;
  }
  if (!privKeyHex.startsWith('0x')) privKeyHex = '0x' + privKeyHex;

  if (privKeyHex.length !== 66) {
    throw new Error(`Invalid private key length for ${netId}: expected 32 bytes hex, got ${privKeyHex.length - 2} chars`);
  }

  const compPub = ethers.SigningKey.computePublicKey(privKeyHex, true);
  const pubKeyHash = ripemd160(sha256(compPub));

  if (net === 'LTC') {
    const words = [0, ...bech32.toWords(pubKeyHash)];
    const segwit = bech32.encode('ltc', words);
    const wif = encodeWIF(privKeyHex, 0xb0);
    return { network: 'LTC', address: segwit, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'DOGE') {
    const addr = base58CheckEncode(0x1e, pubKeyHash);
    const wif = encodeWIF(privKeyHex, 0x9e);
    return { network: 'DOGE', address: addr, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'BCH') {
    const addr = encodeCashAddr('bitcoincash', 'P2PKH', ethers.getBytes(pubKeyHash));
    const wif = encodeWIF(privKeyHex, 0x80);
    return { network: 'BCH', address: addr, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'DASH') {
    const addr = base58CheckEncode(0x4c, pubKeyHash);
    const wif = encodeWIF(privKeyHex, 0xcc);
    return { network: 'DASH', address: addr, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'RVN') {
    const addr = base58CheckEncode(0x3c, pubKeyHash);
    const wif = encodeWIF(privKeyHex, 0x80);
    return { network: 'RVN', address: addr, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'DGB') {
    const words = [0, ...bech32.toWords(pubKeyHash)];
    const addr = bech32.encode('dgb', words);
    const wif = encodeWIF(privKeyHex, 0x80);
    return { network: 'DGB', address: addr, privateKey: privKeyHex, wifPrivateKey: wif, publicKey: compPub };
  }
  if (net === 'KAS') {
    const xOnly = ethers.getBytes(compPub).slice(1, 33);
    const addr = encodeKaspaAddress('kaspa', xOnly);
    return { network: 'KAS', address: addr, privateKey: privKeyHex, publicKey: compPub };
  }

  return importBitcoinFromPrivateKey(keyInput);
}

module.exports = {
  generateBitcoin,
  deriveBitcoinFromMnemonic,
  importBitcoinFromPrivateKey,
  generateUTXO,
  deriveUTXOFromMnemonic,
  importUTXOFromPrivateKey,
  encodeWIF,
  decodeWIF
};
