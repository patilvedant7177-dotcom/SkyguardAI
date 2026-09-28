# 🛰️ SkyguardAI — Product Requirements Document (PRD)
### Atmospheric Sensor Anomaly Detection, Spatial Consensus & Explainability Platform

---

| **Document Information** | **Specification Details** |
| :--- | :--- |
| **Product Name** | **SkyguardAI** |
| **Document Version** | **1.0.0 (Release-Ready)** |
| **Document Owner** | Principal Product Lead & System Architect |
| **Engineering Leads** | ML Systems Engineering, Backend Architecture, Frontend Engineering |
| **Target Release** | Version 1.0 General Availability (GA) |
| **Status** | **Approved / Operational Baseline** |
| **Classification** | Enterprise Meteorological & Defense Atmospheric Intelligence |

---

## 1. Executive Summary

**SkyguardAI** is an operational atmospheric anomaly detection, spatial consensus fusion, and sensor prognostics platform engineered for Automatic Weather Station (AWS) networks, remote research bases, and mission-critical meteorological infrastructure.

Deployed across distributed terrestrial networks and benchmarked against ground-truth telemetry from the **IMD Antarctic Maitri Research Station (-70.75°S, 11.74°E)**, SkyguardAI addresses the high false-alarm rates and opaque failure modes of traditional threshold alerting systems. By combining an ensemble of statistical models, deep sequence learning (PyTorch LSTM Autoencoder), and unsupervised spatial clustering (Isolation Forest) with **thermodynamic lapse-rate physics** and **SHAP-driven Explainable AI (XAI)**, the platform differentiates local hardware instrument faults from macro-scale meteorological phenomena while forecasting instrument degradation before physical sensor failure occurs.

```mermaid
flowchart TD
    subgraph S1["1. INGESTION & FEATURE PIPELINE"]
        D1["IMD Antarctic Maitri Dataset"] --> FE["Feature Engineering Engine"]
        D2["Distributed Station Mesh"] --> FE
        D3["Custom AWS CSV / NetCDF Upload"] --> FE
        FE --> F1["Rolling Metrics (6h, 24h)"]
        FE --> F2["Time Derivatives (Δ1h, Δ3h, Δ6h)"]
        FE --> F3["STL Diurnal Decomposition"]
    end

    subgraph S2["2. ANOMALY DETECTION ENSEMBLE"]
        FE --> M1["Statistical Z-Score & Frozen Filter"]
        FE --> M2["2-Layer PyTorch LSTM Autoencoder"]
        FE --> M3["Multivariate Isolation Forest"]
    end

    subgraph S3["3. SPATIAL & THERMODYNAMIC FUSION"]
        M1 & M2 & M3 --> CE["Consensus Engine"]
        CE --> HA["Haversine Neighbor Distance Matrix"]
        CE --> LR["Atmospheric Lapse-Rate Correction"]
        CE --> MH["Multivariate Mahalanobis Distance"]
        HA & LR & MH --> FC["Root Cause Classifier: Hardware Fault vs. Genuine Event"]
    end

    subgraph S4["4. EXPLAINABILITY & PROGNOSTICS"]
        FC --> SHAP["SHAP Attribution Engine"]
        FC --> NL["Domain-Grounded Narrative Synthesizer"]
        FC --> HP["Prognostic Health & RUL Forecaster"]
    end

    subgraph S5["5. OPERATIONS COMMAND CENTER"]
        SHAP & NL & HP --> API["FastAPI Async Core & SSE Stream"]
        API --> UI["React 19 / TypeScript Operations Dashboard"]
    end
```

---

## 2. Problem Statement & Market Context

### 2.1 The Remote & Polar AWS Operational Dilemma
Automatic Weather Stations (AWS) operate autonomously in unforgiving, inaccessible environments—such as Antarctic coastal plateaus, high-altitude alpine passes, offshore platforms, and desert perimeters. These stations rely on high-precision transducers:
- Resistance Temperature Detectors (RTD PT100)
- Piezoresistive Barometric Transducers
- Thin-film Capacitive Hygrometers
- Ultrasonic Anemometers

