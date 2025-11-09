"""Metadata router - dataset info, filter options, etc."""

from fastapi import APIRouter
from ..data.io import get_dataset_date_range, get_available_payment_types
from ..data.zones import get_available_boroughs

router = APIRouter(prefix="/api/v1/meta", tags=["meta"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        dict: Status message
    """
    return {"status": "ok"}


@router.get("/filters")
async def get_filter_options():
    """
    Get available filter options for the dataset.

    Returns enums for:
    - Boroughs
    - Payment types
    - Min/max dates available in the dataset

    Returns:
        dict: Filter options
    """
    min_date, max_date = get_dataset_date_range()

    return {
        "boroughs": get_available_boroughs(),
        "payment_types": get_available_payment_types(),
        "date_range": {
            "min": min_date,
            "max": max_date
        }
    }


@router.get("/schema")
async def get_schema():
    """
    Get field names and data types used by the application.

    Returns:
        dict: Schema information
    """
    return {
        "trip_fields": [
            {"name": "tpep_pickup_datetime", "type": "datetime", "description": "Pickup timestamp"},
            {"name": "tpep_dropoff_datetime", "type": "datetime", "description": "Dropoff timestamp"},
            {"name": "PULocationID", "type": "int", "description": "Pickup location ID"},
            {"name": "DOLocationID", "type": "int", "description": "Dropoff location ID"},
            {"name": "passenger_count", "type": "int", "description": "Number of passengers"},
            {"name": "trip_distance", "type": "float", "description": "Trip distance in miles"},
            {"name": "fare_amount", "type": "float", "description": "Base fare amount"},
            {"name": "tip_amount", "type": "float", "description": "Tip amount"},
            {"name": "total_amount", "type": "float", "description": "Total amount charged"},
            {"name": "payment_type", "type": "int", "description": "Payment type code"},
            {"name": "trip_minutes", "type": "float", "description": "Trip duration in minutes"},
            {"name": "hour", "type": "int", "description": "Hour of pickup (0-23)"},
            {"name": "dow", "type": "int", "description": "Day of week (0=Monday, 6=Sunday)"},
            {"name": "year", "type": "int", "description": "Year of pickup"},
            {"name": "month", "type": "int", "description": "Month of pickup"},
            {"name": "fare_per_mile", "type": "float", "description": "Fare per mile"},
            {"name": "tip_pct", "type": "float", "description": "Tip percentage"}
        ],
        "filter_fields": [
            {"name": "date_from", "type": "string", "description": "Start date (YYYY-MM-DD)"},
            {"name": "date_to", "type": "string", "description": "End date (YYYY-MM-DD)"},
            {"name": "boroughs", "type": "array", "description": "List of borough names"},
            {"name": "hours", "type": "tuple", "description": "Hour range [start, end]"},
            {"name": "days_of_week", "type": "array", "description": "List of day indices (0-6)"},
            {"name": "payment_types", "type": "array", "description": "List of payment type codes"},
            {"name": "fare_range", "type": "tuple", "description": "Fare range [min, max]"},
            {"name": "distance_range", "type": "tuple", "description": "Distance range [min, max]"},
            {"name": "sample", "type": "int", "description": "Sample size for scatter plots"}
        ]
    }

