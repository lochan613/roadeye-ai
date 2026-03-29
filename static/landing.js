// BUG FIX #5: Was blocking ALL anchor clicks — completely broken navigation
// Now only smooth-scrolls internal hash links, leaves normal links alone

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) target.scrollIntoView({ behavior: "smooth" });
    });
});

// Button actions
document.querySelectorAll(".btn-primary").forEach(btn => {
    btn.addEventListener("click", function() {
        window.location.href = "/signup";
    });
});

document.querySelectorAll(".btn-secondary").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelector(".features")?.scrollIntoView({ behavior: "smooth" });
    });
});

// Navbar Sign In
const signInLink = document.querySelector("nav a");
if (signInLink) {
    signInLink.addEventListener("click", function(e) {
        e.preventDefault();
        window.location.href = "/login";
    });
}
