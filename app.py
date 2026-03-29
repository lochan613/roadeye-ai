from flask import Flask, render_template, redirect, request, url_for, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import joblib
import pandas as pd
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///RoadEye.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "roadeye_secret_key_2026"

db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = "users"
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.id} - {self.email}>"


# ── Load ML model ─────────────────────────────────────────────
model = None
try:
    model = joblib.load("Model/model.pkl")
    print("✅ ML model loaded —", model.n_features_in_, "features")
except Exception as e:
    print(f"⚠️  Model not loaded: {e}")


# ── ROUTES ────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect("/login")
    user = User.query.get(session["user_id"])
    user_name  = user.name  if user else "Driver"
    user_email = user.email if user else ""
    return render_template("dashboard.html", user_name=user_name, user_email=user_email)


@app.route("/secondary")
def secondary():
    if "user_id" not in session:
        return redirect("/login")
    return render_template("secondary.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


# ── SIGNUP ────────────────────────────────────────────────────
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name     = request.form.get("name", "").strip()
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not name or not email or not password:
            return render_template("signup.html", error="All fields are required.")

        if len(password) < 6:
            return render_template("signup.html", error="Password must be at least 6 characters.")

        existing = User.query.filter_by(email=email).first()
        if existing:
            return render_template("signup.html", error="This email is already registered. Please login.")

        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        session["user_id"]   = new_user.id
        session["user_name"] = new_user.name
        return redirect("/dashboard")

    return render_template("signup.html")


# ── LOGIN ─────────────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not email or not password:
            return render_template("login.html", error="Please enter your email and password.")

        user = User.query.filter_by(email=email).first()

        if user and user.password == password:
            session["user_id"]   = user.id
            session["user_name"] = user.name
            return redirect("/dashboard")

        return render_template("login.html", error="Invalid email or password. Please try again.")

    return render_template("login.html")


# ── ML PREDICTION API ─────────────────────────────────────────
# Features: start_lat, start_lon, end_lat, end_lon,
#           road_type, speed_limit, blackspot_flag,
#           road_surface, season, time_of_day,
#           weather_type, traffic_density

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if model is not None:
            # Use ML model with all 12 features
            features = pd.DataFrame([{
                "start_latitude":          float(data.get("start_latitude",  26.9124)),
                "start_longitude":         float(data.get("start_longitude", 75.7873)),
                "end_latitude":            float(data.get("end_latitude",    26.9150)),
                "end_longitude":           float(data.get("end_longitude",   75.7930)),
                "road_type":               int(data.get("road_type",         1)),
                "speed_limit_est(inKm/h)": int(data.get("speed_limit",       60)),
                "blackspot_flag":          int(data.get("blackspot_flag",     0)),
                "road_surface":            int(data.get("road_surface",       0)),
                "season":                  int(data.get("season",             1)),
                "time_of_day":             int(data.get("time_of_day",        2)),
                "weather_type":            int(data.get("weather_type",       0)),
                "traffic_density":         int(data.get("traffic_density",    1))
            }])
            prediction = model.predict(features)
            risk    = int(prediction[0])
            ml_used = True

        else:
            # Rule-based fallback if model not loaded
            wt  = int(data.get("weather_type",   0))
            bs  = int(data.get("blackspot_flag",  0))
            tod = int(data.get("time_of_day",     2))
            rs  = int(data.get("road_surface",    0))
            score = wt * 15 + bs * 25 + (15 if tod == 0 else 5 if tod == 1 else 0) + rs * 8
            risk    = 2 if score >= 50 else (1 if score >= 20 else 0)
            ml_used = False

        if risk == 2:
            alert = "High Risk — Drive with extreme caution. Reduce speed immediately."
        elif risk == 1:
            alert = "Medium Risk — Conditions not ideal. Stay focused and drive carefully."
        else:
            alert = "Low Risk — Conditions are relatively safe. Stay alert."

        return jsonify({"risk": risk, "alert": alert, "ml_used": ml_used})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── MAIN ──────────────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Database ready")
    app.run(debug=True)