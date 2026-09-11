const { ethers } = require('ethers');
const bip39 = require('bip39');
const bs58 = require('bs58').default || require('bs58');
const basex = require('base-x').default || require('base-x');
const { blake2b, blake2bHex } = require('blakejs');

let nodeCrypto = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    nodeCrypto = eval("require('crypto')");
  } catch (e) {
    nodeCrypto = null;
  }
}

const RIPPLE_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
const rippleBs58 = basex(RIPPLE_ALPHABET);

const XMR_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const xmrBs58 = basex(XMR_ALPHABET);

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function sha256(data) {
  return Buffer.from(ethers.getBytes(ethers.sha256(data)));
}

function pureSha3_256(data) {
  const RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
  ];

  const RHO = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
  ];

  const rate = 136;
  const input = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const padLen = rate - (input.length % rate);
  const padded = Buffer.alloc(input.length + padLen);
  input.copy(padded);
  if (padLen === 1) {
    padded[input.length] = 0x86;
  } else {
    padded[input.length] = 0x06;
    padded[padded.length - 1] = 0x80;
  }

  const state = Array.from({ length: 5 }, () => new BigUint64Array(5));

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i++) {
      const x = i % 5;
      const y = Math.floor(i / 5);
      const val = padded.readBigUInt64LE(offset + i * 8);
      state[x][y] ^= val;
    }

    for (let round = 0; round < 24; round++) {
      const C = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        C[x] = state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4];
      }
      const D = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        const left = (C[(x + 1) % 5] << 1n) | (C[(x + 1) % 5] >> 63n);
        D[x] = C[(x + 4) % 5] ^ left;
      }
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          state[x][y] ^= D[x];
        }
      }

      const B = Array.from({ length: 5 }, () => new BigUint64Array(5));
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const shift = BigInt(RHO[x][y]);
          const rot = shift === 0n ? state[x][y] : (state[x][y] << shift) | (state[x][y] >> (64n - shift));
          B[y][(2 * x + 3 * y) % 5] = rot;
        }
      }

      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          state[x][y] = B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y]);
        }
      }

      state[0][0] ^= RC[round];
    }
  }

  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    const x = i % 5;
    const y = Math.floor(i / 5);
    out.writeBigUInt64LE(state[x][y], i * 8);
  }
  return out;
}

function sha3_256(data) {
  if (nodeCrypto && nodeCrypto.createHash) {
    return nodeCrypto.createHash('sha3-256').update(data).digest();
  }
  return pureSha3_256(data);
}

function sha512_256(data) {
  if (nodeCrypto && nodeCrypto.createHash) {
    return nodeCrypto.createHash('sha512-256').update(data).digest();
  }
  return Buffer.from(ethers.getBytes(ethers.sha512(data))).slice(0, 32);
}

function ripemd160(data) {
  return Buffer.from(ethers.getBytes(ethers.ripemd160(data)));
}

