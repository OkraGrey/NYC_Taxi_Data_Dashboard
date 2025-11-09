"""KPIs router - key performance indicators and summary statistics."""

from fastapi import APIRouter, HTTPException
from ..data.filters import Filters
from ..data.io import read_trips
from ..data.zones import get_borough_map

router = APIRouter(prefix="/api/v1", tags=["kpis"])


@router.post("/kpis")
async def get_kpis(filters: Filters):
    """
    Calculate five key performance indicators from trip data.

    Args:
        filters: Filter criteria for trips

    Returns:
        Dictionary with KPIs:
        - avg_trip_duration_min: Average trip duration in minutes
        - avg_fare_per_mile: Average fare per mile (ratio of sums)
        - total_trips: Total number of trips
        - peak_demand_hour: Hour with highest trip volume (0-23)
        - busiest_borough: Borough with most pickups
    """
    try:
        # Read filtered trip data
        df = read_trips(filters)

        # Check if we have data
        total_trips = int(df.shape[0].compute())
        if total_trips == 0:
            return {
                "avg_trip_duration_min": 0.0,
                "avg_fare_per_mile": 0.0,
                "total_trips": 0,
                "peak_demand_hour": 0,
                "busiest_borough": "Unknown"
            }

        # 1. Average trip duration in minutes
        avg_trip_duration_min = float(df["trip_minutes"].mean().compute())

        # 2. Average fare per mile (ratio of sums for accuracy)
        total_fare = float(df["fare_amount"].sum().compute())
        total_distance = float(df["trip_distance"].sum().compute())
        avg_fare_per_mile = total_fare / total_distance if total_distance > 0 else 0.0

        # 3. Peak demand hour
        peak_demand_hour = int(df.groupby("hour").size().idxmax().compute())

        # 4. Busiest borough (by pickup location)
        borough_map = get_borough_map()
        df_with_borough = df.assign(
            borough=df["PULocationID"].map(borough_map)
        )
        busiest_borough = str(df_with_borough.groupby("borough").size().idxmax().compute())

        return {
            "avg_trip_duration_min": round(avg_trip_duration_min, 2),
            "avg_fare_per_mile": round(avg_fare_per_mile, 2),
            "total_trips": total_trips,
            "peak_demand_hour": peak_demand_hour,
            "busiest_borough": busiest_borough
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate KPIs: {str(e)}"
        )


@router.post("/summary/short-text")
async def get_summary_text(filters: Filters):
    """
    Generate a one-line text summary of key insights.

    Args:
        filters: Filter criteria for trips

    Returns:
        Dictionary with 'text' key containing summary string
    """
    try:
        # Reuse KPI computation
        kpis = await get_kpis(filters)

        if kpis["total_trips"] == 0:
            return {"text": "No trips found matching the selected filters."}

        # Format hour in 12-hour format
        hour = kpis["peak_demand_hour"]
        hour_12h = hour % 12 or 12
        am_pm = "AM" if hour < 12 else "PM"

        # Generate summary text
        text = (
            f"Peak demand occurs around {hour_12h} {am_pm} in {kpis['busiest_borough']} "
            f"with an average fare of ${kpis['avg_fare_per_mile']:.2f} per mile."
        )

        return {"text": text}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )

