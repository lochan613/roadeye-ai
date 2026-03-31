from flask import Flask, render_template, redirect, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import joblib
import pandas as pd
import os  # ← NEW IMPORT

app = Flask(__name__)

# ← DATABASE CHANGES HERE (OLD sqlite line HATAO, YE NAYA ADD KARO)
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///RoadEye.db')
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "roadeye_secret_2026_xk9"

db = SQLAlchemy(app)

# ← USER MODEL CHANGE (phone field ADD KARO)
class User(db.Model):
    __tablename__ = "users"
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    phone      = db.Column(db.String(15), nullable=True)  # ← NEW PHONE FIELD
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
        name     = request.form.get("name", "").strip()
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        phone    = request.form.get("phone", "").strip()  # ← NEW PHONE FIELD
        if not name or not email or not password:
            return render_template("signup.html", error="All fields are required.")
        if len(password) < 6:
            return render_template("signup.html", error="Password must be at least 6 characters.")
        if phone and not phone.isdigit():
            return render_template("signup.html", error="Phone must be 10 digits only.")
        existing = User.query.filter_by(email=email).first()
        if existing:
            return render_template("signup.html", error="Email already registered. Please login.")
        
        # ← NEW USER CREATION (phone bhi add kiya)
        new_user = User(name=name, email=email, password=password, phone=phone)
        db.session.add(new_user)
        db.session.commit()
        session["user_id"]    = new_user.id
        session["user_name"]  = new_user.name
        session["user_email"] = new_user.email
        session.permanent     = False
        return redirect("/dashboard")
    return render_template("signup.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect("/dashboard")
    if request.method == "POST":
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        if not email or not password:
            return render_template("login.html", error="Please enter email and password.")
        user = User.query.filter_by(email=email).first()
        if user and user.password == password:
            session["user_id"]    = user.id
            session["user_name"]  = user.name
            session["user_email"] = user.email
            session.permanent     = False
            return redirect("/dashboard")
        return render_template("login.html", error="Invalid email or password.")
    return render_template("login.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data"}), 400
        if model is not None:
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
            risk    = int(model.predict(features)[0])
            ml_used = True
        else:
            wt    = int(data.get("weather_type",  0))
            bs    = int(data.get("blackspot_flag", 0))
            tod   = int(data.get("time_of_day",    2))
            rs    = int(data.get("road_surface",   0))
            score = wt*15 + bs*25 + (15 if tod==0 else 5 if tod==1 else 0) + rs*8
            risk    = 2 if score >= 50 else (1 if score >= 20 else 0)
            ml_used = False
        alerts = [
            "Low Risk — Conditions are safe. Stay alert.",
            "Medium Risk — Conditions not ideal. Drive carefully.",
            "High Risk — Dangerous conditions. Reduce speed immediately."
        ]
        return jsonify({"risk": risk, "alert": alerts[risk], "ml_used": ml_used})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("Database ready")
    app.run(debug=True)