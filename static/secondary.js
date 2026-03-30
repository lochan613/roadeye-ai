
/* RoadEye — secondary.js */

// ── RISK HISTORY ──────────────────────────────────────────────
const historyBody = document.getElementById("historyBody");
const history     = JSON.parse(localStorage.getItem("re_history") || "[]");

if (history.length === 0) {
  historyBody.innerHTML =
    "<tr><td colspan='3' class='no-data'>No predictions yet — go to Dashboard and click Check Risk</td></tr>";
} else {
  history.forEach(function(entry) {
    const riskStr = (entry.risk || "").toString().toUpperCase();
    const cls   = riskStr.includes("HIGH") ? "high" : riskStr.includes("MEDIUM") ? "medium" : "low";
    const label = riskStr.includes("HIGH") ? "HIGH" : riskStr.includes("MEDIUM") ? "MEDIUM" : "LOW";
    const row   = document.createElement("tr");
    row.innerHTML =
      "<td>" + (entry.time || "--") + "</td>" +
      "<td>" + (entry.weather || "--") + "</td>" +
      "<td><span class='rbadge " + cls + "'>" + label + "</span></td>";
    historyBody.appendChild(row);
  });
}

// ── KNOWN RISK ZONES ──────────────────────────────────────────
const zones = [
  { name:"NH-48 Aspura Stretch",        road:"NH-48" },
  { name:"NH-48 Sodala Stretch",         road:"NH-48" },
  { name:"NH-48 DCM-200 Ft Bypass",      road:"NH-48" },
  { name:"NH-48 Bhankrotan Stretch",     road:"NH-48" },
  { name:"NH-48 Mahapura Stretch",       road:"NH-48" },
  { name:"Gujar ki Thadi — Riddhima",   road:"Gopalpura Bypass" },
  { name:"DCM to Ajmer Road Heerapura", road:"Gopalpura Bypass" },
  { name:"Transport Nagar — Sisodia",   road:"Agra Road" },
  { name:"Ring Road to Kanota",         road:"Agra Road" },
  { name:"Jal Mahal to Amer Fort",      road:"Delhi Road" },
  { name:"Amer Fort to Kunda",          road:"Delhi Road" },
  { name:"Kunda to Kukas Junction",     road:"Delhi Road" },
  { name:"Sodala to Purani Chungi",     road:"Ajmer Road" },
  { name:"Purani Chungi to Heerapura",  road:"Ajmer Road" },
  { name:"Heerapura to 200 Ft Bypass",  road:"Ajmer Road" },
  { name:"Rambagh to Gandhi Nagar",     road:"Tonk Road" },
  { name:"Gandhi Nagar to Sanganeer",   road:"Tonk Road" },
];

const grid = document.getElementById("zonesGrid");
if (grid) {
  zones.forEach(function(z) {
    const div = document.createElement("div");
    div.className = "zone-item";
    div.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation zone-icon"></i>' +
      '<div class="zone-text">' +
        z.name +
        '<div class="zone-road">' + z.road + '</div>' +
      '</div>';
    grid.appendChild(div);
  });
}