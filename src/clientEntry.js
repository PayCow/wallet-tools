const { Buffer } = require('buffer');

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  globalThis.Buffer = Buffer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
}

const cryptoEngine = require('./services/crypto/index');

if (typeof window !== 'undefined') {
  window.PayCowCrypto = cryptoEngine;
  window.PayCowCryptoLib = cryptoEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PayCowCrypto = cryptoEngine;
  globalThis.PayCowCryptoLib = cryptoEngine;
}

module.exports = cryptoEngine;
