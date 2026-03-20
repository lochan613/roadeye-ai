
// ── SIGNUP FORM ───────────────────────────────────────────────
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", function(e) {
    let name     = document.getElementById("name").value.trim();
    let email    = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value;

    ["nameErr", "emailErr", "passErr"].forEach(clearError);

    let valid = true;

    if (name.length < 3) {
      showError("nameErr", "Name must be at least 3 characters");
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("emailErr", "Please enter a valid email address");
      valid = false;
    }

    if (password.length < 6) {
      showError("passErr", "Password must be at least 6 characters");
      valid = false;
    }

    if (!valid) { e.preventDefault(); return; }

    // Let form submit normally to Flask
  });
}

// ── LOGIN FORM ────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", function(e) {
    let email    = document.getElementById("loginEmail").value.trim();
    let password = document.getElementById("loginPassword").value;

    ["loginEmailErr", "loginPassErr"].forEach(clearError);

    let valid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("loginEmailErr", "Please enter a valid email address");
      valid = false;
    }

    if (password.length < 1) {
      showError("loginPassErr", "Please enter your password");
      valid = false;
    }

    if (!valid) { e.preventDefault(); return; }

    // Let form submit normally to Flask
  });
}



// ── GOOGLE LOGIN CALLBACK ─────────────────────────────────────
function handleGoogleLogin(response) {
  try {
    const data = parseJwt(response.credential);
    showToast("Welcome, " + data.name + "! Redirecting...", "success");
    setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
  } catch(e) {
    showToast("Google login failed. Please try again.", "error");
  }
}

// ── JWT DECODER ───────────────────────────────────────────────
function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

// ── HELPERS ──────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.innerText = msg; el.style.display = "block"; }
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) { el.innerText = ""; el.style.display = "none"; }
}

function showToast(msg, type) {
  let existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.innerText = msg;
  toast.style.background = type === "success" ? "#16a34a" : "#dc2626";
  document.body.appendChild(toast);
  setTimeout(() => { if (toast) toast.remove(); }, 3200);
}
