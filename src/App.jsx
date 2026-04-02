import { useEffect, useState } from "react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

const performanceSeries = [
  { label: "Mon", value: 34 },
  { label: "Tue", value: 48 },
  { label: "Wed", value: 41 },
  { label: "Thu", value: 72 },
  { label: "Fri", value: 66 },
  { label: "Sat", value: 83 }
];

const liveSignals = [
  { pair: "BTC / USDT", direction: "LONG", confidence: "94%", delta: "+4.8%" },
  { pair: "ETH / USDT", direction: "SCALP", confidence: "88%", delta: "+2.1%" },
  { pair: "SOL / USDT", direction: "BREAKOUT", confidence: "91%", delta: "+5.4%" }
];

const newsFeed = [
  {
    coin: "BTC",
    headline: "ETF-потоки держатся выше ожиданий, крупный спрос сохраняется.",
    trend: "Бычий"
  },
  {
    coin: "ETH",
    headline: "Рынок ждет усиление сетевой активности, фон умеренно позитивный.",
    trend: "Бычий"
  },
  {
    coin: "SOL",
    headline: "После резкого роста усилилась фиксация прибыли и давление продавцов.",
    trend: "Медвежий"
  }
];

const systemCards = [
  {
    title: "Neural Scan",
    text: "Pegasus фильтрует рынок в реальном времени и убирает слабые сигналы."
  },
  {
    title: "News Brain",
    text: "Нейросеть оценивает последние новости по монетам и показывает уклон рынка."
  },
  {
    title: "Auto Pilot",
    text: "Pegasus сам считает риски, приоритеты и помогает вести сделку почти без рутины."
  }
];

