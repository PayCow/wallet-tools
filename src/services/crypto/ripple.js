const { ethers } = require('ethers');
const { sha256, ripemd160, base58RippleEncode, base58RippleDecode, generateRandomMnemonic } = require('./utils');

function deriveRippleAddress(compPub) {
  const pubKeyHash = ripemd160(sha256(compPub));
  const payload = Buffer.concat([Buffer.from([0x00]), pubKeyHash]);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return base58RippleEncode(Buffer.concat([payload, checksum]));
}

function deriveRippleFromMnemonic(mnemonic) {
  const path = "m/44'/144'/0'/0/0";
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
  const address = deriveRippleAddress(compPub);

  const seedBytes = Buffer.from(ethers.getBytes(hdNode.privateKey)).slice(0, 16);
  const seedPayload = Buffer.concat([Buffer.from([0x21]), seedBytes]);
  const seedChecksum = sha256(sha256(seedPayload)).slice(0, 4);
  const secretSeed = base58RippleEncode(Buffer.concat([seedPayload, seedChecksum]));

  return {
    network: 'XRP',
    networkName: 'Ripple (XRP)',
    address: address,
    privateKey: hdNode.privateKey,
    wifPrivateKey: secretSeed,
    publicKey: compPub,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateRipple(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveRippleFromMnemonic(mnemonic);
}

function importRippleFromPrivateKey(keyInput) {
  let cleanKey = keyInput.trim();

  if (cleanKey.startsWith('s') && cleanKey.length >= 28 && cleanKey.length <= 35) {
    const decoded = base58RippleDecode(cleanKey);
    const rawSeed = decoded.slice(1, 17);
    const hash = ethers.getBytes(ethers.sha512(rawSeed));
    const derivedPrivKey = '0x' + Buffer.from(hash.slice(0, 32)).toString('hex');
    const compPub = ethers.SigningKey.computePublicKey(derivedPrivKey, true);
    const address = deriveRippleAddress(compPub);
    return {
      network: 'XRP',
      address: address,
      privateKey: derivedPrivKey,
      publicKey: compPub
    };
  }

  if (!cleanKey.startsWith('0x')) cleanKey = '0x' + cleanKey;

  const compPub = ethers.SigningKey.computePublicKey(cleanKey, true);
  const address = deriveRippleAddress(compPub);
  return {
    network: 'XRP',
    address: address,
    privateKey: cleanKey,
    publicKey: compPub
  };
}

module.exports = {
  generateRipple,
  deriveRippleFromMnemonic,
  importRippleFromPrivateKey,
  deriveRippleAddress
};
