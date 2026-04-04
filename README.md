# Trade GPT Pegasus

Telegram Mini App with a promo landing screen, profit dashboard, and a small backend bridge for Telegram Bot API testing.

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
PORT=3001
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

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
  - `PORT=10000`
