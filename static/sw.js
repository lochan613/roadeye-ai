// ── sw.js — RoadEye Service Worker (Firebase FCM + Cache) ─────

importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAUTZjcZxtSSS_Tdx0UOVKOkO-csclVroM",
  authDomain: "roadeye-e9100.firebaseapp.com",
  projectId: "roadeye-e9100",
  storageBucket: "roadeye-e9100.firebasestorage.app",
  messagingSenderId: "75325604847",
  appId: "1:75325604847:web:468cc8ffe46a82a7812c1a"
});

const messaging = firebase.messaging();

const CACHE = "roadeye-v2";
const ASSETS = [
  "/",
  "/dashboard",
  "/static/dashboard.css",
  "/static/dashboard.js",
  "/static/secondary.css"
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener("fetch", function(e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(function() { return caches.match(e.request); })
  );
});

// ── Background FCM notifications ──────────────────────────────
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "RoadEye Alert", {
    body:    body || "Check your road safety status.",
    icon:    "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
    badge:   "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
    tag:     "roadeye-bg",
    renotify: true,
    vibrate: [300, 150, 300],
    data:    { url: "/dashboard" }
  });
});

// ── Notification click ────────────────────────────────────────
self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(function(list) {
      for (const c of list) {
        if (c.url.includes("/dashboard") && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow("/dashboard");
    })
  );
});
