"""Fares router - fare analysis endpoints."""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from ..data.filters import Filters
from ..data.io import read_trips
from ..data.zones import get_borough_map

router = APIRouter(prefix="/api/v1/fares", tags=["fares"])


# Response models
class BoxplotSeries(BaseModel):
    name: str
    q05: float
    q25: float
    q50: float
    q75: float
    q95: float


class BoxplotResponse(BaseModel):
    by: str
    series: List[BoxplotSeries]


class HistogramResponse(BaseModel):
    bin_edges: List[float]
    counts: List[int]


class ScatterPoint(BaseModel):
    distance: float
    fare: float
    tod: str
    tip_pct: float


@router.post("/boxplot", response_model=BoxplotResponse)
async def get_fare_boxplot(
    filters: Filters,
    by: str = Query(default="PU_Borough", regex="^PU_Borough$")
):
    """
    Calculate boxplot statistics for fare_per_mile by borough.

    Returns quantiles (5%, 25%, 50%, 75%, 95%) for each borough.
    """
    # Read filtered trip data
    df = read_trips(filters)

    # Filter out invalid fare_per_mile values
    df = df[~df["fare_per_mile"].isna()]
    df = df[df["fare_per_mile"] > 0]
    df = df[df["fare_per_mile"] < 100]  # Remove outliers

    # Get borough mapping
    borough_map = get_borough_map()

    # Map PULocationID to borough
    df = df.assign(
        PU_Borough=df["PULocationID"].map(borough_map)
    )

    # Filter out null boroughs
    df = df[~df["PU_Borough"].isna()]

    # Compute quantiles for each borough
    series = []
    boroughs = df["PU_Borough"].unique().compute()

    for borough in sorted(boroughs):
        borough_df = df[df["PU_Borough"] == borough]
        fare_per_mile = borough_df["fare_per_mile"]

        # Calculate quantiles
        quantiles = fare_per_mile.quantile([0.05, 0.25, 0.5, 0.75, 0.95]).compute()

        series.append(BoxplotSeries(
            name=borough,
            q05=round(float(quantiles[0.05]), 2),
            q25=round(float(quantiles[0.25]), 2),
            q50=round(float(quantiles[0.5]), 2),
            q75=round(float(quantiles[0.75]), 2),
            q95=round(float(quantiles[0.95]), 2)
        ))

    return BoxplotResponse(by=by, series=series)


@router.post("/tips-histogram", response_model=HistogramResponse)
async def get_tips_histogram(
    filters: Filters,
    bins: int = Query(default=30, ge=5, le=100)
):
    """
    Generate histogram of tip percentage distribution.

    Returns bin edges and counts for tip_pct clipped to [0, 1].
    """
    # Read filtered trip data
    df = read_trips(filters)

    # Clip tip_pct to [0, 1] range
    tip_pct = df["tip_pct"].clip(0.0, 1.0)

    # Use Dask to compute histogram across partitions
    def compute_histogram(partition):
        """Compute histogram for a single partition."""
        values = partition.values
        hist, _ = np.histogram(values, bins=bins, range=(0.0, 1.0))
        return hist

    # Compute histogram for each partition and sum
    partition_hists = tip_pct.map_partitions(
        compute_histogram,
        meta=('histogram', 'i8')
    ).compute()

    # Sum histograms from all partitions
    total_counts = np.zeros(bins, dtype=int)
    for hist in partition_hists:
        total_counts += hist

    # Generate bin edges
    bin_edges = np.linspace(0.0, 1.0, bins + 1)

    return HistogramResponse(
        bin_edges=[round(float(x), 3) for x in bin_edges],
        counts=total_counts.tolist()
    )


@router.post("/scatter", response_model=List[ScatterPoint])
async def get_fare_scatter(
    filters: Filters,
    color_by: str = Query(default="time_of_day", regex="^time_of_day$"),
    sample: int = Query(default=30000, ge=100, le=100000)
):
    """
    Generate scatter plot data for distance vs fare.

    Returns sampled trip records with distance, fare, time_of_day, and tip_pct.
    """
    # Read filtered trip data WITHOUT setting sample (we'll sample after)
    df = read_trips(filters)

    # Select only needed columns
    df = df[["trip_distance", "fare_amount", "tpep_pickup_datetime", "tip_pct"]]

    # Filter out invalid values
    df = df[df["trip_distance"] > 0]
    df = df[df["fare_amount"] > 0]
    df = df[~df["tip_pct"].isna()]

    # Compute to get actual data
    result = df.compute()

    # Extract hour from pickup datetime
    result["hour"] = result["tpep_pickup_datetime"].dt.hour

    # Create time_of_day categories using numpy
    conditions = [
        (result["hour"] >= 6) & (result["hour"] < 12),
        (result["hour"] >= 12) & (result["hour"] < 18),
        (result["hour"] >= 18) & (result["hour"] < 22)
    ]
    choices = ["morning", "afternoon", "evening"]
    result["tod"] = np.select(conditions, choices, default="night")

    # Limit to requested sample size
    if len(result) > sample:
        result = result.sample(n=sample, random_state=42)

    # Convert to list of ScatterPoint objects
    scatter_data = []
    for _, row in result.iterrows():
        scatter_data.append(ScatterPoint(
            distance=round(float(row["trip_distance"]), 2),
            fare=round(float(row["fare_amount"]), 2),
            tod=row["tod"],
            tip_pct=round(float(row["tip_pct"]), 2)
        ))

    return scatter_data

