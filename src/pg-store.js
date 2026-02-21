const fs = require('fs');
const { Pool } = require('pg');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readLegacyJson(filePath, fallback) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return cloneJson(fallback);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return cloneJson(fallback);
  }
}

function createPgDataStore({ connectionString, defaults, legacyFiles }) {
  const url = String(connectionString || process.env.DATABASE_URL || '').trim();
  if (!url) {
    throw new Error('DATABASE_URL is required to run with PostgreSQL.');
  }

  const pool = new Pool({ connectionString: url });
  const cache = new Map();

  async function query(text, params = []) {
    return pool.query(text, params);
  }

  async function init() {
    const schemaSql = fs.readFileSync(require('path').join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await query(schemaSql);

    for (const [collection, fallback] of Object.entries(defaults || {})) {
      const existing = await query('SELECT payload FROM app_data_store WHERE collection = $1', [collection]);
      if (existing.rowCount > 0) {
        cache.set(collection, cloneJson(existing.rows[0].payload));
        continue;
      }

      const initialValue = readLegacyJson(legacyFiles?.[collection], fallback);
      await query(
        'INSERT INTO app_data_store (collection, payload, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (collection) DO NOTHING',
        [collection, JSON.stringify(initialValue)]
      );
      cache.set(collection, cloneJson(initialValue));
    }
  }

  function read(collection) {
    if (!cache.has(collection)) {
      const fallback = Object.prototype.hasOwnProperty.call(defaults, collection)
        ? defaults[collection]
        : [];
      write(collection, fallback);
      return cloneJson(fallback);
    }
    return cloneJson(cache.get(collection));
  }

  function write(collection, payload) {
    const snapshot = cloneJson(payload);
    cache.set(collection, snapshot);
    void query(
      `INSERT INTO app_data_store (collection, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (collection)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [collection, JSON.stringify(snapshot)]
    ).catch(error => {
      console.error(`Failed to persist collection ${collection}:`, error.message || error);
    });
  }

  async function close() {
    await pool.end();
  }

  async function getSecret(secretName) {
    const name = String(secretName || '').trim();
    if (!name) return null;
    const res = await query('SELECT secret_payload FROM app_secrets WHERE secret_name = $1', [name]);
    if (!res.rowCount) return null;
    return cloneJson(res.rows[0].secret_payload);
  }

  async function setSecret(secretName, secretPayload) {
    const name = String(secretName || '').trim();
    if (!name || !secretPayload || typeof secretPayload !== 'object') {
      throw new Error('secretName and secretPayload are required.');
    }
    await query(
      `INSERT INTO app_secrets (secret_name, secret_payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (secret_name)
       DO UPDATE SET secret_payload = EXCLUDED.secret_payload, updated_at = NOW()`,
      [name, JSON.stringify(secretPayload)]
    );
  }

  return { init, read, write, close, getSecret, setSecret };
}

module.exports = {
  createPgDataStore
};