function App() {
  const [screen, setScreen] = useState("home");
  const [botStatus, setBotStatus] = useState("idle");
  const [botMessage, setBotMessage] = useState("");

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
      text: screen === "home" ? "Open Analytics" : "Back To Pegasus",
      color: "#5eff98",
      text_color: "#03110a",
      is_active: true,
      is_visible: true
    });

    const handleMainButton = () => {
      setScreen((current) => (current === "home" ? "dashboard" : "home"));
      tg.HapticFeedback?.impactOccurred("medium");
    };

    tg.MainButton.onClick(handleMainButton);

    return () => {
      tg.MainButton.offClick(handleMainButton);
    };
  }, [screen]);

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

  const showBetaMessage = () => {
    const message = "Пополнение баланса пока в бете.";

    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
      return;
    }

    window.alert(message);
  };

  return (
    <div className="app-shell">
      <div className="noise"></div>
      <div className="ambient ambient-gold"></div>
      <div className="ambient ambient-blue"></div>

      <header className="topbar">
        <div>
          <p className="eyebrow">Telegram Mini App</p>
          <h1>Pegasus</h1>
        </div>
        <button className="live-chip" type="button">
          LIVE AI
        </button>
      </header>

      <nav className="tabs" aria-label="Навигация по приложению">
        <button
          className={screen === "home" ? "tab active" : "tab"}
          type="button"
          onClick={() => setScreen("home")}
        >
          Overview
        </button>
        <button
          className={screen === "dashboard" ? "tab active" : "tab"}
          type="button"
          onClick={() => setScreen("dashboard")}
        >
          Analytics
        </button>
      </nav>

      <main className="screen-stack">
        {screen === "home" ? (
          <section className="hero-layout">
            <article className="hero-card">
              <div className="hero-copy">
                <p className="section-tag">Neural Market Engine</p>
                <h2>Pegasus анализирует рынок, оценивает новости и делает рутину за вас.</h2>
                <p className="hero-text">
                  Это нейросеть, которая следит за монетами, смотрит последние новости,
                  помечает рынок как бычий или медвежий и помогает быстро понять,
                  где сейчас есть сильный сценарий.
                </p>

                <div className="hero-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setScreen("dashboard")}
                  >
                    Открыть аналитику
                  </button>
                  <button className="secondary-button" type="button" onClick={showBetaMessage}>
                    Пополнить баланс
                  </button>
                  <button className="secondary-button" type="button" onClick={triggerBotTest}>
                    Тест бота
                  </button>
                </div>

                <div className="metric-row">
                  <MetricCard label="Сегодня" value="+$1,284" note="8 AI-сигналов" />
                  <MetricCard label="Точность" value="91.7%" note="новости + теханализ" />
                  <MetricCard label="Режим" value="Active" note="нейросеть онлайн" />
                </div>
              </div>

              <div className="hero-visual">
                <div className="pegasus-frame">
                  <div className="halo halo-large"></div>
                  <div className="halo halo-small"></div>
                  <div className="wing wing-left"></div>
                  <div className="wing wing-right"></div>
                  <div className="core-orb"></div>
                  <div className="profit-badge">bullish mode</div>
                  <div className="scan-line"></div>
                </div>

                <div className="signal-ticket">
                  <span className="ticket-label">Neural outlook</span>
                  <strong>BTC / USDT bullish bias</strong>
                  <p>Pegasus видит сильный спрос и позитивный новостной фон.</p>
                </div>
              </div>
            </article>

            <section className="feature-grid">
              {systemCards.map((card) => (
                <article className="feature-card" key={card.title}>
                  <p className="section-tag">{card.title}</p>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </section>

            <section className="cta-strip">
              <div>
                <p className="section-tag">Balance Access</p>
                <h3>Пополнение баланса уже в интерфейсе, но сама функция пока в бете.</h3>
              </div>
              <div className="cta-actions">
                <button className="primary-button wide" type="button" onClick={showBetaMessage}>
                  Пополнить баланс
                </button>
                <StatusPill status={botStatus} message={botMessage} />
              </div>
            </section>
          </section>
        ) : (
          <section className="dashboard-layout">
            <article className="dashboard-hero">
              <div>
                <p className="section-tag">Pegasus Analytics</p>
                <h2>Сигналы, тренды и последние новости по монетам на одном экране.</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setScreen("home")}>
                На главный экран
              </button>
            </article>

            <section className="dashboard-grid">
              <article className="glass-panel">
                <div className="panel-head">
                  <div>
                    <p className="section-tag">Balance Engine</p>
                    <h3>$24,870</h3>
                  </div>
                  <span className="green-text">+18.4% this week</span>
                </div>
                <div className="chart">
                  {performanceSeries.map((item) => (
                    <div className="chart-col" key={item.label}>
                      <div className="chart-bar-wrap">
                        <div className="chart-bar" style={{ height: `${item.value}%` }}></div>
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-panel">
                <p className="section-tag">Live Signals</p>
                <div className="signal-list">
                  {liveSignals.map((signal) => (
                    <div className="signal-row" key={signal.pair}>
                      <div>
                        <strong>{signal.pair}</strong>
                        <p>{signal.direction}</p>
                      </div>
                      <div className="signal-meta">
                        <span>{signal.confidence}</span>
                        <strong>{signal.delta}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-panel">
                <p className="section-tag">Latest News</p>
                <div className="signal-list">
                  {newsFeed.map((item) => (
                    <div className="signal-row" key={item.coin}>
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

              <article className="glass-panel full-width">
                <div className="bot-panel">
                  <div>
                    <p className="section-tag">Pegasus Wallet</p>
                    <h3>Пополнение баланса будет открыто после завершения beta-режима.</h3>
                    <p className="muted-text">
                      Пока Pegasus показывает аналитику, новости, тренды и тестовые сигналы,
                      а кнопка пополнения работает как заглушка.
                    </p>
                  </div>
                  <button className="primary-button" type="button" onClick={showBetaMessage}>
                    Пополнить баланс
                  </button>
                </div>
                <StatusPill status={botStatus} message={botMessage} large />
              </article>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
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
