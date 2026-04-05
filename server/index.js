import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = Number(process.env.PORT || 3001);
const SIMULATION_STEP_MS = 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
const dataDir = path.resolve(__dirname, "../data");
const userStatePath = path.join(dataDir, "user-state.json");
const pendingDepositsPath = path.join(dataDir, "pending-deposits.json");
const supportStatePath = path.join(dataDir, "support-state.json");
let lynMarketCache = null;
let userStateCache = null;
let pendingDepositsCache = null;
let supportStateCache = null;
let telegramPollingStarted = false;
let simulationLoopStarted = false;
let telegramUpdateOffset = 0;

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

function sanitizeSupportState(state = {}) {
  const agents = [...new Set((Array.isArray(state.agents) ? state.agents : []).map(toUserKey).filter(Boolean))];
  const threads = Object.fromEntries(
    Object.entries(state.threads || {})
      .map(([userId, thread]) => {
        const normalizedUserId = toUserKey(userId);

        if (!normalizedUserId || !thread || typeof thread !== "object") {
          return null;
        }

        return [
          normalizedUserId,
          {
            userId: normalizedUserId,
            username: String(thread.username || ""),
            displayName: String(thread.displayName || "Unknown"),
            source: String(thread.source || "bot"),
            status: thread.status === "closed" ? "closed" : "open",
            openedAt: Number(thread.openedAt) || Date.now(),
            updatedAt: Number(thread.updatedAt) || Date.now(),
            lastTicket: thread.lastTicket ? String(thread.lastTicket) : "",
            lastMessage: thread.lastMessage ? String(thread.lastMessage).slice(0, 1500) : ""
          }
        ];
      })
      .filter(Boolean)
  );
  const replyMap = Object.fromEntries(
    Object.entries(state.replyMap || {})
      .map(([key, value]) => {
        if (!/^\d+:\d+$/.test(key)) {
          return null;
        }

        const userId = toUserKey(value?.userId || value);

        if (!userId) {
          return null;
        }

        return [
          key,
          {
            userId,
            createdAt: Number(value?.createdAt) || Date.now()
          }
        ];
      })
      .filter(Boolean)
      .sort((left, right) => right[1].createdAt - left[1].createdAt)
      .slice(0, 600)
  );

  return {
    agents,
    threads,
    replyMap
  };
}

