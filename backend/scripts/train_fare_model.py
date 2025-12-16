"""Train ML model for taxi fare prediction.

This script trains a LightGBM model to predict taxi fares based on:
- Geographic features (pickup/dropoff zones, haversine distance)
- Temporal features (hour, day of week, month)
- Route features (airport trips, borough pairs)

Usage:
    python backend/scripts/train_fare_model.py

Output:
    data/models/fare_predictor.joblib - Trained model and metadata
"""

import sys
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

import numpy as np
import pandas as pd
import geopandas as gpd
from math import radians, cos, sin, asin, sqrt
import joblib

# ML imports
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


# =============================================================================
# Constants
# =============================================================================

AIRPORT_ZONES = {
    1: "Newark Airport (EWR)",
    132: "JFK Airport",
    138: "LaGuardia Airport",
}

JFK_ZONE = 132
LAGUARDIA_ZONE = 138
NEWARK_ZONE = 1

# Manhattan zone IDs (from taxi zone lookup)
# These will be populated from the zone data
MANHATTAN_ZONE_IDS = set()

# Model hyperparameters (HistGradientBoostingRegressor)
MODEL_PARAMS = {
    "loss": "squared_error",
    "learning_rate": 0.05,
    "max_iter": 500,
    "max_leaf_nodes": 63,
    "max_depth": None,
    "min_samples_leaf": 20,
    "l2_regularization": 0.1,
    "early_stopping": True,
    "validation_fraction": 0.1,
    "n_iter_no_change": 50,
    "random_state": 42,
    "verbose": 1,
}

# Features to use for training
FEATURE_COLS = [
    "haversine_distance",
    "hour",
    "dow",
    "month",
    "passenger_count",
    "is_weekend",
    "is_rush_hour",
    "is_night",
    "is_airport_pickup",
    "is_airport_dropoff",
    "is_manhattan_to_airport",
    "PULocationID",
    "DOLocationID",
]

# Note: Location IDs have 263+ unique values, exceeding HistGradientBoostingRegressor's
# categorical limit of 255. We treat them as numerical (the model will bin them).
CATEGORICAL_FEATURES = []