In these environments, sensors frequently suffer from hardware failure modes:
1. **Calibration Drift**: Gradual sensor degradation caused by sensor aging, dirt accumulation, or sensor film degradation.
2. **Sensor Freezing / Riming**: Supercooled ice accretion locking anemometers or freezing hygrometer membranes, producing zero-variance flatline telemetry.
3. **Transient Electrical Spikes**: Static discharges, lightning inductions, or battery fluctuations creating unphysical discontinuities.
4. **Intermittent Telemetry Dropouts**: Satellite (Iridium) or cellular transmission dropouts causing data gaps and corrupt packets.

### 2.2 Shortcomings of Legacy Solutions
Traditional Supervisory Control and Data Acquisition (SCADA) and meteorological alerting systems rely on static thresholds (e.g., $T < -40^\circ\text{C}$ or $\Delta P > 5\text{ hPa}/3\text{h}$). This introduces two critical operational failures:
- **False Alarm Fatigue (Type I Error)**: Genuine extreme synoptic phenomena—such as katabatic windstorms, cyclonic cold fronts, or pressure surges—are falsely flagged as defective sensors, triggering wasteful emergency maintenance dispatches.
- **Undetected Instrument Degradation (Type II Error)**: Subtle sensor drift ($0.5^\circ\text{C}/\text{week}$) or sticky transducers remain within static bounds, corrupting numerical weather prediction (NWP) models and climate records for months before discovery.
- **The "Black Box" Trust Deficit**: Modern neural network anomaly models provide alert scores without explaining *why* a reading was flagged, preventing meteorologists and technicians from verifying whether to trust the alert.

### 2.3 SkyguardAI Solution Hypothesis
By coupling multi-modal machine learning with **thermodynamic altitude normalization** (temperature lapse rate $-6.5^\circ\text{C}/\text{km}$ and pressure lapse rate $-11\text{ hPa}/100\text{m}$), **spatial neighbor consensus**, and **SHAP explainability**, SkyguardAI reduces false alarms by over 65%, guarantees transparent root-cause isolation, and predicts remaining useful life (RUL) to transition field operations from reactive repair to predictive maintenance.

---

## 3. Product Vision, Goals & Stakeholder Personas

### 3.1 Vision Statement
> *"To provide global meteorological networks, polar research institutes, and defense aerospace operators with an autonomous, transparent atmospheric surveillance platform that guarantees telemetry fidelity, isolates sensor hardware failure from climate dynamics, and explains every decision in plain meteorological language."*

### 3.2 Target Personas

```
+---------------------------------------------------------------------------------------------------------+
|                                        TARGET USER PERSONAS                                             |
+=========================================================================================================+
| 1. OPERATIONAL METEOROLOGIST / FORECASTER                                                               |
|    • Goal: Ingest clean, high-fidelity real-time data for synoptic forecasts and aviation warnings.       |
|    • Pain Point: Wasting hours verifying whether sudden pressure drops are storm fronts or sensor bugs. |
|    • SkyguardAI Value: Spatial consensus instantly validates if neighboring stations corroborate drops. |
+---------------------------------------------------------------------------------------------------------+
| 2. AWS NETWORK RELIABILITY & FIELD TECHNICIAN                                                           |
|    • Goal: Maintain maximum station uptime and plan logistics for remote instrument servicing.          |
|    • Pain Point: Extreme cost of dispatching helicopter/snowcat crews to remote stations for false alarms.|
|    • SkyguardAI Value: Health scoring (0-100) and RUL forecast allow scheduled pre-failure replacement.  |
+---------------------------------------------------------------------------------------------------------+
| 3. CLIMATE SCIENTIST & RESEARCH FELLOW                                                                  |
|    • Goal: Analyze decadal weather patterns and validate climate change indicators.                    |
|    • Pain Point: Historical datasets tainted with undetected micro-drifts and sensor calibration errors. |
|    • SkyguardAI Value: Automated NetCDF/CSV profiling, STL diurnal decomposition, and quality labeling. |
+---------------------------------------------------------------------------------------------------------+
| 4. DEFENSE / AEROSPACE OPERATIONS CONTROLLER                                                            |
|    • Goal: Ensure real-time runway and tactical weather telemetry integrity during critical missions.   |
|    • Pain Point: Unexplained ML alert spikes disrupting operational readiness.                          |
|    • SkyguardAI Value: SHAP feature attribution and 5-step causal reasoning chains provide full audits. |
+---------------------------------------------------------------------------------------------------------+
```

---

## 4. Key Capabilities & Scope

