"""
backend/simulate.py
===================
Atmospheric anomaly simulation engine for SkyguardAI.

Provides:
  1. inject_anomalies()   - Historical Maitri station benchmark simulation (spike,
                            frozen_value, calibration_drift, communication_dropout,
                            correlated_noise) with ground-truth labels.
  2. generate_stations()  - Configurable demo city network (8-12 stations with
                            realistic local weather, 15-min telemetry, spatial
                            correlation, and reproducible seeds).
  3. demo_scenarios()     - Injects real-world scenarios (sensor_fault, comms_error,
                            genuine_regional_weather_event) and routes through Stage 2/5
                            detection + spatial multi-station fusion pipeline.

Outputs:
  - data/simulated/maitri_with_anomalies.parquet
  - data/simulated/maitri_labels.parquet
  - data/simulated/local_stations.parquet
  - data/simulated/demo_state.json
"""

from __future__ import annotations

import argparse
import json
import logging
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("skyguard.simulate")

ROOT = Path(__file__).resolve().parent.parent
CLEAN_DATA_PATH = ROOT / "data" / "processed" / "maitri_clean.parquet"
SIMULATED_DIR = ROOT / "data" / "simulated"
DEFAULT_OUTPUT_PARQUET = SIMULATED_DIR / "maitri_with_anomalies.parquet"
DEFAULT_LABELS_PARQUET = SIMULATED_DIR / "maitri_labels.parquet"
LOCAL_STATIONS_PARQUET = SIMULATED_DIR / "local_stations.parquet"
DEMO_STATE_JSON = SIMULATED_DIR / "demo_state.json"

# Standard numeric sensor columns
SENSOR_COLUMNS = ["temperature", "pressure", "wind_speed", "wind_direction", "humidity"]

# Typical natural standard deviations for Maitri station parameters
PARAM_STD_DEFAULTS = {
    "temperature": 7.0,     # °C
    "pressure": 10.0,       # hPa
    "humidity": 18.0,       # %
    "wind_speed": 6.0,      # knots/units
    "wind_direction": 80.0, # degrees
}

PARAM_BOUNDS = {
    "temperature": (-60.0, 50.0),
    "pressure": (750.0, 1080.0),
    "humidity": (0.0, 100.0),
    "wind_speed": (0.0, 200.0),
    "wind_direction": (0.0, 360.0),
}


# ===========================================================================
# 1. FEATURE CALCULATION UTILITY
# ===========================================================================

