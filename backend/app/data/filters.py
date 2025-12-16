"""Data filtering utilities."""

from pydantic import BaseModel
from typing import List, Optional, Tuple


class Filters(BaseModel):
    """
    Common filter schema reused by all endpoints.

    Attributes:
        date_from: Start date in YYYY-MM-DD format
        date_to: End date in YYYY-MM-DD format
        boroughs: List of boroughs to filter (applied to pickup locations)
        hours: Tuple of (start_hour, end_hour) for filtering by time of day
        days_of_week: List of day indices (0=Monday, 6=Sunday)
        payment_types: List of payment type codes to include
        fare_range: Tuple of (min_fare, max_fare)
        distance_range: Tuple of (min_distance, max_distance)
        sample: Number of records to sample (0 means no sampling, used for scatter plots)
    """
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    boroughs: Optional[List[str]] = None
    hours: Optional[Tuple[int, int]] = None
    days_of_week: Optional[List[int]] = None
    payment_types: Optional[List[int]] = None
    fare_range: Optional[Tuple[float, float]] = None
    distance_range: Optional[Tuple[float, float]] = None
    sample: Optional[int] = 0