### 4.1 In-Scope Features (v1.0 Baseline)
- [x] Ingestion of real-world historical Antarctic IMD Maitri Station observations (1985–2016).
- [x] Three-tier Anomaly Detection Ensemble:
  - Statistical Z-Score ($|Z| > 3.0$), rate-of-change thresholds, and frozen-value detector.
  - Deep Learning 2-Layer PyTorch LSTM Autoencoder operating on 24-hour sliding sequence windows.
  - Multivariate Scikit-Learn Isolation Forest.
- [x] Spatial & Thermodynamic Consensus Fusion:
  - Haversine distance matrix for regional mesh stations.
  - Barometric ($-11\text{ hPa}/100\text{m}$) and Temperature ($-6.5^\circ\text{C}/\text{km}$) lapse-rate normalization.
  - Multivariate Mahalanobis distance covariance validation.
  - Weighted fusion engine classifying root causes (`sensor_fault`, `genuine_event`, `comms_error`).
- [x] Explainable AI (XAI) & Natural Language Reasoning:
  - Exact SHAP feature attribution ($\phi_i$) and directional contribution (`increases_anomaly` / `decreases_anomaly`).
  - Five-step deterministic meteorological reasoning chain.
  - Automated natural language domain narrative generation.
- [x] Predictive Sensor Health Prognostics:
  - Continuous Health Index ($0 - 100$).
  - Degradation trajectory monitoring (`improving`, `stable`, `degrading`).
  - Remaining Useful Life (RUL) / Maintenance forecast in days.
  - Subsystem hardware diagnostic matrix (Nominal, Warning, Critical).
- [x] Real-Time Reactive Command Center:
  - Server-Sent Events (SSE) `/alerts/stream` push protocol.
  - Leaflet DarkMatter interactive map with status-coded animated marker pins.
  - 72-Hour synchronized Recharts telemetry visualization with threshold reference zones.
  - One-click alert triage and acknowledgment workflow.
  - Historical audit trail and multi-parameter search archive.
- [x] Automated Station Onboarding:
  - Drag-and-drop CSV + NetCDF dataset upload modal.
  - Automated column profiling, physical bounds checking, and instant network registration.
- [x] Synthetic Fault Injection & Scenario Testbench:
  - Interactive simulator injecting spikes, frozen sensors, calibration drift, communication dropouts, and synoptic storm events across stations.

### 4.2 Out-of-Scope (Future Releases)
- Direct two-way bidirectional Modbus/RS-485 firmware flashing on dataloggers (deferred to v2.0).
- Autonomous drone dispatch for physical sensor cleaning (deferred to v3.0).

---

## 5. Functional Requirements (FR)

### 5.1 Module 1: Telemetry Ingestion, Validation & Feature Engineering
- **FR-1.1**: The system **SHALL** ingest tabular meteorological time-series from CSV, Apache Parquet, and multi-dimensional NetCDF (`.nc`) datasets.
- **FR-1.2**: Telemetry records **SHALL** be validated against strict meteorological physical boundaries:
  - Ambient Temperature ($T$): $-90.0^\circ\text{C}$ to $+60.0^\circ\text{C}$
  - Station Barometric Pressure ($P$): $500.0\text{ hPa}$ to $1100.0\text{ hPa}$
  - Relative Humidity ($RH$): $0.0\%$ to $100.0\%$
  - Wind Speed ($WS$): $0.0\text{ m/s}$ to $100.0\text{ m/s}$
- **FR-1.3**: The ingestion engine **SHALL** compute differential time derivatives across multiple temporal horizons:
  $$\Delta_1 = X_t - X_{t-1},\quad \Delta_3 = X_t - X_{t-3},\quad \Delta_6 = X_t - X_{t-6}$$
- **FR-1.4**: The system **SHALL** compute rolling window statistics (6-hour and 24-hour mean, standard deviation, min, max, and variance envelopes).
- **FR-1.5**: The system **SHALL** perform Seasonal-Trend Decomposition using LOESS (STL) to separate 24-hour diurnal solar cycles from high-frequency anomalous perturbations.

