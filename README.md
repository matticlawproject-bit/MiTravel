# Mi-Travel MVP (Starter)

Updated implementation as a responsive website using the same visual language:
- Public landing + Log in / Sign up
- App shell with sidebar navigation and content pages
- Discover dashboard
- AI Search chat with natural-language query parsing, selectable results, and direct booking
- Personalization (traveler info + frequent flyer programs + preferences)
- Payment methods management
- Settings (language, phone, 2FA toggle, logout)
- My bookings list (confirmed purchases)

## Run

Set PostgreSQL first (recommended via `.env`):

```bash
cp .env.example .env
```

Or export directly in shell:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mitravel"
```

Bootstrap DB on a new local setup (create DB + apply schema + write `.env` if missing):

```bash
npm run db:setup
```

Optional overrides when bootstrapping:

```bash
DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=mitravel npm run db:setup
```

Install deps and start:

```bash
npm install
npm start
```

Open: `http://127.0.0.1:3000`

## Notes

- Persistence now uses PostgreSQL (`app_data_store` table).
- On first boot, if legacy JSON files exist under `data/`, they are auto-imported into PostgreSQL.
- Flight search keeps seeded sample defaults for initial bootstrapping.
- Live flight search supports Duffel when credentials are configured.

Schema file:

```bash
cat db/schema.sql
```

Optional normalized entity schema:

```bash
cat db/schema.entities.sql
```

Verification script:

```bash
psql "$DATABASE_URL" -f db/verify-storage.sql
```

Technical HTML documentation:

```bash
http://127.0.0.1:3000/docs.html
```

OpenAPI spec (used by Swagger-style section in docs page):

```bash
http://127.0.0.1:3000/openapi.json
```

## Duffel API Setup

Set your token before running:

```bash
export DUFFEL_ACCESS_TOKEN="your_duffel_token"
npm start
```

Alternative (encrypted config):

- Encrypted token file: `config/duffel.encrypted.json`
- Local master key file: `.duffel_master_key` (gitignored)

At runtime the server resolves token in this order:
1. `DUFFEL_ACCESS_TOKEN` / `DUFFEL_API_TOKEN`
2. decrypt `config/duffel.encrypted.json` with:
   - `MI_TRAVEL_MASTER_KEY`, or
   - `.duffel_master_key` (local file)

Optional:

```bash
export DUFFEL_VERSION="v2"
export DUFFEL_BASE_URL="https://api.duffel.com"
```

If Duffel is not configured or unavailable, the app falls back to seeded local results.

## Production OAuth (Google + Apple)

Social sign-in now uses Authorization Code flow with server-side callback handling.

Set Google OAuth:

```bash
export GOOGLE_OAUTH_CLIENT_ID="..."
export GOOGLE_OAUTH_CLIENT_SECRET="..."
# Optional override (default: http://127.0.0.1:3000/api/auth/google/callback)
export GOOGLE_OAUTH_REDIRECT_URI="http://127.0.0.1:3000/api/auth/google/callback"
```

Set Apple OAuth:

```bash
export APPLE_OAUTH_CLIENT_ID="..."
export APPLE_OAUTH_TEAM_ID="..."
export APPLE_OAUTH_KEY_ID="..."
export APPLE_OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Optional override (default: http://127.0.0.1:3000/api/auth/apple/callback)
export APPLE_OAUTH_REDIRECT_URI="http://127.0.0.1:3000/api/auth/apple/callback"
```

Optional hardening:

```bash
export OAUTH_STATE_SECRET="long-random-secret"
```

## Booking Payment Flow (Stripe -> Duffel)

Booking now follows this sequence:

1. Use the selected profile payment method (or primary fallback) as booking context.
2. Run Stripe authorization first (fee-inclusive customer amount), with booking metadata (route, airline, flight numbers, dates, cabin).
3. If authorized, create Duffel order.
4. After Duffel confirms order, run Stripe capture.
5. Persist booking with Stripe authorization + capture metadata.

### Stripe configuration

```bash
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_PUBLISHABLE_KEY="pk_test_..."
# Optional for test mode fallback
export STRIPE_TEST_PAYMENT_METHOD="pm_card_visa"
export STRIPE_BASE_URL="https://api.stripe.com"
```

Card setup in Personalization now uses Stripe SetupIntent + tokenization (PaymentMethod IDs).
MiTravel does not store raw card numbers/CVV, reducing PCI DSS scope.
PayPal and Apple Pay setup in Personalization also run through Stripe Checkout setup mode, and only Stripe tokens are stored.

If `STRIPE_SECRET_KEY` is not set, Stripe auth runs in mock-approval mode for local testing.
You can also store Stripe key encrypted in PostgreSQL (`app_secrets`) and run without env key:

```bash
DATABASE_URL="postgresql://<user>:<password>@127.0.0.1:5432/mitravel" \
MI_TRAVEL_MASTER_KEY="<master_key>" \
npm run secret:set -- stripe_secret_key "sk_test_..."
```

At runtime Stripe key resolution order is:
1. `STRIPE_SECRET_KEY` env var
2. encrypted `stripe_secret_key` in DB table `app_secrets`

### Duffel payment form configuration

Choose how payment is sent to Duffel order creation:

```bash
# cash (default) or lodge_card
export DUFFEL_ORDER_PAYMENT_MODE="cash"
```

For hard-coded lodge card mode:

```bash
export DUFFEL_ORDER_PAYMENT_MODE="lodge_card"
export DUFFEL_LODGE_CARD_NUMBER="4111111111111111"
export DUFFEL_LODGE_CARD_CVC="123"
export DUFFEL_LODGE_CARD_EXP_MONTH="12"
export DUFFEL_LODGE_CARD_EXP_YEAR="2030"
export DUFFEL_LODGE_CARD_NAME="MiTravel Lodge Card"
```

## Duffel Order Creation

When you click `Buy now` on a Duffel offer, the backend creates a real Duffel order (`/air/orders`).

Required traveler fields in Personalization:
- first name
- family name
- title (`mr/ms/mrs/mx`)
- gender (`m/f`)
- date of birth
- phone number

Payment method:
- at least one payment method must be saved in Personalization before checkout.
