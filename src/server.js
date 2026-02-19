const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 3000;
const DUFFEL_BASE_URL = process.env.DUFFEL_BASE_URL || 'https://api.duffel.com';
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || 'v2';
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const ENCRYPTED_DUFFEL_FILE = path.join(CONFIG_DIR, 'duffel.encrypted.json');
const MASTER_KEY_FILE = path.join(ROOT_DIR, '.duffel_master_key');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  rewards: path.join(DATA_DIR, 'rewards.json'),
  loyaltyVault: path.join(DATA_DIR, 'loyaltyVault.json'),
  flights: path.join(DATA_DIR, 'flights.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  bookings: path.join(DATA_DIR, 'bookings.json'),
  searchHistory: path.join(DATA_DIR, 'searchHistory.json'),
  airportsIndex: path.join(DATA_DIR, 'airportsIndex.json'),
  adminConfig: path.join(DATA_DIR, 'adminConfig.json')
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const SESSION_COOKIE = 'mitravel_session';
const DUFFEL_ACCESS_TOKEN = resolveDuffelToken();

function resolveDuffelToken() {
  const direct = (process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_TOKEN || '').trim();
  if (direct) {
    return direct;
  }

  if (!fs.existsSync(ENCRYPTED_DUFFEL_FILE)) {
    return '';
  }

  let masterKey = (process.env.MI_TRAVEL_MASTER_KEY || '').trim();
  if (!masterKey && fs.existsSync(MASTER_KEY_FILE)) {
    masterKey = fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
  }
  if (!masterKey) {
    return '';
  }

  try {
    const payload = JSON.parse(fs.readFileSync(ENCRYPTED_DUFFEL_FILE, 'utf8'));
    const key = crypto.scryptSync(masterKey, Buffer.from(payload.salt, 'hex'), 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    const clear = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final()
    ]).toString('utf8');
    return clear.trim();
  } catch {
    return '';
  }
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const defaults = {
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
    [FILES.flights]: [
      { id: 'f1', from: 'FRA', to: 'JFK', date: '2026-04-10', airline: 'Lufthansa', flightNumber: 'LH111', cabin: 'Business', pointsRequired: 20000, cashPrice: 580, depTime: '09:20', arrTime: '16:30', duration: '13h', stops: 'Non stop' },
      { id: 'f2', from: 'FRA', to: 'JFK', date: '2026-04-10', airline: 'Lufthansa', flightNumber: 'LH113', cabin: 'Business', pointsRequired: 24000, cashPrice: 610, depTime: '13:10', arrTime: '20:25', duration: '13h 15m', stops: 'Non stop' },
      { id: 'f3', from: 'FRA', to: 'JFK', date: '2026-04-10', airline: 'Lufthansa', flightNumber: 'LH115', cabin: 'Economy', pointsRequired: 18000, cashPrice: 540, depTime: '15:35', arrTime: '22:50', duration: '13h 15m', stops: 'Non stop' },
      { id: 'f4', from: 'JFK', to: 'LHR', date: '2026-03-10', airline: 'Virgin Atlantic', flightNumber: 'VS026', cabin: 'Economy', pointsRequired: 28000, cashPrice: 520, depTime: '08:00', arrTime: '19:30', duration: '7h 30m', stops: 'Non stop' },
      { id: 'f5', from: 'JFK', to: 'LHR', date: '2026-03-10', airline: 'Emirates', flightNumber: 'EK202', cabin: 'Business', pointsRequired: 62000, cashPrice: 1850, depTime: '10:50', arrTime: '22:15', duration: '7h 25m', stops: 'Non stop' },
      { id: 'f6', from: 'SFO', to: 'CDG', date: '2026-03-12', airline: 'Air France', flightNumber: 'AF083', cabin: 'Economy', pointsRequired: 34000, cashPrice: 710, depTime: '12:40', arrTime: '09:00', duration: '10h 20m', stops: 'Non stop' },
      { id: 'f7', from: 'DXB', to: 'BKK', date: '2026-03-15', airline: 'Fly Dubai', flightNumber: 'FZ1465', cabin: 'Economy', pointsRequired: 12000, cashPrice: 260, depTime: '07:50', arrTime: '17:20', duration: '6h 30m', stops: 'Non stop' },
      { id: 'f8', from: 'LHR', to: 'DXB', date: '2026-03-20', airline: 'Emirates', flightNumber: 'EK008', cabin: 'Business', pointsRequired: 58000, cashPrice: 1610, depTime: '20:15', arrTime: '07:10', duration: '6h 55m', stops: 'Non stop' }
    ]
  };

  for (const [filePath, value] of Object.entries(defaults)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    }
  }

  ensureAdminUser();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return raw.split(';').reduce((acc, part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) {
      return acc;
    }
    acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const computed = hashPassword(password, salt).hash;
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

function createSession(userId) {
  const sessions = readJson(FILES.sessions);
  const token = crypto.randomBytes(24).toString('hex');
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  writeJson(FILES.sessions, sessions);
  return token;
}

function getUserFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const sessions = readJson(FILES.sessions);
  const match = sessions.find(s => s.token === token);
  if (!match) {
    return null;
  }

  const users = readJson(FILES.users);
  const user = users.find(u => u.id === match.userId);
  return user || null;
}

function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  const role = String(user.role || '').toLowerCase();
  if (role !== 'admin') {
    sendJson(res, 403, { error: 'Admin access required' });
    return null;
  }
  return user;
}

function normalizeUser(user) {
  return {
    ...user,
    role: user.role === 'admin' ? 'admin' : 'user',
    homeAirport: user.homeAirport || '',
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    address: user.address || '',
    passportNumber: user.passportNumber || '',
    passportExpiry: user.passportExpiry || '',
    passportCountry: user.passportCountry || '',
    title: user.title || '',
    gender: user.gender || '',
    bornOn: user.bornOn || '',
    phone: user.phone || '',
    language: user.language || 'English',
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    preferences: Array.isArray(user.preferences) ? user.preferences : []
  };
}

function publicUser(rawUser) {
  const user = normalizeUser(rawUser);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    homeAirport: user.homeAirport,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    address: user.address,
    passportNumber: user.passportNumber,
    passportExpiry: user.passportExpiry,
    passportCountry: user.passportCountry,
    title: user.title,
    gender: user.gender,
    bornOn: user.bornOn,
    phone: user.phone,
    language: user.language,
    preferences: user.preferences,
    twoFactorEnabled: user.twoFactorEnabled,
    role: user.role,
    createdAt: user.createdAt
  };
}

function ensureAdminUser() {
  const users = readJson(FILES.users);
  const existingAdmin = users.find(u => String(u.role || '').toLowerCase() === 'admin');
  if (existingAdmin) {
    return;
  }

  const adminName = (process.env.ADMIN_NAME || 'MiTravel Admin').trim();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mitravel.local').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'Admin#2026!').trim();
  const [firstName = '', ...rest] = adminName.split(' ');
  const lastName = rest.join(' ');
  const { salt, hash } = hashPassword(adminPassword);

  users.push({
    id: crypto.randomUUID(),
    name: adminName,
    email: adminEmail,
    passwordSalt: salt,
    passwordHash: hash,
    role: 'admin',
    firstName,
    middleName: '',
    lastName,
    homeAirport: '',
    address: '',
    passportNumber: '',
    passportExpiry: '',
    passportCountry: '',
    title: '',
    gender: '',
    bornOn: '',
    phone: '',
    language: 'English',
    twoFactorEnabled: false,
    preferences: [],
    createdAt: new Date().toISOString()
  });
  writeJson(FILES.users, users);
}

function getAdminConfig() {
  const raw = readJson(FILES.adminConfig);
  const oldPercent = Number(raw.duffelFeePercent);
  const source = (raw.feeByCabin && typeof raw.feeByCabin === 'object')
    ? raw.feeByCabin
    : {
      economy: oldPercent,
      premium_economy: oldPercent,
      business: oldPercent,
      first: oldPercent
    };

  const feeByCabin = {
    economy: Number.isFinite(Number(source.economy)) ? Math.max(0, Math.min(100, Number(source.economy))) : 0,
    premium_economy: Number.isFinite(Number(source.premium_economy)) ? Math.max(0, Math.min(100, Number(source.premium_economy))) : 0,
    business: Number.isFinite(Number(source.business)) ? Math.max(0, Math.min(100, Number(source.business))) : 0,
    first: Number.isFinite(Number(source.first)) ? Math.max(0, Math.min(100, Number(source.first))) : 0
  };

  return {
    feeByCabin,
    duffelFeePercent: feeByCabin.economy,
    updatedAt: raw.updatedAt || ''
  };
}

function setAdminConfig(next) {
  const incomingFeeByCabin = next && typeof next.feeByCabin === 'object' ? next.feeByCabin : null;
  const singlePercent = Number(next?.duffelFeePercent);

  const fallbackPercent = Number.isFinite(singlePercent) ? Math.max(0, Math.min(100, singlePercent)) : 0;
  const feeByCabin = {
    economy: Number.isFinite(Number(incomingFeeByCabin?.economy)) ? Math.max(0, Math.min(100, Number(incomingFeeByCabin.economy))) : fallbackPercent,
    premium_economy: Number.isFinite(Number(incomingFeeByCabin?.premium_economy)) ? Math.max(0, Math.min(100, Number(incomingFeeByCabin.premium_economy))) : fallbackPercent,
    business: Number.isFinite(Number(incomingFeeByCabin?.business)) ? Math.max(0, Math.min(100, Number(incomingFeeByCabin.business))) : fallbackPercent,
    first: Number.isFinite(Number(incomingFeeByCabin?.first)) ? Math.max(0, Math.min(100, Number(incomingFeeByCabin.first))) : fallbackPercent
  };

  const record = {
    feeByCabin,
    duffelFeePercent: feeByCabin.economy,
    updatedAt: new Date().toISOString()
  };
  writeJson(FILES.adminConfig, record);
  return record;
}

