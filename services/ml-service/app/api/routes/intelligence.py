"""Unified financial-intelligence endpoint.

This is the primary route the Node backend calls. Node authenticates the user,
loads only that user's transactions, and sends an explicit feature payload
(history of income/expense in integer paise). It receives back a structured
risk / forecast / anomaly report. Everything stays stateless: one request -> one
deterministic computation.

Protected by the shared internal API key; the browser never reaches it and never
sees it.
"""

from fastapi import APIRouter, Depends, status

from app.analysis.anomalies import detect_anomalies
from app.analysis.forecasting import forecast_next_month_expense
from app.analysis.patterns import analyze_patterns
from app.analysis.risk import score_risk
from app.api.deps import require_internal_key
from app.core.config import settings
from app.features.preparation import prepare_features
from app.schemas.intelligence import (
    AnomalyReport,
    DataQualityReport,
    FinancialIntelligenceRequest,
    FinancialIntelligenceResponse,
    ForecastReport,
    PatternReport,
    RiskReport,
)

router = APIRouter(prefix="/financial-intelligence", tags=["intelligence"], dependencies=[Depends(require_internal_key)])


@router.post(
    "",
    response_model=FinancialIntelligenceResponse,
    status_code=status.HTTP_200_OK,
)
async def financial_intelligence(req: FinancialIntelligenceRequest) -> FinancialIntelligenceResponse:
    features = prepare_features(req.history)

    # Minimum history to call the headline numbers meaningful.
    sufficient_history = features.expenseCount >= 3 and features.monthsAvailable >= 2

    forecast = forecast_next_month_expense(features.expenseTotalsPaise)

    anomalies = detect_anomalies(req.history)
    anomaly_reports = [
        AnomalyReport(
            category=a.category,
            amountPaise=a.amountPaise,
            date=a.date,
            severity=a.severity,
            deviation=a.deviation,
        )
        for a in anomalies
    ]

    risk = score_risk(
        expense_totals=features.expenseTotalsPaise,
        income_totals=features.incomeTotalsPaise,
        anomaly_count=len(anomalies),
        expense_count=features.expenseCount,
    )

    pattern_reports = [
        PatternReport(category=p.category, trend=p.trend, recurring=p.recurring)
        for p in analyze_patterns(features.categoryExpenseTotalsPaise)
    ]

    return FinancialIntelligenceResponse(
        modelVersion=settings.model_version,
        dataQuality=DataQualityReport(
            transactionCount=features.transactionCount,
            expenseCount=features.expenseCount,
            monthsAvailable=features.monthsAvailable,
            sufficientHistory=sufficient_history,
        ),
        risk=RiskReport(score=risk.score, level=risk.level),
        forecast=ForecastReport(
            nextMonthExpensePaise=forecast.nextMonthExpensePaise,
            confidence=forecast.confidence,
        ),
        anomalies=anomaly_reports,
        patterns=pattern_reports,
    )