/* ===================================================
   RoadEye – dashboard.js
   =================================================== */

document.addEventListener("DOMContentLoaded", function() {
  

  // Load user name from session/localStorage
  const name = localStorage.getItem("re_userName") || "{{ user_name }}";
  const email = localStorage.getItem("re_userEmail") || "--";
  setUserDisplay(name, email);

  startClock();
  startUptime();
  initGPS();
  rotateTips();
});

// ── USER DISPLAY ──────────────────────────────────────────────
function setUserDisplay(name, email) {
  const headerName = document.getElementById("headerUserName");
  const dropName   = document.getElementById("dropdownName");
  const dropEmail  = document.getElementById("dropdownEmail");
  const avatar     = document.getElementById("userAvatar");
  if (headerName) headerName.textContent = name;
  if (dropName)   dropName.textContent   = name;
  if (dropEmail)  dropEmail.textContent  = email;
  if (avatar)     avatar.textContent     = name.charAt(0).toUpperCase();
}

// ── CLOCK ─────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const el = document.getElementById("time");
    if (el) el.textContent = h + ":" + m + ":" + s;
  }
  tick();
  setInterval(tick, 1000);
}

// ── UPTIME ────────────────────────────────────────────────────
const _startTime = Date.now();
function startUptime() {
  setInterval(function() {
    const sec = Math.floor((Date.now() - _startTime) / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2,'0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2,'0');
    const s = String(sec % 60).padStart(2,'0');
    const el = document.getElementById("uptime");
    if (el) el.textContent = h + ":" + m + ":" + s;
  }, 1000);
}
// ── VOICE ALERT ───────────────────────────────────────────────
let voiceEnabled = true;

function speak(text) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop if already speaking
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'en-IN'; // Indian English
  utterance.rate  = 0.9;     // slight slow for clarity
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
// ── GPS ───────────────────────────────────────────────────────
let currentWeatherCode = null;
let currentWindspeed   = null;
let currentLat         = null;
let currentLon         = null;

function initGPS() {
  setStatus("📡 Requesting GPS permission...", "info");
  if (!navigator.geolocation) {
    setStatus("❌ GPS not supported by this browser", "error");
    fetchWeatherFallback();
    return;
  }
  navigator.geolocation.watchPosition(onGPSSuccess, onGPSError, {
    enableHighAccuracy: true, timeout: 15000, maximumAge: 30000
  });
}

function onGPSSuccess(pos) {
  currentLat = pos.coords.latitude;
  currentLon = pos.coords.longitude;
  const acc  = Math.round(pos.coords.accuracy);

  // If accuracy is very poor (over 1km), warn the user and also try IP fallback
  if (acc > 1000) {
    setStatus("⚠️ GPS accuracy is low (±" + acc + "m) — desktop GPS is limited. Try on mobile for better results.", "info");
  } else {
    setStatus("📍 GPS acquired (±" + acc + "m) — loading weather...", "info");
  }

  document.getElementById("location").textContent =
    currentLat.toFixed(5) + ", " + currentLon.toFixed(5) + " (±" + acc + "m)";

  localStorage.setItem("re_lat", currentLat);
  localStorage.setItem("re_lon", currentLon);

  checkBlackspot(currentLat, currentLon);
  fetchWeather(currentLat, currentLon);
  fetchCityName(currentLat, currentLon);
}

function onGPSError(err) {
  let msg = "GPS unavailable — using IP fallback";
  if (err.code === 1) msg = "Location permission denied — using IP fallback";
  setStatus("⚠️ " + msg, "info");
  document.getElementById("location").textContent = msg;
  fetchWeatherFallback();
}

// ── CITY NAME ─────────────────────────────────────────────────
function fetchCityName(lat, lon) {
  fetch("https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=json")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      const a = data.address;
      const city    = a.city || a.town || a.village || a.county || "Unknown";
      const state   = a.state   || "";
      const country = a.country || "";
      const full = city + (state ? ", " + state : "") + (country ? ", " + country : "");
      document.getElementById("city").textContent = full;
      localStorage.setItem("re_city", full);
    })
    .catch(function() {
      document.getElementById("city").textContent = "City unavailable";
    });
}

