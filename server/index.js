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
let lynMarketCache = null;

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
    const [ohlcResponse, marketResponse] = await Promise.all([
      fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24"),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
    ]);

    if (!ohlcResponse.ok || !marketResponse.ok) {
      return res.status(502).json({
        error: "Failed to fetch bitcoin market data"
      });
    }

    const ohlcRaw = await ohlcResponse.json();
    const marketRaw = await marketResponse.json();

    const ohlc = ohlcRaw.map((item) => [
      item[0],
      Number(item[1]),
      Number(item[2]),
      Number(item[3]),
      Number(item[4])
    ]);

    const market = {
      current_price: Number(marketRaw.lastPrice),
      low_24h: Number(marketRaw.lowPrice),
      high_24h: Number(marketRaw.highPrice),
      price_change_percentage_24h: Number(marketRaw.priceChangePercent)
    };

    return res.json({
      ok: true,
      ohlc,
      market
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load bitcoin market data"
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Pegasus server listening on :${port}`);
});