# =============================================================================
# Geographic Functions
# =============================================================================

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate haversine distance between two points in miles."""
    # Convert to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    # Earth radius in miles
    r = 3956

    return c * r


def load_zone_data():
    """Load taxi zone data and compute centroids."""
    print("Loading taxi zone shapefile...")

    zones_path = project_root / "data" / "raw" / "taxi_zones" / "taxi_zones.shp"

    if not zones_path.exists():
        raise FileNotFoundError(
            f"Taxi zones shapefile not found at {zones_path}\n"
            "Please download it using:\n"
            "  curl -o data/raw/taxi_zones.zip https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip\n"
            "  unzip data/raw/taxi_zones.zip -d data/raw/taxi_zones/"
        )

    zones_gdf = gpd.read_file(zones_path)
    zones_gdf = zones_gdf.to_crs(epsg=4326)  # WGS84 for lat/lon

    # Compute centroids
    zones_gdf['centroid'] = zones_gdf.geometry.centroid
    zones_gdf['centroid_lon'] = zones_gdf.centroid.x
    zones_gdf['centroid_lat'] = zones_gdf.centroid.y

    # Create lookup dictionaries
    centroid_lookup = {
        int(row['LocationID']): (row['centroid_lon'], row['centroid_lat'])
        for _, row in zones_gdf.iterrows()
    }

    borough_lookup = {
        int(row['LocationID']): row['borough']
        for _, row in zones_gdf.iterrows()
    }

    # Populate Manhattan zone IDs
    global MANHATTAN_ZONE_IDS
    MANHATTAN_ZONE_IDS = set(
        int(row['LocationID'])
        for _, row in zones_gdf.iterrows()
        if row['borough'] == 'Manhattan'
    )

    print(f"  Loaded {len(zones_gdf)} zones")
    print(f"  Manhattan zones: {len(MANHATTAN_ZONE_IDS)}")

    return centroid_lookup, borough_lookup


def compute_haversine_distance(row, centroid_lookup):
    """Compute haversine distance for a single row."""
    pu_id = int(row['PULocationID'])
    do_id = int(row['DOLocationID'])

    if pu_id not in centroid_lookup or do_id not in centroid_lookup:
        return np.nan

    pu_lon, pu_lat = centroid_lookup[pu_id]
    do_lon, do_lat = centroid_lookup[do_id]

    return haversine(pu_lon, pu_lat, do_lon, do_lat)


# =============================================================================
# Feature Engineering
# =============================================================================

def add_features(df: pd.DataFrame, centroid_lookup: dict, borough_lookup: dict) -> pd.DataFrame:
    """Add engineered features for fare prediction."""

    print("  Adding haversine distance...")
    # Vectorized haversine computation
    pu_coords = df['PULocationID'].map(lambda x: centroid_lookup.get(int(x), (np.nan, np.nan)))
    do_coords = df['DOLocationID'].map(lambda x: centroid_lookup.get(int(x), (np.nan, np.nan)))

    pu_lon = pu_coords.apply(lambda x: x[0])
    pu_lat = pu_coords.apply(lambda x: x[1])
    do_lon = do_coords.apply(lambda x: x[0])
    do_lat = do_coords.apply(lambda x: x[1])

    df['haversine_distance'] = [
        haversine(lon1, lat1, lon2, lat2) if not (np.isnan(lon1) or np.isnan(lon2)) else np.nan
        for lon1, lat1, lon2, lat2 in zip(pu_lon, pu_lat, do_lon, do_lat)
    ]

    print("  Adding temporal features...")
    df['is_weekend'] = (df['dow'] >= 5).astype(int)
    df['is_rush_hour'] = ((df['hour'] >= 7) & (df['hour'] <= 9) |
                          (df['hour'] >= 17) & (df['hour'] <= 19)).astype(int)
    df['is_night'] = ((df['hour'] >= 20) | (df['hour'] < 6)).astype(int)

    print("  Adding airport features...")
    airport_zone_ids = set(AIRPORT_ZONES.keys())
    df['is_airport_pickup'] = df['PULocationID'].isin(airport_zone_ids).astype(int)
    df['is_airport_dropoff'] = df['DOLocationID'].isin(airport_zone_ids).astype(int)

    # Manhattan to airport trips
    df['is_manhattan_to_airport'] = (
        df['PULocationID'].isin(MANHATTAN_ZONE_IDS) &
        df['is_airport_dropoff'].astype(bool)
    ).astype(int)

    return df


def filter_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply quality filters for training data."""

    original_len = len(df)

    # Remove outliers
    df = df[
        (df['fare_amount'] >= 2.50) &      # Minimum fare in NYC
        (df['fare_amount'] <= 200) &        # Reasonable maximum
        (df['trip_distance'] > 0.1) &       # Minimum distance
        (df['trip_distance'] <= 50) &       # Reasonable max distance
        (df['trip_minutes'] >= 1) &         # Minimum duration
        (df['trip_minutes'] <= 180) &       # 3 hour max
        (df['haversine_distance'].notna()) & # Valid distance
        (df['haversine_distance'] > 0) &     # Positive distance
        (df['passenger_count'] >= 1) &       # At least 1 passenger
        (df['passenger_count'] <= 6)         # Max passengers
    ].copy()

    filtered_pct = (1 - len(df) / original_len) * 100
    print(f"  Filtered {filtered_pct:.1f}% of data ({original_len:,} -> {len(df):,})")

    return df


# =============================================================================
# Model Training
# =============================================================================

def train_model(X_train, X_test, y_train, y_test):
    """Train HistGradientBoostingRegressor model with early stopping."""

    print("\nTraining HistGradientBoostingRegressor model...")
    print(f"  Training samples: {len(X_train):,}")
    print(f"  Test samples: {len(X_test):,}")
    print(f"  Features: {len(FEATURE_COLS)}")

    # Identify categorical feature indices
    categorical_indices = [i for i, col in enumerate(FEATURE_COLS) if col in CATEGORICAL_FEATURES]
    print(f"  Categorical feature indices: {categorical_indices}")

    # Create model
    model = HistGradientBoostingRegressor(
        categorical_features=categorical_indices,
        **MODEL_PARAMS
    )

    # Fit the model
    model.fit(X_train, y_train)

    print(f"  Training completed in {model.n_iter_} iterations")

    return model


def evaluate_model(model, X_test, y_test):
    """Evaluate model and return metrics."""

    print("\nEvaluating model...")

    predictions = model.predict(X_test)

    # Calculate metrics
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    # Calculate percentage within thresholds
    errors = np.abs(predictions - y_test)
    within_2 = (errors <= 2).mean() * 100
    within_5 = (errors <= 5).mean() * 100
    within_10pct = (errors / y_test <= 0.10).mean() * 100
    within_20pct = (errors / y_test <= 0.20).mean() * 100

    metrics = {
        "rmse": round(rmse, 2),
        "mae": round(mae, 2),
        "r2": round(r2, 4),
        "within_$2": round(within_2, 1),
        "within_$5": round(within_5, 1),
        "within_10%": round(within_10pct, 1),
        "within_20%": round(within_20pct, 1),
    }

    print(f"\n  RMSE: ${rmse:.2f}")
    print(f"  MAE: ${mae:.2f}")
    print(f"  R2: {r2:.4f}")
    print(f"  Within $2: {within_2:.1f}%")
    print(f"  Within $5: {within_5:.1f}%")
    print(f"  Within 10%: {within_10pct:.1f}%")
    print(f"  Within 20%: {within_20pct:.1f}%")

    return metrics, predictions


