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

```bash
npm start
```

Open: `http://127.0.0.1:3000`

## Notes

- Uses local JSON files under `data/` for persistence.
- Flight search uses seeded sample data in `data/flights.json`, including `FRA -> JFK` examples.
- API is implemented with Node.js built-ins only.
- Live flight search supports Duffel when credentials are configured.

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
