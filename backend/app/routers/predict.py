"""Prediction router - ML fare prediction endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
import joblib
import numpy as np
import pandas as pd

from ..core.config import DATA_DIR
from ..data.zones import get_zone_lookup, get_zone_map, get_zone_centroids

router = APIRouter(prefix="/api/v1/predict", tags=["prediction"])


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

# JFK ↔ Manhattan flat fare
JFK_MANHATTAN_FLAT_FARE = 70.00


# =============================================================================
# Model Loading
# =============================================================================

_model_artifact = None


def get_model():
    """Load and cache the ML model artifact."""
    global _model_artifact
    if _model_artifact is None:
        model_path = DATA_DIR / "models" / "fare_predictor.joblib"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Please run train_fare_model.py first."
            )
        _model_artifact = joblib.load(model_path)
    return _model_artifact


def preload_model():
    """Preload model at startup (called from main.py)."""
    try:
        get_model()
        return True
    except Exception as e:
        print(f"Warning: Could not preload ML model: {e}")
        return False


# =============================================================================
# Request/Response Models
# =============================================================================

class FarePredictionRequest(BaseModel):
    pickup_zone_id: int = Field(..., ge=1, le=265, description="Pickup taxi zone ID")
    dropoff_zone_id: int = Field(..., ge=1, le=265, description="Dropoff taxi zone ID")
    pickup_datetime: datetime = Field(..., description="Pickup date and time")
    passenger_count: int = Field(default=1, ge=1, le=6, description="Number of passengers")

    @field_validator("pickup_datetime")
    @classmethod
    def validate_datetime(cls, v):
        if v < datetime(2015, 1, 1):
            raise ValueError("Date must be after 2015-01-01")
        return v


class Surcharges(BaseModel):
    mta_surcharge: float
    improvement_surcharge: float
    night_surcharge: float
    rush_hour_surcharge: float
    congestion_surcharge: float
    total_surcharges: float
    note: Optional[str] = None


class FarePredictionResponse(BaseModel):
    fare_estimate: float = Field(..., description="Predicted fare amount in USD")
    fare_low: float = Field(..., description="Lower bound estimate")
    fare_high: float = Field(..., description="Upper bound estimate")
    distance_miles: float = Field(..., description="Estimated trip distance")
    pickup_zone: str = Field(..., description="Pickup zone name")
    dropoff_zone: str = Field(..., description="Dropoff zone name")
    is_airport_trip: bool = Field(..., description="Whether this involves an airport")
    is_flat_fare: bool = Field(default=False, description="Whether this is a flat fare route")
    surcharges: Surcharges = Field(..., description="Applicable surcharges breakdown")


class ZoneInfo(BaseModel):
    id: int
    name: str
    longitude: float
    latitude: float


class ModelInfoResponse(BaseModel):
    training_date: Optional[str]
    metrics: Dict
    feature_count: int
    training_samples: int


# =============================================================================
# Helper Functions
# =============================================================================

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate haversine distance between two points in miles."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    # Earth radius in miles
    r = 3956
    return c * r


def get_manhattan_zone_ids() -> set:
    """Get set of Manhattan zone IDs."""
    artifact = get_model()
    return set(artifact.get("manhattan_zone_ids", []))


def get_manhattan_congestion_zone_ids() -> set:
    """
    Get Manhattan zones below 96th St (congestion pricing zone).
    For simplicity, we use all Manhattan zones. In production,
    you'd filter by actual geographic boundaries.
    """
    return get_manhattan_zone_ids()


def calculate_surcharges(
    pickup_id: int,
    dropoff_id: int,
    dt: datetime
) -> Surcharges:
    """Calculate applicable surcharges based on route and time."""
    surcharges = {
        "mta_surcharge": 0.50,
        "improvement_surcharge": 1.00,
        "night_surcharge": 0.00,
        "rush_hour_surcharge": 0.00,
        "congestion_surcharge": 0.00,
    }

    # Night surcharge: 8pm - 6am
    if dt.hour >= 20 or dt.hour < 6:
        surcharges["night_surcharge"] = 1.00

    # Rush hour: 4pm - 8pm weekdays
    if 16 <= dt.hour < 20 and dt.weekday() < 5:
        surcharges["rush_hour_surcharge"] = 2.50

    # Congestion surcharge: trips in Manhattan congestion zone
    manhattan_congestion_zones = get_manhattan_congestion_zone_ids()
    if pickup_id in manhattan_congestion_zones or dropoff_id in manhattan_congestion_zones:
        surcharges["congestion_surcharge"] = 2.50

    total = sum([
        surcharges["mta_surcharge"],
        surcharges["improvement_surcharge"],
        surcharges["night_surcharge"],
        surcharges["rush_hour_surcharge"],
        surcharges["congestion_surcharge"],
    ])

    return Surcharges(
        mta_surcharge=surcharges["mta_surcharge"],
        improvement_surcharge=surcharges["improvement_surcharge"],
        night_surcharge=surcharges["night_surcharge"],
        rush_hour_surcharge=surcharges["rush_hour_surcharge"],
        congestion_surcharge=surcharges["congestion_surcharge"],
        total_surcharges=round(total, 2),
    )


def check_flat_fare_route(
    pickup_id: int,
    dropoff_id: int,
    dt: datetime
) -> Optional[FarePredictionResponse]:
    """Check for flat-fare routes (e.g., JFK ↔ Manhattan)."""
    manhattan_zones = get_manhattan_zone_ids()
    zone_map = get_zone_map()

    # JFK ↔ Manhattan flat fare: $70
    is_jfk_to_manhattan = (pickup_id == JFK_ZONE and dropoff_id in manhattan_zones)
    is_manhattan_to_jfk = (dropoff_id == JFK_ZONE and pickup_id in manhattan_zones)

    if is_jfk_to_manhattan or is_manhattan_to_jfk:
        surcharges = calculate_surcharges(pickup_id, dropoff_id, dt)

        return FarePredictionResponse(
            fare_estimate=JFK_MANHATTAN_FLAT_FARE,
            fare_low=JFK_MANHATTAN_FLAT_FARE,
            fare_high=JFK_MANHATTAN_FLAT_FARE + surcharges.total_surcharges + 10.00,  # + tolls estimate
            distance_miles=15.0,
            pickup_zone=zone_map.get(pickup_id, "Unknown"),
            dropoff_zone=zone_map.get(dropoff_id, "Unknown"),
            is_airport_trip=True,
            is_flat_fare=True,
            surcharges=Surcharges(
                mta_surcharge=surcharges.mta_surcharge,
                improvement_surcharge=surcharges.improvement_surcharge,
                night_surcharge=surcharges.night_surcharge,
                rush_hour_surcharge=surcharges.rush_hour_surcharge,
                congestion_surcharge=surcharges.congestion_surcharge,
                total_surcharges=surcharges.total_surcharges,
                note="JFK ↔ Manhattan has a flat $70 fare plus surcharges and tolls"
            )
        )

    return None


def create_prediction_features(
    pickup_zone_id: int,
    dropoff_zone_id: int,
    pickup_datetime: datetime,
    passenger_count: int = 1
) -> Dict:
    """Transform user input into model features."""
    artifact = get_model()
    centroid_lookup = artifact["centroid_lookup"]

    # Get zone centroids
    pu_centroid = centroid_lookup.get(pickup_zone_id)
    do_centroid = centroid_lookup.get(dropoff_zone_id)

    if pu_centroid is None or do_centroid is None:
        raise ValueError(f"Invalid zone ID: pickup={pickup_zone_id}, dropoff={dropoff_zone_id}")

    pu_lon, pu_lat = pu_centroid
    do_lon, do_lat = do_centroid

    # Calculate haversine distance
    distance = haversine(pu_lon, pu_lat, do_lon, do_lat)

    # Temporal features
    hour = pickup_datetime.hour
    dow = pickup_datetime.weekday()
    month = pickup_datetime.month

    is_weekend = 1 if dow >= 5 else 0
    is_rush_hour = 1 if ((7 <= hour <= 9) or (17 <= hour <= 19)) else 0
    is_night = 1 if (hour >= 20 or hour < 6) else 0

    # Airport features
    airport_zone_ids = set(AIRPORT_ZONES.keys())
    is_airport_pickup = 1 if pickup_zone_id in airport_zone_ids else 0
    is_airport_dropoff = 1 if dropoff_zone_id in airport_zone_ids else 0

    # Manhattan to airport
    manhattan_zones = get_manhattan_zone_ids()
    is_manhattan_to_airport = 1 if (pickup_zone_id in manhattan_zones and is_airport_dropoff) else 0

    return {
        "haversine_distance": distance,
        "hour": hour,
        "dow": dow,
        "month": month,
        "passenger_count": passenger_count,
        "is_weekend": is_weekend,
        "is_rush_hour": is_rush_hour,
        "is_night": is_night,
        "is_airport_pickup": is_airport_pickup,
        "is_airport_dropoff": is_airport_dropoff,
        "is_manhattan_to_airport": is_manhattan_to_airport,
        "PULocationID": pickup_zone_id,
        "DOLocationID": dropoff_zone_id,
    }


# =============================================================================
# API Endpoints
# =============================================================================

@router.post("/fare", response_model=FarePredictionResponse)
async def predict_fare(request: FarePredictionRequest):
    """
    Predict taxi fare based on pickup/dropoff locations and time.

    Returns estimated fare with confidence interval and surcharge breakdown.
    """
    try:
        # Check for flat-fare routes first
        flat_fare = check_flat_fare_route(
            request.pickup_zone_id,
            request.dropoff_zone_id,
            request.pickup_datetime
        )
        if flat_fare:
            return flat_fare

        # Get model artifact
        artifact = get_model()
        model = artifact["model"]
        feature_cols = artifact["feature_cols"]

        # Create features
        features = create_prediction_features(
            pickup_zone_id=request.pickup_zone_id,
            dropoff_zone_id=request.dropoff_zone_id,
            pickup_datetime=request.pickup_datetime,
            passenger_count=request.passenger_count,
        )

        # Convert to DataFrame for prediction
        X = pd.DataFrame([features])[feature_cols]

        # Predict
        fare_estimate = float(model.predict(X)[0])

        # Calculate confidence interval
        # Use model's MAE for a data-driven interval
        mae = artifact.get("metrics", {}).get("mae", 2.0)
        fare_low = fare_estimate - mae * 1.5
        fare_high = fare_estimate + mae * 1.5

        # Ensure minimum fare ($3.00 base fare in NYC)
        fare_estimate = max(fare_estimate, 3.00)
        fare_low = max(fare_low, 3.00)

        # Get zone names
        zone_map = get_zone_map()
        pickup_zone = zone_map.get(request.pickup_zone_id, "Unknown")
        dropoff_zone = zone_map.get(request.dropoff_zone_id, "Unknown")

        # Calculate surcharges
        surcharges = calculate_surcharges(
            request.pickup_zone_id,
            request.dropoff_zone_id,
            request.pickup_datetime,
        )

        # Check if airport trip
        is_airport = bool(features["is_airport_pickup"] or features["is_airport_dropoff"])

        return FarePredictionResponse(
            fare_estimate=round(fare_estimate, 2),
            fare_low=round(fare_low, 2),
            fare_high=round(fare_high, 2),
            distance_miles=round(features["haversine_distance"], 2),
            pickup_zone=pickup_zone,
            dropoff_zone=dropoff_zone,
            is_airport_trip=is_airport,
            is_flat_fare=False,
            surcharges=surcharges,
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/zones", response_model=Dict[str, List[ZoneInfo]])
async def get_zones_for_prediction():
    """
    Get list of taxi zones for the prediction UI dropdowns.

    Returns zones grouped by borough with centroid coordinates.
    """
    try:
        # Get zone data
        zones_df = get_zone_lookup()
        centroids_df = get_zone_centroids()

        if zones_df.empty:
            raise HTTPException(status_code=503, detail="Zone data not available")

        # If centroids are available from CSV, use them
        if not centroids_df.empty:
            merged = zones_df.merge(
                centroids_df,
                on="LocationID",
                how="left"
            )
            # Normalize column names (CSV might use longitude/latitude)
            if "longitude" in merged.columns:
                merged = merged.rename(columns={
                    "longitude": "centroid_lon",
                    "latitude": "centroid_lat"
                })
        else:
            # Fall back to model artifact centroids
            artifact = get_model()
            centroid_lookup = artifact.get("centroid_lookup", {})

            # Add centroids to zones dataframe
            merged = zones_df.copy()
            merged["centroid_lon"] = merged["LocationID"].map(
                lambda x: centroid_lookup.get(int(x), (np.nan, np.nan))[0]
            )
            merged["centroid_lat"] = merged["LocationID"].map(
                lambda x: centroid_lookup.get(int(x), (np.nan, np.nan))[1]
            )

        # Filter out zones without coordinates
        merged = merged.dropna(subset=["centroid_lon", "centroid_lat"])

        # Group by borough
        result = {}
        for borough in sorted(merged["Borough"].dropna().unique()):
            if not isinstance(borough, str) or borough == "Unknown":
                continue

            borough_zones = merged[merged["Borough"] == borough]
            result[borough] = [
                ZoneInfo(
                    id=int(row["LocationID"]),
                    name=str(row["Zone"]),
                    longitude=float(row["centroid_lon"]),
                    latitude=float(row["centroid_lat"]),
                )
                for _, row in borough_zones.iterrows()
                if pd.notna(row["Zone"])
            ]
            # Sort zones by name
            result[borough] = sorted(result[borough], key=lambda z: z.name)

        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading zones: {str(e)}")


@router.get("/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get information about the current prediction model."""
    try:
        artifact = get_model()
        return ModelInfoResponse(
            training_date=artifact.get("training_date"),
            metrics=artifact.get("metrics", {}),
            feature_count=len(artifact.get("feature_cols", [])),
            training_samples=artifact.get("training_samples", 0),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model info: {str(e)}")
