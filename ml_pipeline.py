import os
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib

# ML imports
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

# Define patients base metadata
PATIENTS = [
    {"id": "P001", "name": "John Doe", "age": 65, "gender": "Male", "ward_no": "Ward 1", "bed_no": "101", "medical_condition": "Hypertension"},
    {"id": "P002", "name": "Jane Smith", "age": 45, "gender": "Female", "ward_no": "Ward 1", "bed_no": "102", "medical_condition": "Healthy"},
    {"id": "P003", "name": "Robert Johnson", "age": 72, "gender": "Male", "ward_no": "Ward 2", "bed_no": "201", "medical_condition": "Cancer"},
    {"id": "P004", "name": "Emily Davis", "age": 29, "gender": "Female", "ward_no": "Ward 2", "bed_no": "202", "medical_condition": "Healthy"},
    {"id": "P005", "name": "Michael Brown", "age": 58, "gender": "Male", "ward_no": "Ward 3", "bed_no": "301", "medical_condition": "Diabetes"},
    {"id": "P006", "name": "Linda Wilson", "age": 62, "gender": "Female", "ward_no": "Ward 3", "bed_no": "302", "medical_condition": "Hypertension"},
    {"id": "P007", "name": "William Jones", "age": 70, "gender": "Male", "ward_no": "Ward 1", "bed_no": "103", "medical_condition": "Cancer"},
    {"id": "P008", "name": "Elizabeth Miller", "age": 54, "gender": "Female", "ward_no": "Ward 2", "bed_no": "203", "medical_condition": "Diabetes"},
    {"id": "P009", "name": "David Taylor", "age": 81, "gender": "Male", "ward_no": "Ward 3", "bed_no": "303", "medical_condition": "Hypertension"},
    {"id": "P010", "name": "Barbara Anderson", "age": 38, "gender": "Female", "ward_no": "Ward 1", "bed_no": "104", "medical_condition": "Healthy"},
    {"id": "P011", "name": "Richard Thomas", "age": 49, "gender": "Male", "ward_no": "Ward 2", "bed_no": "204", "medical_condition": "Diabetes"},
    {"id": "P012", "name": "Susan Jackson", "age": 66, "gender": "Female", "ward_no": "Ward 3", "bed_no": "304", "medical_condition": "Cancer"}
]

# Classification Alert Level Helpers
def get_hr_alert(hr):
    if hr < 40 or hr > 130:
        return 3
    if (40 <= hr <= 49) or (111 <= hr <= 130):
        return 2
    if (50 <= hr <= 59) or (101 <= hr <= 110):
        return 1
    return 0

def get_spo2_alert(spo2):
    if spo2 < 90:
        return 3
    if 90 <= spo2 <= 92:
        return 2
    if 93 <= spo2 <= 94:
        return 1
    return 0

def get_sbp_alert(sbp):
    if sbp < 80 or sbp > 180:
        return 3
    if (80 <= sbp <= 84) or (140 <= sbp <= 180):
        return 2
    if (85 <= sbp <= 89) or (121 <= sbp <= 139):
        return 1
    return 0

def get_dbp_alert(dbp):
    if dbp < 50 or dbp > 110:
        return 3
    if (50 <= dbp <= 54) or (90 <= dbp <= 110):
        return 2
    if (55 <= dbp <= 59) or (81 <= dbp <= 89):
        return 1
    return 0

def get_temp_alert(temp):
    if temp < 35.0 or temp > 39.0:
        return 3
    if (35.0 <= temp <= 35.4) or (38.1 <= temp <= 39.0):
        return 2
    if (35.5 <= temp <= 36.0) or (37.3 <= temp <= 38.0):
        return 1
    return 0

def get_rr_alert(rr):
    if rr < 8 or rr > 30:
        return 3
    if (8 <= rr <= 9) or (25 <= rr <= 30):
        return 2
    if (10 <= rr <= 11) or (21 <= rr <= 24):
        return 1
    return 0

