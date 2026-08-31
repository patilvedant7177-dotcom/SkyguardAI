"""
backend/detectors.py
====================
Three independent anomaly detectors operating on maitri_features.parquet.

Confirmed data characteristics (Stage 2):
  - Sampling interval : 1 hour (mode)
  - Primary features  : temperature, pressure, humidity
  - Date range        : 1985-01-01 to 2016-12-19
  - LSTM seq_len      : 24  (24 consecutive hourly steps = 1 day)

Detectors
---------
1. statistical_detect()  - rolling z-score, STL decomposition, frozen-value
                           detector, dropout detector
2. LSTMAutoencoder       - 2-layer LSTM encoder-decoder; per-feature MSE
3. IsolationForestDetector - ISO Forest on engineered feature subset
"""

from __future__ import annotations

import json
import logging
import pickle
import random
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.seasonal import STL

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("skyguard.detectors")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = ROOT / "data" / "processed" / "maitri_features.parquet"
MODELS_DIR = ROOT / "data" / "processed" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Constants derived from Stage 2 profiling
# ---------------------------------------------------------------------------
SAMPLE_INTERVAL_H = 1          # confirmed mode interval = 60 min
LSTM_SEQ_LEN      = 24         # 24 hourly steps = 1 day
LSTM_FEATURES     = ["temperature", "pressure", "humidity"]
IF_FEATURES       = [
    "temperature", "pressure", "humidity",
    "temperature_diff_1h", "pressure_diff_1h",
    "temperature_roll_std_6h", "pressure_roll_std_6h",
    "temperature_roll_std_24h",
]
SEED = 42


# ===========================================================================
# 1. STATISTICAL DETECTOR
# ===========================================================================

