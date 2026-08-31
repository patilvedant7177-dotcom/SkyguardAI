"""
tests/test_explain.py
=====================
Unit tests for backend/explain.py:
  1. explain_alert() - SHAP and deterministic feature attribution, directions, non-empty narratives.
  2. predict_health() - Prognostic sensor health scoring across healthy, stable, degrading, and offline cases.
"""

from datetime import datetime, timezone
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import IsolationForest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import FeatureDirection, Parameter, RootCause, Severity, Trend
from backend.explain import explain_alert, predict_health


# ---------------------------------------------------------------------------
# 1. Tests for explain_alert()
# ---------------------------------------------------------------------------

class TestExplainAlert:
    def test_deterministic_explanation_schema(self):
        alert_data = {
            "id": 101,
            "station_id": 1,
            "station_name": "Boulder Central",
            "root_cause": RootCause.sensor_fault.value,
            "severity": Severity.high.value,
            "parameters_flagged": ["temperature"],
        }
        param_values = {"temperature": 39.5, "pressure": 838.0, "humidity": 30.0}

        exp = explain_alert(alert_id=101, alert_data=alert_data, parameter_values=param_values)

        assert exp["alert_id"] == 101
        assert "top_features" in exp and len(exp["top_features"]) > 0
        assert "narrative" in exp and len(exp["narrative"]) > 0

        # Verify top feature keys and directions
        for tf in exp["top_features"]:
            assert "feature" in tf and tf["feature"] in ["temperature", "pressure", "humidity"]
            assert "contribution" in tf and 0.0 <= tf["contribution"] <= 1.0
            assert tf["direction"] in [
                FeatureDirection.increases_anomaly.value,
                FeatureDirection.decreases_anomaly.value,
            ]

        # Narrative should be non-empty and mention the station and feature
        assert "Boulder Central" in exp["narrative"]
        assert "temperature" in exp["narrative"].lower()

    def test_shap_explanation_with_ml_model(self):
        # Fit small IsolationForest
        rng = np.random.default_rng(42)
        X_train = rng.normal(loc=[18.0, 840.0, 45.0], scale=[3.0, 5.0, 10.0], size=(200, 3))
        iso_model = IsolationForest(n_estimators=30, random_state=42).fit(X_train)

        # Extreme anomaly row (temperature=45°C)
        x_anomaly = np.array([45.0, 840.0, 45.0])
        param_values = {"temperature": 45.0, "pressure": 840.0, "humidity": 45.0}

        exp = explain_alert(
            alert_id=202,
            alert_data={"station_name": "Foothills Lab", "root_cause": "sensor_fault", "severity": "high"},
            ml_model=iso_model,
            feature_row=x_anomaly,
            parameter_values=param_values,
        )

        assert exp["alert_id"] == 202
        assert len(exp["top_features"]) == 3
        assert exp["top_features"][0]["feature"] == "temperature"
        assert exp["top_features"][0]["direction"] == FeatureDirection.increases_anomaly.value
        assert len(exp["narrative"]) > 0

    def test_narrative_distinct_for_different_root_causes(self):
        # Case A: Genuine Regional Event
        exp_gen = explain_alert(
            alert_id=301,
            alert_data={"station_name": "Mesa Lab", "root_cause": RootCause.genuine_event.value, "severity": "high"},
        )
        assert "regional" in exp_gen["narrative"].lower()
        assert "operating normally" in exp_gen["narrative"].lower() or "meteorological" in exp_gen["narrative"].lower()

        # Case B: Comms Error
        exp_comms = explain_alert(
            alert_id=302,
            alert_data={"station_name": "Reservoir North", "root_cause": RootCause.comms_error.value, "severity": "medium"},
        )
        assert "communication" in exp_comms["narrative"].lower() or "dropout" in exp_comms["narrative"].lower()

        # Case C: Sensor Fault
        exp_fault = explain_alert(
            alert_id=303,
            alert_data={"station_name": "Chautauqua", "root_cause": RootCause.sensor_fault.value, "severity": "high"},
        )
        assert "sensor fault" in exp_fault["narrative"].lower() or "calibration" in exp_fault["narrative"].lower()


# ---------------------------------------------------------------------------
# 2. Tests for predict_health()
# ---------------------------------------------------------------------------

class TestPredictHealth:
    def test_healthy_case(self):
        # Clean telemetry history with zero anomalies
        timestamps = pd.date_range("2026-08-20", periods=200, freq="15min")
        clean_df = pd.DataFrame({
            "obstime": timestamps,
            "temperature": 20.0 + np.sin(np.arange(200) / 10.0) * 3.0,
            "pressure": 840.0 + np.cos(np.arange(200) / 10.0) * 2.0,
            "humidity": 50.0 - np.sin(np.arange(200) / 10.0) * 8.0,
        })

        res = predict_health(station_id=1, telemetry_history=clean_df, recent_alerts=[])

        assert res["station_id"] == 1
        assert res["health_score"] >= 90
        assert res["trend"] == Trend.stable.value
        assert res["maintenance_forecast_days"] is None
        assert res["last_maintenance_at"].endswith("Z")

    def test_degrading_case_with_drift_and_faults(self):
        # Telemetry with progressive drift
        timestamps = pd.date_range("2026-08-20", periods=200, freq="15min")
        drifting_temp = 20.0 + np.linspace(0, 15.0, 200)  # +15°C drift over 50 hours
        drift_df = pd.DataFrame({
            "obstime": timestamps,
            "temperature": drifting_temp,
            "pressure": 840.0,
            "humidity": 45.0,
        })

        recent_alerts = [
            {"station_id": 2, "root_cause": RootCause.sensor_fault.value, "severity": Severity.high.value},
            {"station_id": 2, "root_cause": RootCause.sensor_fault.value, "severity": Severity.medium.value},
        ]

        res = predict_health(station_id=2, telemetry_history=drift_df, recent_alerts=recent_alerts)

        assert res["station_id"] == 2
        assert res["health_score"] < 75
        assert res["trend"] == Trend.degrading.value
        assert res["maintenance_forecast_days"] is not None
        assert 1 <= res["maintenance_forecast_days"] <= 20

    def test_offline_case_with_high_missingness(self):
        timestamps = pd.date_range("2026-08-20", periods=200, freq="15min")
        # 60% missing data
        t_vals = [20.0 if i < 80 else np.nan for i in range(200)]
        offline_df = pd.DataFrame({
            "obstime": timestamps,
            "temperature": t_vals,
            "pressure": [840.0 if i < 80 else np.nan for i in range(200)],
            "humidity": [50.0 if i < 80 else np.nan for i in range(200)],
        })

        res = predict_health(station_id=3, telemetry_history=offline_df)

        assert res["station_id"] == 3
        assert res["health_score"] <= 50
        assert res["trend"] == Trend.degrading.value
        assert res["maintenance_forecast_days"] <= 7

    def test_forced_status_profiles(self):
        h_norm = predict_health(station_id=10, forced_status="healthy")
        assert h_norm["health_score"] >= 90
        assert h_norm["maintenance_forecast_days"] is None

        h_deg = predict_health(station_id=11, forced_status="degrading")
        assert 55 <= h_deg["health_score"] <= 75
        assert h_deg["trend"] == Trend.degrading.value

        h_off = predict_health(station_id=12, forced_status="offline")
        assert h_off["health_score"] <= 45
        assert h_off["trend"] == Trend.degrading.value
        assert h_off["maintenance_forecast_days"] <= 3
