
# CAMPOCLARO

React storefront with a local Express API, order intake, admin panel, and Telegram login support.

  ## Running the code

Run `npm i` to install the dependencies.

Copy `.env.example` to `.env` and fill:

- `TELEGRAM_BOT_TOKEN`: token from BotFather.
- `ADMIN_TELEGRAM_IDS`: comma-separated Telegram user IDs allowed into admin.
- `VITE_TELEGRAM_BOT_USERNAME`: bot username without `@`.
- `TELEGRAM_WEBHOOK_SECRET`: optional secret used by Telegram webhook requests.

Run the API:

```bash
npm run api
```

Run the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`. Admin is at `http://localhost:5173/admin`.

If `VITE_TELEGRAM_BOT_USERNAME` is empty, `/admin` shows a local `Dev Login` button for development.

## Production deploy

Use [DEPLOY.md](DEPLOY.md) for the step-by-step VPS guide with Git, Docker Compose, Nginx, HTTPS, and `campoclaro.eu`.

## Telegram notifications

Order notifications are opt-out and transactional only. The frontend enables them by default, lets the client disable them in checkout or profile settings, and sends `notificationsEnabled` with each order.

Any Telegram sender added later must check `order.notificationsEnabled !== false` before sending order updates. Do not use order notifications for bulk marketing or newsletter messages; marketing consent must be separate and is disabled by default.

Newsletter is a separate opt-in setting in the profile page. Admins can send a Telegram newsletter from `/admin`; the API sends only to users who enabled that setting.

## Crypto payment checks

Crypto orders lock an exact crypto amount at checkout using CoinGecko EUR rates, then the server checks public blockchain explorers every `CRYPTO_PAYMENT_CHECK_MS`:

- BTC: mempool.space address transactions
- ETH: Blockscout Ethereum address transactions
- USDT TRC20: TronGrid TRC20 transfers

When an incoming payment matches the wallet, amount, and order time window, the order becomes `paid_confirmed` automatically and Telegram notifications are sent. This is not a payment processor and uses public explorer APIs, so keep manual admin review available for edge cases or explorer outages.

For tracking replies, point the Telegram bot webhook to:

```bash
https://your-domain.com/api/telegram/webhook
```

If `TELEGRAM_WEBHOOK_SECRET` is set, pass it as Telegram's `secret_token` when configuring the webhook. Admins can reply to the bot's order notification with a tracking code; the API saves it to the order and sends it to the customer if the customer connected Telegram and started the bot.

Preferred reply formats:

- `UPS 1Z...`
- `InPost ...`
- `SEUR ...`
- `GLS ...`

Public compliance pages are available at:

- `/privacy`
- `/terms`

## Free shipment tracking

Tracking is implemented without a paid API by storing the tracking number and generating an external tracking link. The primary couriers are UPS, InPost, SEUR, and GLS. The API detects these couriers from the tracking code or from the admin's prefix and links to the official tracking page.

Without a courier API, the exact delivered event cannot be verified reliably. The server runs a free auto-complete job for shipped orders based on courier delivery windows:

- UPS: `AUTO_DELIVER_UPS_DAYS`
- InPost: `AUTO_DELIVER_INPOST_DAYS`
- SEUR: `AUTO_DELIVER_SEUR_DAYS`
- GLS: `AUTO_DELIVER_GLS_DAYS`

When that window passes, the order becomes `completed` automatically and the client receives a Telegram completion notice.
