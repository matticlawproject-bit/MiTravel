-- Optional normalized schema for PostgreSQL 18.
-- The app currently uses app_data_store (db/schema.sql) for compatibility,
-- while this schema defines entity-level tables for a full relational migration.

CREATE TABLE IF NOT EXISTS mt_users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  first_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  home_airport TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  passport_number TEXT NOT NULL DEFAULT '',
  passport_expiry DATE,
  passport_country TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  born_on DATE,
  phone TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'English',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_rewards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  points BIGINT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT '',
  member_login_masked TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_loyalty_vault (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES mt_rewards(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  login_encrypted JSONB NOT NULL,
  password_encrypted JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_flights (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'seed',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  cardholder_name TEXT NOT NULL DEFAULT '',
  last4 TEXT NOT NULL DEFAULT '',
  exp TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  paypal_email_masked TEXT NOT NULL DEFAULT '',
  apple_pay_reference TEXT NOT NULL DEFAULT '',
  primary_method BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_bookings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  flight_id TEXT NOT NULL,
  offer_id TEXT NOT NULL DEFAULT '',
  payment_id UUID,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  duffel_order_id TEXT NOT NULL DEFAULT '',
  booking_reference TEXT NOT NULL DEFAULT '',
  ticket_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  duffel_live_mode BOOLEAN NOT NULL DEFAULT FALSE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  flight_payload JSONB NOT NULL,
  payment_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_search_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'AI Search',
  last_message TEXT NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  latest_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_flight_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt_airports_index (
  iata TEXT PRIMARY KEY,
  city TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mt_admin_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  fee_by_cabin JSONB NOT NULL,
  duffel_fee_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mt_admin_config_singleton CHECK (id = 1)
);