async function readSupportStateStore() {
  if (supportStateCache) {
    return supportStateCache;
  }

  try {
    const raw = await fs.readFile(supportStatePath, "utf8");
    supportStateCache = sanitizeSupportState(JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    supportStateCache = sanitizeSupportState();
  }

  return supportStateCache;
}

async function writeSupportStateStore(store) {
  const normalized = sanitizeSupportState(store);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(supportStatePath, JSON.stringify(normalized, null, 2));
  supportStateCache = normalized;
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

function roundToCents(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundToThousandths(value) {
  return Number(Number(value || 0).toFixed(3));
}

function roundToTenths(value) {
  return Number(Number(value || 0).toFixed(1));
}

function deterministicUnit(seed) {
  const raw = Math.sin(seed) * 10000;
  return raw - Math.floor(raw);
}

function getSimulationStep(epoch, tick) {
  const safeEpoch = Number(epoch) || 0;
  const safeTick = Number(tick) || 0;
  const percentRoll = deterministicUnit(safeEpoch * 0.00013 + (safeTick + 1) * 12.9898);
  const tradeRoll = deterministicUnit(safeEpoch * 0.00021 + (safeTick + 1) * 78.233);

  return {
    percentDelta: roundToThousandths(percentRoll * 0.12 - 0.04),
    tradeDelta: roundToTenths(0.1 + tradeRoll * 0.1)
  };
}

function sanitizeUserState(state = {}) {
  const validAssets = new Set(["lyn", "bitcoin", "ethereum"]);
  const activityFeed = Array.isArray(state.activityFeed)
    ? state.activityFeed.map(sanitizeActivityItem).filter(Boolean).slice(0, 12)
    : [];
  const demoAmount = Number(state.demoAmount) || 0;
  const demoProfit = Number(state.demoProfit) || 0;
  const totalDeposited = Number(state.totalDeposited) || 0;
  const totalTraded = Number(state.totalTraded) || 0;
  const legacyRunning =
    demoAmount > 0 &&
    totalDeposited > 0 &&
    activityFeed.some((item) => item.type === "deposit");

  return {
    currentAsset: validAssets.has(state.currentAsset) ? state.currentAsset : "lyn",
    demoAmount,
    demoProfit,
    demoPercent: Number(state.demoPercent) || 0,
    totalDeposited,
    totalTraded,
    isDemoRunning: Boolean(state.isDemoRunning) || legacyRunning,
    simulationEpoch: Number(state.simulationEpoch) || 0,
    simulationTicks: Math.max(0, Number(state.simulationTicks) || 0),
    isHeroVisible: state.isHeroVisible !== false,
    activityFeed,
    updatedAt: Date.now()
  };
}

function getComparableUserState(state = {}) {
  const normalized = sanitizeUserState(state);

  return {
    currentAsset: normalized.currentAsset,
    demoAmount: normalized.demoAmount,
    demoProfit: normalized.demoProfit,
    demoPercent: normalized.demoPercent,
    totalDeposited: normalized.totalDeposited,
    totalTraded: normalized.totalTraded,
    isDemoRunning: normalized.isDemoRunning,
    simulationEpoch: normalized.simulationEpoch,
    simulationTicks: normalized.simulationTicks,
    isHeroVisible: normalized.isHeroVisible,
    activityFeed: normalized.activityFeed
  };
}

function hasUserStateChanged(previousState, nextState) {
  return JSON.stringify(getComparableUserState(previousState)) !== JSON.stringify(getComparableUserState(nextState));
}

function isIncomingSimulationAhead(existingState, incomingState) {
  if (incomingState.simulationEpoch !== existingState.simulationEpoch) {
    return incomingState.simulationEpoch > existingState.simulationEpoch;
  }

  return incomingState.simulationTicks >= existingState.simulationTicks;
}

function reconcileUserState(state = {}, now = Date.now()) {
  const currentState = sanitizeUserState(state);

  if (!currentState.isDemoRunning || currentState.demoAmount <= 0 || currentState.simulationEpoch <= 0) {
    return currentState;
  }

  const elapsedTicks = Math.min(
    Math.floor(Math.max(0, now - currentState.simulationEpoch) / SIMULATION_STEP_MS)
  );

  if (elapsedTicks <= currentState.simulationTicks) {
    return currentState;
  }

  let nextPercent =
    Number(currentState.demoPercent) ||
    (currentState.demoAmount > 0 ? roundToThousandths((currentState.demoProfit / currentState.demoAmount) * 100) : 0);
  let nextTotalTraded = currentState.totalTraded;
  let nextTicks = currentState.simulationTicks;
  for (let tick = currentState.simulationTicks; tick < elapsedTicks; tick += 1) {
    const { percentDelta, tradeDelta } = getSimulationStep(currentState.simulationEpoch, tick);
    nextPercent = Math.max(-1.5, Math.min(10, roundToThousandths(nextPercent + percentDelta)));
    nextTotalTraded = roundToTenths(nextTotalTraded + tradeDelta);
    nextTicks = tick + 1;
  }

  return sanitizeUserState({
    ...currentState,
    demoProfit: roundToCents((currentState.demoAmount * nextPercent) / 100),
    demoPercent: nextPercent,
    totalTraded: nextTotalTraded,
    simulationTicks: nextTicks,
    isDemoRunning: currentState.isDemoRunning
  });
}

async function advanceAllUserStates() {
  const store = await readUserStateStore();
  let changed = false;

  for (const [userId, state] of Object.entries(store)) {
    const reconciledState = reconcileUserState(state);

    if (hasUserStateChanged(state, reconciledState)) {
      store[userId] = reconciledState;
      changed = true;
    }
  }

  if (changed) {
    await writeUserStateStore(store);
  }
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
  const existing = reconcileUserState(existingState);
  const incoming = sanitizeUserState(incomingState);
  const mergedDemoAmount = Math.max(existing.demoAmount, incoming.demoAmount);
  const mergedTotalDeposited = Math.max(existing.totalDeposited, incoming.totalDeposited);
  const simulationSource = isIncomingSimulationAhead(existing, incoming) ? incoming : existing;
  const mergedTotalTraded = Math.max(existing.totalTraded, incoming.totalTraded, simulationSource.totalTraded);
  const mergedDemoProfit = roundToCents(simulationSource.demoProfit);
  const mergedDemoPercent =
    mergedDemoAmount > 0 ? roundToThousandths((mergedDemoProfit / mergedDemoAmount) * 100) : 0;

  return sanitizeUserState({
    currentAsset: incoming.currentAsset,
    demoAmount: mergedDemoAmount,
    demoProfit: mergedDemoProfit,
    demoPercent: mergedDemoPercent,
    totalDeposited: mergedTotalDeposited,
    totalTraded: mergedTotalTraded,
    isDemoRunning: simulationSource.isDemoRunning,
    simulationEpoch: simulationSource.simulationEpoch,
    simulationTicks: simulationSource.simulationTicks,
    isHeroVisible: incoming.isHeroVisible,
    activityFeed: mergeActivityFeed(existing.activityFeed, incoming.activityFeed)
  });
}

function getPrimaryAdminChatId() {
  return toUserKey(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_TEST_CHAT_ID);
}

function getAdminChatId(fallbackUserId = null) {
  return toUserKey(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_TEST_CHAT_ID || fallbackUserId);
}

function isAdminUser(userId) {
  const adminChatId = getPrimaryAdminChatId();
  return Boolean(adminChatId && userId && adminChatId === toUserKey(userId));
}

function getUserDisplayName(user = {}) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "Unknown";
}

function getTelegramProfile(message = {}) {
  const source = message.from || message.chat || {};

  return {
    id: String(source.id || ""),
    username: source.username || "",
    firstName: source.first_name || "",
    lastName: source.last_name || ""
  };
}

function getTelegramText(message = {}) {
  return String(message.text || message.caption || "").trim();
}

function getSupportRecipients(state) {
  return [...new Set([getPrimaryAdminChatId(), ...(state?.agents || [])].filter(Boolean))];
}

function isSupportAgent(state, userId) {
  const normalizedUserId = toUserKey(userId);
  return Boolean(normalizedUserId && state?.agents?.includes(normalizedUserId));
}

function isSupportStaff(state, userId) {
  const normalizedUserId = toUserKey(userId);
  return Boolean(normalizedUserId && (isAdminUser(normalizedUserId) || isSupportAgent(state, normalizedUserId)));
}

async function callTelegramApi(method, body = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const responsePayload = await response.json();

  if (!response.ok || !responsePayload.ok) {
    throw new Error(responsePayload.description || "Telegram Bot API rejected the request");
  }

  return responsePayload.result;
}

async function sendTelegramMessage(chatId, text) {
  if (!chatId) {
    throw new Error("Missing target chat id");
  }

  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text
  });
}

