"""Spending-risk scoring.

A deterministic, transparent composite of statistical patterns from the user's
own history: spend volatility, recent trend, expense-to-income pressure, and
anomaly prevalence. The score is 0-100; the level is derived from fixed
thresholds. It is a statistical risk indicator, not a verified prediction -
explicitly documented as such. No learned weights, no fabricated data.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

LEVEL_LOW = "low"
LEVEL_MODERATE = "moderate"
LEVEL_HIGH = "high"

# Minimum months of data before we treat the score as meaningful.
MIN_MONTHS_FOR_MEANINGFUL_SCORE = 2


@dataclass(frozen=True)
class RiskScore:
    score: float  # 0..100
    level: str


def _mean(values: list[int]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _stddev_pop(values: list[int], mean: float) -> float:
    if len(values) < 2:
        return 0.0
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)


def _component_volatility(expense_totals: list[int]) -> float:
    mean = _mean(expense_totals)
    if mean <= 0:
        return 0.0
    cv = _stddev_pop(expense_totals, mean) / mean
    # CV below 0.25 is low risk; CV above 0.75 is high risk.
    return max(0.0, min(1.0, (cv - 0.25) / 0.5))


def _component_trend(expense_totals: list[int]) -> float:
    """Rising average expense increases risk. Slope is normalized by the mean."""
    n = len(expense_totals)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = _mean(expense_totals)
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0 or mean_y <= 0:
        return 0.0
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, expense_totals)) / denom
    norm = slope / mean_y
    if norm <= 0:
        return 0.0
    return max(0.0, min(1.0, norm / 0.5))


def _component_income_pressure(expense_totals: list[int], income_totals: list[int]) -> float:
    """Ratio of average monthly expense to average monthly income (per available
    month). Only meaningful when income data exists. 0.75 or below is low risk;
    1.5+ (spending beyond income) is high risk."""
    avg_expense = _mean(expense_totals)
    avg_income = _mean(income_totals)
    if avg_income <= 0:
        return 0.0  # no income signal -> neutral, weight shifted by caller
    ratio = avg_expense / avg_income
    if ratio <= 0.75:
        return 0.0
    return max(0.0, min(1.0, (ratio - 0.75) / 0.75))


def _component_anomaly_prevalence(anomaly_count: int, expense_count: int) -> float:
    if expense_count == 0:
        return 0.0
    prevalence = anomaly_count / expense_count
    # 5%+ of expenses being anomalous is high risk.
    return max(0.0, min(1.0, prevalence / 0.05))


def score_risk(
    expense_totals: list[int],
    income_totals: list[int],
    anomaly_count: int,
    expense_count: int,
) -> RiskScore:
    """Composite spending-risk score in [0, 100].

    If history is too thin the score is intentionally pulled toward the moderate
    band rather than asserting a precise level.
    """
    volatility = _component_volatility(expense_totals)
    trend = _component_trend(expense_totals)
    income_pressure = _component_income_pressure(expense_totals, income_totals)
    anomaly_prevalence = _component_anomaly_prevalence(anomaly_count, expense_count)

    has_income_signal = _mean(income_totals) > 0

    if has_income_signal:
        weights = [0.25, 0.25, 0.35, 0.15]  # vol, trend, income, anomalies
        parts = [volatility, trend, income_pressure, anomaly_prevalence]
    else:
        weights = [0.35, 0.35, 0.30]  # vol, trend, anomalies (no income signal)
        parts = [volatility, trend, anomaly_prevalence]

    raw = sum(w * p for w, p in zip(weights, parts))
    total_weight = sum(weights)
    combined = raw / total_weight if total_weight else 0.0

    months = len([t for t in expense_totals if t > 0])
    if months < MIN_MONTHS_FOR_MEANINGFUL_SCORE:
        # Not enough history: stay within a conservative moderate band.
        combined = combined * 0.4 + 0.35

    score = round(max(0.0, min(100.0, combined * 100.0)), 1)

    if score < 40:
        level = LEVEL_LOW
    elif score < 70:
        level = LEVEL_MODERATE
    else:
        level = LEVEL_HIGH
    return RiskScore(score=score, level=level)