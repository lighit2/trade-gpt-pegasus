import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/market/bitcoin", async (_req, res) => {
  try {
    const [ohlcResponse, marketResponse] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1"),
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=24h"
      )
    ]);

    if (!ohlcResponse.ok || !marketResponse.ok) {
      return res.status(502).json({
        error: "Failed to fetch bitcoin market data"
      });
    }

    const ohlc = await ohlcResponse.json();
    const market = await marketResponse.json();

    return res.json({
      ok: true,
      ohlc,
      market: market[0] || null
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load bitcoin market data"
    });
  }
});

app.post("/api/bot/test", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_TEST_CHAT_ID;
  const text = req.body?.text || "Trade GPT Pegasus test message";

  if (!token || !chatId) {
    return res.status(400).json({
      error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_TEST_CHAT_ID in .env"
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      return res.status(502).json({
        error: payload.description || "Telegram Bot API rejected the request"
      });
    }

    return res.json({
      ok: true,
      result: payload.result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Bot API request failed"
    });
  }
});

app.use(express.static(distPath));

app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Trade GPT Pegasus bot bridge listening on :${port}`);
});
