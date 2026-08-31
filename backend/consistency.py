"""
backend/consistency.py
======================
Spatial, Temporal, and Multivariate Mahalanobis Consistency Engine.

Core Functions:
  1. consistency_score()  - Computes spatial neighbor consistency, temporal rate-of-change,
                            and multivariate Mahalanobis distance using neighbor metadata,
                            synchronized observations, and missing-data handling.
                            Distinguishes local single-sensor anomalies from coherent regional events.
  2. fuse_and_classify()  - Combines Statistical, LSTM, Isolation Forest, and Consistency scores
                            with configurable weights. Serializes Alerts adhering strictly to the contract:
                            - id, station_id, station_name, timestamp, confidence, severity,
                              root_cause, summary, parameters_flagged, status
                            - Enums strictly:
                              * severity: low | medium | high
                              * root_cause: sensor_fault | comms_error | genuine_event | unknown
                              * status: active | acknowledged | resolved
                              * parameters_flagged: temperature | pressure | humidity
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy.spatial.distance import mahalanobis

try:
    from backend.config import AlertStatus, Parameter, RootCause, Severity
except ImportError:
    from config import AlertStatus, Parameter, RootCause, Severity

logger = logging.getLogger("skyguard.consistency")

# Standard physical parameters
CORE_PARAMETERS = [Parameter.temperature.value, Parameter.pressure.value, Parameter.humidity.value]

# Baseline standard deviations and typical covariance for temperate/mid-latitude weather
DEFAULT_PARAM_STD = {
    "temperature": 5.0,  # °C
    "pressure": 6.0,     # hPa
    "humidity": 15.0,    # %
}

# Elevation lapse rates for spatial height normalization
LAPSE_RATES = {
    "temperature": -0.0065,  # °C per meter
    "pressure": -0.11,       # hPa per meter
    "humidity": 0.0,
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute the great-circle distance between two GPS coordinates in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


# ===========================================================================
# 1. CONSISTENCY SCORING ENGINE
# ===========================================================================

def compute_mahalanobis_distance(
    vec: np.ndarray,
    mean_vec: np.ndarray,
    inv_cov: np.ndarray,
) -> float:
    """
    Computes multivariate Mahalanobis distance for [temperature, pressure, humidity].
    Gracefully handles partial / missing features by slicing sub-matrices.
    """
    valid_mask = ~np.isnan(vec)
    if not np.any(valid_mask):
        return 0.0

    valid_indices = np.where(valid_mask)[0]
    if len(valid_indices) == len(vec):
        try:
            diff = vec - mean_vec
            return float(np.sqrt(np.dot(np.dot(diff, inv_cov), diff)))
        except Exception:
            return 0.0

    # Sub-matrix for available features
    sub_vec = vec[valid_indices]
    sub_mean = mean_vec[valid_indices]
    sub_diff = sub_vec - sub_mean

    # Regularized inverse on sub-covariance
    try:
        cov = np.linalg.pinv(inv_cov)
        sub_cov = cov[np.ix_(valid_indices, valid_indices)]
        sub_inv = np.linalg.pinv(sub_cov + np.eye(len(valid_indices)) * 1e-4)
        return float(np.sqrt(np.dot(np.dot(sub_diff, sub_inv), sub_diff)))
    except Exception:
        return 0.0


def consistency_score(
    telemetry_df: pd.DataFrame,
    stations_meta: Union[pd.DataFrame, List[Dict[str, Any]]],
    target_station_id: Optional[int] = None,
    target_timestamp: Optional[Union[datetime, str, pd.Timestamp]] = None,
    max_radius_km: float = 30.0,
    length_scale_km: float = 12.0,
    mean_vector: Optional[np.ndarray] = None,
    inv_covariance: Optional[np.ndarray] = None,
) -> Union[Dict[str, Any], pd.DataFrame]:
    """
    Computes spatial consistency, temporal continuity, and multivariate Mahalanobis distance
    across synchronized multi-station observations with robust missing-data handling.

    Differentiates:
      - Local Sensor Fault : target station deviates sharply from spatial neighbor expectation.
      - Coherent Regional Event : multiple neighboring stations exhibit synchronized physical movement.

    Returns:
      If target_station_id and target_timestamp are provided:
        Dictionary: {"score": float, "flags": List[str], "reason": str, "details": Dict}
      Else:
        DataFrame with consistency metrics per station-timestamp.
    """
    if isinstance(stations_meta, list):
        st_meta_df = pd.DataFrame(stations_meta)
    else:
        st_meta_df = stations_meta.copy()

    st_dict = {int(r["id"]): r.to_dict() for _, r in st_meta_df.iterrows()}
    all_station_ids = list(st_dict.keys())

    # Build pairwise station distance cache
    dist_cache: Dict[Tuple[int, int], float] = {}
    for s1 in all_station_ids:
        for s2 in all_station_ids:
            if s1 == s2:
                dist_cache[(s1, s2)] = 0.0
            else:
                dist_cache[(s1, s2)] = haversine_km(
                    st_dict[s1]["latitude"], st_dict[s1]["longitude"],
                    st_dict[s2]["latitude"], st_dict[s2]["longitude"],
                )

    # Clean & normalize timestamps
    df = telemetry_df.copy()
    ts_col = "obstime" if "obstime" in df.columns else ("timestamp" if "timestamp" in df.columns else None)
    if ts_col is None:
        raise ValueError("Telemetry DataFrame must contain 'obstime' or 'timestamp' column.")

    df["_ts"] = pd.to_datetime(df[ts_col])
    df["station_id"] = df["station_id"].astype(int)

    # Initialize default multivariate statistics if not supplied
    if mean_vector is None:
        mean_vector = np.array([
            df["temperature"].dropna().mean() if "temperature" in df.columns and not df["temperature"].dropna().empty else 18.0,
            df["pressure"].dropna().mean() if "pressure" in df.columns and not df["pressure"].dropna().empty else 900.0,
            df["humidity"].dropna().mean() if "humidity" in df.columns and not df["humidity"].dropna().empty else 50.0,
        ], dtype=float)

    if inv_covariance is None:
        try:
            cov = df[["temperature", "pressure", "humidity"]].dropna().cov().values
            inv_covariance = np.linalg.pinv(cov + np.eye(3) * 1e-4)
        except Exception:
            # Diagonal fallback
            variances = [DEFAULT_PARAM_STD["temperature"]**2, DEFAULT_PARAM_STD["pressure"]**2, DEFAULT_PARAM_STD["humidity"]**2]
            inv_covariance = np.diag(1.0 / np.array(variances))

    def _evaluate_single(sid: int, ts_val: pd.Timestamp) -> Dict[str, Any]:
        """Evaluate consistency for one station at one timestamp."""
        st = st_dict.get(sid)
        if not st:
            return {"score": 0.0, "flags": [], "reason": "Station not found in metadata", "details": {}}

        # Target station record
        target_rows = df[(df["station_id"] == sid) & (df["_ts"] == ts_val)]
        if target_rows.empty:
            return {
                "score": 0.85,
                "flags": ["missing_observation", "comms_dropout"],
                "reason": "No synchronized observation packet found at timestamp",
                "details": {"is_dropout": True},
            }

        t_row = target_rows.iloc[0]
        t_temp = t_row.get("temperature", np.nan)
        t_pres = t_row.get("pressure", np.nan)
        t_hum = t_row.get("humidity", np.nan)

        # 1. Missing data check
        if pd.isna(t_temp) and pd.isna(t_pres) and pd.isna(t_hum):
            return {
                "score": 0.90,
                "flags": ["comms_dropout", "missing_data"],
                "reason": "Complete telemetry blackout across all parameter channels",
                "details": {"is_dropout": True},
            }

        flags = []
        reasons = []

        # 2. Multivariate Mahalanobis check
        obs_vec = np.array([t_temp, t_pres, t_hum], dtype=float)
        m_dist = compute_mahalanobis_distance(obs_vec, mean_vector, inv_covariance)
        # 3 degrees of freedom: 99th percentile of chi-square is ~11.3, sqrt(11.3) ~ 3.37
        mahalanobis_score = float(np.clip(m_dist / 4.0, 0.0, 1.0))
        if m_dist > 3.5:
            flags.append("multivariate_outlier")
            reasons.append(f"Unphysical multivariate parameter combination (Mahalanobis distance={m_dist:.2f})")

        # 3. Spatial Neighbor Consistency
        neighbors = [
            s for s in all_station_ids
            if s != sid and dist_cache.get((sid, s), 999.0) <= max_radius_km
        ]

        spatial_residuals: Dict[str, float] = {}
        spatial_inconsistency_score = 0.0
        is_coherent_regional_event = False
        neighbor_anom_count = 0

        if neighbors:
            # Query neighbor observations at exact timestamp
            neighbor_obs = df[(df["station_id"].isin(neighbors)) & (df["_ts"] == ts_val)]

            if not neighbor_obs.empty:
                # Compute inverse-distance Gaussian kernel weights
                weights_dict = {}
                for n_id in neighbors:
                    d_km = dist_cache.get((sid, n_id), 10.0)
                    w = math.exp(-(d_km ** 2) / (2.0 * (length_scale_km ** 2)))
                    weights_dict[n_id] = w

                total_w = sum(weights_dict.values())
                norm_weights = {k: v / max(total_w, 1e-6) for k, v in weights_dict.items()}

                # Expected spatial values with elevation lapse rate correction
                for param_name, col in [("temperature", "temperature"), ("pressure", "pressure"), ("humidity", "humidity")]:
                    target_val = t_row.get(col, np.nan)
                    if pd.isna(target_val):
                        continue

                    lapse = LAPSE_RATES[param_name]
                    weighted_sum = 0.0
                    weight_acc = 0.0
                    neighbor_deviations = []

                    for _, n_row in neighbor_obs.iterrows():
                        n_id = int(n_row["station_id"])
                        n_val = n_row.get(col, np.nan)
                        if pd.notna(n_val):
                            w = norm_weights.get(n_id, 0.0)
                            # Elev correction from neighbor to target station
                            elev_diff = st["elevation"] - st_dict[n_id]["elevation"]
                            n_corr_val = n_val + lapse * elev_diff
                            weighted_sum += w * n_corr_val
                            weight_acc += w

                            # Track neighbor deviation from their own mean
                            n_mean = mean_vector[CORE_PARAMETERS.index(param_name)]
                            neighbor_deviations.append(abs(n_val - n_mean))

                    if weight_acc > 0:
                        spatial_expectation = weighted_sum / weight_acc
                        spatial_diff = abs(target_val - spatial_expectation)
                        std_param = DEFAULT_PARAM_STD[param_name]
                        z_spatial = spatial_diff / std_param
                        spatial_residuals[param_name] = spatial_diff

                        # Check if neighbors also experienced strong shifts from baseline
                        if neighbor_deviations and np.mean(neighbor_deviations) >= 1.2 * std_param:
                            neighbor_anom_count += 1

                        if z_spatial > 3.0:
                            flags.append(f"spatial_outlier_{param_name}")
                            reasons.append(
                                f"Station reading on {param_name} ({target_val:.1f}) disagrees with "
                                f"{len(neighbor_obs)} neighbors (spatial expectation: {spatial_expectation:.1f})"
                            )

                if spatial_residuals:
                    max_spatial_z = max(
                        spatial_residuals.get(p, 0.0) / DEFAULT_PARAM_STD[p] for p in spatial_residuals
                    )
                    spatial_inconsistency_score = float(np.clip(max_spatial_z / 4.0, 0.0, 1.0))

                # Coherent regional event: neighbors and target station moved together (low spatial residual, high neighbor deviation)
                if neighbor_anom_count >= 1 and spatial_inconsistency_score < 0.40:
                    is_coherent_regional_event = True
                    flags.append("coherent_regional_movement")
                    reasons.append("Coherent physical anomaly corroborated across multiple neighboring stations")

        # 4. Temporal Consistency (Rate of change against previous step)
        st_history = df[(df["station_id"] == sid) & (df["_ts"] < ts_val)].sort_values("_ts")
        temporal_score = 0.0
        is_frozen = False

        if len(st_history) >= 1:
            prev_row = st_history.iloc[-1]
            dt_minutes = max(1.0, (ts_val - prev_row["_ts"]).total_seconds() / 60.0)

            # Check rates of change
            if pd.notna(t_temp) and pd.notna(prev_row.get("temperature")):
                temp_rate = abs(t_temp - prev_row["temperature"]) / (dt_minutes / 15.0)
                if temp_rate > 8.0:
                    flags.append("temporal_step_jump_temperature")
                    reasons.append(f"Instantaneous temperature jump of {abs(t_temp - prev_row['temperature']):.1f}°C in {int(dt_minutes)}m")
                    temporal_score = max(temporal_score, 0.8)

            # Check frozen streak
            if len(st_history) >= 7 and pd.notna(t_temp):
                last_vals = st_history["temperature"].tail(7).dropna().tolist() + [t_temp]
                if len(last_vals) >= 8 and len(set([round(v, 2) for v in last_vals])) == 1:
                    is_frozen = True
                    flags.append("frozen_value")
                    reasons.append(f"Sensor value frozen identically at {t_temp:.2f} for >= 8 consecutive observations")
                    temporal_score = max(temporal_score, 0.95)

        # Composite consistency anomaly score (0.0 = completely consistent/normal, 1.0 = highly inconsistent/anomalous)
        if is_coherent_regional_event:
            # Regional events are physically consistent across stations, though meteorologically intense
            consistency_anomaly = float(np.clip(0.35 * spatial_inconsistency_score + 0.35 * mahalanobis_score, 0.0, 0.55))
        else:
            consistency_anomaly = float(np.clip(
                0.45 * spatial_inconsistency_score + 0.30 * temporal_score + 0.25 * mahalanobis_score,
                0.0, 1.0,
            ))

        primary_reason = "; ".join(reasons) if reasons else "Observations consistent with regional physics and neighbors"

        return {
            "score": round(consistency_anomaly, 4),
            "spatial_inconsistency": round(spatial_inconsistency_score, 4),
            "temporal_inconsistency": round(temporal_score, 4),
            "mahalanobis_distance": round(m_dist, 4),
            "flags": flags,
            "reason": primary_reason,
            "details": {
                "station_id": sid,
                "timestamp": ts_val.isoformat() + "Z",
                "is_coherent_regional_event": is_coherent_regional_event,
                "is_frozen": is_frozen,
                "is_dropout": False,
                "spatial_residuals": spatial_residuals,
            },
        }

    # If single point requested
    if target_station_id is not None and target_timestamp is not None:
        target_ts_dt = pd.to_datetime(target_timestamp)
        return _evaluate_single(target_station_id, target_ts_dt)

    # Batch computation across all rows
    results_list = []
    for (sid, ts_val), _ in df.groupby(["station_id", "_ts"]):
        res = _evaluate_single(int(sid), ts_val)
        results_list.append({
            "station_id": sid,
            "timestamp": ts_val,
            "consistency_score": res["score"],
            "spatial_inconsistency": res.get("spatial_inconsistency", 0.0),
            "temporal_inconsistency": res.get("temporal_inconsistency", 0.0),
            "mahalanobis_distance": res.get("mahalanobis_distance", 0.0),
            "flags": res["flags"],
            "reason": res["reason"],
            "is_coherent_event": res["details"].get("is_coherent_regional_event", False),
            "is_frozen": res["details"].get("is_frozen", False),
            "is_dropout": res["details"].get("is_dropout", False),
        })

    return pd.DataFrame(results_list)


# ===========================================================================
# 2. FUSION AND CLASSIFICATION ENGINE
# ===========================================================================

DEFAULT_WEIGHTS = {
    "statistical": 0.25,
    "lstm": 0.25,
    "isolation_forest": 0.25,
    "consistency": 0.25,
}


def fuse_and_classify(
    station_id: int,
    station_name: str,
    timestamp: Union[datetime, str, pd.Timestamp],
    detector_scores: Dict[str, float],
    detector_flags: Optional[Dict[str, List[str]]] = None,
    parameter_values: Optional[Dict[str, Optional[float]]] = None,
    is_coherent_neighbor_event: bool = False,
    is_frozen: bool = False,
    is_dropout: bool = False,
    weights: Optional[Dict[str, float]] = None,
    alert_id: Optional[int] = None,
    threshold: float = 0.50,
) -> Optional[Dict[str, Any]]:
    """
    Combines statistical + LSTM + Isolation Forest + consistency scores with configurable weights
    and applies strict Root Cause classification logic.

    Enums strictly:
      - severity: low | medium | high
      - root_cause: sensor_fault | comms_error | genuine_event | unknown
      - status: active | acknowledged | resolved
      - parameters_flagged: temperature | pressure | humidity

    Root Cause Rules:
      - frozen/stuck sensor -> sensor_fault
      - missing/dropout -> comms_error
      - coherent neighboring anomaly -> genuine_event
      - high isolated single-station anomaly -> sensor_fault
      - else -> unknown

    Returns:
      Serialized Alert dictionary matching contract, or None if below threshold.
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS

    if detector_flags is None:
        detector_flags = {}

    # 1. Compute Weighted Ensemble Confidence Score
    total_w = sum(weights.values())
    w_norm = {k: v / max(total_w, 1e-6) for k, v in weights.items()}

    confidence = 0.0
    for model_name, w in w_norm.items():
        s = float(detector_scores.get(model_name, 0.0))
        confidence += w * s

    confidence = float(np.clip(confidence, 0.0, 1.0))

    # Fast check: if below threshold and no explicit fault trigger, return None
    if confidence < threshold and not is_frozen and not is_dropout and not is_coherent_neighbor_event:
        return None

    # 2. Format Timestamp strictly to ISO 8601 UTC with Z suffix
    if isinstance(timestamp, (datetime, pd.Timestamp)):
        if timestamp.tzinfo is None:
            ts_str = timestamp.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        else:
            ts_str = timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    else:
        ts_str = str(timestamp).rstrip("Z") + "Z"

    # 3. Determine Flagged Parameters strictly within (temperature, pressure, humidity)
    parameters_flagged: List[str] = []
    all_flags_list: List[str] = []
    for f_list in detector_flags.values():
        all_flags_list.extend(f_list)

    for param in [Parameter.temperature.value, Parameter.pressure.value, Parameter.humidity.value]:
        # Check if parameter mentioned in any detector flag or abnormal value
        if any(param in f.lower() for f in all_flags_list):
            parameters_flagged.append(param)

    if not parameters_flagged and parameter_values:
        for param, val in parameter_values.items():
            if val is None or np.isnan(val):
                if param in CORE_PARAMETERS and param not in parameters_flagged:
                    parameters_flagged.append(param)

    if not parameters_flagged:
        parameters_flagged = [Parameter.temperature.value]

    # 4. Strict Root Cause Classification Rules
    # Rule 1: Frozen / Stuck Sensor
    if is_frozen or any("frozen" in f.lower() for f in all_flags_list):
        root_cause = RootCause.sensor_fault.value
        summary = f"Frozen sensor reading detected on {', '.join(parameters_flagged)} at {station_name}"
        confidence = max(confidence, 0.92)

    # Rule 2: Missing / Dropout Telemetry
    elif is_dropout or any("dropout" in f.lower() or "missing" in f.lower() for f in all_flags_list):
        root_cause = RootCause.comms_error.value
        summary = f"Telemetry communication dropout / packet loss detected at {station_name}"
        confidence = max(confidence, 0.94)

    # Rule 3: Coherent Neighboring Anomaly
    elif is_coherent_neighbor_event or any("coherent" in f.lower() or "regional" in f.lower() for f in all_flags_list):
        root_cause = RootCause.genuine_event.value
        summary = f"Coherent regional atmospheric event verified across neighboring stations at {station_name}"
        confidence = max(confidence, 0.93)

    # Rule 4: Isolated Spatial Anomaly (single-station outlier while neighbors normal)
    elif any("spatial_outlier" in f.lower() or "spike" in f.lower() for f in all_flags_list) or confidence >= 0.65:
        root_cause = RootCause.sensor_fault.value
        summary = f"Isolated sensor fault detected on {', '.join(parameters_flagged)} at {station_name}"

    # Rule 5: Ambiguous / Unknown
    else:
        root_cause = RootCause.unknown.value
        summary = f"Atmospheric anomaly pattern detected on {', '.join(parameters_flagged)} at {station_name}"

    # 5. Severity Assignment strictly (low, medium, high)
    if confidence >= 0.85 or is_dropout or is_frozen:
        severity = Severity.high.value
    elif confidence >= 0.60:
        severity = Severity.medium.value
    else:
        severity = Severity.low.value

    alert_id_val = int(alert_id if alert_id is not None else int(datetime.now(timezone.utc).timestamp() * 1000) % 100000)

    # 6. Serialized Alert matching exact specification
    alert_obj: Dict[str, Any] = {
        "id": alert_id_val,
        "station_id": int(station_id),
        "station_name": str(station_name),
        "timestamp": ts_str,
        "confidence": float(round(confidence, 2)),
        "severity": severity,
        "root_cause": root_cause,
        "summary": summary,
        "parameters_flagged": parameters_flagged,
        "status": AlertStatus.active.value,
    }

    return alert_obj
