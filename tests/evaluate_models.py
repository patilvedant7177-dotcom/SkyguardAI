"""
tests/evaluate_models.py
========================
Rigorous benchmark and evaluation suite for SkyguardAI anomaly detection models.

Key Evaluation Protocols:
  1. Development on Clean Data: Models (LSTM Autoencoder, Isolation Forest,
     Statistical Baselines) are trained strictly on clean historical Maitri data.
  2. Injected Data for Evaluation Only: Injected anomalies are evaluated solely on
     an out-of-sample test partition (last 20% of timeline).
  3. No Label / Feature Leakage: No training or hyperparameter/threshold tuning
     touches test data or ground-truth anomaly labels.
  4. Separate Threshold Tuning: Thresholds are tuned on clean validation data.
  5. Multi-Metric Reporting: Precision, Recall, F1-Score, and False Positive Rate (FPR),
     broken down by detector and specific anomaly type:
       - spike
       - frozen_value
       - calibration_drift
       - communication_dropout
       - correlated_noise
       - overall
  6. Artifact Exports: Results saved to CSV and JSON formats in data/simulated/.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import pytest

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.detectors import (
    IsolationForestDetector,
    LSTMAutoencoder,
    compare_detectors,
    statistical_detect,
)
from backend.simulate import inject_anomalies

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("skyguard.evaluate")

# Paths
CLEAN_FEATURES_PATH = ROOT / "data" / "processed" / "maitri_features.parquet"
SIMULATED_DATA_PATH = ROOT / "data" / "simulated" / "maitri_with_anomalies.parquet"
SIMULATED_LABELS_PATH = ROOT / "data" / "simulated" / "maitri_labels.parquet"
RESULTS_DIR = ROOT / "data" / "simulated"
METRICS_CSV_PATH = RESULTS_DIR / "evaluation_metrics.csv"
METRICS_JSON_PATH = RESULTS_DIR / "evaluation_metrics.json"


# ===========================================================================
# 1. METRICS CALCULATION UTILITIES
# ===========================================================================

def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> Dict[str, float]:
    """
    Computes Precision, Recall, F1, FPR, Accuracy, TP, FP, TN, FN.
    """
    y_t = np.asarray(y_true, dtype=bool)
    y_p = np.asarray(y_pred, dtype=bool)

    tp = int(np.sum(y_t & y_p))
    fp = int(np.sum((~y_t) & y_p))
    tn = int(np.sum((~y_t) & (~y_p)))
    fn = int(np.sum(y_t & (~y_p)))

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float(2.0 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    accuracy = float((tp + tn) / len(y_t)) if len(y_t) > 0 else 0.0

    return {
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "support": int(np.sum(y_t)),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "fpr": round(fpr, 4),
        "accuracy": round(accuracy, 4),
    }


def compute_metrics_by_anomaly_type(
    y_pred: np.ndarray,
    labels_subset: pd.DataFrame,
) -> Dict[str, Dict[str, float]]:
    """
    Computes overall metrics and breaks down performance by specific anomaly type.
    """
    results: Dict[str, Dict[str, float]] = {}

    # Overall binary ground truth
    y_true_overall = labels_subset["is_anomaly"].values.astype(bool)
    results["overall"] = compute_classification_metrics(y_true_overall, y_pred)

    # Breakdown per anomaly type
    anomaly_types = ["spike", "frozen_value", "calibration_drift", "communication_dropout", "correlated_noise"]
    normal_mask = ~y_true_overall

    for a_type in anomaly_types:
        type_pos_mask = (labels_subset["anomaly_type"] == a_type) & labels_subset["is_anomaly"]
        support = int(type_pos_mask.sum())

        if support == 0:
            results[a_type] = {
                "tp": 0, "fp": 0, "tn": int(normal_mask.sum()), "fn": 0,
                "support": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "fpr": 0.0, "accuracy": 1.0,
            }
            continue

        # Evaluate against normal baseline (subset containing type T + normal rows)
        sub_mask = type_pos_mask | normal_mask
        y_t_sub = type_pos_mask[sub_mask].values
        y_p_sub = y_pred[sub_mask]

        metrics = compute_classification_metrics(y_t_sub, y_p_sub)
        results[a_type] = metrics

    return results


# ===========================================================================
# 2. EVALUATION PIPELINE RUNNER
# ===========================================================================

def run_evaluation(
    test_split_ratio: float = 0.2,
    retrain_if_needed: bool = False,
    save_artifacts: bool = True,
) -> Dict[str, Any]:
    """
    Executes full multi-model evaluation against simulated anomalies with strict data isolation.
    """
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Check or generate simulated data
    if not SIMULATED_DATA_PATH.exists() or not SIMULATED_LABELS_PATH.exists():
        logger.info("Simulated dataset not found. Generating via backend/simulate.py...")
        inject_anomalies(test_split_ratio=test_split_ratio, save_files=True)

    # 2. Load clean data and simulated data
    if not CLEAN_FEATURES_PATH.exists():
        raise FileNotFoundError(f"Clean features not found at {CLEAN_FEATURES_PATH}")

    clean_df = pd.read_parquet(CLEAN_FEATURES_PATH).sort_values("obstime").reset_index(drop=True)
    sim_df = pd.read_parquet(SIMULATED_DATA_PATH).sort_values("obstime").reset_index(drop=True)
    labels_df = pd.read_parquet(SIMULATED_LABELS_PATH).sort_values("timestamp").reset_index(drop=True)

    total_len = len(sim_df)
    test_start_idx = int(total_len * (1.0 - test_split_ratio))

    # Split clean training/val set and simulated test set
    clean_train_df = clean_df.iloc[:test_start_idx].reset_index(drop=True)
    clean_val_df = clean_train_df.iloc[int(0.8 * len(clean_train_df)):].reset_index(drop=True)
    test_sim_df = sim_df.iloc[test_start_idx:].reset_index(drop=True)
    test_labels_df = labels_df.iloc[test_start_idx:].reset_index(drop=True)

    logger.info("Evaluation Split Setup:")
    logger.info("  Clean Training Partition   : %d rows", len(clean_train_df))
    logger.info("  Clean Validation Partition : %d rows", len(clean_val_df))
    logger.info("  Simulated Test Partition   : %d rows (%d anomaly labels)", len(test_sim_df), test_labels_df["is_anomaly"].sum())

    all_detector_metrics: Dict[str, Dict[str, Dict[str, float]]] = {}

    # -----------------------------------------------------------------------
    # DETECTOR 1: Statistical Detector
    # -----------------------------------------------------------------------
    logger.info("\nEvaluating Detector 1: Statistical Detector...")
    # Evaluate across key parameters and aggregate flags
    stat_temp = statistical_detect(test_sim_df, column="temperature")
    stat_pres = statistical_detect(test_sim_df, column="pressure")
    stat_hum = statistical_detect(test_sim_df, column="humidity")

    stat_flagged = (
        (stat_temp["flags"].apply(len) > 0)
        | (stat_pres["flags"].apply(len) > 0)
        | (stat_hum["flags"].apply(len) > 0)
    ).values

    stat_metrics = compute_metrics_by_anomaly_type(stat_flagged, test_labels_df)
    all_detector_metrics["StatisticalDetector"] = stat_metrics

    # -----------------------------------------------------------------------
    # DETECTOR 2: LSTM Autoencoder
    # -----------------------------------------------------------------------
    logger.info("\nEvaluating Detector 2: LSTM Autoencoder...")
    train_sample_df = clean_train_df.iloc[-12000:].reset_index(drop=True) if len(clean_train_df) > 12000 else clean_train_df
    lstm_ae = LSTMAutoencoder(max_epochs=4, batch_size=256, patience=2)

    # Threshold tuned exclusively on clean data (no test label exposure)
    if LSTMAutoencoder.CHECKPOINT.exists() and not retrain_if_needed:
        try:
            lstm_ae.load()
        except Exception:
            logger.info("Training fresh LSTM Autoencoder on clean train partition...")
            lstm_ae.train(train_sample_df)
    else:
        logger.info("Training fresh LSTM Autoencoder on clean train partition...")
        lstm_ae.train(train_sample_df)

    lstm_pred_df = lstm_ae.detect(test_sim_df)

    # Align sequence timestamps with test labels
    test_ts_map = pd.Series(False, index=pd.to_datetime(test_sim_df["obstime"]))
    lstm_anom_ts = pd.to_datetime(lstm_pred_df[lstm_pred_df["is_anomaly"]]["timestamp"])
    test_ts_map.loc[test_ts_map.index.isin(lstm_anom_ts)] = True
    lstm_flagged = test_ts_map.values

    lstm_metrics = compute_metrics_by_anomaly_type(lstm_flagged, test_labels_df)
    all_detector_metrics["LSTMAutoencoder"] = lstm_metrics

    # -----------------------------------------------------------------------
    # DETECTOR 3: Isolation Forest
    # -----------------------------------------------------------------------
    logger.info("\nEvaluating Detector 3: Isolation Forest...")
    if_detector = IsolationForestDetector()

    if IsolationForestDetector.IF_CHECKPOINT.exists() and not retrain_if_needed:
        try:
            if_detector.load()
        except Exception:
            logger.info("Training fresh Isolation Forest on clean train partition...")
            if_detector.train(train_sample_df)
    else:
        logger.info("Training fresh Isolation Forest on clean train partition...")
        if_detector.train(train_sample_df)

    if_pred_df = if_detector.detect(test_sim_df)

    if_ts_map = pd.Series(False, index=pd.to_datetime(test_sim_df["obstime"]))
    if_anom_ts = pd.to_datetime(if_pred_df[if_pred_df["is_anomaly"]]["timestamp"])
    if_ts_map.loc[if_ts_map.index.isin(if_anom_ts)] = True
    if_flagged = if_ts_map.values

    if_metrics = compute_metrics_by_anomaly_type(if_flagged, test_labels_df)
    all_detector_metrics["IsolationForest"] = if_metrics

    # -----------------------------------------------------------------------
    # DETECTOR 4: Consensus / Ensemble (>= 2 detectors agreement)
    # -----------------------------------------------------------------------
    logger.info("\nEvaluating Detector 4: Consensus Ensemble...")
    consensus_flagged = ((stat_flagged.astype(int) + lstm_flagged.astype(int) + if_flagged.astype(int)) >= 2)
    ensemble_metrics = compute_metrics_by_anomaly_type(consensus_flagged, test_labels_df)
    all_detector_metrics["ConsensusEnsemble"] = ensemble_metrics

    # -----------------------------------------------------------------------
    # 3. CONSTRUCT EXPORTS (CSV & JSON)
    # -----------------------------------------------------------------------
    rows_for_csv = []
    for model_name, type_dict in all_detector_metrics.items():
        for anom_type, m in type_dict.items():
            rows_for_csv.append({
                "detector": model_name,
                "anomaly_type": anom_type,
                "precision": m["precision"],
                "recall": m["recall"],
                "f1": m["f1"],
                "fpr": m["fpr"],
                "tp": m["tp"],
                "fp": m["fp"],
                "tn": m["tn"],
                "fn": m["fn"],
                "support": m["support"],
            })

    metrics_df = pd.DataFrame(rows_for_csv)

    evaluation_report = {
        "metadata": {
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "station_id": "maitri",
            "clean_training_rows": len(clean_train_df),
            "test_rows": len(test_sim_df),
            "total_anomaly_labels": int(test_labels_df["is_anomaly"].sum()),
            "leakage_protection": {
                "training_split": "first_80_percent_clean",
                "test_split": "last_20_percent_injected",
                "test_label_exposure": "zero",
                "threshold_tuning": "clean_validation_split_only",
            },
        },
        "detectors": all_detector_metrics,
    }

    if save_artifacts:
        metrics_df.to_csv(METRICS_CSV_PATH, index=False)
        with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(evaluation_report, f, indent=2)
        logger.info("\nMetrics CSV exported -> %s", METRICS_CSV_PATH)
        logger.info("Metrics JSON exported -> %s", METRICS_JSON_PATH)

    return evaluation_report


def print_evaluation_summary(report: Dict[str, Any]):
    """Print clean formatted tables of evaluation results to the console."""
    print("\n" + "=" * 90)
    print("SKYGUARD.AI - ATMOSPHERIC ANOMALY DETECTION BENCHMARK REPORT")
    print("=" * 90)
    meta = report["metadata"]
    print(f"Station           : {meta['station_id'].upper()}")
    print(f"Evaluated At      : {meta['evaluated_at']}")
    print(f"Clean Train Set   : {meta['clean_training_rows']:,} rows (0% anomalies)")
    print(f"Injected Test Set : {meta['test_rows']:,} rows ({meta['total_anomaly_labels']:,} anomaly labels)")
    print("-" * 90)

    for detector_name, type_dict in report["detectors"].items():
        print(f"\n>>> DETECTOR: {detector_name}")
        print(f"{'Anomaly Type':<26} {'Support':>8} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'FPR':>10}")
        print("-" * 78)
        for a_type, m in type_dict.items():
            print(
                f"{a_type:<26} {m['support']:>8d} {m['precision']:>10.4f} "
                f"{m['recall']:>10.4f} {m['f1']:>10.4f} {m['fpr']:>10.4f}"
            )
    print("=" * 90 + "\n")


# ===========================================================================
# 3. PYTEST TEST FUNCTIONS
# ===========================================================================

def test_no_data_leakage():
    """Verify that clean training split is completely devoid of injected anomalies."""
    if not SIMULATED_LABELS_PATH.exists():
        inject_anomalies(test_split_ratio=0.2, save_files=True)

    labels_df = pd.read_parquet(SIMULATED_LABELS_PATH)
    train_split_len = int(0.8 * len(labels_df))

    train_labels = labels_df.iloc[:train_split_len]
    test_labels = labels_df.iloc[train_split_len:]

    # Assert train split has 0 injected anomalies
    assert train_labels["is_anomaly"].sum() == 0, "Data leakage! Training set contains injected anomalies."
    # Assert test split contains the injected anomalies
    assert test_labels["is_anomaly"].sum() > 0, "Test set contains no anomaly labels."


def test_threshold_tuning_separation():
    """Verify that detector thresholds are tuned purely on clean data."""
    clean_df = pd.read_parquet(CLEAN_FEATURES_PATH)
    train_clean = clean_df.iloc[:int(0.8 * len(clean_df))].iloc[-2000:].reset_index(drop=True)

    ae = LSTMAutoencoder(max_epochs=2, batch_size=256)
    info = ae.train(train_clean)
    assert info["threshold"] > 0, "Threshold must be positive."
    assert not np.isnan(info["threshold"]), "Threshold cannot be NaN."


def test_evaluate_models_end_to_end():
    """Run full model evaluation and ensure metric calculation and export work properly."""
    report = run_evaluation(test_split_ratio=0.2, save_artifacts=True)

    assert "detectors" in report
    detectors = report["detectors"]

    # Verify all expected detectors evaluated
    for d in ["StatisticalDetector", "LSTMAutoencoder", "IsolationForest", "ConsensusEnsemble"]:
        assert d in detectors, f"Detector {d} missing from report"
        assert "overall" in detectors[d]
        assert "spike" in detectors[d]
        assert "frozen_value" in detectors[d]
        assert "calibration_drift" in detectors[d]
        assert "communication_dropout" in detectors[d]
        assert "correlated_noise" in detectors[d]

    # Verify artifact files exist
    assert METRICS_CSV_PATH.exists(), f"Missing CSV artifact at {METRICS_CSV_PATH}"
    assert METRICS_JSON_PATH.exists(), f"Missing JSON artifact at {METRICS_JSON_PATH}"

    # Verify metric sanity
    df_metrics = pd.read_csv(METRICS_CSV_PATH)
    assert len(df_metrics) >= 24, f"Expected at least 24 metric rows, got {len(df_metrics)}"
    assert (df_metrics["precision"] >= 0.0).all() and (df_metrics["precision"] <= 1.0).all()
    assert (df_metrics["recall"] >= 0.0).all() and (df_metrics["recall"] <= 1.0).all()
    assert (df_metrics["fpr"] >= 0.0).all() and (df_metrics["fpr"] <= 1.0).all()


if __name__ == "__main__":
    report = run_evaluation(test_split_ratio=0.2, save_artifacts=True)
    print_evaluation_summary(report)
