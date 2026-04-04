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
const pendingDepositsPath = path.join(dataDir, "pending-deposits.json");
let lynMarketCache = null;
let userStateCache = null;
let pendingDepositsCache = null;

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

async function readPendingDepositsStore() {
  if (pendingDepositsCache) {
    return pendingDepositsCache;
  }

  try {
    const raw = await fs.readFile(pendingDepositsPath, "utf8");
    pendingDepositsCache = JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    pendingDepositsCache = {};
  }

  return pendingDepositsCache;
}

async function writePendingDepositsStore(store) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(pendingDepositsPath, JSON.stringify(store, null, 2));
  pendingDepositsCache = store;
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

function mergeActivityFeed(existing = [], incoming = []) {
  const seen = new Set();

  return [...existing, ...incoming]
    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0))
    .filter((item) => {
      const key = `${item.type}:${item.timestamp}:${item.amount}:${item.asset}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function mergeUserState(existingState = {}, incomingState = {}) {
  const existing = sanitizeUserState(existingState);
  const incoming = sanitizeUserState(incomingState);
  const mergedDemoAmount = Math.max(existing.demoAmount, incoming.demoAmount);
  const mergedTotalDeposited = Math.max(existing.totalDeposited, incoming.totalDeposited);
  const mergedTotalTraded = Math.max(existing.totalTraded, incoming.totalTraded);
  const mergedDemoProfit = Number(incoming.demoProfit || existing.demoProfit || 0);
  const mergedDemoPercent =
    mergedDemoAmount > 0 ? Number(((mergedDemoProfit / mergedDemoAmount) * 100).toFixed(2)) : 0;

  return sanitizeUserState({
    currentAsset: incoming.currentAsset,
    demoAmount: mergedDemoAmount,
    demoProfit: mergedDemoProfit,
    demoPercent: mergedDemoPercent,
    totalDeposited: mergedTotalDeposited,
    totalTraded: mergedTotalTraded,
    isHeroVisible: incoming.isHeroVisible,
    activityFeed: mergeActivityFeed(existing.activityFeed, incoming.activityFeed)
  });
}

function getAdminChatId() {
  return toUserKey(process.env.TELEGRAM_ADMIN_CHAT_ID);
}

function isAdminUser(userId) {
  const adminChatId = getAdminChatId();
  return Boolean(adminChatId && userId && adminChatId === toUserKey(userId));
}

function getUserDisplayName(user = {}) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "Unknown";
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

app.get("/api/admin/deposits", async (req, res) => {
  const userId = toUserKey(req.query.userId);

  if (!isAdminUser(userId)) {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  try {
    const store = await readPendingDepositsStore();
    const items = Object.values(store)
      .filter((item) => item.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({
      ok: true,
      items
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load pending deposits"
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
    store[userId] = mergeUserState(store[userId], req.body?.state);
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
  const deposit = req.body?.deposit || {};
  const user = req.body?.user || {};

  if (!userId) {
    return res.status(400).json({
      error: "Invalid Telegram user id"
    });
  }

  if (!deposit.symbol || !deposit.wallet || !deposit.ticket) {
    return res.status(400).json({
      error: "Missing deposit requisites"
    });
  }

  const store = await readPendingDepositsStore();
  const existing = store[deposit.ticket];

  if (existing?.status === "approved") {
    return res.status(409).json({
      error: "Deposit already approved"
    });
  }

  const entry = {
    ticket: String(deposit.ticket),
    userId,
    username: user.username || "",
    displayName: getUserDisplayName(user),
    symbol: String(deposit.symbol),
    network: String(deposit.network || ""),
    wallet: String(deposit.wallet),
    amountUsd: Number(deposit.amountUsd) || 0,
    cryptoAmount: Number(deposit.cryptoAmount) || 0,
    decimals: Number(deposit.decimals) || 0,
    status: "pending",
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  store[entry.ticket] = entry;
  await writePendingDepositsStore(store);

  const lines = [
    "Pegasus payment request",
    "",
    `User: ${entry.displayName}`,
    `Telegram ID: ${userId}`,
    user.username ? `Username: @${user.username}` : null,
    `Amount: $${entry.amountUsd.toFixed(2)}`,
    `Asset: ${entry.symbol}`,
    `Network: ${entry.network || "-"}`,
    `Transfer: ${entry.cryptoAmount} ${entry.symbol}`,
    `Wallet: ${entry.wallet}`,
    `Ticket: ${entry.ticket}`,
    "",
    "The user pressed confirmation. Review the payment and approve it in admin."
  ].filter(Boolean);

  try {
    const adminChatId = getAdminChatId();
    let result = null;
    let notified = false;

    if (adminChatId) {
      result = await sendTelegramMessage(adminChatId, lines.join("\n"));
      notified = true;
    }

    return res.json({
      ok: true,
      notified,
      request: entry,
      result
    });
  } catch (error) {
    return res.json({
      ok: true,
      notified: false,
      request: entry,
      warning: error.message || "Failed to notify Telegram"
    });
  }
});

app.post("/api/admin/deposits/approve", async (req, res) => {
  const adminUserId = toUserKey(req.body?.adminUserId);
  const ticket = String(req.body?.ticket || "").trim();

  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  if (!ticket) {
    return res.status(400).json({
      error: "Missing ticket"
    });
  }

  try {
    const pendingStore = await readPendingDepositsStore();
    const request = pendingStore[ticket];

    if (!request) {
      return res.status(404).json({
        error: "Pending deposit not found"
      });
    }

    if (request.status === "approved") {
      return res.status(409).json({
        error: "Deposit already approved"
      });
    }

    const userStore = await readUserStateStore();
    const currentState = sanitizeUserState(userStore[request.userId] || {});
    const amount = Number(request.amountUsd) || 0;
    const nextDemoAmount = Number((currentState.demoAmount + amount).toFixed(2));
    const nextTotalDeposited = Number((currentState.totalDeposited + amount).toFixed(2));
    const nextDemoPercent = nextDemoAmount > 0 ? Number(((currentState.demoProfit / nextDemoAmount) * 100).toFixed(2)) : 0;
    const nextActivityFeed = [
      {
        type: "deposit",
        amount: `+$${amount.toFixed(2)}`,
        asset: request.symbol,
        timestamp: Date.now()
      },
      ...(currentState.activityFeed || [])
    ].slice(0, 12);

    userStore[request.userId] = sanitizeUserState({
      ...currentState,
      demoAmount: nextDemoAmount,
      demoProfit: currentState.demoProfit,
      demoPercent: nextDemoPercent,
      totalDeposited: nextTotalDeposited,
      totalTraded: currentState.totalTraded,
      isHeroVisible: currentState.isHeroVisible,
      activityFeed: nextActivityFeed
    });
    await writeUserStateStore(userStore);

    pendingStore[ticket] = {
      ...request,
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: adminUserId,
      updatedAt: Date.now()
    };
    await writePendingDepositsStore(pendingStore);

    let userNotified = false;

    try {
      await sendTelegramMessage(
        request.userId,
        `Pegasus deposit approved\n\nTicket: ${request.ticket}\nAmount: $${amount.toFixed(2)}\nAsset: ${request.symbol}`
      );
      userNotified = true;
    } catch {
      userNotified = false;
    }

    return res.json({
      ok: true,
      approved: pendingStore[ticket],
      state: userStore[request.userId],
      userNotified
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to approve deposit"
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
