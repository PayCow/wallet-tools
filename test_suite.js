const cryptoEngine = require('./src/services/crypto/index');
const assert = require('assert');

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const CANONICAL_SPECIFICATION_VECTORS = [
  {
    network: 'ETH',
    name: 'Ethereum (ETH)',
    spec: 'BIP-0044 Multi-Account Hierarchy & EIP-55 Mixed-Case Checksum',
    derivationPath: "m/44'/60'/0'/0/0",
    expectedAddress: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
    addressFormat: null
  },
  {
    network: 'BTC',
    name: 'Bitcoin Native SegWit (p2wpkh)',
    spec: 'BIP-0084 Native SegWit Bech32 (m/84h/0h/0h/0/0)',
    derivationPath: "m/84'/0'/0'/0/0",
    expectedAddress: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
    addressFormat: 'p2wpkh'
  },
  {
    network: 'BTC',
    name: 'Bitcoin Taproot (p2tr)',
    spec: 'BIP-0086 Taproot BIP-341 TapTweak Output Key (m/86h/0h/0h/0/0)',
    derivationPath: "m/86'/0'/0'/0/0",
    expectedAddress: 'bc1pfzs6rxkuhvspmumf5fdx7uq77ye2qw7st68vy360wtea78g803zqaz07uy',
    addressFormat: 'p2tr'
  },
  {
    network: 'BTC',
    name: 'Bitcoin Legacy (p2pkh)',
    spec: 'BIP-0044 Legacy Base58Check (m/44h/0h/0h/0/0)',
    derivationPath: "m/44'/0'/0'/0/0",
    expectedAddress: '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
    addressFormat: 'p2pkh'
  },
  {
    network: 'TRX',
    name: 'Tron (TRX / TRC-20)',
    spec: 'BIP-0044 TronLink Standard (m/44h/195h/0h/0/0)',
    derivationPath: "m/44'/195'/0'/0/0",
    expectedAddress: 'TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH',
    addressFormat: null
  },
  {
    network: 'SOL',
    name: 'Solana (SOL)',
    spec: 'SLIP-0010 Universal Ed25519 Hardened (m/44h/501h/0h/0h)',
    derivationPath: "m/44'/501'/0'/0'",
    expectedAddress: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
    addressFormat: null
  },
  {
    network: 'ATOM',
    name: 'Cosmos Hub (ATOM)',
    spec: 'BIP-0044 Cosmos SDK Bech32 (m/44h/118h/0h/0/0)',
    derivationPath: "m/44'/118'/0'/0/0",
    expectedAddress: 'cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4',
    addressFormat: null
  },
  {
    network: 'DOT',
    name: 'Polkadot (DOT)',
    spec: 'Substrate SS58 Blake2b-512 Checksum (m/44h/354h/0h/0h/0h)',
    derivationPath: "m/44'/354'/0'/0'/0'",
    expectedAddress: '14E9StbjYhJiAfsNMEcq5tETq79Q6EqaGyebdziY214hNWDH',
    addressFormat: null
  },
  {
    network: 'KSM',
    name: 'Kusama (KSM)',
    spec: 'Substrate SS58 Blake2b-512 Network-0x02 (m/44h/434h/0h/0h/0h)',
    derivationPath: "m/44'/434'/0'/0'/0'",
    expectedAddress: 'D8B1pUPu14f4NssXcTgwecFjbRX32aes3v3vqdbUcXzQG9R',
    addressFormat: null
  },
  {
    network: 'XRP',
    name: 'Ripple (XRP)',
    spec: 'BIP-0044 Ripple Classic Base58 (m/44h/144h/0h/0/0)',
    derivationPath: "m/44'/144'/0'/0/0",
    expectedAddress: 'rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3',
    addressFormat: null
  },
  {
    network: 'LTC',
    name: 'Litecoin (LTC)',
    spec: 'BIP-0084 Litecoin SegWit (m/84h/2h/0h/0/0)',
    derivationPath: "m/84'/2'/0'/0/0",
    expectedAddress: 'ltc1qjmxnz78nmc8nq77wuxh25n2es7rzm5c2rkk4wh',
    addressFormat: null
  },
  {
    network: 'DOGE',
    name: 'Dogecoin (DOGE)',
    spec: 'BIP-0044 Dogecoin Base58 (m/44h/3h/0h/0/0)',
    derivationPath: "m/44'/3'/0'/0/0",
    expectedAddress: 'DBus3bamQjgJULBJtYXpEzDWQRwF5iwxgC',
    addressFormat: null
  },
  {
    network: 'BCH',
    name: 'Bitcoin Cash (BCH)',
    spec: 'BIP-0044 CashAddr 40-bit Polymod Encoding (m/44h/145h/0h/0/0)',
    derivationPath: "m/44'/145'/0'/0/0",
    expectedAddress: 'bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6',
    addressFormat: null
  },
  {
    network: 'ADA',
    name: 'Cardano (ADA)',
    spec: 'CIP-1852 Shelley Blake2b-224 Bech32 (m/1852h/1815h/0h/0h/0h)',
    derivationPath: "m/1852'/1815'/0'/0'/0'",
    expectedAddress: 'addr1v9p9a56turme8pagqhx3sgwnnmltju9y26u2u5gnsp9zdkcn5dl7n',
    addressFormat: null
  },
  {
    network: 'XMR',
    name: 'Monero (XMR) Main Address',
    spec: 'Custom BIP39 Deterministic Ed25519 Dual-Key (m/44h/128h/0h/0h/0h)',
    derivationPath: "m/44'/128'/0'/0'/0'",
    expectedAddress: '48PTLfnxs1XLKc1jM39DFCW6D47v27jybF65uir5mkSuDk3GTPmzhWZ9Hsi2wDgKtdKsyMapBvDwSALWfr7zkzmJDWZkG4f',
    addressFormat: null
  },
  {
    network: 'TON',
    name: 'The Open Network (TON)',
    spec: 'TON CRC16-CCITT Base64URL (m/44h/607h/0h)',
    derivationPath: "m/44'/607'/0'",
    expectedAddress: 'EQDBcTe5pf0l2UpHMaIsFWDczUV6TrrAJIZddYgF95c-UKCg',
    addressFormat: null
  },
  {
    network: 'APT',
    name: 'Aptos (APT)',
    spec: 'Aptos Move SHA3-256 Authentication Key (m/44h/637h/0h/0h/0h)',
    derivationPath: "m/44'/637'/0'/0'/0'",
    expectedAddress: '0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf',
    addressFormat: null
  },
  {
    network: 'SUI',
    name: 'Sui Network (SUI)',
    spec: 'Sui Move Blake2b-256 Scheme-0x00 Key (m/44h/784h/0h/0h/0h)',
    derivationPath: "m/44'/784'/0'/0'/0'",
    expectedAddress: '0x5e93a736d04fbb25737aa40bee40171ef79f65fae833749e3c089fe7cc2161f1',
    addressFormat: null
  },
  {
    network: 'ALGO',
    name: 'Algorand (ALGO)',
    spec: 'Algorand Base32 SHA-512/256 Checksum (m/44h/283h/0h/0h/0h)',
    derivationPath: "m/44'/283'/0'/0'/0'",
    expectedAddress: 'EP2D7TV7IAFANZHK3B6QLKB53N5UTD7RARVXZTWCPCRQQBKYVGM2XIMT2Q',
    addressFormat: null
  },
  {
    network: 'FIL',
    name: 'Filecoin (FIL)',
    spec: 'Filecoin f1 Protocol Secp256k1 Blake2b-160 (m/44h/461h/0h/0/0)',
    derivationPath: "m/44'/461'/0'/0/0",
    expectedAddress: 'f1qode47ievxlxzk6z2viuovedabmn3tq6t57uqhq',
    addressFormat: null
  },
  {
    network: 'KAS',
    name: 'Kaspa (KAS)',
    spec: 'Kaspa 40-bit Polymod Checksum (m/44h/111111h/0h/0/0)',
    derivationPath: "m/44'/111111'/0'/0/0",
    expectedAddress: 'kaspa:qqd6e65yefepe9wk0m9vuxdufxd80sphy67gwwd0vdaumzdt4tc9s3qt0lqeh',
    addressFormat: null
  }
];

