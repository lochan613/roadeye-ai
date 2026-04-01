/* ============================================================
   RoadEye — dashboard.js  (Complete)
   ============================================================ */

// ── STATE ─────────────────────────────────────────────────────
let isDriving          = false;
let voiceEnabled       = true;
let currentWeatherCode = null;
let currentWindspeed   = null;
let currentLat         = null;
let currentLon         = null;
let currentSegment     = null;

// ── ROAD SEGMENTS ─────────────────────────────────────────────
const roadSegments = [
  { id:"NH48_01", name:"NH-48 Aspura",         lat:27.4548, lon:76.0302, end_lat:27.4562, end_lon:76.0332, blackspot:1, road_type:0, speed_limit:90, road_surface:2 },
  { id:"NH48_02", name:"NH-48 Civil Lines",    lat:26.9043, lon:75.7932, end_lat:26.9088, end_lon:75.7795, blackspot:0, road_type:0, speed_limit:90, road_surface:1 },
  { id:"NH48_03", name:"NH-48 Sodala",         lat:26.9088, lon:75.7795, end_lat:26.8998, end_lon:75.7592, blackspot:1, road_type:0, speed_limit:90, road_surface:1 },
  { id:"NH48_04", name:"NH-48 DCM Bypass",     lat:26.8998, lon:75.7592, end_lat:26.8902, end_lon:75.7385, blackspot:1, road_type:0, speed_limit:90, road_surface:2 },
  { id:"NH48_05", name:"NH-48 Bhankrotan",     lat:26.8902, lon:75.7385, end_lat:26.8795, end_lon:75.7150, blackspot:1, road_type:0, speed_limit:90, road_surface:1 },
  { id:"NH48_06", name:"NH-48 Mahapura",       lat:26.8795, lon:75.7150, end_lat:26.8642, end_lon:75.6845, blackspot:1, road_type:0, speed_limit:90, road_surface:2 },
  { id:"AR_01",   name:"Agra Rd Transport Ngr",lat:26.9055, lon:75.8455, end_lat:26.9100, end_lon:75.8600, blackspot:1, road_type:2, speed_limit:70, road_surface:2 },
  { id:"AR_05",   name:"Agra Rd Ring Road",    lat:26.8610, lon:75.9550, end_lat:26.8550, end_lon:76.0100, blackspot:1, road_type:2, speed_limit:70, road_surface:2 },
  { id:"DR_02",   name:"Delhi Rd Jal Mahal",   lat:26.9535, lon:75.8450, end_lat:26.9870, end_lon:75.8570, blackspot:1, road_type:2, speed_limit:60, road_surface:1 },
  { id:"DR_04",   name:"Delhi Rd Kukas",       lat:27.0400, lon:75.8950, end_lat:27.0780, end_lon:75.9320, blackspot:0, road_type:2, speed_limit:80, road_surface:1 },
  { id:"JLN_01",  name:"JLN Marg Ajmeri Gate", lat:26.9215, lon:75.8315, end_lat:26.9120, end_lon:75.8200, blackspot:0, road_type:1, speed_limit:50, road_surface:0 },
  { id:"JLN_05",  name:"JLN Marg Airport Rd",  lat:26.8700, lon:75.7930, end_lat:26.8470, end_lon:75.7860, blackspot:0, road_type:1, speed_limit:60, road_surface:0 },
  { id:"AJR_03",  name:"Ajmer Rd Sodala",      lat:26.9055, lon:75.7695, end_lat:26.8935, end_lon:75.7592, blackspot:1, road_type:1, speed_limit:40, road_surface:1 },
  { id:"AJR_05",  name:"Ajmer Rd 200 Ft",      lat:26.8935, lon:75.7592, end_lat:26.8902, end_lon:75.7385, blackspot:1, road_type:0, speed_limit:80, road_surface:2 },
  { id:"GB_04",   name:"Gopalpura Gujar Thadi", lat:26.8825, lon:75.7535, end_lat:26.8920, end_lon:75.7440, blackspot:1, road_type:1, speed_limit:50, road_surface:1 },
  { id:"TR_05",   name:"Tonk Rd Chokhi Dhani", lat:26.7740, lon:75.8280, end_lat:26.7500, end_lon:75.8250, blackspot:0, road_type:2, speed_limit:70, road_surface:1 },
  { id:"KLR_02",  name:"Kalwar Rd Hathoj",     lat:26.9900, lon:75.7550, end_lat:27.0100, end_lon:75.7400, blackspot:0, road_type:2, speed_limit:60, road_surface:2 },
];

