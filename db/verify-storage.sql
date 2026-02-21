-- MiTravel PostgreSQL verification script
-- Usage: psql "$DATABASE_URL" -f db/verify-storage.sql

\echo '== Table check =='
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '== app_data_store collections =='
SELECT
  collection,
  jsonb_typeof(payload) AS payload_type,
  CASE WHEN jsonb_typeof(payload) = 'array' THEN jsonb_array_length(payload) END AS items,
  updated_at
FROM app_data_store
ORDER BY collection;

\echo ''
\echo '== Key collection counts =='
SELECT
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'users'), 0) AS users,
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'sessions'), 0) AS sessions,
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'rewards'), 0) AS rewards,
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'payments'), 0) AS payments,
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'bookings'), 0) AS bookings,
  COALESCE((SELECT jsonb_array_length(payload) FROM app_data_store WHERE collection = 'searchHistory'), 0) AS search_history;

\echo ''
\echo '== Recent users (from JSON collection) =='
SELECT
  u->>'id' AS id,
  u->>'email' AS email,
  COALESCE(u->>'role', 'user') AS role,
  u->>'createdAt' AS created_at
FROM app_data_store s,
LATERAL jsonb_array_elements(s.payload) AS u
WHERE s.collection = 'users'
ORDER BY COALESCE(u->>'createdAt', '') DESC
LIMIT 10;

\echo ''
\echo '== Recent bookings (from JSON collection) =='
SELECT
  b->>'id' AS booking_id,
  b->>'userId' AS user_id,
  b->>'status' AS status,
  b->>'createdAt' AS created_at,
  b->>'duffelOrderId' AS duffel_order_id
FROM app_data_store s,
LATERAL jsonb_array_elements(s.payload) AS b
WHERE s.collection = 'bookings'
ORDER BY COALESCE(b->>'createdAt', '') DESC
LIMIT 10;

\echo ''
\echo '== Optional normalized table row counts (if you use mt_* tables) =='
SELECT 'mt_users' AS table_name, COUNT(*)::bigint AS rows FROM mt_users
UNION ALL SELECT 'mt_sessions', COUNT(*)::bigint FROM mt_sessions
UNION ALL SELECT 'mt_rewards', COUNT(*)::bigint FROM mt_rewards
UNION ALL SELECT 'mt_loyalty_vault', COUNT(*)::bigint FROM mt_loyalty_vault
UNION ALL SELECT 'mt_flights', COUNT(*)::bigint FROM mt_flights
UNION ALL SELECT 'mt_payments', COUNT(*)::bigint FROM mt_payments
UNION ALL SELECT 'mt_bookings', COUNT(*)::bigint FROM mt_bookings
UNION ALL SELECT 'mt_search_history', COUNT(*)::bigint FROM mt_search_history
UNION ALL SELECT 'mt_airports_index', COUNT(*)::bigint FROM mt_airports_index
UNION ALL SELECT 'mt_admin_config', COUNT(*)::bigint FROM mt_admin_config
ORDER BY table_name;