function normalizeCabinKey(cabin) {
  const raw = String(cabin || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (raw === 'premium' || raw === 'premiumeco' || raw === 'premiumeconomy') return 'premium_economy';
  if (raw === 'premium_economy') return 'premium_economy';
  if (raw === 'business') return 'business';
  if (raw === 'first') return 'first';
  return 'economy';
}

function applyDuffelFeeToFlight(flight) {
  if (!flight || String(flight.source || '').toLowerCase() !== 'duffel') {
    return flight;
  }
  const config = getAdminConfig();
  const cabinKey = normalizeCabinKey(flight.cabin);
  const percent = Number(config.feeByCabin?.[cabinKey] || 0);
  const base = Number(flight.cashPrice || 0);
  const feeAmount = Number((base * percent / 100).toFixed(2));
  const total = Number((base + feeAmount).toFixed(2));
  return {
    ...flight,
    feeCabin: cabinKey,
    baseCashPrice: base,
    feePercent: percent,
    feeAmount,
    cashPrice: total
  };
}

function routeKeyFromFlight(flight) {
  const from = String(flight?.outboundFrom || flight?.from || '').trim().toUpperCase();
  const to = String(flight?.outboundTo || flight?.to || '').trim().toUpperCase();
  if (!from || !to) return '';
  return `${from}-${to}`;
}

function buildAdminStats() {
  const users = readJson(FILES.users);
  const history = readJson(FILES.searchHistory);
  const bookings = readJson(FILES.bookings);
  const rewards = readJson(FILES.rewards);
  const config = getAdminConfig();

  const usersCount = users.length;
  const usersByRole = users.reduce((acc, user) => {
    const role = String(user.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
    acc[role] = Number(acc[role] || 0) + 1;
    return acc;
  }, { admin: 0, user: 0 });

  const searchSessionsCount = history.length;
  const searchCount = history.reduce((acc, session) => {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const promptCount = messages.filter(m => String(m.role || '').toLowerCase() === 'user').length;
    return acc + promptCount;
  }, 0);

  const routeCounts = new Map();
  for (const session of history) {
    const first = Array.isArray(session.latestResults) ? session.latestResults[0] : null;
    const key = routeKeyFromFlight(first);
    if (!key) continue;
    routeCounts.set(key, Number(routeCounts.get(key) || 0) + 1);
  }
  const topRoutes = [...routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([route, count]) => ({ route, count }));

  const ffpProgramCounts = new Map();
  for (const reward of rewards) {
    const program = String(reward.programName || 'Unknown').trim() || 'Unknown';
    ffpProgramCounts.set(program, Number(ffpProgramCounts.get(program) || 0) + 1);
  }
  const frequentFlyerPrograms = [...ffpProgramCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([program, count]) => ({ program, count }));

  const bookingsCount = bookings.length;
  const bookingAmount = bookings.reduce((acc, booking) => acc + Number(booking.totalAmount || 0), 0);
  const amountPaid = bookingAmount;
  const totalFeeAmount = bookings.reduce((acc, booking) => acc + Number(booking.flight?.feeAmount || 0), 0);

  return {
    usersCount,
    usersByRole,
    searchCount,
    searchSessionsCount,
    bookingsCount,
    bookingAmount: Number(bookingAmount.toFixed(2)),
    amountPaid: Number(amountPaid.toFixed(2)),
    totalFeeAmount: Number(totalFeeAmount.toFixed(2)),
    topRoutes,
    frequentFlyerPrograms,
    pricing: config
  };
}

function maskCardLast4(last4) {
  return `**** ${last4}`;
}

function cardBrandFromNumber(number) {
  const clean = number.replace(/\D/g, '');
  if (clean.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(clean)) return 'Master Card';
  if (/^3[47]/.test(clean)) return 'American Express';
  return 'Card';
}

function serializePayment(p) {
  const method = String(p.method || 'card').trim().toLowerCase();
  const brand = method === 'paypal' ? 'PayPal' : (method === 'apple_pay' ? 'Apple Pay' : p.brand);
  const displayLabel = method === 'paypal'
    ? String(p.paypalEmailMasked || '').trim()
    : (method === 'apple_pay'
      ? String(p.applePayReference || 'Wallet linked').trim()
      : maskCardLast4(p.last4));
  return {
    id: p.id,
    method,
    methodLabel: method === 'card' ? 'Card' : (method === 'paypal' ? 'PayPal' : 'Apple Pay'),
    brand,
    cardholderName: p.cardholderName,
    last4Masked: method === 'card' ? maskCardLast4(p.last4) : '',
    displayLabel,
    exp: p.exp,
    country: p.country,
    address: p.address,
    zip: p.zip,
    primary: Boolean(p.primary)
  };
}

function serializeReward(r) {
  return {
    id: r.id,
    userId: r.userId,
    programName: r.programName,
    points: Number(r.points || 0),
    tier: String(r.tier || '').trim(),
    createdAt: r.createdAt
  };
}

function resolveLoyaltyVaultKey() {
  let base = (process.env.MI_TRAVEL_MASTER_KEY || '').trim();
  if (!base && fs.existsSync(MASTER_KEY_FILE)) {
    base = fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
  }
  if (!base) {
    base = 'mi-travel-local-dev-key';
  }
  return crypto.scryptSync(base, 'mi-travel-loyalty-v1', 32);
}

function encryptVaultValue(value, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
}

function decryptVaultValue(payload, key) {
  if (!payload || typeof payload !== 'object') return '';
  try {
    const iv = Buffer.from(String(payload.iv || ''), 'hex');
    const tag = Buffer.from(String(payload.tag || ''), 'hex');
    const ciphertext = Buffer.from(String(payload.ciphertext || ''), 'hex');
    if (!iv.length || !tag.length || !ciphertext.length) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const clear = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return clear.trim();
  } catch {
    return '';
  }
}

function maskLogin(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const at = input.indexOf('@');
  if (at > 1) {
    const head = input.slice(0, Math.min(2, at));
    const domain = input.slice(at);
    return `${head}***${domain}`;
  }
  if (input.length <= 4) return `${input[0] || ''}***`;
  return `${input.slice(0, 2)}***${input.slice(-2)}`;
}

function storeEncryptedLoyaltyCredentials({ userId, rewardId, programName, memberLogin, memberPassword }) {
  const vault = readJson(FILES.loyaltyVault);
  const key = resolveLoyaltyVaultKey();
  const loginEncrypted = encryptVaultValue(memberLogin, key);
  const passwordEncrypted = encryptVaultValue(memberPassword, key);
  vault.push({
    id: crypto.randomUUID(),
    userId,
    rewardId,
    programName,
    loginEncrypted,
    passwordEncrypted,
    createdAt: new Date().toISOString()
  });
  writeJson(FILES.loyaltyVault, vault);
}

function fetchMilesAndMoreSnapshotFake({ userId, rewardId, memberLogin, memberPassword }) {
  storeEncryptedLoyaltyCredentials({
    userId,
    rewardId,
    programName: 'Miles & More',
    memberLogin,
    memberPassword
  });
  return {
    points: 150000,
    tier: 'Senator'
  };
}

function fetchAnaMileageClubSnapshotFake({ userId, rewardId, memberLogin, memberPassword }) {
  storeEncryptedLoyaltyCredentials({
    userId,
    rewardId,
    programName: 'ANA Mileage Club',
    memberLogin,
    memberPassword
  });
  return {
    points: 1000000,
    tier: 'Diamond'
  };
}

function normalizeRewardRecord(record) {
  const programName = String(record.programName || '').trim();
  const normalized = { ...record, programName };
  const points = Number(record.points || 0);
  const tier = String(record.tier || '').trim();
  if (programName === 'Miles & More') {
    normalized.points = points > 0 ? points : 150000;
    normalized.tier = tier || 'Senator';
  } else if (programName === 'ANA Mileage Club') {
    normalized.points = points > 0 ? points : 1000000;
    normalized.tier = tier || 'Diamond';
  } else {
    normalized.points = Number.isFinite(points) && points >= 0 ? points : 0;
    normalized.tier = tier;
  }
  if (!normalized.memberLoginMasked && record.memberId) {
    normalized.memberLoginMasked = maskLogin(record.memberId);
  }
  return normalized;
}

function resolveRewardSnapshot(programName, memberId, memberPassword) {
  const tiers = ['Base', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const seed = crypto
    .createHash('sha256')
    .update(`${String(programName || '').trim()}|${String(memberId || '').trim()}|${String(memberPassword || '').trim()}`)
    .digest();

  const points = 1000 + (seed.readUInt32BE(0) % 250000);
  const tier = tiers[seed.readUInt16BE(4) % tiers.length];
  return { points, tier };
}

async function connectPayPalAccount({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail) {
    return { error: 'PayPal email is required.' };
  }
  if (!cleanPassword) {
    return { error: 'PayPal password is required.' };
  }

  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const apiEnabled = Boolean(clientId && clientSecret);

  if (apiEnabled) {
    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      if (!response.ok) {
        const detail = await response.text();
        return { error: `PayPal API connection failed (${response.status}). ${detail.slice(0, 140)}` };
      }
    } catch (error) {
      return { error: `PayPal API connection failed. ${error.message || 'Unknown error.'}` };
    }
  }

  const accountFingerprint = crypto
    .createHash('sha256')
    .update(`${cleanEmail}|${cleanPassword}`)
    .digest('hex')
    .slice(0, 18)
    .toUpperCase();

  const redirectUrl = apiEnabled
    ? `https://www.sandbox.paypal.com/signin?country.x=US&locale.x=en_US`
    : `https://www.paypal.com/signin`;

  return {
    providerId: `PP-${accountFingerprint}`,
    emailMasked: maskLogin(cleanEmail),
    apiMode: apiEnabled ? 'live' : 'mock',
    redirectUrl
  };
}

async function connectApplePayAccount({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail) {
    return { error: 'Apple ID email is required.' };
  }
  if (!cleanPassword) {
    return { error: 'Apple ID password is required.' };
  }

  const merchantId = String(process.env.APPLE_PAY_MERCHANT_ID || '').trim();
  const mode = merchantId ? 'merchant' : 'mock';
  const ref = crypto
    .createHash('sha256')
    .update(`${cleanEmail}|${cleanPassword}|${merchantId || 'mock'}`)
    .digest('hex')
    .slice(0, 14)
    .toUpperCase();

  return {
    reference: `AP-${ref}`,
    emailMasked: maskLogin(cleanEmail),
    mode,
    redirectUrl: 'https://appleid.apple.com/sign-in'
  };
}

function mapProgramToAirlineIata(programName) {
  const key = String(programName || '').trim().toLowerCase();
  const map = {
    'miles & more': 'LH',
    'ana mileage club': 'NH',
    'flying blue': 'AF',
    'executive club': 'BA',
    'iberia plus': 'IB',
    'krisflyer': 'SQ',
    'mileageplus': 'UA',
    'skymiles': 'DL',
    'privilege club': 'QR',
    'jal mileage bank': 'JL'
  };
  return map[key] || '';
}

function buildDuffelLoyaltyAccountsForUser(userId) {
  const rewards = readJson(FILES.rewards).filter(r => r.userId === userId);
  if (!rewards.length) return [];

  const vaultByRewardId = new Map();
  const key = resolveLoyaltyVaultKey();
  for (const entry of readJson(FILES.loyaltyVault)) {
    if (!entry || entry.userId !== userId || !entry.rewardId) continue;
    const login = decryptVaultValue(entry.loginEncrypted, key);
    if (login) {
      vaultByRewardId.set(entry.rewardId, login);
    }
  }

  const dedup = new Set();
  const accounts = [];
  for (const reward of rewards) {
    const airlineCode = mapProgramToAirlineIata(reward.programName);
    if (!airlineCode) continue;
    const accountNumber = String(
      vaultByRewardId.get(reward.id)
      || reward.memberId
      || reward.memberLogin
      || ''
    ).trim();
    if (!accountNumber) continue;
    const fingerprint = `${airlineCode}|${accountNumber}`;
    if (dedup.has(fingerprint)) continue;
    dedup.add(fingerprint);
    accounts.push({
      airline_iata_code: airlineCode,
      account_number: accountNumber
    });
  }
  return accounts;
}

function airportDisplayName(iata) {
  const code = String(iata || '').trim().toUpperCase();
  const map = {
    FRA: 'Frankfurt',
    JFK: 'New York',
    LHR: 'London',
    CDG: 'Paris',
    NCE: 'Nice',
    DXB: 'Dubai',
    BKK: 'Bangkok',
    SFO: 'San Francisco'
  };
  return map[code] || code;
}

function buildTrendingDestinationSnapshot() {
  const history = readJson(FILES.searchHistory);
  const flights = readJson(FILES.flights);
  const today = new Date().toISOString().slice(0, 10);
  const routeCounts = new Map();

  for (const session of history) {
    const updatedAt = String(session.updatedAt || session.createdAt || '');
    if (!updatedAt.startsWith(today)) continue;
    const latestResults = Array.isArray(session.latestResults) ? session.latestResults : [];
    const top = latestResults[0];
    if (!top) continue;
    const from = String(top.from || top.outboundFrom || '').trim().toUpperCase();
    const to = String(top.to || top.outboundTo || '').trim().toUpperCase();
    if (!from || !to) continue;
    const route = `${from}-${to}`;
    routeCounts.set(route, Number(routeCounts.get(route) || 0) + 1);
  }

  let bestRoute = '';
  let bestCount = 0;
  for (const [route, count] of routeCounts.entries()) {
    if (count > bestCount) {
      bestRoute = route;
      bestCount = count;
    }
  }

  if (!bestRoute) {
    const fallback = flights[new Date().getUTCDate() % Math.max(flights.length, 1)] || flights[0];
    if (!fallback) {
      return null;
    }
    bestRoute = `${String(fallback.from || '').toUpperCase()}-${String(fallback.to || '').toUpperCase()}`;
    bestCount = 1;
  }

  const [from, to] = bestRoute.split('-');
  const routeFlight = flights.find(f => String(f.from || '').toUpperCase() === from && String(f.to || '').toUpperCase() === to);

  return {
    date: today,
    from,
    to,
    fromName: airportDisplayName(from),
    toName: airportDisplayName(to),
    searches: bestCount,
    sample: routeFlight
      ? {
        airline: routeFlight.airline,
        flightNumber: routeFlight.flightNumber,
        cabin: routeFlight.cabin,
        cashPrice: routeFlight.cashPrice,
        currency: routeFlight.currency || 'EUR',
        date: routeFlight.date
      }
      : null
  };
}

function sanitizeSearchMessage(entry) {
  const role = String(entry?.role || '').trim().toLowerCase();
  const text = String(entry?.text || '').trim();
  const createdAt = String(entry?.createdAt || '').trim() || new Date().toISOString();
  if (!text) return null;
  if (role !== 'user' && role !== 'assistant') return null;
  return { role, text, createdAt };
}

function sanitizeFlightResult(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = String(entry.id || '').trim();
  const offerId = String(entry.offerId || '').trim();
  const from = String(entry.from || '').trim();
  const to = String(entry.to || '').trim();
  const date = String(entry.date || '').trim();
  if (!id || !from || !to || !date) return null;

  return {
    id,
    offerId,
    source: String(entry.source || '').trim() || 'duffel',
    from,
    to,
    outboundFrom: String(entry.outboundFrom || from).trim() || from,
    outboundTo: String(entry.outboundTo || to).trim() || to,
    outboundAirline: String(entry.outboundAirline || entry.airline || '').trim(),
    outboundFlightNumber: String(entry.outboundFlightNumber || entry.flightNumber || '').trim(),
    date,
    returnDate: String(entry.returnDate || '').trim(),
    roundTrip: Boolean(entry.roundTrip),
    returnFrom: String(entry.returnFrom || '').trim(),
    returnTo: String(entry.returnTo || '').trim(),
    returnAirline: String(entry.returnAirline || '').trim(),
    returnFlightNumber: String(entry.returnFlightNumber || '').trim(),
    airline: String(entry.airline || '').trim(),
    flightNumber: String(entry.flightNumber || '').trim(),
    cabin: String(entry.cabin || '').trim(),
    pointsRequired: Number(entry.pointsRequired || 0),
    cashPrice: Number(entry.cashPrice || 0),
    currency: String(entry.currency || '').trim() || 'EUR',
    depTime: String(entry.depTime || '').trim(),
    arrTime: String(entry.arrTime || '').trim(),
    returnDepTime: String(entry.returnDepTime || '').trim(),
    returnArrTime: String(entry.returnArrTime || '').trim()
  };
}

function listSearchHistoryForUser(userId) {
  const history = readJson(FILES.searchHistory)
    .filter(s => s.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return history.map(session => {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const last = messages[messages.length - 1] || null;
    return {
      id: session.id,
      title: session.title || 'AI Search',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt || session.createdAt,
      messageCount: messages.length,
      lastMessage: last ? last.text : ''
    };
  });
}

function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const prev = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const tmp = prev[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + cost
      );
      diagonal = tmp;
    }
  }
  return prev[right.length];
}

