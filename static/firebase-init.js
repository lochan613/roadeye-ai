// ── firebase-init.js ─────────────────────────────────────────
// Import via CDN in HTML — no npm needed for Flask projects

const firebaseConfig = {
  apiKey: "AIzaSyAUTZjcZxtSSS_Tdx0UOVKOkO-csclVroM",
  authDomain: "roadeye-e9100.firebaseapp.com",
  projectId: "roadeye-e9100",
  storageBucket: "roadeye-e9100.firebasestorage.app",
  messagingSenderId: "75325604847",
  appId: "1:75325604847:web:468cc8ffe46a82a7812c1a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ── Request notification permission ──────────────────────────
function initFirebaseNotifications() {
  if (!("Notification" in window)) return;

  Notification.requestPermission().then(function(permission) {
    if (permission === "granted") {
      messaging.getToken({ vapidKey: "YOUR_VAPID_KEY_HERE" })
        .then(function(token) {
          if (token) {
            console.log("FCM Token:", token);
            localStorage.setItem("re_fcm_token", token);
          }
        })
        .catch(function(err) {
          console.log("FCM token error:", err);
        });
    }
  });
}

// ── Send local notification (works without FCM server) ───────
function sendFirebaseNotification(title, body, type) {
  // type: "high" | "medium" | "low"
  const icons = {
    high:   "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
    medium: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png",
    low:    "https://cdn-icons-png.flaticon.com/512/1828/1828640.png"
  };

  if (Notification.permission === "granted") {
    new Notification(title, {
      body:  body,
      icon:  icons[type] || icons.medium,
      badge: icons.medium,
      tag:   "roadeye-risk",
      renotify: true
    });
  }
}

// ── Handle foreground messages ────────────────────────────────
messaging.onMessage(function(payload) {
  console.log("FCM message received:", payload);
  const { title, body } = payload.notification;
  sendFirebaseNotification(title, body, "medium");
});

// ── Init on load ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initFirebaseNotifications);
