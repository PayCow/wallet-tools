let currentUser = null;
let allNetworks = [];
let selectedNetwork = 'ETH';
let currentWallet = null;
let currentBulk = null;
let currentMasterSeed = null;
let currentExplorerPath = 'src/services/crypto/index.js';

const authGateView = document.getElementById('auth-gate-view');
const dashboardView = document.getElementById('dashboard-view');
const modalQr = document.getElementById('modal-qr');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  let icon = '<i class="fa-solid fa-circle-info" style="color: var(--primary-blue);"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--accent-red);"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function copyToClipboard(text, msg = 'Copied to clipboard!') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg, 'success');
  }).catch(() => {
    showToast('Failed to copy.', 'error');
  });
}

function downloadFile(content, fileName, contentType = 'application/json') {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      authGateView.style.display = 'none';
      dashboardView.style.display = 'block';
      
      document.getElementById('overview-username-display').textContent = currentUser.username;
      document.getElementById('acc-username').value = currentUser.username;
      document.getElementById('acc-email').value = currentUser.email;
      document.getElementById('acc-created').value = new Date(currentUser.created_at).toLocaleString();

      initClientCrypto();
      loadOverviewData();
      loadSavedWallets();
    } else {
      currentUser = null;
      authGateView.style.display = 'flex';
      dashboardView.style.display = 'none';
    }
  } catch {
    currentUser = null;
    authGateView.style.display = 'flex';
    dashboardView.style.display = 'none';
  }
}

function initClientCrypto() {
  const cryptoLib = window.PayCowCrypto || (typeof PayCowCryptoLib !== 'undefined' ? PayCowCryptoLib : null);
  if (cryptoLib && cryptoLib.NETWORKS_REGISTRY) {
    allNetworks = cryptoLib.NETWORKS_REGISTRY;
  } else {
    allNetworks = [
      { id: 'ETH', name: 'Ethereum (ETH)', category: 'EVM', icon: 'fa-brands fa-ethereum' },
      { id: 'BTC', name: 'Bitcoin (BTC)', category: 'UTXO', icon: 'fa-brands fa-bitcoin' },
      { id: 'TRX', name: 'Tron (TRX / TRC-20)', category: 'Major L1', icon: 'fa-solid fa-gem' },
      { id: 'XRP', name: 'Ripple (XRP)', category: 'Major L1', icon: 'fa-solid fa-water' },
      { id: 'SOL', name: 'Solana (SOL)', category: 'Major L1', icon: 'fa-solid fa-sun' }
    ];
  }
  renderNetworkGrid('all');
  renderBulkSelect();
}