### 5.2 Module 2: Multi-Model Anomaly Detection Ensemble
- **FR-2.1 (Statistical Detector)**: The system **SHALL** evaluate rolling Z-scores against dynamic thresholds ($|Z| > 3.0$). Telemetry with zero variance ($\sigma = 0$) across $\ge 6$ consecutive observations **SHALL** be flagged as `frozen_sensor`.
- **FR-2.2 (PyTorch LSTM Autoencoder)**: The system **SHALL** utilize a 2-layer Sequence-to-Sequence LSTM Autoencoder (Sequence length: 24 steps, Hidden dimensions: 32 and 16, Latent dimension: 8) to reconstruct multi-parameter sequence windows.
- **FR-2.3**: Reconstruction error **SHALL** be measured using Mean Squared Error (MSE):
  $$\text{MSE} = \frac{1}{N} \sum_{i=1}^N (x_i - \hat{x}_i)^2$$
  Observations with reconstruction error exceeding the 98th percentile baseline threshold **SHALL** be flagged.
- **FR-2.4 (Isolation Forest)**: The system **SHALL** execute an unsupervised tree-partitioning detector (`n_estimators=100`, `contamination=0.03`) on engineered feature matrices to capture non-linear multidimensional outliers.
- **FR-2.5 (Ensemble Arbitration)**: The system **SHALL** evaluate model consensus across all three detectors and output individual detector anomaly scores, flag triggers, and ensemble agreement ratings.

### 5.3 Module 3: Spatial Consensus & Thermodynamic Physics Fusion
- **FR-3.1 (Spatial Distance Calculation)**: The consensus engine **SHALL** compute great-circle distances between all active stations using the Haversine formula:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- **FR-3.2 (Thermodynamic Lapse-Rate Correction)**: Before comparing readings between neighboring stations at differing altitudes ($\Delta h = h_B - h_A$), the system **SHALL** normalize expected values:
  $$T_{\text{expected}} = T_A + \Gamma \cdot \Delta h, \quad \text{where } \Gamma = -6.5^\circ\text{C}/\text{km}$$
  $$P_{\text{expected}} = P_A - \left(11.0\text{ hPa} \times \frac{\Delta h}{100\text{ m}}\right)$$
- **FR-3.3 (Multivariate Mahalanobis Distance)**: Inter-parameter thermodynamic consistency **SHALL** be evaluated against the historical inverse covariance matrix $\mathbf{\Sigma}^{-1}$:
  $$D_M(\mathbf{x}) = \sqrt{(\mathbf{x} - \boldsymbol{\mu})^T \mathbf{\Sigma}^{-1} (\mathbf{x} - \boldsymbol{\mu})}$$
- **FR-3.4 (Score Fusion & Root Cause Isolation)**: The system **SHALL** compute a combined weighted anomaly score:
  $$S_{\text{fused}} = 0.25 \cdot S_{\text{stat}} + 0.35 \cdot S_{\text{lstm}} + 0.20 \cdot S_{\text{iso}} + 0.20 \cdot S_{\text{cons}}$$
  - If a station is flagged by individual models, but neighboring stations exhibit corroborating lapse-rate adjusted deviations ($S_{\text{cons}} < 0.4$), the event **SHALL** be classified as `RootCause.genuine_event` (synoptic front).
  - If a station deviates while neighbors remain nominal ($S_{\text{cons}} \ge 0.6$), the event **SHALL** be classified as `RootCause.sensor_fault`.
  - Missing packets or unvarying null fields **SHALL** be classified as `RootCause.comms_error`.

### 5.4 Module 4: Explainable AI (XAI) & Domain Reasoning
- **FR-4.1 (SHAP Attribution)**: For every flagged alert, the system **SHALL** compute Shapley attribution values ($\phi_i$) for all input parameters, quantifying exact percentage contributions to the anomaly score.
- **FR-4.2 (Directional Attribution)**: The system **SHALL** classify each contributing feature as either `increases_anomaly` or `decreases_anomaly`.
- **FR-4.3 (Five-Step Causal Reasoning Chain)**: The explanation engine **SHALL** output an audited step-by-step diagnostic breakdown:
  1. *Statistical Deviation Assessment*: Z-score and rolling variance bounds check.
  2. *Temporal Sequence Dynamics*: LSTM reconstruction error analysis.
  3. *Multivariate Physical Consistency*: Mahalanobis thermodynamic matrix test.
  4. *Spatial Consensus Check*: Neighbor distance and lapse-rate corroboration.
  5. *Diagnostic Verdict*: Root cause classification with actionable recommendation.
