const { ethers } = require('ethers');
const { bech32 } = require('bech32');
const { sha256, ripemd160, generateRandomMnemonic } = require('./utils');

function deriveCosmosAddress(compPub, hrp = 'cosmos') {
  const pubKeyHash = ripemd160(sha256(compPub));
  const words = bech32.toWords(pubKeyHash);
  return bech32.encode(hrp, words);
}

function deriveCosmosFromMnemonic(mnemonic, netId = 'ATOM', name = 'Cosmos Hub (ATOM)', hrp = 'cosmos', coinType = 118) {
  const path = `m/44'/${coinType}'/0'/0/0`;
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const compPub = ethers.SigningKey.computePublicKey(hdNode.privateKey, true);
  const address = deriveCosmosAddress(compPub, hrp);

  return {
    network: netId,
    networkName: name,
    address: address,
    privateKey: hdNode.privateKey,
    publicKey: compPub,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function generateCosmosChain(mnemonicWords = 12, netId = 'ATOM', name = 'Cosmos Hub (ATOM)', hrp = 'cosmos', coinType = 118) {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveCosmosFromMnemonic(mnemonic, netId, name, hrp, coinType);
}

function importCosmosFromPrivateKey(privateKeyHex, hrp = 'cosmos') {
  const cleanKey = privateKeyHex.trim().startsWith('0x') ? privateKeyHex.trim() : '0x' + privateKeyHex.trim();
  const compPub = ethers.SigningKey.computePublicKey(cleanKey, true);
  const address = deriveCosmosAddress(compPub, hrp);
  return {
    address: address,
    privateKey: cleanKey,
    publicKey: compPub
  };
}

module.exports = {
  generateCosmosChain,
  deriveCosmosFromMnemonic,
  importCosmosFromPrivateKey,
  deriveCosmosAddress
};
