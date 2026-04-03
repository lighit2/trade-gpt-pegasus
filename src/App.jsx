import { useEffect, useMemo, useRef, useState } from "react";

const earningsSources = [
  { name: "LYN impulse engine", share: "1.8%", note: "Pegasus входит после подтвержденного ускорения и берет часть движения." },
  { name: "BTC news reaction", share: "2.4%", note: "Нейросеть читает новостной фон и заходит на сильной переоценке рынка." },
  { name: "ETH volatility range", share: "1.5%", note: "Автопилот забирает короткие возвраты и резкие внутридневные колебания." }
];

const pitchTags = ["AI news scan", "autopilot entry", "smart risk exit"];

const aiStatus = [
  { label: "Скан новостей", value: "24/7" },
  { label: "Вход в рынок", value: "AI" },
  { label: "Выход", value: "AUTO" }
];

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

const uiText = {
  ru: {
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
      cancel: "Отмена",
      submit: "Пополнить баланс"
    }
  },
  en: {
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
      depositTitle: "Top up balance",
      amountTitle: "Enter amount in USD",
      cancel: "Cancel",
      submit: "Top up balance"
    }
  }
};

const quickActions = [
  { icon: "+", key: "deposit" },
  { icon: "⇄", key: "exchange" },
  { icon: "↓", key: "reward" },
  { icon: "↑", key: "send" }
];

const rewardPrograms = [
  {
    title: "Депозит 100$",
    reward: "+20$",
    target: 100,
    type: "deposit",
    note: "Получишь 20$ в течение 3-х дней после пополнения."
  },
  {
    title: "Общие торги 2000$",
    reward: "+20$",
    target: 2000,
    type: "trading",
    note: "Получишь 20$ в течение 3-х дней после достижения объема."
  }
];

const defaultActivities = [];

const TAB_ORDER = ["home", "earnings", "rewards", "activity", "news"];
const TAB_TRANSITION_MS = 420;
const EXCHANGE_FEE_RATE = 0.006;

const pinnedStory = {
  coin: "PEGASUS x LYN",
  title: "PEGASUS сделал коллаборацию с LYN. Теперь зарабатывать на AI-валюте стало еще проще.",
  description: "Новый режим усиливает AI-скан новостей и ускоряет автопилот на монете LYN.",
  trend: "Бычий",
  pinned: true
};