function fuzzyKeywordMatch(token, keyword) {
  const normalizedToken = String(token || '').toLowerCase().replace(/[^a-z]/g, '');
  const normalizedKeyword = String(keyword || '').toLowerCase();
  if (!normalizedToken || !normalizedKeyword) return false;
  if (normalizedToken === normalizedKeyword) return true;
  return levenshteinDistance(normalizedToken, normalizedKeyword) <= 1;
}

function approximateAliasMatch(cleanValue, alias) {
  const normalizedValue = String(cleanValue || '').trim().toLowerCase();
  const normalizedAlias = String(alias || '').trim().toLowerCase();
  if (!normalizedValue || !normalizedAlias) return false;
  if (normalizedValue === normalizedAlias) return true;

  const distance = levenshteinDistance(normalizedValue, normalizedAlias);
  if (normalizedAlias.length >= 8) {
    return distance <= 2;
  }
  if (normalizedAlias.length >= 5) {
    return distance <= 1;
  }
  return false;
}

function normalizeAirportFromText(text) {
  const clean = text.trim().toLowerCase().replace(/[.,!?]/g, '').trim();
  const map = {
    frankfurt: 'FRA',
    'new york': 'JFK',
    'new york city': 'JFK',
    nyc: 'JFK',
    jfk: 'JFK',
    london: 'LHR',
    heathrow: 'LHR',
    lhr: 'LHR',
    paris: 'CDG',
    miami: 'MIA',
    singapore: 'SIN',
    manila: 'MNL',
    nice: 'NCE',
    nce: 'NCE',
    'cote d azur': 'NCE',
    cdg: 'CDG',
    dubai: 'DXB',
    dxb: 'DXB',
    bangkok: 'BKK',
    bkk: 'BKK',
    'san francisco': 'SFO',
    sfo: 'SFO',
    fra: 'FRA'
  };

  if (/^[A-Z]{3}$/.test(text.trim().toUpperCase())) {
    return text.trim().toUpperCase();
  }
  if (map[clean]) {
    return map[clean];
  }

  for (const [key, value] of Object.entries(map)) {
    if (clean.includes(key)) {
      return value;
    }
  }

  let bestMatch = '';
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [key, value] of Object.entries(map)) {
    if (!approximateAliasMatch(clean, key)) {
      continue;
    }
    const score = levenshteinDistance(clean, key);
    if (score < bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  if (bestMatch) {
    return bestMatch;
  }

  return '';
}

function normalizeLocationQuery(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const airportLookupCache = {
  loaded: false,
  byCity: new Map(),
  byName: new Map(),
  byIata: new Map()
};

function loadAirportLookup() {
  if (airportLookupCache.loaded) {
    return airportLookupCache;
  }

  if (!fs.existsSync(FILES.airportsIndex)) {
    airportLookupCache.loaded = true;
    return airportLookupCache;
  }

  const items = readJson(FILES.airportsIndex);
  if (!Array.isArray(items)) {
    airportLookupCache.loaded = true;
    return airportLookupCache;
  }

  for (const entry of items) {
    const iata = String(entry?.iata || '').trim().toUpperCase();
    const city = normalizeLocationQuery(entry?.city || '');
    const name = normalizeLocationQuery(entry?.name || '');
    if (!/^[A-Z0-9]{3}$/.test(iata)) continue;

    airportLookupCache.byIata.set(iata, iata);
    if (city) {
      const list = airportLookupCache.byCity.get(city) || [];
      list.push(iata);
      airportLookupCache.byCity.set(city, list);
    }
    if (name) {
      const list = airportLookupCache.byName.get(name) || [];
      list.push(iata);
      airportLookupCache.byName.set(name, list);
    }
  }

  airportLookupCache.loaded = true;
  return airportLookupCache;
}

function firstUniqueCode(codes) {
  if (!Array.isArray(codes) || !codes.length) return '';
  const unique = [...new Set(codes.filter(code => /^[A-Z0-9]{3}$/.test(String(code || '').toUpperCase())))];
  return unique[0] || '';
}

function findIataFromAirportLookup(value) {
  const query = normalizeLocationQuery(value);
  if (!query) return '';
  const cache = loadAirportLookup();

  if (/^[a-z]{3}$/.test(query)) {
    return query.toUpperCase();
  }

  const exactCity = firstUniqueCode(cache.byCity.get(query));
  if (exactCity) return exactCity;

  const exactName = firstUniqueCode(cache.byName.get(query));
  if (exactName) return exactName;

  let bestCode = '';
  let bestScore = -1;

  for (const [city, codes] of cache.byCity.entries()) {
    if (!city) continue;
    let score = 0;
    if (city.startsWith(query)) {
      score = 90 - Math.abs(city.length - query.length);
    } else if (city.includes(query)) {
      score = 70 - Math.abs(city.length - query.length);
    } else if (query.includes(city) && city.length >= 4) {
      score = 65 - Math.abs(query.length - city.length);
    }
    if (score > bestScore) {
      bestScore = score;
      bestCode = firstUniqueCode(codes);
    }
  }

  if (bestCode) return bestCode;
  return '';
}

function guessIataFromFreeText(value) {
  const clean = normalizeLocationQuery(value);
  if (!clean) return '';
  if (/^[a-z]{3}$/.test(clean)) return clean.toUpperCase();

  const words = clean.split(' ').filter(Boolean);
  const cityCodeAliases = {
    nyc: 'JFK',
    lon: 'LHR',
    par: 'CDG',
    sin: 'SIN',
    mnl: 'MNL',
    rom: 'FCO',
    mil: 'MXP',
    chi: 'ORD',
    mia: 'MIA',
    lax: 'LAX'
  };

  if (words.length === 1 && words[0].length >= 3) {
    const token = words[0].slice(0, 3);
    if (cityCodeAliases[token]) return cityCodeAliases[token];
    return '';
  }

  if (words.length > 1) {
    const initials = words.map(w => w[0]).join('').slice(0, 3);
    if (initials.length === 3) return initials.toUpperCase();
  }
  return '';
}

function pickDuffelIataFromPayload(payloadJson) {
  const items = Array.isArray(payloadJson?.data) ? payloadJson.data : [];
  if (!items.length) return '';

  for (const item of items) {
    const candidates = [
      item?.iata_code,
      item?.iata_city_code,
      item?.airport?.iata_code,
      item?.city?.iata_code,
      item?.city?.iata_city_code
    ];
    for (const code of candidates) {
      const normalized = String(code || '').trim().toUpperCase();
      if (/^[A-Z]{3}$/.test(normalized)) {
        return normalized;
      }
    }
  }
  return '';
}

async function resolveLocationToIata(value) {
  const direct = normalizeAirportFromText(String(value || ''));
  if (direct) return direct;

  const query = normalizeLocationQuery(value);
  if (!query) return '';

  const fromIndex = findIataFromAirportLookup(query);
  if (fromIndex) return fromIndex;

  if (DUFFEL_ACCESS_TOKEN) {
    const endpointCandidates = [
      `${DUFFEL_BASE_URL}/air/airports?name=${encodeURIComponent(query)}&limit=1`,
      `${DUFFEL_BASE_URL}/air/cities?name=${encodeURIComponent(query)}&limit=1`,
      `${DUFFEL_BASE_URL}/air/airports?suggestions=${encodeURIComponent(query)}`
    ];

    for (const endpoint of endpointCandidates) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${DUFFEL_ACCESS_TOKEN}`,
            'Duffel-Version': DUFFEL_VERSION,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) continue;
        const payloadJson = await response.json();
        const resolved = pickDuffelIataFromPayload(payloadJson);
        if (resolved) return resolved;
      } catch {
        // Fall through to next strategy.
      }
    }
  }

  return guessIataFromFreeText(query);
}

function resolveTravelDate(monthNumber, dayNumber) {
  const now = new Date();
  const year = now.getFullYear();
  const candidate = new Date(Date.UTC(year, monthNumber - 1, dayNumber));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (candidate < today) {
    candidate.setUTCFullYear(year + 1);
  }
  return candidate.toISOString().slice(0, 10);
}

function parseMonthDayToIso(dayStr, monthStr) {
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
  };
  const month = months[String(monthStr || '').toLowerCase()];
  const day = Number(dayStr);
  if (!month || !day || day < 1 || day > 31) {
    return '';
  }
  return resolveTravelDate(month, day);
}

function extractCabinFromText(text) {
  const parseText = String(text || '').toLowerCase();
  const tokens = parseText.split(/\s+/).filter(Boolean);

  const hasWord = keyword => tokens.some(token => fuzzyKeywordMatch(token, keyword));
  if (parseText.includes('premium economy') || parseText.includes('premium eco') || parseText.includes('premium_economy')) {
    return 'premium_economy';
  }
  if (parseText.includes('business class') || parseText.includes('business')) {
    return 'business';
  }
  if (parseText.includes('first class') || hasWord('first')) {
    return 'first';
  }
  if (hasWord('business') || hasWord('buisness') || hasWord('bussiness')) {
    return 'business';
  }
  if (hasWord('economy') || hasWord('eco')) {
    return 'economy';
  }
  return '';
}

function extractAiSearchParams(message) {
  const raw = String(message || '').trim();
  const lower = raw
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parseText = lower
    // Common connector typos in travel prompts.
    .replace(/\bfrm\b/g, 'from')
    .replace(/\bfrmo\b/g, 'from')
    .replace(/\bfom\b/g, 'from')
    .replace(/\btto\b/g, 'to')
    .replace(/\btoo\b/g, 'to');
  const cabin = extractCabinFromText(parseText);

  let fromText = '';
  let toText = '';

  const fromPos = parseText.indexOf(' from ');
  const toPos = parseText.lastIndexOf(' to ');

  if (fromPos !== -1 && toPos !== -1) {
    if (fromPos < toPos) {
      const fromSegment = parseText.slice(fromPos + 6, toPos).trim();
      const tail = parseText.slice(toPos + 4);
      const toSegment = tail.split(' on ')[0].trim();
      fromText = fromSegment;
      toText = toSegment;
    } else {
      const toSegment = parseText.slice(toPos + 4, fromPos).trim();
      const tail = parseText.slice(fromPos + 6);
      const fromSegment = tail.split(' on ')[0].trim();
      toText = toSegment;
      fromText = fromSegment;
    }
  }

  if (!fromText || !toText) {
    const routeMatch = parseText.match(/\b([a-z]{3})\s*(?:-|to)\s*([a-z]{3})\b/);
    if (routeMatch) {
      fromText = routeMatch[1];
      toText = routeMatch[2];
    }
  }

  if (!fromText || !toText) {
    const tokens = parseText.split(/\s+/).filter(Boolean);
    const fromLikeIdx = tokens.findIndex(token => fuzzyKeywordMatch(token, 'from'));
    let toLikeIdx = tokens.findIndex((token, idx) => idx > fromLikeIdx && fuzzyKeywordMatch(token, 'to'));
    const stopTerms = new Set([
      'on', 'for', 'at', 'in', 'by', 'tomorrow', 'today', 'return', 'back', 'round', 'trip', 'with', 'and', 'cabin', 'class'
    ]);

    // Recover "from frankfurtto nice" style typos where "to" is attached.
    if (fromLikeIdx !== -1 && toLikeIdx === -1) {
      for (let i = fromLikeIdx + 1; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (token.length > 4 && token.endsWith('to')) {
          const left = token.slice(0, -2);
          if (left.length >= 3) {
            tokens[i] = left;
            tokens.splice(i + 1, 0, 'to');
            toLikeIdx = i + 1;
            break;
          }
        }
      }
    }

    if (fromLikeIdx !== -1 && toLikeIdx !== -1 && toLikeIdx > fromLikeIdx + 1) {
      const rawFrom = tokens.slice(fromLikeIdx + 1, toLikeIdx).join(' ').trim();
      const rawToTokens = [];
      for (const token of tokens.slice(toLikeIdx + 1)) {
        if (stopTerms.has(token)) break;
        rawToTokens.push(token);
      }
      const rawTo = rawToTokens.join(' ').trim();
      if (rawFrom && rawTo) {
        fromText = rawFrom;
        toText = rawTo;
      }
    } else {
      const toOnlyIdx = tokens.findIndex(token => fuzzyKeywordMatch(token, 'to'));
      if (toOnlyIdx > 0 && toOnlyIdx < tokens.length - 1) {
        const rawFromTokens = [];
        for (const token of tokens.slice(0, toOnlyIdx)) {
          if (stopTerms.has(token)) {
            rawFromTokens.length = 0;
            continue;
          }
          rawFromTokens.push(token);
        }
        const rawToTokens = [];
        for (const token of tokens.slice(toOnlyIdx + 1)) {
          if (stopTerms.has(token)) break;
          rawToTokens.push(token);
        }
        const rawFrom = rawFromTokens.join(' ').trim();
        const rawTo = rawToTokens.join(' ').trim();
        if (rawFrom && rawTo) {
          fromText = rawFrom;
          toText = rawTo;
        }
      }
    }
  }

  const isoDates = [...parseText.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map(m => m[1]);
  const slashDates = [...parseText.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)];
  const monthDayMatches = [...parseText.matchAll(/(?:on|back on|return on|returning on|coming back on)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)/g)];
  let date = '';
  let returnDate = '';

  if (isoDates.length > 0) {
    date = isoDates[0];
    if (isoDates.length > 1) {
      returnDate = isoDates[1];
    }
  } else if (slashDates.length > 0) {
    const dd = String(slashDates[0][1]).padStart(2, '0');
    const mm = String(slashDates[0][2]).padStart(2, '0');
    const yyyy = slashDates[0][3];
    date = `${yyyy}-${mm}-${dd}`;
    if (slashDates.length > 1) {
      const rdd = String(slashDates[1][1]).padStart(2, '0');
      const rmm = String(slashDates[1][2]).padStart(2, '0');
      const ryyyy = slashDates[1][3];
      returnDate = `${ryyyy}-${rmm}-${rdd}`;
    }
  }

  if (!date && monthDayMatches.length > 0) {
    date = parseMonthDayToIso(monthDayMatches[0][1], monthDayMatches[0][2]);
  }
  if (!returnDate && monthDayMatches.length > 1) {
    returnDate = parseMonthDayToIso(monthDayMatches[1][1], monthDayMatches[1][2]);
  }

  if (!returnDate) {
    const returnSpecific = parseText.match(/(?:back|return|returning|coming back)\s+(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)/);
    if (returnSpecific) {
      returnDate = parseMonthDayToIso(returnSpecific[1], returnSpecific[2]);
    }
  }

  if (!date && parseText.includes('tomorrow')) {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    date = now.toISOString().slice(0, 10);
  }

  if (!date && parseText.includes('today')) {
    date = new Date().toISOString().slice(0, 10);
  }

  if (!returnDate && /(?:round trip|return|back)/.test(parseText) && date) {
    const outbound = new Date(`${date}T00:00:00Z`);
    outbound.setUTCDate(outbound.getUTCDate() + 7);
    returnDate = outbound.toISOString().slice(0, 10);
  }

  return {
    from: normalizeAirportFromText(fromText),
    to: normalizeAirportFromText(toText),
    fromText: String(fromText || '').trim(),
    toText: String(toText || '').trim(),
    date,
    returnDate,
    cabin,
    raw
  };
}

function searchFlightsFromSeed(payload) {
  const from = (payload.from || '').trim().toUpperCase();
  const to = (payload.to || '').trim().toUpperCase();
  const date = (payload.date || '').trim();
  const returnDate = (payload.returnDate || '').trim();
  const cabin = (payload.cabin || '').trim().toLowerCase();

  if (!from || !to) {
    return { error: 'From and To airport codes are required' };
  }

  const allFlights = readJson(FILES.flights);

  if (returnDate) {
    const outbound = allFlights
      .filter(f => f.from === from && f.to === to)
      .filter(f => (date ? f.date === date : true))
      .filter(f => (cabin ? f.cabin.toLowerCase() === cabin : true));

    const inbound = allFlights
      .filter(f => f.from === to && f.to === from)
      .filter(f => f.date === returnDate)
      .filter(f => (cabin ? f.cabin.toLowerCase() === cabin : true));

    const combos = [];
    for (const out of outbound.slice(0, 4)) {
      for (const back of inbound.slice(0, 4)) {
        combos.push({
          id: `rt_${out.id}_${back.id}`,
          source: 'seed',
          roundTrip: true,
          from: out.from,
          to: out.to,
          outboundFrom: out.from,
          outboundTo: out.to,
          date: out.date,
          returnDate: back.date,
          airline: `${out.airline} / ${back.airline}`,
          flightNumber: `${out.flightNumber} + ${back.flightNumber}`,
          outboundAirline: out.airline,
          outboundFlightNumber: out.flightNumber,
          returnFrom: back.from,
          returnTo: back.to,
          returnAirline: back.airline,
          returnFlightNumber: back.flightNumber,
          returnDuration: back.duration || '',
          returnStops: back.stops || '',
          cabin: out.cabin,
          pointsRequired: Number(out.pointsRequired || 0) + Number(back.pointsRequired || 0),
          cashPrice: Number(out.cashPrice || 0) + Number(back.cashPrice || 0),
          currency: out.currency || 'EUR',
          depTime: out.depTime,
          arrTime: out.arrTime,
          returnDepTime: back.depTime,
          returnArrTime: back.arrTime,
          duration: `${out.duration || ''} + ${back.duration || ''}`.trim(),
          stops: out.stops === 'Non stop' && back.stops === 'Non stop' ? 'Non stop both ways' : 'Mixed'
        });
      }
    }

    const sortedCombos = combos
      .map(c => ({ ...c, valueIndex: Number((c.cashPrice / Math.max(c.pointsRequired || 1, 1)).toFixed(4)) }))
      .sort((a, b) => b.valueIndex - a.valueIndex || a.cashPrice - b.cashPrice)
      .slice(0, 6);

    if (!sortedCombos.length) {
      return {
        reply: `I could not find round-trip seeded flights for ${from} to ${to}, outbound ${date} and return ${returnDate}.`,
        results: []
      };
    }

    return {
      reply: `I found ${sortedCombos.length} round-trip option(s) for ${from} to ${to}.`,
      results: sortedCombos
    };
  }

  let flights = allFlights
    .filter(f => f.from === from && f.to === to)
    .filter(f => (date ? f.date === date : true))
    .filter(f => (cabin ? f.cabin.toLowerCase() === cabin : true))
    .map(f => {
      const valueIndex = Number((f.cashPrice / Math.max(f.pointsRequired, 1)).toFixed(4));
      return { ...f, valueIndex, source: 'seed' };
    })
    .sort((a, b) => b.valueIndex - a.valueIndex || a.pointsRequired - b.pointsRequired)
    .slice(0, 6);

  let warning = '';
  if (!flights.length && date) {
    flights = allFlights
      .filter(f => f.from === from && f.to === to)
      .filter(f => (cabin ? f.cabin.toLowerCase() === cabin : true))
      .map(f => {
        const valueIndex = Number((f.cashPrice / Math.max(f.pointsRequired, 1)).toFixed(4));
        return { ...f, valueIndex, source: 'seed' };
      })
      .sort((a, b) => b.valueIndex - a.valueIndex || a.pointsRequired - b.pointsRequired)
      .slice(0, 6);

    if (flights.length) {
      warning = `No seeded flights on ${date}. Showing nearest available dates instead.`;
    }
  }

  let reply;
  if (flights.length === 0) {
    reply = `I could not find reward flights for ${from} to ${to}${date ? ` on ${date}` : ''}. Try changing date or cabin.`;
  } else {
    const top = flights[0];
    reply = `I found ${flights.length} option(s). Best value right now is ${top.airline} ${top.flightNumber} for ${top.pointsRequired.toLocaleString()} points.`;
  }

  return { reply, results: flights, ...(warning ? { warning } : {}) };
}

function mapCabinToDuffel(cabin) {
  const normalized = String(cabin || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'economy') return 'economy';
  if (normalized === 'premium' || normalized === 'premium economy' || normalized === 'premium_economy') return 'premium_economy';
  if (normalized === 'business') return 'business';
  if (normalized === 'first') return 'first';
  return '';
}

function normalizePreferences(preferences) {
  if (!Array.isArray(preferences)) return [];
  const deduped = new Set();
  for (const pref of preferences) {
    const value = String(pref || '').trim();
    if (value) deduped.add(value);
  }
  return [...deduped];
}

function mapPreferredCabinFromPreferences(preferences) {
  const normalized = normalizePreferences(preferences).map(v => v.toLowerCase());
  if (normalized.includes('first')) return 'first';
  if (normalized.includes('business')) return 'business';
  if (normalized.includes('premium eco') || normalized.includes('premium economy')) return 'premium_economy';
  if (normalized.includes('eco') || normalized.includes('economy')) return 'economy';
  return '';
}

function formatTimeFromIso(iso) {
  if (!iso || !iso.includes('T')) return '';
  return iso.split('T')[1].slice(0, 5);
}

function formatIsoDuration(duration) {
  if (!duration || typeof duration !== 'string') return '';
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return duration;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return '';
}

function extractCarrierDetails(segment, fallbackName = 'Airline') {
  if (!segment || typeof segment !== 'object') {
    return { name: fallbackName, code: '', flightNumber: 'Flight' };
  }

  const operatingName = segment.operating_carrier?.name || '';
  const marketingName = segment.marketing_carrier?.name || '';
  const ownerName = fallbackName;
  const name = operatingName || marketingName || ownerName;

  const code = segment.operating_carrier?.iata_code || segment.marketing_carrier?.iata_code || '';
  const number = segment.operating_carrier_flight_number || segment.marketing_carrier_flight_number || '';
  const flightNumber = `${code}${number}`.trim() || 'Flight';

  return { name, code, flightNumber };
}

function normalizeDuffelOffer(offer, fallback) {
  const slices = offer.slices || [];
  const firstSlice = slices[0] || {};
  const returnSlice = slices[1] || null;
  const segments = firstSlice.segments || [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;
  const returnSegments = returnSlice?.segments || [];
  const returnFirstSegment = returnSegments[0] || {};
  const returnLastSegment = returnSegments[returnSegments.length - 1] || returnFirstSegment;
  const from = firstSlice.origin?.iata_code || fallback.from;
  const to = firstSlice.destination?.iata_code || fallback.to;
  const returnFrom = returnSlice?.origin?.iata_code || fallback.to || '';
  const returnTo = returnSlice?.destination?.iata_code || fallback.from || '';
  const departure = firstSegment.departing_at || '';
  const arrival = lastSegment.arriving_at || '';
  const outboundCarrier = extractCarrierDetails(firstSegment, offer.owner?.name || 'Airline');
  const returnCarrier = extractCarrierDetails(returnFirstSegment, offer.owner?.name || 'Airline');
  const airlineName = outboundCarrier.name;
  const flightNumber = outboundCarrier.flightNumber;
  const returnAirline = returnCarrier.name;
  const returnFlightNumber = returnCarrier.flightNumber;
  const totalAmount = Number(offer.total_amount || 0);

  return {
    id: `duffel_${offer.id}`,
    offerId: offer.id,
    offerPassengerIds: Array.isArray(offer.passengers) ? offer.passengers.map(p => p.id).filter(Boolean) : [],
    source: 'duffel',
    from,
    to,
    outboundFrom: from,
    outboundTo: to,
    outboundAirline: airlineName,
    outboundFlightNumber: flightNumber,
    date: departure ? departure.slice(0, 10) : fallback.date,
    returnDate: returnFirstSegment.departing_at ? returnFirstSegment.departing_at.slice(0, 10) : (fallback.returnDate || ''),
    roundTrip: slices.length > 1,
    returnFrom,
    returnTo,
    returnAirline,
    returnFlightNumber,
    airline: airlineName,
    flightNumber,
    cabin: firstSegment.cabin_class_marketing_name || fallback.cabin || '',
    pointsRequired: 0,
    cashPrice: Number.isFinite(totalAmount) ? totalAmount : 0,
    currency: offer.total_currency || 'USD',
    depTime: formatTimeFromIso(departure),
    arrTime: formatTimeFromIso(arrival),
    returnDepTime: formatTimeFromIso(returnFirstSegment.departing_at || ''),
    returnArrTime: formatTimeFromIso(returnLastSegment.arriving_at || ''),
    duration: formatIsoDuration(firstSlice.duration),
    stops: segments.length > 1 ? `${segments.length - 1} stop` : 'Non stop',
    returnDuration: formatIsoDuration(returnSlice?.duration || ''),
    returnStops: returnSegments.length > 1 ? `${returnSegments.length - 1} stop` : (returnSegments.length ? 'Non stop' : '')
  };
}

async function searchFlightsWithDuffel(payload) {
  const from = (payload.from || '').trim().toUpperCase();
  const to = (payload.to || '').trim().toUpperCase();
  const date = (payload.date || '').trim();
  const returnDate = (payload.returnDate || '').trim();
  const preferences = normalizePreferences(payload.preferences);
  const cabin = mapCabinToDuffel(payload.cabin) || mapPreferredCabinFromPreferences(preferences);
  const loyaltyAccounts = Array.isArray(payload.loyaltyAccounts)
    ? payload.loyaltyAccounts
      .map(a => ({
        airline_iata_code: String(a?.airline_iata_code || '').trim().toUpperCase(),
        account_number: String(a?.account_number || '').trim()
      }))
      .filter(a => /^[A-Z0-9]{2}$/.test(a.airline_iata_code) && Boolean(a.account_number))
    : [];

  if (!from || !to || !date) {
    return { error: 'Duffel search requires from, to and date.' };
  }

  if (!DUFFEL_ACCESS_TOKEN) {
    return { error: 'Duffel token is missing.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const slices = [
      {
        origin: from,
        destination: to,
        departure_date: date
      }
    ];
    if (returnDate) {
      slices.push({
        origin: to,
        destination: from,
        departure_date: returnDate
      });
    }

    const response = await fetch(`${DUFFEL_BASE_URL}/air/offer_requests?return_offers=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DUFFEL_ACCESS_TOKEN}`,
        'Duffel-Version': DUFFEL_VERSION,
        'Content-Type': 'application/json',
        ...(preferences.length ? { 'X-MiTravel-Preferences': preferences.join(', ') } : {})
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: [
            {
              type: 'adult',
              ...(loyaltyAccounts.length ? { loyalty_programme_accounts: loyaltyAccounts } : {})
            }
          ],
          ...(cabin ? { cabin_class: cabin } : {})
        }
      }),
      signal: controller.signal
    });

    const payloadJson = await response.json();
    if (!response.ok) {
      const detail = payloadJson.errors?.[0]?.message || payloadJson.error || 'Duffel request failed';
      return { error: detail };
    }

    const offers = Array.isArray(payloadJson.data?.offers) ? payloadJson.data.offers : [];
    const results = offers
      .slice(0, 8)
      .map(offer => normalizeDuffelOffer(offer, { from, to, date, cabin }))
      .map(applyDuffelFeeToFlight);

    const reply = results.length
      ? `I found ${results.length} ${returnDate ? 'round-trip ' : ''}option(s) from Duffel.`
      : `No Duffel offers found for ${from} to ${to} on ${date}${returnDate ? ` with return ${returnDate}` : ''}.`;

    return {
      reply,
      results,
      source: 'duffel'
    };
  } catch (error) {
    return { error: error.name === 'AbortError' ? 'Duffel request timed out.' : error.message || 'Duffel request failed.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchFlights(payload, mode = 'flight_api') {
  if (mode === 'flight_api' || mode === 'duffel_api') {
    const duffel = await searchFlightsWithDuffel(payload);
    if (!duffel.error) {
      return duffel;
    }

    const fallback = searchFlightsFromSeed(payload);
    const warning = fallback.warning
      ? `Duffel unavailable: ${duffel.error}. ${fallback.warning}`
      : `Duffel unavailable: ${duffel.error}. Showing seeded fallback data.`;
    return {
      ...fallback,
      warning
    };
  }

  return searchFlightsFromSeed(payload);
}

function normalizeTitle(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['mr', 'mrs', 'ms', 'miss', 'mx'].includes(v)) return v === 'miss' ? 'ms' : v;
  return '';
}

function normalizeGender(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'm' || v === 'male') return 'm';
  if (v === 'f' || v === 'female') return 'f';
  return '';
}

async function createDuffelOrderForOffer(user, flight) {
  if (!DUFFEL_ACCESS_TOKEN) {
    return { error: 'Duffel token is missing.' };
  }

  const offerId = String(flight.offerId || '').trim();
  const passengerId = Array.isArray(flight.offerPassengerIds) ? String(flight.offerPassengerIds[0] || '').trim() : '';
  if (!offerId || !passengerId) {
    return { error: 'Missing Duffel offer context. Please search again before booking.' };
  }

  const givenName = String(user.firstName || '').trim();
  const familyName = String(user.lastName || '').trim();
  const title = normalizeTitle(user.title);
  const gender = normalizeGender(user.gender);
  const bornOn = String(user.bornOn || '').trim();
  const email = String(user.email || '').trim();
  const phoneNumber = String(user.phone || '').trim();

  const missing = [];
  if (!givenName) missing.push('first name');
  if (!familyName) missing.push('family name');
  if (!title) missing.push('title (Mr/Ms/Mrs/Mx)');
  if (!gender) missing.push('gender (M/F)');
  if (!bornOn) missing.push('date of birth');
  if (!email) missing.push('email');
  if (!phoneNumber) missing.push('phone number');

  if (missing.length) {
    return { error: `Complete traveler profile before booking: ${missing.join(', ')}.` };
  }

  const currency = String(flight.currency || 'GBP');
  const amount = Number(flight.cashPrice || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Invalid offer amount for Duffel order.' };
  }

  const response = await fetch(`${DUFFEL_BASE_URL}/air/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DUFFEL_ACCESS_TOKEN}`,
      'Duffel-Version': DUFFEL_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        type: 'instant',
        selected_offers: [offerId],
        payments: [{ type: 'balance', currency, amount: amount.toFixed(2) }],
        passengers: [
          {
            id: passengerId,
            title,
            given_name: givenName,
            family_name: familyName,
            born_on: bornOn,
            gender,
            email,
            phone_number: phoneNumber
          }
        ]
      }
    })
  });

  const json = await response.json();
  if (!response.ok) {
    const detail = json.errors?.[0]?.message || json.error || 'Duffel order creation failed.';
    return { error: detail };
  }

  const order = json.data;
  const orderId = order.id;
  if (!orderId) {
    return { error: 'Duffel order created without an order id.' };
  }

  // Verify order exists in Duffel before persisting locally.
  const verify = await fetch(`${DUFFEL_BASE_URL}/air/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DUFFEL_ACCESS_TOKEN}`,
      'Duffel-Version': DUFFEL_VERSION,
      'Content-Type': 'application/json'
    }
  });
  const verifyJson = await verify.json();
  if (!verify.ok || !verifyJson?.data?.id) {
    const detail = verifyJson?.errors?.[0]?.message || verifyJson?.error || 'Duffel order verification failed.';
    return { error: detail };
  }

  const verifiedOrder = verifyJson.data;
  return {
    orderId: verifiedOrder.id,
    bookingReference: verifiedOrder.booking_reference || verifiedOrder.booking_references?.[0]?.booking_reference || '',
    paymentStatus: verifiedOrder.payment_status?.awaiting_payment ? 'PENDING_PAYMENT' : 'CONFIRMED',
    tickets: Array.isArray(verifiedOrder.documents) ? verifiedOrder.documents.map(d => d.unique_identifier).filter(Boolean) : [],
    liveMode: Boolean(verifiedOrder.live_mode)
  };
}

function decideSearchProvider(message) {
  const text = String(message || '').toLowerCase();
  const wantsOta = text.includes('ota') || text.includes('cheapest') || text.includes('best fare');
  if (wantsOta) {
    return {
      provider: 'ota_crawler',
      note: 'Agent selected OTA strategy. In MVP mode this uses internal sample data with OTA-style ranking.'
    };
  }
  return {
    provider: 'duffel_api',
    note: 'Agent selected Duffel flight API strategy.'
  };
}

function serveStatic(req, res, pathname) {
  const filePath = pathname === '/' || pathname === '/admin'
    ? path.join(PUBLIC_DIR, 'index.html')
    : path.join(PUBLIC_DIR, pathname);

  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    if (!path.extname(pathname)) {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = path.extname(normalized);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(normalized).pipe(res);
}

async function handleApi(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    const body = await parseBody(req);
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name || !email || password.length < 8) {
      sendJson(res, 400, { error: 'Name, email and password (8+ chars) are required' });
      return;
    }

    const users = readJson(FILES.users);
    if (users.some(u => u.email === email)) {
      sendJson(res, 409, { error: 'Email already registered' });
      return;
    }

    const [firstName = '', ...rest] = name.split(' ');
    const lastName = rest.join(' ');
    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordSalt: salt,
      passwordHash: hash,
      role: 'user',
      firstName,
      middleName: '',
      lastName,
      homeAirport: '',
      address: '',
      passportNumber: '',
      passportExpiry: '',
      passportCountry: '',
      title: '',
      gender: '',
      bornOn: '',
      phone: '',
      language: 'English',
      twoFactorEnabled: false,
      preferences: [],
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeJson(FILES.users, users);

    const token = createSession(user.id);
    setSessionCookie(res, token);
    sendJson(res, 201, { user: publicUser(user) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const users = readJson(FILES.users);
    const user = users.find(u => u.email === email);

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      sendJson(res, 401, { error: 'Invalid email or password' });
      return;
    }

    const token = createSession(user.id);
    setSessionCookie(res, token);
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    if (token) {
      const sessions = readJson(FILES.sessions).filter(s => s.token !== token);
      writeJson(FILES.sessions, sessions);
    }
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/me') {
    const user = requireAuth(req, res);
    if (!user) return;
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === 'PUT' && pathname === '/api/me') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const users = readJson(FILES.users);
    const idx = users.findIndex(u => u.id === user.id);

    if (idx === -1) {
      sendJson(res, 404, { error: 'User not found' });
      return;
    }

    const next = normalizeUser(users[idx]);

    const editableStringFields = [
      'name',
      'homeAirport',
      'firstName',
      'middleName',
      'lastName',
      'address',
      'passportNumber',
      'passportExpiry',
      'passportCountry',
      'title',
      'gender',
      'bornOn',
      'phone',
      'language'
    ];

    for (const key of editableStringFields) {
      if (body[key] !== undefined) {
        next[key] = String(body[key]).trim();
      }
    }

    if (body.homeAirport !== undefined) {
      next.homeAirport = String(body.homeAirport).trim().toUpperCase();
    }

    if (body.twoFactorEnabled !== undefined) {
      next.twoFactorEnabled = Boolean(body.twoFactorEnabled);
    }

    if (body.preferences !== undefined && Array.isArray(body.preferences)) {
      next.preferences = body.preferences.map(v => String(v).trim()).filter(Boolean);
    }

    if (next.firstName || next.lastName) {
      const fullName = `${next.firstName} ${next.middleName} ${next.lastName}`.replace(/\s+/g, ' ').trim();
      if (fullName) {
        next.name = fullName;
      }
    }

    users[idx] = { ...users[idx], ...next };
    writeJson(FILES.users, users);

    sendJson(res, 200, { user: publicUser(users[idx]) });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/rewards') {
    const user = requireAuth(req, res);
    if (!user) return;

    const allRewards = readJson(FILES.rewards);
    let changed = false;
    for (let i = 0; i < allRewards.length; i += 1) {
      const current = allRewards[i];
      if (current.userId !== user.id) continue;
      const normalized = normalizeRewardRecord(current);
      if (JSON.stringify(normalized) !== JSON.stringify(current)) {
        allRewards[i] = normalized;
        changed = true;
      }
    }
    if (changed) {
      writeJson(FILES.rewards, allRewards);
    }
    const rewards = allRewards.filter(r => r.userId === user.id).map(serializeReward);
    sendJson(res, 200, { rewards });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/rewards') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const programName = (body.programName || '').trim();
    const memberLogin = (body.memberLogin || body.memberId || '').trim();
    const memberPassword = String(body.memberPassword || '').trim();

    if (!programName || !memberLogin || !memberPassword) {
      sendJson(res, 400, { error: 'Program, membership login and membership password are required' });
      return;
    }

    const id = crypto.randomUUID();
    const { points, tier } = programName === 'Miles & More'
      ? fetchMilesAndMoreSnapshotFake({ userId: user.id, rewardId: id, memberLogin, memberPassword })
      : (programName === 'ANA Mileage Club'
        ? fetchAnaMileageClubSnapshotFake({ userId: user.id, rewardId: id, memberLogin, memberPassword })
        : resolveRewardSnapshot(programName, memberLogin, memberPassword));

    const rewards = readJson(FILES.rewards);
    const record = {
      id,
      userId: user.id,
      programName,
      points,
      tier,
      memberLoginMasked: maskLogin(memberLogin),
      createdAt: new Date().toISOString()
    };

    rewards.push(record);
    writeJson(FILES.rewards, rewards);
    sendJson(res, 201, { reward: serializeReward(record) });
    return;
  }

  if (pathname.startsWith('/api/rewards/') && req.method === 'PUT') {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/').pop();
    const body = await parseBody(req);

    const rewards = readJson(FILES.rewards);
    const idx = rewards.findIndex(r => r.id === id && r.userId === user.id);

    if (idx === -1) {
      sendJson(res, 404, { error: 'Reward program not found' });
      return;
    }

    if (body.programName !== undefined) rewards[idx].programName = String(body.programName).trim();
    if (body.points !== undefined) rewards[idx].points = Math.max(0, Number(body.points) || 0);
    if (body.tier !== undefined) rewards[idx].tier = String(body.tier).trim();
    if (body.memberLogin !== undefined) rewards[idx].memberLoginMasked = maskLogin(String(body.memberLogin).trim());
    if (body.memberId !== undefined) rewards[idx].memberLoginMasked = maskLogin(String(body.memberId).trim());

    writeJson(FILES.rewards, rewards);
    sendJson(res, 200, { reward: serializeReward(rewards[idx]) });
    return;
  }

  if (pathname.startsWith('/api/rewards/') && req.method === 'DELETE') {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/').pop();
    const rewards = readJson(FILES.rewards);
    const idx = rewards.findIndex(r => r.id === id && r.userId === user.id);

    if (idx === -1) {
      sendJson(res, 404, { error: 'Reward program not found' });
      return;
    }

    const rewardId = rewards[idx].id;
    rewards.splice(idx, 1);
    writeJson(FILES.rewards, rewards);
    const vault = readJson(FILES.loyaltyVault).filter(v => v.rewardId !== rewardId);
    writeJson(FILES.loyaltyVault, vault);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/payments') {
    const user = requireAuth(req, res);
    if (!user) return;

    const payments = readJson(FILES.payments)
      .filter(p => p.userId === user.id)
      .map(serializePayment);

    sendJson(res, 200, { payments });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/payments') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const method = String(body.method || 'card').trim().toLowerCase();
    if (!['card', 'paypal', 'apple_pay'].includes(method)) {
      sendJson(res, 400, { error: 'Unsupported payment method' });
      return;
    }

    const payments = readJson(FILES.payments);
    const hasPrimary = payments.some(p => p.userId === user.id && p.primary);
    let record = null;

    if (method === 'card') {
      const cardNumber = String(body.cardNumber || '').replace(/\s+/g, '');
      const cardholderName = String(body.cardholderName || '').trim();
      const cvv = String(body.cvv || '').trim();
      const exp = String(body.exp || '').trim();
      const country = String(body.country || '').trim();
      const address = String(body.address || '').trim();
      const zip = String(body.zip || '').trim();

      if (cardNumber.length < 12 || !cardholderName || !cvv || !exp || !country) {
        sendJson(res, 400, { error: 'Card number, cardholder name, CVV, EXP and country are required' });
        return;
      }

      record = {
        id: crypto.randomUUID(),
        userId: user.id,
        method: 'card',
        brand: cardBrandFromNumber(cardNumber),
        cardholderName,
        last4: cardNumber.slice(-4),
        exp,
        country,
        address,
        zip,
        primary: !hasPrimary,
        createdAt: new Date().toISOString()
      };
    } else if (method === 'paypal') {
      const connected = await connectPayPalAccount({
        email: body.paypalEmail,
        password: body.paypalPassword
      });
      if (connected.error) {
        sendJson(res, 400, { error: connected.error });
        return;
      }
      record = {
        id: crypto.randomUUID(),
        userId: user.id,
        method: 'paypal',
        brand: 'PayPal',
        cardholderName: '',
        last4: '',
        exp: '',
        country: '',
        address: '',
        zip: '',
        paypalEmailMasked: connected.emailMasked,
        paypalPayerId: connected.providerId,
        paypalApiMode: connected.apiMode,
        primary: !hasPrimary,
        createdAt: new Date().toISOString()
      };
      record.providerRedirectUrl = connected.redirectUrl;
    } else {
      const linked = await connectApplePayAccount({
        email: body.applePayEmail,
        password: body.applePayPassword
      });
      if (linked.error) {
        sendJson(res, 400, { error: linked.error });
        return;
      }
      record = {
        id: crypto.randomUUID(),
        userId: user.id,
        method: 'apple_pay',
        brand: 'Apple Pay',
        cardholderName: '',
        last4: '',
        exp: '',
        country: '',
        address: '',
        zip: '',
        applePayReference: linked.reference,
        applePayEmailMasked: linked.emailMasked,
        applePayMode: linked.mode,
        primary: !hasPrimary,
        createdAt: new Date().toISOString()
      };
      record.providerRedirectUrl = linked.redirectUrl;
    }

    payments.push(record);
    writeJson(FILES.payments, payments);
    sendJson(res, 201, {
      payment: serializePayment(record),
      ...(record.providerRedirectUrl ? { redirectUrl: record.providerRedirectUrl } : {})
    });
    return;
  }

  if (pathname.startsWith('/api/payments/') && pathname.endsWith('/primary') && req.method === 'PUT') {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/')[3];
    const payments = readJson(FILES.payments);
    let found = false;

    for (const payment of payments) {
      if (payment.userId !== user.id) continue;
      if (payment.id === id) {
        payment.primary = true;
        found = true;
      } else {
        payment.primary = false;
      }
    }

    if (!found) {
      sendJson(res, 404, { error: 'Payment method not found' });
      return;
    }

    writeJson(FILES.payments, payments);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname.startsWith('/api/payments/') && req.method === 'DELETE') {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/').pop();
    const payments = readJson(FILES.payments);
    const idx = payments.findIndex(p => p.id === id && p.userId === user.id);

    if (idx === -1) {
      sendJson(res, 404, { error: 'Payment method not found' });
      return;
    }

    const wasPrimary = payments[idx].primary;
    payments.splice(idx, 1);

    if (wasPrimary) {
      const nextPrimary = payments.find(p => p.userId === user.id);
      if (nextPrimary) nextPrimary.primary = true;
    }

    writeJson(FILES.payments, payments);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/search-history') {
    const user = requireAuth(req, res);
    if (!user) return;

    const sessions = listSearchHistoryForUser(user.id);
    sendJson(res, 200, { sessions });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/discover/trending') {
    const user = requireAuth(req, res);
    if (!user) return;

    const trending = buildTrendingDestinationSnapshot();
    sendJson(res, 200, { trending });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/admin/stats') {
    const user = requireAdmin(req, res);
    if (!user) return;

    sendJson(res, 200, { stats: buildAdminStats() });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/admin/pricing-config') {
    const user = requireAdmin(req, res);
    if (!user) return;

    sendJson(res, 200, { pricing: getAdminConfig() });
    return;
  }

  if (req.method === 'PUT' && pathname === '/api/admin/pricing-config') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const hasNewPayload = body.feeByCabin && typeof body.feeByCabin === 'object';
    const hasLegacyPayload = body.duffelFeePercent !== undefined;
    if (!hasNewPayload && !hasLegacyPayload) {
      sendJson(res, 400, { error: 'feeByCabin is required' });
      return;
    }

    if (hasNewPayload) {
      const cabins = ['economy', 'premium_economy', 'business', 'first'];
      for (const cabin of cabins) {
        const value = Number(body.feeByCabin[cabin]);
        if (!Number.isFinite(value)) {
          sendJson(res, 400, { error: `feeByCabin.${cabin} must be a number` });
          return;
        }
      }
    }

    if (hasLegacyPayload) {
      const percent = Number(body.duffelFeePercent);
      if (!Number.isFinite(percent)) {
        sendJson(res, 400, { error: 'duffelFeePercent must be a number' });
        return;
      }
    }

    const pricing = setAdminConfig({
      ...(hasNewPayload ? { feeByCabin: body.feeByCabin } : {}),
      ...(hasLegacyPayload ? { duffelFeePercent: Number(body.duffelFeePercent) } : {})
    });
    sendJson(res, 200, { pricing });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/search-history') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const title = String(body.title || '').trim() || 'AI Search';
    const now = new Date().toISOString();
    const history = readJson(FILES.searchHistory);
    const record = {
      id: crypto.randomUUID(),
      userId: user.id,
      title,
      messages: [],
      latestResults: [],
      selectedFlightId: '',
      createdAt: now,
      updatedAt: now
    };

    history.push(record);
    writeJson(FILES.searchHistory, history);
    sendJson(res, 201, { session: record });
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/search-history/')) {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/').pop();
    const history = readJson(FILES.searchHistory);
    const session = history.find(s => s.id === id && s.userId === user.id);
    if (!session) {
      sendJson(res, 404, { error: 'Search session not found' });
      return;
    }

    sendJson(res, 200, { session });
    return;
  }

  if (req.method === 'PUT' && pathname.startsWith('/api/search-history/')) {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = pathname.split('/').pop();
    const body = await parseBody(req);
    const history = readJson(FILES.searchHistory);
    const idx = history.findIndex(s => s.id === id && s.userId === user.id);
    if (idx === -1) {
      sendJson(res, 404, { error: 'Search session not found' });
      return;
    }

    if (body.title !== undefined) {
      history[idx].title = String(body.title || '').trim() || history[idx].title || 'AI Search';
    }

    if (body.messages !== undefined) {
      if (!Array.isArray(body.messages)) {
        sendJson(res, 400, { error: 'messages must be an array' });
        return;
      }
      history[idx].messages = body.messages.map(sanitizeSearchMessage).filter(Boolean);
    }

    if (body.latestResults !== undefined) {
      if (!Array.isArray(body.latestResults)) {
        sendJson(res, 400, { error: 'latestResults must be an array' });
        return;
      }
      history[idx].latestResults = body.latestResults.map(sanitizeFlightResult).filter(Boolean);
    }

    if (body.selectedFlightId !== undefined) {
      history[idx].selectedFlightId = String(body.selectedFlightId || '').trim();
    }

    history[idx].updatedAt = new Date().toISOString();
    writeJson(FILES.searchHistory, history);
    sendJson(res, 200, { session: history[idx] });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/bookings') {
    const user = requireAuth(req, res);
    if (!user) return;

    const bookings = readJson(FILES.bookings)
      .filter(b => b.userId === user.id)
      // Keep only Duffel-verified bookings in the UI list.
      .filter(b => Boolean(b.duffelOrderId))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    sendJson(res, 200, { bookings });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/bookings') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const flightId = String(body.flightId || '').trim();
    const offerId = String(body.offerId || '').trim();
    const paymentId = String(body.paymentId || '').trim();
    const inlineFlight = body.flight && typeof body.flight === 'object' ? body.flight : null;

    if (!flightId) {
      sendJson(res, 400, { error: 'flightId is required' });
      return;
    }

    const flights = readJson(FILES.flights);
    let flight = flights.find(f => f.id === flightId);
    if (!flight && inlineFlight) {
      flight = {
        ...inlineFlight,
        id: inlineFlight.id || flightId || `inline_${crypto.randomUUID()}`
      };
    }
    if (!flight) {
      sendJson(res, 404, { error: 'Flight not found' });
      return;
    }

    const isDuffelOffer = flight.source === 'duffel' || Boolean(offerId || flight.offerId);
    if (!isDuffelOffer) {
      sendJson(res, 400, {
        error: 'This result is fallback data and cannot be ticketed. Please search again and book a Duffel offer.'
      });
      return;
    }

    const payments = readJson(FILES.payments).filter(p => p.userId === user.id);
    if (!payments.length) {
      sendJson(res, 400, { error: 'No payment method found. Please add one first.' });
      return;
    }

    let payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      payment = payments.find(p => p.primary) || payments[0];
    }

    const bookings = readJson(FILES.bookings);
    let duffelOrder = null;

    if (isDuffelOffer) {
      duffelOrder = await createDuffelOrderForOffer(user, flight);
      if (duffelOrder.error) {
        sendJson(res, 400, { error: duffelOrder.error });
        return;
      }
    }

    const booking = {
      id: crypto.randomUUID(),
      userId: user.id,
      flightId: flight.id,
      offerId: offerId || flight.offerId || '',
      flight,
      payment: serializePayment(payment),
      status: duffelOrder ? duffelOrder.paymentStatus : 'CONFIRMED',
      duffelOrderId: duffelOrder ? duffelOrder.orderId : '',
      bookingReference: duffelOrder ? duffelOrder.bookingReference : '',
      ticketNumbers: duffelOrder ? duffelOrder.tickets : [],
      duffelLiveMode: duffelOrder ? duffelOrder.liveMode : false,
      totalAmount: flight.cashPrice,
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    writeJson(FILES.bookings, bookings);

    sendJson(res, 201, { booking });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/flights/search') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const profileLoyaltyAccounts = buildDuffelLoyaltyAccountsForUser(user.id);
    const finalPayload = {
      ...body,
      preferences: Array.isArray(body.preferences) ? body.preferences : (Array.isArray(user.preferences) ? user.preferences : []),
      loyaltyAccounts: Array.isArray(body.loyaltyAccounts) && body.loyaltyAccounts.length
        ? body.loyaltyAccounts
        : profileLoyaltyAccounts
    };
    const result = await searchFlights(finalPayload, 'duffel_api');

    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/flights/ai-search') {
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await parseBody(req);
    const agent = decideSearchProvider(body.message || '');
    const parsed = extractAiSearchParams(body.message || '');
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    const fallbackFrom = user.homeAirport || '';
    const profileLoyaltyAccounts = buildDuffelLoyaltyAccountsForUser(user.id);
    const defaultDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const fromCandidate = parsed.from
      || parsed.fromText
      || String(context.from || '').trim()
      || fallbackFrom;
    const toCandidate = parsed.to
      || parsed.toText
      || String(context.to || '').trim();
    let resolvedFrom = await resolveLocationToIata(fromCandidate);
    let resolvedTo = await resolveLocationToIata(toCandidate);

    const normalizedFromCandidate = normalizeLocationQuery(fromCandidate);
    const normalizedToCandidate = normalizeLocationQuery(toCandidate);
    if (
      resolvedFrom &&
      resolvedTo &&
      resolvedFrom === resolvedTo &&
      normalizedFromCandidate &&
      normalizedToCandidate &&
      normalizedFromCandidate !== normalizedToCandidate
    ) {
      const guessedFrom = guessIataFromFreeText(fromCandidate);
      const guessedTo = guessIataFromFreeText(toCandidate);
      if (guessedFrom && guessedTo && guessedFrom !== guessedTo) {
        resolvedFrom = guessedFrom;
        resolvedTo = guessedTo;
      }
    }

    const finalPayload = {
      from: resolvedFrom,
      to: resolvedTo,
      date: parsed.date || String(context.date || '').trim() || defaultDate,
      returnDate: parsed.returnDate || String(context.returnDate || '').trim() || '',
      cabin: parsed.cabin || String(context.cabin || '').trim(),
      preferences: Array.isArray(body.preferences) ? body.preferences : (Array.isArray(user.preferences) ? user.preferences : []),
      loyaltyAccounts: profileLoyaltyAccounts
    };
    const autoDateUsed = !parsed.date;

    if (!finalPayload.from || !finalPayload.to) {
      sendJson(res, 400, {
        error: 'Could not detect route. Please include origin and destination (e.g. from Frankfurt to New York).',
        parsed: finalPayload
      });
      return;
    }

    const mode = agent.provider === 'ota_crawler' ? 'ota_crawler' : 'duffel_api';
    const result = await searchFlights(finalPayload, mode);
    if (result.error) {
      sendJson(res, 400, { error: result.error, parsed: finalPayload });
      return;
    }

    sendJson(res, 200, {
      agent,
      parsed: finalPayload,
      ...(autoDateUsed ? { warning: `No travel date detected. Using ${defaultDate}.` } : {}),
      ...result
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function createServer() {
  ensureDataFiles();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (pathname.startsWith('/api/')) {
        await handleApi(req, res, pathname);
        return;
      }

      serveStatic(req, res, pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Internal server error' });
    }
  });

  return server;
}

const server = createServer();
server.listen(PORT, HOST, () => {
  console.log(`Mi-Travel MVP running at http://${HOST}:${PORT}`);
});
