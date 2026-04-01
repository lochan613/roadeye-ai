from flask import Flask, render_template, redirect, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import joblib
import pandas as pd
import os
import re
import secrets

app = Flask(__name__)

# DATABASE URL and settings
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///RoadEye.db')
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Secret key/config from environment (do not hardcode in production)
app.secret_key = os.environ.get('SECRET_KEY', 'roadeye_secret_2026_xk9')
app.config['SESSION_COOKIE_HTTPONLY'] = True
if os.environ.get("ENV") == "production":
    app.config['SESSION_COOKIE_SECURE'] = True
else:
    app.config['SESSION_COOKIE_SECURE'] = False  # Set True for production (HTTPS)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Optional: configure permanent session lifetime and secure defaults.

db = SQLAlchemy(app)

# ← USER MODEL CHANGE (phone field ADD KARO)
class User(db.Model):
    __tablename__ = "users"
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    phone      = db.Column(db.String(15), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def is_valid_email(email: str) -> bool:
    return bool(re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email))


def is_valid_phone(phone: str) -> bool:
    return phone.isdigit() and len(phone) == 10


def generate_csrf_token():
    session['csrf_token'] = secrets.token_hex(32)
    return session['csrf_token']

def validate_csrf_token(token):
    return token and token == session.get('csrf_token')


# Simple rate limiting for login attempts
def check_rate_limit():
    attempts = session.get('login_attempts', 0)
    last_attempt = session.get('last_attempt', 0)
    now = datetime.now().timestamp()
    if now - last_attempt > 300:  # Reset after 5 minutes
        session['login_attempts'] = 0
    if attempts >= 5:
        return False
    return True


def increment_attempts():
    session['login_attempts'] = session.get('login_attempts', 0) + 1
    session['last_attempt'] = datetime.now().timestamp()


model = None
try:
    model = joblib.load("Model/model.pkl")
    print("Model loaded:", model.n_features_in_, "features")
except Exception as e:
    print("Model not loaded:", e)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect("/login")
    user = User.query.get(session["user_id"])
    if not user:
        session.clear()
        return redirect("/login")
    return render_template("dashboard.html", user_name=user.name, user_email=user.email)

@app.route("/secondary")
def secondary():
    if "user_id" not in session:
        return redirect("/login")
    user = User.query.get(session["user_id"])
    if not user:
        session.clear()
        return redirect("/login")
    return render_template("secondary.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if "user_id" in session:
        return redirect("/dashboard")
    if request.method == "POST":
        csrf_token = request.form.get('csrf_token')
        if not validate_csrf_token(csrf_token):
            return render_template(
    "signup.html",
    error="Invalid request.",
    csrf_token=generate_csrf_token()
)

        name     = request.form.get("name", "").strip()
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        phone    = request.form.get("phone", "").strip()

        if not name or not email or not password:
            return render_template("signup.html", error="Name, email, and password are required.")
        if not is_valid_email(email):
            return render_template("signup.html", error="Invalid email format.")
        if len(password) < 8:
            return render_template("signup.html", error="Password must be at least 8 characters.")
        if phone and not is_valid_phone(phone):
            return render_template("signup.html", error="Phone must be 10 digits only.")

        existing = User.query.filter_by(email=email).first()
        if existing:
            return render_template("signup.html", error="Email already registered. Please login.")

        password_hash = generate_password_hash(password)
        new_user = User(name=name, email=email, password=password_hash, phone=phone)
        db.session.add(new_user)
        db.session.commit()

        session["user_id"]    = new_user.id
        session["user_name"]  = new_user.name
        session["user_email"] = new_user.email
        session.permanent      = False
        return redirect("/dashboard")

    return render_template("signup.html", csrf_token=generate_csrf_token())

@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect("/dashboard")
    if request.method == "POST":
        if not check_rate_limit():
            return render_template("login.html", error="Too many failed attempts. Try again later.", csrf_token=generate_csrf_token())

        csrf_token = request.form.get('csrf_token')
        if not validate_csrf_token(csrf_token):
            increment_attempts()
            return render_template("login.html", error="Invalid request.", csrf_token=generate_csrf_token())

        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        if not email or not password:
            increment_attempts()
            return render_template("login.html", error="Please enter both email and password.", csrf_token=generate_csrf_token())
        if not is_valid_email(email):
            increment_attempts()
            return render_template("login.html", error="Invalid email format.", csrf_token=generate_csrf_token())

        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            session.pop('login_attempts', None)
            session.pop('last_attempt', None)
            session["user_id"]    = user.id
            session["user_name"]  = user.name
            session["user_email"] = user.email
            session.permanent      = False
            return redirect("/dashboard")

        increment_attempts()
        return render_template("login.html", error="Invalid email or password.", csrf_token=generate_csrf_token())

    return render_template("login.html", csrf_token=generate_csrf_token())

@app.route("/predict", methods=["POST"])
def predict():
    if "user_id" not in session:
        return jsonify({"error": "Authentication required"}), 401

    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON body"}), 400

        def get_int(name, default, minimum=None, maximum=None):
            value = data.get(name, default)
            try:
                num = int(value)
            except (TypeError, ValueError):
                raise ValueError(f"{name} must be an integer")
            if minimum is not None and num < minimum:
                raise ValueError(f"{name} must be >= {minimum}")
            if maximum is not None and num > maximum:
                raise ValueError(f"{name} must be <= {maximum}")
            return num

        def get_float(name, default, minimum=None, maximum=None):
            value = data.get(name, default)
            try:
                num = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"{name} must be a number")
            if minimum is not None and num < minimum:
                raise ValueError(f"{name} must be >= {minimum}")
            if maximum is not None and num > maximum:
                raise ValueError(f"{name} must be <= {maximum}")
            return num

        features = {
            "start_latitude":  get_float("start_latitude",  26.9124, -90, 90),
            "start_longitude": get_float("start_longitude", 75.7873, -180, 180),
            "end_latitude":    get_float("end_latitude",    26.9150, -90, 90),
            "end_longitude":   get_float("end_longitude",   75.7930, -180, 180),
            "road_type":       get_int("road_type",         1, 0, 10),
            "speed_limit_est(inKm/h)": get_int("speed_limit", 60, 0, 260),
            "blackspot_flag":  get_int("blackspot_flag",     0, 0, 1),
            "road_surface":    get_int("road_surface",       0, 0, 10),
            "season":          get_int("season",             1, 0, 3),
            "time_of_day":     get_int("time_of_day",        2, 0, 23),
            "weather_type":    get_int("weather_type",       0, 0, 20),
            "traffic_density": get_int("traffic_density",    1, 0, 100),
        }

        if model is not None:
            features_df = pd.DataFrame([features])
            risk = int(model.predict(features_df)[0])
            ml_used = True
        else:
            wt = features["weather_type"]
            bs = features["blackspot_flag"]
            tod = features["time_of_day"]
            rs = features["road_surface"]
            score = wt*15 + bs*25 + (15 if tod <= 6 else 5 if tod <= 18 else 0) + rs*8
            risk = 2 if score >= 50 else (1 if score >= 20 else 0)
            ml_used = False

        alerts = [
            "Low Risk — Conditions are safe. Stay alert.",
            "Medium Risk — Conditions not ideal. Drive carefully.",
            "High Risk — Dangerous conditions. Reduce speed immediately."
        ]

        return jsonify({"risk": risk, "alert": alerts[risk], "ml_used": ml_used})

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception:
        # avoid exposing internal details in production
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("Database ready")
    app.run(debug=True)