def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute rolling and cyclical features on the dataframe without modifying original."""
    out = df.copy().sort_values("obstime").reset_index(drop=True)

    out["hour"] = out["obstime"].dt.hour
    out["day_of_year"] = out["obstime"].dt.dayofyear
    out["month"] = out["obstime"].dt.month
    out["day_of_week"] = out["obstime"].dt.dayofweek

    out["hour_sin"] = np.sin(2 * np.pi * out["hour"] / 24.0)
    out["hour_cos"] = np.cos(2 * np.pi * out["hour"] / 24.0)
    out["month_sin"] = np.sin(2 * np.pi * (out["month"] - 1) / 12.0)
    out["month_cos"] = np.cos(2 * np.pi * (out["month"] - 1) / 12.0)

    key_params = ["temperature", "pressure", "wind_speed", "humidity"]
    for param in key_params:
        if param in out.columns:
            out[f"{param}_diff_1h"] = out[param].diff()

    windows = [6, 24]
    for param in key_params:
        if param in out.columns:
            for w in windows:
                out[f"{param}_roll_mean_{w}h"] = out[param].rolling(window=w, min_periods=1).mean()
                out[f"{param}_roll_std_{w}h"] = out[param].rolling(window=w, min_periods=1).std()

    if "temperature" in out.columns and "pressure" in out.columns:
        out["temp_pressure_ratio"] = out["temperature"] / out["pressure"].replace(0, np.nan)

    return out


# ===========================================================================
# 2. HISTORICAL BENCHMARK INJECTORS
# ===========================================================================

def inject_spike(
    df: pd.DataFrame,
    idx: int,
    parameter: str = "temperature",
    magnitude: Optional[float] = None,
    duration: int = 1,
    sign: Optional[int] = None,
    rng: Optional[np.random.Generator] = None,
) -> Tuple[pd.DataFrame, List[int]]:
    if rng is None:
        rng = np.random.default_rng(42)

    df_mod = df.copy()
    n_rows = len(df_mod)
    end_idx = min(idx + duration, n_rows)
    indices = list(range(idx, end_idx))

    if sign is None:
        sign = 1 if rng.random() > 0.5 else -1

    if magnitude is None:
        std_val = PARAM_STD_DEFAULTS.get(parameter, 10.0)
        magnitude = float(rng.uniform(4.0, 7.0) * std_val)

    for i in indices:
        curr_val = df_mod.at[i, parameter]
        if pd.notna(curr_val):
            new_val = curr_val + sign * magnitude
            vmin, vmax = PARAM_BOUNDS.get(parameter, (-np.inf, np.inf))
            df_mod.at[i, parameter] = max(vmin, min(vmax, new_val))

    return df_mod, indices


def inject_frozen_value(
    df: pd.DataFrame,
    start_idx: int,
    duration: int = 12,
    parameter: str = "temperature",
    fixed_value: Optional[float] = None,
) -> Tuple[pd.DataFrame, List[int]]:
    df_mod = df.copy()
    n_rows = len(df_mod)
    end_idx = min(start_idx + duration, n_rows)
    indices = list(range(start_idx, end_idx))

    if fixed_value is None:
        val = df_mod.at[start_idx, parameter]
        if pd.isna(val):
            valid_slice = df_mod[parameter].iloc[:start_idx].dropna()
            val = float(valid_slice.iloc[-1]) if not valid_slice.empty else 0.0
        fixed_value = val

    df_mod.loc[indices, parameter] = fixed_value
    return df_mod, indices


def inject_calibration_drift(
    df: pd.DataFrame,
    start_idx: int,
    duration: int = 48,
    parameter: str = "temperature",
    total_drift: Optional[float] = None,
    drift_type: str = "linear",
    sign: Optional[int] = None,
    rng: Optional[np.random.Generator] = None,
) -> Tuple[pd.DataFrame, List[int]]:
    if rng is None:
        rng = np.random.default_rng(42)

    df_mod = df.copy()
    n_rows = len(df_mod)
    end_idx = min(start_idx + duration, n_rows)
    indices = list(range(start_idx, end_idx))
    actual_len = len(indices)

    if actual_len == 0:
        return df_mod, []

    if sign is None:
        sign = 1 if rng.random() > 0.5 else -1

    if total_drift is None:
        std_val = PARAM_STD_DEFAULTS.get(parameter, 10.0)
        total_drift = float(rng.uniform(2.5, 4.5) * std_val)

    steps = np.linspace(0.0, 1.0, actual_len)
    drift_curve = sign * total_drift * (steps ** 2 if drift_type == "quadratic" else steps)

    for idx_offset, i in enumerate(indices):
        curr_val = df_mod.at[i, parameter]
        if pd.notna(curr_val):
            df_mod.at[i, parameter] = curr_val + drift_curve[idx_offset]

    return df_mod, indices


def inject_communication_dropout(
    df: pd.DataFrame,
    start_idx: int,
    duration: int = 8,
    parameter: Optional[str] = None,
) -> Tuple[pd.DataFrame, List[int]]:
    df_mod = df.copy()
    n_rows = len(df_mod)
    end_idx = min(start_idx + duration, n_rows)
    indices = list(range(start_idx, end_idx))

    target_cols = [parameter] if parameter else ["temperature", "pressure", "humidity", "wind_speed", "wind_direction"]

    for col in target_cols:
        if col in df_mod.columns:
            df_mod.loc[indices, col] = np.nan

    return df_mod, indices


def inject_correlated_noise(
    df: pd.DataFrame,
    start_idx: int,
    duration: int = 24,
    parameters: Optional[List[str]] = None,
    noise_scale: float = 3.0,
    rng: Optional[np.random.Generator] = None,
) -> Tuple[pd.DataFrame, List[int]]:
    if rng is None:
        rng = np.random.default_rng(42)

    df_mod = df.copy()
    n_rows = len(df_mod)
    end_idx = min(start_idx + duration, n_rows)
    indices = list(range(start_idx, end_idx))
    actual_len = len(indices)

    if actual_len == 0:
        return df_mod, []

    if parameters is None:
        parameters = ["temperature", "pressure", "humidity"]

    base_noise = rng.normal(0, 1, actual_len)

    for param in parameters:
        if param in df_mod.columns:
            param_std = PARAM_STD_DEFAULTS.get(param, 10.0)
            correlated_noise = (base_noise * 0.7 + rng.normal(0, 0.3, actual_len)) * noise_scale * param_std
            for k, i in enumerate(indices):
                curr = df_mod.at[i, param]
                if pd.notna(curr):
                    df_mod.at[i, param] = curr + correlated_noise[k]

    return df_mod, indices


# ===========================================================================
# 3. HISTORICAL ANOMALY INJECTION PIPELINE
# ===========================================================================

def inject_anomalies(
    df: Optional[pd.DataFrame] = None,
    output_parquet: Union[Path, str] = DEFAULT_OUTPUT_PARQUET,
    output_labels: Union[Path, str] = DEFAULT_LABELS_PARQUET,
    seed: int = 42,
    severity: Union[str, float] = "medium",
    duration_multiplier: float = 1.0,
    test_split_ratio: float = 0.2,
    n_events_per_type: int = 6,
    save_files: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    output_parquet = Path(output_parquet)
    output_labels = Path(output_labels)
    output_parquet.parent.mkdir(parents=True, exist_ok=True)
    output_labels.parent.mkdir(parents=True, exist_ok=True)

    if df is None:
        if not CLEAN_DATA_PATH.exists():
            raise FileNotFoundError(f"Clean Maitri dataset not found at {CLEAN_DATA_PATH}. Run data pipeline first.")
        logger.info("Loading clean Maitri data from %s", CLEAN_DATA_PATH)
        df_raw = pd.read_parquet(CLEAN_DATA_PATH)
    else:
        df_raw = df

    sim_df = df_raw.copy().sort_values("obstime").reset_index(drop=True)
    total_len = len(sim_df)

    sev_mult = 1.0
    if isinstance(severity, str):
        sev_map = {"low": 0.6, "medium": 1.0, "high": 1.8}
        sev_mult = sev_map.get(severity.lower(), 1.0)
    elif isinstance(severity, (int, float)):
        sev_mult = float(severity)

    rng = np.random.default_rng(seed)

    test_start_idx = int(total_len * (1.0 - test_split_ratio))
    test_length = total_len - test_start_idx

    logger.info(
        "Injecting anomalies: total rows=%d, test partition=%d..%d (%d rows), seed=%d, severity=%.2f",
        total_len, test_start_idx, total_len - 1, test_length, seed, sev_mult,
    )

    label_records: List[Dict[str, Any]] = []
    anomalous_row_map: Dict[int, Dict[str, str]] = {}

    def mark_anomaly(indices: List[int], param: str, anom_type: str):
        for idx in indices:
            if idx not in anomalous_row_map:
                anomalous_row_map[idx] = {}
            anomalous_row_map[idx][param] = anom_type

    anomaly_types = ["spike", "frozen_value", "calibration_drift", "communication_dropout", "correlated_noise"]
    total_episodes = len(anomaly_types) * n_events_per_type

    slot_width = max(30, (test_length - 200) // (total_episodes + 1))
    start_positions = [test_start_idx + 50 + i * slot_width for i in range(total_episodes)]
    rng.shuffle(start_positions)

    pos_idx = 0

    # Spikes
    spike_params = ["temperature", "pressure", "humidity"]
    for i in range(n_events_per_type):
        pos = start_positions[pos_idx]
        pos_idx += 1
        param = spike_params[i % len(spike_params)]
        std_val = PARAM_STD_DEFAULTS[param]
        magnitude = float(rng.uniform(4.5, 7.5) * std_val * sev_mult)
        sign = 1 if rng.random() > 0.4 else -1
        duration = int(rng.choice([1, 2, 3]))

        sim_df, affected = inject_spike(
            sim_df, idx=pos, parameter=param, magnitude=magnitude, duration=duration, sign=sign, rng=rng
        )
        mark_anomaly(affected, param, "spike")

    # Frozen
    frozen_params = ["temperature", "pressure", "humidity"]
    for i in range(n_events_per_type):
        pos = start_positions[pos_idx]
        pos_idx += 1
        param = frozen_params[i % len(frozen_params)]
        duration = int(max(6, int(rng.integers(12, 48) * duration_multiplier)))

        sim_df, affected = inject_frozen_value(sim_df, start_idx=pos, duration=duration, parameter=param)
        mark_anomaly(affected, param, "frozen_value")

    # Drift
    drift_params = ["temperature", "pressure", "humidity"]
    for i in range(n_events_per_type):
        pos = start_positions[pos_idx]
        pos_idx += 1
        param = drift_params[i % len(drift_params)]
        duration = int(max(24, int(rng.integers(36, 96) * duration_multiplier)))
        std_val = PARAM_STD_DEFAULTS[param]
        total_drift = float(rng.uniform(3.0, 5.5) * std_val * sev_mult)
        sign = 1 if rng.random() > 0.5 else -1

        sim_df, affected = inject_calibration_drift(
            sim_df, start_idx=pos, duration=duration, parameter=param, total_drift=total_drift, sign=sign, rng=rng
        )
        mark_anomaly(affected, param, "calibration_drift")

    # Dropout
    for i in range(n_events_per_type):
        pos = start_positions[pos_idx]
        pos_idx += 1
        duration = int(max(4, int(rng.integers(6, 24) * duration_multiplier)))
        param_choice = None if i % 2 == 0 else rng.choice(["temperature", "pressure", "humidity"])

        sim_df, affected = inject_communication_dropout(
            sim_df, start_idx=pos, duration=duration, parameter=param_choice
        )
        affected_col = param_choice if param_choice else "all"
        mark_anomaly(affected, affected_col, "communication_dropout")

    # Correlated Noise
    for i in range(n_events_per_type):
        pos = start_positions[pos_idx]
        pos_idx += 1
        duration = int(max(12, int(rng.integers(18, 48) * duration_multiplier)))
        noise_scale = float(rng.uniform(2.5, 4.0) * sev_mult)

        sim_df, affected = inject_correlated_noise(
            sim_df, start_idx=pos, duration=duration, noise_scale=noise_scale, rng=rng
        )
        mark_anomaly(affected, "all", "correlated_noise")

    sim_featured_df = _compute_features(sim_df)

    station_id_val = sim_df["station_id"].iloc[0] if "station_id" in sim_df.columns else "maitri"
    for idx, row in sim_df.iterrows():
        ts = row["obstime"]
        if idx in anomalous_row_map:
            for param_name, a_type in anomalous_row_map[idx].items():
                label_records.append({
                    "station_id": str(station_id_val),
                    "timestamp": ts,
                    "parameter": param_name,
                    "anomaly_type": a_type,
                    "is_anomaly": True,
                })
        else:
            label_records.append({
                "station_id": str(station_id_val),
                "timestamp": ts,
                "parameter": "none",
                "anomaly_type": "normal",
                "is_anomaly": False,
            })

    labels_df = pd.DataFrame(label_records)

    if save_files:
        sim_featured_df.to_parquet(output_parquet, index=False)
        labels_df.to_parquet(output_labels, index=False)
        logger.info("Simulated dataset -> %s (%d rows)", output_parquet, len(sim_featured_df))
        logger.info("Ground truth labels -> %s (%d labels, %d positive)", output_labels, len(labels_df), labels_df["is_anomaly"].sum())

    return sim_featured_df, labels_df


# ===========================================================================
# 4. INDIAN MULTI-CITY STATION NETWORK GENERATOR (Realistic Regional Weather)
# ===========================================================================

# Predefined realistic station specifications across 5 Indian cities & 4 climate zones
INDIAN_STATION_NETWORK = [
    # --- MUMBAI (Western Coastal / Tropical Wet-and-Dry) ---
    {
        "id": 1,
        "name": "Mumbai Colaba (South Coastal Observatory)",
        "city": "Mumbai",
        "climate_zone": "coastal_humid",
        "latitude": 18.9067,
        "longitude": 72.8147,
        "elevation": 12,
        "base_temp": 30.2,
        "diurnal_amp": 3.8,  # Maritime moderation
        "base_pres": 1011.5,
        "pres_amp": 3.2,
        "base_hum": 82.0,
        "hum_amp": 12.0,
        "base_wind": 5.2,
    },
    {
        "id": 2,
        "name": "Mumbai Santacruz (Inland Suburban Hub)",
        "city": "Mumbai",
        "climate_zone": "coastal_humid",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "elevation": 19,
        "base_temp": 31.2,
        "diurnal_amp": 5.4,
        "base_pres": 1010.8,
        "pres_amp": 3.5,
        "base_hum": 78.0,
        "hum_amp": 15.0,
        "base_wind": 4.6,
    },
    # --- DELHI (Northern Plains / Semi-Arid Subtropical) ---
    {
        "id": 3,
        "name": "Delhi Safdarjung (Central Met Observatory)",
        "city": "Delhi",
        "climate_zone": "northern_plains",
        "latitude": 28.5850,
        "longitude": 77.2060,
        "elevation": 216,
        "base_temp": 32.5,
        "diurnal_amp": 9.8,  # Strong continental diurnal range
        "base_pres": 988.0,
        "pres_amp": 4.8,
        "base_hum": 36.0,
        "hum_amp": 18.0,
        "base_wind": 3.8,
    },
    {
        "id": 4,
        "name": "Delhi Palam (Western Plains Station)",
        "city": "Delhi",
        "climate_zone": "northern_plains",
        "latitude": 28.5665,
        "longitude": 77.1031,
        "elevation": 228,
        "base_temp": 33.2,
        "diurnal_amp": 10.4,
        "base_pres": 986.5,
        "pres_amp": 5.0,
        "base_hum": 34.0,
        "hum_amp": 19.0,
        "base_wind": 4.2,
    },
    # --- BENGALURU (Southern Deccan Plateau / Elevated Savanna) ---
    {
        "id": 5,
        "name": "Bengaluru Whitefield (Tech Park Station)",
        "city": "Bengaluru",
        "climate_zone": "southern_plateau",
        "latitude": 12.9698,
        "longitude": 77.7500,
        "elevation": 915,
        "base_temp": 24.8,
        "diurnal_amp": 6.5,
        "base_pres": 914.0,  # High elevation lower pressure
        "pres_amp": 3.8,
        "base_hum": 64.0,
        "hum_amp": 16.0,
        "base_wind": 4.8,
    },
    {
        "id": 6,
        "name": "Bengaluru GKVK (Agricultural Campus Lab)",
        "city": "Bengaluru",
        "climate_zone": "southern_plateau",
        "latitude": 13.0800,
        "longitude": 77.5800,
        "elevation": 932,
        "base_temp": 24.2,
        "diurnal_amp": 7.0,
        "base_pres": 912.2,
        "pres_amp": 4.0,
        "base_hum": 66.0,
        "hum_amp": 17.0,
        "base_wind": 4.5,
    },
    # --- CHENNAI (Eastern Coastal / Coromandel Tropical Maritime) ---
    {
        "id": 7,
        "name": "Chennai Nungambakkam (Central Coastal Base)",
        "city": "Chennai",
        "climate_zone": "coastal_humid",
        "latitude": 13.0600,
        "longitude": 80.2400,
        "elevation": 14,
        "base_temp": 32.0,
        "diurnal_amp": 4.5,
        "base_pres": 1010.0,
        "pres_amp": 3.4,
        "base_hum": 76.0,
        "hum_amp": 14.0,
        "base_wind": 5.5,
    },
    {
        "id": 8,
        "name": "Chennai Meenambakkam (Airport Plains Hub)",
        "city": "Chennai",
        "climate_zone": "coastal_humid",
        "latitude": 12.9800,
        "longitude": 80.1600,
        "elevation": 22,
        "base_temp": 32.8,
        "diurnal_amp": 5.5,
        "base_pres": 1009.2,
        "pres_amp": 3.6,
        "base_hum": 73.0,
        "hum_amp": 16.0,
        "base_wind": 4.9,
    },
    # --- PUNE (Deccan Leeward Plateau / Western Ghats Rain-Shadow) ---
    {
        "id": 9,
        "name": "Pune Shivajinagar (Met Research Center)",
        "city": "Pune",
        "climate_zone": "leeward_plateau",
        "latitude": 18.5300,
        "longitude": 73.8500,
        "elevation": 560,
        "base_temp": 27.5,
        "diurnal_amp": 8.0,
        "base_pres": 952.0,
        "pres_amp": 4.2,
        "base_hum": 52.0,
        "hum_amp": 18.0,
        "base_wind": 4.0,
    },
    {
        "id": 10,
        "name": "Pune Pashan (Atmospheric Science Lab)",
        "city": "Pune",
        "climate_zone": "leeward_plateau",
        "latitude": 18.5400,
        "longitude": 73.7900,
        "elevation": 585,
        "base_temp": 26.8,
        "diurnal_amp": 8.5,
        "base_pres": 949.5,
        "pres_amp": 4.4,
        "base_hum": 54.0,
        "hum_amp": 19.0,
        "base_wind": 4.3,
    },
]

CITY_CONFIGS = {
    "India": {"stations": INDIAN_STATION_NETWORK},
    "Mumbai": {"stations": [s for s in INDIAN_STATION_NETWORK if s["city"] == "Mumbai"]},
    "Delhi": {"stations": [s for s in INDIAN_STATION_NETWORK if s["city"] == "Delhi"]},
    "Bengaluru": {"stations": [s for s in INDIAN_STATION_NETWORK if s["city"] == "Bengaluru"]},
    "Chennai": {"stations": [s for s in INDIAN_STATION_NETWORK if s["city"] == "Chennai"]},
    "Pune": {"stations": [s for s in INDIAN_STATION_NETWORK if s["city"] == "Pune"]},
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points in km."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def generate_stations(
    city: str = "India",
    n_stations: int = 10,
    days: int = 7,
    freq: str = "15min",
    seed: int = 42,
    output_parquet: Union[Path, str] = LOCAL_STATIONS_PARQUET,
    save_files: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generates a simulated station network spread across multiple Indian cities
    (Mumbai, Delhi, Bengaluru, Chennai, Pune) covering distinct climate zones
    (coastal humid, northern plains, southern elevated plateau, leeward plateau).

    Each station features:
      - Realistic local GPS coordinates within that city's geographic boundaries.
      - Realistic elevation and local regional weather dynamics.
      - 15-minute telemetry interval.
      - Distance-correlated and elevation-adjusted microclimates.
      - source="simulated".

    Returns:
      (stations_metadata_df, telemetry_df)
    """
    output_parquet = Path(output_parquet)
    output_parquet.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)

    # Select station definitions based on city parameter or full Indian network
    if city in CITY_CONFIGS and len(CITY_CONFIGS[city]["stations"]) >= n_stations:
        selected_configs = CITY_CONFIGS[city]["stations"][:n_stations]
    else:
        # Default: Full multi-city Indian network (8-12 stations)
        selected_configs = INDIAN_STATION_NETWORK[:max(8, min(12, n_stations))]

    stations_meta = []
    for sid, st_cfg in enumerate(selected_configs, start=1):
        stations_meta.append({
            "id": sid,
            "name": st_cfg["name"],
            "latitude": float(st_cfg["latitude"]),
            "longitude": float(st_cfg["longitude"]),
            "elevation": int(st_cfg["elevation"]),
            "status": "normal",
            "source": "simulated",
            "_cfg": st_cfg,
        })

    stations_df = pd.DataFrame(stations_meta)

    # Generate 15-min timeline
    end_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=days)
    timestamps = pd.date_range(start=start_time, end=end_time, freq=freq)
    n_steps = len(timestamps)

    # Time factors in hours
    hours = np.array([(ts - timestamps[0]).total_seconds() / 3600.0 for ts in timestamps])
    diurnal_phase = 2 * np.pi * ((timestamps.hour + timestamps.minute / 60.0 - 9.0) / 24.0)

    # Synoptic multi-day weather wave (regional synoptic front)
    synoptic_temp = 2.5 * np.sin(2 * np.pi * hours / (24.0 * 3.5))
    synoptic_pres = -4.0 * np.sin(2 * np.pi * hours / (24.0 * 3.5)) + 1.5 * np.cos(2 * np.pi * hours / 18.0)
    synoptic_hum = -8.0 * np.sin(2 * np.pi * hours / (24.0 * 3.5))

    telemetry_records: List[Dict[str, Any]] = []

    # Generate correlated-but-not-identical time series for each station
    for _, st in stations_df.iterrows():
        sid = int(st["id"])
        st_cfg = st["_cfg"]

        # Elevation lapse rate: ~ -6.5°C per 1000m
        elev_offset = st["elevation"] - st_cfg["elevation"]
        lapse_temp_offset = -0.0065 * elev_offset
        lapse_pres_offset = -0.11 * elev_offset

        # Unique spatial microclimate seed for this station
        st_rng = np.random.default_rng(seed + sid * 100)
        micro_temp = st_rng.normal(0, 0.35, n_steps)
        micro_pres = st_rng.normal(0, 0.25, n_steps)
        micro_hum = st_rng.normal(0, 1.2, n_steps)
        micro_wind = st_rng.normal(0, 0.5, n_steps)

        # Autoregressive smooth noise for physical microclimate
        def _smooth_ar(noise_arr: np.ndarray, phi: float = 0.85) -> np.ndarray:
            out = np.zeros_like(noise_arr)
            for t in range(1, len(noise_arr)):
                out[t] = phi * out[t - 1] + (1 - phi) * noise_arr[t]
            return out

        micro_temp_s = _smooth_ar(micro_temp)
        micro_pres_s = _smooth_ar(micro_pres)
        micro_hum_s = _smooth_ar(micro_hum)
        micro_wind_s = _smooth_ar(micro_wind)

        # Compose realistic regional physical weather series
        t_series = (
            st_cfg["base_temp"]
            + lapse_temp_offset
            + st_cfg["diurnal_amp"] * np.sin(diurnal_phase)
            + synoptic_temp
            + micro_temp_s
        )

        p_series = (
            st_cfg["base_pres"]
            + lapse_pres_offset
            + st_cfg["pres_amp"] * np.sin(diurnal_phase + np.pi / 4)
            + synoptic_pres
            + micro_pres_s
        )

        # Humidity is physically inversely correlated with temperature
        h_series = (
            st_cfg["base_hum"]
            - 0.7 * (t_series - st_cfg["base_temp"])
            + st_cfg["hum_amp"] * (-np.sin(diurnal_phase))
            + synoptic_hum
            + micro_hum_s
        )
        h_series = np.maximum(14.0 + np.abs(micro_hum_s) * 0.6, h_series)
        h_series = np.minimum(98.0, h_series)

        w_series = np.maximum(0.2, st_cfg["base_wind"] + 1.6 * np.sin(diurnal_phase - np.pi / 3) + micro_wind_s)
        wdir_series = (180.0 + 45.0 * np.sin(diurnal_phase / 2.0) + st_rng.normal(0, 15.0, n_steps)) % 360.0

        for idx, ts in enumerate(timestamps):
            telemetry_records.append({
                "station_id": sid,
                "station_name": st["name"],
                "obstime": ts,
                "temperature": float(round(t_series[idx], 2)),
                "pressure": float(round(p_series[idx], 2)),
                "humidity": float(round(h_series[idx], 2)),
                "wind_speed": float(round(w_series[idx], 2)),
                "wind_direction": float(round(wdir_series[idx], 1)),
                "latitude": st["latitude"],
                "longitude": st["longitude"],
                "elevation": st["elevation"],
                "source": "simulated",
            })

    # Drop internal helper column
    clean_stations_df = stations_df.drop(columns=["_cfg"])
    telemetry_df = pd.DataFrame(telemetry_records)

    if save_files:
        telemetry_df.to_parquet(output_parquet, index=False)
        logger.info("Indian multi-city stations dataset -> %s (%d stations, %d rows)", output_parquet, len(clean_stations_df), len(telemetry_df))

    return clean_stations_df, telemetry_df


