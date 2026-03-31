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
// ── ROUTE RISK ─────────────────────────────────────────────
const routeData = {
  "NH48_01": { name:"NH-48 Aspura",        lat:27.454846, lon:76.030283, end_lat:27.456285, end_lon:76.033271, blackspot:1, road_type:0, speed_limit:90 },
  "NH48_02": { name:"Civil Lines",          lat:26.904344, lon:75.793283, end_lat:26.908846, end_lon:75.779521, blackspot:0, road_type:0, speed_limit:90 },
  "NH48_06": { name:"NH-48 Mahapura",      lat:26.879585, lon:75.715027, end_lat:26.8642,   end_lon:75.6845,   blackspot:1, road_type:0, speed_limit:90 },
  "GB_01":   { name:"Gopalpura-Tonk Road", lat:26.856000, lon:75.820000, end_lat:26.868000, end_lon:75.810000, blackspot:0, road_type:1, speed_limit:50 },
  "GB_05":   { name:"Gopalpura-Heerapura", lat:26.892000, lon:75.744000, end_lat:26.893500, end_lon:75.748500, blackspot:1, road_type:1, speed_limit:50 },
  "AR_01":   { name:"Agra Rd-Transport Ngr",lat:26.905500,lon:75.845500, end_lat:26.910000, end_lon:75.860000, blackspot:1, road_type:2, speed_limit:70 },
  "AR_05":   { name:"Agra Rd-Kanota",      lat:26.861000, lon:75.955000, end_lat:26.855000, end_lon:76.010000, blackspot:1, road_type:2, speed_limit:70 },
  "JLN_01":  { name:"JLN-Ajmeri Gate",     lat:26.921500, lon:75.831500, end_lat:26.912000, end_lon:75.820000, blackspot:0, road_type:1, speed_limit:50 },
  "JLN_05":  { name:"JLN-Airport Road",    lat:26.847000, lon:75.786000, end_lat:26.829000, end_lon:75.805000, blackspot:0, road_type:1, speed_limit:60 },
  "DR_01":   { name:"Delhi Rd-Badi Chopad",lat:26.924500, lon:75.827000, end_lat:26.938000, end_lon:75.834000, blackspot:0, road_type:1, speed_limit:40 },
  "DR_05":   { name:"Delhi Rd-Chandwaji",  lat:27.056000, lon:75.915000, end_lat:27.078000, end_lon:75.932000, blackspot:0, road_type:0, speed_limit:80 },
  "AJR_01":  { name:"Ajmer Rd-22 Godam",  lat:26.924500, lon:75.818000, end_lat:26.916000, end_lon:75.805000, blackspot:0, road_type:1, speed_limit:40 },
  "AJR_05":  { name:"Ajmer Rd-200Ft Byps",lat:26.893500, lon:75.748500, end_lat:26.890207, end_lon:75.738546, blackspot:1, road_type:0, speed_limit:80 },
  "TR_01":   { name:"Tonk Rd-Ajmeri Gate",lat:26.921500, lon:75.831500, end_lat:26.912000, end_lon:75.820000, blackspot:0, road_type:1, speed_limit:40 },
  "TR_05":   { name:"Tonk Rd-Chokhi Dhani",lat:26.774000,lon:75.828000, end_lat:26.750000, end_lon:75.825000, blackspot:0, road_type:2, speed_limit:70 },
};

let selectedDestSegment = null;

function searchDestination(query) {
  const box = document.getElementById("routeSuggestions");
  if (!query || query.length < 2) { box.innerHTML = ""; return; }

  const q = query.toLowerCase();
  const matches = roadSegments.filter(function(s) {
    return s.name.toLowerCase().includes(q);
  });

  if (matches.length === 0) {
    box.innerHTML = '<div class="route-suggestion-item" style="color:var(--muted)">No matching road found</div>';
    return;
  }

  box.innerHTML = matches.map(function(s) {
    return '<div class="route-suggestion-item" onclick="selectDest(\'' + s.id + '\')">' +
      '<i class="fa-solid fa-location-dot" style="color:var(--accent);margin-right:6px;"></i>' +
      s.name + '</div>';
  }).join("");
}

function selectDest(segId) {
  selectedDestSegment = roadSegments.find(s => s.id === segId);
  document.getElementById("routeDestInput").value = selectedDestSegment.name;
  document.getElementById("routeSuggestions").innerHTML = "";
}

function checkRouteRisk() {
  if (!currentLat || !currentLon) {
    showToast("GPS not detected yet. Wait for location.");
    return;
  }
  if (!selectedDestSegment) {
    showToast("Type and select a destination first.");
    return;
  }

  const result = document.getElementById("routeResult");
  result.style.display = "block";
  result.style.cssText = "display:block;padding:10px;color:var(--muted);font-size:12px;";
  result.textContent = "Checking route risk...";

  // From = current GPS location → nearest segment
  const fromSeg = currentSegment || {
    lat: currentLat, lon: currentLon,
    end_lat: currentLat + 0.003, end_lon: currentLon + 0.003,
    road_type: 1, speed_limit: 50, blackspot: 0, road_surface: 0
  };
  const toSeg = selectedDestSegment;

  const basePayload = {
    season: getSeason(), time_of_day: getTimeOfDay(),
    weather_type: getWeatherType(currentWeatherCode || 0, currentWindspeed || 0),
    traffic_density: getTrafficDensity()
  };

  Promise.all([
    fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...basePayload,
        start_latitude: fromSeg.lat, start_longitude: fromSeg.lon,
        end_latitude: fromSeg.end_lat || fromSeg.lat + 0.003,
        end_longitude: fromSeg.end_lon || fromSeg.lon + 0.003,
        road_type: fromSeg.road_type, speed_limit: fromSeg.speed_limit || 60,
        blackspot_flag: fromSeg.blackspot || 0, road_surface: fromSeg.road_surface || 0
      })
    }).then(r => r.json()),
    fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...basePayload,
        start_latitude: toSeg.lat, start_longitude: toSeg.lon,
        end_latitude: toSeg.end_lat || toSeg.lat + 0.003,
        end_longitude: toSeg.end_lon || toSeg.lon + 0.003,
        road_type: toSeg.road_type, speed_limit: toSeg.speed_limit || 60,
        blackspot_flag: toSeg.blackspot || 0, road_surface: toSeg.road_surface || 0
      })
    }).then(r => r.json())
  ])
  .then(function(res) {
    const r1 = res[0].risk, r2 = res[1].risk;
    const max = Math.max(r1, r2);
    const labels  = ["Low Risk", "Medium Risk", "High Risk"];
    const bgs     = ["#dcfce7", "#fef9c3", "#fee2e2"];
    const borders = ["#86efac", "#fcd34d", "#fca5a5"];
    const tcs     = ["#15803d", "#92400e", "#b91c1c"];

    result.style.cssText = "display:block;padding:12px;border-radius:10px;border:2px solid " +
      borders[max] + ";background:" + bgs[max] + ";";
    result.innerHTML =
      '<div style="font-size:14px;font-weight:900;color:' + tcs[max] + ';margin-bottom:6px;">' +
        labels[max] + ' on this Route</div>' +
      '<div style="font-size:12px;color:#374151;line-height:1.8;">' +
        '<b>From:</b> Your location — ' + labels[r1] + '<br>' +
        '<b>To:</b> ' + toSeg.name + ' — ' + labels[r2] +
      '</div>';

    speak("Route risk is " + labels[max] + ". Plan accordingly.");
  })
  .catch(function() {
    result.textContent = "Could not check route. Is Flask running?";
  });
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