function getNearestSegment(lat, lon) {
  let nearest = null, minDist = Infinity;
  roadSegments.forEach(function(s) {
    const d = Math.sqrt(Math.pow(lat-s.lat,2)+Math.pow(lon-s.lon,2));
    if (d < minDist) { minDist = d; nearest = s; }
  });
  return nearest;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  loadUser();
  startClock();
  initTheme();
  initGPS();
  loadTips();
  closeDropdownOnOutsideClick();
});

// ── USER ──────────────────────────────────────────────────────
function loadUser() {
  const name  = localStorage.getItem("re_userName")  || "Driver";
  const email = localStorage.getItem("re_userEmail") || "";
  setEl("accountName",   name);
  setEl("accountAvatar", name.charAt(0).toUpperCase());
  setEl("dropName",      name);
  setEl("dropEmail",     email);
  setEl("dropAvatar",    name.charAt(0).toUpperCase());
}

// ── ACCOUNT DROPDOWN ──────────────────────────────────────────
function toggleAccountMenu() {
  const dd  = document.getElementById("accountDropdown");
  const chv = document.getElementById("accountChevron");
  const isOpen = dd.classList.contains("open");
  dd.classList.toggle("open", !isOpen);
  chv.classList.toggle("open", !isOpen);
}

function closeDropdownOnOutsideClick() {
  document.addEventListener("click", function(e) {
    const menu = document.getElementById("accountMenu");
    if (menu && !menu.contains(e.target)) {
      document.getElementById("accountDropdown").classList.remove("open");
      document.getElementById("accountChevron").classList.remove("open");
    }
  });
}

// ── DRIVING TOGGLE ────────────────────────────────────────────
function toggleDriving() {
  isDriving = !isDriving;
  const sw     = document.getElementById("driveToggle");
  const label  = document.getElementById("driveLabel");
  const banner = document.getElementById("driveBanner");
  const notice = document.getElementById("idleNotice");
  const btn    = document.getElementById("checkBtn");

  sw.classList.toggle("active", isDriving);
  label.textContent   = isDriving ? "Driving" : "Not Driving";
  banner.style.display = isDriving ? "flex" : "none";
  notice.style.display = isDriving ? "none" : "flex";
  btn.disabled         = !isDriving;

  if (isDriving) {
    showToast("Driving mode ON — risk monitoring active");
    speak("Driving mode enabled. RoadEye is now monitoring road risk.");
  } else {
    showToast("Driving mode OFF");
    resetRiskBox();
  }
}

function resetRiskBox() {
  const box = document.getElementById("riskBox");
  box.className = "risk-box waiting";
  box.querySelector(".risk-icon-wrap").innerHTML = '<i class="fa-solid fa-shield-halved risk-shield"></i>';
  setEl("riskText", "Waiting");
  setEl("riskSub",  "Toggle driving mode and click Check Risk");
}

// ── CLOCK ─────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const t = String(now.getHours()).padStart(2,'0') + ":" +
              String(now.getMinutes()).padStart(2,'0') + ":" +
              String(now.getSeconds()).padStart(2,'0');
    setEl("time", t);
  }
  tick(); setInterval(tick, 1000);
}

// ── THEME ─────────────────────────────────────────────────────
function initTheme() {
  if (localStorage.getItem("re_theme") === "dark") {
    document.body.classList.add("dark");
    setEl("themeLabel", "Light Mode");
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("re_theme", isDark ? "dark" : "light");
  setEl("themeLabel", isDark ? "Light Mode" : "Dark Mode");
}

// ── VOICE ─────────────────────────────────────────────────────
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  setEl("voiceLabel", voiceEnabled ? "Voice On" : "Voice Off");
  const icon = document.getElementById("voiceIcon");
  if (icon) icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
  showToast(voiceEnabled ? "Voice alerts ON" : "Voice alerts OFF");
}

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN"; u.rate = 0.9; u.pitch = 1;
  window.speechSynthesis.speak(u);
}

// ── GPS ───────────────────────────────────────────────────────
function initGPS() {
  setStatus("Requesting GPS permission...", "info");
  if (!navigator.geolocation) {
    setStatus("GPS not supported", "error");
    fetchWeatherFallback(); return;
  }
  navigator.geolocation.watchPosition(onGPSSuccess, onGPSError, {
    enableHighAccuracy: true, timeout: 15000, maximumAge: 30000
  });
}

