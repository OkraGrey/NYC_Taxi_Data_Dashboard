"""Dask client configuration and management."""

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
        # Local single-machine cluster, good defaults for Mac
        _client = Client(processes=True, threads_per_worker=2)
    return _client

