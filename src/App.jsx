import { useEffect, useRef, useState } from "react";

const candleSeries = [
  { open: 24, close: 42, high: 52, low: 18 },
  { open: 42, close: 36, high: 48, low: 28 },
  { open: 36, close: 54, high: 62, low: 32 },
  { open: 54, close: 50, high: 58, low: 44 },
  { open: 50, close: 66, high: 74, low: 46 },
  { open: 66, close: 61, high: 72, low: 55 },
  { open: 61, close: 78, high: 86, low: 58 }
];

const latestNews = [
  {
    coin: "BTC",
    headline: "ETF-потоки держатся выше ожиданий, крупный спрос сохраняется.",
    trend: "Бычий"
  },
  {
    coin: "ETH",
    headline: "Сетевые метрики растут, рынок ждет продолжение импульса.",
    trend: "Бычий"
  },
  {
    coin: "SOL",
    headline: "После локального роста идет фиксация, давление продавцов усилилось.",
    trend: "Медвежий"
  }
];

const signalCards = [
  { pair: "BTC / USDT", trend: "Бычий", confidence: "94%" },
  { pair: "ETH / USDT", trend: "Бычий", confidence: "89%" },
  { pair: "SOL / USDT", trend: "Медвежий", confidence: "86%" }
];

function App() {
  const [tab, setTab] = useState("home");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
  const [demoAmount, setDemoAmount] = useState(0);
  const [demoProfit, setDemoProfit] = useState(0);
  const [demoPercent, setDemoPercent] = useState(0);
  const [isDemoRunning, setDemoRunning] = useState(false);
  const simulationRef = useRef(null);

  const balance = demoAmount + demoProfit;
  const featuredNews = latestNews.slice(0, 2);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#010201");
    tg.setBackgroundColor("#000000");
    tg.MainButton.setParams({
      text: "Пополнить баланс",
      color: "#31ff7a",
      text_color: "#020503",
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
      const delta = Math.random() * 1.8 - 0.6;
      percent = Math.max(-1.2, Math.min(10, Number((percent + delta).toFixed(2))));
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
    <div className="app-shell compact">
      <div className="noise"></div>
      <div className="ambient ambient-left"></div>
      <div className="ambient ambient-right"></div>

      <header className="topbar compact-topbar">
        <div>
          <p className="eyebrow">Neural Trade Assistant</p>
          <h1>Pegasus</h1>
        </div>
        <button className="live-chip" type="button">
          {isDemoRunning ? "LIVE" : "READY"}
        </button>
      </header>

      <main className="screen-stack compact-stack">
        {tab === "home" && (
          <section className="dense-layout">
            <article className="compact-card hero-card">
              <div className="balance-chart-row">
                <div className="balance-side">
                  <p className="section-tag">Balance</p>
                  <h2>${balance.toFixed(2)}</h2>
                  <div className="balance-actions">
                    <button className="primary-button small-button" type="button" onClick={() => setDepositOpen(true)}>
                      Пополнить
                    </button>
                    <button className="secondary-button small-button" type="button" onClick={showBetaWithdraw}>
                      Вывести
                    </button>
                  </div>
                </div>

                <div className="candle-chart">
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
                            height: `${Math.max(bodyTop - bodyBottom, 6)}%`
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="summary-grid">
                <article className="mini-stat">
                  <span>Тренд рынка</span>
                  <strong className="red-text">Бычий</strong>
                </article>
                <article className="mini-stat">
                  <span>Доход</span>
                  <strong className={demoProfit >= 0 ? "green-text" : "red-text"}>
                    {demoProfit >= 0 ? "+" : ""}${demoProfit.toFixed(2)}
                  </strong>
                </article>
                <article className="mini-stat">
                  <span>Процент</span>
                  <strong className={demoPercent >= 0 ? "green-text" : "red-text"}>
                    {demoPercent >= 0 ? "+" : ""}
                    {demoPercent.toFixed(2)}%
                  </strong>
                </article>
              </div>
            </article>

            <article className="compact-card glass-panel">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Latest News</p>
                  <h3>Последние 2 новости</h3>
                </div>
                <button className="ghost-link" type="button" onClick={() => setTab("news")}>
                  Все
                </button>
              </div>
              <div className="signal-list">
                {featuredNews.map((item) => (
                  <div className="signal-row compact-row" key={item.coin}>
                    <div>
                      <strong>{item.coin}</strong>
                      <p>{item.headline}</p>
                    </div>
                    <div className="signal-meta">
                      <span>Тренд</span>
                      <strong className="red-text">{item.trend}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === "analytics" && (
          <section className="dense-layout">
            <article className="compact-card glass-panel">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Signals</p>
                  <h3>Текущая аналитика</h3>
                </div>
              </div>
              <div className="signal-list">
                {signalCards.map((signal) => (
                  <div className="signal-row compact-row" key={signal.pair}>
                    <div>
                      <strong>{signal.pair}</strong>
                      <p>{signal.trend}</p>
                    </div>
                    <div className="signal-meta">
                      <span>Уверенность</span>
                      <strong>{signal.confidence}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === "news" && (
          <section className="dense-layout">
            <article className="compact-card glass-panel">
              <div className="panel-head">
                <div>
                  <p className="section-tag">News Feed</p>
                  <h3>Новости по монетам</h3>
                </div>
              </div>
              <div className="signal-list">
                {latestNews.map((item) => (
                  <div className="signal-row compact-row" key={item.coin}>
                    <div>
                      <strong>{item.coin}</strong>
                      <p>{item.headline}</p>
                    </div>
                    <div className="signal-meta">
                      <span>Тренд</span>
                      <strong className="red-text">{item.trend}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === "wallet" && (
          <section className="dense-layout">
            <article className="compact-card glass-panel">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Wallet</p>
                  <h3>Управление балансом</h3>
                </div>
              </div>
              <div className="wallet-grid">
                <article className="mini-stat">
                  <span>Сумма</span>
                  <strong>${demoAmount.toFixed(2)}</strong>
                </article>
                <article className="mini-stat">
                  <span>PnL</span>
                  <strong className={demoProfit >= 0 ? "green-text" : "red-text"}>
                    {demoProfit >= 0 ? "+" : ""}${demoProfit.toFixed(2)}
                  </strong>
                </article>
              </div>
              <div className="balance-actions wallet-actions">
                <button className="primary-button small-button" type="button" onClick={() => setDepositOpen(true)}>
                  Пополнить
                </button>
                <button className="secondary-button small-button" type="button" onClick={showBetaWithdraw}>
                  Вывести
                </button>
              </div>
            </article>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Основные разделы">
        <BottomNavButton label="Главная" isActive={tab === "home"} onClick={() => setTab("home")} />
        <BottomNavButton
          label="Аналитика"
          isActive={tab === "analytics"}
          onClick={() => setTab("analytics")}
        />
        <BottomNavButton label="Новости" isActive={tab === "news"} onClick={() => setTab("news")} />
        <BottomNavButton label="Баланс" isActive={tab === "wallet"} onClick={() => setTab("wallet")} />
      </nav>

      {isDepositOpen && (
        <div className="modal-backdrop" onClick={() => setDepositOpen(false)} role="presentation">
          <div className="deposit-modal" onClick={(event) => event.stopPropagation()} role="dialog">
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
            <p className="wallet-note">
              После пополнения сумма будет меняться каждые 5 секунд в demo-режиме.
            </p>
            <div className="balance-actions wallet-actions">
              <button className="primary-button small-button" type="button" onClick={startDemoSimulation}>
                Пополнить баланс
              </button>
              <button className="secondary-button small-button" type="button" onClick={() => setDepositOpen(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNavButton({ label, isActive, onClick }) {
  return (
    <button className={isActive ? "bottom-button active" : "bottom-button"} type="button" onClick={onClick}>
      <span className="bottom-dot"></span>
      {label}
    </button>
  );
}

export default App;