function onGPSSuccess(pos) {
  currentLat = pos.coords.latitude;
  currentLon = pos.coords.longitude;
  const acc  = Math.round(pos.coords.accuracy);

  setEl("location", currentLat.toFixed(4) + ", " + currentLon.toFixed(4) + " (±" + acc + "m)");
  localStorage.setItem("re_lat", currentLat);
  localStorage.setItem("re_lon", currentLon);

  currentSegment = getNearestSegment(currentLat, currentLon);
  updateBlackspot();

  setStatus(acc > 1000 ? "Low GPS accuracy — works better on mobile" : "GPS acquired (±" + acc + "m)",
            acc > 1000 ? "info" : "success");
  fetchWeather(currentLat, currentLon);
  fetchCityName(currentLat, currentLon);
}

function onGPSError(err) {
  setEl("location", "GPS denied — using IP location");
  setStatus("Using IP location fallback", "info");
  fetchWeatherFallback();
}

function updateBlackspot() {
  if (!currentSegment) return;
  setEl("blackspot", currentSegment.blackspot
    ? currentSegment.name + " (Risk Zone)"
    : currentSegment.name + " (Safe)");
}

// ── CITY ──────────────────────────────────────────────────────
function fetchCityName(lat, lon) {
  fetch("https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=json")
    .then(r => r.json())
    .then(function(d) {
      const a = d.address;
      const city  = a.city || a.town || a.village || "Unknown";
      const state = a.state || "";
      const full  = city + (state ? ", " + state : "");
      setEl("city", full);
      localStorage.setItem("re_city", full);
    })
    .catch(function() { setEl("city", "Unavailable"); });
}

// ── WEATHER ───────────────────────────────────────────────────
function fetchWeather(lat, lon) {
  fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
    "&current=temperature_2m,relative_humidity_2m,windspeed_10m,weathercode&windspeed_unit=kmh&timezone=auto")
    .then(r => r.json())
    .then(function(data) {
      const c = data.current;
      currentWeatherCode = c.weathercode;
      currentWindspeed   = c.windspeed_10m;
      const desc = decodeWeather(c.weathercode);

      setEl("temperature", c.temperature_2m + " °C");
      setEl("weather",     desc);
      setEl("humidity",    c.relative_humidity_2m + "%");
      setEl("windspeed",   c.windspeed_10m + " km/h");

      localStorage.setItem("re_weather",     desc);
      localStorage.setItem("re_weatherCode", c.weathercode);
      localStorage.setItem("re_temp",        c.temperature_2m);
      localStorage.setItem("re_wind",        c.windspeed_10m);
      localStorage.setItem("re_humidity",    c.relative_humidity_2m);

      const score = quickScore(c.weathercode, c.windspeed_10m);
      updateIndicators(score);
      updateAdvisory(score, c.weathercode, c.windspeed_10m);
      setStatus("Live weather loaded", "success");
    })
    .catch(function() { setStatus("Weather fetch failed", "error"); });
}

function fetchWeatherFallback() {
  fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(function(d) {
      currentLat = d.latitude; currentLon = d.longitude;
      setEl("location", "IP: " + d.latitude.toFixed(4) + ", " + d.longitude.toFixed(4));
      setEl("city", (d.city||"") + (d.region ? ", "+d.region : ""));
      localStorage.setItem("re_lat", currentLat);
      localStorage.setItem("re_lon", currentLon);
      currentSegment = getNearestSegment(currentLat, currentLon);
      updateBlackspot();
      fetchWeather(d.latitude, d.longitude);
    })
    .catch(function() {
      currentLat = 26.9124; currentLon = 75.7873;
      setEl("location", "Default: Jaipur");
      setEl("city", "Jaipur, Rajasthan");
      currentSegment = getNearestSegment(currentLat, currentLon);
      updateBlackspot();
      fetchWeather(26.9124, 75.7873);
    });
}

function decodeWeather(code) {
  if (code === 0)        return "Clear Sky";
  if (code <= 2)         return "Partly Cloudy";
  if (code === 3)        return "Overcast";
  if (code <= 49)        return "Foggy";
  if (code <= 55)        return "Drizzle";
  if (code <= 65)        return "Rain";
  if (code <= 82)        return "Rain Showers";
  if (code >= 95)        return "Thunderstorm";
  return "Unknown";
}

