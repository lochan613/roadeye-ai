========================================
  RoadEye — Flask Backend Setup Guide
  Voice + Push Notification Edition
========================================

STEP 1 — Install Python packages:
    pip install flask flask-sqlalchemy werkzeug

STEP 2 — Run the app:
    python app.py

STEP 3 — Open in browser:
    http://127.0.0.1:5000

========================================
NEW FEATURES ADDED:
========================================

✅ VOICE ALERTS (Web Speech API)
   - When Check Risk is clicked, a voice reads the risk level aloud
   - Works on Chrome, Edge, Safari, Firefox
   - Works on Android & iOS browsers
   - Toggle ON/OFF with the 🔊 button in the header
   - Says: "Warning! High risk detected on Highway road.
            Risk score is 78 out of 100. Near Jaipur.
            Please reduce your speed immediately."

✅ PUSH NOTIFICATIONS (Browser + PWA Service Worker)
   - Click 🔔 in the header to enable (or accept the banner)
   - Works on:
       ✓ Chrome (Desktop + Android) — full background support
       ✓ Edge (Desktop + Android)
       ✓ Firefox (Desktop + Android)
       ✓ Safari 16.4+ on iOS (PWA mode)
   - HIGH RISK: persistent notification that vibrates 3x
   - MEDIUM RISK: standard notification with 1 vibration
   - Notification stays until dismissed for HIGH RISK

✅ INSTALLABLE AS MOBILE APP (PWA)
   - On Android Chrome: tap ⋮ → "Add to Home Screen" → "Install"
   - On iPhone Safari:  tap Share → "Add to Home Screen"
   - Opens like a native app (no browser bar)
   - Icon on home screen
   - Works offline (cached pages)

✅ SERVICE WORKER (sw.js)
   - Runs in background — enables push notifications even
     when app is minimized
   - Caches assets for faster loading

✅ SOUND ALERTS (AudioContext beeps)
   - HIGH: 3 urgent beeps (880Hz)
   - MEDIUM: 1 medium beep (520Hz)
   - LOW: 1 soft tone (320Hz)
   - Plays before voice so voice is clearly heard

✅ BUG FIXES
   - secondary.js: Fixed duplicate "const set" crash
   - dashboard.js: Route bonus now correctly adds to score
   - All alert types (sound + voice + notification) fire together

========================================
HOW NOTIFICATIONS WORK ON MOBILE:
========================================

ANDROID (Chrome/Edge/Firefox):
  1. Open http://your-ip:5000 in Chrome on Android
  2. Tap "Add to Home Screen" to install
  3. Open from home screen icon
  4. Accept notification permission when asked
  5. Click "Check Risk" — you'll get:
     • Voice alert spoken through speaker
     • Notification popup (even if screen dims)
     • Vibration pattern (HIGH = 3 vibrations)

iPHONE / iPAD (Safari 16.4+):
  1. Open in Safari
  2. Share → Add to Home Screen
  3. IMPORTANT: Open from the HOME SCREEN icon
     (notifications only work in PWA mode on iOS)
  4. Accept notification permission
  5. Click "Check Risk"

DESKTOP (Chrome/Edge/Firefox):
  - Notifications appear as system popup in corner
  - Voice plays through speakers/headphones

========================================
PROJECT STRUCTURE:
========================================
roadeye/
├── app.py                     ← Main Flask app (backend)
├── requirements.txt           ← Python packages
├── README.txt                 ← This file
├── instance/
│   └── roadeye.db             ← SQLite database
├── templates/
│   ├── landing.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html         ← UPDATED: PWA meta tags, voice/notif buttons
│   └── secondary.html
└── static/
    ├── sw.js                  ← NEW: Service Worker (background push)
    ├── manifest.json          ← NEW: PWA App Manifest (installable)
    ├── dashboard.js           ← UPDATED: Voice + push notification system
    ├── dashboard.css          ← UPDATED: Voice btn + permission banner styles
    ├── secondary.js           ← FIXED: duplicate const bug removed
    ├── landing.css / .js
    ├── login.css / .js
    ├── signup.css / .js
    └── secondary.css

========================================
TROUBLESHOOTING:
========================================

Q: Voice doesn't speak on mobile?
A: Voice requires a user gesture first (button click). 
   Always triggered by "Check Risk" button — this satisfies
   browser autoplay policies.

Q: Notifications not working on iPhone?
A: Must be opened from the HOME SCREEN icon (PWA mode).
   Safari only supports notifications in standalone PWA mode.

Q: Notification permission banner not showing?
A: Some browsers auto-block if permission was previously denied.
   Go to: Chrome Settings → Site Settings → Notifications → 
   Find your site → Allow

Q: Voice speaks in wrong language/accent?
A: Dashboard.js sets lang="en-IN" (Indian English).
   Change utterance.lang in dashboard.js to your preference:
     en-US = American English
     en-GB = British English
     en-IN = Indian English

========================================
BACKEND APIs (unchanged):
========================================
✅ /api/signup       → User registration
✅ /api/login        → User login
✅ /api/google-login → Google OAuth login
✅ /api/predict      → Save risk prediction to DB
✅ /api/history      → Load last 10 predictions
✅ /api/stats        → Risk count statistics
✅ /logout           → Clear session