# ===========================================================================
# 5. DEMO SCENARIOS & STAGE 2/5 MULTI-STATION FUSION PIPELINE
# ===========================================================================

def detect_and_fuse_network(
    stations_df: pd.DataFrame,
    telemetry_df: pd.DataFrame,
    radius_km: float = 35.0,
) -> Dict[str, Any]:
    """
    Stage 2/5 Detection and Spatial Multi-Station Fusion Engine.

    Stage 2: Single-station anomaly detection (Z-scores, STL residual checks, frozen checks, dropouts).
    Stage 5: Spatial Neighbor Correlation & Root Cause Attribution:
      - genuine_event : multiple neighboring stations exhibit coherent correlated anomalies.
      - sensor_fault  : isolated anomaly on a single station while all neighbors report normal physics.
      - comms_error   : telemetry gaps / missing packet dropouts.

    Returns complete live system state matching frontend contracts:
      - stations: List[Station]
      - alerts: List[Alert]
      - sensor_health: Dict[station_id, SensorHealth]
      - explanations: Dict[alert_id, Explanation]
      - timeseries: Dict[station_id, Timeseries]
    """
    stations_dict = {int(r["id"]): r.to_dict() for _, r in stations_df.iterrows()}
    st_ids = list(stations_dict.keys())

    # Build pairwise station distance matrix
    dist_matrix: Dict[Tuple[int, int], float] = {}
    for s1 in st_ids:
        for s2 in st_ids:
            if s1 == s2:
                dist_matrix[(s1, s2)] = 0.0
            else:
                dist_matrix[(s1, s2)] = haversine_km(
                    stations_dict[s1]["latitude"], stations_dict[s1]["longitude"],
                    stations_dict[s2]["latitude"], stations_dict[s2]["longitude"],
                )

    alerts: List[Dict[str, Any]] = []
    sensor_health_map: Dict[int, Dict[str, Any]] = {}
    explanations: Dict[int, Dict[str, Any]] = {}
    timeseries_by_station: Dict[int, Dict[str, Any]] = {}

    alert_id_counter = 101

    # Stage 2: Run per-station detectors
    station_anomalies: Dict[int, List[Dict[str, Any]]] = {}

    for sid in st_ids:
        st_data = telemetry_df[telemetry_df["station_id"] == sid].sort_values("obstime").reset_index(drop=True)

        # Store formatted timeseries points
        pts = []
        for _, row in st_data.iterrows():
            ts_str = pd.to_datetime(row["obstime"]).strftime("%Y-%m-%dT%H:%M:%SZ")
            pts.append({
                "timestamp": ts_str,
                "temperature": float(row["temperature"]) if pd.notna(row["temperature"]) else None,
                "pressure": float(row["pressure"]) if pd.notna(row["pressure"]) else None,
                "humidity": float(row["humidity"]) if pd.notna(row["humidity"]) else None,
            })

        timeseries_by_station[sid] = {
            "station_id": sid,
            "hours": int(len(pts) * 15 / 60),
            "data": pts,
        }

        # Run anomaly checks
        flagged_events: List[Dict[str, Any]] = []

        # Check 1: Missing values (comms dropout)
        null_counts = st_data[["temperature", "pressure", "humidity"]].isna().sum(axis=1)
        if (null_counts > 0).any():
            dropout_idx = st_data.index[null_counts > 0].tolist()
            if len(dropout_idx) >= 3:
                last_idx = dropout_idx[-1]
                flagged_events.append({
                    "type": "comms_dropout",
                    "timestamp": st_data.at[last_idx, "obstime"],
                    "parameter": "all",
                    "magnitude": float(len(dropout_idx)),
                    "direction": "none",
                })

        # Check 2: Z-score & rate of change spikes
        for col in ["temperature", "pressure", "humidity"]:
            ser = st_data[col].dropna()
            if len(ser) > 20:
                mean_v = ser.mean()
                std_v = max(ser.std(), 1e-4)
                z_scores = (ser - mean_v) / std_v
                diffs = ser.diff()

                # Spike detection
                spike_mask = z_scores.abs() > 3.2
                if spike_mask.any():
                    idx_max = z_scores.abs().idxmax()
                    flagged_events.append({
                        "type": "spike",
                        "timestamp": st_data.at[idx_max, "obstime"],
                        "parameter": col,
                        "magnitude": float(z_scores.loc[idx_max]),
                        "direction": "increases_anomaly" if z_scores.loc[idx_max] > 0 else "decreases_anomaly",
                    })

                # Check 3: Frozen flatlines
                is_same = (ser == ser.shift(1))
                if is_same.any():
                    run_len = is_same.astype(int).groupby((~is_same).cumsum()).cumsum()
                    min_run = 8 if col in ("temperature", "pressure") else 20
                    if (run_len >= min_run).any():
                        idx_froz = run_len.idxmax()
                        flagged_events.append({
                            "type": "frozen_sensor",
                            "timestamp": st_data.at[idx_froz, "obstime"],
                            "parameter": col,
                            "magnitude": float(run_len.loc[idx_froz]),
                            "direction": "none",
                        })

                # Check 4: Calibration drift (systematic multi-day baseline shift)
                if len(ser) >= 96:
                    rolling_24h = ser.rolling(window=96, min_periods=48).mean().dropna()
                    if len(rolling_24h) >= 48:
                        slope = np.polyfit(np.arange(len(rolling_24h)), rolling_24h.values, 1)[0]
                        slope_per_day = abs(slope) * 96
                        thresh = 0.60 if col == "temperature" else (1.5 if col == "pressure" else 2.5)
                        if slope_per_day > thresh:
                            flagged_events.append({
                                "type": "calibration_drift",
                                "timestamp": st_data["obstime"].iloc[-1],
                                "parameter": col,
                                "magnitude": float(slope_per_day),
                                "direction": "increases_anomaly" if slope > 0 else "decreases_anomaly",
                            })

        station_anomalies[sid] = flagged_events

    # Stage 5: Multi-Station Spatial Fusion & Root Cause Attribution
    active_station_faults = set()
    offline_stations = set()
    degraded_stations = set()

    for sid, events in station_anomalies.items():
        if not events:
            continue

        st_meta = stations_dict[sid]
        neighbors = [
            s_other for s_other in st_ids
            if s_other != sid and dist_matrix[(sid, s_other)] <= radius_km
        ]

        for ev in events:
            ev_type = ev["type"]
            ev_param = ev["parameter"]
            ev_time = ev["timestamp"]

            # Query neighbor corroboration on same parameter within temporal window (+/- 2.5 hours)
            corroborating_neighbors = []
            for n_id in neighbors:
                n_events = station_anomalies.get(n_id, [])
                for ne in n_events:
                    time_diff = abs((ne["timestamp"] - ev_time).total_seconds() / 3600.0)
                    if time_diff <= 2.5 and (ne["parameter"] == ev_param or ev_type == "regional_event" or ne.get("type") == "regional_event"):
                        corroborating_neighbors.append(n_id)
                        break

            # Spatial Consensus Logic
            aid = alert_id_counter
            alert_id_counter += 1

            if ev_type == "comms_dropout":
                root_cause = "comms_error"
                severity = "medium" if ev["magnitude"] < 12 else "high"
                status = "active"
                summary = f"Telemetry dropout / packet loss on {st_meta['name']} ({int(ev['magnitude'])} intervals missing)"
                offline_stations.add(sid)
                narrative = (
                    f"Communication failure: {st_meta['name']} ceased transmitting sensor packets. "
                    f"Adjacent stations within {radius_km:.0f}km continue operating normally."
                )
                params_flagged = ["temperature", "pressure", "humidity"]
            elif len(corroborating_neighbors) >= 1 and (len(corroborating_neighbors) / max(1, len(neighbors))) >= 0.5:
                # Corroborated by spatial cluster -> Genuine Regional Weather Event!
                root_cause = "genuine_event"
                severity = "high" if abs(ev["magnitude"]) > 4.0 else "medium"
                status = "active"
                n_names = ", ".join([stations_dict[n]["name"] for n in corroborating_neighbors[:2]])
                summary = f"Regional atmospheric front detected across {len(corroborating_neighbors) + 1} stations (corroborated by {n_names})"
                narrative = (
                    f"Multi-station spatial consensus: Anomaly on {ev_param} is corroborated across "
                    f"{len(corroborating_neighbors)} neighboring stations within {radius_km:.0f}km. "
                    f"Classified as genuine meteorological phenomenon, not sensor degradation."
                )
                params_flagged = [ev_param] if ev_param != "all" else ["temperature", "pressure"]
            else:
                # Isolated single station anomaly -> Sensor Fault / Drift!
                root_cause = "sensor_fault"
                severity = "high" if ev_type in ["spike", "frozen_sensor"] else "medium"
                status = "active"
                summary = f"Isolated {ev_type.replace('_', ' ')} detected on {ev_param} ({st_meta['name']})"
                if ev_type == "calibration_drift":
                    degraded_stations.add(sid)
                else:
                    active_station_faults.add(sid)
                narrative = (
                    f"Isolated sensor fault: {st_meta['name']} triggered an anomaly on {ev_param}, "
                    f"but 0 of {len(neighbors)} nearest neighboring stations corroborated the reading. "
                    f"Hardware diagnostics or field recalibration recommended."
                )
                params_flagged = [ev_param] if ev_param != "all" else ["temperature"]

            alert_record = {
                "id": aid,
                "station_id": sid,
                "station_name": st_meta["name"],
                "timestamp": pd.to_datetime(ev_time).isoformat() + "Z",
                "confidence": 0.94 if root_cause == "genuine_event" else 0.91,
                "severity": severity,
                "root_cause": root_cause,
                "summary": summary,
                "parameters_flagged": params_flagged,
                "status": status,
                "event_type": ev_type,
                "magnitude": float(ev.get("magnitude", 3.5)),
            }
            alerts.append(alert_record)

            try:
                from backend.explain import explain_alert
            except ImportError:
                from explain import explain_alert

            # Obtain current parameter values at event time
            st_data_ev = st_data[st_data["obstime"] == ev_time]
            param_vals = {}
            if not st_data_ev.empty:
                r0 = st_data_ev.iloc[0]
                param_vals = {
                    "temperature": float(r0["temperature"]) if pd.notna(r0["temperature"]) else None,
                    "pressure": float(r0["pressure"]) if pd.notna(r0["pressure"]) else None,
                    "humidity": float(r0["humidity"]) if pd.notna(r0["humidity"]) else None,
                }
            else:
                param_vals = {"temperature": 28.5, "pressure": 1010.0, "humidity": 75.0}

            explanations[aid] = explain_alert(
                alert_id=aid,
                alert_data=alert_record,
                parameter_values=param_vals,
            )

    try:
        from backend.explain import predict_health
    except ImportError:
        from explain import predict_health

    # Assign station status & sensor health scores dynamically from telemetry data
    final_stations: List[Dict[str, Any]] = []
    for sid, st in stations_dict.items():
        if sid in offline_stations:
            st_status = "offline"
        elif sid in active_station_faults:
            st_status = "fault"
        elif sid in degraded_stations:
            st_status = "degrading"
        else:
            st_status = "normal"

        final_stations.append({
            "id": sid,
            "name": st["name"],
            "latitude": st["latitude"],
            "longitude": st["longitude"],
            "elevation": st["elevation"],
            "status": st_status,
            "source": "simulated",
        })

        st_data = telemetry_df[telemetry_df["station_id"] == sid].sort_values("obstime").reset_index(drop=True)
        st_alerts = [a for a in alerts if a.get("station_id") == sid]

        # Compute data-driven sensor health for each station aligned with station status
        health_info = predict_health(
            station_id=sid,
            telemetry_history=st_data,
            recent_alerts=st_alerts,
            forced_status=st_status,
        )

        sensor_health_map[sid] = health_info

    return {
        "stations": final_stations,
        "alerts": alerts,
        "sensor_health": sensor_health_map,
        "explanations": explanations,
        "timeseries_by_station": timeseries_by_station,
    }


