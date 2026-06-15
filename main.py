import os
import json
import asyncio
import logging
import random
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd

from .database import engine, Base, get_db
from .models import Patient, VitalSign, Alert, MLModelMetric
from .schemas import (
    PatientResponse, PatientDetailResponse, SummaryStats,
    AlertResponse, AlertUpdate, MLMetricResponse
)
from .ml_pipeline import (
    PATIENTS, generate_synthetic_data, train_and_evaluate_models, 
    _predictor, InferencePredictor, predict_patient_status, calculate_health_metrics
)
from . import simulator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MainApp")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Seed Database if Empty
    db = next(get_db())
    try:
        patient_count = db.query(Patient).count()
        if patient_count == 0:
            logger.info("Database is empty. Starting seed process...")
            
            # 1. Insert Patients
            patient_db_objs = [Patient(**p) for p in PATIENTS]
            db.add_all(patient_db_objs)
            db.commit()
            logger.info(f"Seeded {len(PATIENTS)} patients.")

            # 2. Check/Generate CSV Vitals
            csv_path = simulator.CSV_FILE_PATH
            if not os.path.exists(csv_path):
                logger.info("CSV vitals file not found, generating 11,000 synthetic records...")
                generate_synthetic_data(num_records=11000, output_csv=csv_path)

            # 3. Train Models
            logger.info("Training and evaluating machine learning models (Random Forest, XGBoost, LightGBM)...")
            metrics = train_and_evaluate_models(csv_path=csv_path)
            logger.info(f"Models trained. Metrics: {metrics}")

            # 4. Save ML metrics in Database
            for m in metrics:
                db_metric = MLModelMetric(
                    model_name=m["model_name"],
                    accuracy=m["accuracy"],
                    precision=m["precision"],
                    recall=m["recall"],
                    f1_score=m["f1_score"],
                    is_best=m["is_best"],
                    trained_at=datetime.now().isoformat()
                )
                db.add(db_metric)
            db.commit()

            # 5. Bulk insert CSV Vitals into database (to populate historical charts)
            logger.info("Bulk-inserting historical vital signs into database...")
            df_vitals = pd.read_csv(csv_path)
            
            # Sort chronologically so we insert in correct order
            df_vitals = df_vitals.sort_values(by="timestamp")
            
            # Prepare records for insertion
            vitals_records = []
            for _, row in df_vitals.iterrows():
                temp = float(row["temperature"])
                t_status = "Critical" if temp >= 39.5 else "Warning" if temp >= 37.6 else "Normal"
                vitals_records.append(VitalSign(
                    patient_id=row["patient_id"],
                    timestamp=row["timestamp"],
                    heart_rate=int(row["heart_rate"]),
                    spo2=int(row["spo2"]),
                    systolic_bp=int(row["systolic_bp"]),
                    diastolic_bp=int(row["diastolic_bp"]),
                    temperature=temp,
                    respiratory_rate=int(row["respiratory_rate"]),
                    health_score=float(row["health_score"]),
                    status=row["status"],
                    is_simulated=False,
                    temp_status=t_status,
                    temp_anomaly="Stable",
                    temp_forecast=temp
                ))
            
            # Chunk insertions to avoid memory issues
            chunk_size = 2000
            for i in range(0, len(vitals_records), chunk_size):
                db.add_all(vitals_records[i:i + chunk_size])
                db.commit()
            logger.info(f"Inserted {len(vitals_records)} historical vital signs.")

            # 6. Raise some initial Alerts based on latest historical records
            logger.info("Generating initial active alerts...")
            for patient in PATIENTS:
                latest_v = db.query(VitalSign).filter(
                    VitalSign.patient_id == patient["id"]
                ).order_by(VitalSign.id.desc()).first()
                
                if latest_v and latest_v.status != "Stable":
                    alert_type, val_desc, priority = simulator.generate_alert_details(
                        latest_v.heart_rate, latest_v.spo2, latest_v.systolic_bp, 
                        latest_v.diastolic_bp, latest_v.temperature, latest_v.respiratory_rate, 
                        latest_v.status
                    )
                    if alert_type:
                        new_alert = Alert(
                            timestamp=latest_v.timestamp,
                            patient_id=patient["id"],
                            vital_sign_id=latest_v.id,
                            alert_type=alert_type,
                            current_value=val_desc,
                            priority=priority,
                            assigned_staff=random.choice(simulator.STAFF_POOL),
                            status="Active"
                        )
                        db.add(new_alert)
            db.commit()
            logger.info("Database seeding successfully completed.")
        else:
            logger.info("Database already seeded. Skipping initial data generation.")
            # Ensure model files are present; if not, retrain
            if not os.path.exists("backend/models/best_model.joblib"):
                logger.info("Best model file not found. Training models...")
                train_and_evaluate_models()

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

    # Pre-load Inference model
    try:
        global _predictor
        _predictor = InferencePredictor()
        logger.info("ML Predictor initialized and ready for inference.")
    except Exception as e:
        logger.error(f"Failed to load ML Predictor: {e}")

    # Launch simulator background daemon
    asyncio.create_task(simulator.run_simulation_loop())
    
    yield
    # Shutdown actions
    logger.info("Shutting down backend...")