function App() {
  const [tab, setTab] = useState("home");
  const [language, setLanguage] = useState("ru");
  const [currentAsset, setCurrentAsset] = useState("lyn");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [isExchangeOpen, setExchangeOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
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
  const simulationRef = useRef(null);
  const heroDismissRef = useRef(null);
  const tabTransitionRef = useRef(null);

  const balance = demoAmount + demoProfit;
  const newsFeed = useMemo(() => [pinnedStory, ...latestNews], [latestNews]);
  const featuredNews = newsFeed.slice(0, 2);
  const activityPreview = activityFeed.slice(0, 2);
  const hasMoreActivities = activityFeed.length > 2;
  const currentAssetMeta = assetMeta[currentAsset];
  const copy = uiText[language];
  const depositRewardProgress = Math.min(totalDeposited, rewardPrograms[0].target);
  const tradingRewardProgress = Math.min(totalTraded, rewardPrograms[1].target);
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

    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#020503");
    tg.setBackgroundColor("#000000");
    tg.MainButton.hide();

    return () => {
      tg.MainButton.hide();
    };
  }, []);

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
              trend: "Медвежий"
            },
            {
              coin: "ETH",
              title: "Ether at risk of new 2026 lows if bulls fail to turn $2.4K into support",
              description: "Ethereum remains fragile unless buyers reclaim key support.",
              trend: "Медвежий"
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

  const showBetaWithdraw = () => {
    const message = "Вывод пока в бете.";

    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
      return;
    }

    window.alert(message);
  };

  const startDemoSimulation = () => {
    const amount = Number.parseFloat(depositInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Введите сумму в долларах.");
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
    setDepositOpen(false);

    const stamp = formatActivityStamp();
    pushActivity({
      title: "Пополнено",
      amount: `+$${amount.toFixed(2)}`,
      asset: "USD",
      date: stamp.date,
      time: stamp.time,
      note: "Баланс пополнен. AI-сессия запущена."
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

  const formatSignedMoney = (value) => {
    const absValue = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}$${absValue.toFixed(2)}`;
  };

  const formatSignedPercent = (value) => {
    const absValue = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}${absValue.toFixed(2)}%`;
  };

  const formatActivityStamp = () => {
    const now = new Date();
    const date = now.toLocaleDateString("ru-RU");
    const time = now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });

    return { date, time };
  };

  const pushActivity = (entry) => {
    setActivityFeed((current) => [entry, ...current].slice(0, 8));
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
    }, 280);
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

  const showBetaAlert = (message) => {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
      return;
    }

    window.alert(message);
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
        showBetaAlert("Сначала нужно пополнить баланс.");
        return;
      }

      if (totalTraded < 500) {
        showBetaAlert("Отправка откроется после общего торгового объема 500$.");
        return;
      }

      if (balance < 25) {
        showBetaAlert("Недостаточно средств для отправки.");
        return;
      }

      const stamp = formatActivityStamp();

      setDemoProfit((current) => Number((current - 25).toFixed(2)));
      pushActivity({
        title: "Отправлено",
        amount: "-$25.00",
        asset: currentAssetMeta.short,
        date: stamp.date,
        time: stamp.time,
        note: "Перевод из торгового баланса после открытия лимита по объему."
      });
      showBetaAlert("Отправка выполнена.");
    }
  };

  const selectExchangeAsset = (nextAsset) => {
    const nextMeta = assetMeta[nextAsset];
    const stamp = formatActivityStamp();

    setExchangeOpen(false);

    if (!nextMeta) {
      return;
    }

    if (nextAsset === currentAsset) {
      showBetaAlert(`Сейчас уже выбран ${currentAssetMeta.short}.`);
      return;
    }

    const fee = totalDeposited > 0 && balance > 0 ? Math.max(0.1, Number((balance * EXCHANGE_FEE_RATE).toFixed(2))) : 0;

    setMarketData(null);
    setCurrentAsset(nextAsset);

    if (fee > 0) {
      setDemoProfit((current) => Number((current - fee).toFixed(2)));
      pushActivity({
        title: "Обменено",
        amount: `-$${fee.toFixed(2)}`,
        asset: "FEE",
        date: stamp.date,
        time: stamp.time,
        note: `${currentAssetMeta.short} -> ${nextMeta.short}, удержана комиссия за обмен.`
      });
    } else {
      pushActivity({
        title: "Режим рынка",
        amount: "$0.00",
        asset: nextMeta.short,
        date: stamp.date,
        time: stamp.time,
        note: `График переключен с ${currentAssetMeta.short} на ${nextMeta.short}.`
      });
    }

    showBetaAlert(`Актив переключен: ${currentAssetMeta.short} -> ${nextMeta.short}${fee > 0 ? `, комиссия $${fee.toFixed(2)}` : ""}.`);
  };

  const openSupport = () => {
    showBetaAlert("Тех. поддержка подключится в следующем обновлении.");
  };

  const getActivityIcon = (title) => {
    if (title === "Пополнено") {
      return "+";
    }

    if (title === "Обменено") {
      return "⇄";
    }

    if (title === "Отправлено") {
      return "↑";
    }

    return "•";
  };

  const renderTabContent = (currentTab) => {
    if (currentTab === "home") {
      return (
        <section className="home-layout">
          {isHeroVisible && (
            <article className={isHeroClosing ? "panel hero-banner closing" : "panel hero-banner"}>
              <button className="hero-close" type="button" onClick={dismissHero} aria-label="Закрыть блок">
                x
              </button>
              <div className="hero-copy">
                <p className="section-tag">AI Capital Autopilot</p>
                <h2>Внеси баланс. Pegasus сам ищет, читает и ведет сделку.</h2>
                <p>
                  Нейросеть отслеживает последние новости, оценивает импульс и включает торговый автопилот
                  без ручной рутины.
                </p>
              </div>
              <div className="hero-tags">
                {pitchTags.map((tag) => (
                  <span className="hero-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          )}

          <section className="hero-panel">
            <div className="balance-panel panel">
              <p className="section-tag">Capital</p>
              <div className="balance-value">$ {balance.toFixed(2)}</div>
              <p className="balance-note">
                {demoAmount > 0
                  ? isDemoRunning
                    ? "Pegasus уже ведет позицию и пересчитывает доход в live-режиме."
                    : "Сессия закрыта. Можно снова пополнить баланс и запустить AI."
                  : "Внеси баланс, чтобы запустить AI-режим и передать работу алгоритму."}
              </p>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => setDepositOpen(true)}>
                  Пополнить
                </button>
                <button className="secondary-button" type="button" onClick={showBetaWithdraw}>
                  Вывести
                </button>
              </div>
              <div className="market-row">
                <span>Режим</span>
                <strong>AI Автопилот</strong>
              </div>
              <div className="market-row">
                <span>Тренд рынка</span>
                <strong className="negative">Бычий</strong>
              </div>
            </div>

            <article className="panel compact-panel market-overview">
              <div className="card-head">
                <div>
                  <p className="section-tag">Market Core</p>
                  <h3>{currentAssetMeta.pair}</h3>
                </div>
              </div>
              <div className="stat-grid market-overview-grid">
                <div className="stat-box">
                  <span>Цена</span>
                  <strong>
                    {marketData?.market?.current_price != null
                      ? `$${formatMarketPrice(marketData.market.current_price)}`
                      : "--"}
                  </strong>
                </div>
                <div className="stat-box">
                  <span>Общие торги</span>
                  <strong>${totalTraded.toFixed(1)}</strong>
                </div>
                <div className="stat-box">
                  <span>Комиссия swap</span>
                  <strong>0.6%</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="quick-actions-wrap panel compact-panel">
            <div className="quick-actions">
              {quickActions.map((item) => (
                <button
                  className="quick-action"
                  type="button"
                  key={item.key}
                  onClick={() => handleQuickAction(item.key)}
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
                  <p className="section-tag">Activity</p>
                  <h3>Последние действия</h3>
                </div>
                {hasMoreActivities && (
                  <button className="ghost-link" type="button" onClick={() => handleTabChange("activity")}>
                    ↓
                  </button>
                )}
              </div>
              <div className="activity-list">
                {activityPreview.length > 0 ? (
                  activityPreview.map((item, index) => (
                    <article className="activity-card" key={`${item.title}-${item.amount}-${index}`}>
                      <div className="activity-icon-wrap">
                        <span className="activity-icon">{getActivityIcon(item.title)}</span>
                      </div>
                      <div className="activity-main">
                        <div className="activity-head">
                          <div>
                            <strong>{item.title}</strong>
                            <div className="activity-stamp">
                              <span>{item.date}</span>
                              <span>{item.time}</span>
                            </div>
                          </div>
                          <div className="activity-side">
                            <strong className="activity-amount">{item.amount}</strong>
                            <span className="activity-asset">{item.asset}</span>
                          </div>
                        </div>
                        <p className="activity-note">{item.note}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="activity-empty">Пока нет действий. После пополнения или обмена история появится здесь.</div>
                )}
              </div>
            </article>
          </section>

          <article className="chart-panel panel">
            <div className="chart-head">
              <div>
                <p className="section-tag">{currentAssetMeta.short} Feed</p>
                <h2>{currentAssetMeta.pair}</h2>
              </div>
              <div className="chart-meta">
                <div className="chart-badge">
                  {marketData?.market?.current_price != null
                    ? `$${formatMarketPrice(marketData.market.current_price)}`
                    : "sync"}
                </div>
                {demoAmount > 0 && (
                  <div className="profit-badge-mini">
                    <span>Доход</span>
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
                  ? `24h: ${formatMarketPrice(marketData.market.low_24h)} - ${formatMarketPrice(
                      marketData.market.high_24h
                    )}`
                  : "подключение"}
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
                <p className="section-tag">Support</p>
                <h3>Тех. Поддержка</h3>
              </div>
            </div>
            <p className="support-copy">
              Если нужна помощь по депозиту, обмену или наградам, поддержка подключит тебя вручную.
            </p>
            <button className="ghost-link support-link" type="button" onClick={openSupport}>
              Открыть поддержку
            </button>
          </article>

          <section className="cards-row">
            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">News</p>
                  <h3>Что Pegasus видит сейчас</h3>
                </div>
                <button className="ghost-link" type="button" onClick={() => handleTabChange("news")}>
                  Все
                </button>
              </div>
              <div className="news-list">
                {featuredNews.map((item, index) => (
                  <div
                    className={item.pinned ? "news-item pinned-item" : "news-item"}
                    key={`${item.link || item.title}-${index}`}
                  >
                    <div className="news-copy">
                      {item.pinned && <span className="pin-badge">Закреплено</span>}
                      <strong>{item.coin}</strong>
                      <p>{item.title || item.headline}</p>
                    </div>
                    <span className={item.trend === "Медвежий" ? "negative" : "positive"}>{item.trend}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">Why Pegasus</p>
                  <h3>Почему это выглядит как AI-бизнес</h3>
                </div>
              </div>
              <div className="stat-grid">
                {aiStatus.map((item) => (
                  <div className="stat-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      );
    }

    if (currentTab === "earnings") {
      return (
        <section className="single-column">
          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">Income</p>
                <h3>Как выглядит доход в live-режиме</h3>
              </div>
              {demoAmount > 0 && <div className="chart-badge">live</div>}
            </div>
            <div className="stat-grid earnings-grid">
              <div className="stat-box">
                <span>Доход</span>
                <strong className={demoProfit >= 0 ? "positive" : "negative"}>
                  {demoAmount > 0 ? formatSignedMoney(demoProfit) : "$0.00"}
                </strong>
              </div>
              <div className="stat-box">
                <span>Процент</span>
                <strong className={demoPercent >= 0 ? "positive" : "negative"}>
                  {demoAmount > 0 ? formatSignedPercent(demoPercent) : "0.00%"}
                </strong>
              </div>
              <div className="stat-box">
                <span>Баланс</span>
                <strong>$ {balance.toFixed(2)}</strong>
              </div>
            </div>
          </article>

          <article className="panel compact-panel">
            <div className="card-head">
              <div>
                <p className="section-tag">Engine</p>
                <h3>На чем Pegasus забирает процент</h3>
              </div>
            </div>
            <div className="news-list">
              {earningsSources.map((source) => (
                <div className="news-item signal-item" key={source.name}>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{source.note}</p>
                  </div>
                  <div className="signal-side">
                    <span>доля бота</span>
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
                <p className="section-tag">Rewards</p>
                <h3>Награды</h3>
              </div>
            </div>
            <div className="reward-grid">
              {rewardPrograms.map((program) => (
                <article className="reward-card" key={program.title}>
                  <div className="reward-head">
                    <strong>{program.title}</strong>
                    <span className="reward-pill">{program.reward}</span>
                  </div>
                  <div className="reward-progress">
                    <div className="reward-progress-head">
                      <span>
                        {program.type === "deposit"
                          ? `${depositRewardProgress.toFixed(0)}/${program.target}`
                          : `${tradingRewardProgress.toFixed(1)}/${program.target}$`}
                      </span>
                      <strong
                        className={
                          (program.type === "deposit"
                            ? depositRewardProgress >= program.target
                            : tradingRewardProgress >= program.target)
                            ? "positive"
                            : ""
                        }
                      >
                        {(program.type === "deposit"
                          ? depositRewardProgress >= program.target
                          : tradingRewardProgress >= program.target)
                          ? "выполнено"
                          : "в процессе"}
                      </strong>
                    </div>
                    <div className="reward-progress-track">
                      <div
                        className="reward-progress-bar"
                        style={{
                          width: `${
                            program.type === "deposit"
                              ? Math.min((depositRewardProgress / program.target) * 100, 100)
                              : Math.min((tradingRewardProgress / program.target) * 100, 100)
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <p>{program.note}</p>
                  <button className="ghost-link reward-link" type="button" onClick={() => setDepositOpen(true)}>
                    Активировать
                  </button>
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
                <p className="section-tag">Activity Feed</p>
                <h3>Последние действия</h3>
              </div>
              <button className="ghost-link" type="button" onClick={() => handleTabChange("home")}>
                Назад
              </button>
            </div>
            <div className="activity-list">
              {activityFeed.length > 0 ? (
                activityFeed.map((item, index) => (
                  <article className="activity-card" key={`${item.title}-${item.amount}-${index}`}>
                    <div className="activity-icon-wrap">
                      <span className="activity-icon">{getActivityIcon(item.title)}</span>
                    </div>
                    <div className="activity-main">
                      <div className="activity-head">
                        <div>
                          <strong>{item.title}</strong>
                          <div className="activity-stamp">
                            <span>{item.date}</span>
                            <span>{item.time}</span>
                          </div>
                        </div>
                        <div className="activity-side">
                          <strong className="activity-amount">{item.amount}</strong>
                          <span className="activity-asset">{item.asset}</span>
                        </div>
                      </div>
                      <p className="activity-note">{item.note}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="activity-empty">Пока нет действий. После пополнения или обмена история появится здесь.</div>
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
              <p className="section-tag">News Feed</p>
              <h3>Новости по монетам</h3>
            </div>
          </div>
          <div className="news-list">
            {newsFeed.map((item, index) => (
              <div
                className={item.pinned ? "news-item pinned-item" : "news-item"}
                key={`${item.link || item.title}-${index}`}
              >
                <div className="news-copy">
                  {item.pinned && <span className="pin-badge">Закреплено</span>}
                  <strong>{item.coin}</strong>
                  <p>{item.title || item.headline}</p>
                </div>
                <span className={item.trend === "Медвежий" ? "negative" : "positive"}>{item.trend}</span>
              </div>
            ))}
          </div>
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
          <span className="brand-glyph">P</span>
          <div className="brand-text">
            <h1>
              <span className="brand-main">PEGASUS</span>
              <span className="brand-sub">adaptive ai market desk</span>
            </h1>
          </div>
        </div>
        <div className="language-switch" role="group" aria-label="Language switch">
          <button
            className={language === "ru" ? "language-button active" : "language-button"}
            type="button"
            onClick={() => setLanguage("ru")}
          >
            RU
          </button>
          <button
            className={language === "en" ? "language-button active" : "language-button"}
            type="button"
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </header>

      <main className="main-area">
        <div className={isTabAnimating ? "tab-stage animating" : "tab-stage"}>
          {outgoingTab && (
            <div className={tabDirection > 0 ? "tab-pane tab-pane-overlay tab-exit-left" : "tab-pane tab-pane-overlay tab-exit-right"}>
              {renderTabContent(outgoingTab)}
            </div>
          )}
          <div className={isTabAnimating ? (tabDirection > 0 ? "tab-pane tab-enter-right" : "tab-pane tab-enter-left") : "tab-pane tab-current"}>
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
        <div className="modal-backdrop" onClick={() => setDepositOpen(false)} role="presentation">
          <div className="deposit-modal panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="section-tag">{copy.modal.depositTitle}</p>
            <h3>{copy.modal.amountTitle}</h3>
            <div className="amount-wrap">
              <span className="amount-prefix">$</span>
              <input
                className="amount-input"
                type="number"
                min="1"
                step="1"
                value={depositInput}
                onChange={(event) => setDepositInput(event.target.value)}
              />
            </div>
            <div className="action-row wallet-buttons">
              <button className="primary-button" type="button" onClick={startDemoSimulation}>
                {copy.modal.submit}
              </button>
              <button className="secondary-button" type="button" onClick={() => setDepositOpen(false)}>
                {copy.modal.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExchangeOpen && (
        <div className="modal-backdrop" onClick={() => setExchangeOpen(false)} role="presentation">
          <div className="deposit-modal panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="section-tag">Exchange</p>
            <h3>Выбери актив для графика и обмена</h3>
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
                Закрыть
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
    <button className={active ? "bottom-button active" : "bottom-button"} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

export default App;