def calculate_health_metrics(hr, spo2, sbp, dbp, temp, rr):
    """
    Computes alert weights, parameter weights, health score, and status.
    """
    alert_hr = get_hr_alert(hr)
    alert_spo2 = get_spo2_alert(spo2)
    alert_bp = max(get_sbp_alert(sbp), get_dbp_alert(dbp))
    alert_temp = get_temp_alert(temp)
    alert_rr = get_rr_alert(rr)

    # Weights: HR=2, SpO2=3, BP=3, Temp=1, RR=2
    # Weighted risk = sum(weight * alert_level) / sum(weight * 3) * 100
    weighted_risk = (
        (2 * alert_hr) + (3 * alert_spo2) + (3 * alert_bp) + (1 * alert_temp) + (2 * alert_rr)
    ) / 33.0 * 100.0

    health_score = round(100.0 - weighted_risk, 1)

    # Status classification:
    # Critical: Any life-threatening value (alert level 3)
    # High Alert: Two or more abnormal parameters (alert level >= 1)
    # Warning: Exactly one parameter abnormal (alert level >= 1)
    # Stable: All vitals normal (all alert levels are 0)
    alerts = [alert_hr, alert_spo2, alert_bp, alert_temp, alert_rr]
    critical_count = sum(1 for a in alerts if a == 3)
    abnormal_count = sum(1 for a in alerts if a >= 1)

    if critical_count >= 1:
        status = "Critical"
    elif abnormal_count >= 2:
        status = "High Alert"
    elif abnormal_count == 1:
        status = "Warning"
    else:
        status = "Stable"

    return health_score, status