function renderNetworkGrid(category = 'all') {
  const grid = document.getElementById('studio-network-grid');
  if (!grid) return;

  const filtered = category === 'all' 
    ? allNetworks 
    : allNetworks.filter(n => n.category.toLowerCase().includes(category.toLowerCase()));

  grid.innerHTML = filtered.map(n => `
    <div class="net-select-card ${n.id === selectedNetwork ? 'active' : ''}" data-net-id="${n.id}">
      <i class="${n.icon}"></i>
      <div class="net-select-info">
        <span class="net-select-name">${n.name}</span>
        <span class="net-select-tag">${n.category}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.net-select-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.net-select-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedNetwork = card.getAttribute('data-net-id');

      const btcGroup = document.getElementById('studio-btc-type-group');
      if (selectedNetwork === 'BTC') {
        btcGroup.style.display = 'flex';
      } else {
        btcGroup.style.display = 'none';
      }
    });
  });
}

function renderBulkSelect() {
  const select = document.getElementById('bulk-network-select');
  if (!select) return;
  select.innerHTML = allNetworks.map(n => `
    <option value="${n.id}">${n.name} (${n.category})</option>
  `).join('');
}

document.querySelectorAll('.cat-pill-btn').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill-btn').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const cat = pill.getAttribute('data-filter');
    renderNetworkGrid(cat);
  });
});

function switchDashboardTab(tabId) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  document.querySelectorAll('.dash-tab-content').forEach(tab => {
    if (tab.id === tabId) {
      tab.style.display = 'block';
    } else {
      tab.style.display = 'none';
    }
  });

  if (tabId === 'tab-overview') loadOverviewData();
  if (tabId === 'tab-saved-wallets') loadSavedWallets();
  if (tabId === 'tab-source-code') initFileExplorer();
}

document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchDashboardTab(item.getAttribute('data-tab'));
  });
});

document.getElementById('btn-overview-launch-studio')?.addEventListener('click', () => {
  switchDashboardTab('tab-generator');
});

async function loadOverviewData() {
  try {
    const res = await fetch('/api/wallets/stats/overview');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('overview-saved-count').innerHTML = `${data.stats.userSavedCount} <span style="font-size: 1.1rem; color: var(--text-dark);">Saved Wallets</span>`;
    }
  } catch {}
}

async function loadSavedWallets() {
  const tbody = document.getElementById('saved-wallets-tbody');
  const overviewTbody = document.getElementById('overview-history-tbody');
  if (!currentUser) return;

  try {
    const res = await fetch('/api/wallets/history');
    const data = await res.json();

    if (data.success && data.wallets) {
      if (tbody) {
        if (data.wallets.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No saved addresses in your account.</td></tr>`;
        } else {
          tbody.innerHTML = data.wallets.map(w => `
            <tr>
              <td><span class="net-badge">${w.network}</span></td>
              <td><strong>${w.label || '-'}</strong></td>
              <td>
                <span style="font-family: var(--font-mono); font-size: 0.85rem;">${w.address}</span>
                <button class="btn-icon-action" onclick="copyToClipboard('${w.address}')" style="margin-left: 6px; padding: 2px 6px;"><i class="fa-regular fa-copy"></i></button>
              </td>
              <td><span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${w.derivation_path || '-'}</span></td>
              <td style="color: var(--text-muted); font-size: 0.85rem;">${new Date(w.created_at).toLocaleTimeString()}</td>
              <td>
                <button class="btn-icon-action" onclick="deleteSavedWallet(${w.id})" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i> Delete</button>
              </td>
            </tr>
          `).join('');
        }
      }

      if (overviewTbody) {
        if (data.wallets.length === 0) {
          overviewTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No ledger activity yet. Launch Generator Studio to create wallets.</td></tr>`;
        } else {
          overviewTbody.innerHTML = data.wallets.slice(0, 10).map(w => `
            <tr>
              <td><span class="ref-badge">#${w.id.toString(16).padStart(6, '0')}</span></td>
              <td><span class="net-badge">${w.network}</span></td>
              <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">${w.address.slice(0, 8)}...${w.address.slice(-6)}</span> (${w.label || 'Saved'})</td>
              <td><span style="color: var(--accent-green); font-weight: 700; font-size: 0.82rem;">ACTIVE</span></td>
              <td style="color: var(--text-muted); font-size: 0.85rem;">${new Date(w.created_at).toLocaleTimeString()}</td>
              <td>
                <button class="btn-icon-action" onclick="copyToClipboard('${w.address}')"><i class="fa-regular fa-copy"></i> Copy</button>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

async function deleteSavedWallet(id) {
  if (!confirm('Are you sure you want to delete this saved address?')) return;
  try {
    const res = await fetch(`/api/wallets/history/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Address removed from ledger.', 'success');
      loadSavedWallets();
      loadOverviewData();
    }
  } catch {
    showToast('Delete failed.', 'error');
  }
}

document.getElementById('btn-studio-generate')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-studio-generate');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deriving Keypair In Browser...';

  const mnemonicWords = document.getElementById('studio-mnemonic-words').value;
  const addressType = document.getElementById('studio-btc-type').value;

  try {
    const cryptoLib = window.PayCowCrypto || PayCowCryptoLib;
    if (!cryptoLib || !cryptoLib.generateWalletByNetwork) {
      throw new Error('Client cryptographic engine not initialized.');
    }

    const words = parseInt(mnemonicWords, 10) === 24 ? 24 : 12;
    const wallet = cryptoLib.generateWalletByNetwork(selectedNetwork, words, addressType);

    let addressQr = '';
    let privateKeyQr = '';
    if (window.QRCode && window.QRCode.toDataURL) {
      try {
        addressQr = await window.QRCode.toDataURL(wallet.address, { margin: 1, width: 256 });
        const privKeyForQr = wallet.wifPrivateKey || wallet.privateKey;
        privateKeyQr = await window.QRCode.toDataURL(privKeyForQr, { margin: 1, width: 256 });
      } catch (qrErr) {
        console.warn('QR generation error:', qrErr);
      }
    }

    currentWallet = {
      ...wallet,
      addressQr,
      privateKeyQr,
      explorerUrl: cryptoLib.getExplorerUrl(wallet.address, wallet.network),
      generatedAt: new Date().toISOString()
    };

    renderStudioResult(currentWallet);
    showToast(`${currentWallet.network} keypair generated locally in browser!`, 'success');
  } catch (err) {
    console.error('Client generation error:', err);
    showToast('Browser crypto error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Wallet (Browser Local)';
  }
});

function renderStudioResult(w) {
  const box = document.getElementById('studio-result-box');
  box.style.display = 'block';

  document.getElementById('studio-res-network-name').innerHTML = `<i class="fa-solid fa-circle-check"></i> ${w.networkName || w.network}`;
  document.getElementById('studio-res-derivation').textContent = w.derivationPath || 'Standard';

  document.getElementById('studio-res-address').textContent = w.address;
  document.getElementById('studio-res-privkey').textContent = w.privateKey;
  document.getElementById('studio-res-privkey').classList.add('masked');

  document.getElementById('studio-res-mnemonic').textContent = w.mnemonic || '-';
  document.getElementById('studio-res-mnemonic').classList.add('masked');

  const wifGroup = document.getElementById('studio-res-wif-group');
  if (w.wifPrivateKey) {
    wifGroup.style.display = 'block';
    document.getElementById('studio-res-wif-label').textContent = w.network === 'XRP' ? 'Ripple Secret Seed' : 'WIF Private Key';
    document.getElementById('studio-res-wif').textContent = w.wifPrivateKey;
    document.getElementById('studio-res-wif').classList.add('masked');
  } else {
    wifGroup.style.display = 'none';
  }

  const expLink = document.getElementById('studio-res-explorer');
  if (w.explorerUrl) {
    expLink.href = w.explorerUrl;
    expLink.style.display = 'inline-flex';
  } else {
    expLink.style.display = 'none';
  }

  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-generate-bulk')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-generate-bulk');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating In Browser...';

  const network = document.getElementById('bulk-network-select').value;
  const count = parseInt(document.getElementById('bulk-count-select').value, 10) || 10;

  try {
    const cryptoLib = window.PayCowCrypto || PayCowCryptoLib;
    if (!cryptoLib || !cryptoLib.generateBulkWallets) {
      throw new Error('Client cryptographic engine not initialized.');
    }

    const bulk = cryptoLib.generateBulkWallets(network, count, 12, 'segwit');
    currentBulk = {
      ...bulk,
      generatedAt: new Date().toISOString()
    };

    renderBulkResult(currentBulk);
    showToast(`${currentBulk.total} ${currentBulk.network} wallets generated in browser!`, 'success');
  } catch (err) {
    console.error('Bulk generation error:', err);
    showToast('Bulk generation error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate Bulk Wallets';
  }
});

function renderBulkResult(bulk) {
  const container = document.getElementById('bulk-results-container');
  container.style.display = 'block';
  document.getElementById('bulk-results-title').textContent = `Generated Wallets (${bulk.total} Wallets - ${bulk.network})`;

  const tbody = document.getElementById('bulk-results-tbody');
  tbody.innerHTML = bulk.wallets.map(w => `
    <tr>
      <td><strong>${w.index}</strong></td>
      <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">${w.address}</span></td>
      <td><span class="masked" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-red);">••••••••••••••••</span></td>
      <td>
        <button class="btn-icon-action" onclick="copyToClipboard('${w.address}', 'Address copied!')"><i class="fa-regular fa-copy"></i> Address</button>
        <button class="btn-icon-action" onclick="copyToClipboard('${w.wifPrivateKey || w.privateKey}', 'Private key copied!')" style="color: var(--accent-red);"><i class="fa-solid fa-key"></i> Key</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('btn-generate-master-seed')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-generate-master-seed');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deriving Multi-Chain Keys...';

  const length = parseInt(document.getElementById('master-seed-length').value, 10) || 12;

  try {
    const cryptoLib = window.PayCowCrypto || PayCowCryptoLib;
    if (!cryptoLib || !cryptoLib.generateUniversalMasterSeed) {
      throw new Error('Client cryptographic engine not initialized.');
    }

    const master = cryptoLib.generateUniversalMasterSeed(length);
    currentMasterSeed = {
      ...master,
      generatedAt: new Date().toISOString()
    };

    renderMasterSeedResult(currentMasterSeed);
    showToast('Master Seed and 17+ blockchains derived locally!', 'success');
  } catch (err) {
    console.error('Master seed error:', err);
    showToast('Master seed error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Master Seed';
  }
});

function renderMasterSeedResult(seedData) {
  const container = document.getElementById('master-seed-result-container');
  container.style.display = 'block';
  document.getElementById('master-seed-words-text').textContent = seedData.mnemonic;

  const list = document.getElementById('master-chains-list');
  list.innerHTML = seedData.chains.map(c => `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="net-badge" style="font-weight: 800; color: var(--primary-blue);">${c.network} - ${c.name}</span>
        <span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${c.derivationPath}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 8px;">
        <span style="font-family: var(--font-mono); font-size: 0.85rem; word-break: break-all;">${c.address}</span>
        <button class="btn-icon-action" onclick="copyToClipboard('${c.address}')"><i class="fa-regular fa-copy"></i></button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
        <span>Private Key: <span class="masked">••••••••••••••••••••••••••••••••</span></span>
        <button class="btn-icon-action" onclick="copyToClipboard('${c.privateKey}', 'Key copied!')" style="color: var(--accent-red); font-size: 0.75rem;"><i class="fa-solid fa-key"></i> Key</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('btn-studio-save-history')?.addEventListener('click', async () => {
  if (!currentWallet) return;
  const label = document.getElementById('studio-wallet-label').value;

  try {
    const res = await fetch('/api/wallets/save-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: currentWallet.network,
        address: currentWallet.address,
        derivation_path: currentWallet.derivationPath,
        label: label || `${currentWallet.network} Wallet`
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Public address saved to account ledger!', 'success');
      loadSavedWallets();
      loadOverviewData();
    } else {
      showToast(data.error || 'Failed to save address.', 'error');
    }
  } catch {
    showToast('Save error.', 'error');
  }
});

function renderTreeNodes(nodes) {
  let html = '';
  for (const node of nodes) {
    if (node.type === 'directory') {
      html += `
        <div class="tree-folder">
          <div class="tree-folder-header">
            <i class="fa-regular fa-folder-open" style="color: #60a5fa;"></i>
            <span>${node.name}</span>
          </div>
          <div class="tree-children">
            ${renderTreeNodes(node.children)}
          </div>
        </div>
      `;
    } else {
      const activeClass = node.path === currentExplorerPath ? 'active' : '';
      html += `
        <div class="tree-file-item ${activeClass}" data-path="${node.path}">
          <i class="${node.icon || 'fa-regular fa-file-code'}" style="color: #38bdf8;"></i>
          <span>${node.name}</span>
        </div>
      `;
    }
  }
  return html;
}

async function initFileExplorer() {
  const root = document.getElementById('explorer-tree-root');
  if (!root) return;

  try {
    const res = await fetch('/api/file-explorer/tree');
    const data = await res.json();
    if (data.success && data.tree) {
      root.innerHTML = renderTreeNodes(data.tree);

      root.querySelectorAll('.tree-file-item').forEach(item => {
        item.addEventListener('click', () => {
          root.querySelectorAll('.tree-file-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          const path = item.getAttribute('data-path');
          loadExplorerFile(path);
        });
      });

      loadExplorerFile(currentExplorerPath);
    }
  } catch (err) {
    console.error('File explorer tree error:', err);
  }
}

async function loadExplorerFile(path) {
  currentExplorerPath = path;
  const pre = document.getElementById('explorer-code-content');
  const pathSpan = document.getElementById('explorer-current-path');
  const sizeSpan = document.getElementById('explorer-file-size');

  pathSpan.textContent = path;
  pre.textContent = 'Loading file...';

  try {
    const res = await fetch(`/api/file-explorer/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.success) {
      pre.textContent = data.content;
      sizeSpan.textContent = data.size > 1024 ? `${(data.size / 1024).toFixed(1)} KB` : `${data.size} B`;
    } else {
      pre.textContent = 'File could not be loaded.';
    }
  } catch {
    pre.textContent = 'Network error while loading file.';
  }
}

document.getElementById('btn-run-live-tests')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-run-live-tests');
  const termBox = document.getElementById('explorer-terminal-box');
  const termOut = document.getElementById('explorer-terminal-output');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running 35 Chain Tests...';
  termBox.style.display = 'block';
  termOut.textContent = 'Executing test_wallet_import.js in live node environment...\n';

  try {
    const res = await fetch('/api/file-explorer/run-tests', { method: 'POST' });
    const data = await res.json();

    termOut.textContent = data.output || 'No output.';
    if (data.success) {
      showToast('All 35 blockchain test suites passed 100%!', 'success');
    } else {
      showToast('Test execution returned error.', 'error');
    }

    if (currentExplorerPath === 'tests/test_results.log') {
      loadExplorerFile('tests/test_results.log');
    }
  } catch (err) {
    termOut.textContent = 'Error executing tests: ' + err.message;
    showToast('Failed to run tests.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Run All 35 Chain Tests';
  }
});

document.getElementById('btn-close-terminal')?.addEventListener('click', () => {
  document.getElementById('explorer-terminal-box').style.display = 'none';
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-toggle-mask')) {
    const btn = e.target.closest('.btn-toggle-mask');
    const targetId = btn.getAttribute('data-target');
    const el = document.getElementById(targetId);
    if (el) {
      if (el.classList.contains('masked')) {
        el.classList.remove('masked');
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide';
      } else {
        el.classList.add('masked');
        btn.innerHTML = '<i class="fa-solid fa-eye"></i> Reveal';
      }
    }
  }

  if (e.target.closest('.btn-copy')) {
    const btn = e.target.closest('.btn-copy');
    const targetId = btn.getAttribute('data-target');
    const el = document.getElementById(targetId);
    if (el) {
      copyToClipboard(el.textContent.trim());
    }
  }

  if (e.target.closest('#btn-studio-qr')) {
    if (currentWallet && currentWallet.addressQr) {
      document.getElementById('qr-modal-title').textContent = `${currentWallet.network} Address QR Code`;
      document.getElementById('qr-modal-img').src = currentWallet.addressQr;
      document.getElementById('qr-modal-text').textContent = currentWallet.address;
      modalQr.classList.add('active');
    }
  }

  if (e.target.closest('#btn-studio-priv-qr')) {
    if (currentWallet && currentWallet.privateKeyQr) {
      document.getElementById('qr-modal-title').textContent = `${currentWallet.network} Private Key QR Code`;
      document.getElementById('qr-modal-img').src = currentWallet.privateKeyQr;
      document.getElementById('qr-modal-text').textContent = currentWallet.wifPrivateKey || currentWallet.privateKey;
      modalQr.classList.add('active');
    }
  }
});