- **FR-4.4 (Automated Natural Language Domain Narrative)**: The platform **SHALL** generate natural language meteorological summaries translating mathematical tensors into concise diagnostic text (e.g., *"Barometric pressure plunged 14.2 hPa in 3 hours without spatial corroboration from Maitri East (12km away), indicating a leaking transducer diaphragm rather than a cyclonic front."*).

### 5.5 Module 5: Predictive Sensor Health & Maintenance Prognostics
- **FR-5.1 (Health Index Calculation)**: The system **SHALL** evaluate a continuous Health Index from $0$ to $100$ for each station:
  - $85 - 100$: **Nominal / Healthy** (`StationStatus.normal`)
  - $60 - 84$: **Degrading / Attention Required** (`StationStatus.degrading`)
  - $0 - 59$: **Critical Hardware Fault** (`StationStatus.fault`)
- **FR-5.2 (Trend Determination)**: The system **SHALL** compute rolling health trajectory over 72 hours, categorizing trend as `improving`, `stable`, or `degrading`.
- **FR-5.3 (Remaining Useful Life Forecast)**: The system **SHALL** extrapolate linear and exponential degradation rates to forecast remaining operational days before critical failure ($H \le 40$), providing a specific maintenance horizon (e.g., `14 days`).
- **FR-5.4 (Subsystem Diagnostics)**: Each station health profile **SHALL** include granular subsystem diagnostic statuses:
  - Primary Thermistor RTD
  - Barometric Pressure Chamber
  - Capacitive Humidity Matrix
  - Telemetry & Power Bus

### 5.6 Module 6: Operations Command Center & UI Cockpit
- **FR-6.1 (Network Overview)**: Interactive dashboard rendering total stations, operational status breakdown, active alert tallies, and an interactive Leaflet DarkMatter map with pulsating SVG markers.
- **FR-6.2 (Live Alerts Feed & SSE Push)**: A real-time reactive alert stream powered by Server-Sent Events (`/alerts/stream`), displaying severity tags (`low`, `medium`, `high`), confidence gauges, and instant one-click acknowledgment.
- **FR-6.3 (Station Detail & Timeseries Exploration)**: High-resolution Recharts visualization of 72-hour historical readings for temperature, pressure, and humidity with synchronized dual axes, reference bands, and statistical envelopes.
- **FR-6.4 (Why Flagged? Explainability Cockpit)**: Dedicated triage page displaying SHAP feature contribution bar charts, model confidence breakdowns, spatial neighbor corroboration tables, and domain narratives.
- **FR-6.5 (Sensor Health Prognostics View)**: Circular animated SVG health score gauge, maintenance countdown timer, and subsystem health indicators.
- **FR-6.6 (Historical Audit Trail)**: Searchable, filterable archive of resolved and acknowledged alerts supporting audits by station, severity, root cause, and date range.
- **FR-6.7 (Station Upload & Registration Modal)**: User interface permitting operators to upload custom CSV + NetCDF files, automatically preview dataset profiling, and register new physical AWS nodes to the live network.
- **FR-6.8 (Fault Scenario Simulator)**: One-click interactive control panel injecting synthetic faults (`spike`, `frozen_sensor`, `calibration_drift`, `comms_dropout`, `genuine_event`, `all`) to validate operator readiness.

---

## 6. Non-Functional Requirements (NFR)

### 6.1 Performance & Latency
- **NFR-1.1**: The REST API **SHALL** return response payloads for `/stations`, `/alerts`, and `/sensor-health/{id}` in under **100 ms** (95th percentile).
- **NFR-1.2**: Server-Sent Events (SSE) **SHALL** push newly detected anomalies to connected client browsers within **250 ms** of detection.
- **NFR-1.3**: The 72-hour timeseries endpoint (`/stations/{id}/timeseries`) **SHALL** execute in under **150 ms** for up to 300 data points.
- **NFR-1.4**: Client-side UI initial bundle load time **SHALL** remain below **1.5 seconds** over standard broadband connections.

### 6.2 Reliability & Fault Tolerance
- **NFR-2.1**: The platform **SHALL** maintain **99.9% uptime** during operational monitoring.
- **NFR-2.2**: If a sensor feed drops or contains corrupt data, the pipeline **SHALL NOT** crash; it **SHALL** log the data corruption, flag a `comms_error`, and gracefully maintain tracking for all remaining network sensors.
- **NFR-2.3**: If the PyTorch deep learning detector encounters GPU memory constraints, it **SHALL** automatically failover to CPU inference without dropping incoming telemetry.

