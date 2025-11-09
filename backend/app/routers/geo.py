"""Geo router - geospatial analysis endpoints."""

from typing import Literal
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.cluster import KMeans

from ..data.filters import Filters
from ..data.io import read_trips
from ..data.zones import get_zone_centroids

router = APIRouter(prefix="/api/v1/geo", tags=["geo"])


class ZoneStat(BaseModel):
    """Statistics for a single zone."""
    LocationID: int
    trips: int
    avg_fare: float
    avg_tip_pct: float


class ZonesStatsResponse(BaseModel):
    """Response model for zones-stats endpoint."""
    side: str
    stats: list[ZoneStat]


class Centroid(BaseModel):
    """Cluster centroid with metadata."""
    lon: float
    lat: float
    trips: int


class ClustersResponse(BaseModel):
    """Response model for clusters endpoint."""
    k: int
    centroids: list[Centroid]


@router.post("/zones-stats", response_model=ZonesStatsResponse)
async def get_zones_stats(
    filters: Filters,
    side: Literal["pickup", "dropoff"] = Query("pickup", description="Which location to analyze")
):
    """
    Calculate trip statistics aggregated by taxi zone.

    Args:
        filters: Standard filter parameters
        side: Whether to analyze pickup or dropoff locations

    Returns:
        Statistics per zone including trip count, average fare, and average tip percentage
    """
    try:
        # Read filtered trips
        df = read_trips(filters)

        if df is None or len(df) == 0:
            return ZonesStatsResponse(side=side, stats=[])

        # Choose the location column based on side
        key = "PULocationID" if side == "pickup" else "DOLocationID"

        # Group by location and compute aggregates
        # Use Dask's groupby with multiple aggregations
        agg_dict = {
            "fare_amount": "mean",
            "tip_pct": "mean"
        }
        grouped = df.groupby(key).agg(agg_dict)
        counts = df.groupby(key).size().rename("trips")

        # Compute and merge
        result = grouped.compute()
        counts_result = counts.compute()

        # Merge counts with aggregates
        result = result.join(counts_result)
        result = result.reset_index()
        result.columns = ["LocationID", "avg_fare", "avg_tip_pct", "trips"]

        # Round to 2 decimal places
        result["avg_fare"] = result["avg_fare"].round(2)
        result["avg_tip_pct"] = result["avg_tip_pct"].round(2)

        # Convert to list of dicts
        stats = result.to_dict(orient="records")

        return ZonesStatsResponse(side=side, stats=stats)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing zone stats: {str(e)}")


@router.post("/clusters", response_model=ClustersResponse)
async def get_clusters(
    filters: Filters,
    k: int = Query(5, ge=2, le=20, description="Number of clusters"),
    side: Literal["pickup", "dropoff"] = Query("pickup", description="Which location to analyze")
):
    """
    Perform K-Means clustering on zone centroids weighted by trip count.

    Args:
        filters: Standard filter parameters
        k: Number of clusters (2-20)
        side: Whether to analyze pickup or dropoff locations

    Returns:
        Cluster centroids with associated trip counts
    """
    try:
        # Read filtered trips
        df = read_trips(filters)

        if df is None or len(df) == 0:
            return ClustersResponse(k=k, centroids=[])

        # Choose the location column based on side
        key = "PULocationID" if side == "pickup" else "DOLocationID"

        # Count trips per zone
        counts = df.groupby(key).size().rename("trips").compute()
        counts_df = counts.reset_index()
        counts_df.columns = ["LocationID", "trips"]

        # Load zone centroids
        zone_centroids = get_zone_centroids()

        if zone_centroids is None or zone_centroids.empty:
            raise HTTPException(status_code=500, detail="Zone centroids data not available")

        # Merge with centroids
        merged = counts_df.merge(zone_centroids, on="LocationID", how="inner")

        if merged.empty:
            return ClustersResponse(k=k, centroids=[])

        # Prepare coordinates and weights for KMeans
        coordinates = merged[["longitude", "latitude"]].values
        weights = merged["trips"].values

        # Adjust k if we have fewer zones than requested clusters
        actual_k = min(k, len(merged))

        # Perform K-Means clustering with sample weights
        kmeans = KMeans(n_clusters=actual_k, random_state=42)
        merged["cluster"] = kmeans.fit_predict(coordinates, sample_weight=weights)

        # Get cluster centers
        cluster_centers = kmeans.cluster_centers_

        # Calculate trips per cluster
        cluster_trips = merged.groupby("cluster")["trips"].sum().to_dict()

        # Build response
        centroids = []
        for i in range(actual_k):
            lon, lat = cluster_centers[i]
            trips = cluster_trips.get(i, 0)
            centroids.append(Centroid(lon=round(lon, 6), lat=round(lat, 6), trips=int(trips)))

        return ClustersResponse(k=actual_k, centroids=centroids)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing clusters: {str(e)}")

