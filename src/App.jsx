import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import pegasusMark from "./assets/pegasus-mark.svg";

const LANGUAGE_STORAGE_KEY = "pegas-language";
const TAB_ORDER = ["home", "earnings", "rewards", "activity", "news"];
const TAB_TRANSITION_MS = 420;
const EXCHANGE_FEE_RATE = 0.006;
const MIN_DEPOSIT_AMOUNT = 20;
const HERO_DISMISS_MS = 420;
const HOME_ACTION_DELAY_MS = 220;
const WITHDRAW_UNLOCK_VOLUME = 500;
const DEPOSIT_GENERATION_DELAY_MS = 520;
const SIMULATION_STEP_MS = 5000;

const depositAssetMeta = {
  BTC: {
    name: "Bitcoin",
    network: "BTC",
    usdPrice: 43210,
    decimals: 6,
    address: "bc1qcps30ljm5e547489spjgpr6yygv2dwzhcuz9wx"
  },
  ETH: {
    name: "Ethereum",
    network: "ERC-20",
    usdPrice: 2280,
    decimals: 5,
    address: "0xc92358875686C8B4C5c93043899Ab8d239ae4cCB"
  },
  USDT: {
    name: "Tether",
    network: "ERC-20",
    usdPrice: 1,
    decimals: 2,
    address: "0xc92358875686C8B4C5c93043899Ab8d239ae4cCB"
  },
  DOGE: {
    name: "Dogecoin",
    network: "DOGE",
    usdPrice: 0.082,
    decimals: 2,
    address: "DDjv4o6dA2YBbo18b4dzk6NmRx2PEX4P7A"
  },
  SOL: {
    name: "Solana",
    network: "SOL",
    usdPrice: 145,
    decimals: 4,
    address: "HQ2Ea3zXmv5x8axce5nsgZKBPCMkZGCPJoQnmjQzoYeh"
  }
};

const assetMeta = {
  lyn: {
    pair: "LYN / USD",
    short: "LYN",
    api: "lyn"
  },
  bitcoin: {
    pair: "BTC / USD",
    short: "BTC",
    api: "bitcoin"
  },
  ethereum: {
    pair: "ETH / USD",
    short: "ETH",
    api: "ethereum"
  }
};

const quickActions = [
  { icon: "+", key: "deposit" },
  { icon: "⇄", key: "exchange" },
  { icon: "↓", key: "reward" },
  { icon: "↑", key: "send" }
];

const defaultActivities = [];

