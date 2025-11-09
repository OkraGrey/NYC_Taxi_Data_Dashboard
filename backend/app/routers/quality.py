"""Quality router - data quality analysis endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from ..data.filters import Filters
from ..data.io import read_trips

router = APIRouter(prefix="/api/v1/quality", tags=["quality"])


class QualityReport(BaseModel):
    rows_total: int
    rows_after_filters: int
    pct_zero_distance: float
    pct_negative_fare: float
    pct_invalid_speed: float


@router.post("/report", response_model=QualityReport)
async def get_quality_report(filters: Filters):
    """
    Generate data quality report with simple checks.

    Returns statistics about data quality issues before cleaning.
    """
    # Read raw data without cleaning to inspect quality issues
    df_all = read_trips(filters, skip_cleaning=True)

    # Calculate all metrics and count in one compute to avoid partition mismatches
    # Compute everything at once to maintain consistency
    results = {
        "total": len(df_all),
        "zero_distance": (df_all["trip_distance"] <= 0).sum(),
        "negative_fare": (df_all["fare_amount"] < 0).sum(),
    }

    # Calculate speed
    speed_mph = df_all["trip_distance"] / (df_all["trip_minutes"] / 60.0)
    results["invalid_speed"] = ((speed_mph > 80) | (speed_mph < 1)).sum()

    # Compute all at once
    computed_results = {k: v.compute() if hasattr(v, 'compute') else v for k, v in results.items()}

    rows_total = int(computed_results["total"])

    # Calculate percentages
    pct_zero_distance = 100.0 * computed_results["zero_distance"] / rows_total if rows_total > 0 else 0.0
    pct_negative_fare = 100.0 * computed_results["negative_fare"] / rows_total if rows_total > 0 else 0.0
    pct_invalid_speed = 100.0 * computed_results["invalid_speed"] / rows_total if rows_total > 0 else 0.0

    # Count rows that would remain after cleaning
    rows_removed = computed_results["zero_distance"] + computed_results["negative_fare"] + computed_results["invalid_speed"]
    rows_after_filters = rows_total - int(rows_removed)

    return QualityReport(
        rows_total=rows_total,
        rows_after_filters=rows_after_filters,
        pct_zero_distance=round(float(pct_zero_distance), 2),
        pct_negative_fare=round(float(pct_negative_fare), 2),
        pct_invalid_speed=round(float(pct_invalid_speed), 2)
    )
