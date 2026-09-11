# PayCow Wallet Tools

A multi-chain, non-custodial cryptocurrency wallet generation suite and client-side cryptographic engine supporting 40+ blockchain networks.

- **Live Production Instance:** [https://mywallet.paycow.net](https://mywallet.paycow.net)
- **License:** [GNU General Public License v3.0](LICENSE)

---

## Architectural Guarantees & Security Model

1. **100% Client-Side Cryptographic Execution:**
   - All BIP-39 mnemonic generation, seed derivation, and private key operations run inside the user's browser runtime via the client bundle (`public/js/clientCrypto.js`, compiled from `src/clientEntry.js`).
   - Private keys, seeds, and mnemonics never leave the client environment and are never transmitted over the network.

2. **Server-Side Non-Custodial Firewall:**
   - The Express backend (`server.js` and `src/routes/walletRoutes.js`) actively enforces a strict payload allowlist (`enforcePublicFieldsAllowlist`).
   - Any HTTP request body containing sensitive parameter names (e.g., `privateKey`, `mnemonic`, `seed`, `secretKey`, `wif`) is rejected with `400 Bad Request`.
   - Generation endpoints (`/api/wallets/generate`, `/api/wallets/bulk`, `/api/wallets/universal-seed`) return `403 Forbidden` by design, refusing server-side key generation.

3. **Isolated Public Ledger (Optional Account System):**
   - SQLite (`better-sqlite3`, WAL mode) stores registered users and public address bookmarks (`user_saved_wallets`: network, address, derivation path, label).
   - Private keys and seed phrases cannot be saved to the database.

---

## Supported Blockchain Networks (43 Networks)

All networks implement standard BIP-44, BIP-84, CIP-1852, or native chain derivation paths and address encoding algorithms.

### 1. EVM Compatible (17 Networks)
*Standard Derivation Path:* `m/44'/60'/0'/0/0` | *Curve:* `secp256k1` | *Format:* Keccak-256 checksummed hex (`0x...`)

* **Ethereum (ETH)**
* **BNB Smart Chain (BSC)**
* **Polygon (POL/MATIC)**
* **Arbitrum One (ARB)**
* **Optimism (OP)**
* **Base (BASE)**
* **Avalanche C-Chain (AVAX)**
* **Fantom Opera (FTM)**
* **Cronos (CRO)**
* **Blast (BLAST)**
* **Mantle (MNT)**
* **Linea (LINEA)**
* **zkSync Era (ZK)**
* **Scroll (SCR)**
* **Sei Network (SEI-EVM)**
* **Berachain (BERA)**
* Generic EVM

### 2. UTXO Chains (8 Networks)
*Algorithms:* `secp256k1`, Base58Check, Bech32/Bech32m, CashAddr

* **Bitcoin (BTC):** Native SegWit (`bc1q...`, BIP-84: `m/84'/0'/0'/0/0`), Taproot (`bc1p...`, BIP-86: `m/86'/0'/0'/0/0`), Legacy P2PKH (`1...`, BIP-44: `m/44'/0'/0'/0/0`)
* **Litecoin (LTC):** Native SegWit (`ltc1q...`, BIP-84: `m/84'/2'/0'/0/0`)
* **Dogecoin (DOGE):** P2PKH (`D...`, BIP-44: `m/44'/3'/0'/0/0`)
* **Bitcoin Cash (BCH):** CashAddr format (`bitcoincash:q...`, BIP-44: `m/44'/145'/0'/0/0`)
* **Dash (DASH):** P2PKH (`X...`, BIP-44: `m/44'/5'/0'/0/0`)
* **Ravencoin (RVN):** P2PKH (`R...`, BIP-44: `m/44'/175'/0'/0/0`)
* **DigiByte (DGB):** Native SegWit (`dgb1q...`, BIP-84: `m/84'/20'/0'/0/0`)
* **Kaspa (KAS):** Schnorr/BLAKE2b Bech32 (`kaspa:q...`, BIP-44: `m/44'/111111'/0'/0/0`)

### 3. Major Layer 1 Networks (11 Networks)
*Algorithms:* `Ed25519`, `secp256k1`, SS58, Base58Check, Base64Url, Blake2b

* **Solana (SOL):** Ed25519 detached, Base58 address (`m/44'/501'/0'/0'`)
* **Tron (TRX):** Keccak-256 + Base58Check (`T...`, `m/44'/195'/0'/0/0`)
* **Ripple (XRP):** RIPEMD-160 + SHA-256 + Base58 (`r...`, `m/44'/144'/0'/0/0`)
* **Cardano (ADA):** CIP-1852 Shelley Bech32 (`addr1...`, `m/1852'/1815'/0'/0'/0'`)
* **Polkadot (DOT):** Substrate SS58 prefix 0x00 (`1...`, `m/44'/354'/0'/0'/0'`)
* **Kusama (KSM):** Substrate SS58 prefix 0x02 (`E...`, `m/44'/434'/0'/0'/0'`)
* **The Open Network (TON):** CRC16 bounceable user-friendly format (`EQ...`, `m/44'/607'/0'`)
* **Near Protocol (NEAR):** Ed25519 64-character lowercase hex (`m/44'/397'/0'`)
* **Aptos (APT):** SHA3-256 Ed25519 hex address (`0x...`, `m/44'/637'/0'/0'/0'`)
* **Sui Network (SUI):** BLAKE2b Ed25519 hex address (`0x...`, `m/44'/784'/0'/0'/0'`)
* **Algorand (ALGO):** SHA-512/256 truncated checksummed Base32 (`m/44'/283'/0'/0'/0'`)

### 4. Cosmos SDK Ecosystem (5 Networks)
*Standard Derivation Path:* `m/44'/118'/0'/0/0` (Injective uses coin type 60) | *Format:* Bech32

* **Cosmos Hub (ATOM):** `cosmos1...`
* **Osmosis (OSMO):** `osmo1...`
* **Injective (INJ):** `inj1...` (Ethereum curve hybrid derivation)
* **Celestia (TIA):** `celestia1...`
* **THORChain (RUNE):** `thor1...` (BIP-44 coin type 931)

### 5. Privacy Chains (2 Networks)
* **Monero (XMR):** CryptoNote standard address (`4...`), spend key + view key derived using Keccak-256 and Ed25519 base points (`m/44'/128'/0'/0'/0'`)
* **Zcash (ZEC):** Transparent address format (`t1...`, `m/44'/133'/0'/0/0`)

### 6. Decentralized Storage (1 Network)
* **Filecoin (FIL):** BLAKE2b hash with protocol 1 checksum (`f1...`, `m/44'/461'/0'/0/0`)

---

## Features

- **Single Chain Wallet Generator:** Generate individual keypairs with customizable BIP-39 word counts (12, 15, 18, 21, or 24 words).
- **Universal Master Seed Derivation:** Enter or generate a single master seed phrase to derive synchronized addresses across 19+ distinct network ecosystems at once.
- **Bulk Wallet Generator:** Generate up to 100 deterministic or randomized wallets in a single run with full key exports.
- **Private Key & WIF Import:** Validate, import, and recalculate public addresses from raw hex keys or network-specific WIF strings.
- **Built-in File Explorer & Live Test Runner:** Web-based interface to inspect crypto implementation source files (`/api/file-explorer/tree`) and trigger test suites directly from the browser (`/api/file-explorer/run-tests`).

---

## Repository Structure

```
paycowTools/
├── public/                 # Static web application assets
│   ├── css/style.css       # Interface styling and layout
│   ├── js/app.js           # Client UI interactions and state
│   ├── js/clientCrypto.js  # [Git Ignored] Compiled client crypto bundle
│   ├── js/clientQr.js      # [Git Ignored] Compiled QR code renderer bundle
│   └── index.html          # Main application interface
├── src/
│   ├── clientEntry.js      # Browser entry point for crypto engine (esbuild source)
│   ├── qrEntry.js          # Browser entry point for QR generator (esbuild source)
│   ├── db/
│   │   └── database.js     # SQLite schema & connection (better-sqlite3)
│   ├── middleware/
│   │   └── authMiddleware.js # Rate limiting & session handling
│   ├── routes/
│   │   ├── authRoutes.js   # User registration, login, session info
│   │   └── walletRoutes.js # Non-custodial public ledger routes & firewall
│   └── services/
│       ├── cryptoEngine.js # High-level crypto API interface
│       └── crypto/         # Modular blockchain implementations
│           ├── cosmos.js    # Cosmos SDK chains (ATOM, OSMO, INJ, TIA, RUNE)
│           ├── ed25519.js   # Solana, Near, Aptos, Sui, Cardano, Algorand
│           ├── evm.js       # EVM derivation & key management
│           ├── index.js     # Core crypto dispatcher & universal seed engine
│           ├── networks.js  # Network metadata & block explorer URL resolvers
│           ├── privacy.js   # Monero (XMR) & Zcash (ZEC)
│           ├── ripple.js    # XRP Ledger
│           ├── substrate.js # Polkadot (DOT) & Kusama (KSM)
│           ├── ton.js       # The Open Network (TON)
│           ├── tron.js      # Tron (TRX)
│           ├── utils.js     # Base58, Bech32, Base32, WIF, Keccak utilities
│           └── utxo.js      # Bitcoin, Litecoin, Doge, BCH, Dash, RVN, DGB, Kaspa
├── test_suite.js               # 21 BIP-44 canonical test vectors
├── test_wallet_import.js       # 35-chain private key & WIF import roundtrip
├── test_signing_verification.js# ECDSA and Ed25519 message signing & verification
├── test_negative_cases.js      # Fail-closed validation & error boundary checks
├── test_security_audit.js      # Static and dynamic firewall leakage regression tests
├── server.js               # Express application entry point
├── package.json            # Dependencies, scripts, and project metadata
└── LICENSE                 # GNU General Public License v3.0
```

---

## Installation & Setup

### Prerequisites
- Node.js `>= 18.0.0`
- npm `>= 9.0.0`

### 1. Clone the Repository
```bash
git clone https://github.com/PayCow/wallet-tools.git
cd wallet-tools
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Client-Side Bundles
The repository keeps compiled distribution bundles out of version control. Compile them before starting the server:
```bash
npm run build
```
This runs `esbuild` to compile:
- `src/clientEntry.js` -> `public/js/clientCrypto.js`
- `src/qrEntry.js` -> `public/js/clientQr.js`

### 4. Configure Environment (Optional)
Copy the example environment file:
```bash
cp .env.example .env
```
Default configuration:
- `PORT`: `3849` (default port if unset)
- `JWT_SECRET`: If unset, an ephemeral 256-bit secret is generated and stored locally in `jwt_secret.key` with `0600` permissions.

### 5. Start the Server
```bash
npm start
```
The application will be accessible at `http://localhost:3849`.

---

## Test Suites

The codebase includes 5 automated test suites covering deterministic derivation, key import round-trips, cryptographic signing, error handling, and security firewalls:

```bash
npm test
```

### Breakdown of Test Suites:
1. **`test_suite.js` (Canonical Test Vectors):**
   - Validates BIP-39 mnemonic derivation against official test vectors across 21 distinct networks.
2. **`test_wallet_import.js` (35-Chain Import Round-Trip):**
   - Tests importing raw hex private keys and WIF keys across 35 blockchain networks to ensure public addresses match exact derivation outputs.
3. **`test_signing_verification.js` (Cryptographic Usability):**
   - Performs signature generation and independent verification across Secp256k1 ECDSA (EVM, UTXO) and Ed25519 (Solana, NEAR, Cardano).
4. **`test_negative_cases.js` (Fail-Closed Error Boundaries):**
   - Asserts that invalid key lengths, corrupted WIF checksums, malformed Base58 strings, and unsupported network identifiers throw explicit errors rather than falling back silently.
5. **`test_security_audit.js` (Firewall & Leakage Prevention):**
   - Scans client-side scripts to verify absence of tracking or exfiltration calls.
   - Verifies that server generation endpoints return `403 Forbidden` and that incoming requests containing sensitive keys are rejected with `400 Bad Request`.

---

## Production Deployment (Reverse Proxy)

When deploying behind Nginx or Caddy (e.g. for `https://mywallet.paycow.net`):

### Example Nginx Configuration
```nginx
server {
    server_name mywallet.paycow.net;

    location / {
        proxy_pass http://127.0.0.1:3849;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Contributing & Development Guidelines

1. **Keep Cryptography Non-Custodial:** Never introduce backend routes that generate, receive, or store private keys or mnemonic seed phrases.
2. **Deterministic Derivations:** Any new chain added to `src/services/crypto/` must include corresponding test vectors in `test_suite.js` and `test_wallet_import.js`.
3. **Reproducible Builds:** Always ensure `npm run build` runs cleanly and matches standard `esbuild` output.