const uiText = {
  zh: {
    locale: "zh-CN",
    languageSwitchLabel: "语言切换",
    brand: {
      main: "PEGASUS",
      sub: "MARKET AUTOPILOT"
    },
    hero: {
      closeLabel: "关闭横幅",
      tag: "AI Capital Autopilot",
      title: "充值余额。PEGASUS 会扫描、读取并管理交易。",
      description:
        "模型会跟踪最新资讯、评估市场动能，并自动执行交易，无需手动操作。",
      tags: ["AI news scan", "autopilot entry", "smart risk exit"]
    },
    quickActions: {
      deposit: "充值",
      exchange: "兑换",
      reward: "奖励",
      send: "发送"
    },
    nav: {
      home: "首页",
      earnings: "收益",
      rewards: "奖励",
      news: "新闻"
    },
    modal: {
      depositTitle: "充值余额",
      amountTitle: "输入美元金额",
      currencyLabel: "加密货币",
      walletTitle: "转账钱包",
      walletLabel: "钱包地址",
      networkLabel: "网络",
      amountUsdLabel: "金额",
      amountCryptoLabel: "需转入",
      ticketLabel: "交易编号",
      notice:
        "部分交易可能失败。如果资金 20 分钟内未到账，请务必联系支持并提供交易编号。",
      generate: "生成钱包",
      confirm: "我已转账",
      support: "联系客服",
      cancel: "取消",
      submit: "充值余额"
    },
    exchange: {
      tag: "兑换",
      title: "选择图表和兑换资产",
      close: "关闭"
    },
    home: {
      capitalTag: "资金",
      balanceRunningNote: "PEGASUS 正在管理仓位并实时重算收益。",
      balanceClosedNote: "本轮已结束。你可以再次充值并启动 AI。",
      balanceIdleNote: "充值后即可启动 AI 模式并交给引擎执行。",
      depositButton: "充值余额",
      withdrawButton: "提现",
      marketModeLabel: "模式",
      marketModeValue: "AI 自动驾驶",
      marketTrendLabel: "市场趋势",
      marketTrendValue: "看涨",
      marketCoreTag: "市场核心",
      priceLabel: "价格",
      totalTradedLabel: "总交易量",
      swapFeeLabel: "兑换手续费",
      activityTag: "活动",
      activityTitle: "最近记录",
      activityEmpty: "暂时还没有记录。充值或兑换后，历史会显示在这里。",
      marketFeedTag: "市场流",
      incomeMini: "收益",
      syncBadge: "sync",
      connection: "连接中",
      rangeLabel: "24h",
      supportTag: "支持",
      supportTitle: "客服支持",
      supportCopy: "如果你在充值、兑换或奖励方面需要帮助，支持团队会手动接入。",
      supportLink: "联系支持",
      newsTag: "新闻",
      newsTitle: "PEGASUS 当前看到的市场",
      newsAll: "全部",
      pinnedLabel: "置顶",
      whyTag: "为什么选择 PEGASUS",
      whyTitle: "为什么它像真正的 AI 交易运营",
      legal: "(C) Pegasus GPT - 版权所有 2025-2026。"
    },
    earnings: {
      tag: "收益",
      title: "实时收益展示",
      engineTag: "引擎",
      sourceTitle: "PEGASUS 从哪里获取利润",
      shareLabel: "机器人份额"
    },
    rewards: {
      tag: "奖励",
      title: "奖励",
      activate: "激活",
      statusDone: "已完成",
      statusProgress: "进行中"
    },
    admin: {
      open: "Admin",
      title: "充值申请",
      refresh: "刷新",
      empty: "当前没有待处理申请。",
      approve: "确认",
      approving: "确认中...",
      pending: "待处理",
      amount: "金额",
      user: "用户",
      created: "创建时间"
    },
    activityPage: {
      tag: "活动流",
      title: "最近记录",
      back: "返回"
    },
    newsPage: {
      tag: "新闻流",
      title: "币种新闻"
    },
    aiStatus: [
      { label: "新闻扫描", value: "24/7" },
      { label: "入场模式", value: "AI" },
      { label: "离场模式", value: "AUTO" }
    ],
    earningsSources: [
      {
        name: "LYN impulse engine",
        share: "1.8%",
        note: "PEGASUS 在确认加速后入场，并捕捉其中一部分涨幅。"
      },
      {
        name: "BTC news reaction",
        share: "2.4%",
        note: "模型读取新闻背景，并在市场强烈重定价时入场。"
      },
      {
        name: "ETH volatility range",
        share: "1.5%",
        note: "自动驾驶捕捉短线回撤和剧烈日内波动。"
      }
    ],
    rewardPrograms: [
      {
        title: "充值 $100",
        reward: "+$20",
        target: 100,
        type: "deposit",
        note: "充值后 3 天内可获得 $20 奖励。"
      },
      {
        title: "充值 $250",
        reward: "+$55",
        target: 250,
        type: "deposit",
        note: "更高等级充值奖励，并加速 AI 启动。"
      },
      {
        title: "充值 $500",
        reward: "+$120",
        target: 500,
        type: "deposit",
        note: "解锁更强的仓位管理模式和更高奖励。"
      },
      {
        title: "总交易量 $2000",
        reward: "+$20",
        target: 2000,
        type: "trading",
        note: "达到该交易量后 3 天内可获得 $20。"
      },
      {
        title: "总交易量 $5000",
        reward: "+$65",
        target: 5000,
        type: "trading",
        note: "达到该交易量后可解锁更高的活跃奖励。"
      },
      {
        title: "总交易量 $12000",
        reward: "+$180",
        target: 12000,
        type: "trading",
        note: "面向高活跃余额与长时 AI 会话的旗舰奖励。"
      }
    ],
    pinnedStory: {
      coin: "PEGASUS x LYN",
      title: "PEGASUS 与 LYN 开启合作，让 AI 币交易变得更简单。",
      description: "新模式强化 AI 新闻扫描，并加快 LYN 上的自动驾驶节奏。",
      trend: "bullish",
      pinned: true
    },
    marketStatus: {
      bullish: "看涨",
      bearish: "看跌"
    },
    alerts: {
      withdrawBeta: (ticket) =>
        `提现申请已创建。编号 ${ticket}。请联系支持并提供收款钱包地址。`,
      withdrawNeedVolume: (required, current) =>
        `提现仅在总交易量达到 $${required} 后开放。当前：$${current.toFixed(1)}。`,
      supportBeta: "支持请求将在下一次更新中接入。",
      supportTicket: (ticket) =>
        `如果资金 20 分钟内未到账，请联系支持并提供交易编号 ${ticket}。`,
      supportRequestSent: "支持请求已发送。客服会在 Telegram 中联系你。",
      supportRequestFailed: "无法发送支持请求。",
      depositRequestSent: (ticket) =>
        `申请 ${ticket} 已发送给管理员审核。余额将在确认后入账。`,
      depositRequestWarning: (ticket) =>
        `申请 ${ticket} 已保存，但 Telegram 通知未发送。请检查 TELEGRAM_BOT_TOKEN 和 TELEGRAM_ADMIN_CHAT_ID。`,
      depositRequestFailed: "无法提交充值申请。",
      adminLoadFailed: "无法加载管理员申请。",
      adminApproveDone: (ticket) => `充值 ${ticket} 已确认。`,
      adminApproveFailed: "无法确认该充值申请。",
      telegramSessionRequired: "该操作仅可在 Telegram Mini App 内使用。",
      amountInvalid: "请输入美元金额。",
      amountMinimum: (min) => `最低充值金额为 $${min}。`,
      sendNeedDeposit: "请先充值余额。",
      sendNeedVolume: "发送功能将在总交易量达到 $500 后开放。",
      sendNeedBalance: "余额不足，无法发送。",
      sendDone: "发送完成。",
      exchangeCurrent: (asset) => `当前已选择 ${asset}。`,
      exchangeChanged: (from, to, fee) =>
        `资产已切换：${from} -> ${to}${fee > 0 ? `，手续费 $${fee.toFixed(2)}` : ""}。`
    },
    activity: {
      depositTitle: "已充值",
      depositNote: "余额已充值，AI 会话已启动。",
      depositPendingTitle: "充值申请",
      depositPendingNote: "支付已发送，等待管理员人工审核。",
      exchangeTitle: "已兑换",
      exchangeNote: (from, to) => `${from} -> ${to}，已扣除兑换手续费。`,
      modeTitle: "市场模式",
      modeNote: (from, to) => `图表已从 ${from} 切换到 ${to}。`,
      sendTitle: "已发送",
      sendNote: "在交易量解锁后，从交易余额中发起转账。"
    }
  },
  en: {
    locale: "en-US",
    languageSwitchLabel: "Language switch",
    brand: {
      main: "PEGASUS",
      sub: "MARKET AUTOPILOT"
    },
    hero: {
      closeLabel: "Close banner",
      tag: "AI Capital Autopilot",
      title: "Fund the balance. PEGASUS scans, reads, and manages the trade.",
      description:
        "The model watches the latest headlines, measures momentum, and runs the trading autopilot without manual routine.",
      tags: ["AI news scan", "autopilot entry", "smart risk exit"]
    },
    quickActions: {
      deposit: "Deposit",
      exchange: "Swap",
      reward: "Rewards",
      send: "Send"
    },
    nav: {
      home: "Home",
      earnings: "Income",
      rewards: "Rewards",
      news: "News"
    },
    modal: {
      depositTitle: "Fund balance",
      amountTitle: "Enter amount in USD",
      currencyLabel: "Cryptocurrency",
      walletTitle: "Transfer wallet",
      walletLabel: "Wallet address",
      networkLabel: "Network",
      amountUsdLabel: "Amount",
      amountCryptoLabel: "Send",
      ticketLabel: "Transaction number",
      notice:
        "Some transactions may fail. If funds do not arrive within 20 minutes, contact support and provide the transaction number.",
      generate: "Generate wallet",
      confirm: "I sent the funds",
      support: "Support",
      cancel: "Cancel",
      submit: "Fund balance"
    },
    exchange: {
      tag: "Swap",
      title: "Choose an asset for chart and swap",
      close: "Close"
    },
    home: {
      capitalTag: "Capital",
      balanceRunningNote: "PEGASUS is already managing the position and recalculating profit live.",
      balanceClosedNote: "Session closed. You can fund again and launch AI.",
      balanceIdleNote: "Add funds to start AI mode and hand execution over to the engine.",
      depositButton: "Fund balance",
      withdrawButton: "Withdraw",
      marketModeLabel: "Mode",
      marketModeValue: "AI autopilot",
      marketTrendLabel: "Market trend",
      marketTrendValue: "Bullish",
      marketCoreTag: "Market core",
      priceLabel: "Price",
      totalTradedLabel: "Total traded",
      swapFeeLabel: "Swap fee",
      activityTag: "Activity",
      activityTitle: "Recent activity",
      activityEmpty: "No activity yet. After a deposit or swap, history will appear here.",
      marketFeedTag: "Market feed",
      incomeMini: "Income",
      syncBadge: "sync",
      connection: "connecting",
      rangeLabel: "24h",
      supportTag: "Support",
      supportTitle: "Support",
      supportCopy: "If you need help with deposits, swaps, or rewards, support will connect manually.",
      supportLink: "Open support",
      newsTag: "News",
      newsTitle: "What PEGASUS sees right now",
      newsAll: "All",
      pinnedLabel: "Pinned",
      whyTag: "Why PEGASUS",
      whyTitle: "Why this feels like an AI operation",
      legal: "(C) Pegasus GPT - All rights reserved 2025-2026."
    },
    earnings: {
      tag: "Income",
      title: "How live income looks",
      engineTag: "Engine",
      sourceTitle: "Where PEGASUS captures margin",
      shareLabel: "bot share"
    },
    rewards: {
      tag: "Rewards",
      title: "Rewards",
      activate: "Activate",
      statusDone: "done",
      statusProgress: "in progress"
    },
    admin: {
      open: "Admin",
      title: "Funding requests",
      refresh: "Refresh",
      empty: "There are no pending requests right now.",
      approve: "Approve",
      approving: "Approving...",
      pending: "pending",
      amount: "Amount",
      user: "User",
      created: "Created"
    },
    activityPage: {
      tag: "Activity feed",
      title: "Recent activity",
      back: "Back"
    },
    newsPage: {
      tag: "News feed",
      title: "Coin news"
    },
    aiStatus: [
      { label: "News scan", value: "24/7" },
      { label: "Entry mode", value: "AI" },
      { label: "Exit mode", value: "AUTO" }
    ],
    earningsSources: [
      {
        name: "LYN impulse engine",
        share: "1.8%",
        note: "PEGASUS enters after confirmed acceleration and takes a slice of the move."
      },
      {
        name: "BTC news reaction",
        share: "2.4%",
        note: "The model reads the news backdrop and enters during strong market repricing."
      },
      {
        name: "ETH volatility range",
        share: "1.5%",
        note: "The autopilot captures short reversals and sharp intraday swings."
      }
    ],
    rewardPrograms: [
      {
        title: "Deposit $100",
        reward: "+$20",
        target: 100,
        type: "deposit",
        note: "You will receive $20 within 3 days after funding."
      },
      {
        title: "Deposit $250",
        reward: "+$55",
        target: 250,
        type: "deposit",
        note: "Higher bonus for the second funding tier and a stronger AI start."
      },
      {
        title: "Deposit $500",
        reward: "+$120",
        target: 500,
        type: "deposit",
        note: "Unlocks a stronger position-management mode and a larger bonus."
      },
      {
        title: "Total trading $2000",
        reward: "+$20",
        target: 2000,
        type: "trading",
        note: "You will receive $20 within 3 days after reaching the volume."
      },
      {
        title: "Total trading $5000",
        reward: "+$65",
        target: 5000,
        type: "trading",
        note: "After this volume, a higher activity reward becomes available."
      },
      {
        title: "Total trading $12000",
        reward: "+$180",
        target: 12000,
        type: "trading",
        note: "Flagship reward for a highly active balance and long AI sessions."
      }
    ],
    pinnedStory: {
      coin: "PEGASUS x LYN",
      title: "PEGASUS launched a collaboration with LYN. Earning on an AI coin is now simpler.",
      description: "The new mode boosts the AI news scan and speeds up the autopilot on LYN.",
      trend: "bullish",
      pinned: true
    },
    marketStatus: {
      bullish: "Bullish",
      bearish: "Bearish"
    },
    alerts: {
      withdrawBeta: (ticket) =>
        `Withdrawal request created. Ticket ${ticket}. Send it to support and include the wallet for payout.`,
      withdrawNeedVolume: (required, current) =>
        `Withdrawal attempts unlock only after total bot trading reaches $${required}. Current volume: $${current.toFixed(1)}.`,
      supportBeta: "Support will connect in the next update.",
      supportTicket: (ticket) =>
        `If funds do not arrive within 20 minutes, contact support and provide transaction number ${ticket}.`,
      supportRequestSent: "Support request sent. The operator will contact you in Telegram.",
      supportRequestFailed: "Failed to send the support request.",
      depositRequestSent: (ticket) =>
        `Request ${ticket} was sent to the admin for review. Balance will be credited only after approval.`,
      depositRequestWarning: (ticket) =>
        `Request ${ticket} was saved, but the Telegram notification was not sent. Check TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID.`,
      depositRequestFailed: "Failed to submit the funding request.",
      adminLoadFailed: "Failed to load admin requests.",
      adminApproveDone: (ticket) => `Funding ${ticket} was approved.`,
      adminApproveFailed: "Failed to approve the funding request.",
      telegramSessionRequired: "Deposit confirmation works only inside the Telegram Mini App.",
      amountInvalid: "Enter an amount in USD.",
      amountMinimum: (min) => `Minimum funding amount is $${min}.`,
      sendNeedDeposit: "You need to fund the balance first.",
      sendNeedVolume: "Send unlocks after total trading volume reaches $500.",
      sendNeedBalance: "Not enough funds to send.",
      sendDone: "Transfer completed.",
      exchangeCurrent: (asset) => `${asset} is already selected.`,
      exchangeChanged: (from, to, fee) =>
        `Asset switched: ${from} -> ${to}${fee > 0 ? `, fee $${fee.toFixed(2)}` : ""}.`
    },
    activity: {
      depositTitle: "Funded",
      depositNote: "Balance funded. AI session launched.",
      depositPendingTitle: "Funding request",
      depositPendingNote: "Payment was sent for manual admin review.",
      exchangeTitle: "Swapped",
      exchangeNote: (from, to) => `${from} -> ${to}, swap fee applied.`,
      modeTitle: "Market mode",
      modeNote: (from, to) => `Chart switched from ${from} to ${to}.`,
      sendTitle: "Sent",
      sendNote: "Transfer made from trading balance after volume unlock."
    }
  }
};

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "zh" ? "zh" : "en";
};

