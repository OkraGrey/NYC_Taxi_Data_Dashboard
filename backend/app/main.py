"""FastAPI main application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Preload ML model
    try:
        from .routers.predict import preload_model
        if preload_model():
            print("ML fare prediction model loaded successfully")
        else:
            print("Warning: ML model not available - prediction endpoints will fail")
    except Exception as e:
        print(f"Warning: Could not preload ML model: {e}")

    yield

    # Shutdown: cleanup if needed
    pass


app = FastAPI(title="NYC Taxi Dashboard API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


