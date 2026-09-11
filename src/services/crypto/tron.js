const { ethers } = require('ethers');
const { sha256, generateRandomMnemonic, bs58 } = require('./utils');

function deriveTronAddress(privateKeyHex) {
  const uncompressedPub = ethers.getBytes(ethers.SigningKey.computePublicKey(privateKeyHex, false)).slice(1);
  const keccak = ethers.getBytes(ethers.keccak256(uncompressedPub)).slice(-20);
  const addrPayload = Buffer.concat([Buffer.from([0x41]), Buffer.from(keccak)]);
  const checksum = sha256(sha256(addrPayload)).slice(0, 4);
  const base58Addr = bs58.encode(Buffer.concat([addrPayload, checksum]));
  return {
    address: base58Addr,
    hexAddress: '41' + Buffer.from(keccak).toString('hex')
  };
}

function deriveTronFromMnemonic(mnemonic) {
  const path = "m/44'/195'/0'/0/0";
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const derived = deriveTronAddress(hdNode.privateKey);

  return {
    network: 'TRX',
    networkName: 'Tron (TRX / TRC-20)',
    address: derived.address,
    hexAddress: derived.hexAddress,
    privateKey: hdNode.privateKey,
    publicKey: ethers.SigningKey.computePublicKey(hdNode.privateKey, true),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateTron(mnemonicWords = 12) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveTronFromMnemonic(mnemonic);
}

function importTronFromPrivateKey(privateKeyHex) {
  const cleanKey = privateKeyHex.trim().startsWith('0x') ? privateKeyHex.trim() : '0x' + privateKeyHex.trim();
  const derived = deriveTronAddress(cleanKey);
  return {
    network: 'TRX',
    address: derived.address,
    hexAddress: derived.hexAddress,
    privateKey: cleanKey,
    publicKey: ethers.SigningKey.computePublicKey(cleanKey, true)
  };
}

module.exports = {
  generateTron,
  deriveTronFromMnemonic,
  importTronFromPrivateKey,
  deriveTronAddress
};