async function runDeterministicSpecificationVectorTests() {
  console.log('=================================================================================');
  console.log('  PAYCOW DETERMINISTIC SPECIFICATION VECTOR VERIFICATION & REPEATABILITY         ');
  console.log('  TEST SEED: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  console.log('=================================================================================\n');

  let passed = 0;

  for (const v of CANONICAL_SPECIFICATION_VECTORS) {
    const derived = cryptoEngine.deriveWalletFromMnemonic(v.network, TEST_MNEMONIC, v.addressFormat);

    assert.strictEqual(
      derived.derivationPath,
      v.derivationPath,
      `Derivation path mismatch for ${v.name}!\nExpected: ${v.derivationPath}\nActual:   ${derived.derivationPath}`
    );

    assert.strictEqual(
      derived.address,
      v.expectedAddress,
      `Address vector mismatch for ${v.name} (${v.spec})!\nExpected: ${v.expectedAddress}\nActual:   ${derived.address}`
    );

    console.log(`[PASS] ${v.name.padEnd(30)} [${v.derivationPath.padEnd(23)}] -> ${v.expectedAddress}`);
    passed++;
  }

  console.log('\n=================================================================================');
  console.log(`  ALL ${passed}/${CANONICAL_SPECIFICATION_VECTORS.length} CANONICAL SPECIFICATION VECTORS VERIFIED!`);
  console.log('=================================================================================');
}

runDeterministicSpecificationVectorTests().catch(err => {
  console.error('Vector test error:', err);
  process.exit(1);
});
