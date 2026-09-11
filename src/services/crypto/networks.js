const NETWORKS_REGISTRY = [
  { id: 'ETH', name: 'Ethereum (ETH)', category: 'EVM', icon: 'fa-brands fa-ethereum' },
  { id: 'BSC', name: 'BNB Smart Chain (BSC)', category: 'EVM', icon: 'fa-solid fa-cube' },
  { id: 'POLYGON', name: 'Polygon (POL/MATIC)', category: 'EVM', icon: 'fa-solid fa-cubes' },
  { id: 'ARBITRUM', name: 'Arbitrum One (ARB)', category: 'EVM', icon: 'fa-solid fa-shapes' },
  { id: 'OPTIMISM', name: 'Optimism (OP)', category: 'EVM', icon: 'fa-solid fa-layer-group' },
  { id: 'BASE', name: 'Base (BASE)', category: 'EVM', icon: 'fa-solid fa-circle' },
  { id: 'AVAX', name: 'Avalanche C-Chain (AVAX)', category: 'EVM', icon: 'fa-solid fa-mountain' },
  { id: 'FANTOM', name: 'Fantom Opera (FTM)', category: 'EVM', icon: 'fa-solid fa-ghost' },
  { id: 'CRONOS', name: 'Cronos (CRO)', category: 'EVM', icon: 'fa-solid fa-circle-nodes' },
  { id: 'BLAST', name: 'Blast (BLAST)', category: 'EVM', icon: 'fa-solid fa-meteor' },
  { id: 'MANTLE', name: 'Mantle (MNT)', category: 'EVM', icon: 'fa-solid fa-circle-notch' },
  { id: 'LINEA', name: 'Linea (LINEA)', category: 'EVM', icon: 'fa-solid fa-lines-leaning' },
  { id: 'ZKSYNC', name: 'zkSync Era (ZK)', category: 'EVM', icon: 'fa-solid fa-shield-virus' },
  { id: 'SCROLL', name: 'Scroll (SCR)', category: 'EVM', icon: 'fa-solid fa-scroll' },
  { id: 'SEI', name: 'Sei Network (SEI-EVM)', category: 'EVM', icon: 'fa-solid fa-sailboat' },
  { id: 'BERA', name: 'Berachain (BERA)', category: 'EVM', icon: 'fa-solid fa-paw' },
  { id: 'BTC', name: 'Bitcoin (BTC)', category: 'UTXO', icon: 'fa-brands fa-bitcoin' },
  { id: 'LTC', name: 'Litecoin (LTC)', category: 'UTXO', icon: 'fa-solid fa-coins' },
  { id: 'DOGE', name: 'Dogecoin (DOGE)', category: 'UTXO', icon: 'fa-solid fa-dog' },
  { id: 'BCH', name: 'Bitcoin Cash (BCH)', category: 'UTXO', icon: 'fa-solid fa-money-bill-transfer' },
  { id: 'DASH', name: 'Dash (DASH)', category: 'UTXO', icon: 'fa-solid fa-gauge-simple-high' },
  { id: 'RVN', name: 'Ravencoin (RVN)', category: 'UTXO', icon: 'fa-solid fa-crow' },
  { id: 'DGB', name: 'DigiByte (DGB)', category: 'UTXO', icon: 'fa-solid fa-diamond' },
  { id: 'KAS', name: 'Kaspa (KAS)', category: 'UTXO', icon: 'fa-solid fa-network-wired' },
  { id: 'TRX', name: 'Tron (TRX / TRC-20)', category: 'Major L1', icon: 'fa-solid fa-gem' },
  { id: 'XRP', name: 'Ripple (XRP)', category: 'Major L1', icon: 'fa-solid fa-water' },
  { id: 'SOL', name: 'Solana (SOL)', category: 'Major L1', icon: 'fa-solid fa-sun' },
  { id: 'APT', name: 'Aptos (APT)', category: 'Major L1', icon: 'fa-solid fa-microchip' },
  { id: 'SUI', name: 'Sui Network (SUI)', category: 'Major L1', icon: 'fa-solid fa-droplet' },
  { id: 'ADA', name: 'Cardano (ADA)', category: 'Major L1', icon: 'fa-solid fa-braille' },
  { id: 'DOT', name: 'Polkadot (DOT)', category: 'Major L1', icon: 'fa-solid fa-circle-nodes' },
  { id: 'KSM', name: 'Kusama (KSM)', category: 'Major L1', icon: 'fa-solid fa-bird' },
  { id: 'ATOM', name: 'Cosmos Hub (ATOM)', category: 'Cosmos', icon: 'fa-solid fa-atom' },
  { id: 'OSMO', name: 'Osmosis (OSMO)', category: 'Cosmos', icon: 'fa-solid fa-flask' },
  { id: 'INJ', name: 'Injective (INJ)', category: 'Cosmos', icon: 'fa-solid fa-syringe' },
  { id: 'TIA', name: 'Celestia (TIA)', category: 'Cosmos', icon: 'fa-solid fa-cube' },
  { id: 'RUNE', name: 'THORChain (RUNE)', category: 'Cosmos', icon: 'fa-solid fa-hammer' },
  { id: 'XMR', name: 'Monero (XMR)', category: 'Privacy', icon: 'fa-solid fa-mask' },
  { id: 'ZEC', name: 'Zcash (ZEC)', category: 'Privacy', icon: 'fa-solid fa-user-secret' },
  { id: 'TON', name: 'The Open Network (TON)', category: 'Major L1', icon: 'fa-solid fa-paper-plane' },
  { id: 'NEAR', name: 'Near Protocol (NEAR)', category: 'Major L1', icon: 'fa-solid fa-bolt' },
  { id: 'ALGO', name: 'Algorand (ALGO)', category: 'Major L1', icon: 'fa-solid fa-square-binary' },
  { id: 'FIL', name: 'Filecoin (FIL)', category: 'Major L1', icon: 'fa-solid fa-folder-closed' }
];

