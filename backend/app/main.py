"""FastAPI main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="NYC Taxi Dashboard API")

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
from .routers import meta, kpis, temporal, geo, fares, quality

app.include_router(meta.router)
app.include_router(kpis.router)
app.include_router(temporal.router)
app.include_router(geo.router)
app.include_router(fares.router)
app.include_router(quality.router)