def _safe_rolling_zscore(
    series: pd.Series,
    window: int,
    threshold: float,
) -> pd.Series:
    """Return boolean mask where |z-score| > threshold; NaN -> False."""
    roll_mean = series.rolling(window, min_periods=max(1, window // 2)).mean()
    roll_std  = series.rolling(window, min_periods=max(1, window // 2)).std()
    with np.errstate(divide="ignore", invalid="ignore"):
        z = (series - roll_mean) / roll_std.replace(0, np.nan)
    return z.abs() > threshold


def _stl_residual_flag(
    series: pd.Series,
    period: int,
    threshold: float,
) -> pd.Series:
    """Flag STL residuals that exceed threshold x IQR."""
    mask = pd.Series(False, index=series.index)
    valid = series.dropna()
    if len(valid) < 2 * period:
        return mask
    try:
        result = STL(valid, period=period, robust=True).fit()
        resid  = pd.Series(result.resid, index=valid.index)
        iqr    = resid.quantile(0.75) - resid.quantile(0.25)
        cutoff = threshold * max(iqr, 1e-6)
        flagged_idx = resid.index[resid.abs() > cutoff]
        mask.loc[flagged_idx] = True
    except Exception as exc:
        logger.warning("STL fit failed: %s", exc)
    return mask


def _frozen_value_flag(
    series: pd.Series,
    min_run: int = 4,
) -> pd.Series:
    """Flag streaks of >= min_run identical consecutive non-NaN values."""
    mask = pd.Series(False, index=series.index)
    notna = series.dropna()
    if notna.empty:
        return mask
    is_same = notna.round(3) == notna.round(3).shift(1)
    run_id   = (~is_same).cumsum()
    run_len  = run_id.map(run_id.value_counts())
    flagged  = notna.index[run_len >= min_run]
    mask.loc[flagged] = True
    return mask


def _dropout_flag(
    obstime: pd.Series,
    gap_hours: float = 3.0,
) -> pd.Series:
    """Flag the first observation after a gap > gap_hours."""
    mask = pd.Series(False, index=obstime.index)
    diffs_h  = obstime.diff().dt.total_seconds() / 3600
    gap_idx  = obstime.index[diffs_h > gap_hours]
    mask.loc[gap_idx] = True
    return mask


def statistical_detect(
    df: Optional[pd.DataFrame] = None,
    column: str = "temperature",
    zscore_window: int = 168,
    zscore_threshold: float = 3.5,
    stl_period: int = 24,
    stl_iqr_multiplier: float = 3.0,
    frozen_min_run: int = 4,
    dropout_gap_hours: float = 3.0,
) -> pd.DataFrame:
    """
    Apply four statistical anomaly tests to column.

    Returns DataFrame: timestamp, value, flags (list[str]), statistical_score, reason
    """
    if df is None:
        logger.info("Loading features from %s", FEATURES_PATH)
        df = pd.read_parquet(FEATURES_PATH)

    df = df.copy().sort_values("obstime").reset_index(drop=True)
    series = df[column]

    logger.info("Running statistical detector on '%s' (%d rows)", column, len(df))

    zflag    = _safe_rolling_zscore(series, zscore_window, zscore_threshold)
    stlflag  = _stl_residual_flag(series, stl_period, stl_iqr_multiplier)
    frozflag = _frozen_value_flag(series, frozen_min_run)
    dropflag = _dropout_flag(df["obstime"], dropout_gap_hours)

    flag_matrix = pd.DataFrame({
        "zscore":  zflag.astype(float),
        "stl":     stlflag.astype(float),
        "frozen":  frozflag.astype(float),
        "dropout": dropflag.astype(float),
    })
    stat_score = flag_matrix.mean(axis=1)

    def _build_flags(row):
        active = []
        if row["zscore"]:  active.append("rolling_zscore")
        if row["stl"]:     active.append("stl_residual")
        if row["frozen"]:  active.append("frozen_value")
        if row["dropout"]: active.append("dropout")
        return active

    flags_col  = flag_matrix.apply(_build_flags, axis=1)
    reason_col = flags_col.apply(lambda f: "; ".join(f) if f else "normal")

    result = pd.DataFrame({
        "timestamp":         df["obstime"],
        "value":             series,
        "flags":             flags_col,
        "statistical_score": stat_score,
        "reason":            reason_col,
    })
    n_flagged = (result["flags"].apply(len) > 0).sum()
    logger.info("Statistical detector: %d/%d rows flagged", n_flagged, len(result))
    return result


# ===========================================================================
# 2. LSTM AUTOENCODER
# ===========================================================================

class _LSTMEncoder(nn.Module):
    def __init__(self, n_features, hidden, n_layers, dropout):
        super().__init__()
        self.lstm = nn.LSTM(
            n_features, hidden, num_layers=n_layers,
            batch_first=True, dropout=dropout if n_layers > 1 else 0.0,
        )

    def forward(self, x):
        _, (h, _) = self.lstm(x)
        return h[-1]


class _LSTMDecoder(nn.Module):
    def __init__(self, n_features, hidden, seq_len, n_layers, dropout):
        super().__init__()
        self.seq_len = seq_len
        self.lstm = nn.LSTM(
            hidden, hidden, num_layers=n_layers,
            batch_first=True, dropout=dropout if n_layers > 1 else 0.0,
        )
        self.proj = nn.Linear(hidden, n_features)

    def forward(self, z):
        z_rep = z.unsqueeze(1).repeat(1, self.seq_len, 1)
        out, _ = self.lstm(z_rep)
        return self.proj(out)


class _AutoencoderNet(nn.Module):
    def __init__(self, n_features, hidden, seq_len, n_layers, dropout):
        super().__init__()
        self.encoder = _LSTMEncoder(n_features, hidden, n_layers, dropout)
        self.decoder = _LSTMDecoder(n_features, hidden, seq_len, n_layers, dropout)

    def forward(self, x):
        return self.decoder(self.encoder(x))


def _make_sequences(arr, seq_len):
    n = len(arr) - seq_len + 1
    if n <= 0:
        raise ValueError(f"Array length {len(arr)} < seq_len {seq_len}")
    indices = np.arange(seq_len)[None, :] + np.arange(n)[:, None]
    return arr[indices]


class LSTMAutoencoder:
    """
    LSTM Autoencoder for multivariate anomaly detection.

    Features  : temperature, pressure, humidity
    Seq length: 24 (1 hour x 24 = 1 day, confirmed from Stage 2)
    Checkpoint: data/processed/models/lstm_ae.pt
    Norm stats: data/processed/models/lstm_norm_stats.json
    """

    CHECKPOINT = MODELS_DIR / "lstm_ae.pt"
    NORM_STATS = MODELS_DIR / "lstm_norm_stats.json"

    def __init__(
        self,
        seq_len=LSTM_SEQ_LEN,
        hidden_size=64,
        n_layers=2,
        dropout=0.1,
        lr=1e-3,
        batch_size=128,
        max_epochs=50,
        patience=5,
        seed=SEED,
        device=None,
    ):
        self.seq_len    = seq_len
        self.hidden     = hidden_size
        self.n_layers   = n_layers
        self.dropout    = dropout
        self.lr         = lr
        self.batch_size = batch_size
        self.max_epochs = max_epochs
        self.patience   = patience
        self.seed       = seed
        self.device     = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self._set_seed()
        self._mean = None
        self._std  = None
        self._net  = None
        self._threshold = None

    def _set_seed(self):
        random.seed(self.seed)
        np.random.seed(self.seed)
        torch.manual_seed(self.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(self.seed)

    def _prepare(self, df):
        arr = df[LSTM_FEATURES].copy().ffill().bfill().fillna(0.0)
        return arr.values.astype(np.float32), arr.index

    def _normalize(self, arr):
        return (arr - self._mean) / np.where(self._std == 0, 1.0, self._std)

    def train(self, df=None):
        if df is None:
            df = pd.read_parquet(FEATURES_PATH)
        df = df.sort_values("obstime").reset_index(drop=True)
        raw, _ = self._prepare(df)

        n_train  = int(0.8 * len(raw))
        tr, va   = raw[:n_train], raw[n_train:]
        self._mean = tr.mean(axis=0)
        self._std  = tr.std(axis=0)
        tr_n = self._normalize(tr)
        va_n = self._normalize(va)
        tr_s = _make_sequences(tr_n, self.seq_len)
        va_s = _make_sequences(va_n, self.seq_len)

        n_feat   = len(LSTM_FEATURES)
        self._net = _AutoencoderNet(n_feat, self.hidden, self.seq_len, self.n_layers, self.dropout).to(self.device)
        opt       = torch.optim.Adam(self._net.parameters(), lr=self.lr)
        crit      = nn.MSELoss()

        def val_loss():
            self._net.eval()
            with torch.no_grad():
                t = torch.from_numpy(va_s).to(self.device)
                return crit(self._net(t), t).item()

        best_val, best_state, no_imp = float("inf"), None, 0
        train_losses, val_losses = [], []

        logger.info("Training LSTM AE: %d train / %d val seqs, device=%s", len(tr_s), len(va_s), self.device)
        for ep in range(self.max_epochs):
            self._net.train()
            perm = np.random.permutation(len(tr_s))
            ep_loss, nb = 0.0, 0
            for i in range(0, len(perm), self.batch_size):
                idx   = perm[i:i+self.batch_size]
                batch = torch.from_numpy(tr_s[idx]).to(self.device)
                opt.zero_grad()
                loss  = crit(self._net(batch), batch)
                loss.backward()
                nn.utils.clip_grad_norm_(self._net.parameters(), 1.0)
                opt.step()
                ep_loss += loss.item(); nb += 1
            tl = ep_loss / max(nb, 1)
            vl = val_loss()
            train_losses.append(tl); val_losses.append(vl)
            if vl < best_val - 1e-6:
                best_val   = vl
                best_state = {k: v.cpu().clone() for k, v in self._net.state_dict().items()}
                no_imp     = 0
            else:
                no_imp += 1
            if ep % 5 == 0:
                logger.info("Epoch %3d | train=%.6f | val=%.6f", ep+1, tl, vl)
            if no_imp >= self.patience:
                logger.info("Early stopping at epoch %d", ep+1); break

        if best_state:
            self._net.load_state_dict(best_state)

        self._net.eval()
        with torch.no_grad():
            t = torch.from_numpy(tr_s).to(self.device)
            mse = ((self._net(t) - t) ** 2).mean(dim=(1, 2)).cpu().numpy()
        self._threshold = float(np.percentile(mse, 99))
        logger.info("Anomaly threshold (99th pct): %.6f", self._threshold)
        self._save()
        return {"train_losses": train_losses, "val_losses": val_losses,
                "threshold": self._threshold, "epochs_trained": len(train_losses)}

    def _save(self):
        torch.save(
            {"model_state": self._net.state_dict(),
             "hparams": {"seq_len": self.seq_len, "hidden": self.hidden,
                         "n_layers": self.n_layers, "dropout": self.dropout,
                         "n_features": len(LSTM_FEATURES)},
             "threshold": self._threshold},
            self.CHECKPOINT,
        )
        with open(self.NORM_STATS, "w") as f:
            json.dump({"mean": self._mean.tolist(), "std": self._std.tolist()}, f)
        logger.info("LSTM AE checkpoint -> %s", self.CHECKPOINT)

    def load(self):
        ck = torch.load(self.CHECKPOINT, map_location=self.device, weights_only=True)
        hp = ck["hparams"]
        self.seq_len = hp["seq_len"]; self.hidden = hp["hidden"]
        self.n_layers = hp["n_layers"]; self.dropout = hp["dropout"]
        self._threshold = ck["threshold"]
        self._net = _AutoencoderNet(hp["n_features"], self.hidden, self.seq_len, self.n_layers, self.dropout).to(self.device)
        self._net.load_state_dict(ck["model_state"]); self._net.eval()
        with open(self.NORM_STATS) as f:
            ns = json.load(f)
        self._mean = np.array(ns["mean"], dtype=np.float32)
        self._std  = np.array(ns["std"],  dtype=np.float32)
        logger.info("LSTM AE loaded (threshold=%.6f)", self._threshold)

    def detect(self, df=None, threshold=None):
        if self._net is None:
            raise RuntimeError("Call .train() or .load() first.")
        if df is None:
            df = pd.read_parquet(FEATURES_PATH)
        df = df.sort_values("obstime").reset_index(drop=True)
        raw, src_idx = self._prepare(df)
        seqs = _make_sequences(self._normalize(raw), self.seq_len)

        self._net.eval()
        errs = []
        with torch.no_grad():
            for i in range(0, len(seqs), 512):
                b = torch.from_numpy(seqs[i:i+512]).to(self.device)
                r = self._net(b)
                errs.append(((r - b) ** 2).mean(dim=1).cpu().numpy())
        per_feat = np.concatenate(errs, axis=0)
        total    = per_feat.mean(axis=1)
        thr      = threshold if threshold is not None else self._threshold
        maxv     = total.max() if total.max() > 0 else 1.0
        score    = np.clip(total / maxv, 0, 1)

        src_arr  = np.array(src_idx)
        ts_pos   = np.arange(self.seq_len - 1, self.seq_len - 1 + len(seqs))
        ts       = df["obstime"].iloc[src_arr[ts_pos]].values

        result = pd.DataFrame({
            "timestamp":    ts,
            **{f"{f}_err": per_feat[:, i] for i, f in enumerate(LSTM_FEATURES)},
            "total_mse":    total,
            "anomaly_score": score,
            "is_anomaly":   total > thr,
        })
        logger.info("LSTM AE: %d/%d sequences flagged", result["is_anomaly"].sum(), len(result))
        return result


# ===========================================================================
# 3. ISOLATION FOREST DETECTOR
# ===========================================================================

class IsolationForestDetector:
    """
    Isolation Forest on predominantly-normal real Maitri data.

    NOTE: Scores are relative (no ground-truth labels available).
    Use compare_detectors() for ensemble cross-validation.

    Checkpoint: data/processed/models/iforest.pkl
    Scaler    : data/processed/models/iforest_scaler.pkl
    """

    IF_CHECKPOINT = MODELS_DIR / "iforest.pkl"
    IF_SCALER     = MODELS_DIR / "iforest_scaler.pkl"

    def __init__(self, n_estimators=200, contamination=0.05, max_samples="auto", seed=SEED):
        self.n_estimators  = n_estimators
        self.contamination = contamination
        self.max_samples   = max_samples
        self.seed          = seed
        self._model  = None
        self._scaler = None

    def _feature_matrix(self, df):
        sub = df[IF_FEATURES].copy().ffill().bfill().fillna(0.0)
        return sub.values.astype(np.float32), sub.index

    def train(self, df=None):
        if df is None:
            df = pd.read_parquet(FEATURES_PATH)
        df = df.sort_values("obstime").reset_index(drop=True)
        X, _ = self._feature_matrix(df)
        X_train = X[:int(0.8 * len(X))]
        logger.info("Training IsoForest: %d rows, %d features", len(X_train), X_train.shape[1])
        self._scaler = StandardScaler().fit(X_train)
        self._model  = IsolationForest(
            n_estimators=self.n_estimators, contamination=self.contamination,
            max_samples=self.max_samples, random_state=self.seed, n_jobs=-1,
        ).fit(self._scaler.transform(X_train))
        self._save()
        return {"n_train": len(X_train), "features_used": IF_FEATURES, "contamination": self.contamination}

    def _save(self):
        with open(self.IF_CHECKPOINT, "wb") as f: pickle.dump(self._model, f)
        with open(self.IF_SCALER,     "wb") as f: pickle.dump(self._scaler, f)
        logger.info("IsoForest checkpoint -> %s", self.IF_CHECKPOINT)

    def load(self):
        with open(self.IF_CHECKPOINT, "rb") as f: self._model  = pickle.load(f)
        with open(self.IF_SCALER,     "rb") as f: self._scaler = pickle.load(f)
        logger.info("IsoForest loaded from %s", self.IF_CHECKPOINT)

    def detect(self, df=None):
        if self._model is None:
            raise RuntimeError("Call .train() or .load() first.")
        if df is None:
            df = pd.read_parquet(FEATURES_PATH)
        df = df.sort_values("obstime").reset_index(drop=True)
        X, vidx = self._feature_matrix(df)
        Xs = self._scaler.transform(X)
        raw   = self._model.score_samples(Xs)
        mn, mx = raw.min(), raw.max()
        score = 1.0 - (raw - mn) / (mx - mn) if mx > mn else np.zeros_like(raw)
        preds = self._model.predict(Xs)
        result = pd.DataFrame({
            "timestamp":     df["obstime"].iloc[vidx].values,
            "raw_score":     raw,
            "anomaly_score": score,
            "is_anomaly":    preds == -1,
        })
        logger.info("IsoForest: %d/%d rows flagged", result["is_anomaly"].sum(), len(result))
        return result


# ===========================================================================
# COMPARISON UTILITY
# ===========================================================================

def compare_detectors(stat_df, lstm_df, if_df, round_to="1h"):
    """Inner-join three detector outputs on rounded timestamp; flag consensus >= 2/3."""
    def _prep(df_in, score_col, flag_col, prefix):
        d = df_in[["timestamp", score_col, flag_col]].copy()
        d["ts_key"] = pd.to_datetime(d["timestamp"]).dt.round(round_to)
        d = d.drop(columns=["timestamp"])  # avoid column collision on join
        return d.rename(columns={score_col: f"{prefix}_score", flag_col: f"{prefix}_flag"}).set_index("ts_key")

    s = _prep(stat_df,  "statistical_score", "flags",      "stat")
    l = _prep(lstm_df,  "anomaly_score",     "is_anomaly", "lstm")
    i = _prep(if_df,    "anomaly_score",     "is_anomaly", "if")
    m = s.join(l, how="inner").join(i, how="inner")

    stat_any = m["stat_flag"].apply(lambda f: len(f) > 0 if isinstance(f, list) else bool(f))
    lstm_any = m["lstm_flag"].astype(bool)
    if_any   = m["if_flag"].astype(bool)
    m["consensus_anomaly"] = (stat_any.astype(int) + lstm_any.astype(int) + if_any.astype(int)) >= 2
    return m.reset_index()


# ===========================================================================
# CLI ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    import time

    df = pd.read_parquet(FEATURES_PATH)
    logger.info("Loaded %d rows from %s", len(df), FEATURES_PATH)

    print("\n" + "="*60)
    print("DETECTOR 1 - Statistical")
    print("="*60)
    t0 = time.time()
    stat_result = statistical_detect(df, column="temperature")
    n = (stat_result["flags"].apply(len) > 0).sum()
    print(f"  Flagged: {n:,} / {len(stat_result):,}  ({time.time()-t0:.1f}s)")

    print("\n" + "="*60)
    print("DETECTOR 2 - LSTM Autoencoder")
    print("="*60)
    t0 = time.time()
    ae = LSTMAutoencoder(max_epochs=30, patience=5)
    info = ae.train(df)
    print(f"  Epochs: {info['epochs_trained']}  threshold: {info['threshold']:.6f}")
    lstm_result = ae.detect(df)
    print(f"  Flagged: {lstm_result['is_anomaly'].sum():,} / {len(lstm_result):,}  ({time.time()-t0:.1f}s)")

    print("\n" + "="*60)
    print("DETECTOR 3 - Isolation Forest")
    print("="*60)
    t0 = time.time()
    ifd = IsolationForestDetector()
    ifd.train(df)
    if_result = ifd.detect(df)
    print(f"  Flagged: {if_result['is_anomaly'].sum():,} / {len(if_result):,}  ({time.time()-t0:.1f}s)")

    print("\n" + "="*60)
    print("CONSENSUS")
    print("="*60)
    cmp = compare_detectors(stat_result, lstm_result, if_result)
    print(f"  Consensus anomalies (>=2/3): {cmp['consensus_anomaly'].sum():,} / {len(cmp):,}")
    print("\nModels saved to:", MODELS_DIR)