function getExplorerUrl(address, network = 'ETH') {
  const net = network.toUpperCase();
  switch (net) {
    case 'ETH': return `https://etherscan.io/address/${address}`;
    case 'BSC': return `https://bscscan.com/address/${address}`;
    case 'POLYGON': return `https://polygonscan.com/address/${address}`;
    case 'ARBITRUM': return `https://arbiscan.io/address/${address}`;
    case 'OPTIMISM': return `https://optimistic.etherscan.io/address/${address}`;
    case 'BASE': return `https://basescan.org/address/${address}`;
    case 'AVAX': return `https://snowtrace.io/address/${address}`;
    case 'TRX': return `https://tronscan.org/#/address/${address}`;
    case 'BTC': return `https://mempool.space/address/${address}`;
    case 'XRP': return `https://xrpscan.com/account/${address}`;
    case 'SOL': return `https://solscan.io/account/${address}`;
    case 'XMR': return `https://xmrchain.net/search?value=${address}`;
    case 'ADA': return `https://cardanoscan.io/address/${address}`;
    case 'DOT': return `https://polkascan.io/polkadot/account/${address}`;
    case 'ATOM': return `https://atomscan.com/accounts/${address}`;
    case 'LTC': return `https://litecoinspace.org/address/${address}`;
    case 'DOGE': return `https://dogechain.info/address/${address}`;
    case 'TON': return `https://tonscan.org/address/${address}`;
    case 'BCH': return `https://blockchair.com/bitcoin-cash/address/${address}`;
    case 'NEAR': return `https://nearblocks.io/address/${address}`;
    case 'ALGO': return `https://algoexplorer.io/address/${address}`;
    case 'APT': return `https://explorer.aptoslabs.com/account/${address}`;
    case 'SUI': return `https://suiscan.xyz/mainnet/account/${address}`;
    case 'KAS': return `https://explorer.kaspa.org/addresses/${address}`;
    default: return `https://etherscan.io/address/${address}`;
  }
}

module.exports = {
  NETWORKS_REGISTRY,
  getExplorerUrl
};