// ── FEATURE HELPERS ───────────────────────────────────────────
function getWeatherType(code, wind) {
  if (code >= 45 && code <= 49)            return 3; // Fog
  if (code >= 95 || (code >= 61 && code <= 67)) return 2; // Heavy Rain
  if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) return 1; // Light Rain
  if (getSeason() === 0 && wind > 30)      return 4; // Dust Storm
  return 0;
}

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 6) return 0;
  if (m >= 7 && m <= 9) return 1;
  return 2;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 22 || h <= 5)                    return 0;
  if ((h >= 7 && h <= 9)||(h >= 17 && h <= 20)) return 1;
  return 2;
}

function getTrafficDensity() {
  const h = new Date().getHours();
  if ((h >= 8 && h <= 10)||(h >= 17 && h <= 20)) return 2;
  if (h >= 22 || h <= 5)                         return 0;
  return 1;
}

function quickScore(code, wind) {
  let s = 5;
  if (code >= 95)      s += 45;
  else if (code >= 61) s += 35;
  else if (code >= 51) s += 22;
  else if (code >= 45) s += 30;
  if (wind > 50) s += 20; else if (wind > 25) s += 10;
  const h = new Date().getHours();
  if (h >= 22 || h <= 5) s += 25; else if (h <= 8 || h >= 18) s += 10;
  return Math.min(100, s);
}

// ── PREDICT RISK ──────────────────────────────────────────────
function predictRisk() {
  if (!isDriving) { showToast("Enable driving mode first"); return; }

  const btn = document.getElementById("checkBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analysing...';

  const seg = currentSegment || {
    lat:26.9124, lon:75.7873, end_lat:26.915, end_lon:75.793,
    road_type:1, speed_limit:50, blackspot:0, road_surface:0
  };

  const payload = {
    start_latitude:  seg.lat,
    start_longitude: seg.lon,
    end_latitude:    seg.end_lat || seg.lat + 0.003,
    end_longitude:   seg.end_lon || seg.lon + 0.003,
    road_type:       seg.road_type,
    speed_limit:     seg.speed_limit || 60,
    blackspot_flag:  seg.blackspot,
    road_surface:    seg.road_surface || 0,
    season:          getSeason(),
    time_of_day:     getTimeOfDay(),
    weather_type:    getWeatherType(currentWeatherCode || 0, currentWindspeed || 0),
    traffic_density: getTrafficDensity()
  };

  fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(function(data) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Check Risk';
    if (data.error) { showToast("Error: " + data.error); return; }
    applyRisk(data.risk, data.alert, false);
  })
  .catch(function() {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Check Risk';
    showToast("Cannot reach server. Is Flask running?");
  });
}

// ── DEMO MODE ─────────────────────────────────────────────────
function simulateRisk(level) {
  const scenarios = {
    high:   { start_latitude:27.4548, start_longitude:76.0302, end_latitude:27.4562, end_longitude:76.0332, road_type:0, speed_limit:90, blackspot_flag:1, road_surface:2, season:2, time_of_day:0, weather_type:3, traffic_density:2 },
    medium: { start_latitude:26.9055, start_longitude:75.8455, end_latitude:26.9100, end_longitude:75.8600, road_type:1, speed_limit:60, blackspot_flag:0, road_surface:1, season:1, time_of_day:1, weather_type:1, traffic_density:2 },
    low:    { start_latitude:26.9215, start_longitude:75.8315, end_latitude:26.9120, end_longitude:75.8200, road_type:1, speed_limit:40, blackspot_flag:0, road_surface:0, season:0, time_of_day:2, weather_type:0, traffic_density:0 }
  };

  const btn = document.getElementById("checkBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating...';

  fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenarios[level])
  })
  .then(r => r.json())
  .then(function(data) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Check Risk';
    if (data.error) { showToast("Error: " + data.error); return; }
    applyRisk(data.risk, data.alert, true);
  })
  .catch(function() {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Check Risk';
    showToast("Cannot reach server.");
  });
}

