import { useEffect, useMemo, useRef, useState } from "react";

const fallbackCandleSeries = [
  { open: 28, close: 33, high: 37, low: 24 },
  { open: 33, close: 31, high: 36, low: 29 },
  { open: 31, close: 36, high: 40, low: 30 },
  { open: 36, close: 42, high: 46, low: 34 },
  { open: 42, close: 40, high: 45, low: 38 },
  { open: 40, close: 47, high: 52, low: 39 },
  { open: 47, close: 44, high: 49, low: 41 },
  { open: 44, close: 50, high: 56, low: 43 },
  { open: 50, close: 55, high: 60, low: 48 },
  { open: 55, close: 53, high: 58, low: 51 },
  { open: 53, close: 59, high: 63, low: 52 },
  { open: 59, close: 62, high: 68, low: 57 },
  { open: 62, close: 60, high: 64, low: 58 },
  { open: 60, close: 65, high: 71, low: 59 },
  { open: 65, close: 69, high: 74, low: 63 },
  { open: 69, close: 67, high: 72, low: 65 },
  { open: 67, close: 73, high: 78, low: 66 },
  { open: 73, close: 77, high: 82, low: 71 },
  { open: 77, close: 75, high: 80, low: 73 },
  { open: 75, close: 81, high: 86, low: 74 },
  { open: 81, close: 79, high: 84, low: 77 },
  { open: 79, close: 85, high: 90, low: 78 },
  { open: 85, close: 88, high: 94, low: 83 },
  { open: 88, close: 92, high: 97, low: 87 }
];

const latestNews = [
  {
    coin: "BTC",
    headline: "ETF-потоки остаются сильными, спрос со стороны крупных игроков сохраняется.",
    trend: "Бычий"
  },
  {
    coin: "ETH",
    headline: "Рост сетевой активности усиливает интерес к активу на текущей неделе.",
    trend: "Бычий"
  },
  {
    coin: "SOL",
    headline: "После локального импульса рынок перешел в фиксацию и усилил давление продавцов.",
    trend: "Медвежий"
  }
];

const signalCards = [
  { pair: "BTC / USDT", trend: "Бычий", confidence: "94%", note: "новостной фон сильный" },
  { pair: "ETH / USDT", trend: "Бычий", confidence: "89%", note: "сеть усиливает импульс" },
  { pair: "SOL / USDT", trend: "Медвежий", confidence: "86%", note: "идет фиксация прибыли" }
];

