# ==============================================================================
# SkyguardAI Atmospheric Anomaly Detection Platform - Backend Container
# ==============================================================================
FROM python:3.11-slim

# Set environment variables for non-buffered logging and Python path
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install minimal OS dependencies for scientific libraries & healthcheck curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code, configuration, and data partitions
COPY backend/ /app/backend/
COPY data/ /app/data/

# Expose FastAPI port
EXPOSE 8000

# Healthcheck testing the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch uvicorn server serving backend.app
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