// ── WEATHER ───────────────────────────────────────────────────
function fetchWeather(lat, lon) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + lat + "&longitude=" + lon +
    "&current=temperature_2m,relative_humidity_2m,windspeed_10m,weathercode" +
    "&windspeed_unit=kmh&timezone=auto";

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      const c = data.current;
      currentWeatherCode = c.weathercode;
      currentWindspeed   = c.windspeed_10m;

      const weatherDesc = decodeWeatherCode(c.weathercode);

      document.getElementById("temperature").textContent = c.temperature_2m + " °C";
      document.getElementById("weather").textContent     = weatherDesc;
      document.getElementById("humidity").textContent    = c.relative_humidity_2m + "%";
      document.getElementById("windspeed").textContent   = c.windspeed_10m + " km/h";

      localStorage.setItem("re_weather",     weatherDesc);
      localStorage.setItem("re_weatherCode", c.weathercode);
      localStorage.setItem("re_temp",        c.temperature_2m);
      localStorage.setItem("re_wind",        c.windspeed_10m);
      localStorage.setItem("re_humidity",    c.relative_humidity_2m);

      const score = weatherRiskScore(c.weathercode, c.windspeed_10m, new Date().getHours());
      updateIndicators(score);
      updateAdvisory(c.weathercode, c.windspeed_10m);

      setStatus("✅ Live weather loaded successfully", "success");
    })
    .catch(function() {
      setStatus("⚠️ Weather fetch failed — check internet connection", "error");
    });
}

function fetchWeatherFallback() {
  fetch("https://ipapi.co/json/")
    .then(function(r) { return r.json(); })
    .then(function(d) {
      document.getElementById("location").textContent =
        "IP: " + d.latitude.toFixed(4) + ", " + d.longitude.toFixed(4);
      document.getElementById("city").textContent =
        (d.city || "") + (d.region ? ", " + d.region : "") + (d.country_name ? ", " + d.country_name : "");
      currentLat = d.latitude;
      currentLon = d.longitude;
      fetchWeather(d.latitude, d.longitude);
    })
    .catch(function() {
      // Default Jaipur
      currentLat = 26.9124; currentLon = 75.7873;
      document.getElementById("location").textContent = "Default: Jaipur, India";
      document.getElementById("city").textContent = "Jaipur, Rajasthan, India";
      fetchWeather(26.9124, 75.7873);
    });
}

// ── WMO WEATHER DECODER ───────────────────────────────────────
function decodeWeatherCode(code) {
  if (code === 0)          return "Clear Sky ☀️";
  if (code <= 2)           return "Partly Cloudy ⛅";
  if (code === 3)          return "Overcast ☁️";
  if (code <= 49)          return "Foggy 🌫️";
  if (code <= 55)          return "Drizzle 🌦️";
  if (code <= 65)          return "Rain 🌧️";
  if (code <= 77)          return "Snow 🌨️";
  if (code <= 82)          return "Rain Showers 🌦️";
  if (code <= 86)          return "Snow Showers 🌨️";
  if (code >= 95)          return "Thunderstorm ⛈️";
  return "Unknown";
}

// ── BLACKSPOT ─────────────────────────────────────────────────
function checkBlackspot(lat, lon) {
  const spots = [
    { lat:26.89, lon:75.80 },
    { lat:28.63, lon:77.21 },
    { lat:19.07, lon:72.87 },
  ];
  const found = spots.some(function(s) {
    return Math.abs(lat - s.lat) < 0.05 && Math.abs(lon - s.lon) < 0.05;
  });
  document.getElementById("blackspot").innerHTML = found
    ? '<span style="color:#dc2626;font-weight:800;">⚠️ Yes — Accident Prone Zone</span>'
    : '<span style="color:#16a34a;font-weight:800;">✅ No — Safe Zone</span>';
}

