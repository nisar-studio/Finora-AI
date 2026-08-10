from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.analysis.forecasting import forecast_next_month_expense
from app.api.deps import require_internal_key

router = APIRouter(prefix="/predict", tags=["predict"], dependencies=[Depends(require_internal_key)])


class PredictSpendingRequest(BaseModel):
    """Monthly total spend (paise) per period, ordered oldest -> newest."""

    monthlyTotalsPaise: list[int] = Field(min_length=3, max_length=60)
    horizonMonths: int = Field(default=3, ge=1, le=12)


class PredictionPoint(BaseModel):
    monthIndex: int
    predictedPaise: int


class PredictSpendingResponse(BaseModel):
    horizonMonths: int
    predictionPoints: list[PredictionPoint]
    confidence: float


@router.post(
    "/spending",
    response_model=PredictSpendingResponse,
    status_code=status.HTTP_200_OK,
)
async def predict_monthly_spending(req: PredictSpendingRequest) -> PredictSpendingResponse:
    """Stateless forecast over monthly totals using the shared forecasting
    module. For the requested horizon beyond the first month the trend is
    extrapolated linearly; the first point reuses the module's honest next-month
    prediction."""
    base = forecast_next_month_expense(req.monthlyTotalsPaise)
    first = base.nextMonthExpensePaise or 0
    n = len(req.monthlyTotalsPaise)

    # Extrapolate the least-squares trail forward when we have a trend.
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(req.monthlyTotalsPaise) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, req.monthlyTotalsPaise)) / denom if denom else 0.0

    points: list[PredictionPoint] = []
    for k in range(1, req.horizonMonths + 1):
        if k == 1:
            predicted = first
        else:
            predicted = max(0, round(mean_y + slope * (n + k - 1)))
        points.append(PredictionPoint(monthIndex=k, predictedPaise=predicted))

    return PredictSpendingResponse(
        horizonMonths=req.horizonMonths,
        predictionPoints=points,
        confidence=base.confidence,
    )