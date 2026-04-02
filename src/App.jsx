import { useEffect, useMemo, useRef, useState } from "react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

const chartSeries = [42, 48, 45, 56, 54, 63, 60, 68, 64, 71, 69, 74];

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
  const [botStatus, setBotStatus] = useState("idle");
  const [botMessage, setBotMessage] = useState("");
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [depositInput, setDepositInput] = useState("20");
  const [demoAmount, setDemoAmount] = useState(20);
  const [demoProfit, setDemoProfit] = useState(0);
  const [demoPercent, setDemoPercent] = useState(0);
  const [isDemoRunning, setDemoRunning] = useState(false);
  const simulationRef = useRef(null);

  const balance = useMemo(() => 24870 + demoProfit, [demoProfit]);
  const featuredNews = latestNews.slice(0, 2);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#041008");
    tg.setBackgroundColor("#020503");
    tg.MainButton.setParams({
      text: "Пополнить баланс",
      color: "#5eff98",
      text_color: "#03110a",
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

  const triggerBotTest = async () => {
    setBotStatus("loading");
    setBotMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/bot/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: "Pegasus test signal: neural engine online."
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Bot API request failed");
      }

      setBotStatus("success");
      setBotMessage("Тестовое сообщение отправлено через бот API.");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    } catch (error) {
      setBotStatus("error");
      setBotMessage(error.message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
    }
  };

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
      window.alert("Введите корректную сумму.");
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
      const delta = Math.random() * 1.6 - 0.45;
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
      <div className="ambient ambient-gold"></div>
      <div className="ambient ambient-blue"></div>

      <header className="topbar compact-topbar">
        <div>
          <p className="eyebrow">Neural Trade Assistant</p>
          <h1>Pegasus</h1>
        </div>
        <button className="live-chip" type="button">
          {isDemoRunning ? "DEMO LIVE" : "AI READY"}
        </button>
      </header>

      <main className="screen-stack compact-stack">
        {tab === "home" && (
          <section className="dense-layout">
            <article className="hero-card compact-card">
              <div className="balance-head">
                <div>
                  <p className="section-tag">Balance</p>
                  <h2>${balance.toFixed(2)}</h2>
                </div>
                <div className="balance-actions">
                  <button className="primary-button small-button" type="button" onClick={() => setDepositOpen(true)}>
                    Пополнить
                  </button>
                  <button className="secondary-button small-button" type="button" onClick={showBetaWithdraw}>
                    Вывести
                  </button>
                </div>
              </div>

              <div className="summary-grid">
                <article className="mini-stat">
                  <span>Тренд рынка</span>
                  <strong>Бычий</strong>
                </article>
                <article className="mini-stat">
                  <span>Demo PnL</span>
                  <strong className={demoProfit >= 0 ? "green-text" : "red-text"}>
                    {demoProfit >= 0 ? "+" : ""}${demoProfit.toFixed(2)}
                  </strong>
                </article>
                <article className="mini-stat">
                  <span>Доходность</span>
                  <strong className={demoPercent >= 0 ? "green-text" : "red-text"}>
                    {demoPercent >= 0 ? "+" : ""}
                    {demoPercent.toFixed(2)}%
                  </strong>
                </article>
              </div>

              <div className="demo-banner">
                <span>Demo mode</span>
                <p>
                  Симуляция движения суммы после пополнения. Это тестовый интерфейс, а не
                  обещание фактической прибыли.
                </p>
              </div>
            </article>

            <article className="glass-panel compact-card">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Mini Chart</p>
                  <h3>BTC trend</h3>
                </div>
                <span className="green-text">Bullish</span>
              </div>
              <div className="micro-chart">
                {chartSeries.map((value, index) => (
                  <div className="micro-bar-wrap" key={`${value}-${index}`}>
                    <div className="micro-bar" style={{ height: `${value}%` }}></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass-panel compact-card">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Latest News</p>
                  <h3>Последние 2 новости</h3>
                </div>
                <button className="ghost-link" type="button" onClick={() => setTab("news")}>
                  Все новости
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
                      <strong>{item.trend}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === "analytics" && (
          <section className="dense-layout">
            <article className="glass-panel compact-card">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Signals</p>
                  <h3>Текущая аналитика</h3>
                </div>
                <span className="green-text">AI online</span>
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

            <article className="glass-panel compact-card">
              <p className="section-tag">Engine</p>
              <div className="feature-grid compact-features">
                <Feature title="News Brain" text="Оценивает последние новости по монетам." />
                <Feature title="Trend Scan" text="Подсвечивает бычий или медвежий уклон." />
                <Feature title="Risk View" text="Показывает тестовые сценарии для суммы." />
              </div>
            </article>
          </section>
        )}

        {tab === "news" && (
          <section className="dense-layout">
            <article className="glass-panel compact-card">
              <div className="panel-head">
                <div>
                  <p className="section-tag">News Feed</p>
                  <h3>Лента новостей по монетам</h3>
                </div>
                <button className="ghost-link" type="button" onClick={triggerBotTest}>
                  Тест бота
                </button>
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
                      <strong>{item.trend}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <StatusPill status={botStatus} message={botMessage} large />
            </article>
          </section>
        )}

        {tab === "wallet" && (
          <section className="dense-layout">
            <article className="glass-panel compact-card">
              <div className="panel-head">
                <div>
                  <p className="section-tag">Wallet</p>
                  <h3>Управление балансом</h3>
                </div>
                <span className="green-text">beta</span>
              </div>
              <div className="wallet-grid">
                <article className="mini-stat">
                  <span>Сумма demo</span>
                  <strong>${demoAmount.toFixed(2)}</strong>
                </article>
                <article className="mini-stat">
                  <span>Demo PnL</span>
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
              <p className="wallet-note">
                Демо-симуляция обновляет сумму раз в 5 секунд и показывает тестовый PnL.
              </p>
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
            <h3>Введите сумму для demo-симуляции</h3>
            <input
              className="amount-input"
              type="number"
              min="1"
              step="1"
              value={depositInput}
              onChange={(event) => setDepositInput(event.target.value)}
            />
            <p className="wallet-note">
              После запуска интерфейс будет каждые 5 секунд менять сумму и процент в demo-режиме.
            </p>
            <div className="balance-actions wallet-actions">
              <button className="primary-button small-button" type="button" onClick={startDemoSimulation}>
                Запустить demo
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

function Feature({ title, text }) {
  return (
    <article className="feature-card compact-feature-card">
      <p className="section-tag">{title}</p>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
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

function StatusPill({ status, message, large = false }) {
  const text =
    status === "loading"
      ? "Отправка..."
      : status === "success"
        ? message
        : status === "error"
          ? message || "Ошибка отправки"
          : "Бот еще не проверялся";

  const className = [
    "status-pill",
    status === "success" ? "success" : "",
    status === "error" ? "error" : "",
    large ? "large" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={className}>{text}</div>;
}

export default App;