function upsertSupportThread(state, { userId, user, source, ticket = "", messageText = "" }) {
  const existing = state.threads[userId] || {};
  const nextThread = {
    userId,
    username: user.username || existing.username || "",
    displayName: getUserDisplayName(user) || existing.displayName || "Unknown",
    source: source || existing.source || "bot",
    status: "open",
    openedAt: existing.openedAt || Date.now(),
    updatedAt: Date.now(),
    lastTicket: ticket || existing.lastTicket || "",
    lastMessage: messageText ? String(messageText).slice(0, 1500) : existing.lastMessage || ""
  };

  state.threads[userId] = nextThread;
  return nextThread;
}

function registerSupportReplyTarget(state, chatId, messageId, userId) {
  if (!chatId || !messageId || !userId) {
    return;
  }

  state.replyMap[`${chatId}:${messageId}`] = {
    userId,
    createdAt: Date.now()
  };
}

async function notifySupportRecipients(state, userId, lines) {
  const recipients = getSupportRecipients(state);
  let notifiedCount = 0;

  for (const chatId of recipients) {
    try {
      const result = await sendTelegramMessage(chatId, lines.join("\n"));
      notifiedCount += 1;

      if (result?.message_id) {
        registerSupportReplyTarget(state, chatId, result.message_id, userId);
      }
    } catch (error) {
      console.error(`Failed to notify support recipient ${chatId}:`, error.message || error);
    }
  }

  return {
    notifiedCount,
    recipients
  };
}

