"""Application configuration and settings."""

import os
from pathlib import Path

# Determine if we're running in production (Docker) or development
# In Docker, the app root is /app and data is at /app/data
# In development, data is at PROJECT_ROOT/data

APP_ROOT = Path(os.environ.get("APP_ROOT", Path(__file__).parent.parent.parent.parent))

# Data directories - check for /app/data first (production), then fallback to local
if Path("/app/data").exists():
    DATA_DIR = Path("/app/data")
else:
    DATA_DIR = APP_ROOT / "data"

RAW_DATA_DIR = DATA_DIR / "raw"
PARQUET_DATA_DIR = DATA_DIR / "parquet"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
MODELS_DIR = DATA_DIR / "models"


