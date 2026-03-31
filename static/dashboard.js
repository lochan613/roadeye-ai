// ─── DATA ────────────────────────────────────────────────────

const ALL_TIPS = [
  "Always wear your seatbelt before starting the engine.",
  "Never use your phone while driving.",
  "Keep a safe following distance at all times.",
  "Reduce speed in rain or foggy conditions.",
  "Keep headlights on during low visibility hours.",
  "Take a break every 2 hours on long drives.",
  "Keep your fuel tank adequately filled.",
  "Obey all traffic signals — even on empty roads.",
  "Check tyre pressure and coolant regularly.",
  "Watch for sudden weather changes in monsoon season.",
];

const DESTINATIONS = [
  { id: "NH48_01", name: "NH-48 Aspura", blackspot: true },
  { id: "NH48_02", name: "Civil Lines", blackspot: false },
  { id: "NH48_06", name: "NH-48 Mahapura", blackspot: true },
  { id: "GB_01",   name: "Gopalpura-Tonk Road", blackspot: false },
  { id: "GB_05",   name: "Gopalpura-Heerapura", blackspot: true },
  { id: "AR_01",   name: "Agra Rd-Transport Nagar", blackspot: true },
  { id: "AR_05",   name: "Agra Rd-Kanota", blackspot: true },
  { id: "JLN_01",  name: "JLN-Ajmeri Gate", blackspot: false },
  { id: "JLN_05",  name: "JLN-Airport Road", blackspot: false },
  { id: "DR_01",   name: "Delhi Rd-Badi Chopad", blackspot: false },
  { id: "DR_05",   name: "Delhi Rd-Chandwaji", blackspot: false },
  { id: "AJR_01",  name: "Ajmer Rd-22 Godam", blackspot: false },
  { id: "AJR_05",  name: "Ajmer Rd-200Ft Bypass", blackspot: true },
  { id: "TR_01",   name: "Tonk Rd-Ajmeri Gate", blackspot: false },
  { id: "TR_05",   name: "Tonk Rd-Chokhi Dhani", blackspot: false },
];

// ─── HELPERS ─────────────────────────────────────────────────

function getRiskAdvisory(level, isDriving) {
  if (!isDriving) return [{ text: "Enable driving mode to get live advisory", type: "neutral" }];
  if (level === "waiting") return [{ text: "Click 'Check Risk' to get live advisory", type: "neutral" }];
  if (level === "high") return [
    { text: "⚠️ STOP if possible — dangerous road conditions detected!", type: "danger" },
    { text: "🚨 SLOW DOWN immediately — high risk environment", type: "danger" },
    { text: "💡 Turn on hazard lights and increase caution.", type: "warn" },
    { text: "📞 Keep emergency contacts reachable.", type: "warn" },
  ];
  if (level === "medium") return [
    { text: "⚡ Stay focused — conditions are not ideal.", type: "warn" },
    { text: "🚗 Maintain safe following distance — at least 3 seconds.", type: "warn" },
    { text: "🌦️ Reduce speed in uncertain areas.", type: "warn" },
    { text: "✅ You're driving — stay alert and aware.", type: "ok" },
  ];
  return [
    { text: "✅ Conditions look good. Drive safely!", type: "ok" },
    { text: "🚗 Maintain safe speed and following distance.", type: "ok" },
    { text: "👀 Stay alert — situations can change quickly.", type: "ok" },
  ];
}

function getRiskIndicators(level) {
  if (level === "low")    return { visibility: 88, traffic: 30, road: 85, weather: 90 };
  if (level === "medium") return { visibility: 52, traffic: 65, road: 60, weather: 45 };
  if (level === "high")   return { visibility: 22, traffic: 88, road: 28, weather: 15 };
  return { visibility: 0, traffic: 0, road: 0, weather: 0 };
}

function barColor(pct) {
  if (pct > 60) return "#16a34a";
  if (pct > 35) return "#d97706";
  return "#dc2626";
}

// ─── STATE ───────────────────────────────────────────────────

const state = {
  isDark: false,
  isDriving: false,
  voiceEnabled: true,
  accountOpen: false,
  riskLevel: "waiting",
  riskScore: 0,
  isChecking: false,
  timeStr: "",
  tips: ALL_TIPS.slice(0, 3),
  tipIndex: 0,
  routeDestInput: "",
  routeSuggestions: [],
  selectedDest: null,
  routeResult: null,
  toast: "",
  showToast: false,
  toastTimer: null,
};