async function createSupportRequest({ userId, user, source = "bot", ticket = "", messageText = "" }) {
  const supportState = await readSupportStateStore();
  const thread = upsertSupportThread(supportState, {
    userId,
    user,
    source,
    ticket,
    messageText
  });
  const lines = [
    "Pegasus support request",
    "",
    `User: ${thread.displayName}`,
    `Telegram ID: ${thread.userId}`,
    thread.username ? `Username: @${thread.username}` : null,
    `Source: ${thread.source}`,
    ticket ? `Ticket: ${ticket}` : null,
    messageText ? `Message: ${String(messageText).slice(0, 1500)}` : null,
    "",
    "Reply to this message to answer the user."
  ].filter(Boolean);
  const notifyResult = await notifySupportRecipients(supportState, userId, lines);

  await writeSupportStateStore(supportState);

  return {
    thread,
    ...notifyResult
  };
}

async function forwardSupportMessage({ userId, user, text }) {
  const supportState = await readSupportStateStore();
  const existing = supportState.threads[userId];

  if (!existing || existing.status !== "open") {
    return {
      forwarded: false,
      notifiedCount: 0
    };
  }

  const thread = upsertSupportThread(supportState, {
    userId,
    user,
    source: existing.source || "bot",
    ticket: existing.lastTicket || "",
    messageText: text
  });
  const lines = [
    "Pegasus support message",
    "",
    `User: ${thread.displayName}`,
    `Telegram ID: ${thread.userId}`,
    thread.username ? `Username: @${thread.username}` : null,
    thread.lastTicket ? `Ticket: ${thread.lastTicket}` : null,
    `Message: ${String(text).slice(0, 1500)}`,
    "",
    "Reply to this message to answer the user."
  ].filter(Boolean);
  const notifyResult = await notifySupportRecipients(supportState, userId, lines);

  await writeSupportStateStore(supportState);

  return {
    forwarded: notifyResult.notifiedCount > 0,
    ...notifyResult
  };
}

async function sendSupportReply(targetUserId, replyText) {
  const text = String(replyText || "").trim();

  if (!targetUserId || !text) {
    return false;
  }

  await sendTelegramMessage(targetUserId, `PEGASUS Support\n\n${text}`);
  return true;
}

async function handleTelegramCommand(message) {
  const senderId = toUserKey(message.from?.id || message.chat?.id);
  const text = getTelegramText(message);
  const user = getTelegramProfile(message);

  if (!senderId || !text.startsWith("/")) {
    return false;
  }

  if (/^\/add(?:@\w+)?\b/i.test(text)) {
    if (!isAdminUser(senderId)) {
      await sendTelegramMessage(senderId, "Admin access required.");
      return true;
    }

    const targetId = toUserKey(text.split(/\s+/)[1]);

    if (!targetId) {
      await sendTelegramMessage(senderId, "Usage: /add <telegram_id>");
      return true;
    }

    const supportState = await readSupportStateStore();

    if (!supportState.agents.includes(targetId)) {
      supportState.agents.push(targetId);
      await writeSupportStateStore(supportState);
    }

    await sendTelegramMessage(senderId, `Support agent ${targetId} added.`);

    try {
      await sendTelegramMessage(
        targetId,
        "You were added as a PEGASUS support agent. Reply to support messages from the bot to answer users."
      );
    } catch {
      return true;
    }

    return true;
  }

  if (/^\/reply(?:@\w+)?\b/i.test(text)) {
    const supportState = await readSupportStateStore();

    if (!isSupportStaff(supportState, senderId)) {
      await sendTelegramMessage(senderId, "Support access required.");
      return true;
    }

    const match = text.match(/^\/reply(?:@\w+)?\s+(\d+)\s+([\s\S]+)/i);

    if (!match) {
      await sendTelegramMessage(senderId, "Usage: /reply <telegram_id> <message>");
      return true;
    }

    try {
      await sendSupportReply(match[1], match[2]);
      await sendTelegramMessage(senderId, `Reply sent to ${match[1]}.`);
    } catch (error) {
      await sendTelegramMessage(senderId, error.message || "Failed to send reply.");
    }

    return true;
  }

  if (/^\/support(?:@\w+)?\b/i.test(text)) {
    const messageText = text.replace(/^\/support(?:@\w+)?\s*/i, "").trim();

    try {
      const result = await createSupportRequest({
        userId: senderId,
        user,
        source: "bot",
        messageText
      });

      if (result.notifiedCount === 0) {
        await sendTelegramMessage(senderId, "Support is currently unavailable. Please try again later.");
        return true;
      }

      await sendTelegramMessage(senderId, "Support request created. An operator will reply in this chat.");
    } catch (error) {
      await sendTelegramMessage(senderId, error.message || "Failed to create support request.");
    }

    return true;
  }

  return false;
}