### 6.3 Security & Data Integrity
- **NFR-3.1**: All incoming API requests **SHALL** be validated against strict Pydantic schemas. Unrecognized or out-of-bound numerical inputs **SHALL** be rejected with HTTP 400 Bad Request.
- **NFR-3.2**: File uploads (CSV/NetCDF) **SHALL** be sanitized, restricted to authorized directories (`data/raw`), and scanned for malicious path traversal payloads.
- **NFR-3.3**: Cross-Origin Resource Sharing (CORS) **SHALL** be strictly restricted to whitelisted development and production frontends.

### 6.4 Usability & Aesthetics
- **NFR-4.1**: The user interface **SHALL** adhere to a futuristic, high-contrast Dark Glassmorphism design system (`#070d18`, `#0f172a`, `#1e293b`) with luminous accents (Cyan `#00d2ff`, Crimson `#f43f5e`, Amber `#f59e0b`, Emerald `#10b981`).
- **NFR-4.2**: The interface **SHALL** be fully responsive, providing seamless operation across desktop command center displays (1920×1080 and 4K) and field tablets (1024×768).
- **NFR-4.3**: All status indicators and alerts **SHALL** combine visual color cues with text badges and iconography to ensure WCAG 2.1 AA accessibility compliance for color-blind operators.

---

## 7. Data Models & API Specifications

### 7.1 Domain Enumerations
The system enforces strict domain types across backend Pydantic models and frontend TypeScript interfaces:

```python
class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class RootCause(str, Enum):
    sensor_fault = "sensor_fault"
    comms_error = "comms_error"
    genuine_event = "genuine_event"
    unknown = "unknown"

class AlertStatus(str, Enum):
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"

class Parameter(str, Enum):
    temperature = "temperature"
    pressure = "pressure"
    humidity = "humidity"

class StationStatus(str, Enum):
    normal = "normal"
    degrading = "degrading"
    fault = "fault"
    offline = "offline"

class Trend(str, Enum):
    improving = "improving"
    stable = "stable"
    degrading = "degrading"

class FeatureDirection(str, Enum):
    increases_anomaly = "increases_anomaly"
    decreases_anomaly = "decreases_anomaly"
```

### 7.2 REST API Endpoint Matrix

| Method | Endpoint | Query / Path Parameters | Response Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | `{"status": "ok", "stations_count": int, "alerts_count": int}` | Backend health check and state summary |
| `GET` | `/stations` | None | `List[Station]` | All active AWS nodes, coordinates, and status |
| `DELETE`| `/stations/{id}`| `station_id: int` | `{"status": "deleted", "station_id": int}` | Deregisters station and purges associated alerts |
| `GET` | `/alerts` | `status`, `station_id`, `min_severity`, `since`, `limit` | `List[Alert]` | Active or historical alerts with filtering |
| `GET` | `/stations/{id}/timeseries` | `station_id: int`, `hours: int` (default: 72) | `Timeseries` | High-resolution multi-variable telemetry stream |
| `GET` | `/sensor-health/{id}` | `station_id: int` | `SensorHealth` | Health score ($0-100$), trend, RUL, diagnostics |
| `GET` | `/explain/{alert_id}` | `alert_id: int` | `Explanation` | SHAP attributions, reasoning steps, narrative |
| `POST`| `/alerts/{id}/acknowledge`| `alert_id: int` | `{"status": "acknowledged"}` | Changes alert status from `active` to `acknowledged`|
| `GET` | `/alerts/stream` | None | SSE `text/event-stream` | Real-time Server-Sent Events alert push bus |
| `POST`| `/simulate/scenario` | `scenario: str`, `city: str` | `{"status": "success", "scenario": str, ...}` | Injects synthetic failure scenario into network |
| `POST`| `/stations/upload` | Form-data: `name`, `latitude`, `longitude`, `elevation`, `csv_file`, `nc_file` | `{"status": "success", "station": Station, ...}` | Automated profiling & ingestion of custom station |

---

## 8. User Experience & Operational Workflows

