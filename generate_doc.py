import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_styled_document():
    doc = docx.Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
    
    # Color Palette: Deep Navy (#0F2027), Cyan/Teal (#0083B0, #00B4DB), Charcoal (#2C3E50), Neutral Light (#F4F7F6)
    COLOR_PRIMARY = RGBColor(15, 32, 39)
    COLOR_ACCENT = RGBColor(0, 131, 176)
    COLOR_DARK = RGBColor(44, 62, 80)
    COLOR_GRAY = RGBColor(100, 110, 120)
    
    # Set default style font
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Segoe UI'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = COLOR_DARK
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # COVER / HEADER TITLE
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(20)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("🛰️ SkyguardAI")
    run_title.font.name = 'Segoe UI'
    run_title.font.size = Pt(28)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run("Atmospheric Anomaly Detection, Spatial Consensus & Prognostics Platform")
    run_sub.font.name = 'Segoe UI'
    run_sub.font.size = Pt(14)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_ACCENT

    # Metadata banner table
    meta_table = doc.add_table(rows=1, cols=3)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Platform Version", "v1.0.0 (Production)"),
        ("Architecture", "FastAPI + PyTorch + React/TS"),
        ("Dataset Support", "IMD Maitri + Spatial Networks")
    ]
    
    for i, (k, v) in enumerate(meta_data):
        cell = meta_table.rows[0].cells[i]
        set_cell_background(cell, "F0F4F8")
        set_cell_margins(cell, top=140, bottom=140, left=160, right=160)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        r_k = p.add_run(f"{k}\n")
        r_k.font.size = Pt(8.5)
        r_k.font.bold = True
        r_k.font.color.rgb = COLOR_GRAY
        r_v = p.add_run(v)
        r_v.font.size = Pt(9.5)
        r_v.font.bold = True
        r_v.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Segoe UI Semibold'
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Segoe UI Semibold'
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_ACCENT
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.font.bold = True
            r_b.font.color.rgb = COLOR_DARK
        p.add_run(text)
        return p

    def add_callout(text, title="NOTE"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.rows[0].cells[0]
        set_cell_background(cell, "EBF3FA")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        rt = p.add_run(f"[{title}] ")
        rt.font.bold = True
        rt.font.color.rgb = COLOR_ACCENT
        p.add_run(text)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    def add_code_block(code_text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.rows[0].cells[0]
        set_cell_background(cell, "F4F5F7")
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(code_text)
        run.font.name = 'Consolas'
        run.font.size = Pt(9.0)
        run.font.color.rgb = RGBColor(30, 40, 50)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # 1. EXECUTIVE SUMMARY & SYSTEM OVERVIEW
    # -------------------------------------------------------------
    add_h1("1. Executive Summary & System Overview")
    doc.add_paragraph(
        "SkyguardAI is a state-of-the-art atmospheric intelligence platform engineered to detect anomalies, isolate hardware faults, "
        "verify spatial-temporal consensus, and explain decisions in real-time. It operates on high-resolution meteorological telemetry, "
        "including ground-truth observations from the IMD Maitri Antarctic Research Station (-70.75°S, 11.74°E) and distributed sensor networks."
    )
    doc.add_paragraph(
        "The core innovation is a multi-tier consensus and explainability architecture: raw sensor data is filtered by an ensemble of "
        "statistical, deep learning, and unsupervised detectors, validated against physical lapse rates and spatial neighbors via Haversine "
        "and Mahalanobis distances, and translated into transparent SHAP attributions and human-readable meteorological narratives."
    )
    
    add_callout(
        "Key Operational Principle: SkyguardAI strictly differentiates between single-station sensor faults (e.g., drift, spikes, frozen readings) "
        "and coherent regional meteorological phenomena (e.g., passing cold fronts, cyclonic depressions) using altitude-corrected neighbor consensus.",
        "CORE CAPABILITY"
    )

    # -------------------------------------------------------------
    # 2. SYSTEM ARCHITECTURE & REPOSITORY TOPOLOGY
    # -------------------------------------------------------------
    add_h1("2. System Architecture & Repository Layout")
    doc.add_paragraph(
        "The project follows a clean separation of concerns between raw data ingestion, machine learning inference, spatial consensus logic, "
        "FastAPI REST/SSE streaming endpoints, and a responsive React/TypeScript operational dashboard."
    )

    # Directory Table
    dir_table = doc.add_table(rows=1, cols=3)
    dir_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    dir_headers = ["Module / File", "Layer", "Function & Responsibilities"]
    for i, h in enumerate(dir_headers):
        cell = dir_table.rows[0].cells[i]
        set_cell_background(cell, "0F2027")
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9.5)

    dir_rows = [
        ("backend/app.py", "API & Orchestration", "FastAPI application, route handlers, SSE stream generator, and pipeline state."),
        ("backend/config.py", "Domain Enums", "Strict Enums (Severity, RootCause, Parameter, StationStatus) and CORS."),
        ("backend/data_pipeline.py", "Data Engineering", "IMD Maitri NetCDF/CSV parser, quality flag cleaner, diurnal STL features."),
        ("backend/detectors.py", "ML / Detection", "Statistical Z-score/frozen checks, 2-layer PyTorch LSTM Autoencoder, Isolation Forest."),
        ("backend/consistency.py", "Spatial Consensus", "Haversine distance, altitude lapse-rate corrections, and Mahalanobis fusion."),
        ("backend/explain.py", "XAI & Prognostics", "SHAP feature attribution, domain meteorological narrative generation, and health forecast."),
        ("backend/simulate.py", "Simulation Engine", "Spatial station network generator, physical diurnal synthesizer, and fault injector."),
        ("frontend/src/pages/", "User Interface", "6 operational views: Network Overview, Live Alerts, Station Detail, Why Flagged, Health, History."),
        ("tests/", "Verification", "Comprehensive unit, integration, and ML benchmark evaluation test suite."),
        ("Dockerfile & Compose", "Deployment", "Containerized Python 3.11 backend with automated healthchecks.")
    ]

    for row in dir_rows:
        r_cells = dir_table.add_row().cells
        for idx, text in enumerate(row):
            set_cell_background(r_cells[idx], "FFFFFF" if len(dir_table.rows) % 2 == 0 else "F9FAFC")
            set_cell_margins(r_cells[idx], top=80, bottom=80, left=100, right=100)
            p = r_cells[idx].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.add_run(text).font.size = Pt(9.0)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 3. CORE BACKEND MODULES DEEP-DIVE
    # -------------------------------------------------------------
    add_h1("3. Core Backend Engine Deep-Dive")
    
    add_h2("3.1 Data Pipeline & Feature Engineering (backend/data_pipeline.py)")
    doc.add_paragraph(
        "Ingests historical Antarctic observations from the IMD Maitri station (1985-2016). Validates telemetry against strict physical boundaries, "
        "resolves missing intervals, and computes differential and rolling feature matrices stored in Apache Parquet."
    )
    add_bullet("Quality Flag Filtering: Evaluates IMD quality markers and bounds (Temperature: -90°C to +60°C; Pressure: 500 to 1100 hPa).", "• ")
    add_bullet("Differential Features: Computes 1h, 3h, and 6h first-order time derivatives to capture rapid barometric drops and thermal swings.", "• ")
    add_bullet("Rolling Statistics: Evaluates 6-hour and 24-hour moving averages, rolling standard deviations, and min/max envelopes.", "• ")
    add_bullet("STL Decomposition: Separates diurnal 24-hour seasonal cycles from long-term climate trends and high-frequency noise.", "• ")

    add_h2("3.2 Anomaly Detector Ensemble (backend/detectors.py)")
    doc.add_paragraph("SkyguardAI combines three complementary detector paradigms to guarantee high precision across diverse fault modes:")
    
    add_bullet(
        "Statistical Detector (statistical_detect): Computes dynamic rolling Z-scores (|Z| > 3.0), checks for stuck/frozen sensor values "
        "(zero variance over >=6 observation cycles), and flags rate-of-change limit violations.",
        "1. "
    )
    add_bullet(
        "PyTorch LSTM Autoencoder (LSTMAutoencoder): A 2-layer sequence encoder-decoder trained on 24-hour sliding telemetry windows. "
        "Anomalies are detected when reconstruction Mean Squared Error (MSE) across temperature, pressure, and humidity exceeds baseline thresholds.",
        "2. "
    )
    add_bullet(
        "Isolation Forest (IsolationForestDetector): Multivariate tree-partitioning algorithm trained on combined raw and engineered features "
        "to isolate anomalous subspaces without requiring labeled training datasets.",
        "3. "
    )

    add_h2("3.3 Spatial Consistency & Consensus Engine (backend/consistency.py)")
    doc.add_paragraph(
        "Prevents false alarms by cross-referencing flagged station readings with neighboring stations using geographic and thermodynamic models:"
    )
    add_bullet(
        "Haversine Spatial Weighting: Calculates great-circle geographic distance between stations to establish dynamic neighbor influence weights.",
        "• "
    )
    add_bullet(
        "Thermodynamic Lapse-Rate Adjustments: Normalizes station temperature (-6.5°C/km) and barometric pressure (-11 hPa/100m) based on elevation differences.",
        "• "
    )
    add_bullet(
        "Multivariate Mahalanobis Distance: Evaluates correlated parameter deviations against historical covariance matrices to detect impossible physical combinations.",
        "• "
    )
    add_bullet(
        "Fusion & Root-Cause Classification (fuse_and_classify): Weighted fusion of all detector scores. If an anomaly is isolated to a single station "
        "while neighbors remain normal, it is classified as 'sensor_fault'. If neighbors exhibit consistent synchronized changes, it is classified as 'genuine_event'.",
        "• "
    )

    add_h2("3.4 Explainability & Prognostics (backend/explain.py)")
    add_bullet(
        "SHAP Feature Attribution (explain_alert): Quantifies exact positive and negative feature contributions driving the anomaly score, "
        "enabling operators to inspect which sensor channel triggered the event.",
        "• "
    )
    add_bullet(
        "Domain-Grounded Meteorological Narratives: Automatically transforms mathematical model outputs into plain English diagnostic reports "
        "(e.g., 'Sudden pressure drop of -8.4 hPa/hr coupled with steady temperature indicates approaching cold front rather than sensor malfunction').",
        "• "
    )
    add_bullet(
        "Sensor Health & RUL Prognostics (predict_health): Produces a continuous health index (0 to 100) based on cumulative reconstruction drift, "
        "spike frequencies, and signal noise. Computes Remaining Useful Life (RUL) and maintenance recommendations.",
        "• "
    )

    add_h2("3.5 Scenario Simulation & Fault Injection (backend/simulate.py)")
    doc.add_paragraph(
        "Generates realistic synthetic station arrays with spatial correlations and provides field scenario triggers for testing and demonstration:"
    )
    add_bullet("spike: Injects transient high-amplitude single-step anomalies.", "• ")
    add_bullet("frozen_sensor: Simulates stuck analog-to-digital converters with zero signal variance.", "• ")
    add_bullet("calibration_drift: Injects progressive linear sensor bias drift.", "• ")
    add_bullet("comms_dropout: Simulates intermittent network packet loss and telemetry nulls.", "• ")
    add_bullet("genuine_event: Injects synchronized regional atmospheric weather fronts.", "• ")

    # -------------------------------------------------------------
    # 4. REST & SSE API SPECIFICATION
    # -------------------------------------------------------------
    add_h1("4. REST & SSE Streaming API Reference")
    doc.add_paragraph("The backend exposes a clean, typed RESTful and Server-Sent Events (SSE) API on port 8000:")

    api_table = doc.add_table(rows=1, cols=4)
    api_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    api_headers = ["Method", "Endpoint", "Parameters", "Description"]
    for i, h in enumerate(api_headers):
        cell = api_table.rows[0].cells[i]
        set_cell_background(cell, "0F2027")
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9.5)

    api_rows = [
        ("GET", "/health", "None", "Returns system health, total monitored stations, and active alert counts."),
        ("GET", "/stations", "None", "Lists all stations, GPS coordinates, elevation, operational status, and source."),
        ("GET", "/alerts", "status, station_id, min_severity, since, limit", "Queries active or historical alerts with multi-criteria filtering."),
        ("GET", "/stations/{id}/timeseries", "hours (default: 72)", "Retrieves high-resolution telemetry timeseries (temp, pressure, humidity)."),
        ("GET", "/sensor-health/{id}", "None", "Returns sensor health score (0-100), degradation trend, and maintenance forecast."),
        ("GET", "/explain/{alert_id}", "None", "Returns SHAP attributions, feature directions, and domain narrative."),
        ("POST", "/alerts/{id}/acknowledge", "None", "Acknowledges an active alert and updates triage status in state."),
        ("GET", "/alerts/stream", "None", "SSE live stream broadcasting real-time alert events to connected dashboards."),
        ("POST", "/simulate/scenario", "scenario, city", "Triggers synthetic fault scenarios and re-executes end-to-end pipeline.")
    ]

    for row in api_rows:
        r_cells = api_table.add_row().cells
        for idx, text in enumerate(row):
            set_cell_background(r_cells[idx], "FFFFFF" if len(api_table.rows) % 2 == 0 else "F9FAFC")
            set_cell_margins(r_cells[idx], top=80, bottom=80, left=100, right=100)
            p = r_cells[idx].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.add_run(text).font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 5. FRONTEND DASHBOARD & USER INTERFACE
    # -------------------------------------------------------------
    add_h1("5. Frontend Operations Dashboard")
    doc.add_paragraph(
        "The frontend is built with React 18, TypeScript, and Vite. It provides an intuitive, high-density interface for station operators:"
    )
    
    add_h2("5.1 Operational Pages")
    add_bullet("Network Overview (/): Network health KPIs, station cards, geographic coordinates, status indicators (Normal, Degrading, Fault), and quick search.", "1. ")
    add_bullet("Live Alerts (/alerts): Real-time SSE alert listener, severity tags (High, Medium, Low), root-cause indicators, and one-click alert acknowledgment.", "2. ")
    add_bullet("Station Detail (/station/:id): 72-hour interactive telemetry charts for temperature, pressure, and humidity, station metadata, and local anomaly logs.", "3. ")
    add_bullet("Why Flagged (/why-flagged/:id): Explainable AI cockpit displaying SHAP feature contribution charts, detector confidence breakdown, and automated meteorological explanations.", "4. ")
    add_bullet("Sensor Health (/health/:id): Prognostics view featuring circular health gauges (0-100), degradation trajectories, and maintenance planning timelines.", "5. ")
    add_bullet("Audit History (/history): Searchable historical alert logs with temporal filtering, root-cause categorization, and operator triage history.", "6. ")

    # -------------------------------------------------------------
    # 6. DATA SCHEMAS & CONTRACTS
    # -------------------------------------------------------------
    add_h1("6. Core Domain Schemas & Enums")
    doc.add_paragraph("All backend modules, API responses, and frontend interfaces adhere to unified type contracts:")

    add_code_block(
        "// Core Domain Enums\n"
        "Severity: 'low' | 'medium' | 'high'\n"
        "RootCause: 'sensor_fault' | 'comms_error' | 'genuine_event' | 'unknown'\n"
        "AlertStatus: 'active' | 'acknowledged' | 'resolved'\n"
        "StationStatus: 'normal' | 'degrading' | 'fault' | 'offline'\n"
        "Trend: 'improving' | 'stable' | 'degrading'\n\n"
        "// Alert Schema\n"
        "{\n"
        "  'id': int,\n"
        "  'station_id': int,\n"
        "  'station_name': str,\n"
        "  'timestamp': str (ISO 8601 UTC),\n"
        "  'confidence': float [0.0 - 1.0],\n"
        "  'severity': Severity,\n"
        "  'root_cause': RootCause,\n"
        "  'summary': str,\n"
        "  'parameters_flagged': list[str],\n"
        "  'status': AlertStatus\n"
        "}"
    )

    # -------------------------------------------------------------
    # 7. TESTING, VERIFICATION & BENCHMARKS
    # -------------------------------------------------------------
    add_h1("7. Testing & Verification Suite")
    doc.add_paragraph("The test suite in tests/ ensures mathematical rigor and reliability:")
    add_bullet("test_detectors.py: Tests Z-score sensitivity, frozen signal traps, LSTM Autoencoder reconstruction MSE, and Isolation Forest training pipelines.", "• ")
    add_bullet("test_consistency.py: Verifies Haversine calculations, elevation lapse-rate adjustments, and Mahalanobis multi-variable covariance distance.", "• ")
    add_bullet("test_explain.py: Tests SHAP attribution correctness, feature direction tagging, and non-empty meteorological narrative generation.", "• ")
    add_bullet("evaluate_models.py: Evaluates precision, recall, F1-score, and ROC-AUC across statistical, deep learning, and ensemble models.", "• ")

    add_code_block("pytest tests/ -v")

    # -------------------------------------------------------------
    # 8. DEPLOYMENT & SETUP GUIDE
    # -------------------------------------------------------------
    add_h1("8. Deployment & Execution Guide")
    
    add_h2("8.1 Local Environment Setup")
    add_code_block(
        "# 1. Setup Backend Python Virtual Environment\n"
        "python -m venv .venv\n"
        ".venv\\Scripts\\activate\n"
        "pip install -r requirements.txt\n\n"
        "# 2. Launch FastAPI Backend Server\n"
        "uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload\n\n"
        "# 3. Launch Frontend Development Server\n"
        "cd frontend\n"
        "npm install\n"
        "npm run dev"
    )

    add_h2("8.2 Docker Deployment")
    add_code_block(
        "# Build and run backend container via Docker Compose\n"
        "docker-compose up --build -d\n\n"
        "# Verify container health status\n"
        "curl http://localhost:8000/health"
    )

    # Output file
    output_path = r"c:\SkyguardAI\SkyguardAI_Documentation.docx"
    doc.save(output_path)
    print(f"Document successfully created at {output_path}")

if __name__ == "__main__":
    create_styled_document()
