# 🛰️ SkyguardAI Atmospheric Anomaly Detection Platform
### Comprehensive System Architecture & Technical Documentation

---

## 1. Executive Summary & System Overview

**SkyguardAI** is an operational atmospheric intelligence platform engineered to detect sensor anomalies, isolate hardware faults, verify spatial-temporal consensus, and explain decisions in real-time. It operates on high-resolution meteorological telemetry, including ground-truth observations from the **IMD Maitri Antarctic Research Station (-70.75°S, 11.74°E)** and distributed sensor networks.

The core innovation is a multi-tier consensus and explainability architecture: raw sensor data is filtered by an ensemble of statistical, deep learning, and unsupervised detectors, validated against physical lapse rates and spatial neighbors via Haversine and Mahalanobis distances, and translated into transparent SHAP attributions and human-readable meteorological narratives.

> [!IMPORTANT]
> **Core Capability**: SkyguardAI strictly differentiates between single-station sensor faults (e.g., drift, spikes, frozen readings) and coherent regional meteorological phenomena (e.g., passing cold fronts, cyclonic depressions) using altitude-corrected neighbor consensus.

---

## 2. System Architecture & Repository Layout

```text
SkyguardAI/
├── backend/
│   ├── app.py                 # FastAPI application, route handlers, SSE stream & state
│   ├── config.py              # Strict Enums (Severity, RootCause, Parameter, etc.) & CORS
│   ├── consistency.py         # Spatial Haversine, lapse rate, temporal & Mahalanobis fusion
│   ├── data_pipeline.py       # IMD Maitri NetCDF/CSV parser, cleaner & feature engineering
│   ├── detectors.py           # Statistical, 2-layer PyTorch LSTM Autoencoder & Isolation Forest
│   ├── explain.py             # SHAP attributions, domain narratives & health prognostics
│   ├── simulate.py            # Spatial station network generator & fault injector
│   └── smoke_test.py          # Quick backend verification script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.tsx     # Navigation header with system status indicators
│   │   ├── pages/
│   │   │   ├── NetworkOverview.tsx  # Station grid, metrics, status breakdown
│   │   │   ├── LiveAlerts.tsx       # Live SSE alert feed & triage actions
│   │   │   ├── StationDetail.tsx    # 72-hour multi-variable timeseries telemetry
│   │   │   ├── WhyFlagged.tsx       # SHAP feature contributions & domain narratives
│   │   │   ├── SensorHealth.tsx     # Sensor health scoring, trend & RUL forecast
│   │   │   └── History.tsx          # Historical alert audit trail & search
│   │   ├── api.ts             # Typed REST & EventSource client
│   │   ├── config.ts          # API Base URL configuration
│   │   ├── types.ts           # TypeScript interfaces matching backend models
│   │   └── index.css          # Design system & responsive layout styles
├── data/
│   ├── raw/                   # Raw IMD CSV / NetCDF records
│   ├── processed/             # Cleaned Parquet tables & trained model weights
│   └── simulated/             # Generated station networks & demo snapshots
├── tests/
│   ├── test_detectors.py      # Unit & benchmark tests for ML detectors
│   ├── test_consistency.py    # Spatial & temporal fusion tests
│   ├── test_explain.py        # Explainability & health scoring test suite
│   └── evaluate_models.py     # Multi-detector performance evaluation
├── SkyguardAI_Documentation.docx  # Formatted Word Document
├── Dockerfile                 # Python 3.11 container definition
├── docker-compose.yml         # Container orchestration configuration
└── requirements.txt           # Python dependencies
```

---

## 3. Core Backend Engine Deep-Dive

### 3.1 [backend/data_pipeline.py](file:///c:/SkyguardAI/backend/data_pipeline.py)
Ingests historical Antarctic observations from the IMD Maitri station (1985–2016). Validates telemetry against strict physical boundaries, resolves missing intervals, and computes differential and rolling feature matrices stored in Apache Parquet.
- **Quality Flag Filtering**: Evaluates IMD quality markers and bounds (Temperature: -90°C to +60°C; Pressure: 500 to 1100 hPa).
- **Differential Features**: Computes 1h, 3h, and 6h first-order time derivatives ($\Delta T, \Delta P, \Delta H$).
- **Rolling Statistics**: Evaluates 6-hour and 24-hour moving averages, standard deviations, and min/max envelopes.
- **STL Decomposition**: Isolates 24-hour diurnal seasonal cycles from long-term trends and high-frequency noise.

### 3.2 [backend/detectors.py](file:///c:/SkyguardAI/backend/detectors.py)
1. **Statistical Detector (`statistical_detect`)**: Rolling Z-scores ($|Z| > 3.0$), frozen value detector (zero variance over $\ge 6$ windows), and rate-of-change thresholds.
2. **PyTorch LSTM Autoencoder (`LSTMAutoencoder`)**: 2-layer sequence encoder-decoder trained on 24-hour sliding telemetry windows. Computes per-feature reconstruction Mean Squared Error (MSE).
3. **Isolation Forest (`IsolationForestDetector`)**: Multivariate tree-partitioning algorithm on raw and engineered features.
4. **Detector Comparison (`compare_detectors`)**: Compares outputs across all models with agreement scoring.

