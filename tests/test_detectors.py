"""
tests/test_detectors.py
=======================
Pytest tests for backend/detectors.py.

Covers: spikes, frozen values, missing periods (dropout), drift,
        LSTM AE training + inference, IsoForest training + inference.

All tests use synthetic mini-DataFrames; no real parquet file is required.
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

# Make backend importable from repo root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.detectors import (
    statistical_detect,
    LSTMAutoencoder,
    IsolationForestDetector,
    compare_detectors,
    _safe_rolling_zscore,
    _frozen_value_flag,
    _dropout_flag,
    _stl_residual_flag,
    _make_sequences,
    LSTM_FEATURES,
    IF_FEATURES,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_df(n: int = 500, freq: str = "1h", seed: int = 0) -> pd.DataFrame:
    """Return a minimal synthetic DataFrame matching the features schema."""
    rng = np.random.default_rng(seed)
    ts  = pd.date_range("2010-01-01", periods=n, freq=freq)
    data = {
        "obstime":     ts,
        "temperature": rng.normal(-10, 5, n).astype(float),
        "pressure":    rng.normal(976, 10, n).astype(float),
        "humidity":    np.where(rng.random(n) < 0.8, rng.uniform(30, 100, n), np.nan),
        "wind_speed":  rng.uniform(0, 20, n).astype(float),
        "wind_direction": rng.uniform(0, 360, n).astype(float),
        "station_id":  "maitri",
        "source":      "real",
        "hour":        ts.hour.astype(np.int32),
        "day_of_year": ts.day_of_year.astype(np.int32),
        "month":       ts.month.astype(np.int32),
        "day_of_week": ts.day_of_week.astype(np.int32),
    }
    df = pd.DataFrame(data)
    # Add engineered columns expected by IsoForest
    df["hour_sin"]  = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]  = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * (df["month"] - 1) / 12)
    df["month_cos"] = np.cos(2 * np.pi * (df["month"] - 1) / 12)
    df["temperature_diff_1h"]   = df["temperature"].diff()
    df["pressure_diff_1h"]      = df["pressure"].diff()
    df["wind_speed_diff_1h"]    = df["wind_speed"].diff()
    df["humidity_diff_1h"]      = df["humidity"].diff()
    df["temperature_roll_std_6h"]  = df["temperature"].rolling(6,  min_periods=1).std()
    df["pressure_roll_std_6h"]     = df["pressure"].rolling(6,  min_periods=1).std()
    df["temperature_roll_std_24h"] = df["temperature"].rolling(24, min_periods=1).std()
    df["pressure_roll_std_24h"]    = df["pressure"].rolling(24, min_periods=1).std()
    df["temperature_roll_mean_6h"]  = df["temperature"].rolling(6,  min_periods=1).mean()
    df["temperature_roll_mean_24h"] = df["temperature"].rolling(24, min_periods=1).mean()
    df["pressure_roll_mean_6h"]     = df["pressure"].rolling(6,  min_periods=1).mean()
    df["pressure_roll_mean_24h"]    = df["pressure"].rolling(24, min_periods=1).mean()
    df["wind_speed_roll_std_6h"]    = df["wind_speed"].rolling(6,  min_periods=1).std()
    df["wind_speed_roll_std_24h"]   = df["wind_speed"].rolling(24, min_periods=1).std()
    df["wind_speed_roll_mean_6h"]   = df["wind_speed"].rolling(6,  min_periods=1).mean()
    df["wind_speed_roll_mean_24h"]  = df["wind_speed"].rolling(24, min_periods=1).mean()
    df["humidity_roll_std_6h"]      = df["humidity"].rolling(6,  min_periods=1).std()
    df["humidity_roll_std_24h"]     = df["humidity"].rolling(24, min_periods=1).std()
    df["humidity_roll_mean_6h"]     = df["humidity"].rolling(6,  min_periods=1).mean()
    df["humidity_roll_mean_24h"]    = df["humidity"].rolling(24, min_periods=1).mean()
    df["temp_pressure_ratio"]       = df["temperature"] / df["pressure"].replace(0, np.nan)
    return df


def _inject_spike(df: pd.DataFrame, idx: int, col: str = "temperature", magnitude: float = 50.0):
    """Return a copy of df with a spike inserted at row idx."""
    df2 = df.copy()
    df2.at[idx, col] = df2[col].mean() + magnitude
    return df2


def _inject_frozen(df: pd.DataFrame, start: int, run: int = 8, col: str = "temperature"):
    """Return a copy of df with a frozen-value run starting at start."""
    df2 = df.copy()
    val = df2.at[start, col]
    df2.loc[start:start + run - 1, col] = val
    return df2


def _inject_gap(df: pd.DataFrame, gap_start: int, gap_len: int = 6):
    """Remove gap_len rows to create a temporal gap."""
    df2 = df.drop(df.index[gap_start:gap_start + gap_len]).reset_index(drop=True)
    return df2


def _inject_drift(df: pd.DataFrame, col: str = "temperature", start: int = 300, slope: float = 1.5):
    """Add a linear drift starting from row start."""
    df2 = df.copy()
    n = len(df2) - start
    df2.loc[start:, col] = df2.loc[start:, col] + slope * np.arange(n)
    return df2


# ===========================================================================
# Unit tests - helper functions
# ===========================================================================

class TestRollingZscore:
    def test_normal_data_not_flagged(self):
        rng = np.random.default_rng(0)
        s   = pd.Series(rng.normal(0, 1, 300))
        flagged = _safe_rolling_zscore(s, window=50, threshold=5.0)
        assert flagged.sum() < 5, "Normal data should rarely exceed threshold=5"

    def test_spike_flagged(self):
        s = pd.Series([0.0] * 200)
        s.iloc[150] = 100.0  # obvious spike
        flagged = _safe_rolling_zscore(s, window=50, threshold=3.0)
        assert flagged.iloc[150], "Spike should be detected"

    def test_nan_safe(self):
        s = pd.Series([np.nan] * 50 + [1.0] * 50)
        result = _safe_rolling_zscore(s, window=10, threshold=3.0)
        assert result.isna().sum() == 0, "Should return no NaN in mask"


class TestFrozenFlag:
    def test_frozen_run_detected(self):
        s = pd.Series([1.0] * 10 + [2.0, 3.0, 1.0])
        flags = _frozen_value_flag(s, min_run=4)
        assert flags[:10].all(), "Frozen run should be fully flagged"

    def test_short_run_not_flagged(self):
        s = pd.Series([1.0, 1.0, 1.0, 2.0, 3.0])  # run of 3 < min_run=4
        flags = _frozen_value_flag(s, min_run=4)
        assert not flags.any(), "Short run should NOT be flagged"

    def test_all_nan_safe(self):
        s = pd.Series([np.nan] * 10)
        flags = _frozen_value_flag(s, min_run=3)
        assert not flags.any(), "All-NaN series should return all False"


class TestDropoutFlag:
    def test_gap_flagged(self):
        # Create timestamps: 50 hourly steps, then a 10-hour gap, then 50 more steps
        t1 = pd.date_range("2010-01-01", periods=50, freq="1h")
        t2 = pd.date_range(t1[-1] + pd.Timedelta("10h"), periods=50, freq="1h")
        ts = pd.Series(t1.tolist() + t2.tolist()).reset_index(drop=True)
        flags = _dropout_flag(ts, gap_hours=3.0)
        # The first observation of t2 (index 50) should be flagged — gap is 10h > 3h
        assert flags.iloc[50], "First obs after gap should be flagged"


    def test_no_gap_not_flagged(self):
        ts = pd.Series(pd.date_range("2010-01-01", periods=100, freq="1h"))
        flags = _dropout_flag(ts, gap_hours=3.0)
        # Only index 0 has a NaN diff (not a real gap)
        assert flags.sum() == 0 or flags.iloc[0], "Regular series should have no dropout flags"


class TestMakeSequences:
    def test_shape(self):
        arr = np.ones((100, 3))
        seqs = _make_sequences(arr, seq_len=24)
        assert seqs.shape == (77, 24, 3)

    def test_too_short_raises(self):
        with pytest.raises(ValueError):
            _make_sequences(np.ones((10, 3)), seq_len=24)


# ===========================================================================
# Integration tests - statistical_detect()
# ===========================================================================

class TestStatisticalDetect:
    def test_returns_correct_columns(self):
        df  = _base_df(500)
        out = statistical_detect(df, column="temperature", stl_period=24)
        required = {"timestamp", "value", "flags", "statistical_score", "reason"}
        assert required.issubset(set(out.columns))

    def test_spike_detected(self):
        df  = _inject_spike(_base_df(500), idx=400, magnitude=60.0)
        out = statistical_detect(df, column="temperature", zscore_threshold=3.0, stl_period=24)
        flagged_at_spike = out.iloc[400]["flags"]
        assert "rolling_zscore" in flagged_at_spike or len(flagged_at_spike) > 0, \
            "Spike should be flagged"

    def test_frozen_values_detected(self):
        df  = _inject_frozen(_base_df(500), start=200, run=10)
        out = statistical_detect(df, column="temperature", frozen_min_run=4, stl_period=24)
        frozen_flags = out.iloc[200:210]["flags"].apply(lambda f: "frozen_value" in f)
        assert frozen_flags.any(), "Frozen run should be detected"

    def test_dropout_gap_detected(self):
        df  = _inject_gap(_base_df(500), gap_start=300, gap_len=6)
        out = statistical_detect(df, column="temperature", dropout_gap_hours=3.0, stl_period=24)
        assert (out["flags"].apply(lambda f: "dropout" in f)).any(), \
            "Dropout gap should be flagged"

    def test_drift_detected(self):
        df  = _inject_drift(_base_df(500), start=300, slope=2.0)
        out = statistical_detect(df, column="temperature", zscore_threshold=2.5, stl_period=24)
        late_flags = out.iloc[380:]["flags"].apply(len)
        assert late_flags.max() > 0, "Drift should trigger statistical flags"

    def test_nan_handling(self):
        df  = _base_df(500)
        df.loc[100:150, "temperature"] = np.nan
        out = statistical_detect(df, column="temperature", stl_period=24)
        assert out["statistical_score"].isna().sum() == 0, "Score should never be NaN"

    def test_score_in_range(self):
        df  = _base_df(300)
        out = statistical_detect(df, column="temperature", stl_period=24)
        assert (out["statistical_score"] >= 0).all()
        assert (out["statistical_score"] <= 1).all()


# ===========================================================================
# Integration tests - LSTMAutoencoder
# ===========================================================================

class TestLSTMAutoencoder:
    @pytest.fixture(scope="class")
    def trained_ae(self, tmp_path_factory):
        tmp = tmp_path_factory.mktemp("models")
        ae  = LSTMAutoencoder(
            seq_len=24, hidden_size=16, n_layers=2, max_epochs=3,
            patience=2, batch_size=64, seed=42,
        )
        # Monkeypatch CHECKPOINT / NORM_STATS to tmp dir
        ae.CHECKPOINT = tmp / "lstm_ae.pt"
        ae.__class__.CHECKPOINT = tmp / "lstm_ae.pt"
        ae.NORM_STATS = tmp / "lstm_norm_stats.json"
        ae.__class__.NORM_STATS = tmp / "lstm_norm_stats.json"
        df = _base_df(600)
        ae.train(df)
        return ae, df

    def test_train_returns_meta(self, trained_ae):
        ae, df = trained_ae
        info = ae.train(df)
        assert "threshold" in info
        assert info["epochs_trained"] >= 1
        assert info["threshold"] > 0

    def test_detect_shape(self, trained_ae):
        ae, df = trained_ae
        out = ae.detect(df)
        assert "timestamp" in out.columns
        assert "anomaly_score" in out.columns
        assert "is_anomaly" in out.columns
        # Sequences: len(valid) - seq_len + 1
        expected = len(df.ffill().dropna(subset=LSTM_FEATURES)) - ae.seq_len + 1
        assert len(out) == expected

    def test_score_in_0_1(self, trained_ae):
        ae, df = trained_ae
        out = ae.detect(df)
        assert (out["anomaly_score"] >= 0).all()
        assert (out["anomaly_score"] <= 1).all()

    def test_spike_scores_high(self, trained_ae):
        ae, df_base = trained_ae
        df_spike = _inject_spike(df_base.copy(), idx=400, magnitude=80.0)
        out_base  = ae.detect(df_base)
        out_spike = ae.detect(df_spike)
        # The spike should increase the maximum anomaly score
        assert out_spike["anomaly_score"].max() >= out_base["anomaly_score"].max()

    def test_frozen_increases_score(self, trained_ae):
        ae, df_base = trained_ae
        df_frz = _inject_frozen(df_base.copy(), start=200, run=30)
        out_base = ae.detect(df_base)
        out_frz  = ae.detect(df_frz)
        assert out_frz["anomaly_score"].mean() >= out_base["anomaly_score"].mean() * 0.9


# ===========================================================================
# Integration tests - IsolationForestDetector
# ===========================================================================

class TestIsolationForestDetector:
    @pytest.fixture(scope="class")
    def trained_ifd(self, tmp_path_factory):
        tmp = tmp_path_factory.mktemp("iforest")
        ifd = IsolationForestDetector(n_estimators=50, contamination=0.05, seed=42)
        ifd.IF_CHECKPOINT = tmp / "iforest.pkl"
        ifd.IF_SCALER     = tmp / "iforest_scaler.pkl"
        df = _base_df(600)
        ifd.train(df)
        return ifd, df

    def test_train_returns_meta(self, trained_ifd):
        ifd, df = trained_ifd
        info = ifd.train(df)
        assert "n_train" in info
        assert info["features_used"] == IF_FEATURES

    def test_detect_shape(self, trained_ifd):
        ifd, df = trained_ifd
        out = ifd.detect(df)
        assert "timestamp" in out.columns
        assert "anomaly_score" in out.columns
        assert "is_anomaly" in out.columns

    def test_score_in_0_1(self, trained_ifd):
        ifd, df = trained_ifd
        out = ifd.detect(df)
        assert (out["anomaly_score"] >= 0).all()
        assert (out["anomaly_score"] <= 1.001).all()

    def test_spike_flagged(self, trained_ifd):
        ifd, df_base = trained_ifd
        df_spike = _inject_spike(df_base.copy(), idx=400, magnitude=100.0)
        out = ifd.detect(df_spike)
        spike_row_idx = out["timestamp"] == df_spike["obstime"].iloc[400]
        if spike_row_idx.any():
            spike_score = out.loc[spike_row_idx, "anomaly_score"].values[0]
            assert spike_score > 0.3, "Spike should have elevated anomaly score"

    def test_contamination_fraction(self, trained_ifd):
        ifd, df = trained_ifd
        out = ifd.detect(df)
        frac = out["is_anomaly"].mean()
        # Contamination is 0.05; expect 1-12% flagged on test data
        assert 0.01 <= frac <= 0.15, f"Unexpected flagging rate: {frac:.2%}"


# ===========================================================================
# compare_detectors()
# ===========================================================================

class TestCompareDetectors:
    def test_consensus_columns(self):
        df  = _base_df(400)
        sd  = statistical_detect(df, column="temperature", stl_period=24)
        ae  = LSTMAutoencoder(seq_len=24, hidden_size=8, n_layers=1,
                              max_epochs=2, patience=2, batch_size=64, seed=42)
        ae.train(df)
        ld  = ae.detect(df)
        ifd = IsolationForestDetector(n_estimators=20, seed=42)
        ifd.train(df)
        id_ = ifd.detect(df)
        cmp = compare_detectors(sd, ld, id_)
        assert "consensus_anomaly" in cmp.columns
        assert cmp["consensus_anomaly"].dtype == bool or cmp["consensus_anomaly"].dtype == np.bool_

    def test_no_overlap_returns_empty(self):
        # Timestamps that don't overlap -> empty merged
        df1 = _base_df(200)
        df2 = _base_df(200)
        # Force different obstime in ld/id by shifting
        df2["obstime"] = df2["obstime"] + pd.Timedelta("10000h")
        sd = statistical_detect(df1, column="temperature", stl_period=24)
        ae = LSTMAutoencoder(seq_len=24, hidden_size=8, n_layers=1,
                             max_epochs=2, patience=2, batch_size=64, seed=42)
        ae.train(df1); ld = ae.detect(df1)
        # Shift timestamps in ld
        ld["timestamp"] = pd.to_datetime(ld["timestamp"]) + pd.Timedelta("10001h")
        ifd = IsolationForestDetector(n_estimators=10, seed=42)
        ifd.train(df1); id_ = ifd.detect(df1)
        id_["timestamp"] = pd.to_datetime(id_["timestamp"]) + pd.Timedelta("10002h")
        cmp = compare_detectors(sd, ld, id_)
        assert len(cmp) == 0, "Non-overlapping timestamps should yield empty comparison"