// ── APPLY RISK ────────────────────────────────────────────────
function applyRisk(risk, alert, isDemo) {
  const box  = document.getElementById("riskBox");
  const cls  = ["low", "medium", "high"][risk];
  const icons= ["fa-shield-halved", "fa-triangle-exclamation", "fa-circle-exclamation"];
  const txt  = ["LOW RISK", "MEDIUM RISK", "HIGH RISK"];
  const clr  = ["#15803d", "#92400e", "#b91c1c"];

  box.className = "risk-box " + cls;
  box.querySelector(".risk-icon-wrap").innerHTML =
    '<i class="fa-solid ' + icons[risk] + ' risk-shield" style="color:' + clr[risk] + '"></i>';
  setEl("riskText", txt[risk] + (isDemo ? " (Demo)" : ""));
  setEl("riskSub",  alert);

  // Voice
  const voices = [
    "Low risk. Conditions are safe. Drive responsibly.",
    "Caution. Medium risk. Stay focused and maintain safe speed.",
    "Warning! High risk detected. Reduce speed immediately."
  ];
  speak(voices[risk]);

  // Firebase notification
  if (typeof sendFirebaseNotification === "function") {
    const types = ["low","medium","high"];
    const titles = ["RoadEye — Low Risk", "RoadEye — Medium Risk!", "RoadEye — HIGH RISK Alert!"];
    if (risk >= 1) sendFirebaseNotification(titles[risk], alert, types[risk]);
  }

  // Update indicators and advisory
  const score = risk * 33;
  updateIndicators(score);
  updateAdvisory(score, currentWeatherCode, currentWindspeed);
  saveHistory(txt[risk], score);
  showToast((isDemo ? "Demo: " : "") + txt[risk]);
}

// ── ADVISORY ─────────────────────────────────────────────────
function updateAdvisory(score, code, wind) {
  const list = document.getElementById("advisoryList");
  if (!list) return;
  const tips = [];

  if (score >= 66) {
    tips.push({ t:"Reduce speed immediately — dangerous conditions ahead", c:"adv-danger", i:"fa-circle-exclamation" });
    tips.push({ t:"Increase following distance significantly", c:"adv-danger", i:"fa-car" });
    tips.push({ t:"Avoid phone use completely", c:"adv-warn", i:"fa-mobile-screen-button" });
  } else if (score >= 33) {
    tips.push({ t:"Stay focused — conditions not ideal for driving", c:"adv-warn", i:"fa-eye" });
    tips.push({ t:"Maintain safe speed and distance", c:"adv-warn", i:"fa-gauge-simple" });
  } else {
    tips.push({ t:"Conditions are relatively safe — stay alert", c:"adv-ok", i:"fa-circle-check" });
    tips.push({ t:"Drive at normal speed and observe traffic", c:"adv-ok", i:"fa-road" });
  }

  if (code !== null) {
    if (code >= 45 && code <= 49) tips.push({ t:"Fog — use fog lights, reduce speed to 30 km/h", c:"adv-danger", i:"fa-smog" });
    if (code >= 95)               tips.push({ t:"Thunderstorm — avoid driving if possible", c:"adv-danger", i:"fa-bolt" });
    if (wind && wind > 40)        tips.push({ t:"Strong winds — keep firm grip on steering", c:"adv-warn", i:"fa-wind" });
  }

  list.innerHTML = tips.map(function(t) {
    return '<li class="adv-item ' + t.c + '"><i class="fa-solid ' + t.i + '"></i>' + t.t + '</li>';
  }).join("");
}

// ── INDICATORS ────────────────────────────────────────────────
function updateIndicators(score) {
  animBar("visBar",     "visPct",     Math.max(10,100-score));
  animBar("trafficBar", "trafficPct", Math.min(90,20+score*.6));
  animBar("roadBar",    "roadPct",    Math.max(10,100-score*.8));
  animBar("wxBar",      "wxPct",      Math.max(10,100-score*.9));
}

function animBar(barId, pctId, pct) {
  const bar = document.getElementById(barId);
  const lbl = document.getElementById(pctId);
  if (!bar) return;
  setTimeout(function() {
    bar.style.width = pct + "%";
    bar.style.background = pct > 60 ? "#16a34a" : pct > 35 ? "#ea580c" : "#dc2626";
  }, 80);
  if (lbl) lbl.textContent = Math.round(pct) + "%";
}