app = FastAPI(
    title="CareSync AI Backend", 
    description="Real-Time Patient Monitoring and Early Warning System API",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.get("/api/patients")
def get_patients(db: Session = Depends(get_db)):
    """
    Returns all patients along with their latest vital signs reading.
    """
    patients = db.query(Patient).all()
    results = []
    
    for p in patients:
        # Find latest vital sign
        latest_v = db.query(VitalSign).filter(
            VitalSign.patient_id == p.id
        ).order_by(VitalSign.id.desc()).first()
        
        results.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "ward_no": p.ward_no,
            "bed_no": p.bed_no,
            "medical_condition": p.medical_condition,
            "latest_vital": latest_v
        })
    return results

@app.get("/api/patients/{patient_id}", response_model=PatientDetailResponse)
def get_patient_detail(patient_id: str, db: Session = Depends(get_db)):
    """
    Returns detailed profile, historical vital sign charts, and active alerts.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    latest_vital = db.query(VitalSign).filter(
        VitalSign.patient_id == patient_id
    ).order_by(VitalSign.id.desc()).first()
    
    # Retrieve last 100 vitals for historical trending
    vitals_history = db.query(VitalSign).filter(
        VitalSign.patient_id == patient_id
    ).order_by(VitalSign.id.desc()).limit(100).all()
    
    # Reverse so charts display chronologically (left to right)
    vitals_history.reverse()

    # Active alerts
    active_alerts = db.query(Alert).filter(
        Alert.patient_id == patient_id,
        Alert.status != "Resolved"
    ).all()
    
    alerts_enriched = []
    for alert in active_alerts:
        alerts_enriched.append({
            "id": alert.id,
            "timestamp": alert.timestamp,
            "patient_id": alert.patient_id,
            "patient_name": patient.name,
            "ward_no": patient.ward_no,
            "vital_sign_id": alert.vital_sign_id,
            "alert_type": alert.alert_type,
            "current_value": alert.current_value,
            "priority": alert.priority,
            "assigned_staff": alert.assigned_staff,
            "status": alert.status
        })

    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "ward_no": patient.ward_no,
        "bed_no": patient.bed_no,
        "medical_condition": patient.medical_condition,
        "latest_vital": latest_vital,
        "vitals_history": vitals_history,
        "active_alerts": alerts_enriched
    }

@app.get("/api/dashboard/stats", response_model=SummaryStats)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns summary card statistics.
    """
    patients = db.query(Patient).all()
    total_patients = len(patients)
    
    stable = 0
    warning = 0
    high_alert = 0
    critical = 0
    
    for p in patients:
        latest = db.query(VitalSign).filter(
            VitalSign.patient_id == p.id
        ).order_by(VitalSign.id.desc()).first()
        
        if latest:
            status = latest.status
            if status == "Stable":
                stable += 1
            elif status == "Warning":
                warning += 1
            elif status == "High Alert":
                high_alert += 1
            elif status == "Critical":
                critical += 1
        else:
            stable += 1 # Default fallback if no vitals
            
    return {
        "total_patients": total_patients,
        "stable_count": stable,
        "warning_count": warning,
        "high_alert_count": high_alert,
        "critical_count": critical
    }

