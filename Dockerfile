# ==============================================================================
# SkyguardAI Atmospheric Anomaly Detection Platform - Backend Container
# Optimized for Hugging Face Spaces (Docker SDK) & Production Cloud Deployments
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/user/app \
    PORT=7860

# Install minimal OS dependencies for scientific libraries & healthcheck curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires a non-root user with UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install dependencies (use CPU-only PyTorch for fast build and small footprint)
COPY --chown=user backend/requirements.txt $HOME/app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r $HOME/app/backend/requirements.txt

# Copy backend code and data directory
COPY --chown=user backend/ $HOME/app/backend/
COPY --chown=user data/ $HOME/app/data/

# Hugging Face Spaces default port is 7860
EXPOSE 7860

# Healthcheck testing the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Launch uvicorn server
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT}"]