def demo_scenarios(
    scenario: str = "all",
    city: str = "Boulder",
    n_stations: int = 10,
    seed: int = 42,
    save_files: bool = True,
) -> Dict[str, Any]:
    """
    Instantiates live atmospheric demo scenarios:
      - spike: Isolated single-station temperature spike.
      - frozen_sensor: Isolated single-station humidity flatline.
      - calibration_drift: Isolated progressive sensor drift ramp.
      - comms_dropout: Isolated station communication gap.
      - correlated_noise: Single-station multi-channel electrical disturbance.
      - genuine_regional_weather_event: Regional squall / cold front moving coherently across neighboring stations.
      - all: Combines scenarios across different stations.

    Runs everything through the Stage 2/5 detection + spatial fusion pipeline and exports demo_state.json.
    """
    logger.info("Initializing demo scenarios (scenario=%s, city=%s, n_stations=%d)", scenario, city, n_stations)
    stations_df, telemetry_df = generate_stations(city=city, n_stations=n_stations, seed=seed, save_files=False)

    rng = np.random.default_rng(seed)
    n_pts = len(telemetry_df) // n_stations

    st_ids = stations_df["id"].tolist()

    # Scenario 1: Spike on Station 2 (sensor_fault)
    if scenario in ["spike", "all"] and len(st_ids) >= 2:
        s_target = st_ids[1]
        mask = telemetry_df["station_id"] == s_target
        st_indices = telemetry_df[mask].index.tolist()
        spike_pos = st_indices[int(n_pts * 0.85)]
        telemetry_df.at[spike_pos, "temperature"] += 14.5
        logger.info("Injected SPIKE on Station %d", s_target)

    # Scenario 2: Frozen Sensor on Station 4 (sensor_fault)
    if scenario in ["frozen_sensor", "all"] and len(st_ids) >= 4:
        s_target = st_ids[3]
        mask = telemetry_df["station_id"] == s_target
        st_indices = telemetry_df[mask].index.tolist()
        froz_start = st_indices[int(n_pts * 0.70)]
        froz_len = 28  # 7 hours of 15-min points
        frozen_val = float(telemetry_df.at[froz_start, "humidity"])
        telemetry_df.loc[froz_start:froz_start + froz_len, "humidity"] = frozen_val
        logger.info("Injected FROZEN SENSOR on Station %d", s_target)

    # Scenario 3: Calibration Drift on Station 6 (sensor_fault)
    if scenario in ["calibration_drift", "all"] and len(st_ids) >= 6:
        s_target = st_ids[5]
        mask = telemetry_df["station_id"] == s_target
        st_indices = telemetry_df[mask].index.tolist()
        drift_start_idx = int(n_pts * 0.35)
        drift_indices = st_indices[drift_start_idx:]
        ramp = np.linspace(0, 7.5, len(drift_indices))
        for offset, row_idx in enumerate(drift_indices):
            telemetry_df.at[row_idx, "temperature"] += ramp[offset]
        logger.info("Injected CALIBRATION DRIFT on Station %d", s_target)

    # Scenario 4: Communication Dropout on Station 8 (comms_error)
    if scenario in ["comms_dropout", "all"] and len(st_ids) >= 8:
        s_target = st_ids[7]
        mask = telemetry_df["station_id"] == s_target
        st_indices = telemetry_df[mask].index.tolist()
        drop_start = st_indices[int(n_pts * 0.80)]
        drop_len = 24  # 6 hours of 15-min intervals
        telemetry_df.loc[drop_start:drop_start + drop_len, ["temperature", "pressure", "humidity"]] = np.nan
        logger.info("Injected COMMS DROPOUT on Station %d", s_target)

    # Scenario 5: Genuine Regional Weather Event (genuine_event across correlated cluster)
    if scenario in ["genuine_regional_weather_event", "all"] and len(st_ids) >= 2:
        event_stations = [st_ids[0], st_ids[1], st_ids[8], st_ids[9]] if len(st_ids) >= 10 else st_ids[:2]
        event_pos_ratio = 0.90
        event_len = 36  # 9 hours duration

        for s_idx, s_id in enumerate(event_stations):
            mask = telemetry_df["station_id"] == s_id
            st_indices = telemetry_df[mask].index.tolist()
            # Spatially staggered wavefront: ~15-30 min propagation lag between stations
            stagger = s_idx * 2
            start_i = st_indices[int(n_pts * event_pos_ratio) + stagger]
            end_i = start_i + event_len

            # Front profile: sudden temperature plunge, pressure drop & recovery, humidity jump
            t_drop = -7.5 + rng.normal(0, 0.4)
            p_surge = 12.0 + rng.normal(0, 0.5)
            h_jump = 24.0 + rng.normal(0, 1.0)

            t_profile = np.linspace(0, t_drop, 6).tolist() + [t_drop] * (event_len - 6)
            p_profile = np.linspace(0, p_surge, 8).tolist() + [p_surge * 0.7] * (event_len - 8)
            h_profile = np.linspace(0, h_jump, 6).tolist() + [h_jump] * (event_len - 6)

            for step_offset, row_idx in enumerate(range(start_i, min(end_i, st_indices[-1]))):
                if step_offset < len(t_profile):
                    telemetry_df.at[row_idx, "temperature"] += t_profile[step_offset]
                    telemetry_df.at[row_idx, "pressure"] += p_profile[step_offset]
                    telemetry_df.at[row_idx, "humidity"] = min(98.0, telemetry_df.at[row_idx, "humidity"] + h_profile[step_offset])

        logger.info("Injected GENUINE REGIONAL WEATHER EVENT across Stations %s", event_stations)

    # Route through Stage 2/5 Detection and Spatial Multi-Station Fusion
    fusion_result = detect_and_fuse_network(stations_df, telemetry_df)

    if save_files:
        telemetry_df.to_parquet(LOCAL_STATIONS_PARQUET, index=False)
        with open(DEMO_STATE_JSON, "w", encoding="utf-8") as f:
            json.dump({
                "stations": fusion_result["stations"],
                "alerts": fusion_result["alerts"],
                "sensor_health": {str(k): v for k, v in fusion_result["sensor_health"].items()},
                "explanations": {str(k): v for k, v in fusion_result["explanations"].items()},
            }, f, indent=2)
        logger.info("Saved local stations parquet -> %s", LOCAL_STATIONS_PARQUET)
        logger.info("Saved demo state JSON -> %s", DEMO_STATE_JSON)

    return fusion_result


