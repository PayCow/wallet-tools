const { ethers } = require('ethers');
const { generateRandomMnemonic } = require('./utils');

function generateEVM(mnemonicWords = 12, networkId = 'ETH', networkName = 'Ethereum (ETH)') {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveEVMFromMnemonic(mnemonic, "m/44'/60'/0'/0/0", networkId, networkName);
}

function deriveEVMFromMnemonic(mnemonic, path = "m/44'/60'/0'/0/0", networkId = 'ETH', networkName = 'Ethereum (ETH)') {
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  return {
    network: networkId,
    networkName: networkName,
    address: hdNode.address,
    privateKey: hdNode.privateKey,
    publicKey: hdNode.publicKey,
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function importEVMFromPrivateKey(privateKey) {
  const cleanKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : '0x' + privateKey.trim();
  const wallet = new ethers.Wallet(cleanKey);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.publicKey
  };
}

module.exports = {
  generateEVM,
  deriveEVMFromMnemonic,
  importEVMFromPrivateKey
};
