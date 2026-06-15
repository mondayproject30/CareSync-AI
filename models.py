from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    ward_no = Column(String, nullable=False)
    bed_no = Column(String, nullable=False)
    medical_condition = Column(String, nullable=False)

    # Relationships
    vital_signs = relationship("VitalSign", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")


class VitalSign(Base):
    __tablename__ = "vital_signs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(String, nullable=False) # ISO Format
    heart_rate = Column(Integer, nullable=False)
    spo2 = Column(Integer, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    respiratory_rate = Column(Integer, nullable=False)
    health_score = Column(Float, nullable=False)
    status = Column(String, nullable=False) # Stable, Warning, High Alert, Critical
    is_simulated = Column(Boolean, default=False)
    
    # Thermal camera module additions
    temp_status = Column(String, nullable=True) # Normal, Warning, Critical
    temp_anomaly = Column(String, nullable=True) # Stable, Spike Detected, Drop Detected
    temp_forecast = Column(Float, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="vital_signs")
    alerts = relationship("Alert", back_populates="vital_sign", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, nullable=False) # ISO Format
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs.id"), nullable=False)
    alert_type = Column(String, nullable=False) # e.g. "Low SpO2", "High Heart Rate"
    current_value = Column(String, nullable=False) # e.g. "SpO2 = 88%"
    priority = Column(String, nullable=False) # Medium (Warning), High (High Alert), Critical (Critical)
    assigned_staff = Column(String, nullable=True) # e.g. "Dr. Sarah Jenkins", "Nurse David"
    status = Column(String, default="Active") # Active, Acknowledged, Escalated, Resolved

    # Relationships
    patient = relationship("Patient", back_populates="alerts")
    vital_sign = relationship("VitalSign", back_populates="alerts")


class MLModelMetric(Base):
    __tablename__ = "ml_model_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    is_best = Column(Boolean, default=False)
    trained_at = Column(String, nullable=False)