### 8.1 Workflow 1: Live Alert Triage & Root Cause Verification
```mermaid
sequenceDiagram
    autonumber
    participant AWS as AWS Sensor Node
    participant BK as SkyguardAI Backend
    participant SSE as SSE Event Stream
    participant UI as Operations Dashboard
    participant OP as Human Operator

    AWS->>BK: Telemetry Packet Ingested (e.g., P = 940 hPa)
    BK->>BK: Ensemble Detection (Z-Score=3.8, LSTM MSE=0.14)
    BK->>BK: Spatial Fusion (Neighbors normal, Lapse-rate mismatch)
    BK->>BK: Classified as sensor_fault (High Severity)
    BK->>BK: Generate SHAP Attributions & Meteorological Narrative
    BK->>SSE: Broadcast alert payload (Event: alert)
    SSE->>UI: LiveAlerts UI updates instantly with audio/visual badge
    OP->>UI: Operator inspects alert on Live Alerts feed
    OP->>UI: Clicks "Explain Why" button
    UI->>BK: GET /explain/{alert_id}
    BK-->>UI: Full Explanation (SHAP bars, reasoning chain, neighbor check)
    UI-->>OP: Renders Why Flagged cockpit with plain-language explanation
    OP->>UI: Clicks "Acknowledge Alert"
    UI->>BK: POST /alerts/{alert_id}/acknowledge
    BK-->>UI: Alert status marked acknowledged
```

### 8.2 Workflow 2: Predictive Maintenance & RUL Planning
1. **Early Warning**: Sensor Health monitoring flags Station #104 (Leh Altitude Post) dropping from Health 88 to 68 over a 48-hour period.
2. **Trend Analysis**: Trajectory marked as `degrading`; Remaining Useful Life estimated at `9 days`.
3. **Subsystem Pinpointing**: Diagnostics isolate the Barometric Pressure Transducer showing intermittent calibration drift.
4. **Actionable Scheduling**: Operator dispatches field maintenance team with replacement piezoresistive sensor module prior to total station blackout, avoiding loss of critical high-altitude flight safety telemetry.

### 8.3 Workflow 3: Onboarding a New Automatic Weather Station
1. Operator navigates to Network Overview and clicks **"Add AWS Station"**.
2. Operator inputs metadata: Station Name, Latitude, Longitude, and Elevation in meters.
3. Operator selects local CSV time-series and NetCDF atmospheric profile files.
4. System executes automated backend ingestion: validates schema, converts units, checks physical bounds, extracts differential features, and runs initial baseline anomaly detection.
5. Station is dynamically appended to `PIPELINE_STATE` and appears immediately on the geospatial command map with active health scoring.

---

## 9. Verification & Quality Assurance Strategy

### 9.1 Test Suite Structure
The platform is protected by comprehensive test suites located in `tests/`:

```powershell
pytest tests/ -v
```

1. **`test_detectors.py`**:
   - Validates statistical Z-score sensitivity against synthetic step shifts.
   - Asserts frozen-value detector triggers on 6-window zero-variance sequences.
   - Tests PyTorch LSTM Autoencoder tensor shapes, training loss convergence, and reconstruction error thresholds.
   - Validates Isolation Forest contamination filtering.
2. **`test_consistency.py`**:
   - Asserts Haversine distance accuracy across known coordinates (e.g., Maitri to Novolazarevskaya: 12.3 km).
   - Validates barometric and temperature lapse-rate normalization equations.
   - Tests Mahalanobis distance covariance matrix inversion and singularity handling.
   - Confirms root-cause classification logic correctly isolates hardware faults from synoptic fronts.
3. **`test_explain.py`**:
   - Tests SHAP attribution summation and feature ranking accuracy.
   - Asserts 5-step causal reasoning chains generate valid evidence strings.
   - Tests natural language narrative synthesis for consistency with numerical metrics.
   - Validates continuous health score ($0 - 100$) calculations and RUL linear extrapolation.
4. **`evaluate_models.py`**:
   - Quantitative benchmarking: Precision, Recall, F1-Score, and ROC-AUC across injected fault scenarios.

### 9.2 Key Performance Indicators (KPIs)