function base58CheckEncode(prefixByte, payloadBuffer) {
  const prefix = Buffer.isBuffer(prefixByte) ? prefixByte : Buffer.from([prefixByte]);
  const payload = Buffer.concat([prefix, payloadBuffer]);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

function base58CheckDecode(string) {
  const bytes = bs58.decode(string);
  if (bytes.length < 5) {
    throw new Error('Invalid Base58Check string length');
  }
  const payload = bytes.slice(0, bytes.length - 4);
  const checksum = bytes.slice(bytes.length - 4);
  const calculatedChecksum = sha256(sha256(payload)).slice(0, 4);

  if (!Buffer.from(checksum).equals(Buffer.from(calculatedChecksum))) {
    throw new Error('Invalid Base58Check checksum');
  }

  return {
    prefix: payload[0],
    data: payload.slice(1)
  };
}

function base58RippleEncode(payload) {
  return rippleBs58.encode(payload);
}

function base58RippleDecode(string) {
  return rippleBs58.decode(string);
}

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(string) {
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < string.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(string[i].toUpperCase());
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function cashAddrPolymod(values) {
  let c = 1n;
  for (let d of values) {
    let c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
    if (c0 & 0x02n) c ^= 0x79b76d99e2n;
    if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
    if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
    if (c0 & 0x10n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}

function encodeCashAddr(prefix, type, hash) {
  const versionByte = type === 'P2PKH' ? 0x00 : 0x08;
  const payload = [versionByte, ...hash];
  
  let acc = 0, bits = 0;
  const words = [];
  for (let byte of payload) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      words.push((acc >> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) words.push((acc << (5 - bits)) & 31);

  const prefixWords = [];
  for (let i = 0; i < prefix.length; i++) {
    prefixWords.push(prefix.charCodeAt(i) & 31);
  }
  prefixWords.push(0);

  const checksumData = [...prefixWords, ...words, 0, 0, 0, 0, 0, 0, 0, 0];
  const polymod = cashAddrPolymod(checksumData);
  const checksumWords = [];
  for (let i = 7; i >= 0; i--) {
    checksumWords.push(Number((polymod >> BigInt(5 * i)) & 31n));
  }

  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const combined = [...words, ...checksumWords];
  return prefix + ':' + combined.map(w => CHARSET[w]).join('');
}

function encodeKaspaAddress(prefix, pubKey32Bytes) {
  const version = 0x00;
  const payload = [version, ...pubKey32Bytes];
  
  let acc = 0, bits = 0;
  const words = [];
  for (let byte of payload) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      words.push((acc >> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) words.push((acc << (5 - bits)) & 31);

  const prefixWords = [];
  for (let i = 0; i < prefix.length; i++) {
    prefixWords.push(prefix.charCodeAt(i) & 31);
  }
  prefixWords.push(0);

  const checksumData = [...prefixWords, ...words, 0, 0, 0, 0, 0, 0, 0, 0];
  const polymod = cashAddrPolymod(checksumData);
  const checksumWords = [];
  for (let i = 7; i >= 0; i--) {
    checksumWords.push(Number((polymod >> BigInt(5 * i)) & 31n));
  }

  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const combined = [...words, ...checksumWords];
  return prefix + ':' + combined.map(w => CHARSET[w]).join('');
}

function xmrBase58Block(buffer) {
  let num = 0n;
  for (let i = 0; i < buffer.length; i++) {
    num = (num << 8n) | BigInt(buffer[i]);
  }
  const targetLen = buffer.length === 8 ? 11 : 7;
  let str = '';
  while (num > 0n) {
    const rem = Number(num % 58n);
    num = num / 58n;
    str = XMR_ALPHABET[rem] + str;
  }
  return str.padStart(targetLen, '1');
}

function xmrBase58Encode(buffer) {
  let out = '';
  for (let i = 0; i < buffer.length; i += 8) {
    const chunk = buffer.slice(i, Math.min(i + 8, buffer.length));
    out += xmrBase58Block(chunk);
  }
  return out;
}

function tonCrc16(buffer) {
  let crc = 0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= (buffer[i] << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return Buffer.from([(crc >> 8) & 0xff, crc & 0xff]);
}

function getBip39Seed(mnemonic) {
  return ethers.pbkdf2(
    ethers.toUtf8Bytes(mnemonic.normalize('NFKD')),
    ethers.toUtf8Bytes('mnemonic'.normalize('NFKD')),
    2048,
    64,
    'sha512'
  );
}

function derivePathEd25519(bip39SeedHex, path) {
  let master = ethers.getBytes(ethers.computeHmac('sha512', ethers.toUtf8Bytes('ed25519 seed'), ethers.getBytes(bip39SeedHex)));
  let key = master.slice(0, 32);
  let chainCode = master.slice(32);

  const segments = path.split('/').slice(1);
  for (const seg of segments) {
    const isHardened = seg.endsWith("'") || seg.endsWith('h');
    if (!isHardened) {
      throw new Error(`SLIP-0010 Ed25519 derivation only supports hardened path segments. Invalid segment: "${seg}"`);
    }
    const index = parseInt(seg, 10) + 0x80000000;
    
    const data = new Uint8Array(37);
    data[0] = 0x00;
    data.set(key, 1);
    data[33] = (index >> 24) & 0xff;
    data[34] = (index >> 16) & 0xff;
    data[35] = (index >> 8) & 0xff;
    data[36] = index & 0xff;

    const I = ethers.getBytes(ethers.computeHmac('sha512', chainCode, data));
    key = I.slice(0, 32);
    chainCode = I.slice(32);
  }

  return { key, chainCode };
}

function getRandomBytes(bytesCount) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytesCount);
    window.crypto.getRandomValues(arr);
    return arr;
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytesCount);
    crypto.getRandomValues(arr);
    return arr;
  }
  if (nodeCrypto && nodeCrypto.randomBytes) {
    return new Uint8Array(nodeCrypto.randomBytes(bytesCount));
  }
  return ethers.randomBytes(bytesCount);
}

function generateRandomMnemonic(wordsCount = 12) {
  const bytesCount = wordsCount === 24 ? 32 : 16;
  const entropy = getRandomBytes(bytesCount);
  return ethers.Mnemonic.fromEntropy(entropy).phrase;
}

module.exports = {
  sha256,
  sha3_256,
  sha512_256,
  ripemd160,
  base58CheckEncode,
  base58CheckDecode,
  base58RippleEncode,
  base58RippleDecode,
  base32Encode,
  base32Decode,
  encodeCashAddr,
  encodeKaspaAddress,
  xmrBase58Encode,
  tonCrc16,
  getBip39Seed,
  derivePathEd25519,
  generateRandomMnemonic,
  bs58
};
