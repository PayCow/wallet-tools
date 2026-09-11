const cryptoEngine = require('./src/services/crypto/index');
const assert = require('assert');

async function testAllChainsImportRoundTrip() {
  console.log('=================================================================================');
  console.log('  PAYCOW MULTI-CHAIN PRIVATE KEY & WIF IMPORT ROUND-TRIP FIDELITY TESTS          ');
  console.log('=================================================================================\n');

  const testChains = [
    { net: 'ETH', name: 'Ethereum (ETH)', btcFormat: null, checkMixedCase: true },
    { net: 'BSC', name: 'BNB Smart Chain (BSC)', btcFormat: null, checkMixedCase: true },
    { net: 'POLYGON', name: 'Polygon (POL/MATIC)', btcFormat: null, checkMixedCase: true },
    { net: 'ARBITRUM', name: 'Arbitrum One (ARB)', btcFormat: null, checkMixedCase: true },
    { net: 'OPTIMISM', name: 'Optimism (OP)', btcFormat: null, checkMixedCase: true },
    { net: 'BASE', name: 'Base (BASE)', btcFormat: null, checkMixedCase: true },
    { net: 'AVAX', name: 'Avalanche C-Chain (AVAX)', btcFormat: null, checkMixedCase: true },
    { net: 'BTC', name: 'Bitcoin SegWit (p2wpkh)', btcFormat: 'p2wpkh', checkMixedCase: false },
    { net: 'BTC', name: 'Bitcoin Taproot (p2tr)', btcFormat: 'p2tr', checkMixedCase: false },
    { net: 'BTC', name: 'Bitcoin Legacy (p2pkh)', btcFormat: 'p2pkh', checkMixedCase: false },
    { net: 'TRX', name: 'Tron (TRX / TRC-20)', btcFormat: null, checkMixedCase: false },
    { net: 'XRP', name: 'Ripple (XRP)', btcFormat: null, checkMixedCase: false },
    { net: 'SOL', name: 'Solana (SOL)', btcFormat: null, checkMixedCase: false },
    { net: 'DOT', name: 'Polkadot (DOT)', btcFormat: null, checkMixedCase: false },
    { net: 'KSM', name: 'Kusama (KSM)', btcFormat: null, checkMixedCase: false },
    { net: 'LTC', name: 'Litecoin (LTC)', btcFormat: null, checkMixedCase: false },
    { net: 'DOGE', name: 'Dogecoin (DOGE)', btcFormat: null, checkMixedCase: false },
    { net: 'BCH', name: 'Bitcoin Cash (BCH)', btcFormat: null, checkMixedCase: false },
    { net: 'DASH', name: 'Dash (DASH)', btcFormat: null, checkMixedCase: false },
    { net: 'RVN', name: 'Ravencoin (RVN)', btcFormat: null, checkMixedCase: false },
    { net: 'DGB', name: 'DigiByte (DGB)', btcFormat: null, checkMixedCase: false },
    { net: 'KAS', name: 'Kaspa (KAS)', btcFormat: null, checkMixedCase: false },
    { net: 'ATOM', name: 'Cosmos Hub (ATOM)', btcFormat: null, checkMixedCase: false },
    { net: 'OSMO', name: 'Osmosis (OSMO)', btcFormat: null, checkMixedCase: false },
    { net: 'INJ', name: 'Injective (INJ)', btcFormat: null, checkMixedCase: false },
    { net: 'TIA', name: 'Celestia (TIA)', btcFormat: null, checkMixedCase: false },
    { net: 'RUNE', name: 'THORChain (RUNE)', btcFormat: null, checkMixedCase: false },
    { net: 'TON', name: 'The Open Network (TON)', btcFormat: null, checkMixedCase: false },
    { net: 'NEAR', name: 'Near Protocol (NEAR)', btcFormat: null, checkMixedCase: false },
    { net: 'ALGO', name: 'Algorand (ALGO)', btcFormat: null, checkMixedCase: false },
    { net: 'APT', name: 'Aptos (APT)', btcFormat: null, checkMixedCase: false },
    { net: 'SUI', name: 'Sui Network (SUI)', btcFormat: null, checkMixedCase: false },
    { net: 'ZEC', name: 'Zcash (ZEC)', btcFormat: null, checkMixedCase: false },
    { net: 'XMR', name: 'Monero (XMR)', btcFormat: null, checkMixedCase: false },
    { net: 'ADA', name: 'Cardano (ADA)', btcFormat: null, checkMixedCase: false }
  ];

  let passed = 0;

  for (const item of testChains) {
    const generated = cryptoEngine.generateWalletByNetwork(item.net, 12, item.btcFormat || 'p2wpkh');
    assert(generated.address, `Generation address missing for ${item.name}`);
    assert(generated.privateKey, `Private key missing for ${item.name}`);

    const imported = cryptoEngine.importWalletFromPrivateKey(item.net, generated.privateKey, item.btcFormat || 'p2wpkh');
    
    if (item.checkMixedCase) {
      assert.strictEqual(
        imported.address,
        generated.address,
        `EIP-55 checksum case mismatch for ${item.name}!\nGenerated: ${generated.address}\nImported : ${imported.address}`
      );
    } else {
      assert.strictEqual(
        imported.address,
        generated.address,
        `Address round-trip mismatch for ${item.name}!\nGenerated: ${generated.address}\nImported : ${imported.address}`
      );
    }

    if (generated.wifPrivateKey && item.net !== 'XRP') {
      const importedFromWIF = cryptoEngine.importWalletFromPrivateKey(item.net, generated.wifPrivateKey, item.btcFormat || 'p2wpkh');
      assert.strictEqual(
        importedFromWIF.address,
        generated.address,
        `WIF round-trip mismatch for ${item.name}!\nGenerated: ${generated.address}\nImported : ${importedFromWIF.address}`
      );
    }

    console.log(`[PASS] ${item.name.padEnd(28)} -> Address: ${generated.address.slice(0, 24)}... (Round-trip OK)`);
    passed++;
  }

  console.log('\n=================================================================================');
  console.log(`  ALL ${passed}/${testChains.length} BLOCKCHAIN KEY IMPORT ROUND-TRIP TESTS PASSED!`);
  console.log('=================================================================================');
}

testAllChainsImportRoundTrip().catch(err => {
  console.error('Import round-trip test error:', err);
  process.exit(1);
});
