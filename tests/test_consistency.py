"""
tests/test_consistency.py
=========================
Unit and integration tests for backend/consistency.py:
  1. consistency_score() - Mahalanobis + spatial + temporal consistency + missing data handling.
  2. fuse_and_classify() - Weighted ensemble fusion, root cause classification rules, and exact schema serialization.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import AlertStatus, Parameter, RootCause, Severity
from backend.consistency import (
    consistency_score,
    fuse_and_classify,
    compute_mahalanobis_distance,
    haversine_km,
)


# ---------------------------------------------------------------------------
# Test Fixtures & Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_stations_meta():
    return [
        {"id": 1, "name": "Station Alpha", "latitude": 40.0150, "longitude": -105.2705, "elevation": 1620, "status": "normal", "source": "simulated"},
        {"id": 2, "name": "Station Beta", "latitude": 40.0250, "longitude": -105.2605, "elevation": 1640, "status": "normal", "source": "simulated"},
        {"id": 3, "name": "Station Gamma", "latitude": 40.0100, "longitude": -105.2805, "elevation": 1630, "status": "normal", "source": "simulated"},
        {"id": 4, "name": "Station Delta", "latitude": 40.0350, "longitude": -105.2505, "elevation": 1680, "status": "normal", "source": "simulated"},
    ]


@pytest.fixture
def sample_telemetry_df(sample_stations_meta):
    """Generate 12 synchronized timesteps across 4 stations."""
    base_ts = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    records = []
    for step in range(12):
        ts = base_ts - timedelta(minutes=15 * (12 - step))
        for st in sample_stations_meta:
            sid = st["id"]
            records.append({
                "station_id": sid,
                "obstime": ts,
                "temperature": 20.0 + math_sin_wave(step, sid),
                "pressure": 840.0 + step * 0.1,
                "humidity": 45.0 - math_sin_wave(step, sid) * 0.5,
            })
    return pd.DataFrame(records)


def math_sin_wave(step: int, sid: int) -> float:
    return float(round(2.0 * np.sin(step / 3.0) + (sid * 0.2), 2))


# ---------------------------------------------------------------------------
# 1. Tests for consistency_score()
# ---------------------------------------------------------------------------

class TestConsistencyScore:
    def test_haversine_accuracy(self):
        # Boulder to Denver (~40 km)
        d = haversine_km(40.0150, -105.2705, 39.7392, -104.9903)
        assert 35.0 < d < 48.0

    def test_mahalanobis_distance_normal_and_partial(self):
        mean = np.array([20.0, 840.0, 50.0])
        cov = np.diag([25.0, 36.0, 100.0])
        inv_cov = np.linalg.inv(cov)

        # Normal vector
        v_norm = np.array([20.5, 839.0, 52.0])
        d_norm = compute_mahalanobis_distance(v_norm, mean, inv_cov)
        assert d_norm < 1.5

        # Extreme outlier
        v_outlier = np.array([55.0, 920.0, 10.0])
        d_outlier = compute_mahalanobis_distance(v_outlier, mean, inv_cov)
        assert d_outlier > 5.0

        # Partial vector (with NaNs)
        v_partial = np.array([20.5, np.nan, 52.0])
        d_partial = compute_mahalanobis_distance(v_partial, mean, inv_cov)
        assert 0.0 < d_partial < 2.0

    def test_spatial_consistency_distinguishes_fault_from_regional_event(self, sample_stations_meta, sample_telemetry_df):
        # Case A: Local sensor fault (Station 1 temperature jumps +18°C while neighbors stay normal)
        fault_df = sample_telemetry_df.copy()
        last_ts = fault_df["obstime"].max()
        idx_s1 = fault_df[(fault_df["station_id"] == 1) & (fault_df["obstime"] == last_ts)].index[0]
        fault_df.at[idx_s1, "temperature"] += 18.0

        res_fault = consistency_score(
            fault_df, sample_stations_meta, target_station_id=1, target_timestamp=last_ts
        )
        assert res_fault["score"] > 0.50
        assert any("spatial_outlier" in f for f in res_fault["flags"])
        assert not res_fault["details"]["is_coherent_regional_event"]

        # Case B: Coherent regional event (Stations 1, 2, 3, 4 all plunge -8°C simultaneously)
        event_df = sample_telemetry_df.copy()
        for sid in [1, 2, 3, 4]:
            idx_s = event_df[(event_df["station_id"] == sid) & (event_df["obstime"] == last_ts)].index[0]
            event_df.at[idx_s, "temperature"] -= 8.5
            event_df.at[idx_s, "pressure"] += 10.0

        res_event = consistency_score(
            event_df, sample_stations_meta, target_station_id=1, target_timestamp=last_ts
        )
        assert res_event["details"]["is_coherent_regional_event"]
        assert "coherent_regional_movement" in res_event["flags"]

    def test_missing_data_dropout_handling(self, sample_stations_meta, sample_telemetry_df):
        drop_df = sample_telemetry_df.copy()
        last_ts = drop_df["obstime"].max()
        idx_s2 = drop_df[(drop_df["station_id"] == 2) & (drop_df["obstime"] == last_ts)].index[0]
        drop_df.loc[idx_s2, ["temperature", "pressure", "humidity"]] = np.nan

        res_drop = consistency_score(
            drop_df, sample_stations_meta, target_station_id=2, target_timestamp=last_ts
        )
        assert res_drop["score"] >= 0.85
        assert "comms_dropout" in res_drop["flags"]
        assert res_drop["details"]["is_dropout"]


# ---------------------------------------------------------------------------
# 2. Tests for fuse_and_classify()
# ---------------------------------------------------------------------------

class TestFuseAndClassify:
    def test_exact_alert_schema_and_enums(self):
        alert = fuse_and_classify(
            station_id=1,
            station_name="Station Alpha",
            timestamp=datetime(2026, 8, 29, 12, 0, 0, tzinfo=timezone.utc),
            detector_scores={"statistical": 0.8, "lstm": 0.85, "isolation_forest": 0.75, "consistency": 0.9},
            detector_flags={"statistical": ["rolling_zscore_temperature"], "consistency": ["spatial_outlier_temperature"]},
            parameter_values={"temperature": 38.0, "pressure": 840.0, "humidity": 40.0},
        )

        assert alert is not None
        # Check all required keys
        required_keys = {
            "id", "station_id", "station_name", "timestamp", "confidence",
            "severity", "root_cause", "summary", "parameters_flagged", "status",
        }
        assert set(alert.keys()) == required_keys

        # Check Enum values
        assert alert["severity"] in ["low", "medium", "high"]
        assert alert["root_cause"] in ["sensor_fault", "comms_error", "genuine_event", "unknown"]
        assert alert["status"] in ["active", "acknowledged", "resolved"]
        for p in alert["parameters_flagged"]:
            assert p in ["temperature", "pressure", "humidity"]

        # Check ISO timestamp with Z
        assert alert["timestamp"].endswith("Z")
        assert alert["station_id"] == 1
        assert alert["station_name"] == "Station Alpha"

    def test_rule_frozen_yields_sensor_fault(self):
        alert = fuse_and_classify(
            station_id=2,
            station_name="Station Beta",
            timestamp="2026-08-29T14:30:00Z",
            detector_scores={"statistical": 0.7, "lstm": 0.6, "isolation_forest": 0.5, "consistency": 0.95},
            is_frozen=True,
            parameter_values={"temperature": 21.34},
        )
        assert alert is not None
        assert alert["root_cause"] == RootCause.sensor_fault.value
        assert "frozen" in alert["summary"].lower()

    def test_rule_dropout_yields_comms_error(self):
        alert = fuse_and_classify(
            station_id=3,
            station_name="Station Gamma",
            timestamp="2026-08-29T15:00:00Z",
            detector_scores={"statistical": 0.9, "lstm": 0.8, "isolation_forest": 0.9, "consistency": 0.95},
            is_dropout=True,
            parameter_values={"temperature": None, "pressure": None, "humidity": None},
        )
        assert alert is not None
        assert alert["root_cause"] == RootCause.comms_error.value
        assert alert["root_cause"] != "communication_error"
        assert "dropout" in alert["summary"].lower() or "communication" in alert["summary"].lower()

    def test_rule_coherent_neighbors_yields_genuine_event(self):
        alert = fuse_and_classify(
            station_id=4,
            station_name="Station Delta",
            timestamp="2026-08-29T16:00:00Z",
            detector_scores={"statistical": 0.85, "lstm": 0.90, "isolation_forest": 0.80, "consistency": 0.40},
            detector_flags={"consistency": ["coherent_regional_movement"]},
            is_coherent_neighbor_event=True,
            parameter_values={"temperature": 12.0, "pressure": 855.0},
        )
        assert alert is not None
        assert alert["root_cause"] == RootCause.genuine_event.value
        assert alert["root_cause"] != "genuine_weather_event"
        assert "regional" in alert["summary"].lower() or "event" in alert["summary"].lower()

    def test_configurable_weights(self):
        # Heavy weight on LSTM vs heavy weight on Statistical
        scores = {"statistical": 0.9, "lstm": 0.1, "isolation_forest": 0.1, "consistency": 0.1}

        w1 = {"statistical": 0.9, "lstm": 0.03, "isolation_forest": 0.03, "consistency": 0.04}
        a1 = fuse_and_classify(
            station_id=1, station_name="St1", timestamp="2026-08-29T10:00:00Z",
            detector_scores=scores, weights=w1, threshold=0.5,
        )
        assert a1 is not None
        assert a1["confidence"] >= 0.70

        w2 = {"statistical": 0.05, "lstm": 0.8, "isolation_forest": 0.1, "consistency": 0.05}
        a2 = fuse_and_classify(
            station_id=1, station_name="St1", timestamp="2026-08-29T10:00:00Z",
            detector_scores=scores, weights=w2, threshold=0.5,
        )
        # Confidence is low (below 0.5), returns None
        assert a2 is None