// ── RISK SCORE ────────────────────────────────────────────────
function weatherRiskScore(code, wind, hour) {
  let score = 0;
  if (code >= 95)      score += 45;
  else if (code >= 66) score += 40;
  else if (code >= 51) score += 28;
  else if (code >= 45) score += 35;
  else if (code === 3) score += 10;
  else                 score += 5;

  if (wind > 60)      score += 25;
  else if (wind > 30) score += 15;
  else if (wind > 15) score += 8;

  if (hour >= 22 || hour <= 5)   score += 28;
  else if (hour >= 19)            score += 15;
  else if (hour <= 8)             score += 10;

  return Math.min(100, score);
}

// ── PREDICT RISK ──────────────────────────────────────────────
let statsChecks = 0, statsHigh = 0, statsLow = 0, statsScores = [];

function predictRisk() {
  const btn = document.getElementById("predictBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analysing...';

  const box = document.getElementById("riskIndicator");
  box.className = "risk-box waiting";
  box.innerHTML = '<div class="risk-box-icon">⏳</div><div class="risk-box-text">Analysing environment...</div><div class="risk-box-sub">Please wait</div>';

  setTimeout(function() {
    const hour = new Date().getHours();
    let score = currentWeatherCode !== null
      ? weatherRiskScore(currentWeatherCode, currentWindspeed || 0, hour)
      : (hour >= 22 || hour <= 5 ? 50 : 20);

    const blackspotText = document.getElementById("blackspot").textContent;
    if (blackspotText.includes("Yes")) score = Math.min(100, score + 25);

    let level, cls, icon, msg, sub;
    if (score >= 65) {
      level = "HIGH"; cls = "high"; icon = "🚨";
      msg = "HIGH RISK";
      sub = "Exercise extreme caution — dangerous conditions";
    } else if (score >= 35) {
      level = "MEDIUM"; cls = "medium"; icon = "⚡";
      msg = "MEDIUM RISK";
      sub = "Stay focused — do not drive recklessly";
    } else {
      level = "LOW"; cls = "low"; icon = "✅";
      msg = "LOW RISK";
      sub = "Conditions are relatively safe — stay alert";
    }
// Voice alert
if (score >= 65) {
  speak("Warning! High risk detected. Please reduce your speed immediately and drive with extreme caution.");
} else if (score >= 35) {
  speak("Caution. Medium risk detected. Road conditions are not ideal. Please focus on the road and maintain safe speed.");
} else {
  speak("Low risk. Road conditions are relatively safe. Drive responsibly and stay alert.");
}
    box.className = "risk-box " + cls;
    box.innerHTML =
      '<div class="risk-box-icon">' + icon + '</div>' +
      '<div class="risk-box-text">' + msg + ' (Score: ' + score + '/100)</div>' +
      '<div class="risk-box-sub">' + sub + '</div>';

    statsChecks++;
    statsScores.push(score);
    if (level === "HIGH")  statsHigh++;
    if (level === "LOW")   statsLow++;

    updateLiveStats();
    addHistory(level, score);
    updateIndicators(score);

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Check Current Risk';
    showDashToast(icon + " " + msg + " detected (Score: " + score + ")");

    saveHistoryLS(level, score);
  }, 1600);
}

// ── ADVISORY ─────────────────────────────────────────────────
function updateAdvisory(code, wind) {
  const list = document.getElementById("advisoryList");
  const hour = new Date().getHours();
  const tips = [];

  if (code >= 95)        tips.push({ t: "⛈️ Thunderstorm alert! Avoid driving if possible.", c: "danger" });
  else if (code >= 45 && code <= 49) tips.push({ t: "🌫️ Fog detected — use fog lights and slow down.", c: "danger" });
  else if (code >= 51 && code <= 65) tips.push({ t: "🌧️ Rain detected — reduce speed and increase following distance.", c: "warning" });

  if (wind > 50) tips.push({ t: "💨 Strong winds — keep a firm grip on the steering wheel.", c: "warning" });
  if (hour >= 22 || hour < 6) tips.push({ t: "🌙 Night driving — stay alert, use headlights.", c: "warning" });
  if (tips.length === 0) {
    tips.push({ t: "✅ Conditions look good. Drive safely and stay alert!", c: "" });
    tips.push({ t: "🚗 Maintain safe speed and following distance.", c: "" });
  }

  list.innerHTML = tips.map(function(tip) {
    return '<li class="' + tip.c + '">' + tip.t + '</li>';
  }).join("");
}

// ── INDICATORS ────────────────────────────────────────────────
function updateIndicators(score) {
  const vis     = Math.max(10, 100 - score);
  const traffic = Math.min(90, 20 + score * 0.6);
  const road    = Math.max(10, 100 - score * 0.8);
  const weather = Math.max(10, 100 - score * 0.9);

  animateBar("visibilityBar", "visibilityPct", vis);
  animateBar("trafficBar",    "trafficPct",    traffic);
  animateBar("roadBar",       "roadPct",       road);
  animateBar("weatherBar",    "weatherPct",    weather);
}

function animateBar(barId, pctId, pct) {
  const bar = document.getElementById(barId);
  const lbl = document.getElementById(pctId);
  if (!bar) return;
  bar.style.width = pct + "%";
  bar.style.background =
    pct > 60 ? "#16a34a" :
    pct > 35 ? "#d97706" : "#dc2626";
  if (lbl) lbl.textContent = Math.round(pct) + "%";
}

// ── LIVE STATS ────────────────────────────────────────────────
function updateLiveStats() {
  document.getElementById("checksToday").textContent = statsChecks;
  document.getElementById("highRiskCount").textContent = statsHigh;
  document.getElementById("safeCount").textContent = statsLow;
  if (statsScores.length > 0) {
    const avg = Math.round(statsScores.reduce(function(a,b){return a+b;},0) / statsScores.length);
    document.getElementById("avgScore").textContent = avg;
  }
}

// ── HISTORY TABLE ─────────────────────────────────────────────
function addHistory(level, score) {
  const body = document.getElementById("historyBody");
  const now  = new Date();
  const time = String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
  const weather = currentWeatherCode !== null ? decodeWeatherCode(currentWeatherCode) : "Unknown";
  const cls = level.toLowerCase();

  // Remove placeholder if present
  const noData = body.querySelector(".no-data");
  if (noData) noData.parentElement.remove();

  const row = document.createElement("tr");
  row.innerHTML =
    "<td>" + time + "</td>" +
    "<td>" + weather + "</td>" +
    "<td>" + score + "</td>" +
    "<td><span class='rbadge " + cls + "'>" + level + "</span></td>";

  body.insertBefore(row, body.firstChild);

  // Keep max 8 rows
  while (body.children.length > 8) body.removeChild(body.lastChild);
}

function saveHistoryLS(risk, score) {
  const entry = {
    time:    new Date().toLocaleTimeString(),
    weather: currentWeatherCode !== null ? decodeWeatherCode(currentWeatherCode) : "Unknown",
    risk:    risk,
    score:   score
  };
  
}

// ── QUICK ACTIONS ─────────────────────────────────────────────


function showRouteComing() {
  showDashToast("🗺️ Route Risk feature coming in a future update!");
}



// ── TIPS ROTATION ─────────────────────────────────────────────
const allTips = [
  "🚗 Always wear your seatbelt before starting the engine.",
  "📵 Never use your phone while driving.",
  "👀 Keep a safe following distance at all times.",
  "🌧️ Reduce speed in rain or foggy conditions.",
  "💡 Keep headlights on during low visibility hours.",
  "😴 Take a break every 2 hours on long drives.",
  "⛽ Keep your fuel tank adequately filled.",
  "🚦 Obey all traffic signals — even on empty roads.",
  "🔧 Check tyre pressure and coolant regularly.",
  "🌀 Watch for sudden weather changes in monsoon season.",
];



// ── STATUS BAR ────────────────────────────────────────────────
function setStatus(msg, type) {
  const el = document.getElementById("gps-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "gps-status " + type;
}

// ── TOAST ─────────────────────────────────────────────────────
let _toastTimer;
function showDashToast(msg) {
  const t = document.getElementById("dashToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { t.classList.add("hidden"); }, 3500);
}

// ── MODALS ────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function confirmLogout() {
  document.getElementById("logoutModal").classList.remove("hidden");
}
