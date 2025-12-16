"""Dask client configuration and management."""

import os
from dask.distributed import Client

_client = None

def get_client():
    """
    Get or create a singleton Dask client with LocalCluster.

    Returns:
        Client: Dask distributed client
    """
    global _client
    if _client is None:
        # Optimize for production: fewer processes, more threads
        # In production, use threads to reduce memory overhead
        is_production = os.getenv("PORT") == "8080"
        
        if is_production:
            # Production: Use threaded scheduler for lower memory footprint
            _client = Client(
                processes=False,  # Use threads instead of processes
                threads_per_worker=4,
                memory_limit='3GB',
                silence_logs=30
            )
        else:
            # Local development: processes are fine
            _client = Client(processes=True, threads_per_worker=2)
    return _client

