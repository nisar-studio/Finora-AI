from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.analysis.anomalies import detect_anomalies
from app.api.deps import require_internal_key
from app.schemas.intelligence import TransactionFeature

router = APIRouter(prefix="/detect", tags=["detect"], dependencies=[Depends(require_internal_key)])


class AnomalyDetectionRequest(BaseModel):
    history: list[TransactionFeature] = Field(min_length=1)


class AnomalyResult(BaseModel):
    category: str
    amountPaise: int
    date: str
    severity: str
    deviation: float


@router.post("/anomalies", response_model=list[AnomalyResult], status_code=status.HTTP_200_OK)
async def detect_anomaly(req: AnomalyDetectionRequest) -> list[AnomalyResult]:
    """Unsupervised anomaly detection over the user's own history using the same
    shared module that backs the unified intelligence endpoint."""
    anomalies = detect_anomalies(req.history)
    return [
        AnomalyResult(
            category=a.category,
            amountPaise=a.amountPaise,
            date=a.date,
            severity=a.severity,
            deviation=a.deviation,
        )
        for a in anomalies
    ]