async function handleSupportStaffReply(message) {
  const senderId = toUserKey(message.from?.id || message.chat?.id);
  const replyToMessageId = Number(message.reply_to_message?.message_id);
  const replyText = getTelegramText(message);

  if (!senderId || !replyToMessageId || !replyText) {
    return false;
  }

  const supportState = await readSupportStateStore();

  if (!isSupportStaff(supportState, senderId)) {
    return false;
  }

  const targetUserId = supportState.replyMap[`${senderId}:${replyToMessageId}`]?.userId;

  if (!targetUserId) {
    return false;
  }

  try {
    await sendSupportReply(targetUserId, replyText);
    await sendTelegramMessage(senderId, `Reply sent to ${targetUserId}.`);

    if (supportState.threads[targetUserId]) {
      supportState.threads[targetUserId] = {
        ...supportState.threads[targetUserId],
        updatedAt: Date.now()
      };
      await writeSupportStateStore(supportState);
    }
  } catch (error) {
    await sendTelegramMessage(senderId, error.message || "Failed to send reply.");
  }

  return true;
}

async function handleTelegramMessage(message) {
  const senderId = toUserKey(message.from?.id || message.chat?.id);
  const text = getTelegramText(message);
  const user = getTelegramProfile(message);

  if (!senderId) {
    return;
  }

  if (await handleTelegramCommand(message)) {
    return;
  }

  if (await handleSupportStaffReply(message)) {
    return;
  }

  const supportState = await readSupportStateStore();

  if (isSupportStaff(supportState, senderId)) {
    if (text) {
      await sendTelegramMessage(senderId, "Reply to a support message from the bot to answer the user.");
    }
    return;
  }

  if (!text) {
    return;
  }

  const forwardResult = await forwardSupportMessage({
    userId: senderId,
    user,
    text
  });

  if (forwardResult.forwarded) {
    await sendTelegramMessage(senderId, "Your message was forwarded to support.");
    return;
  }

  await sendTelegramMessage(senderId, "Send /support to contact a live operator.");
}

async function startTelegramPolling() {
  if (telegramPollingStarted || !process.env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  telegramPollingStarted = true;

  try {
    await callTelegramApi("deleteWebhook", {
      drop_pending_updates: false
    });
  } catch (error) {
    console.error("Failed to drop Telegram webhook:", error.message || error);
  }

  const poll = async () => {
    try {
      const updates = await callTelegramApi("getUpdates", {
        offset: telegramUpdateOffset,
        timeout: 45,
        allowed_updates: ["message"]
      });

      for (const update of updates) {
        telegramUpdateOffset = update.update_id + 1;

        if (update.message) {
          await handleTelegramMessage(update.message);
        }
      }
    } catch (error) {
      console.error("Telegram polling error:", error.message || error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    setImmediate(poll);
  };

  poll();
}

function getTelegramWebhookUrl() {
  const baseUrl =
    process.env.TELEGRAM_WEBHOOK_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.APP_BASE_URL;

  if (!baseUrl) {
    return "";
  }

  return new URL("/api/telegram/webhook", baseUrl).toString();
}

function getTelegramUpdateMode() {
  return String(process.env.TELEGRAM_UPDATE_MODE || "auto").trim().toLowerCase();
}

async function startTelegramUpdates() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  const mode = getTelegramUpdateMode();
  const webhookUrl = getTelegramWebhookUrl();

  if (mode === "off") {
    console.log("Telegram updates are disabled.");
    return;
  }

  if (mode !== "polling" && webhookUrl) {
    try {
      await callTelegramApi("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message"],
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined
      });
      console.log(`Telegram webhook registered: ${webhookUrl}`);
      return;
    } catch (error) {
      console.error("Failed to register Telegram webhook:", error.message || error);

      if (mode === "webhook") {
        return;
      }
    }
  }

  if (mode === "webhook" && !webhookUrl) {
    console.error("Telegram webhook mode requested, but no public webhook URL is configured.");
    return;
  }

  await startTelegramPolling();
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
          ? "Bearish"
          : "Bullish"
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
    const previousState = store[userId] || null;
    const nextState = previousState ? reconcileUserState(previousState) : null;

    if (previousState && hasUserStateChanged(previousState, nextState)) {
      store[userId] = nextState;
      await writeUserStateStore(store);
    }

    return res.json({
      ok: true,
      state: nextState
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
    const mergedState = mergeUserState(store[userId], req.body?.state);
    const reconciledState = reconcileUserState(mergedState);
    const shouldWrite = !store[userId] || hasUserStateChanged(store[userId], reconciledState);

    store[userId] = reconciledState;

    if (shouldWrite) {
      await writeUserStateStore(store);
    }

    return res.json({
      ok: true,
      state: reconciledState
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to save user state"
    });
  }
});