def generate_synthetic_data(num_records=11000, output_csv="backend/data/patients_vitals.csv"):
    """
    Generates realistic sequential timeseries patient data at 15-minute intervals.
    """
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    
    steps_per_patient = (num_records // len(PATIENTS)) + 50
    data = []
    
    start_time = datetime.now() - timedelta(minutes=15 * steps_per_patient)
    
    for patient in PATIENTS:
        p_id = patient["id"]
        p_name = patient["name"]
        p_age = patient["age"]
        p_gender = patient["gender"]
        p_ward = patient["ward_no"]
        p_bed = patient["bed_no"]
        p_cond = patient["medical_condition"]
        
        # Baselines depending on condition
        if p_cond == "Hypertension":
            base_hr, base_spo2, base_sbp, base_dbp, base_temp, base_rr = 76, 97, 134, 86, 36.6, 16
        elif p_cond == "Diabetes":
            base_hr, base_spo2, base_sbp, base_dbp, base_temp, base_rr = 78, 96, 122, 78, 36.7, 17
        elif p_cond == "Cancer":
            base_hr, base_spo2, base_sbp, base_dbp, base_temp, base_rr = 86, 94, 114, 72, 37.4, 19
        else: # Healthy
            base_hr, base_spo2, base_sbp, base_dbp, base_temp, base_rr = 72, 98, 115, 75, 36.6, 15

        # Initialize current vitals
        curr_hr, curr_spo2, curr_sbp, curr_dbp, curr_temp, curr_rr = base_hr, base_spo2, base_sbp, base_dbp, base_temp, base_rr

        # Setup deterioration cycles to simulate realistic events
        # Create list of step indices for deterioration events
        det_events = sorted(random.sample(range(50, steps_per_patient - 50), 4))
        
        for step in range(steps_per_patient):
            timestamp = (start_time + timedelta(minutes=15 * step)).isoformat()
            
            # Determine if in a deterioration event (lasts 15-25 steps)
            in_deterioration = False
            for det_start in det_events:
                if det_start <= step < det_start + random.randint(15, 25):
                    in_deterioration = True
                    break
            
            # Generate vitals with small random walk fluctuations
            hr_noise = random.choice([-2, -1, 0, 1, 2])
            spo2_noise = random.choice([-1, 0, 0, 1])
            sbp_noise = random.choice([-3, -1, 0, 1, 3])
            dbp_noise = random.choice([-2, -1, 0, 1, 2])
            temp_noise = random.choice([-0.1, 0.0, 0.1])
            rr_noise = random.choice([-1, 0, 1])

            if in_deterioration:
                # Vitals drift into Critical / Warning zones depending on condition
                if p_cond == "Hypertension" or p_cond == "Diabetes":
                    # hypretensive/cardiac incident
                    curr_hr += random.randint(1, 4)
                    curr_sbp += random.randint(2, 5)
                    curr_dbp += random.randint(1, 3)
                    curr_spo2 -= random.choice([0, 1])
                    curr_rr += random.choice([0, 1])
                elif p_cond == "Cancer":
                    # respiratory distress or sepsis
                    curr_temp += random.choice([0.1, 0.2])
                    curr_spo2 -= random.randint(1, 2)
                    curr_rr += random.randint(1, 3)
                    curr_hr += random.randint(1, 4)
                else: # Healthy patient has minor issue
                    curr_hr += random.choice([-1, 2])
                    curr_sbp += random.choice([-2, 3])
                    curr_spo2 -= random.choice([0, 1])
            else:
                # Gentle pull back towards baseline
                curr_hr += hr_noise + (base_hr - curr_hr) * 0.1
                curr_spo2 += spo2_noise + (base_spo2 - curr_spo2) * 0.1
                curr_sbp += sbp_noise + (base_sbp - curr_sbp) * 0.1
                curr_dbp += dbp_noise + (base_dbp - curr_dbp) * 0.1
                curr_temp += temp_noise + (base_temp - curr_temp) * 0.1
                curr_rr += rr_noise + (base_rr - curr_rr) * 0.1

            # Ensure valid bounds
            curr_hr = max(35, min(160, int(curr_hr)))
            curr_spo2 = max(80, min(100, int(curr_spo2)))
            curr_sbp = max(70, min(210, int(curr_sbp)))
            curr_dbp = max(40, min(130, int(curr_dbp)))
            curr_temp = round(max(34.0, min(41.0, float(curr_temp))), 1)
            curr_rr = max(6, min(40, int(curr_rr)))

            health_score, status = calculate_health_metrics(
                curr_hr, curr_spo2, curr_sbp, curr_dbp, curr_temp, curr_rr
            )

            data.append({
                "timestamp": timestamp,
                "patient_id": p_id,
                "patient_name": p_name,
                "age": p_age,
                "gender": p_gender,
                "ward_no": p_ward,
                "bed_no": p_bed,
                "medical_condition": p_cond,
                "heart_rate": curr_hr,
                "spo2": curr_spo2,
                "systolic_bp": curr_sbp,
                "diastolic_bp": curr_dbp,
                "temperature": curr_temp,
                "respiratory_rate": curr_rr,
                "health_score": health_score,
                "status": status
            })

    df = pd.DataFrame(data)
    # Shuffle slightly or preserve time-order. We keep it ordered but make sure we save it.
    df.to_csv(output_csv, index=False)
    print(f"Generated {len(df)} records in {output_csv}")
    return df

def feature_engineering(df):
    """
    Computes MAP, Pulse Pressure, and Trend features.
    """
    df = df.sort_values(by=["patient_id", "timestamp"]).copy()
    df["map"] = (df["systolic_bp"] + 2 * df["diastolic_bp"]) / 3
    df["pulse_pressure"] = df["systolic_bp"] - df["diastolic_bp"]
    df["hr_trend"] = df.groupby("patient_id")["heart_rate"].diff().fillna(0)
    df["spo2_trend"] = df.groupby("patient_id")["spo2"].diff().fillna(0)
    return df

def train_and_evaluate_models(csv_path="backend/data/patients_vitals.csv"):
    """
    Preprocesses data, trains Random Forest, XGBoost, and LightGBM classifiers,
    evaluates their performance, saves the best model, and logs comparison metrics.
    """
    if not os.path.exists(csv_path):
        print("CSV dataset not found, generating first...")
        df = generate_synthetic_data(11000, csv_path)
    else:
        df = pd.read_csv(csv_path)

    # Apply Feature Engineering
    df = feature_engineering(df)

    # Encode categorical features
    # Gender (Male/Female)
    le_gender = LabelEncoder()
    df["gender_encoded"] = le_gender.fit_transform(df["gender"])
    
    # Medical Condition
    le_condition = LabelEncoder()
    df["condition_encoded"] = le_condition.fit_transform(df["medical_condition"])

    # Encode Status Target: Stable=0, Warning=1, High Alert=2, Critical=3
    status_mapping = {"Stable": 0, "Warning": 1, "High Alert": 2, "Critical": 3}
    df["status_encoded"] = df["status"].map(status_mapping)

    # Features list
    features = [
        "age", "gender_encoded", "condition_encoded", 
        "heart_rate", "spo2", "systolic_bp", "diastolic_bp", "temperature", "respiratory_rate",
        "map", "pulse_pressure", "hr_trend", "spo2_trend"
    ]

    X = df[features]
    y = df["status_encoded"]

    # Split: 80% train, 20% test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Define Models
    models = {
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'),
        "XGBoost": XGBClassifier(n_estimators=100, random_state=42, eval_metric='mlogloss'),
        "LightGBM": LGBMClassifier(n_estimators=100, random_state=42, verbose=-1, class_weight='balanced')
    }

    metrics_results = {}
    trained_models = {}

    for name, model in models.items():
        print(f"Training {name} Classifier...")
        if name == "Random Forest" or name == "LightGBM":
            # Can feed raw scaled arrays
            model.fit(X_train_scaled, y_train)
            preds = model.predict(X_test_scaled)
        elif name == "XGBoost":
            model.fit(X_train_scaled, y_train)
            preds = model.predict(X_test_scaled)
        
        # Calculate metrics
        acc = accuracy_score(y_test, preds)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average='macro', zero_division=0)
        
        metrics_results[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1)
        }
        trained_models[name] = model

    # Select best model based on F1-score
    best_name = max(metrics_results, key=lambda k: metrics_results[k]["f1_score"])
    print(f"\nBest model selected: {best_name} (F1 Score: {metrics_results[best_name]['f1_score']:.4f})")

    # Persist the preprocessors and the best model
    preprocessor_bundle = {
        "scaler": scaler,
        "le_gender": le_gender,
        "le_condition": le_condition,
        "features": features,
        "status_mapping": status_mapping,
        "status_inverse_mapping": {v: k for k, v in status_mapping.items()}
    }
    
    os.makedirs("backend/models", exist_ok=True)
    joblib.dump(preprocessor_bundle, "backend/models/preprocessors.joblib")
    joblib.dump(trained_models[best_name], f"backend/models/best_model.joblib")
    
    # Save the model comparison metrics for visualization
    metrics_summary = []
    for name, metrics in metrics_results.items():
        metrics_summary.append({
            "model_name": name,
            "accuracy": round(metrics["accuracy"] * 100, 2),
            "precision": round(metrics["precision"] * 100, 2),
            "recall": round(metrics["recall"] * 100, 2),
            "f1_score": round(metrics["f1_score"] * 100, 2),
            "is_best": name == best_name
        })
        
    with open("backend/models/model_metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=2)

    return metrics_summary

# Singleton Predictor to cache loaders
_predictor = None

class InferencePredictor:
    def __init__(self, models_dir="backend/models"):
        self.preprocessors = joblib.load(os.path.join(models_dir, "preprocessors.joblib"))
        self.model = joblib.load(os.path.join(models_dir, "best_model.joblib"))
        self.features = self.preprocessors["features"]
        self.scaler = self.preprocessors["scaler"]
        self.le_gender = self.preprocessors["le_gender"]
        self.le_condition = self.preprocessors["le_condition"]
        self.inverse_mapping = self.preprocessors["status_inverse_mapping"]

    def predict(self, patient_dict, vital_dict, prev_vital_dict=None):
        """
        Runs ML inference on a vital sign reading.
        patient_dict keys: gender, age, medical_condition
        vital_dict keys: heart_rate, spo2, systolic_bp, diastolic_bp, temperature, respiratory_rate
        prev_vital_dict keys: heart_rate, spo2 (optional, to compute trends)
        """
        # Feature calculations
        sbp = vital_dict["systolic_bp"]
        dbp = vital_dict["diastolic_bp"]
        hr = vital_dict["heart_rate"]
        spo2 = vital_dict["spo2"]

        v_map = (sbp + 2 * dbp) / 3.0
        pp = sbp - dbp

        if prev_vital_dict:
            hr_trend = hr - prev_vital_dict["heart_rate"]
            spo2_trend = spo2 - prev_vital_dict["spo2"]
        else:
            hr_trend = 0
            spo2_trend = 0

        # Encode categorical variables
        # Fallback handling for unseen categories
        try:
            gender_enc = self.le_gender.transform([patient_dict["gender"]])[0]
        except Exception:
            gender_enc = 0
            
        try:
            cond_enc = self.le_condition.transform([patient_dict["medical_condition"]])[0]
        except Exception:
            cond_enc = 0

        # Prepare single row DataFrame
        input_data = pd.DataFrame([{
            "age": patient_dict["age"],
            "gender_encoded": gender_enc,
            "condition_encoded": cond_enc,
            "heart_rate": hr,
            "spo2": spo2,
            "systolic_bp": sbp,
            "diastolic_bp": dbp,
            "temperature": vital_dict["temperature"],
            "respiratory_rate": vital_dict["respiratory_rate"],
            "map": v_map,
            "pulse_pressure": pp,
            "hr_trend": hr_trend,
            "spo2_trend": spo2_trend
        }])

        # Standard Scale the inputs
        input_scaled = self.scaler.transform(input_data[self.features])
        
        # Predict
        pred_class = self.model.predict(input_scaled)[0]
        return self.inverse_mapping[int(pred_class)]

def predict_patient_status(patient_dict, vital_dict, prev_vital_dict=None):
    global _predictor
    if _predictor is None:
        try:
            _predictor = InferencePredictor()
        except Exception as e:
            print(f"Error initializing predictor: {e}. Falling back to rule-based status.")
            # Fallback to rule-based classification if model files are missing
            _, rule_status = calculate_health_metrics(
                vital_dict["heart_rate"],
                vital_dict["spo2"],
                vital_dict["systolic_bp"],
                vital_dict["diastolic_bp"],
                vital_dict["temperature"],
                vital_dict["respiratory_rate"]
            )
            return rule_status
            
    return _predictor.predict(patient_dict, vital_dict, prev_vital_dict)

if __name__ == "__main__":
    # Test script execution
    print("Generating dataset...")
    generate_synthetic_data(1000)
    print("Training models...")
    metrics = train_and_evaluate_models()
    print("Metrics summary JSON:")
    print(json.dumps(metrics, indent=2))