// ── ROUTE RISK ────────────────────────────────────────────────
function checkRouteRisk() {
  const fromId = document.getElementById("routeFrom").value;
  const toId   = document.getElementById("routeTo").value;
  const result = document.getElementById("routeResult");

  if (!fromId || !toId) { showToast("Select both start and end points"); return; }
  if (fromId === toId)  { showToast("Start and end cannot be same"); return; }

  const from = roadSegments.find(s => s.id === fromId);
  const to   = roadSegments.find(s => s.id === toId);
  if (!from || !to) { showToast("Segment not found"); return; }

  result.style.display = "block";
  result.style.cssText = "display:block;padding:10px;color:var(--muted);font-size:12px;";
  result.textContent = "Checking route risk...";

  const basePayload = {
    season: getSeason(), time_of_day: getTimeOfDay(),
    weather_type: getWeatherType(currentWeatherCode||0, currentWindspeed||0),
    traffic_density: getTrafficDensity()
  };

  Promise.all([
    fetch("/predict", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...basePayload, start_latitude:from.lat, start_longitude:from.lon,
        end_latitude:from.end_lat||from.lat+.003, end_longitude:from.end_lon||from.lon+.003,
        road_type:from.road_type, speed_limit:from.speed_limit,
        blackspot_flag:from.blackspot, road_surface:from.road_surface })
    }).then(r=>r.json()),
    fetch("/predict", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...basePayload, start_latitude:to.lat, start_longitude:to.lon,
        end_latitude:to.end_lat||to.lat+.003, end_longitude:to.end_lon||to.lon+.003,
        road_type:to.road_type, speed_limit:to.speed_limit,
        blackspot_flag:to.blackspot, road_surface:to.road_surface })
    }).then(r=>r.json())
  ])
  .then(function(res) {
    const r1 = res[0].risk, r2 = res[1].risk;
    const max = Math.max(r1, r2);
    const labels = ["Low Risk","Medium Risk","High Risk"];
    const bgs    = ["#dcfce7","#fef9c3","#fee2e2"];
    const bords  = ["#86efac","#fcd34d","#fca5a5"];
    const tcs    = ["#15803d","#92400e","#b91c1c"];

    result.style.cssText = "display:block;padding:12px;border-radius:10px;border:2px solid "+bords[max]+";background:"+bgs[max]+";";
    result.innerHTML =
      '<div style="font-size:15px;font-weight:900;color:'+tcs[max]+';margin-bottom:6px;">'+labels[max]+' on Route</div>' +
      '<div style="font-size:12px;color:#374151;line-height:1.8;">' +
        '<b>From:</b> '+from.name+' — '+labels[r1]+'<br>' +
        '<b>To:</b> '+to.name+' — '+labels[r2] +
      '</div>';

    speak("Route risk is " + labels[max] + ". Plan accordingly.");
  })
  .catch(function() { result.textContent = "Could not check route."; });
}

// ── TIPS ──────────────────────────────────────────────────────
const TIPS_POOL = [
  { i:"fa-seatbelt",     t:"Always wear seatbelt before starting" },
  { i:"fa-mobile",       t:"Never use phone while driving" },
  { i:"fa-car",          t:"Maintain 3-second following distance" },
  { i:"fa-cloud-rain",   t:"Reduce speed by 30% in rain or fog" },
  { i:"fa-lightbulb",    t:"Use headlights in low visibility" },
  { i:"fa-bed",          t:"Take breaks every 2 hours on long drives" },
];

function loadTips() {
  const row = document.getElementById("tipsRow");
  if (!row) return;
  const shuffled = TIPS_POOL.slice().sort(() => Math.random()-.5).slice(0,3);
  row.innerHTML = shuffled.map(function(tip) {
    return '<div class="tip-chip"><i class="fa-solid '+tip.i+'"></i>'+tip.t+'</div>';
  }).join("");
}

// ── HISTORY ───────────────────────────────────────────────────
function saveHistory(risk, score) {
  const entry = {
    time:    new Date().toLocaleTimeString(),
    weather: currentWeatherCode !== null ? decodeWeather(currentWeatherCode) : "--",
    risk:    risk, score: score
  };
  let h = JSON.parse(localStorage.getItem("re_history")||"[]");
  h.unshift(entry);
  if (h.length > 10) h = h.slice(0,10);
  localStorage.setItem("re_history", JSON.stringify(h));
}

// ── HELPERS ───────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStatus(msg, type) {
  const el = document.getElementById("gps-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "gps-status " + type;
}

let _toastT;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.add("hidden"), 3500);
}
