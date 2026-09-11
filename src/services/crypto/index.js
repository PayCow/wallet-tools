const { ethers } = require('ethers');
const { blake2b } = require('blakejs');
const { generateEVM, deriveEVMFromMnemonic, importEVMFromPrivateKey } = require('./evm');
const { generateBitcoin, deriveBitcoinFromMnemonic, importBitcoinFromPrivateKey, generateUTXO, deriveUTXOFromMnemonic, importUTXOFromPrivateKey } = require('./utxo');
const { generateTron, deriveTronFromMnemonic, importTronFromPrivateKey } = require('./tron');
const { generateRipple, deriveRippleFromMnemonic, importRippleFromPrivateKey } = require('./ripple');
const { generateSolana, deriveSolanaFromMnemonic, importSolanaFromPrivateKey, generateNear, deriveNearFromMnemonic, importNearFromPrivateKey, generateAptos, deriveAptosFromMnemonic, importAptosFromPrivateKey, generateSui, deriveSuiFromMnemonic, importSuiFromPrivateKey, generateCardano, deriveCardanoFromMnemonic, importCardanoFromPrivateKey, generateAlgorand, deriveAlgorandFromMnemonic, importAlgorandFromPrivateKey } = require('./ed25519');
const { generateSubstrate, deriveSubstrateFromMnemonic, importSubstrateFromPrivateKey } = require('./substrate');
const { generateCosmosChain, deriveCosmosFromMnemonic, importCosmosFromPrivateKey } = require('./cosmos');
const { generateMonero, deriveMoneroFromMnemonic, importMoneroFromPrivateKey, generateZcash, deriveZcashFromMnemonic, importZcashFromPrivateKey } = require('./privacy');
const { generateTon, deriveTonFromMnemonic, importTonFromPrivateKey } = require('./ton');
const { NETWORKS_REGISTRY, getExplorerUrl } = require('./networks');
const { generateRandomMnemonic, base32Encode } = require('./utils');

function deriveFilecoinFromMnemonic(mnemonic) {
  const path = "m/44'/461'/0'/0/0";
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), '', path);
  const uncomp = ethers.getBytes(ethers.SigningKey.computePublicKey(hdNode.privateKey, false));
  const pkh = Buffer.from(blake2b(uncomp, null, 20));
  const checksum = Buffer.from(blake2b(Buffer.concat([Buffer.from([0x01]), pkh]), null, 4));
  const address = 'f1' + base32Encode(Buffer.concat([pkh, checksum])).toLowerCase();
  return {
    network: 'FIL',
    networkName: 'Filecoin (FIL)',
    address: address,
    privateKey: hdNode.privateKey,
    publicKey: ethers.SigningKey.computePublicKey(hdNode.privateKey, true),
    mnemonic: mnemonic.trim(),
    derivationPath: path
  };
}

function importFilecoinFromPrivateKey(keyInput) {
  let privKeyHex = keyInput.trim();
  if (!privKeyHex.startsWith('0x')) privKeyHex = '0x' + privKeyHex;
  const uncomp = ethers.getBytes(ethers.SigningKey.computePublicKey(privKeyHex, false));
  const pkh = Buffer.from(blake2b(uncomp, null, 20));
  const checksum = Buffer.from(blake2b(Buffer.concat([Buffer.from([0x01]), pkh]), null, 4));
  const address = 'f1' + base32Encode(Buffer.concat([pkh, checksum])).toLowerCase();
  return {
    network: 'FIL',
    address: address,
    privateKey: privKeyHex,
    publicKey: ethers.SigningKey.computePublicKey(privKeyHex, true)
  };
}

