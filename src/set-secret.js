const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPgDataStore } = require('./pg-store');

const ROOT_DIR = path.resolve(__dirname, '..');
const MASTER_KEY_FILE = path.join(ROOT_DIR, '.duffel_master_key');

const FILES = {
  users: 'users',
  sessions: 'sessions',
  rewards: 'rewards',
  loyaltyVault: 'loyaltyVault',
  flights: 'flights',
  payments: 'payments',
  bookings: 'bookings',
  searchHistory: 'searchHistory',
  airportsIndex: 'airportsIndex',
  adminConfig: 'adminConfig'
};

const DEFAULT_COLLECTIONS = {
  [FILES.users]: [],
  [FILES.sessions]: [],
  [FILES.rewards]: [],
  [FILES.loyaltyVault]: [],
  [FILES.payments]: [],
  [FILES.bookings]: [],
  [FILES.searchHistory]: [],
  [FILES.airportsIndex]: [],
  [FILES.adminConfig]: {
    feeByCabin: {
      economy: 0,
      premium_economy: 0,
      business: 0,
      first: 0
    },
    updatedAt: new Date().toISOString()
  },
  [FILES.flights]: []
};

function resolveMasterKeyMaterial() {
  let base = (process.env.MI_TRAVEL_MASTER_KEY || '').trim();
  if (!base && fs.existsSync(MASTER_KEY_FILE)) {
    base = fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
  }
  if (!base) {
    throw new Error('Missing master key. Set MI_TRAVEL_MASTER_KEY or create .duffel_master_key.');
  }
  return base;
}

function encryptSecretForStorage(value) {
  const plain = String(value || '').trim();
  if (!plain) throw new Error('Secret value cannot be empty.');

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const master = resolveMasterKeyMaterial();
  const key = crypto.scryptSync(master, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    alg: 'aes-256-gcm',
    kdf: 'scrypt',
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  const secretName = String(process.argv[2] || '').trim();
  const secretValue = String(process.argv[3] || '').trim();

  if (!secretName || !secretValue) {
    console.error('Usage: node src/set-secret.js <secret_name> <secret_value>');
    process.exit(1);
  }

  const store = createPgDataStore({ defaults: DEFAULT_COLLECTIONS, legacyFiles: {} });
  await store.init();
  const encrypted = encryptSecretForStorage(secretValue);
  await store.setSecret(secretName, encrypted);
  await store.close();

  console.log(`Stored encrypted secret: ${secretName}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