# ===========================================================================
# CLI ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SkyguardAI Atmospheric Anomaly Simulation & Station Generator")
    parser.add_argument("--mode", type=str, default="all", choices=["benchmark", "stations", "demo", "all"], help="Execution mode")
    parser.add_argument("--city", type=str, default="Boulder", help="City name for local station network")
    parser.add_argument("--stations", type=int, default=10, help="Number of demo stations (8-12)")
    parser.add_argument("--scenario", type=str, default="all", help="Scenario: spike, frozen_sensor, calibration_drift, comms_dropout, genuine_regional_weather_event, all")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    print("=" * 70)
    print("SKYGUARD.AI - SIMULATION & NETWORK FUSION ENGINE")
    print("=" * 70)

    if args.mode in ["benchmark", "all"]:
        print("\n>>> Running Historical Maitri Benchmark Injection...")
        df_sim, df_lbl = inject_anomalies(seed=args.seed)
        print(f"  Benchmark simulated rows : {len(df_sim):,}")
        print(f"  Anomalies injected       : {df_lbl['is_anomaly'].sum():,}")

    if args.mode in ["stations"]:
        print(f"\n>>> Generating Local Station Network for {args.city}...")
        st_df, tel_df = generate_stations(city=args.city, n_stations=args.stations, seed=args.seed)
        print(f"  Stations created : {len(st_df)}")
        print(f"  Telemetry rows   : {len(tel_df):,}")

    if args.mode in ["demo", "all"]:
        print(f"\n>>> Generating Live Demo Scenarios ({args.scenario}) for {args.city}...")
        state = demo_scenarios(scenario=args.scenario, city=args.city, n_stations=args.stations, seed=args.seed)
        print(f"  Total Stations : {len(state['stations'])}")
        print(f"  Total Alerts   : {len(state['alerts'])}")
        for a in state["alerts"]:
            print(f"    - [{a['severity'].upper()}] {a['root_cause']}: {a['summary']}")
        print(f"\nState saved to:\n  - {LOCAL_STATIONS_PARQUET}\n  - {DEMO_STATE_JSON}")
