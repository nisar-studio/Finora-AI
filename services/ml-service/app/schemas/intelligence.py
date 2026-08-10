"""Versioned request/response contract for the unified financial-intelligence endpoint.

The Node backend (apps/api) authenticates the user, loads only that user's own
transactions, and forwards an explicit financial feature payload. This service
never receives clerkId, emails, names, or Clerk tokens - only the numeric
features required by the statistical models.
"""

from typing import Literal

from pydantic import BaseModel, Field

TransactionType = Literal["income", "expense"]

SEVERITY = Literal["low", "medium", "high"]


class TransactionFeature(BaseModel):
    """A single historical transaction, expressed in integer paise."""

    type: TransactionType
    category: str = Field(min_length=1, max_length=32)
    amountPaise: int = Field(ge=1)
    date: str = Field(min_length=10, max_length=10, pattern=r"^\d{4}-\d{2}-\d{2}$")


class FinancialIntelligenceRequest(BaseModel):
    """Only the user's financial history. No identity fields, no tokens."""

    history: list[TransactionFeature] = Field(default_factory=list)


class DataQualityReport(BaseModel):
    transactionCount: int = Field(ge=0)
    expenseCount: int = Field(ge=0)
    monthsAvailable: int = Field(ge=0)
    sufficientHistory: bool


class RiskReport(BaseModel):
    score: float = Field(ge=0, le=100)
    level: Literal["low", "moderate", "high"]


class ForecastReport(BaseModel):
    nextMonthExpensePaise: int | None
    confidence: float = Field(ge=0, le=1)


class AnomalyReport(BaseModel):
    category: str
    amountPaise: int = Field(ge=1)
    date: str
    severity: SEVERITY
    deviation: float = Field(ge=0)


class PatternReport(BaseModel):
    category: str
    trend: float = Field(ge=-1, le=1)
    recurring: bool


class FinancialIntelligenceResponse(BaseModel):
    modelVersion: str
    dataQuality: DataQualityReport
    risk: RiskReport
    forecast: ForecastReport
    anomalies: list[AnomalyReport] = Field(default_factory=list)
    patterns: list[PatternReport] = Field(default_factory=list)