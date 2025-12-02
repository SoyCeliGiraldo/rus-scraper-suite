// secrets.js
// Centraliza acceso a variables sensibles y provee funciones de sanitización.
require('dotenv').config();

function getSecret(name, fallback = '') {
  return process.env[name] || fallback;
}

function sanitizeObject(obj, keys = ['password', 'pass', 'email']) {
  const clone = { ...obj };
  for (const k of Object.keys(clone)) {
    if (keys.some(s => k.toLowerCase().includes(s))) {
      clone[k] = '***';
    }
  }
  return clone;
}

module.exports = { getSecret, sanitizeObject };