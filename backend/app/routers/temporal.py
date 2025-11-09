"""Temporal router - time-based analysis endpoints."""

from fastapi import APIRouter, HTTPException, Query
from app.data.filters import Filters
from app.data.io import read_trips

router = APIRouter(prefix="/api/v1/temporal", tags=["temporal"])


@router.post("/heatmap")
def get_temporal_heatmap(filters: Filters):
    """
    Get hourly demand heatmap (24 hours x 7 days of week).

    Returns:
        hours: list of hours [0..23]
        dow: list of day names
        matrix: 7x24 matrix of trip counts
        max: maximum value in matrix
    """
    try:
        df = read_trips(filters)

        if df is None or len(df) == 0:
            # Return empty heatmap
            return {
                "hours": list(range(24)),
                "dow": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "matrix": [[0] * 24 for _ in range(7)],
                "max": 0
            }

        # Extract day of week and hour
        df['dow'] = df['tpep_pickup_datetime'].dt.dayofweek
        df['hour'] = df['tpep_pickup_datetime'].dt.hour

        # Group by dow and hour
        grouped = df.groupby(['dow', 'hour']).size()

        # Compute and convert to pandas
        grouped_computed = grouped.compute()

        # Unstack to create matrix, fill missing values with 0
        matrix_df = grouped_computed.unstack(fill_value=0)

        # Reindex to ensure all days (0-6) and hours (0-23) are present
        matrix_df = matrix_df.reindex(index=range(7), columns=range(24), fill_value=0)

        # Convert to list of lists (7 rows, 24 columns each)
        matrix = matrix_df.values.tolist()

        # Find max value
        max_value = int(matrix_df.max().max()) if not matrix_df.empty else 0

        return {
            "hours": list(range(24)),
            "dow": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "matrix": matrix,
            "max": max_value
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing heatmap: {str(e)}")


@router.post("/series")
def get_temporal_series(
    filters: Filters,
    metric: str = Query("trip_count", regex="^(trip_count|avg_fare|avg_tip_pct)$")
):
    """
    Get monthly time series for selected metric.

    Args:
        filters: Standard filters
        metric: One of 'trip_count', 'avg_fare', 'avg_tip_pct'

    Returns:
        List of {month: "YYYY-MM", value: float}
    """
    try:
        df = read_trips(filters)

        if df is None or len(df) == 0:
            return []

        # Create year-month column
        df['year_month'] = df['tpep_pickup_datetime'].dt.to_period('M').astype(str)

        if metric == "trip_count":
            # Count trips per month
            result = df.groupby('year_month').size().compute()
            series_data = [
                {"month": month, "value": float(count)}
                for month, count in result.items()
            ]

        elif metric == "avg_fare":
            # Average fare per month
            result = df.groupby('year_month')['fare_amount'].mean().compute()
            series_data = [
                {"month": month, "value": round(float(avg), 2)}
                for month, avg in result.items()
            ]

        elif metric == "avg_tip_pct":
            # Average tip percentage per month
            result = df.groupby('year_month')['tip_pct'].mean().compute()
            series_data = [
                {"month": month, "value": round(float(avg), 2)}
                for month, avg in result.items()
            ]

        else:
            raise HTTPException(status_code=400, detail=f"Invalid metric: {metric}")

        # Sort by month
        series_data.sort(key=lambda x: x['month'])

        return series_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing series: {str(e)}")