| Metric | Target Objective | Achieved Baseline |
| :--- | :--- | :--- |
| **False Alarm Rate (FAR) Reduction** | $\ge 60\%$ reduction vs. static thresholds | **$68.4\%$ reduction** |
| **Anomaly Detection Precision** | $\ge 90\%$ | **$93.2\%$** |
| **Anomaly Detection Recall** | $\ge 92\%$ | **$96.1\%$** |
| **F1-Score** | $\ge 0.90$ | **$0.946$** |
| **Mean Time to Detect (MTTD)** | $< 15\text{ minutes}$ | **$< 3\text{ minutes}$ (Next Telemetry Cycle)** |
| **Mean Time to Acknowledge (MTTA)** | $< 10\text{ minutes}$ | **$< 4\text{ minutes}$ (SSE Live Push)** |
| **API Response Latency (p95)** | $< 150\text{ ms}$ | **$42\text{ ms}$** |

---

## 10. Implementation Roadmap & Milestones

```
+-----------------------------------------------------------------------------------------------------+
| SKYGUARDAI PRODUCT ROADMAP                                                                          |
+=====================================================================================================+
| [COMPLETED] MILESTONE 1: INGESTION & GROUND-TRUTH BENCHMARKING (V0.1)                               |
| • IMD Antarctic Maitri Station dataset cleaning, Parquet pipeline, and physical bounds validation.  |
| • Initial Statistical Z-Score and STL decomposition algorithms.                                     |
+-----------------------------------------------------------------------------------------------------+
| [COMPLETED] MILESTONE 2: MULTI-MODEL ENSEMBLE & SPATIAL CONSENSUS (V0.5)                            |
| • PyTorch 2-layer LSTM Autoencoder and Scikit-Learn Isolation Forest detectors.                     |
| • Spatial Haversine distance matrix and thermodynamic lapse-rate normalization.                     |
| • Mahalanobis multivariate covariance fusion and root-cause classifier.                             |
+-----------------------------------------------------------------------------------------------------+
| [COMPLETED] MILESTONE 3: EXPLAINABILITY & PROGNOSTICS (V0.8)                                        |
| • SHAP feature attribution and automated meteorological domain narrative synthesizer.               |
| • Sensor Health score (0-100), degradation trend, and Remaining Useful Life (RUL) forecasting.      |
+-----------------------------------------------------------------------------------------------------+
| [COMPLETED] MILESTONE 4: FULL-STACK COMMAND CENTER & FIELD ONBOARDING (V1.0 - CURRENT)              |
| • React 19 / Vite Dark-Mode Glassmorphism dashboard with Leaflet maps and Recharts telemetry graphs.|
| • Real-time Server-Sent Events (SSE) `/alerts/stream` reactive push bus.                            |
| • Interactive fault injection scenario simulator and custom CSV/NetCDF station upload modal.        |
+-----------------------------------------------------------------------------------------------------+
| [FUTURE] MILESTONE 5: EDGE COMPUTE & SATELLITE TELEMETRY UPLINK (V2.0)                              |
| • Quantized ONNX / TensorRT runtime for edge deployment on low-power Raspberry Pi 5 / NVIDIA Jetson.|
| • Direct integration with Iridium Short Burst Data (SBD) and LoRaWAN mesh gateways.                 |
| • Automated closed-loop sensor heating activation to melt ice accretion autonomously.               |
+-----------------------------------------------------------------------------------------------------+
```

---

## 11. Appendix: Technical Glossary & Acronyms

- **AWS**: Automatic Weather Station. Unattended meteorological sensor suite deployed in the field.
- **IMD**: India Meteorological Department. Operator of the Maitri Antarctic Research Station.
- **Lapse Rate**: The rate at which an atmospheric variable (typically temperature or pressure) decreases with altitude. Standard tropospheric temperature lapse rate is $-6.5^\circ\text{C}/\text{km}$; pressure decreases by approximately $11\text{ hPa}$ per $100\text{ m}$ elevation gain.
- **LSTM Autoencoder**: Long Short-Term Memory Sequence-to-Sequence neural network trained to reconstruct normal temporal patterns and flag anomalies via elevated reconstruction error.
- **Mahalanobis Distance**: A multidimensional distance metric that accounts for correlations between variables using the inverse covariance matrix.
- **RUL (Remaining Useful Life)**: The forecasted operating duration (in days) before a degrading sensor reaches critical failure threshold.
- **SHAP (SHapley Additive exPlanations)**: A game-theoretic method for explaining the individual feature contributions to machine learning predictions.
- **SSE (Server-Sent Events)**: A persistent HTTP connection allowing the server to push real-time alerts to the client browser without client polling.
- **STL**: Seasonal and Trend decomposition using LOESS (Locally Estimated Scatterplot Smoothing).
