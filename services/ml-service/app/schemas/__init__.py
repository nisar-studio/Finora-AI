"""Pydantic schemas for the ML service contract.

These mirror the JSON contract that apps/api sends and consumes. No FastAPI
imports here, so schemas stay usable anywhere.
"""

from app.schemas.intelligence import (
    AnomalyReport,
    DataQualityReport,
    FinancialIntelligenceRequest,
    FinancialIntelligenceResponse,
    ForecastReport,
    RiskReport,
    TransactionFeature,
)

__all__ = [
    "AnomalyReport",
    "DataQualityReport",
    "FinancialIntelligenceRequest",
    "FinancialIntelligenceResponse",
    "ForecastReport",
    "RiskReport",
    "TransactionFeature",
]