// ─── FUNCTIONS ───────────────────────────────────────────────

function toggleDriving() {
  state.isDriving = !state.isDriving;
  if (!state.isDriving) {
    state.riskLevel = "waiting";
    state.riskScore = 0;
  }
  fireToast(state.isDriving ? "🚗 Driving Mode Activated — Risk monitoring enabled" : "⏸ Driving Mode Off");
  render();
}

function fireToast(msg) {
  state.toast = msg;
  state.showToast = true;
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    state.showToast = false;
    render();
  }, 3500);
  render();
}

function predictRisk() {
  if (!state.isDriving) return;
  state.isChecking = true;
  render();
  setTimeout(() => {
    const hour = new Date().getHours();
    let score = 5;
    if (hour >= 22 || hour <= 5) score += 28;
    else if (hour >= 19) score += 15;
    else if (hour <= 8) score += 10;
    score = Math.min(100, score + Math.floor(Math.random() * 15));
    let level = score >= 65 ? "high" : score >= 35 ? "medium" : "low";
    state.riskScore = score;
    state.riskLevel = level;
    state.isChecking = false;
    const labels = { low: "✅ LOW RISK", medium: "⚡ MEDIUM RISK", high: "🚨 HIGH RISK" };
    fireToast(`${labels[level]} detected (Score: ${score}/100)`);
    render();
  }, 1600);
}

function simulateRisk(level) {
  const scores = { low: 22, medium: 55, high: 78 };
  state.riskLevel = level;
  state.riskScore = scores[level];
  const labels = { low: "✅ LOW RISK", medium: "⚡ MEDIUM RISK", high: "🚨 HIGH RISK" };
  fireToast(`Demo: ${labels[level]} simulated`);
  render();
}

function searchDestination(q) {
  state.routeDestInput = q;
  state.selectedDest = null;
  state.routeResult = null;
  if (!q || q.length < 2) {
    state.routeSuggestions = [];
    render();
    return;
  }
  const matches = DESTINATIONS.filter(d => d.name.toLowerCase().includes(q.toLowerCase()));
  state.routeSuggestions = matches;
  render();
}

function selectDest(dest) {
  state.selectedDest = dest;
  state.routeDestInput = dest.name;
  state.routeSuggestions = [];
  render();
}

function checkRouteRisk() {
  if (!state.selectedDest) {
    fireToast("⚠️ Type and select a destination first.");
    return;
  }
  const fromLevel = "low";
  const destLevel = state.selectedDest.blackspot ? "high" : "low";
  const overallLevel = destLevel === "high" ? "high" : fromLevel === "medium" ? "medium" : "low";
  state.routeResult = {
    level: overallLevel,
    fromLabel: "Your Location (Jaipur)",
    toLabel: state.selectedDest.name,
    fromLevel,
    toLevel: destLevel,
  };
  render();
}

function toggleAccount() {
  state.accountOpen = !state.accountOpen;
  render();
}

function toggleDark() {
  state.isDark = !state.isDark;
  state.accountOpen = false;
  render();
}

function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  state.accountOpen = false;
  fireToast(state.voiceEnabled ? "🔇 Voice alerts disabled" : "🔊 Voice alerts enabled");
  render();
}

function closeAccount() {
  state.accountOpen = false;
  render();
}

// ─── RENDER ──────────────────────────────────────────────────

