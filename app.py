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


# ── Load ML model (optional – only if file exists) ──
model = None
try:
    model = joblib.load("Model/model.pkl")
except Exception:
    pass  # Model not required for MVP


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
@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "ML model not loaded"}), 503

    try:
        road_type  = int(request.form["road_type"])
        weather    = int(request.form["weather"])
        blackspot  = int(request.form["blackspot"])

        features = pd.DataFrame([{
            "road_type":         road_type,
            "weather_condition": weather,
            "blackspot_flag":    blackspot
        }])

        prediction = model.predict(features)
        risk = int(prediction[0])

        if risk == 2:
            alert = "High Risk — Immediate Attention Required"
        elif risk == 1:
            alert = "Moderate Risk — Monitor Area"
        else:
            alert = "Low Risk — Safe to Drive"

        return jsonify({"risk": risk, "alert": alert})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── MAIN ──────────────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
