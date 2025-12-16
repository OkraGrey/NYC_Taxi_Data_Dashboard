"""FastAPI main application entry point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    print("Starting application initialization...")
    
    # Startup: Initialize Dask client early
    try:
        from .core.dask_client import get_client
        client = get_client()
        print(f"Dask client initialized: {client}")
    except Exception as e:
        print(f"Warning: Could not initialize Dask client: {e}")
    
    # Startup: Preload ML model
    try:
        from .routers.predict import preload_model
        if preload_model():
            print("ML fare prediction model loaded successfully")
        else:
            print("Warning: ML model not available - prediction endpoints will fail")
    except Exception as e:
        print(f"Warning: Could not preload ML model: {e}")
    
    # Warmup: Trigger a small data read to cache metadata
    try:
        from .data.io import read_trips
        from .data.filters import Filters
        import pandas as pd
        
        # Read a tiny sample to warm up the parquet metadata cache
        warmup_filters = Filters(
            date_from="2015-01-01",
            date_to="2015-01-02"
        )
        ddf = read_trips(warmup_filters)
        # Just count to trigger metadata loading
        _ = len(ddf)
        print("Data cache warmed up successfully")
    except Exception as e:
        print(f"Warning: Data warmup failed: {e}")
    
    print("Application startup complete")
    yield

    # Shutdown: cleanup Dask client
    try:
        from .core.dask_client import get_client
        client = get_client()
        client.close()
        print("Dask client closed")
    except Exception:
        pass


app = FastAPI(title="NYC Taxi Dashboard API", lifespan=lifespan)

# Configure CORS - support both development and production
# CORS_ORIGINS env var can be comma-separated list of allowed origins
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
cors_origins = [
    "http://localhost:3000",  # Local development
]

# Add production origins from environment
if cors_origins_env:
    cors_origins.extend([origin.strip() for origin in cors_origins_env.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "NYC Taxi Dashboard API"}


# Include routers
from .routers import meta, kpis, temporal, geo, fares, quality, predict

app.include_router(meta.router)
app.include_router(kpis.router)
app.include_router(temporal.router)
app.include_router(geo.router)
app.include_router(fares.router)
app.include_router(quality.router)
app.include_router(predict.router)


