document.getElementById("signupForm").addEventListener("submit", function(e) {
    e.preventDefault();

    let name     = document.getElementById("name").value.trim();
    let email    = document.getElementById("email").value.trim();
    let phone    = document.getElementById("phone").value.trim();
    let password = document.getElementById("password").value.trim();

    ["nameErr","emailErr","phoneErr","passErr"].forEach(clearError);

    let valid = true;
    if (name.length < 3)                              { showError("nameErr",  "Name must be at least 3 characters"); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   { showError("emailErr", "Enter a valid email address");        valid = false; }
    if (!/^[0-9]{10}$/.test(phone))                   { showError("phoneErr", "Phone must be 10 digits");            valid = false; }
    if (password.length < 6)                          { showError("passErr",  "Password must be at least 6 chars");  valid = false; }
    if (!valid) return;

    // ── CALL BACKEND API ──
    fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast("Account Created! Welcome " + data.name + " 🚗", "success");
            setTimeout(() => window.location.href = "/dashboard", 1500);
        } else {
            showToast(data.message, "error");
        }
    })
    .catch(() => showToast("Server error. Please try again.", "error"));
});

function handleGoogleLogin(response) {
    try {
        const data = parseJwt(response.credential);
        fetch("/api/google-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.name, email: data.email, googleId: data.sub })
        })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showToast("Welcome " + res.name + "! 🚗", "success");
                setTimeout(() => window.location.href = "/dashboard", 1500);
            } else {
                showToast(res.message, "error");
            }
        });
    } catch(e) { showToast("Google login failed.", "error"); }
}

function googleLoginFallback() {
    const realBtn = document.querySelector(".g_id_signin iframe");
    if (realBtn) return;
    showToast("Add your Google Client ID in /signup to enable this!", "error");
}

window.addEventListener("load", function() {
    setTimeout(function() {
        const iframe = document.querySelector(".g_id_signin iframe");
        const fb     = document.querySelector(".google-fallback-btn");
        if (iframe && fb) fb.style.display = "none";
    }, 2000);
});

function parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(base64));
}
function showError(id, msg) { let el=document.getElementById(id); if(el){el.innerText=msg;el.style.display="block";} }
function clearError(id)     { let el=document.getElementById(id); if(el){el.innerText="";el.style.display="none";} }
function showToast(msg, type) {
    let t = document.getElementById("toast"); if(t) t.remove();
    t = document.createElement("div"); t.id="toast"; t.innerText=msg;
    t.style.cssText=`position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:${type==="success"?"#4CAF50":"#e74c3c"};color:white;padding:14px 28px;
        border-radius:10px;font-weight:bold;z-index:9999;font-size:14px;
        box-shadow:0 4px 20px rgba(0,0,0,0.25);font-family:'Segoe UI',sans-serif;`;
    document.body.appendChild(t);
    setTimeout(()=>{if(t)t.remove();},3000);
}
