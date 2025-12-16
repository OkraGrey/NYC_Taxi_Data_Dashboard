"""Data I/O operations - reading and loading datasets."""

import dask.dataframe as dd
import pandas as pd
from typing import Optional, List
from ..core.config import PARQUET_DATA_DIR
from .filters import Filters
from .zones import get_borough_map


def read_trips(filters: Optional[Filters] = None, skip_cleaning: bool = False) -> dd.DataFrame:
    """
    Read trip data from Parquet with optional filters.

    Args:
        filters: Optional Filters object to apply
        skip_cleaning: If True, skip data quality filters (for quality inspection)

    Returns:
        Dask DataFrame with filtered trip data
    """
    # Columns to load from parquet
    columns = [
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime",
        "PULocationID",
        "DOLocationID",
        "passenger_count",
        "trip_distance",
        "fare_amount",
        "tip_amount",
        "total_amount",
        "payment_type",
        "trip_minutes",
        "hour",
        "dow",
        "year",
        "month",
        "fare_per_mile",
        "tip_pct"
    ]

    # Build partition filters for year/month if date range provided
    partition_filters = []
    if filters and (filters.date_from or filters.date_to):
        years = set()
        months = set()

        # Parse date range to determine which partitions to read
        if filters.date_from:
            date_from = pd.to_datetime(filters.date_from)
            years.add(date_from.year)
            months.add(date_from.month)

        if filters.date_to:
            date_to = pd.to_datetime(filters.date_to)
            years.add(date_to.year)
            months.add(date_to.month)

            # If date range spans multiple months, add intermediate months
            if filters.date_from:
                date_range = pd.date_range(start=filters.date_from, end=filters.date_to, freq='MS')
                for dt in date_range:
                    years.add(dt.year)
                    months.add(dt.month)

        if years:
            partition_filters.append(("year", "in", list(years)))
        if months:
            partition_filters.append(("month", "in", list(months)))

    # Read parquet with partition filters
    trips_path = PARQUET_DATA_DIR / "trips"
    if not trips_path.exists():
        # Return empty DataFrame with expected schema
        return dd.from_pandas(
            pd.DataFrame(columns=columns),
            npartitions=1
        )

    ddf = dd.read_parquet(
        trips_path,
        columns=columns,
        filters=partition_filters if partition_filters else None,
        engine="pyarrow"
    )

    # Apply additional filters
    if filters:
        # Date range filter on pickup datetime
        if filters.date_from:
            ddf = ddf[ddf["tpep_pickup_datetime"] >= filters.date_from]
        if filters.date_to:
            ddf = ddf[ddf["tpep_pickup_datetime"] <= filters.date_to]

        # Hour filter
        if filters.hours:
            start_hour, end_hour = filters.hours
            ddf = ddf[(ddf["hour"] >= start_hour) & (ddf["hour"] <= end_hour)]

        # Day of week filter
        if filters.days_of_week:
            ddf = ddf[ddf["dow"].isin(filters.days_of_week)]

        # Distance range filter
        if filters.distance_range:
            min_dist, max_dist = filters.distance_range
            ddf = ddf[(ddf["trip_distance"] >= min_dist) & (ddf["trip_distance"] <= max_dist)]

        # Fare range filter
        if filters.fare_range:
            min_fare, max_fare = filters.fare_range
            ddf = ddf[(ddf["fare_amount"] >= min_fare) & (ddf["fare_amount"] <= max_fare)]

        # Payment type filter
        if filters.payment_types:
            ddf = ddf[ddf["payment_type"].isin(filters.payment_types)]

        # Borough filter (applied to pickup location)
        if filters.boroughs:
            # Get borough mapping
            borough_map = get_borough_map()
            # Find LocationIDs that match the requested boroughs
            location_ids = [
                loc_id for loc_id, borough in borough_map.items()
                if borough in filters.boroughs
            ]
            if location_ids:
                ddf = ddf[ddf["PULocationID"].isin(location_ids)]

        # Sample for scatter plots
        if filters.sample and filters.sample > 0:
            # Use random sampling
            fraction = min(1.0, filters.sample / len(ddf))
            ddf = ddf.sample(frac=fraction, random_state=42).head(filters.sample)

    return ddf


def get_dataset_date_range() -> tuple:
    """
    Scan parquet partitions to determine min/max dates available.

    Returns:
        Tuple of (min_date, max_date) as strings in YYYY-MM-DD format
    """
    trips_path = PARQUET_DATA_DIR / "trips"
    if not trips_path.exists():
        return None, None

    try:
        # Read a small sample to get date range
        ddf = dd.read_parquet(
            trips_path,
            columns=["tpep_pickup_datetime"],
            engine="pyarrow"
        )

        # Compute min and max dates
        min_date = ddf["tpep_pickup_datetime"].min().compute()
        max_date = ddf["tpep_pickup_datetime"].max().compute()

        return (
            min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
            max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None
        )
    except Exception:
        return None, None


def get_available_payment_types() -> List[dict]:
    """
    Get list of payment types with their codes.

    Returns:
        List of dicts with 'code' and 'name' keys
    """
    # Standard NYC Taxi payment type codes
    return [
        {"code": 1, "name": "Credit card"},
        {"code": 2, "name": "Cash"},
        {"code": 3, "name": "No charge"},
        {"code": 4, "name": "Dispute"},
        {"code": 5, "name": "Unknown"},
        {"code": 6, "name": "Voided trip"}
    ]

