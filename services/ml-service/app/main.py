"""Finora AI ML service.

FastAPI application for prediction, anomaly detection, and pattern analysis.
Not directly reachable from the browser - only the Node backend calls it,
authenticated with the internal API key  (ML_SERVICE_API_KEY).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(
    title="Finora AI ML Service",
    version=settings.model_version,
    description="Stateless spending-risk, forecasting, and anomaly detection for Finora AI.",
    lifespan=lifespan,
)

if settings.debug:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"service": settings.service_name, "status": "ok"}