import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
const dataDir = path.resolve(__dirname, "../data");
const userStatePath = path.join(dataDir, "user-state.json");
let lynMarketCache = null;
let userStateCache = null;

function toUserKey(value) {
  const normalized = String(value || "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

async function readUserStateStore() {
  if (userStateCache) {
    return userStateCache;
  }

  try {
    const raw = await fs.readFile(userStatePath, "utf8");
    userStateCache = JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    userStateCache = {};
  }

  return userStateCache;
}

async function writeUserStateStore(store) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(userStatePath, JSON.stringify(store, null, 2));
  userStateCache = store;
}

function sanitizeActivityItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    type: String(item.type || "mode"),
    amount: String(item.amount || "$0.00"),
    asset: String(item.asset || "USD"),
    from: item.from ? String(item.from) : undefined,
    to: item.to ? String(item.to) : undefined,
    timestamp: Number(item.timestamp) || Date.now()
  };
}

function sanitizeUserState(state = {}) {
  const validAssets = new Set(["lyn", "bitcoin", "ethereum"]);
  const activityFeed = Array.isArray(state.activityFeed)
    ? state.activityFeed.map(sanitizeActivityItem).filter(Boolean).slice(0, 12)
    : [];

  return {
    currentAsset: validAssets.has(state.currentAsset) ? state.currentAsset : "lyn",
    demoAmount: Number(state.demoAmount) || 0,
    demoProfit: Number(state.demoProfit) || 0,
    demoPercent: Number(state.demoPercent) || 0,
    totalDeposited: Number(state.totalDeposited) || 0,
    totalTraded: Number(state.totalTraded) || 0,
    isHeroVisible: state.isHeroVisible !== false,
    activityFeed,
    updatedAt: Date.now()
  };
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or target chat id");
  }

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
    throw new Error(payload.description || "Telegram Bot API rejected the request");
  }

  return payload.result;
}

async function fetchBinanceMarket(symbol) {
  const [ohlcResponse, marketResponse] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`),
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
  ]);

  if (!ohlcResponse.ok || !marketResponse.ok) {
    throw new Error(`Failed to fetch ${symbol} market data`);
  }

  const ohlcRaw = await ohlcResponse.json();
  const marketRaw = await marketResponse.json();

  return {
    ok: true,
    ohlc: ohlcRaw.map((item) => [item[0], Number(item[1]), Number(item[2]), Number(item[3]), Number(item[4])]),
    market: {
      current_price: Number(marketRaw.lastPrice),
      low_24h: Number(marketRaw.lowPrice),
      high_24h: Number(marketRaw.highPrice),
      price_change_percentage_24h: Number(marketRaw.priceChangePercent)
    }
  };
}

function decodeCdata(value = "") {
  return value
    .replace("<![CDATA[", "")
    .replace("]]>", "")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseRssItems(xml, limit = 2) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);

  return items.map((match) => {
    const block = match[1];
    const title = decodeCdata(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = decodeCdata(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const pubDate = decodeCdata(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const description = decodeCdata(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { title, link, pubDate, description };
  });
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/market/bitcoin", async (_req, res) => {
  try {
    return res.json(await fetchBinanceMarket("BTCUSDT"));
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load bitcoin market data"
    });
  }
});

app.get("/api/market/ethereum", async (_req, res) => {
  try {
    return res.json(await fetchBinanceMarket("ETHUSDT"));
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load ethereum market data"
    });
  }
});

app.get("/api/market/lyn", async (_req, res) => {
  try {
    const [ohlcResponse, marketResponse] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/coins/lyn/ohlc?vs_currency=usd&days=1"),
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=lyn&price_change_percentage=24h")
    ]);

    if (!ohlcResponse.ok || !marketResponse.ok) {
      if (lynMarketCache) {
        return res.json({
          ...lynMarketCache,
          stale: true
        });
      }

      return res.status(502).json({
        error: "Failed to fetch lyn market data"
      });
    }

    const [ohlc, market] = await Promise.all([ohlcResponse.json(), marketResponse.json()]);

    lynMarketCache = {
      ok: true,
      ohlc,
      market: market[0] || null,
      fetchedAt: Date.now(),
      stale: false
    };

    return res.json(lynMarketCache);
  } catch (error) {
    if (lynMarketCache) {
      return res.json({
        ...lynMarketCache,
        stale: true
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to load lyn market data"
    });
  }
});

app.get("/api/news/latest", async (_req, res) => {
  try {
    const response = await fetch("https://cointelegraph.com/rss");

    if (!response.ok) {
      return res.status(502).json({
        error: "Failed to fetch latest crypto news"
      });
    }

    const xml = await response.text();
    const items = parseRssItems(xml, 10).map((item) => ({
      ...item,
      coin: item.title.includes("Bitcoin")
        ? "BTC"
        : item.title.includes("Ether") || item.title.includes("Ethereum")
          ? "ETH"
          : item.title.includes("Solana") || item.title.includes("SOL")
            ? "SOL"
            : "CRYPTO",
      trend:
        /risk|loss|slips|low|fails|scam|pressure|fear/i.test(item.title + item.description)
          ? "Медвежий"
          : "Бычий"
    }));

    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load latest crypto news"
    });
  }
});

app.get("/api/app-state/:userId", async (req, res) => {
  const userId = toUserKey(req.params.userId);

  if (!userId) {
    return res.status(400).json({
      error: "Invalid Telegram user id"
    });
  }

  try {
    const store = await readUserStateStore();
    return res.json({
      ok: true,
      state: store[userId] || null
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load user state"
    });
  }
});

app.post("/api/app-state", async (req, res) => {
  const userId = toUserKey(req.body?.userId);

  if (!userId) {
    return res.status(400).json({
      error: "Invalid Telegram user id"
    });
  }

  try {
    const store = await readUserStateStore();
    store[userId] = sanitizeUserState(req.body?.state);
    await writeUserStateStore(store);

    return res.json({
      ok: true,
      state: store[userId]
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to save user state"
    });
  }
});

app.post("/api/deposits/confirm", async (req, res) => {
  const userId = toUserKey(req.body?.userId);
  const notifyChatId = toUserKey(process.env.TELEGRAM_ADMIN_CHAT_ID || req.body?.notifyChatId || userId);
  const deposit = req.body?.deposit || {};
  const user = req.body?.user || {};

  if (!deposit.symbol || !deposit.wallet || !deposit.ticket) {
    return res.status(400).json({
      error: "Missing deposit requisites"
    });
  }

  if (!notifyChatId) {
    return res.status(400).json({
      error: "Missing Telegram target chat id"
    });
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "Unknown";
  const lines = [
    "Pegasus payment confirmation",
    "",
    `User: ${displayName}`,
    `Telegram ID: ${userId || "unknown"}`,
    user.username ? `Username: @${user.username}` : null,
    `Amount: $${Number(deposit.amountUsd || 0).toFixed(2)}`,
    `Asset: ${deposit.symbol}`,
    `Network: ${deposit.network || "-"}`,
    `Transfer: ${deposit.cryptoAmount} ${deposit.symbol}`,
    `Wallet: ${deposit.wallet}`,
    `Ticket: ${deposit.ticket}`,
    "",
    "The user pressed confirmation. Check the incoming payment."
  ].filter(Boolean);

  try {
    const result = await sendTelegramMessage(notifyChatId, lines.join("\n"));

    return res.json({
      ok: true,
      result
    });
  } catch (error) {
    return res.status(502).json({
      error: error.message || "Failed to notify Telegram"
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
    const result = await sendTelegramMessage(chatId, text);
    return res.json({
      ok: true,
      result
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Pegasus server listening on :${port}`);
});
