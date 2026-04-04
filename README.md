# Trade GPT Pegasus

Telegram Mini App with a promo landing screen, profit dashboard, and a small backend bridge for Telegram Bot API testing.
The app now uses `EN/ZH` UI and includes Telegram support routing for operators.

## Stack

- Vite + React frontend
- Express backend
- Netlify frontend config
- Render backend config

## Local Run

```bash
npm install
npm run build
node server/index.js
```

Open `http://localhost:3001`.

## Environment

Create `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_TEST_CHAT_ID=your_chat_id
TELEGRAM_ADMIN_CHAT_ID=your_owner_chat_id
TELEGRAM_UPDATE_MODE=auto
TELEGRAM_WEBHOOK_BASE_URL=https://your-render-service.onrender.com
# optional:
# TELEGRAM_WEBHOOK_SECRET=your_secret
PORT=3001
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

`TELEGRAM_ADMIN_CHAT_ID` is preferred for owner/admin notifications. If it is not set, the server falls back to `TELEGRAM_TEST_CHAT_ID`.

## Telegram Support Flow

- Users can request help from the Mini App support button or by sending `/support` to the bot.
- Admin can add support operators with `/add <telegram_id>`.
- Support operators reply by answering the bot's support message directly, or with `/reply <telegram_id> <message>`.

## Deploy

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Env: `VITE_API_BASE_URL=https://your-render-service.onrender.com`

### Render

- Build command: `npm install && npm run build`
- Start command: `node server/index.js`
- Env:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_TEST_CHAT_ID`
  - `TELEGRAM_ADMIN_CHAT_ID`
  - `TELEGRAM_UPDATE_MODE=auto`
  - `TELEGRAM_WEBHOOK_BASE_URL=https://trade-gpt-pegasus.onrender.com`
  - optional `TELEGRAM_WEBHOOK_SECRET`
  - `PORT=10000`
