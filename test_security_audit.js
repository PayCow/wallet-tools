const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

function postJson(urlPath, body, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3849,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      res => {
        let responseBody = '';
        res.on('data', chunk => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(responseBody) });
          } catch {
            resolve({ statusCode: res.statusCode, data: responseBody });
          }
        });
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`HTTP request to ${urlPath} timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runSecurityIsolationChecks() {
  console.log('=================================================================================');
  console.log('  PAYCOW AUTOMATED CLIENT-SIDE ISOLATION & LEAKAGE REGRESSION SUITE              ');
  console.log('=================================================================================\n');

  const appJsPath = path.join(__dirname, 'public/js/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  const dangerousKeywords = [
    'analytics',
    'telemetry',
    'mixpanel',
    'google-analytics',
    'sentry',
    'datadog',
    'hotjar',
    'segment.io',
    'loggly'
  ];

  for (const kw of dangerousKeywords) {
    assert(
      !appJsContent.toLowerCase().includes(kw),
      `SECURITY NOTICE: Tracked keyword found in app.js: "${kw}"`
    );
  }
  console.log('[PASS] Static Scan: No known telemetry/tracker primitives found in app.js');

  const generatorFuncRegex = /document\.getElementById\('btn-studio-generate'\)\?\.addEventListener\('click'([\s\S]*?)\}\);/;
  const match = appJsContent.match(generatorFuncRegex);
  assert(match && match[1], 'CRITICAL FAIL-CLOSED: btn-studio-generate handler not found in app.js');

  const generatorBody = match[1];
  assert(!generatorBody.includes('fetch('), 'SECURITY VIOLATION: fetch() detected inside browser generator button handler');
  assert(!generatorBody.includes('XMLHttpRequest'), 'SECURITY VIOLATION: XMLHttpRequest detected inside generator handler');
  assert(!generatorBody.includes('sendBeacon'), 'SECURITY VIOLATION: sendBeacon detected inside generator handler');
  assert(!generatorBody.includes('WebSocket'), 'SECURITY VIOLATION: WebSocket detected inside generator handler');
  console.log('[PASS] Pipeline Scan: No network egress primitives found in generator click handler');

  const forbiddenRoutes = ['/api/wallets/generate', '/api/wallets/bulk', '/api/wallets/universal-seed'];
  for (const r of forbiddenRoutes) {
    const res = await postJson(r, { network: 'ETH' });
    assert.strictEqual(res.statusCode, 403, `Route ${r} expected 403 Forbidden, got ${res.statusCode}`);
    assert(
      res.data.securityNotice === 'NON-CUSTODIAL CLIENT EXECUTION REQUIRED',
      `Route ${r} missing expected security notice`
    );
    console.log(`[PASS] Server Lockout: ${r} returned HTTP 403 as expected`);
  }

  const sensitiveFieldTests = [
    { privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    { privKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    { private_key: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    { secret: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    { mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' },
    { seed: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    { seedPhrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' },
    { wif: 'KxZ9p1P1hP8u7D7G9qF5y3m8b9n7p6c4x2v1z3q5w7e9r1t3y5u7' },
    { xprv: 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wDELgbdTHIvLRw2BCyYY2ceD8266sPvSPQqL7M7AqbHGC9XjP5GzH3rPRGNbW2A5Q6Z5G4vV' },
    { unrecognized_field_abc: 'test' }
  ];

  for (const payload of sensitiveFieldTests) {
    const testBody = {
      network: 'ETH',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      ...payload
    };
    const res = await postJson('/api/wallets/save-public', testBody);
    assert.strictEqual(
      res.statusCode,
      400,
      `Server guard failed to reject sensitive/unrecognized payload: ${JSON.stringify(payload)}`
    );
  }
  console.log(`[PASS] Server Guard: Allowlist firewall rejected all ${sensitiveFieldTests.length} sensitive/unrecognized payloads (HTTP 400 Bad Request)`);

  console.log('\n=================================================================================');
  console.log('  ALL AUTOMATED CLIENT ISOLATION & DATA LEAKAGE REGRESSION CHECKS PASSED!        ');
  console.log('=================================================================================');
}

runSecurityIsolationChecks().catch(err => {
  console.error('Isolation check error:', err);
  process.exit(1);
});