function deriveWalletFromMnemonic(network, mnemonic, btcAddressFormat = 'p2wpkh') {
  if (!network) throw new Error('Network identifier is required');
  if (!mnemonic || typeof mnemonic !== 'string') throw new Error('Valid mnemonic phrase is required');

  const net = network.toUpperCase();
  const trimmedMnemonic = mnemonic.trim();

  const evmNets = ['ETH', 'EVM', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'AVAX', 'FANTOM', 'CRONOS', 'BLAST', 'MANTLE', 'LINEA', 'ZKSYNC', 'SCROLL', 'SEI', 'BERA'];
  if (evmNets.includes(net)) {
    const matched = NETWORKS_REGISTRY.find(n => n.id === net);
    return deriveEVMFromMnemonic(trimmedMnemonic, "m/44'/60'/0'/0/0", net, matched ? matched.name : `${net} Network`);
  }

  if (net === 'BTC' || net === 'BITCOIN') return deriveBitcoinFromMnemonic(trimmedMnemonic, btcAddressFormat);
  if (net === 'TRX' || net === 'TRON') return deriveTronFromMnemonic(trimmedMnemonic);
  if (net === 'XRP' || net === 'RIPPLE') return deriveRippleFromMnemonic(trimmedMnemonic);
  if (net === 'SOL' || net === 'SOLANA') return deriveSolanaFromMnemonic(trimmedMnemonic);
  if (net === 'XMR' || net === 'MONERO') return deriveMoneroFromMnemonic(trimmedMnemonic);
  if (net === 'ADA' || net === 'CARDANO') return deriveCardanoFromMnemonic(trimmedMnemonic);
  if (net === 'DOT' || net === 'POLKADOT') return deriveSubstrateFromMnemonic(trimmedMnemonic, 'DOT', 'Polkadot (DOT)', 0x00);
  if (net === 'KSM' || net === 'KUSAMA') return deriveSubstrateFromMnemonic(trimmedMnemonic, 'KSM', 'Kusama (KSM)', 0x02);
  if (net === 'TON') return deriveTonFromMnemonic(trimmedMnemonic);
  if (net === 'FIL' || net === 'FILECOIN') return deriveFilecoinFromMnemonic(trimmedMnemonic);

  if (net === 'ATOM' || net === 'COSMOS') return deriveCosmosFromMnemonic(trimmedMnemonic, 'ATOM', 'Cosmos Hub (ATOM)', 'cosmos', 118);
  if (net === 'OSMO' || net === 'OSMOSIS') return deriveCosmosFromMnemonic(trimmedMnemonic, 'OSMO', 'Osmosis (OSMO)', 'osmo', 118);
  if (net === 'INJ' || net === 'INJECTIVE') return deriveCosmosFromMnemonic(trimmedMnemonic, 'INJ', 'Injective (INJ)', 'inj', 60);
  if (net === 'TIA' || net === 'CELESTIA') return deriveCosmosFromMnemonic(trimmedMnemonic, 'TIA', 'Celestia (TIA)', 'celestia', 118);
  if (net === 'RUNE' || net === 'THORCHAIN') return deriveCosmosFromMnemonic(trimmedMnemonic, 'RUNE', 'THORChain (RUNE)', 'thor', 931);

  if (['LTC', 'DOGE', 'BCH', 'DASH', 'RVN', 'DGB', 'KAS'].includes(net)) {
    return deriveUTXOFromMnemonic(trimmedMnemonic, net);
  }

  if (net === 'NEAR') return deriveNearFromMnemonic(trimmedMnemonic);
  if (net === 'ALGO') return deriveAlgorandFromMnemonic(trimmedMnemonic);
  if (net === 'APT') return deriveAptosFromMnemonic(trimmedMnemonic);
  if (net === 'SUI') return deriveSuiFromMnemonic(trimmedMnemonic);
  if (net === 'ZEC') return deriveZcashFromMnemonic(trimmedMnemonic);

  throw new Error(`Unsupported blockchain network: "${network}"`);
}

function generateWalletByNetwork(network, mnemonicWords = 12, btcAddressFormat = 'p2wpkh') {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveWalletFromMnemonic(network, mnemonic, btcAddressFormat);
}

