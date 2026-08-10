from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.analysis.patterns import analyze_patterns
from app.api.deps import require_internal_key

router = APIRouter(prefix="/analyze", tags=["analyze"], dependencies=[Depends(require_internal_key)])


class CategorySpending(BaseModel):
    category: str = Field(min_length=1)
    totalsPaise: list[int] = Field(min_length=1, max_length=60)


class PatternAnalysisRequest(BaseModel):
    byCategory: list[CategorySpending]


class PatternSummary(BaseModel):
    category: str
    trend: float
    recurring: bool


class PatternAnalysisResponse(BaseModel):
    patterns: list[PatternSummary]


@router.post(
    "/patterns",
    response_model=PatternAnalysisResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_patterns_route(req: PatternAnalysisRequest) -> PatternAnalysisResponse:
    category_totals = {c.category: c.totalsPaise for c in req.byCategory}
    patterns = analyze_patterns(category_totals)
    return PatternAnalysisResponse(
        patterns=[
            PatternSummary(category=p.category, trend=p.trend, recurring=p.recurring)
            for p in patterns
        ]
    )