# 🛰️ SkyguardAI
### Atmospheric Sensor Anomaly Detection, Spatial Consensus & Explainability Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2.0-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

SkyguardAI is an operational atmospheric anomaly detection, spatial consensus fusion, and sensor prognostics platform. It processes high-resolution weather telemetry—including real historical observations from the **IMD Antarctic Maitri Research Station (-70.75°S, 11.74°E)** and distributed meteorological sensor arrays.

---

## 🌟 Key Capabilities

- 🤖 **Multi-Model Anomaly Ensemble**: Combines Statistical Z-scores/STL decomposition, a 2-layer PyTorch LSTM Autoencoder, and Isolation Forest.
- 🌐 **Spatial & Thermodynamic Consensus**: Haversine distance weighting and elevation lapse-rate normalization ($-6.5^\circ\text{C}/\text{km}$, $-11\,\text{hPa}/100\text{m}$) coupled with multivariate Mahalanobis distance.
- 🔍 **Explainable AI (XAI)**: SHAP feature attribution bar charts and automated natural language meteorological domain narratives.
- 🛡️ **Sensor Health Prognostics**: Continuous $0 - 100$ health scoring, degradation trend monitoring, and Remaining Useful Life (RUL) maintenance forecasting.
- 📡 **Real-Time Streaming**: Server-Sent Events (SSE) `/alerts/stream` broadcasting live anomaly events to the dashboard.
- 🗺️ **Geospatial Command Center**: Leaflet DarkMatter map with status-coded animated marker pins and Recharts telemetry graphs.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Ingestion Layer
        A1[IMD Antarctic Maitri Station Dataset] --> DP[Data Pipeline / Feature Engineering]
        A2[Distributed Sensor Array / Scenarios] --> DP
    end

    subgraph Anomaly Detectors
        DP --> D1[Statistical Z-Score & STL Decomposition]
        DP --> D2[2-Layer PyTorch LSTM Autoencoder]
        DP --> D3[Multivariate Isolation Forest]
    end

    subgraph Consensus & Fusion
        D1 & D2 & D3 --> CF[Consistency & Fusion Engine]
        CF -->|Haversine + Lapse Rate + Mahalanobis| SC[Spatial Consensus Filter]
    end

    subgraph Explainability & Prognostics
        SC --> XAI[SHAP Feature Attribution & Domain Narratives]
        SC --> HP[Sensor Health & Maintenance Forecast]
    end

    subgraph Presentation & Streaming
        XAI & HP & SC --> API[FastAPI Backend + SSE Stream]
        API --> FE[React 19 / TypeScript Operations Dashboard]
    end
```

---

## 📂 Repository Layout

```text
SkyguardAI/
├── backend/
│   ├── app.py                 # FastAPI application, route handlers, SSE generator
│   ├── config.py              # Strict domain Enums & CORS config
│   ├── consistency.py         # Spatial Haversine, lapse rate & Mahalanobis fusion
│   ├── data_pipeline.py       # IMD Maitri dataset ingestion & feature engineering
│   ├── detectors.py           # Statistical, LSTM Autoencoder & Isolation Forest models
│   ├── explain.py             # SHAP attributions, narratives & health prognostics
│   ├── simulate.py            # Station network generator & synthetic fault injection
│   └── smoke_test.py          # Quick backend verification script
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar & layout components
│   │   ├── pages/             # NetworkOverview, LiveAlerts, StationDetail, WhyFlagged, Health, History
│   │   ├── api.ts             # Typed REST & SSE EventSource client
│   │   └── index.css          # Design system & glassmorphism styles
│   ├── package.json
│   └── vite.config.ts
├── data/                      # Raw, processed Parquet files & trained model checkpoints
├── tests/                     # Comprehensive test suite (detectors, consistency, explainability)
├── DOCUMENTATION.md           # Full system architecture documentation
├── FRONTEND_ARCHITECTURE.md   # Dedicated frontend & UI structure documentation
├── SkyguardAI_Documentation.docx
├── SkyguardAI_Frontend_Documentation.docx
├── Dockerfile                 # Backend container definition
├── docker-compose.yml         # Container orchestration
└── requirements.txt           # Python dependencies
```

---

## 🚀 Quickstart

### 1. Local Development

#### Backend Setup
```bash
# Clone the repository
git clone https://github.com/<your-username>/SkyguardAI.git
cd SkyguardAI

# Create virtual environment & install dependencies
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt

# Start FastAPI backend
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 2. Docker Deployment

```bash
docker-compose up --build -d
```
- API Base: `http://localhost:8000`
- Health Check: `http://localhost:8000/health`

---

## 🧪 Running Tests

```bash
pytest tests/ -v
```

---

## 📄 Documentation

- Full Platform Architecture: [DOCUMENTATION.md](DOCUMENTATION.md)
- Technology Stack & Methodology: [TECHSTACK.md](TECHSTACK.md)
- UI & Frontend Deep-Dive: [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)
- Microsoft Word Reports: `SkyguardAI_Documentation.docx`, `SkyguardAI_Frontend_Documentation.docx`, & `SkyguardAI_TechStack_Documentation.docx`