function render() {
  const T = {
    bg: state.isDark ? "#0d1117" : "#f0f4ff",
    card: state.isDark ? "#161b27" : "#ffffff",
    border: state.isDark ? "#2a3550" : "#e2e8f0",
    text: state.isDark ? "#e2e8f0" : "#0f172a",
    muted: state.isDark ? "#8fb3c8" : "#64748b",
    inputBg: state.isDark ? "#0d1117" : "#f0f4ff",
  };

  const advisory = getRiskAdvisory(state.riskLevel, state.isDriving);
  const indicators = getRiskIndicators(state.riskLevel);

  const riskConfig = {
    waiting: { bg: T.bg, border: T.border, iconColor: T.muted, textColor: T.muted, label: "Waiting", sub: "Toggle driving mode and click Check Risk" },
    low:     { bg: state.isDark ? "#14291e" : "#dcfce7", border: state.isDark ? "#4ade80" : "#86efac", iconColor: "#16a34a", textColor: state.isDark ? "#4ade80" : "#15803d", label: "LOW RISK", sub: "Conditions are relatively safe — stay alert" },
    medium:  { bg: state.isDark ? "#2a1f08" : "#fef9c3", border: state.isDark ? "#fbbf24" : "#fcd34d", iconColor: "#ca8a04", textColor: state.isDark ? "#fbbf24" : "#92400e", label: "MEDIUM RISK", sub: "Stay focused — do not drive recklessly" },
    high:    { bg: state.isDark ? "#2a1010" : "#fee2e2", border: state.isDark ? "#f87171" : "#fca5a5", iconColor: "#dc2626", textColor: state.isDark ? "#f87171" : "#b91c1c", label: "HIGH RISK", sub: "Exercise extreme caution — dangerous conditions" },
  };
  const rc = riskConfig[state.riskLevel];

  const routeLevelConfig = {
    low:    { bg: "#dcfce7", border: "#86efac", color: "#15803d", label: "Low Risk" },
    medium: { bg: "#fef9c3", border: "#fcd34d", color: "#92400e", label: "Medium Risk" },
    high:   { bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c", label: "High Risk" },
  };

  const advTypeStyle = (type) => {
    if (type === "ok")      return { bg: state.isDark ? "#14291e" : "#dcfce7", border: state.isDark ? "#4ade80" : "#86efac", color: state.isDark ? "#4ade80" : "#15803d" };
    if (type === "warn")    return { bg: state.isDark ? "#2a1f08" : "#fef9c3", border: state.isDark ? "#fbbf24" : "#fcd34d", color: state.isDark ? "#fbbf24" : "#92400e" };
    if (type === "danger")  return { bg: state.isDark ? "#2a1010" : "#fee2e2", border: state.isDark ? "#f87171" : "#fca5a5", color: state.isDark ? "#f87171" : "#b91c1c" };
    return { bg: T.bg, border: T.border, color: T.muted };
  };

  const cardStyle = `background: ${T.card}; border: 1px solid ${T.border}; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: ${state.isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 12px rgba(37,99,235,0.08)"};`;

  const cardTitleStyle = `display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: ${T.text}; padding-bottom: 12px; border-bottom: 1px solid ${T.border};`;

  const envItems = [
    { icon: "🛰️", bg: "#dbeafe", label: "Location", val: "26.91250, 75.78730" },
    { icon: "🏢", bg: "#ede9fe", label: "City", val: "Jaipur, Rajasthan" },
    { icon: "🌡️", bg: "#fee2e2", label: "Temperature", val: "32 °C" },
    { icon: "⛅", bg: "#fef3c7", label: "Weather", val: "Clear Sky ☀️" },
    { icon: "💧", bg: "#cffafe", label: "Humidity", val: "45%" },
    { icon: "💨", bg: "#dcfce7", label: "Wind", val: "12 km/h" },
    { icon: "🕒", bg: "#f0fdf4", label: "Time", val: state.timeStr || "--:--:--" },
    { icon: "⚠️", bg: "#fef9c3", label: "Nearest Zone", val: "✅ Safe Zone" },
  ].map(item => `
    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: ${T.bg}; border-radius: 10px; border: 1px solid ${T.border};">
      <div style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ${item.bg}; flex-shrink: 0; filter: ${state.isDark ? "brightness(0.7)" : "none"};">
        ${item.icon}
      </div>
      <div>
        <div style="font-size: 10px; color: ${T.muted}; font-weight: 600; text-transform: uppercase; letter-spacing: .4px;">${item.label}</div>
        <div style="font-size: 12px; font-weight: 700; color: ${T.text}; margin-top: 2px;">${item.val}</div>
      </div>
    </div>
  `).join('');

  const advisoryItems = advisory.map((item, i) => {
    const s = advTypeStyle(item.type);
    const icon = item.type === "ok" ? "✅" : item.type === "warn" ? "⚠️" : item.type === "danger" ? "❌" : "ℹ️";
    return `
      <li style="display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; line-height: 1.4; background: ${s.bg}; color: ${s.color}; border: 1px solid ${s.border};">
        ${icon}
        ${item.text}
      </li>
    `;
  }).join('');

  const tipsItems = state.tips.slice(0, 3).map(tip => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: ${T.bg}; border-radius: 8px; font-size: 12px; font-weight: 600; color: ${T.text}; border-left: 3px solid #2563eb;">
      ${tip}
    </div>
  `).join('');

  const indicatorsItems = [
    { name: "Visibility", val: indicators.visibility },
    { name: "Traffic", val: indicators.traffic },
    { name: "Road Condition", val: indicators.road },
    { name: "Weather Safety", val: indicators.weather },
  ].map(ind => `
    <div style="display: flex; flex-direction: column; gap: 5px;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
        <span style="color: ${T.muted};">${ind.name}</span>
        <span style="color: ${T.text};">${state.riskLevel === "waiting" ? "--" : `${ind.val}%`}</span>
      </div>
      <div style="height: 8px; background: ${T.border}; border-radius: 20px; overflow: hidden;">
        <div style="height: 100%; width: ${state.riskLevel === "waiting" ? "0%" : `${ind.val}%`}; background: ${barColor(ind.val)}; border-radius: 20px; transition: width .9s ease, background .4s;"></div>
      </div>
    </div>
  `).join('');

  const suggestions = state.routeSuggestions.map(s => `
    <div onclick="selectDest(${JSON.stringify(s).replace(/"/g, '&quot;')})" style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${T.text}; cursor: pointer; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid ${T.border};">
      📍 ${s.name}
      ${s.blackspot ? '<span style="margin-left: auto; font-size: 10px; color: #dc2626; font-weight: 700;">⚠️ Blackspot</span>' : ''}
    </div>
  `).join('');

  const routeResultHtml = state.routeResult ? (() => {
    const cfg = routeLevelConfig[state.routeResult.level];
    const fromCfg = routeLevelConfig[state.routeResult.fromLevel];
    const toCfg = routeLevelConfig[state.routeResult.toLevel];
    return `
      <div style="border-radius: 10px; padding: 12px; border: 2px solid ${cfg.border}; background: ${cfg.bg};">
        <div style="font-size: 14px; font-weight: 900; color: ${cfg.color}; margin-bottom: 6px;">${cfg.label} on this Route</div>
        <div style="font-size: 12px; color: #374151; line-height: 1.8;">
          <span style="font-weight: 700;">From:</span> ${state.routeResult.fromLabel} — <span style="color: ${fromCfg.color}; font-weight: 700;">${fromCfg.label}</span><br />
          <span style="font-weight: 700;">To:</span> ${state.routeResult.toLabel} — <span style="color: ${toCfg.color}; font-weight: 700;">${toCfg.label}</span>
        </div>
      </div>
    `;
  })() : '';

  const html = `
    <div style="background: ${T.bg}; color: ${T.text}; min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; transition: background .3s, color .3s;">
      <header style="height: 60px; background: linear-gradient(135deg, #1e3a8a, #2563eb); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 300; box-shadow: 0 2px 16px rgba(37,99,235,0.35);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 9px; font-size: 20px; font-weight: 900; color: #fff; letter-spacing: -0.3px;">
            👁️
            <span>RoadEye</span>
          </div>
          <span style="font-size: 12px; color: rgba(255,255,255,0.65); font-weight: 500;">Driver Safety Monitor</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div onclick="toggleDriving()" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 30px; padding: 5px 14px 5px 10px; cursor: pointer;">
            <span style="font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap;">${state.isDriving ? "Driving" : "Not Driving"}</span>
            <div style="width: 36px; height: 20px; background: ${state.isDriving ? "#22c55e" : "rgba(255,255,255,0.25)"}; border-radius: 20px; position: relative; cursor: pointer; transition: background .3s; flex-shrink: 0;">
              <div style="position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform .3s; transform: ${state.isDriving ? "translateX(16px)" : "translateX(0)"}; box-shadow: 0 1px 4px rgba(0,0,0,0.2);"></div>
            </div>
          </div>
          <a href="/safety-insights" style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 7px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none;">📊 Insights</a>
          <div class="account-dropdown" style="position: relative;">
            <div onclick="toggleAccount()" style="display: flex; align-items: center; gap: 9px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 6px 12px 6px 8px; cursor: pointer;">
              <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;">A</div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 13px; font-weight: 700; color: #fff; line-height: 1.2;">Driver</span>
                <span style="font-size: 10px; color: rgba(255,255,255,0.65);">My Account</span>
              </div>
              <span style="transition: transform .2s; transform: ${state.accountOpen ? "rotate(180deg)" : "rotate(0deg)"};">▼</span>
            </div>
            ${state.accountOpen ? `
              <div style="position: absolute; top: calc(100% + 8px); right: 0; background: ${T.card}; border: 1px solid ${T.border}; border-radius: 16px; min-width: 230px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 400; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: ${state.isDark ? "rgba(37,99,235,0.1)" : "linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.08))"};">
                  <div style="width: 42px; height: 42px; background: linear-gradient(135deg,#2563eb,#7c3aed); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #fff;">A</div>
                  <div>
                    <div style="font-size: 15px; font-weight: 800; color: ${T.text}">Driver</div>
                    <div style="font-size: 11px; color: ${T.muted}; margin-top: 2px;">driver@roadeye.app</div>
                  </div>
                </div>
                <div style="height: 1px; background: ${T.border};"></div>
                <a onclick="closeAccount()" href="/safety-insights" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 13px; font-weight: 600; color: ${T.text}; text-decoration: none;">📊 Safety Insights</a>
                <div onclick="toggleDark()" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 13px; font-weight: 600; color: ${T.text}; cursor: pointer;">
                  ${state.isDark ? "☀️" : "🌙"}
                  <span>${state.isDark ? "Light Mode" : "Dark Mode"}</span>
                </div>
                <div onclick="toggleVoice()" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 13px; font-weight: 600; color: ${T.text}; cursor: pointer;">
                  ${state.voiceEnabled ? "🔊" : "🔇"}
                  <span>${state.voiceEnabled ? "Voice On" : "Voice Off"}</span>
                </div>
                <div style="height: 1px; background: ${T.border};"></div>
                <a onclick="closeAccount()" href="/" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 13px; font-weight: 600; color: #dc2626; text-decoration: none;">🚪 Logout</a>
              </div>
            ` : ''}
          </div>
        </div>
      </header>
      ${state.isDriving ? `
        <div style="background: linear-gradient(90deg,#16a34a,#15803d); color: #fff; padding: 10px 24px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600;">
          🚗
          <span>Driving Mode Active — Risk monitoring enabled</span>
          <div style="width: 8px; height: 8px; background: #fff; border-radius: 50%; margin-left: auto; animation: pulse-anim 1.8s infinite;"></div>
        </div>
      ` : `
        <div style="background: ${T.card}; border-bottom: 1px solid ${T.border}; padding: 10px 24px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${T.muted};">
          ℹ️
          <span>Toggle <strong style="color: ${T.text};">"Driving"</strong> in the header to enable risk prediction</span>
        </div>
      `}
      <div class="dashboard-grid" style="display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; gap: 16px; padding: 20px 22px; max-width: 1480px; margin: 0 auto;">
        <div style="${cardStyle}">
          <div style="${cardTitleStyle}">
            🛰️
            <span>Current Environment</span>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #16a34a; background: rgba(22,163,74,0.1); padding: 3px 10px; border-radius: 20px;">
              <span style="width: 6px; height: 6px; background: #16a34a; border-radius: 50%; display: inline-block; animation: pulse-anim 1.8s infinite;"></span>
              Live
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${envItems}
          </div>
          <div style="padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; background: rgba(37,99,235,.1); color: #2563eb; border: 1px solid rgba(37,99,235,.25);">
            📍 GPS acquired (±35m) — Live weather loaded successfully
          </div>
        </div>
        <div style="${cardStyle}">
          <div style="${cardTitleStyle}">
            🧠
            <span>Risk Prediction</span>
          </div>
          <div style="border-radius: 14px; padding: 22px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all .4s; border: 2px solid ${rc.border}; background: ${rc.bg};">
            <div style="font-size: 36px; line-height: 1;">
              ${state.riskLevel === "waiting" ? "🛡️" : state.riskLevel === "low" ? "🛡️" : state.riskLevel === "medium" ? "⚡" : "⚠️"}
            </div>
            ${state.riskLevel !== "waiting" ? `
              <div style="font-size: 11px; font-weight: 700; color: ${rc.iconColor}; background: ${state.riskLevel === "low" ? "rgba(22,163,74,0.15)" : state.riskLevel === "medium" ? "rgba(202,138,4,0.15)" : "rgba(220,38,38,0.15)"}; padding: 2px 10px; border-radius: 20px;">
                Score: ${state.riskScore}/100
              </div>
            ` : ''}
            <div style="font-size: 22px; font-weight: 900; color: ${rc.textColor};">${rc.label}</div>
            <div style="font-size: 12px; color: ${T.muted}; line-height: 1.5;">${rc.sub}</div>
          </div>
          <button onclick="predictRisk()" ${!state.isDriving || state.isChecking ? 'disabled' : ''} style="width: 100%; padding: 13px; background: ${!state.isDriving || state.isChecking ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg,#2563eb,#7c3aed)"}; color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: ${!state.isDriving || state.isChecking ? "not-allowed" : "pointer"}; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; transition: opacity .2s; opacity: ${!state.isDriving || state.isChecking ? 0.55 : 1};">
            📏
            ${state.isChecking ? "Analysing..." : "Check Risk"}
          </button>
          <div style="display: flex; align-items: center; gap: 7px; padding: 8px 10px; background: ${T.bg}; border-radius: 10px; border: 1px dashed ${T.border};">
            <span style="font-size: 11px; font-weight: 700; color: ${T.muted}; flex: 1;">Demo</span>
            <button onclick="simulateRisk('high')" style="padding: 4px 12px; border: none; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; background: #fee2e2; color: #b91c1c; text-transform: capitalize;">High</button>
            <button onclick="simulateRisk('medium')" style="padding: 4px 12px; border: none; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; background: #fef9c3; color: #92400e; text-transform: capitalize;">Medium</button>
            <button onclick="simulateRisk('low')" style="padding: 4px 12px; border: none; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; background: #dcfce7; color: #15803d; text-transform: capitalize;">Low</button>
          </div>
          <div style="display: flex; gap: 7px; font-size: 11px; color: ${T.muted}; background: ${T.bg}; padding: 8px 10px; border-radius: 8px; line-height: 1.5;">
            ℹ️
            Medium risk = drive carefully, not that an accident will happen.
          </div>
        </div>
        <div style="${cardStyle}">
          <div style="${cardTitleStyle}">
            🔔
            <span>Driver Advisory</span>
          </div>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 7px;">
            ${advisoryItems}
          </ul>
          <div style="margin-top: 4px;">
            <div style="font-size: 12px; font-weight: 700; color: ${T.muted}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px;">Quick Tips</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${tipsItems}
            </div>
          </div>
        </div>
        <div style="${cardStyle}">
          <div style="${cardTitleStyle}">
            📊
            <span>Safety Indicators</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${indicatorsItems}
          </div>
          <div style="border-top: 1px solid ${T.border}; padding-top: 14px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: ${T.text}; display: flex; align-items: center; gap: 7px;">
              🛣️ Route Risk
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.3); border-radius: 9px; font-size: 12px; font-weight: 600; color: ${T.text};">
              📍
              <span>Your current location (auto)</span>
            </div>
            <div style="position: relative;">
              <input type="text" value="${state.routeDestInput}" oninput="searchDestination(this.value)" placeholder="Enter destination (e.g. Civil Lines)" style="width: 100%; padding: 9px 12px; border: 1.5px solid ${T.border}; border-radius: 9px; font-size: 12px; font-family: inherit; background: ${T.inputBg}; color: ${T.text}; outline: none;" />
              ${state.routeSuggestions.length > 0 ? `
                <div style="position: absolute; top: 100%; left: 0; right: 0; background: ${T.card}; border: 1px solid ${T.border}; border-radius: 8px; max-height: 160px; overflow-y: auto; z-index: 50; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  ${suggestions}
                </div>
              ` : ''}
            </div>
            <button onclick="checkRouteRisk()" style="width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 7px;">
              🔍 Check Route Risk
            </button>
            ${routeResultHtml}
          </div>
        </div>
      </div>
      ${state.showToast ? `
        <div style="position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 999; max-width: 320px; transition: opacity .3s, transform .3s; opacity: 1; transform: translateY(0); pointer-events: auto;">
          ${state.toast}
        </div>
      ` : ''}
      <style>
        @keyframes pulse-anim {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.5); }
          50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
        }
        @media (max-width: 1200px) {
          .dashboard-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 700px) {
          .dashboard-grid { grid-template-columns: 1fr !important; padding: 12px !important; }
        }
      </style>
    </div>
  `;

  document.body.innerHTML = html;
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const tick = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    state.timeStr = `${h}:${m}:${s}`;
    render();
  };
  tick();
  setInterval(tick, 1000);

  setInterval(() => {
    const next = (state.tipIndex + 3) % ALL_TIPS.length;
    state.tips = ALL_TIPS.slice(next, next + 3).concat(ALL_TIPS.slice(0, Math.max(0, next + 3 - ALL_TIPS.length)));
    state.tipIndex = next;
    render();
  }, 6000);

  document.addEventListener('mousedown', (e) => {
    const dropdown = document.querySelector('.account-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      state.accountOpen = false;
      render();
    }
  });

  render();
});