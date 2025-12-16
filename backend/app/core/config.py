"""Application configuration and settings."""

from pathlib import Path

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

# Data directories
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PARQUET_DATA_DIR = DATA_DIR / "parquet"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
MODELS_DIR = DATA_DIR / "models"