document.getElementById('btn-studio-download-json')?.addEventListener('click', () => {
  if (!currentWallet) return;
  downloadFile(JSON.stringify(currentWallet, null, 2), `paycow_${currentWallet.network}_wallet.json`, 'application/json');
});

document.getElementById('btn-studio-download-txt')?.addEventListener('click', () => {
  if (!currentWallet) return;
  const txt = `PAYCOW WALLET BACKUP\nNetwork: ${currentWallet.networkName || currentWallet.network}\nAddress: ${currentWallet.address}\nPrivate Key: ${currentWallet.wifPrivateKey || currentWallet.privateKey}\nMnemonic: ${currentWallet.mnemonic || '-'}\nDerivation: ${currentWallet.derivationPath || '-'}\nCreated: ${currentWallet.generatedAt}\n`;
  downloadFile(txt, `paycow_${currentWallet.network}_wallet.txt`, 'text/plain');
});

document.getElementById('btn-download-bulk-csv')?.addEventListener('click', () => {
  if (!currentBulk) return;
  let csv = 'Index,Network,Address,PrivateKey,Mnemonic\n';
  currentBulk.wallets.forEach(w => {
    csv += `"${w.index}","${w.network}","${w.address}","${w.wifPrivateKey || w.privateKey}","${w.mnemonic || ''}"\n`;
  });
  downloadFile(csv, `paycow_bulk_${currentBulk.network}.csv`, 'text/csv');
});