app.post("/api/support/request", async (req, res) => {
  const userId = toUserKey(req.body?.userId);
  const user = req.body?.user || {};
  const ticket = req.body?.ticket ? String(req.body.ticket) : "";
  const origin = req.body?.origin ? String(req.body.origin) : "mini-app";

  if (!userId) {
    return res.status(400).json({
      error: "Invalid Telegram user id"
    });
  }

  try {
    const result = await createSupportRequest({
      userId,
      user,
      source: origin,
      ticket
    });

    if (result.notifiedCount === 0) {
      return res.status(503).json({
        error: "No support recipients configured"
      });
    }

    return res.json({
      ok: true,
      request: result.thread,
      notifiedCount: result.notifiedCount
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to create support request"
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
    const adminChatId = getAdminChatId(userId);
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
    const currentState = reconcileUserState(userStore[request.userId] || {});
    const amount = Number(request.amountUsd) || 0;
    const nextDemoAmount = Number((currentState.demoAmount + amount).toFixed(2));
    const nextTotalDeposited = Number((currentState.totalDeposited + amount).toFixed(2));
    const nextDemoPercent = nextDemoAmount > 0 ? roundToThousandths((currentState.demoProfit / nextDemoAmount) * 100) : 0;
    const nextSimulationEpoch = Date.now();
    const nextActivityFeed = [
      {
        type: "deposit",
        amount: `+$${amount.toFixed(2)}`,
        asset: request.symbol,
        timestamp: Date.now()
      },
      ...(currentState.activityFeed || []).filter((item) => item.type !== "deposit-pending")
    ].slice(0, 12);

    userStore[request.userId] = sanitizeUserState({
      ...currentState,
      demoAmount: nextDemoAmount,
      demoProfit: currentState.demoProfit,
      demoPercent: nextDemoPercent,
      totalDeposited: nextTotalDeposited,
      totalTraded: currentState.totalTraded,
      isDemoRunning: true,
      simulationEpoch: nextSimulationEpoch,
      simulationTicks: 0,
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

function startSimulationLoop() {
  if (simulationLoopStarted) {
    return;
  }

  simulationLoopStarted = true;

  setInterval(() => {
    void advanceAllUserStates().catch((error) => {
      console.error("Simulation loop error:", error.message || error);
    });
  }, SIMULATION_STEP_MS);
}

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

app.post("/api/telegram/webhook", async (req, res) => {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerToken = req.get("x-telegram-bot-api-secret-token");

  if (secretToken && headerToken !== secretToken) {
    return res.status(403).json({
      error: "Invalid Telegram webhook token"
    });
  }

  try {
    if (req.body?.message) {
      await handleTelegramMessage(req.body.message);
    }

    return res.json({
      ok: true
    });
  } catch (error) {
    console.error("Telegram webhook error:", error.message || error);
    return res.status(200).json({
      ok: false
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
  startSimulationLoop();
  void startTelegramUpdates();
});
