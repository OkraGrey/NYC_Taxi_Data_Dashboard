"""Taxi zone data utilities."""

import pandas as pd
from pathlib import Path
from typing import Dict, Optional
from ..core.config import RAW_DATA_DIR, ARTIFACTS_DIR

# Cached lookups
_zone_lookup: Optional[pd.DataFrame] = None
_borough_map: Optional[Dict[int, str]] = None
_zone_map: Optional[Dict[int, str]] = None
_centroids: Optional[pd.DataFrame] = None


def get_zone_lookup() -> pd.DataFrame:
    """
    Load taxi zone lookup CSV as pandas DataFrame.

    Returns:
        DataFrame with columns: LocationID, Borough, Zone, service_zone
    """
    global _zone_lookup
    if _zone_lookup is None:
        # Look for zone lookup CSV in raw data directory
        csv_path = RAW_DATA_DIR / "taxi_zone_lookup.csv"
        if not csv_path.exists():
            # Try alternative path
            csv_path = RAW_DATA_DIR / "taxi+_zone_lookup.csv"

        if csv_path.exists():
            _zone_lookup = pd.read_csv(csv_path)
        else:
            # Return empty DataFrame with expected columns
            _zone_lookup = pd.DataFrame(columns=["LocationID", "Borough", "Zone", "service_zone"])

    return _zone_lookup


def get_borough_map() -> Dict[int, str]:
    """
    Get mapping from LocationID to Borough name.

    Returns:
        Dictionary mapping LocationID (int) -> Borough (str)
    """
    global _borough_map
    if _borough_map is None:
        lookup = get_zone_lookup()
        if not lookup.empty:
            _borough_map = dict(zip(lookup["LocationID"], lookup["Borough"]))
        else:
            _borough_map = {}

    return _borough_map


def get_zone_map() -> Dict[int, str]:
    """
    Get mapping from LocationID to Zone name.

    Returns:
        Dictionary mapping LocationID (int) -> Zone (str)
    """
    global _zone_map
    if _zone_map is None:
        lookup = get_zone_lookup()
        if not lookup.empty:
            _zone_map = dict(zip(lookup["LocationID"], lookup["Zone"]))
        else:
            _zone_map = {}

    return _zone_map


def get_zone_centroids() -> pd.DataFrame:
    """
    Load zone centroids CSV.

    Returns:
        DataFrame with columns: LocationID, centroid_lon, centroid_lat
    """
    global _centroids
    if _centroids is None:
        csv_path = ARTIFACTS_DIR / "zone_centroids.csv"
        if csv_path.exists():
            _centroids = pd.read_csv(csv_path)
        else:
            # Return empty DataFrame with expected columns
            _centroids = pd.DataFrame(columns=["LocationID", "centroid_lon", "centroid_lat"])

    return _centroids


def get_available_boroughs() -> list:
    """
    Get list of unique borough names from zone lookup.

    Returns:
        List of borough names
    """
    lookup = get_zone_lookup()
    if not lookup.empty:
        # Filter out NaN values and convert to list
        boroughs = lookup["Borough"].dropna().unique().tolist()
        # Filter out any non-string values
        boroughs = [b for b in boroughs if isinstance(b, str)]
        return sorted(boroughs)
    return []

