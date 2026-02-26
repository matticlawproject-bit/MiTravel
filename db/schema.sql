CREATE TABLE IF NOT EXISTS app_data_store (
  collection TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_data_store_updated_at ON app_data_store (updated_at DESC);

CREATE TABLE IF NOT EXISTS app_secrets (
  secret_name TEXT PRIMARY KEY,
  secret_payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_app_data_store_collection'
  ) THEN
    ALTER TABLE app_data_store
      DROP CONSTRAINT chk_app_data_store_collection;
  END IF;

  ALTER TABLE app_data_store
    ADD CONSTRAINT chk_app_data_store_collection
    CHECK (
      collection IN (
        'users',
        'sessions',
        'rewards',
        'loyaltyVault',
        'flights',
        'payments',
        'bookings',
        'searchHistory',
        'airportsIndex',
        'adminConfig',
        'passwordResets'
      )
    );
END
$$;