def get_feature_importance(model, feature_cols):
    """Get feature importance from trained model."""

    try:
        # Try to get feature importances (available in sklearn >= 1.0)
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
        else:
            # Fallback: use permutation importance or return empty
            print("\n  Feature importances not available for this model version")
            return []

        feature_importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': importance
        }).sort_values('importance', ascending=False)

        print("\nFeature Importance (top 10):")
        for _, row in feature_importance.head(10).iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")

        return feature_importance.to_dict('records')

    except Exception as e:
        print(f"\n  Could not compute feature importance: {e}")
        return []


# =============================================================================
# Main Training Pipeline
# =============================================================================

def load_training_data():
    """Load parquet data for training."""

    print("\nLoading training data from parquet files...")

    parquet_path = project_root / "data" / "parquet" / "trips"

    # Find all partition directories
    partitions = list(parquet_path.glob("year=*/month=*"))

    if not partitions:
        raise FileNotFoundError(
            f"No parquet partitions found in {parquet_path}\n"
            "Please run prepare_trips.py first."
        )

    print(f"  Found {len(partitions)} partitions")

    # Load data from each partition
    dfs = []
    total_rows = 0

    for partition in sorted(partitions):
        try:
            df = pd.read_parquet(partition, engine='pyarrow')
            dfs.append(df)
            total_rows += len(df)
            print(f"    {partition.parent.name}/{partition.name}: {len(df):,} rows")
        except Exception as e:
            print(f"    Warning: Could not load {partition}: {e}")
            continue

    if not dfs:
        raise ValueError("No data could be loaded from parquet files")

    # Combine all data
    df = pd.concat(dfs, ignore_index=True)
    print(f"\n  Total loaded: {len(df):,} rows")

    return df


def main():
    """Run the complete training pipeline."""

    print("=" * 60)
    print("NYC Taxi Fare Prediction Model Training")
    print("=" * 60)

    start_time = datetime.now()

    # 1. Load zone data
    centroid_lookup, borough_lookup = load_zone_data()

    # 2. Load training data
    df = load_training_data()

    # 3. Add features
    print("\nEngineering features...")
    df = add_features(df, centroid_lookup, borough_lookup)

    # 4. Filter training data
    print("\nFiltering training data...")
    df = filter_training_data(df)

    # 5. Prepare features and target
    print("\nPreparing features...")

    # Handle missing passenger counts
    df['passenger_count'] = df['passenger_count'].fillna(1).clip(1, 6)

    X = df[FEATURE_COLS].copy()
    y = df['fare_amount'].copy()

    # Ensure categorical columns are integers (HistGradientBoostingRegressor handles them natively)
    for col in CATEGORICAL_FEATURES:
        X[col] = X[col].astype(int)

    print(f"  Features shape: {X.shape}")
    print(f"  Target shape: {y.shape}")

    # 6. Split data
    print("\nSplitting data (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 7. Train model
    model = train_model(X_train, X_test, y_train, y_test)

    # 8. Evaluate model
    metrics, predictions = evaluate_model(model, X_test, y_test)

    # 9. Get feature importance
    feature_importance = get_feature_importance(model, FEATURE_COLS)

    # 10. Save model artifact
    print("\nSaving model...")

    models_dir = project_root / "data" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    artifact = {
        "model": model,
        "feature_cols": FEATURE_COLS,
        "categorical_features": CATEGORICAL_FEATURES,
        "centroid_lookup": centroid_lookup,
        "borough_lookup": borough_lookup,
        "manhattan_zone_ids": list(MANHATTAN_ZONE_IDS),
        "airport_zones": AIRPORT_ZONES,
        "metrics": metrics,
        "feature_importance": feature_importance,
        "training_date": datetime.now().isoformat(),
        "training_samples": len(X_train),
        "model_params": MODEL_PARAMS,
    }

    model_path = models_dir / "fare_predictor.joblib"
    joblib.dump(artifact, model_path)

    print(f"  Saved to: {model_path}")

    # Summary
    elapsed = datetime.now() - start_time
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"  Duration: {elapsed}")
    print(f"  Model: {model_path}")
    print(f"  RMSE: ${metrics['rmse']}")
    print(f"  MAE: ${metrics['mae']}")
    print(f"  R2: {metrics['r2']}")

    return 0


if __name__ == "__main__":
    try:
        exit(main())
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
