// ── RoadEye Service Worker ─────────────────────────────────────
// Handles background push notifications + PWA caching

const CACHE_NAME = "roadeye-v1";
const ASSETS = [
    "/",
    "/dashboard",
    "/static/dashboard.css",
    "/static/dashboard.js",
    "/static/landing.css",
    "/static/login.css",
    "/static/signup.css",
    "/static/secondary.css"
];

// ── INSTALL: Cache core assets ────────────────────────────────
self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS).catch(function() {
                // Silently fail — some assets may not exist yet
            });
        })
    );
    self.skipWaiting();
});

// ── ACTIVATE: Clean old caches ────────────────────────────────
self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// ── FETCH: Network-first strategy ────────────────────────────
self.addEventListener("fetch", function(event) {
    // Only cache GET requests
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Cache successful responses
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(function() {
                // Fallback to cache when offline
                return caches.match(event.request);
            })
    );
});

// ── PUSH: Receive background push notifications ───────────────
self.addEventListener("push", function(event) {
    let data = { title: "RoadEye Alert", body: "Check your road safety status.", icon: "/static/icon-192.png" };

    if (event.data) {
        try { data = event.data.json(); } catch(e) { data.body = event.data.text(); }
    }

    const options = {
        body:    data.body,
        icon:    data.icon    || "/static/icon-192.png",
        badge:   data.badge   || "/static/icon-192.png",
        tag:     data.tag     || "roadeye-alert",
        renotify: true,
        vibrate: data.vibrate || [300, 150, 300, 150, 300],
        data:    { url: data.url || "/dashboard" },
        actions: [
            { action: "view",    title: "View Dashboard" },
            { action: "dismiss", title: "Dismiss" }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── NOTIFICATION CLICK: Open dashboard ───────────────────────
self.addEventListener("notificationclick", function(event) {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : "/dashboard";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url.includes("/dashboard") && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
