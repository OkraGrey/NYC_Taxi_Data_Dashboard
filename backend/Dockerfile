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

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
