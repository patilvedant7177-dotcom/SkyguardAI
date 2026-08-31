from enum import Enum

# Enum definitions matching the contract
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

# CORS origins for Vite dev ports
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
]