function importWalletFromPrivateKey(network, keyInput, btcAddressFormat = 'p2wpkh') {
  if (!network) throw new Error('Network identifier is required');
  if (!keyInput || typeof keyInput !== 'string') throw new Error('Private key or secret input is required');

  const net = network.toUpperCase();
  const evmNets = ['ETH', 'EVM', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'AVAX', 'FANTOM', 'CRONOS', 'BLAST', 'MANTLE', 'LINEA', 'ZKSYNC', 'SCROLL', 'SEI', 'BERA'];
  if (evmNets.includes(net)) return importEVMFromPrivateKey(keyInput);

  if (net === 'BTC' || net === 'BITCOIN') return importBitcoinFromPrivateKey(keyInput, btcAddressFormat);
  if (net === 'TRX' || net === 'TRON') return importTronFromPrivateKey(keyInput);
  if (net === 'XRP' || net === 'RIPPLE') return importRippleFromPrivateKey(keyInput);
  if (net === 'SOL' || net === 'SOLANA') return importSolanaFromPrivateKey(keyInput);
  if (net === 'XMR' || net === 'MONERO') return importMoneroFromPrivateKey(keyInput);
  if (net === 'ADA' || net === 'CARDANO') return importCardanoFromPrivateKey(keyInput);
  if (net === 'DOT' || net === 'POLKADOT') return importSubstrateFromPrivateKey(keyInput, 0x00);
  if (net === 'KSM' || net === 'KUSAMA') return importSubstrateFromPrivateKey(keyInput, 0x02);
  if (net === 'TON') return importTonFromPrivateKey(keyInput);
  if (net === 'FIL' || net === 'FILECOIN') return importFilecoinFromPrivateKey(keyInput);
  if (net === 'ATOM' || net === 'COSMOS') return importCosmosFromPrivateKey(keyInput, 'cosmos');
  if (net === 'OSMO' || net === 'OSMOSIS') return importCosmosFromPrivateKey(keyInput, 'osmo');
  if (net === 'INJ' || net === 'INJECTIVE') return importCosmosFromPrivateKey(keyInput, 'inj');
  if (net === 'TIA' || net === 'CELESTIA') return importCosmosFromPrivateKey(keyInput, 'celestia');
  if (net === 'RUNE' || net === 'THORCHAIN') return importCosmosFromPrivateKey(keyInput, 'thor');
  if (['LTC', 'DOGE', 'BCH', 'DASH', 'RVN', 'DGB', 'KAS'].includes(net)) return importUTXOFromPrivateKey(keyInput, net);
  if (net === 'NEAR') return importNearFromPrivateKey(keyInput);
  if (net === 'ALGO') return importAlgorandFromPrivateKey(keyInput);
  if (net === 'APT') return importAptosFromPrivateKey(keyInput);
  if (net === 'SUI') return importSuiFromPrivateKey(keyInput);
  if (net === 'ZEC') return importZcashFromPrivateKey(keyInput);

  throw new Error(`Unsupported blockchain network for private key import: "${network}"`);
}

function generateBulkWallets(network, count = 10, mnemonicWords = 12, btcAddressFormat = 'p2wpkh') {
  const limit = Math.min(Math.max(parseInt(count, 10) || 1, 1), 100);
  const wallets = [];
  for (let i = 0; i < limit; i++) {
    const w = generateWalletByNetwork(network, mnemonicWords, btcAddressFormat);
    wallets.push({
      index: i + 1,
      network: w.network,
      address: w.address,
      privateKey: w.privateKey,
      wifPrivateKey: w.wifPrivateKey || undefined,
      mnemonic: w.mnemonic,
      derivationPath: w.derivationPath
    });
  }
  return {
    network: network.toUpperCase(),
    total: wallets.length,
    wallets: wallets
  };
}

function deriveUniversalMasterSeedFromMnemonic(mnemonic, btcAddressFormat = 'p2wpkh') {
  const targetChains = [
    { net: 'ETH', btcFormat: null },
    { net: 'BTC', btcFormat: btcAddressFormat || 'p2wpkh' },
    { net: 'TRX', btcFormat: null },
    { net: 'XRP', btcFormat: null },
    { net: 'SOL', btcFormat: null },
    { net: 'XMR', btcFormat: null },
    { net: 'ADA', btcFormat: null },
    { net: 'DOT', btcFormat: null },
    { net: 'DOGE', btcFormat: null },
    { net: 'LTC', btcFormat: null },
    { net: 'BCH', btcFormat: null },
    { net: 'ATOM', btcFormat: null },
    { net: 'TON', btcFormat: null },
    { net: 'NEAR', btcFormat: null },
    { net: 'ALGO', btcFormat: null },
    { net: 'APT', btcFormat: null },
    { net: 'SUI', btcFormat: null },
    { net: 'FIL', btcFormat: null },
    { net: 'KAS', btcFormat: null }
  ];
  
  const derived = targetChains.map(item => {
    const wallet = deriveWalletFromMnemonic(item.net, mnemonic.trim(), item.btcFormat || 'p2wpkh');
    return {
      network: wallet.network || item.net,
      name: wallet.networkName || wallet.name || item.net,
      address: wallet.address,
      privateKey: wallet.wifPrivateKey || wallet.privateKey,
      derivationPath: wallet.derivationPath
    };
  });

  return {
    mnemonic: mnemonic.trim(),
    mnemonicLength: mnemonic.trim().split(/\s+/).length,
    chains: derived
  };
}

function generateUniversalMasterSeed(mnemonicWords = 12, btcAddressFormat = 'p2wpkh') {
  const mnemonic = generateRandomMnemonic(mnemonicWords);
  return deriveUniversalMasterSeedFromMnemonic(mnemonic, btcAddressFormat);
}

module.exports = {
  generateWalletByNetwork,
  deriveWalletFromMnemonic,
  importWalletFromPrivateKey,
  generateBulkWallets,
  generateUniversalMasterSeed,
  deriveUniversalMasterSeedFromMnemonic,
  NETWORKS_REGISTRY,
  getExplorerUrl
};