const isBearishTrend = (trend) => /bear|down|跌|空/i.test(String(trend || ""));

const localizeTrend = (trend, copy) =>
  isBearishTrend(trend) ? copy.marketStatus.bearish : copy.marketStatus.bullish;

const createReferenceNumber = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const getTelegramUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (!user?.id) {
    return null;
  }

  return {
    id: String(user.id),
    username: user.username || "",
    firstName: user.first_name || "",
    lastName: user.last_name || ""
  };
};

const getPersistedStateKey = (userId) => `pegas-app-state:${userId || "guest"}`;

function App() {
  const [tab, setTab] = useState("home");
  const [language, setLanguage] = useState(getInitialLanguage);
  const [currentAsset, setCurrentAsset] = useState("lyn");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [isExchangeOpen, setExchangeOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
  const [depositCurrency, setDepositCurrency] = useState("USDT");
  const [generatedDeposit, setGeneratedDeposit] = useState(null);
  const [isDepositGenerating, setDepositGenerating] = useState(false);
  const [isDepositConfirming, setDepositConfirming] = useState(false);
  const [demoAmount, setDemoAmount] = useState(0);
  const [demoProfit, setDemoProfit] = useState(0);
  const [demoPercent, setDemoPercent] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [totalTraded, setTotalTraded] = useState(0);
  const [isDemoRunning, setDemoRunning] = useState(false);
  const [simulationEpoch, setSimulationEpoch] = useState(0);
  const [simulationTicks, setSimulationTicks] = useState(0);
  const [marketData, setMarketData] = useState(null);
  const [latestNews, setLatestNews] = useState([]);
  const [activityFeed, setActivityFeed] = useState(defaultActivities);
  const [isHeroVisible, setHeroVisible] = useState(true);
  const [isHeroClosing, setHeroClosing] = useState(false);
  const [outgoingTab, setOutgoingTab] = useState(null);
  const [isTabAnimating, setTabAnimating] = useState(false);
  const [tabDirection, setTabDirection] = useState(1);
  const [pendingHomeAction, setPendingHomeAction] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [isTelegramReady, setTelegramReady] = useState(false);
  const [isStateHydrated, setStateHydrated] = useState(false);
  const [isAdmin, setAdmin] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [isAdminLoading, setAdminLoading] = useState(false);
  const [approvingTicket, setApprovingTicket] = useState(null);
  const heroDismissRef = useRef(null);
  const tabTransitionRef = useRef(null);
  const actionDelayRef = useRef(null);
  const depositGenerationRef = useRef(null);

  const copy = uiText[language];
  const currentAssetMeta = assetMeta[currentAsset];
  const balance = demoAmount + demoProfit;
  const newsFeed = useMemo(() => [copy.pinnedStory, ...latestNews], [copy.pinnedStory, latestNews]);
  const featuredNews = newsFeed.slice(0, 2);
  const activityPreview = activityFeed.slice(0, 2);
  const hasMoreActivities = activityFeed.length > 2;
  const hasPendingDeposit = activityFeed.some((item) => item.type === "deposit-pending");
  const rewardPrograms = copy.rewardPrograms;
  const pendingAdminCount = pendingDeposits.length;
  const persistedAppState = useMemo(
    () => ({
      currentAsset,
      demoAmount,
      demoProfit,
      demoPercent,
      totalDeposited,
      totalTraded,
      isDemoRunning,
      simulationEpoch,
      simulationTicks,
      isHeroVisible,
      activityFeed
    }),
    [
      activityFeed,
      currentAsset,
      demoAmount,
      demoPercent,
      demoProfit,
      isDemoRunning,
      isHeroVisible,
      simulationEpoch,
      simulationTicks,
      totalDeposited,
      totalTraded
    ]
  );
  const candleSeries = useMemo(() => {
    if (!marketData?.ohlc?.length) {
      return [];
    }

    return marketData.ohlc.slice(-32).map((item) => ({
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4]
    }));
  }, [marketData]);

  const candleScale = useMemo(() => {
    if (!candleSeries.length) {
      return { normalize: () => 50 };
    }

    const highs = candleSeries.map((item) => item.high);
    const lows = candleSeries.map((item) => item.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const rawRange = max - min;
    const padding = rawRange > 0 ? rawRange * 0.16 : Math.max(Math.abs(max || 1) * 0.003, 0.00000001);
    const visualMin = Math.max(0, min - padding);
    const visualMax = max + padding;
    const range = Math.max(visualMax - visualMin, 0.00000001);

    const normalize = (value) => ((value - visualMin) / range) * 100;

    return { normalize };
  }, [candleSeries]);

  const formatMarketPrice = (value) => {
    if (!Number.isFinite(value)) {
      return "--";
    }

    if (value < 0.01) {
      return value.toFixed(6);
    }

    if (value < 1) {
      return value.toFixed(4);
    }

    return value.toLocaleString(copy.locale, {
      maximumFractionDigits: 2
    });
  };

  const formatSignedMoney = (value) => {
    const absValue = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}$${absValue.toFixed(2)}`;
  };

  const formatMoney = (value) =>
    `$${value.toLocaleString(copy.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatSignedPercent = (value) => {
    const absValue = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}${absValue.toFixed(2)}%`;
  };

  const formatActivityStamp = (timestamp) => {
    const moment = new Date(timestamp);

    return {
      date: moment.toLocaleDateString(copy.locale),
      time: moment.toLocaleTimeString(copy.locale, {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
  };

  const formatAdminStamp = (timestamp) =>
    new Date(timestamp).toLocaleString(copy.locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

  const getActivityContent = (item) => {
    if (item.type === "deposit") {
      return {
        icon: "+",
        title: copy.activity.depositTitle,
        note: copy.activity.depositNote
      };
    }

    if (item.type === "deposit-pending") {
      return {
        icon: "⌛",
        title: copy.activity.depositPendingTitle,
        note: copy.activity.depositPendingNote
      };
    }

    if (item.type === "exchange") {
      return {
        icon: "⇄",
        title: copy.activity.exchangeTitle,
        note: copy.activity.exchangeNote(item.from, item.to)
      };
    }

    if (item.type === "send") {
      return {
        icon: "↑",
        title: copy.activity.sendTitle,
        note: copy.activity.sendNote
      };
    }

    return {
      icon: "•",
      title: copy.activity.modeTitle,
      note: copy.activity.modeNote(item.from, item.to)
    };
  };

  const renderActivityItems = (items) =>
    items.map((item, index) => {
      const activityCopy = getActivityContent(item);
      const stamp = formatActivityStamp(item.timestamp);

      return (
        <article className="activity-card" key={`${item.type}-${item.timestamp}-${index}`}>
          <div className="activity-icon-wrap">
            <span className="activity-icon">{activityCopy.icon}</span>
          </div>
          <div className="activity-main">
            <div className="activity-head">
              <div>
                <strong>{activityCopy.title}</strong>
                <div className="activity-stamp">
                  <span>{stamp.date}</span>
                  <span>{stamp.time}</span>
                </div>
              </div>
              <div className="activity-side">
                <strong className="activity-amount">{item.amount}</strong>
                <span className="activity-asset">{item.asset}</span>
              </div>
            </div>
            <p className="activity-note">{activityCopy.note}</p>
          </div>
        </article>
      );
    });

  const renderNewsItems = (items) =>
    items.map((item, index) => {
      const trendLabel = localizeTrend(item.trend, copy);

      return (
        <div className={item.pinned ? "news-item pinned-item" : "news-item"} key={`${item.link || item.title}-${index}`}>
          <div className="news-copy">
            {item.pinned && <span className="pin-badge">{copy.home.pinnedLabel}</span>}
            <strong>{item.coin}</strong>
            <p>{item.title || item.headline}</p>
          </div>
          <span className={isBearishTrend(item.trend) ? "negative" : "positive"}>{trendLabel}</span>
        </div>
      );
    });

  const applyPersistedState = useCallback((state) => {
    if (!state) {
      return;
    }

    const nextDemoAmount = Number(state.demoAmount) || 0;
    const nextDemoProfit = Number(state.demoProfit) || 0;
    const nextDemoPercent = Number(state.demoPercent) || 0;
    const nextTotalDeposited = Number(state.totalDeposited) || 0;
    const nextTotalTraded = Number(state.totalTraded) || 0;
    const nextSimulationEpoch = Number(state.simulationEpoch) || 0;
    const nextSimulationTicks = Math.max(0, Number(state.simulationTicks) || 0);
    const legacyResume =
      nextDemoAmount > 0 &&
      nextDemoProfit === 0 &&
      nextTotalTraded === 0 &&
      Array.isArray(state.activityFeed) &&
      state.activityFeed.some((item) => item?.type === "deposit");
    const nextDemoRunning = Boolean(state.isDemoRunning) || legacyResume;

    setCurrentAsset(assetMeta[state.currentAsset] ? state.currentAsset : "lyn");
    setDemoAmount(nextDemoAmount);
    setDemoProfit(nextDemoProfit);
    setDemoPercent(nextDemoPercent);
    setTotalDeposited(nextTotalDeposited);
    setTotalTraded(nextTotalTraded);
    setSimulationEpoch(nextSimulationEpoch || (legacyResume ? Date.now() : 0));
    setSimulationTicks(nextSimulationTicks);
    setHeroVisible(state.isHeroVisible !== false);
    setActivityFeed(Array.isArray(state.activityFeed) ? state.activityFeed : defaultActivities);
    setDemoRunning(nextDemoRunning && nextDemoAmount > 0);
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      setTelegramUser(getTelegramUser());
      setTelegramReady(true);
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#020503");
    tg.setBackgroundColor("#000000");
    tg.MainButton.hide();
    setTelegramUser(getTelegramUser());
    setTelegramReady(true);

    return () => {
      tg.MainButton.hide();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
      document.title = language === "zh" ? "PEGASUS | AI 市场自动驾驶" : "PEGASUS | AI market autopilot";
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const isModalOpen = isDepositOpen || isExchangeOpen;
    document.body.classList.toggle("modal-open", isModalOpen);

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isDepositOpen, isExchangeOpen]);

  useEffect(() => {
    if (!isTelegramReady) {
      return;
    }

    let cancelled = false;

    const loadPersistedState = async () => {
      setStateHydrated(false);

      const storageKey = getPersistedStateKey(telegramUser?.id);
      let fallbackState = null;

      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(storageKey);
          fallbackState = raw ? JSON.parse(raw) : null;
        } catch {
          fallbackState = null;
        }
      }

      if (!telegramUser?.id) {
        if (!cancelled) {
          applyPersistedState(fallbackState);
        }
        if (!cancelled) {
          setStateHydrated(true);
        }
        return;
      }

      try {
        const response = await fetch(`/api/app-state/${telegramUser.id}`);
        const payload = await response.json();

        if (!cancelled && response.ok && payload.state) {
          applyPersistedState(payload.state);
        } else {
          if (!cancelled) {
            applyPersistedState(fallbackState);
          }
        }
      } catch {
        if (!cancelled) {
          applyPersistedState(fallbackState);
        }
      } finally {
        if (!cancelled) {
          setStateHydrated(true);
        }
      }
    };

    loadPersistedState();

    return () => {
      cancelled = true;
    };
  }, [isTelegramReady, telegramUser?.id]);

  useEffect(() => {
    if (!telegramUser?.id) {
      setAdmin(false);
      setPendingDeposits([]);
      return;
    }

    let cancelled = false;

    const loadAdminDeposits = async () => {
      try {
        const response = await fetch(`/api/admin/deposits?userId=${telegramUser.id}`);

        if (response.status === 403) {
          if (!cancelled) {
            setAdmin(false);
            setPendingDeposits([]);
          }
          return;
        }

        const payload = await response.json();

        if (!cancelled && response.ok) {
          setAdmin(true);
          setPendingDeposits(payload.items || []);
        }
      } catch {
        if (!cancelled) {
          setAdmin(false);
          setPendingDeposits([]);
        }
      }
    };

    loadAdminDeposits();

    return () => {
      cancelled = true;
    };
  }, [telegramUser?.id]);

  useEffect(() => {
    if (!isStateHydrated) {
      return;
    }

    const storageKey = getPersistedStateKey(telegramUser?.id);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(persistedAppState));
    }

    if (!telegramUser?.id) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/app-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: telegramUser.id,
            state: persistedAppState
          }),
          signal: controller.signal
        });
      } catch {
        return;
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isStateHydrated, persistedAppState, telegramUser?.id]);

  useEffect(() => {
    if (!telegramUser?.id || !isStateHydrated || (!hasPendingDeposit && !isDemoRunning)) {
      return;
    }

    let cancelled = false;

    const syncLiveState = async () => {
      try {
        const response = await fetch(`/api/app-state/${telegramUser.id}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.state || cancelled) {
          return;
        }

        applyPersistedState(payload.state);
      } catch {
        return;
      }
    };

    syncLiveState();
    const timer = window.setInterval(syncLiveState, SIMULATION_STEP_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyPersistedState, hasPendingDeposit, isDemoRunning, isStateHydrated, telegramUser?.id]);

  useEffect(() => {
    return () => {
      if (heroDismissRef.current) {
        window.clearTimeout(heroDismissRef.current);
      }

      if (tabTransitionRef.current) {
        window.clearTimeout(tabTransitionRef.current);
      }

      if (actionDelayRef.current) {
        window.clearTimeout(actionDelayRef.current);
      }

      if (depositGenerationRef.current) {
        window.clearTimeout(depositGenerationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMarketData = async () => {
      try {
        const response = await fetch(`/api/market/${currentAssetMeta.api}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load market data");
        }

        if (!cancelled) {
          setMarketData(payload);
        }
      } catch {
        return;
      }
    };

    loadMarketData();
    const timer = window.setInterval(loadMarketData, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentAssetMeta.api]);

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const response = await fetch("/api/news/latest");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load news");
        }

        if (!cancelled) {
          setLatestNews(payload.items || []);
        }
      } catch {
        if (!cancelled) {
          setLatestNews([
            {
              coin: "BTC",
              title: "Bitcoin holders face $600B in unrealized losses as BTC price slips to $66K",
              description: "Weak spot demand continues to pressure short-term sentiment.",
              trend: "bearish"
            },
            {
              coin: "ETH",
              title: "Ether at risk of new 2026 lows if bulls fail to turn $2.4K into support",
              description: "Ethereum remains fragile unless buyers reclaim key support.",
              trend: "bearish"
            }
          ]);
        }
      }
    };

    loadNews();
    const timer = window.setInterval(loadNews, 300000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const showBetaAlert = (message) => {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
      return;
    }

    window.alert(message);
  };

  const showBetaWithdraw = () => {
    if (totalTraded < WITHDRAW_UNLOCK_VOLUME) {
      showBetaAlert(copy.alerts.withdrawNeedVolume(WITHDRAW_UNLOCK_VOLUME, totalTraded));
      return;
    }

    showBetaAlert(copy.alerts.withdrawBeta(createReferenceNumber("WD")));
  };

  const closeDepositModal = () => {
    if (depositGenerationRef.current) {
      window.clearTimeout(depositGenerationRef.current);
      depositGenerationRef.current = null;
    }

    setDepositGenerating(false);
    setDepositConfirming(false);
    setDepositOpen(false);
    setGeneratedDeposit(null);
  };

  const runHomeAction = (actionId, callback) => {
    if (pendingHomeAction) {
      return;
    }

    setPendingHomeAction(actionId);
    actionDelayRef.current = window.setTimeout(() => {
      actionDelayRef.current = null;
      setPendingHomeAction(null);
      callback();
    }, HOME_ACTION_DELAY_MS);
  };

  const pushActivity = (entry) => {
    setActivityFeed((current) => [entry, ...current].slice(0, 8));
  };

  const startDemoSimulation = (amountOverride = null, depositedAsset = "USD") => {
    const amount = Number.parseFloat(amountOverride ?? depositInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      showBetaAlert(copy.alerts.amountInvalid);
      return;
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      showBetaAlert(copy.alerts.amountMinimum(MIN_DEPOSIT_AMOUNT));
      return;
    }

    const nextAmount = Number((demoAmount + amount).toFixed(2));
    const nextPercent = nextAmount > 0 ? Number(((demoProfit / nextAmount) * 100).toFixed(2)) : 0;

    setDemoAmount(nextAmount);
    setDemoPercent(nextPercent);
    setTotalDeposited((current) => Number((current + amount).toFixed(2)));
    setSimulationEpoch(Date.now());
    setSimulationTicks(0);
    setDemoRunning(true);
    closeDepositModal();

    pushActivity({
      type: "deposit",
      amount: `+$${amount.toFixed(2)}`,
      asset: depositedAsset,
      timestamp: Date.now()
    });
  };

  const dismissHero = () => {
    if (isHeroClosing) {
      return;
    }

    setHeroClosing(true);
    heroDismissRef.current = window.setTimeout(() => {
      setHeroVisible(false);
      setHeroClosing(false);
      heroDismissRef.current = null;
    }, HERO_DISMISS_MS);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === tab || isTabAnimating) {
      return;
    }

    const currentIndex = TAB_ORDER.indexOf(tab);
    const nextIndex = TAB_ORDER.indexOf(nextTab);
    const direction = nextIndex > currentIndex ? 1 : -1;

    if (tabTransitionRef.current) {
      window.clearTimeout(tabTransitionRef.current);
    }

    setOutgoingTab(tab);
    setTabDirection(direction);
    setTabAnimating(true);
    setTab(nextTab);

    tabTransitionRef.current = window.setTimeout(() => {
      setOutgoingTab(null);
      setTabAnimating(false);
      tabTransitionRef.current = null;
    }, TAB_TRANSITION_MS);
  };

  const handleQuickAction = (actionKey) => {
    if (actionKey === "deposit") {
      setDepositOpen(true);
      return;
    }

    if (actionKey === "reward") {
      handleTabChange("rewards");
      return;
    }

    if (actionKey === "exchange") {
      setExchangeOpen(true);
      return;
    }

    if (actionKey === "send") {
      if (totalDeposited <= 0) {
        showBetaAlert(copy.alerts.sendNeedDeposit);
        return;
      }

      if (totalTraded < 500) {
        showBetaAlert(copy.alerts.sendNeedVolume);
        return;
      }

      if (balance < 25) {
        showBetaAlert(copy.alerts.sendNeedBalance);
        return;
      }

      setDemoProfit((current) => Number((current - 25).toFixed(2)));
      pushActivity({
        type: "send",
        amount: "-$25.00",
        asset: currentAssetMeta.short,
        timestamp: Date.now()
      });
      showBetaAlert(copy.alerts.sendDone);
    }
  };

  const selectExchangeAsset = (nextAsset) => {
    const nextMeta = assetMeta[nextAsset];

    setExchangeOpen(false);

    if (!nextMeta) {
      return;
    }

    if (nextAsset === currentAsset) {
      showBetaAlert(copy.alerts.exchangeCurrent(currentAssetMeta.short));
      return;
    }

    const fee = totalDeposited > 0 && balance > 0 ? Math.max(0.1, Number((balance * EXCHANGE_FEE_RATE).toFixed(2))) : 0;

    setMarketData(null);
    setCurrentAsset(nextAsset);

    if (fee > 0) {
      setDemoProfit((current) => Number((current - fee).toFixed(2)));
      pushActivity({
        type: "exchange",
        amount: `-$${fee.toFixed(2)}`,
        asset: "FEE",
        from: currentAssetMeta.short,
        to: nextMeta.short,
        timestamp: Date.now()
      });
    } else {
      pushActivity({
        type: "mode",
        amount: "$0.00",
        asset: nextMeta.short,
        from: currentAssetMeta.short,
        to: nextMeta.short,
        timestamp: Date.now()
      });
    }

    showBetaAlert(copy.alerts.exchangeChanged(currentAssetMeta.short, nextMeta.short, fee));
  };

  const openSupport = async (ticket = null) => {
    if (!telegramUser?.id) {
      showBetaAlert(copy.alerts.telegramSessionRequired);
      return;
    }

    try {
      const response = await fetch("/api/support/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: telegramUser.id,
          user: telegramUser,
          ticket,
          origin: ticket ? "deposit" : "mini-app"
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create support request");
      }

      showBetaAlert(
        ticket ? `${copy.alerts.supportRequestSent}\n\n${copy.alerts.supportTicket(ticket)}` : copy.alerts.supportRequestSent
      );
    } catch {
      showBetaAlert(copy.alerts.supportRequestFailed);
    }
  };

  const loadAdminDeposits = async (options = {}) => {
    if (!telegramUser?.id) {
      setAdmin(false);
      setPendingDeposits([]);
      return;
    }

    if (!options.silent) {
      setAdminLoading(true);
    }

    try {
      const response = await fetch(`/api/admin/deposits?userId=${telegramUser.id}`);

      if (response.status === 403) {
        setAdmin(false);
        setPendingDeposits([]);
        return;
      }

      const payload = await response.json();

      if (response.ok) {
        setAdmin(true);
        setPendingDeposits(payload.items || []);
      }
    } catch {
      if (!options.silent) {
        showBetaAlert(copy.alerts.adminLoadFailed);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const generateDepositRequest = () => {
    const amount = Number.parseFloat(depositInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      showBetaAlert(copy.alerts.amountInvalid);
      return;
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      showBetaAlert(copy.alerts.amountMinimum(MIN_DEPOSIT_AMOUNT));
      return;
    }

    const asset = depositAssetMeta[depositCurrency];
    const cryptoAmount = Number((amount / asset.usdPrice).toFixed(asset.decimals));

    setGeneratedDeposit({
      symbol: depositCurrency,
      name: asset.name,
      network: asset.network,
      amountUsd: amount,
      cryptoAmount,
      decimals: asset.decimals,
      wallet: asset.address,
      ticket: createReferenceNumber("PG")
    });
  };

  const handleDepositGenerate = () => {
    if (isDepositGenerating) {
      return;
    }

    setDepositGenerating(true);
    depositGenerationRef.current = window.setTimeout(() => {
      depositGenerationRef.current = null;
      setDepositGenerating(false);
      generateDepositRequest();
    }, DEPOSIT_GENERATION_DELAY_MS);
  };

  const handleDepositConfirm = async () => {
    if (!generatedDeposit || isDepositConfirming) {
      return;
    }

    if (!telegramUser?.id) {
      showBetaAlert(copy.alerts.telegramSessionRequired);
      return;
    }

    setDepositConfirming(true);

    try {
      const response = await fetch("/api/deposits/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: telegramUser.id,
          user: telegramUser,
          deposit: generatedDeposit
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit deposit request");
      }

      pushActivity({
        type: "deposit-pending",
        amount: `+$${generatedDeposit.amountUsd.toFixed(2)}`,
        asset: generatedDeposit.symbol,
        timestamp: Date.now()
      });

      closeDepositModal();
      showBetaAlert(
        payload.notified === false
          ? copy.alerts.depositRequestWarning(generatedDeposit.ticket)
          : copy.alerts.depositRequestSent(generatedDeposit.ticket)
      );
    } catch {
      showBetaAlert(copy.alerts.depositRequestFailed);
    } finally {
      setDepositConfirming(false);
    }
  };

  const approvePendingDeposit = async (ticket) => {
    if (!telegramUser?.id || !ticket || approvingTicket) {
      return;
    }

    setApprovingTicket(ticket);

    try {
      const response = await fetch("/api/admin/deposits/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adminUserId: telegramUser.id,
          ticket
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to approve deposit");
      }

      setPendingDeposits((current) => current.filter((item) => item.ticket !== ticket));
      showBetaAlert(copy.alerts.adminApproveDone(ticket));
    } catch {
      showBetaAlert(copy.alerts.adminApproveFailed);
    } finally {
      setApprovingTicket(null);
    }
  };

  const getRewardProgress = (program) =>
    program.type === "deposit" ? Math.min(totalDeposited, program.target) : Math.min(totalTraded, program.target);

  const isRewardComplete = (program, progress) => progress >= program.target;

  const formatRewardProgress = (program, progress) => {
    const digits = program.type === "deposit" ? 0 : 1;
    return `$${progress.toFixed(digits)} / $${program.target}`;
  };

  const renderTabContent = (currentTab) => {
    if (currentTab === "home") {
      return (
        <section className="home-layout">
          {isHeroVisible && (
            <div className={isHeroClosing ? "hero-banner-shell closing" : "hero-banner-shell"}>
              <article className="panel hero-banner">
                <button className="hero-close" type="button" onClick={dismissHero} aria-label={copy.hero.closeLabel}>
                  x
                </button>
                <div className="hero-copy">
                  <p className="section-tag">{copy.hero.tag}</p>
                  <h2>{copy.hero.title}</h2>
                  <p>{copy.hero.description}</p>
                </div>
                <div className="hero-tags">
                  {copy.hero.tags.map((tag) => (
                    <span className="hero-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          )}

          <section className="hero-panel">
            <div className="balance-panel panel">
              <p className="section-tag">{copy.home.capitalTag}</p>
              <div className="balance-value">$ {balance.toFixed(2)}</div>
              <p className="balance-note">
                {demoAmount > 0
                  ? isDemoRunning
                    ? copy.home.balanceRunningNote
                    : copy.home.balanceClosedNote
                  : copy.home.balanceIdleNote}
              </p>
              <div className="action-row">
                <button
                  className="primary-button shimmer-button button-loading"
                  type="button"
                  data-busy={pendingHomeAction === "home-deposit" ? "true" : undefined}
                  aria-busy={pendingHomeAction === "home-deposit"}
                  disabled={Boolean(pendingHomeAction)}
                  onClick={() => runHomeAction("home-deposit", () => setDepositOpen(true))}
                >
                  {copy.home.depositButton}
                </button>
                <button
                  className="secondary-button button-loading"
                  type="button"
                  data-busy={pendingHomeAction === "home-withdraw" ? "true" : undefined}
                  aria-busy={pendingHomeAction === "home-withdraw"}
                  disabled={Boolean(pendingHomeAction)}
                  onClick={() => runHomeAction("home-withdraw", showBetaWithdraw)}
                >
                  {copy.home.withdrawButton}
                </button>
              </div>
              <div className="market-row">
                <span>{copy.home.marketModeLabel}</span>
                <strong>{copy.home.marketModeValue}</strong>
              </div>
              <div className="market-row">
                <span>{copy.home.marketTrendLabel}</span>
                <strong className="positive">{copy.home.marketTrendValue}</strong>
              </div>
            </div>

            <article className="panel compact-panel market-overview">
              <div className="card-head">
                <div>
                  <p className="section-tag">{copy.home.marketCoreTag}</p>
                  <h3>{currentAssetMeta.pair}</h3>
                </div>
              </div>
              <div className="stat-grid market-overview-grid">
                <div className="stat-box">
                  <span>{copy.home.priceLabel}</span>
                  <strong>
                    {marketData?.market?.current_price != null
                      ? `$${formatMarketPrice(marketData.market.current_price)}`
                      : "--"}
                  </strong>
                </div>
                <div className="stat-box">
                  <span>{copy.home.totalTradedLabel}</span>
                  <strong>${totalTraded.toFixed(1)}</strong>
                </div>
                <div className="stat-box">
                  <span>{copy.home.swapFeeLabel}</span>
                  <strong>0.6%</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="quick-actions-wrap panel compact-panel">
            <div className="quick-actions">
              {quickActions.map((item) => (
                <button
                  className="quick-action button-loading"
                  type="button"
                  key={item.key}
                  data-busy={pendingHomeAction === `quick-${item.key}` ? "true" : undefined}
                  aria-busy={pendingHomeAction === `quick-${item.key}`}
                  disabled={Boolean(pendingHomeAction)}
                  onClick={() => runHomeAction(`quick-${item.key}`, () => handleQuickAction(item.key))}
                >
                  <span className="quick-action-icon">{item.icon}</span>
                  <span className="quick-action-label">{copy.quickActions[item.key]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="single-column">
            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">{copy.home.activityTag}</p>
                  <h3>{copy.home.activityTitle}</h3>
                </div>
                {hasMoreActivities && (
                  <button
                    className="ghost-link button-loading"
                    type="button"
                    data-busy={pendingHomeAction === "activity-open" ? "true" : undefined}
                    aria-busy={pendingHomeAction === "activity-open"}
                    disabled={Boolean(pendingHomeAction)}
                    onClick={() => runHomeAction("activity-open", () => handleTabChange("activity"))}
                  >
                    ↓
                  </button>
                )}
              </div>
              <div className="activity-list">
                {activityPreview.length > 0 ? (
                  renderActivityItems(activityPreview)
                ) : (
                  <div className="activity-empty">{copy.home.activityEmpty}</div>
                )}
              </div>
            </article>
          </section>

          <article className="chart-panel panel">
            <div className="chart-head">
              <div>
                <p className="section-tag">{`${currentAssetMeta.short} ${copy.home.marketFeedTag}`}</p>
                <h2>{currentAssetMeta.pair}</h2>
              </div>
              <div className="chart-meta">
                <div className="chart-badge">
                  {marketData?.market?.current_price != null
                    ? `$${formatMarketPrice(marketData.market.current_price)}`
                    : copy.home.syncBadge}
                </div>
                {demoAmount > 0 && (
                  <div className="profit-badge-mini">
                    <span>{copy.home.incomeMini}</span>
                    <strong className={demoProfit >= 0 ? "positive" : "negative"}>
                      {formatSignedMoney(demoProfit)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div
              className="candle-grid"
              style={{ gridTemplateColumns: `repeat(${Math.max(candleSeries.length, 24)}, minmax(0, 1fr))` }}
            >
              {candleSeries.length > 0 ? (
                candleSeries.map((candle, index) => {
                  const bullish = candle.close >= candle.open;
                  const bodyTop = Math.max(candle.open, candle.close);
                  const bodyBottom = Math.min(candle.open, candle.close);

                  return (
                    <div className="candle-col" key={index}>
                      <div
                        className="candle-wick"
                        style={{
                          top: `${100 - candleScale.normalize(candle.high)}%`,
                          bottom: `${candleScale.normalize(candle.low)}%`
                        }}
                      ></div>
                      <div
                        className={bullish ? "candle-body bullish" : "candle-body bearish"}
                        style={{
                          top: `${100 - candleScale.normalize(bodyTop)}%`,
                          height: `${Math.max(
                            candleScale.normalize(bodyTop) - candleScale.normalize(bodyBottom),
                            4
                          )}%`
                        }}
                      ></div>
                    </div>
                  );
                })
              ) : (
                <div className="candle-empty">LIVE FEED</div>
              )}
            </div>

            <div className="chart-footer">
              <span>
                {marketData?.market
                  ? `${copy.home.rangeLabel}: ${formatMarketPrice(marketData.market.low_24h)} - ${formatMarketPrice(
                      marketData.market.high_24h
                    )}`
                  : copy.home.connection}
              </span>
              <strong
                className={
                  (marketData?.market?.price_change_percentage_24h ?? 0) >= 0 ? "positive" : "negative"
                }
              >
                {marketData?.market?.price_change_percentage_24h != null
                  ? `${marketData.market.price_change_percentage_24h.toFixed(2)}%`
                  : "--"}
              </strong>
            </div>
          </article>

          <article className="panel compact-panel support-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.home.supportTag}</p>
                <h3>{copy.home.supportTitle}</h3>
              </div>
            </div>
            <p className="support-copy">{copy.home.supportCopy}</p>
            <button
              className="ghost-link support-link button-loading"
              type="button"
              data-busy={pendingHomeAction === "support-open" ? "true" : undefined}
              aria-busy={pendingHomeAction === "support-open"}
              disabled={Boolean(pendingHomeAction)}
              onClick={() =>
                runHomeAction("support-open", () => {
                  void openSupport();
                })
              }
            >
              {copy.home.supportLink}
            </button>
          </article>

          <section className="cards-row">
            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">{copy.home.newsTag}</p>
                  <h3>{copy.home.newsTitle}</h3>
                </div>
                <button
                  className="ghost-link button-loading"
                  type="button"
                  data-busy={pendingHomeAction === "news-open" ? "true" : undefined}
                  aria-busy={pendingHomeAction === "news-open"}
                  disabled={Boolean(pendingHomeAction)}
                  onClick={() => runHomeAction("news-open", () => handleTabChange("news"))}
                >
                  {copy.home.newsAll}
                </button>
              </div>
              <div className="news-list">{renderNewsItems(featuredNews)}</div>
            </article>

            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">{copy.home.whyTag}</p>
                  <h3>{copy.home.whyTitle}</h3>
                </div>
              </div>
              <div className="stat-grid">
                {copy.aiStatus.map((item) => (
                  <div className="stat-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <footer className="legal-footer">{copy.home.legal}</footer>
        </section>
      );
    }

    if (currentTab === "earnings") {
      return (
        <section className="single-column">
          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.earnings.tag}</p>
                <h3>{copy.earnings.title}</h3>
              </div>
              {demoAmount > 0 && <div className="chart-badge">live</div>}
            </div>
            <div className="stat-grid earnings-grid">
              <div className="stat-box">
                <span>{copy.home.incomeMini}</span>
                <strong className={demoProfit >= 0 ? "positive" : "negative"}>
                  {demoAmount > 0 ? formatSignedMoney(demoProfit) : "$0.00"}
                </strong>
              </div>
              <div className="stat-box">
                <span>%</span>
                <strong className={demoPercent >= 0 ? "positive" : "negative"}>
                  {demoAmount > 0 ? formatSignedPercent(demoPercent) : "0.00%"}
                </strong>
              </div>
              <div className="stat-box">
                <span>{copy.home.capitalTag}</span>
                <strong>$ {balance.toFixed(2)}</strong>
              </div>
            </div>
          </article>

          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.earnings.engineTag}</p>
                <h3>{copy.earnings.sourceTitle}</h3>
              </div>
            </div>
            <div className="news-list">
              {copy.earningsSources.map((source) => (
                <div className="news-item signal-item" key={source.name}>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{source.note}</p>
                  </div>
                  <div className="signal-side">
                    <span>{copy.earnings.shareLabel}</span>
                    <strong>{source.share}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      );
    }

    if (currentTab === "rewards") {
      return (
        <section className="single-column">
          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.rewards.tag}</p>
                <h3>{copy.rewards.title}</h3>
              </div>
            </div>
            <div className="reward-grid">
              {rewardPrograms.map((program) => (
                <article className="reward-card" key={program.title}>
                  {(() => {
                    const progress = getRewardProgress(program);
                    const completed = isRewardComplete(program, progress);

                    return (
                      <>
                        <div className="reward-head">
                          <strong>{program.title}</strong>
                          <span className="reward-pill">{program.reward}</span>
                        </div>
                        <div className="reward-progress">
                          <div className="reward-progress-head">
                            <span>{formatRewardProgress(program, progress)}</span>
                            <strong className={completed ? "positive" : ""}>
                              {completed ? copy.rewards.statusDone : copy.rewards.statusProgress}
                            </strong>
                          </div>
                          <div className="reward-progress-track">
                            <div
                              className="reward-progress-bar"
                              style={{
                                width: `${Math.min((progress / program.target) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <p>{program.note}</p>
                        <button className="ghost-link reward-link" type="button" onClick={() => setDepositOpen(true)}>
                          {copy.rewards.activate}
                        </button>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </article>
        </section>
      );
    }

    if (currentTab === "activity") {
      return (
        <section className="single-column">
          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.activityPage.tag}</p>
                <h3>{copy.activityPage.title}</h3>
              </div>
              <button className="ghost-link" type="button" onClick={() => handleTabChange("home")}>
                {copy.activityPage.back}
              </button>
            </div>
            <div className="activity-list">
              {activityFeed.length > 0 ? (
                renderActivityItems(activityFeed)
              ) : (
                <div className="activity-empty">{copy.home.activityEmpty}</div>
              )}
            </div>
          </article>
        </section>
      );
    }

    return (
      <section className="single-column">
        <article className="panel compact-panel">
          <div className="card-head">
            <div>
              <p className="section-tag">{copy.newsPage.tag}</p>
              <h3>{copy.newsPage.title}</h3>
            </div>
          </div>
          <div className="news-list">{renderNewsItems(newsFeed)}</div>
        </article>
      </section>
    );
  };

  return (
    <div className="app-shell">
      <div className="grid-glow glow-left"></div>
      <div className="grid-glow glow-right"></div>

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-glyph">
            <img className="brand-icon" src={pegasusMark} alt="" />
          </span>
          <div className="brand-text">
            <h1>
              <span className="brand-main">{copy.brand.main}</span>
              <span className="brand-sub">{copy.brand.sub}</span>
            </h1>
          </div>
        </div>
        <div className="topbar-actions">
          {isAdmin && (
            <button className="ghost-link admin-link" type="button" onClick={() => setAdminPanelOpen(true)}>
              <span>{copy.admin.open}</span>
              {pendingAdminCount > 0 && <span className="admin-count">{pendingAdminCount}</span>}
            </button>
          )}
          <div className="language-switch" role="group" aria-label={copy.languageSwitchLabel}>
            <button
              className={language === "en" ? "language-button active" : "language-button"}
              type="button"
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              className={language === "zh" ? "language-button active" : "language-button"}
              type="button"
              aria-pressed={language === "zh"}
              onClick={() => setLanguage("zh")}
            >
              ZH
            </button>
          </div>
        </div>
      </header>

      <main className="main-area">
        <div className={isTabAnimating ? "tab-stage animating" : "tab-stage"}>
          {outgoingTab && (
            <div
              className={
                tabDirection > 0 ? "tab-pane tab-pane-overlay tab-exit-left" : "tab-pane tab-pane-overlay tab-exit-right"
              }
            >
              {renderTabContent(outgoingTab)}
            </div>
          )}
          <div
            className={
              isTabAnimating ? (tabDirection > 0 ? "tab-pane tab-enter-right" : "tab-pane tab-enter-left") : "tab-pane tab-current"
            }
          >
            {renderTabContent(tab)}
          </div>
        </div>
      </main>

      <nav className="bottom-nav">
        <BottomNavButton label={copy.nav.home} active={tab === "home"} onClick={() => handleTabChange("home")} />
        <BottomNavButton
          label={copy.nav.earnings}
          active={tab === "earnings"}
          onClick={() => handleTabChange("earnings")}
        />
        <BottomNavButton
          label={copy.nav.rewards}
          active={tab === "rewards"}
          onClick={() => handleTabChange("rewards")}
        />
        <BottomNavButton label={copy.nav.news} active={tab === "news"} onClick={() => handleTabChange("news")} />
      </nav>

      {isDepositOpen && (
        <div className="modal-backdrop" onClick={closeDepositModal} role="presentation">
          <div className="deposit-modal panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="section-tag">{copy.modal.depositTitle}</p>
            <h3>{copy.modal.amountTitle}</h3>
            <div className="deposit-flow">
              <div className="field-stack">
                <label className="field-label" htmlFor="deposit-currency">
                  {copy.modal.currencyLabel}
                </label>
                <select
                  id="deposit-currency"
                  className="currency-select"
                  value={depositCurrency}
                  disabled={isDepositGenerating}
                  onChange={(event) => {
                    setDepositCurrency(event.target.value);
                    setGeneratedDeposit(null);
                  }}
                >
                  {Object.entries(depositAssetMeta).map(([symbol, asset]) => (
                    <option key={symbol} value={symbol}>
                      {asset.name} ({symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label className="field-label" htmlFor="deposit-amount">
                  {copy.modal.amountUsdLabel}
                </label>
                <div className="amount-wrap">
                  <span className="amount-prefix">$</span>
                  <input
                    id="deposit-amount"
                    className="amount-input"
                    type="number"
                    min={MIN_DEPOSIT_AMOUNT}
                    step="1"
                    disabled={isDepositGenerating}
                    value={depositInput}
                    onChange={(event) => {
                      setDepositInput(event.target.value);
                      setGeneratedDeposit(null);
                    }}
                  />
                </div>
              </div>

              {generatedDeposit && (
                <div className="deposit-details">
                  <p className="section-tag">{copy.modal.walletTitle}</p>
                  <div className="deposit-details-card">
                    <div className="detail-grid">
                      <div className="detail-row">
                        <span>{copy.modal.currencyLabel}</span>
                        <strong>{`${generatedDeposit.name} (${generatedDeposit.symbol})`}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.networkLabel}</span>
                        <strong>{generatedDeposit.network}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.amountCryptoLabel}</span>
                        <strong>{`${generatedDeposit.cryptoAmount.toFixed(generatedDeposit.decimals)} ${generatedDeposit.symbol}`}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.amountUsdLabel}</span>
                        <strong>{formatMoney(generatedDeposit.amountUsd)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.ticketLabel}</span>
                        <strong>{generatedDeposit.ticket}</strong>
                      </div>
                    </div>
                    <div className="field-stack">
                      <span className="field-label">{copy.modal.walletLabel}</span>
                      <div className="hash-display">{generatedDeposit.wallet}</div>
                    </div>
                    <p className="modal-note deposit-warning">{copy.modal.notice}</p>
                    <div className="deposit-detail-actions">
                      <button
                        className="ghost-link support-link"
                        type="button"
                        disabled={isDepositConfirming}
                        onClick={() => {
                          void openSupport(generatedDeposit.ticket);
                        }}
                      >
                        {copy.modal.support}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="action-row wallet-buttons">
              <button
                className="primary-button shimmer-button button-loading"
                type="button"
                data-busy={isDepositGenerating || isDepositConfirming ? "true" : undefined}
                aria-busy={isDepositGenerating || isDepositConfirming}
                disabled={isDepositGenerating || isDepositConfirming}
                onClick={
                  generatedDeposit
                    ? handleDepositConfirm
                    : handleDepositGenerate
                }
              >
                {generatedDeposit ? copy.modal.confirm : copy.modal.generate}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isDepositGenerating || isDepositConfirming}
                onClick={closeDepositModal}
              >
                {copy.modal.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExchangeOpen && (
        <div className="modal-backdrop" onClick={() => setExchangeOpen(false)} role="presentation">
          <div className="deposit-modal panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="section-tag">{copy.exchange.tag}</p>
            <h3>{copy.exchange.title}</h3>
            <div className="exchange-grid">
              {Object.entries(assetMeta).map(([key, asset]) => (
                <button
                  className={key === currentAsset ? "exchange-option active" : "exchange-option"}
                  type="button"
                  key={key}
                  onClick={() => selectExchangeAsset(key)}
                >
                  <strong>{asset.short}</strong>
                  <span>{asset.pair}</span>
                </button>
              ))}
            </div>
            <div className="action-row wallet-buttons">
              <button className="secondary-button" type="button" onClick={() => setExchangeOpen(false)}>
                {copy.exchange.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdminPanelOpen && (
        <div className="modal-backdrop" onClick={() => setAdminPanelOpen(false)} role="presentation">
          <div className="deposit-modal panel admin-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="card-head">
              <div>
                <p className="section-tag">{copy.admin.open}</p>
                <h3>{copy.admin.title}</h3>
              </div>
              <button className="ghost-link" type="button" onClick={() => loadAdminDeposits()} disabled={isAdminLoading}>
                {copy.admin.refresh}
              </button>
            </div>
            <div className="admin-list">
              {pendingDeposits.length > 0 ? (
                pendingDeposits.map((item) => (
                  <article className="admin-card" key={item.ticket}>
                    <div className="admin-card-head">
                      <div>
                        <strong>{item.ticket}</strong>
                        <div className="admin-stamp">{formatAdminStamp(item.createdAt)}</div>
                      </div>
                      <span className="admin-pill">{copy.admin.pending}</span>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-row">
                        <span>{copy.admin.user}</span>
                        <strong>{item.username ? `@${item.username}` : item.displayName || item.userId}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.admin.amount}</span>
                        <strong>{formatMoney(item.amountUsd)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.currencyLabel}</span>
                        <strong>{`${item.symbol} / ${item.network}`}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{copy.modal.amountCryptoLabel}</span>
                        <strong>{`${Number(item.cryptoAmount).toFixed(item.decimals)} ${item.symbol}`}</strong>
                      </div>
                    </div>
                    <div className="field-stack">
                      <span className="field-label">{copy.modal.walletLabel}</span>
                      <div className="hash-display">{item.wallet}</div>
                    </div>
                    <div className="admin-card-actions">
                      <button
                        className="primary-button shimmer-button button-loading"
                        type="button"
                        data-busy={approvingTicket === item.ticket ? "true" : undefined}
                        aria-busy={approvingTicket === item.ticket}
                        disabled={Boolean(approvingTicket)}
                        onClick={() => approvePendingDeposit(item.ticket)}
                      >
                        {approvingTicket === item.ticket ? copy.admin.approving : copy.admin.approve}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="activity-empty">{copy.admin.empty}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNavButton({ label, active, onClick }) {
  return (
    <button className={active ? "bottom-button active" : "bottom-button"} type="button" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export default App;
