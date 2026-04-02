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

const pinnedStory = {
  coin: "PEGASUS x LYN",
  title: "PEGASUS сделал коллаборацию с LYN. Теперь зарабатывать на AI-валюте стало еще проще.",
  description: "Новый режим усиливает AI-скан новостей и ускоряет автопилот на монете LYN.",
  trend: "Бычий",
  pinned: true
};

function App() {
  const [tab, setTab] = useState("home");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
  const [demoAmount, setDemoAmount] = useState(0);
  const [demoProfit, setDemoProfit] = useState(0);
  const [demoPercent, setDemoPercent] = useState(0);
  const [isDemoRunning, setDemoRunning] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [latestNews, setLatestNews] = useState([]);
  const [isHeroVisible, setHeroVisible] = useState(true);
  const [isHeroClosing, setHeroClosing] = useState(false);
  const simulationRef = useRef(null);
  const heroDismissRef = useRef(null);

  const balance = demoAmount + demoProfit;
  const newsFeed = useMemo(() => [pinnedStory, ...latestNews], [latestNews]);
  const featuredNews = newsFeed.slice(0, 2);
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
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMarketData = async () => {
      try {
        const response = await fetch("/api/market/lyn");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load bitcoin data");
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
  }, []);

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

    setDemoAmount(amount);
    setDemoProfit(0);
    setDemoPercent(0);
    setDemoRunning(true);
    setDepositOpen(false);

    let step = 0;
    let percent = 0;

    simulationRef.current = window.setInterval(() => {
      step += 1;
      const delta = Math.random() * 1.8 - 0.7;
      percent = Math.max(-1.5, Math.min(10, Number((percent + delta).toFixed(2))));
      const profit = Number(((amount * percent) / 100).toFixed(2));

      setDemoPercent(percent);
      setDemoProfit(profit);

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

  return (
    <div className="app-shell">
      <div className="grid-glow glow-left"></div>
      <div className="grid-glow glow-right"></div>

      <header className="topbar">
        <div className="brand-lockup">
          <h1>
            <span className="brand-main">PEGASUS</span>
            <span className="brand-sub">ai earning engine</span>
          </h1>
        </div>
        <div className="status-chip live-chip">
          <span className="live-pulse">
            <span className="live-dot"></span>
            <span className="live-wave wave-one"></span>
            <span className="live-wave wave-two"></span>
          </span>
          Live
        </div>
      </header>

      <main className="main-area">
        {tab === "home" && (
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

              <div className="chart-panel panel">
                <div className="chart-head">
                  <div>
                    <p className="section-tag">LYN Feed</p>
                    <h2>LYN / USD</h2>
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
              </div>
            </section>

            <section className="cards-row">
              <article className="panel compact-panel">
                <div className="card-head">
                  <div>
                    <p className="section-tag">News</p>
                    <h3>Что Pegasus видит сейчас</h3>
                  </div>
                  <button className="ghost-link" type="button" onClick={() => setTab("news")}>
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
        )}

        {tab === "earnings" && (
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
        )}

        {tab === "news" && (
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
                    <span className={item.trend === "Медвежий" ? "negative" : "positive"}>
                      {item.trend}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <BottomNavButton label="Главная" active={tab === "home"} onClick={() => setTab("home")} />
        <BottomNavButton
          label="Доход"
          active={tab === "earnings"}
          onClick={() => setTab("earnings")}
        />
        <BottomNavButton label="Новости" active={tab === "news"} onClick={() => setTab("news")} />
      </nav>

      {isDepositOpen && (
        <div className="modal-backdrop" onClick={() => setDepositOpen(false)} role="presentation">
          <div className="deposit-modal panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="section-tag">Пополнить баланс</p>
            <h3>Введите сумму в долларах</h3>
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
            <p className="modal-note">
              После пополнения live-доход будет меняться каждые 5 секунд.
            </p>
            <div className="action-row wallet-buttons">
              <button className="primary-button" type="button" onClick={startDemoSimulation}>
                Пополнить баланс
              </button>
              <button className="secondary-button" type="button" onClick={() => setDepositOpen(false)}>
                Отмена
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