document.getElementById('btn-download-bulk-json')?.addEventListener('click', () => {
  if (!currentBulk) return;
  downloadFile(JSON.stringify(currentBulk, null, 2), `paycow_bulk_${currentBulk.network}.json`, 'application/json');
});

document.getElementById('btn-refresh-overview-history')?.addEventListener('click', () => {
  loadSavedWallets();
  loadOverviewData();
  showToast('Ledger refreshed.', 'info');
});

document.getElementById('btn-reload-saved-wallets')?.addEventListener('click', () => {
  loadSavedWallets();
  showToast('Saved addresses refreshed.', 'info');
});

document.getElementById('btn-close-qr-modal')?.addEventListener('click', () => {
  modalQr.classList.remove('active');
});

document.getElementById('btn-gate-tab-login')?.addEventListener('click', () => {
  document.getElementById('btn-gate-tab-login').classList.add('active');
  document.getElementById('btn-gate-tab-register').classList.remove('active');
  document.getElementById('gate-form-login').style.display = 'block';
  document.getElementById('gate-form-register').style.display = 'none';
});

document.getElementById('btn-gate-tab-register')?.addEventListener('click', () => {
  document.getElementById('btn-gate-tab-register').classList.add('active');
  document.getElementById('btn-gate-tab-login').classList.remove('active');
  document.getElementById('gate-form-login').style.display = 'none';
  document.getElementById('gate-form-register').style.display = 'block';
});

document.getElementById('gate-form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = document.getElementById('gate-login-username').value;
  const password = document.getElementById('gate-login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Welcome back!', 'success');
      await checkAuth();
    } else {
      showToast(data.error || 'Sign in failed.', 'error');
    }
  } catch {
    showToast('Sign in server error.', 'error');
  }
});

document.getElementById('gate-form-register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('gate-reg-username').value;
  const email = document.getElementById('gate-reg-email').value;
  const password = document.getElementById('gate-reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Account created successfully!', 'success');
      await checkAuth();
    } else {
      showToast(data.error || 'Registration failed.', 'error');
    }
  } catch {
    showToast('Registration server error.', 'error');
  }
});

document.getElementById('btn-sidebar-logout')?.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showToast('Logged out.', 'info');
    await checkAuth();
  } catch {
    showToast('Logout error.', 'error');
  }
});

window.addEventListener('click', (e) => {
  if (e.target === modalQr) modalQr.classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