### 3.3 [backend/consistency.py](file:///c:/SkyguardAI/backend/consistency.py)
Cross-references flagged station readings with neighboring stations:
- **Haversine Distance**: Calculates great-circle geographic distance between stations.
- **Thermodynamic Lapse-Rate Adjustments**: Normalizes expected temperature ($-6.5^\circ\text{C}/\text{km}$) and pressure ($-11\,\text{hPa}/100\text{m}$) based on elevation differences.
- **Multivariate Mahalanobis Distance**: Evaluates correlated parameter deviations against historical covariance matrices.
- **Fusion & Root-Cause Classification (`fuse_and_classify`)**: Weighted score fusion ($w_{\text{stat}}=0.25, w_{\text{lstm}}=0.35, w_{\text{iso}}=0.20, w_{\text{cons}}=0.20$). Differentiates `sensor_fault` from `genuine_event`.

### 3.4 [backend/explain.py](file:///c:/SkyguardAI/backend/explain.py)
- **SHAP Feature Attribution (`explain_alert`)**: Computes exact feature contribution values ($\phi_i$) for flagged variables.
- **Domain-Grounded Meteorological Narratives**: Automatically transforms model outputs into natural language diagnostic summaries.
- **Sensor Health & RUL Prognostics (`predict_health`)**: Computes a $0 - 100$ health index, degradation trend (`improving`, `stable`, `degrading`), and maintenance timeline forecast.

### 3.5 [backend/simulate.py](file:///c:/SkyguardAI/backend/simulate.py)
Generates synthetic station arrays with spatial correlations and provides field scenario triggers:
- `spike`, `frozen_sensor`, `calibration_drift`, `comms_dropout`, `genuine_event`, and `all`.

---

## 4. REST & SSE Streaming API Reference

| Method | Endpoint | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Returns server health, station count, and alert count |
| `GET` | `/stations` | None | Lists all monitored stations with coordinates and status |
| `GET` | `/alerts` | `status`, `station_id`, `min_severity`, `since`, `limit` | Queries active or historical alerts with filtering |
| `GET` | `/stations/{id}/timeseries` | `hours` (default: 72) | High-resolution telemetry timeseries |
| `GET` | `/sensor-health/{id}` | None | Health index (0-100), trend, and maintenance forecast |
| `GET` | `/explain/{alert_id}` | None | SHAP feature attributions & domain narrative |
| `POST` | `/alerts/{id}/acknowledge` | None | Acknowledges active alert |
| `GET` | `/alerts/stream` | None | Server-Sent Events (SSE) live alert stream |
| `POST` | `/simulate/scenario` | `scenario`, `city` | Triggers synthetic fault scenarios and runs pipeline |

---

## 5. Frontend Dashboard & User Interface

1. **[NetworkOverview.tsx](file:///c:/SkyguardAI/frontend/src/pages/NetworkOverview.tsx)**: Station grid, metrics, status breakdown (Normal, Degrading, Fault).
2. **[LiveAlerts.tsx](file:///c:/SkyguardAI/frontend/src/pages/LiveAlerts.tsx)**: Live SSE alert feed with real-time acknowledgment and severity filters.
3. **[StationDetail.tsx](file:///c:/SkyguardAI/frontend/src/pages/StationDetail.tsx)**: 72-hour multi-variable timeseries visualization for temperature, pressure, and humidity.
4. **[WhyFlagged.tsx](file:///c:/SkyguardAI/frontend/src/pages/WhyFlagged.tsx)**: Explainable AI cockpit with SHAP contribution bar charts and domain narratives.
5. **[SensorHealth.tsx](file:///c:/SkyguardAI/frontend/src/pages/SensorHealth.tsx)**: Prognostics view with circular health score gauge, degradation trend, and maintenance forecast.
6. **[History.tsx](file:///c:/SkyguardAI/frontend/src/pages/History.tsx)**: Searchable alert audit trail with filtering by time, severity, and root cause.

---

## 6. Testing, Verification & Benchmarks

```powershell
pytest tests/ -v
```
- [test_detectors.py](file:///c:/SkyguardAI/tests/test_detectors.py): Validates Z-score detection sensitivity, frozen value flags, and LSTM inference.
- [test_consistency.py](file:///c:/SkyguardAI/tests/test_consistency.py): Validates Haversine spatial calculations, lapse-rate adjustments, and Mahalanobis distance.
- [test_explain.py](file:///c:/SkyguardAI/tests/test_explain.py): Validates SHAP feature attribution and domain narrative generation.
- [evaluate_models.py](file:///c:/SkyguardAI/tests/evaluate_models.py): Precision, recall, and ROC-AUC benchmarks.

---

## 7. Deployment & Setup Guide

### Local Development
```powershell
# 1. Backend Setup
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend Setup
cd frontend
npm install
npm run dev
```

### Docker Deployment
```powershell
docker-compose up --build -d
```