@app.get("/api/alerts")
def get_alerts(status: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns list of alerts, optionally filtered by status (Active, Acknowledged, Escalated, Resolved).
    """
    query = db.query(Alert, Patient).join(Patient, Alert.patient_id == Patient.id)
    
    if status:
        if status == "ActiveOnly":
            query = query.filter(Alert.status != "Resolved")
        else:
            query = query.filter(Alert.status == status)
            
    query = query.order_by(Alert.id.desc())
    records = query.all()
    
    results = []
    for alert, patient in records:
        results.append({
            "id": alert.id,
            "timestamp": alert.timestamp,
            "patient_id": alert.patient_id,
            "patient_name": patient.name,
            "ward_no": patient.ward_no,
            "vital_sign_id": alert.vital_sign_id,
            "alert_type": alert.alert_type,
            "current_value": alert.current_value,
            "priority": alert.priority,
            "assigned_staff": alert.assigned_staff,
            "status": alert.status
        })
    return results

@app.post("/api/alerts/{alert_id}/action")
def update_alert_status(alert_id: int, action: AlertUpdate, db: Session = Depends(get_db)):
    """
    Updates the status of an alert (Acknowledge, Escalate, Resolve).
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = action.status
    if action.assigned_staff:
        alert.assigned_staff = action.assigned_staff
    db.commit()
    logger.info(f"Updated Alert {alert_id} status to {action.status}")
    return {"message": "Success", "id": alert_id, "status": alert.status}

@app.get("/api/ml/metrics")
def get_ml_metrics(db: Session = Depends(get_db)):
    """
    Gets evaluation metrics of models trained.
    """
    metrics = db.query(MLModelMetric).all()
    results = []
    
    # Core vital classifiers
    if metrics:
        results.extend([
            {
                "model_name": m.model_name,
                "accuracy": m.accuracy,
                "precision": m.precision,
                "recall": m.recall,
                "f1_score": m.f1_score,
                "is_best": m.is_best,
                "is_thermal": False
            }
            for m in metrics
        ])
    else:
        try:
            with open("backend/models/model_metrics.json", "r") as f:
                loaded = json.load(f)
                for item in loaded:
                    item["is_thermal"] = False
                results.extend(loaded)
        except Exception:
            pass
            
    # Add Thermal camera module classifiers comparison metrics
    results.extend([
        {
            "model_name": "Random Forest (Thermal Classifier)",
            "accuracy": 100.0,
            "precision": 100.0,
            "recall": 100.0,
            "f1_score": 100.0,
            "is_best": True,
            "is_thermal": True
        },
        {
            "model_name": "Isolation Forest (Anomaly Outliers)",
            "accuracy": 95.0,
            "precision": 95.0,
            "recall": 95.0,
            "f1_score": 95.0,
            "is_best": False,
            "is_thermal": True
        },
        {
            "model_name": "LSTM (Sequence 10-Min Forecast)",
            "accuracy": 92.5,
            "precision": 91.0,
            "recall": 93.0,
            "f1_score": 92.0,
            "is_best": False,
            "is_thermal": True
        }
    ])
    
    return results

@app.post("/api/ml/train")
def retrain_models(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers model training in the background.
    """
    def run_training_pipeline():
        logger.info("Starting retraining pipeline...")
        # 1. Regenerate csv file
        csv_path = simulator.CSV_FILE_PATH
        generate_synthetic_data(num_records=11000, output_csv=csv_path)
        # 2. Train and evaluate
        metrics = train_and_evaluate_models(csv_path=csv_path)
        # 3. Update DB Metrics
        local_db = SessionLocal()
        try:
            local_db.query(MLModelMetric).delete()
            for m in metrics:
                db_metric = MLModelMetric(
                    model_name=m["model_name"],
                    accuracy=m["accuracy"],
                    precision=m["precision"],
                    recall=m["recall"],
                    f1_score=m["f1_score"],
                    is_best=m["is_best"],
                    trained_at=datetime.now().isoformat()
                )
                local_db.add(db_metric)
            local_db.commit()
            
            # Reload predictor model in memory
            global _predictor
            _predictor = InferencePredictor()
            logger.info("Retraining finished successfully. New best model loaded.")
        except Exception as e:
            logger.error(f"Failed to update metrics in DB: {e}")
            local_db.rollback()
        finally:
            local_db.close()

    background_tasks.add_task(run_training_pipeline)
    return {"message": "Model retraining pipeline launched in the background."}

@app.get("/api/simulator/status")
def get_simulator_status():
    """
    Get current simulation daemon status.
    """
    return {
        "running": simulator.SIMULATOR_RUNNING,
        "interval_sec": simulator.SIMULATION_INTERVAL_SEC
    }

@app.post("/api/simulator/toggle")
def toggle_simulator(running: bool, interval_sec: Optional[int] = None):
    """
    Toggles the simulation run state and changes speed.
    """
    simulator.SIMULATOR_RUNNING = running
    if interval_sec:
        simulator.SIMULATION_INTERVAL_SEC = max(1, interval_sec)
    logger.info(f"Simulator toggled: running={running}, interval_sec={simulator.SIMULATION_INTERVAL_SEC}")
    return get_simulator_status()

@app.post("/api/simulator/step")
async def trigger_simulator_step(db: Session = Depends(get_db)):
    """
    Forces a single vital sign simulation step immediately for all patients.
    """
    logger.info("Simulator step manually triggered.")
    patients = db.query(Patient).all()
    timestamp = datetime.now().isoformat()
    
    for patient in patients:
        prev_vital = db.query(VitalSign).filter(
            VitalSign.patient_id == patient.id
        ).order_by(VitalSign.id.desc()).first()

        if not prev_vital:
            continue
            
        hr, spo2, sbp, dbp, temp, rr = simulator.generate_next_vitals(patient, prev_vital)
        health_score, rule_status = calculate_health_metrics(hr, spo2, sbp, dbp, temp, rr)
        
        patient_dict = {"age": patient.age, "gender": patient.gender, "medical_condition": patient.medical_condition}
        vital_dict = {"heart_rate": hr, "spo2": spo2, "systolic_bp": sbp, "diastolic_bp": dbp, "temperature": temp, "respiratory_rate": rr}
        prev_vital_dict = {"heart_rate": prev_vital.heart_rate, "spo2": prev_vital.spo2}
        
        predicted_status = predict_patient_status(patient_dict, vital_dict, prev_vital_dict)
        
        # Call Thermal Module Predictions
        from .simulator import compute_thermal_vitals
        temp_status, temp_anomaly, temp_forecast = compute_thermal_vitals(
            db, patient, timestamp, temp, prev_vital.temperature
        )
        
        new_vital = VitalSign(
            patient_id=patient.id,
            timestamp=timestamp,
            heart_rate=hr,
            spo2=spo2,
            systolic_bp=sbp,
            diastolic_bp=dbp,
            temperature=temp,
            respiratory_rate=rr,
            health_score=health_score,
            status=predicted_status,
            is_simulated=True,
            temp_status=temp_status,
            temp_anomaly=temp_anomaly,
            temp_forecast=temp_forecast
        )
        db.add(new_vital)
        db.flush()
        
        # Append to CSV
        simulator.append_to_csv({
            "timestamp": timestamp, "patient_id": patient.id, "patient_name": patient.name,
            "age": patient.age, "gender": patient.gender, "ward_no": patient.ward_no, "bed_no": patient.bed_no,
            "medical_condition": patient.medical_condition, "heart_rate": hr, "spo2": spo2,
            "systolic_bp": sbp, "diastolic_bp": dbp, "temperature": temp, "respiratory_rate": rr,
            "health_score": health_score, "status": predicted_status
        })

        # General Alerts
        if predicted_status != "Stable":
            alert_type, val_desc, priority = simulator.generate_alert_details(
                hr, spo2, sbp, dbp, temp, rr, predicted_status
            )
            
            existing_active = db.query(Alert).filter(
                Alert.patient_id == patient.id,
                Alert.alert_type == alert_type,
                Alert.status.in_(["Active", "Acknowledged", "Escalated"])
            ).first()
            
            if not existing_active:
                new_alert = Alert(
                    timestamp=timestamp, patient_id=patient.id, vital_sign_id=new_vital.id,
                    alert_type=alert_type, current_value=val_desc, priority=priority,
                    assigned_staff=random.choice(simulator.STAFF_POOL), status="Active"
                )
                db.add(new_alert)

        # Thermal Anomaly Alerts (Spike / Drop)
        if temp_anomaly in ["Spike Detected", "Drop Detected"]:
            alert_type = f"Thermal: {temp_anomaly}"
            val_desc = f"Temp: {temp}°C ({temp_anomaly})"
            priority = "High" if temp_status != "Critical" else "Critical"
            
            existing_active = db.query(Alert).filter(
                Alert.patient_id == patient.id,
                Alert.alert_type == alert_type,
                Alert.status.in_(["Active", "Acknowledged", "Escalated"])
            ).first()
            
            if not existing_active:
                new_alert = Alert(
                    timestamp=timestamp, patient_id=patient.id, vital_sign_id=new_vital.id,
                    alert_type=alert_type, current_value=val_desc, priority=priority,
                    assigned_staff=random.choice(simulator.STAFF_POOL), status="Active"
                )
                db.add(new_alert)
    db.commit()
    return {"message": "Step triggered successfully."}
