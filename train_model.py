import os
import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Dynamic path resolution to keep the execution directory-independent
base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "..", "data", "thermal_data.csv")
models_dir = os.path.join(base_dir, "..", "models")
os.makedirs(models_dir, exist_ok=True)

# ── Load Data ──────────────────────────────────
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"Thermal data CSV not found at {csv_path}. Please run generate_data.py first.")

df = pd.read_csv(csv_path)
X  = df[["temperature", "age", "hour", "region_encoded"]]
y  = df["label"]

# ── Scale ──────────────────────────────────────
scaler  = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Train/Test Split ───────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# ── Random Forest ──────────────────────────────
rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)
print("Random Forest Accuracy Metrics:")
print(classification_report(y_test, y_pred, target_names=["Normal", "Warning", "Critical"], zero_division=0))

# ── Isolation Forest (anomaly detection) ───────
# Fit only on Normal/Low data (label == 0) to capture baseline thresholds
normal_data = X_scaled[y == 0]
iso = IsolationForest(contamination=0.05, random_state=42)
iso.fit(normal_data)
print("Isolation Forest trained successfully!")

# ── Save Models ────────────────────────────────
rf_path = os.path.join(models_dir, "rf_model.pkl")
iso_path = os.path.join(models_dir, "iso_model.pkl")
scaler_path = os.path.join(models_dir, "scaler.pkl")

with open(rf_path, "wb") as f:
    pickle.dump(rf, f)
with open(iso_path, "wb") as f:
    pickle.dump(iso, f)
with open(scaler_path, "wb") as f:
    pickle.dump(scaler, f)

print(f"All model assets saved in folder: {models_dir}!")
