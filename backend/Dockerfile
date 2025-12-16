# NYC Taxi Dashboard Backend - Production Dockerfile
# Build context should be the root project directory
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for scientific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app/ ./app/

# Create data directory structure
RUN mkdir -p ./data/models ./data/artifacts ./data/parquet ./data/raw

# Copy data files (model, artifacts, parquet data, zone lookup)
# These should be tracked in Git (small files) or Git LFS (large files)
COPY data/models/ ./data/models/
COPY data/artifacts/ ./data/artifacts/
COPY data/parquet/ ./data/parquet/
COPY data/raw/taxi_zone_lookup.csv ./data/raw/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV DASK_DISTRIBUTED__SCHEDULER__WORKER_TTL=null
ENV DASK_DISTRIBUTED__COMM__TIMEOUTS__CONNECT=60s
ENV DASK_DISTRIBUTED__COMM__TIMEOUTS__TCP=60s

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", \"8080\")}/')" || exit 1

# Run the application with production settings
# Note: Using sh -c to expand $PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --timeout-keep-alive 75"]
