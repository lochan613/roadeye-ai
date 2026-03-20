
// ── LOAD FROM LOCALSTORAGE ────────────────────────────────────
const storedWeather  = localStorage.getItem("re_weather")     || null;
const storedTemp     = localStorage.getItem("re_temp")        || null;
const storedWind     = localStorage.getItem("re_wind")        || null;
const storedHumidity = localStorage.getItem("re_humidity")    || null;
const storedLat      = localStorage.getItem("re_lat")         || null;
const storedLon      = localStorage.getItem("re_lon")         || null;
const storedCity     = localStorage.getItem("re_city")        || null;

// ── METRIC STRIP ──────────────────────────────────────────────
const metrics = [
    { icon:"🌡️", val: storedTemp     ? storedTemp + "°C"   : "--°C",    label:"Temperature" },
    { icon:"💧", val: storedHumidity ? storedHumidity + "%" : "--%",     label:"Humidity"    },
    { icon:"💨", val: storedWind     ? storedWind + " km/h" : "-- km/h", label:"Wind Speed"  },
    { icon:"🌤️", val: storedWeather  || "--",                             label:"Condition"   },
    { icon:"📍", val: storedLat ? parseFloat(storedLat).toFixed(3) + "°" : "--°", label:"Latitude"  },
    { icon:"📍", val: storedLon ? parseFloat(storedLon).toFixed(3) + "°" : "--°", label:"Longitude" },
];
const strip = document.getElementById("metricStrip");
metrics.forEach(function(m) {
    const chip = document.createElement("div");
    chip.className = "mchip";
    chip.innerHTML =
        "<div class='mchip-icon'>" + m.icon + "</div>" +
        "<div><div class='mchip-val'>" + m.val + "</div>" +
        "<div class='mchip-label'>" + m.label + "</div></div>";
    strip.appendChild(chip);
});

// ── GPS ───────────────────────────────────────────────────────
document.getElementById("dispLat").innerText  = storedLat ? parseFloat(storedLat).toFixed(5)  : "Unavailable";
document.getElementById("dispLon").innerText  = storedLon ? parseFloat(storedLon).toFixed(5)  : "Unavailable";

if (storedCity) {
    document.getElementById("dispCity").innerText = storedCity;
} else if (storedLat && storedLon) {
    fetch("https://nominatim.openstreetmap.org/reverse?lat=" + storedLat + "&lon=" + storedLon + "&format=json")
        .then(r => r.json())
        .then(d => {
            const c = d.address.city || d.address.town || d.address.village || "Unknown";
            const s = d.address.state || "";
            document.getElementById("dispCity").innerText = c + (s ? ", " + s : "");
        })
        .catch(() => { document.getElementById("dispCity").innerText = "City unavailable"; });
} else {
    document.getElementById("dispCity").innerText = "Go to Dashboard first to detect GPS";
}

// ── WEATHER ───────────────────────────────────────────────────
document.getElementById("dispTemp").innerText     = storedTemp     ? storedTemp + "°C"    : "--";
document.getElementById("dispHumidity").innerText = storedHumidity ? storedHumidity + "%"  : "--";
document.getElementById("dispWind").innerText     = storedWind     ? storedWind + " km/h"  : "--";
document.getElementById("dispWeather").innerText  = storedWeather  || "--";

// ── ROAD RISK SUMMARY ─────────────────────────────────────────
document.getElementById("accidents").innerText = Math.floor(Math.random() * 50 + 10);
const trafficLevels = ["Low", "Medium", "High"];
document.getElementById("traffic").innerText   = trafficLevels[Math.floor(Math.random() * 3)];
const roadConds = ["Good", "Moderate", "Poor"];
document.getElementById("road").innerText      = roadConds[Math.floor(Math.random() * 3)];

// ── BLACKSPOTS ────────────────────────────────────────────────
const spotsList = document.getElementById("blackspots");
const spots = [
    "Sharp curve ahead (1.2 km)",
    "Pothole-prone road section",
    "Frequent accident intersection",
    "Low visibility zone — bridge area",
    "School zone — slow during peak hours"
];
spots.forEach(function(s) {
    const li = document.createElement("li");
    li.innerText = s;
    spotsList.appendChild(li);
});

// ── RISK HISTORY ──────────────────────────────────────────────
const historyBody = document.getElementById("historyTable");
const history     = JSON.parse(localStorage.getItem("re_history") || "[]");

if (history.length === 0) {
    historyBody.innerHTML =
        "<tr><td colspan='3' style='text-align:center;color:#2d3f5a;padding:20px;'>" +
        "No predictions yet — go to Dashboard and click Check Risk" +
        "</td></tr>";
} else {
    history.forEach(function(entry) {
        const cls   = entry.risk.includes("HIGH") ? "high" : entry.risk.includes("MEDIUM") ? "medium" : "low";
        const label = entry.risk.includes("HIGH") ? "HIGH" : entry.risk.includes("MEDIUM") ? "MEDIUM" : "LOW";
        const row   = document.createElement("tr");
        row.innerHTML =
            "<td>" + entry.time + "</td>" +
            "<td>" + entry.weather + "</td>" +
            "<td><span class='rbadge " + cls + "'>" + label + "</span></td>";
        historyBody.appendChild(row);
    });
}