function App() {
  const [tab, setTab] = useState("home");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
  const [demoAmount, setDemoAmount] = useState(0);
  const [demoProfit, setDemoProfit] = useState(0);
  const [demoPercent, setDemoPercent] = useState(0);
  const [isDemoRunning, setDemoRunning] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const simulationRef = useRef(null);

  const balance = demoAmount + demoProfit;
  const featuredNews = latestNews.slice(0, 2);
  const candleSeries = useMemo(() => {
    if (!marketData?.ohlc?.length) {
      return fallbackCandleSeries;
    }

    return marketData.ohlc.slice(-24).map((item) => ({
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4]
    }));
  }, [marketData]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#020503");
    tg.setBackgroundColor("#000000");
    tg.MainButton.setParams({
      text: "Пополнить баланс",
      color: "#39ff88",
      text_color: "#031108",
      is_active: true,
      is_visible: true
    });

    const handleMainButton = () => {
      setDepositOpen(true);
      tg.HapticFeedback?.impactOccurred("medium");
    };

    tg.MainButton.onClick(handleMainButton);

    return () => {
      tg.MainButton.offClick(handleMainButton);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        window.clearInterval(simulationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMarketData = async () => {
      try {
        const response = await fetch("/api/market/bitcoin");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load bitcoin data");
        }

        if (!cancelled) {
          setMarketData(payload);
        }
      } catch {
        if (!cancelled) {
          setMarketData(null);
        }
      }
    };

    loadMarketData();
    const timer = window.setInterval(loadMarketData, 30000);

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

  return (
    <div className="app-shell">
      <div className="grid-glow glow-left"></div>
      <div className="grid-glow glow-right"></div>

      <header className="topbar">
        <div className="brand-lockup">
          <p className="eyebrow">Neural Crypto Desk</p>
          <h1>
            <span className="brand-main">PEGASUS</span>
            <span className="brand-sub">market neural core</span>
          </h1>
        </div>
        <div className="status-chip">{isDemoRunning ? "SIMULATION LIVE" : "AI READY"}</div>
      </header>

      <main className="main-area">
        {tab === "home" && (
          <section className="home-layout">
            <section className="hero-panel">
              <div className="balance-panel panel">
                <p className="section-tag">Portfolio Balance</p>
                <div className="balance-value">$ {balance.toFixed(2)}</div>
                <div className="pnl-line">
                  <span>Доход:</span>
                  <strong className={demoProfit >= 0 ? "positive" : "negative"}>
                    {demoProfit >= 0 ? "+" : ""}${demoProfit.toFixed(2)}
                  </strong>
                  <strong className={demoPercent >= 0 ? "positive" : "negative"}>
                    {demoPercent >= 0 ? "+" : ""}
                    {demoPercent.toFixed(2)}%
                  </strong>
                </div>
                <div className="action-row">
                  <button className="primary-button" type="button" onClick={() => setDepositOpen(true)}>
                    Пополнить
                  </button>
                  <button className="secondary-button" type="button" onClick={showBetaWithdraw}>
                    Вывести
                  </button>
                </div>
                <div className="market-row">
                  <span>Тренд рынка</span>
                  <strong className="negative">Бычий</strong>
                </div>
              </div>

              <div className="chart-panel panel">
                <div className="chart-head">
                  <div>
                    <p className="section-tag">Live Candles</p>
                    <h2>BTC / USDT</h2>
                  </div>
                  <div className="chart-badge">
                    {marketData?.market?.current_price
                      ? `$${Math.round(marketData.market.current_price).toLocaleString()}`
                      : "24h"}
                  </div>
                </div>

                <div className="candle-grid">
                  {candleSeries.map((candle, index) => {
                    const bullish = candle.close >= candle.open;
                    const bodyTop = Math.max(candle.open, candle.close);
                    const bodyBottom = Math.min(candle.open, candle.close);

                    return (
                      <div className="candle-col" key={index}>
                        <div
                          className="candle-wick"
                          style={{
                            top: `${100 - candle.high}%`,
                            bottom: `${candle.low}%`
                          }}
                        ></div>
                        <div
                          className={bullish ? "candle-body bullish" : "candle-body bearish"}
                          style={{
                            top: `${100 - bodyTop}%`,
                            height: `${Math.max(bodyTop - bodyBottom, 4)}%`
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>

                <div className="chart-footer">
                  <span>
                    {marketData?.market
                      ? `24h: ${Math.round(marketData.market.low_24h).toLocaleString()} - ${Math.round(
                          marketData.market.high_24h
                        ).toLocaleString()}`
                      : "AI bias: strong accumulation"}
                  </span>
                  <strong
                    className={
                      (marketData?.market?.price_change_percentage_24h ?? 1) >= 0 ? "positive" : "negative"
                    }
                  >
                    {marketData?.market?.price_change_percentage_24h
                      ? `${marketData.market.price_change_percentage_24h.toFixed(2)}%`
                      : "+ bullish structure"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="cards-row">
              <article className="panel compact-panel">
                <div className="card-head">
                  <div>
                    <p className="section-tag">Latest News</p>
                    <h3>Последние 2 новости</h3>
                  </div>
                  <button className="ghost-link" type="button" onClick={() => setTab("news")}>
                    Все
                  </button>
                </div>
                <div className="news-list">
                  {featuredNews.map((item) => (
                    <div className="news-item" key={item.coin}>
                      <div>
                        <strong>{item.coin}</strong>
                        <p>{item.headline}</p>
                      </div>
                      <span className="negative">{item.trend}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel compact-panel">
                <div className="card-head">
                  <div>
                    <p className="section-tag">Market Stats</p>
                    <h3>Ключевые метрики</h3>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <span>AI Scan</span>
                    <strong>91.7%</strong>
                  </div>
                  <div className="stat-box">
                    <span>Signals</span>
                    <strong>8</strong>
                  </div>
                  <div className="stat-box">
                    <span>Mode</span>
                    <strong>Live</strong>
                  </div>
                </div>
              </article>
            </section>
          </section>
        )}

        {tab === "analytics" && (
          <section className="single-column">
            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">Signal Matrix</p>
                  <h3>Текущая аналитика</h3>
                </div>
              </div>
              <div className="news-list">
                {signalCards.map((signal) => (
                  <div className="news-item signal-item" key={signal.pair}>
                    <div>
                      <strong>{signal.pair}</strong>
                      <p>{signal.note}</p>
                    </div>
                    <div className="signal-side">
                      <span className={signal.trend === "Медвежий" ? "negative" : "positive"}>
                        {signal.trend}
                      </span>
                      <strong>{signal.confidence}</strong>
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
                {latestNews.map((item) => (
                  <div className="news-item" key={item.coin}>
                    <div>
                      <strong>{item.coin}</strong>
                      <p>{item.headline}</p>
                    </div>
                    <span className={item.trend === "Медвежий" ? "negative" : "negative"}>
                      {item.trend}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === "wallet" && (
          <section className="single-column">
            <article className="panel compact-panel">
              <div className="card-head">
                <div>
                  <p className="section-tag">Wallet</p>
                  <h3>Управление балансом</h3>
                </div>
              </div>
              <div className="wallet-grid">
                <div className="stat-box">
                  <span>Сумма</span>
                  <strong>$ {demoAmount.toFixed(2)}</strong>
                </div>
                <div className="stat-box">
                  <span>PnL</span>
                  <strong className={demoProfit >= 0 ? "positive" : "negative"}>
                    {demoProfit >= 0 ? "+" : ""}${demoProfit.toFixed(2)}
                  </strong>
                </div>
              </div>
              <div className="action-row wallet-buttons">
                <button className="primary-button" type="button" onClick={() => setDepositOpen(true)}>
                  Пополнить
                </button>
                <button className="secondary-button" type="button" onClick={showBetaWithdraw}>
                  Вывести
                </button>
              </div>
            </article>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <BottomNavButton label="Главная" active={tab === "home"} onClick={() => setTab("home")} />
        <BottomNavButton label="Аналитика" active={tab === "analytics"} onClick={() => setTab("analytics")} />
        <BottomNavButton label="Новости" active={tab === "news"} onClick={() => setTab("news")} />
        <BottomNavButton label="Баланс" active={tab === "wallet"} onClick={() => setTab("wallet")} />
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
              После пополнения сумма будет меняться каждые 5 секунд в demo-режиме.
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
      <span className="bottom-icon"></span>
      {label}
    </button>
  );
}

export default App;
