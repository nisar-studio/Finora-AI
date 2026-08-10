"""Internal authentication for the ML service.

Only the Node.js backend should reach these endpoints. The browser never calls
this service directly; Node authenticates the user and forwards the internal key
alongside an explicit financial feature payload (never a Clerk token, never a
clerkId, never an email/name).
"""

from fastapi import Header, HTTPException, status

from app.core.config import settings

API_KEY_HEADER = "x-ml-api-key"


def require_internal_key(x_ml_api_key: str | None = Header(default=None)) -> None:
    if not settings.ml_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML service is not configured (ML_SERVICE_API_KEY missing).",
        )
    if x_ml_api_key != settings.ml_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key.",
        )