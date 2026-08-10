"""Expense forecasting from monthly historical aggregates.

Deterministic, honest statistical forecasting. No supervised training and no
fabricated data: if there is not enough history to justify a trend we fall back
to a trailing-average baseline and clearly lower the confidence.
"""

from __future__ import annotations

from dataclasses import dataclass

MIN_MONTHS_FOR_TREND = 3


@dataclass(frozen=True)
class Forecast:
    nextMonthExpensePaise: int | None
    confidence: float
    method: str


def _linear_trend(totals: list[int]) -> tuple[float, float] | None:
    """Least-squares slope and intercept over chronological month indices.

    Returns None when it cannot be meaningfully estimated (too few points or
    zero variance with a single point).
    """
    n = len(totals)
    if n < 2:
        return None
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(totals) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, totals)) / denom
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _residual_mse(totals: list[int], slope: float, intercept: float) -> float:
    n = len(totals)
    if n == 0:
        return 0.0
    return sum((y - (slope * i + intercept)) ** 2 for i, y in enumerate(totals)) / n


def forecast_next_month_expense(monthlyExpenseTotalsPaise: list[int]) -> Forecast:
    """Forecast next month's total expense (integer paise).

    - 0 months  -> None (no history), confidence 0.
    - 1 month   -> repeat the single value, low confidence.
    - 2 months  -> trailing average (sign of a trend estimate), modest confidence.
    - >=3 months -> least-squares linear trend on chronological month indices.
    """
    n = len(monthlyExpenseTotalsPaise)
    if n == 0:
        return Forecast(nextMonthExpensePaise=None, confidence=0.0, method="insufficient_data")
    if n == 1:
        return Forecast(
            nextMonthExpensePaise=monthlyExpenseTotalsPaise[0],
            confidence=0.1,
            method="single_value",
        )

    fit = _linear_trend(monthlyExpenseTotalsPaise)
    if fit is None:
        return Forecast(nextMonthExpensePaise=None, confidence=0.0, method="insufficient_data")

    slope, intercept = fit
    next_index = n  # next chronological month index after the last observed.
    predicted = intercept + slope * next_index
    predicted = max(0, round(predicted))

    mean = sum(monthlyExpenseTotalsPaise) / n
    residual_mse = _residual_mse(monthlyExpenseTotalsPaise, slope, intercept)
    # Normalize residual by the mean spend so confidence is scale-independent.
    relative_error = (residual_mse ** 0.5) / mean if mean > 0 else 0.0

    if n >= MIN_MONTHS_FOR_TREND:
        method = "linear_trend"
        # Fewer months and higher relative error both lower confidence.
        confidence = max(0.0, min(1.0, 0.85 * (1.0 - min(relative_error, 2.0) / 2.0)))
        confidence *= min(1.0, n / 12.0)
    else:
        method = "trailing_average"
        predicted = max(0, round(sum(monthlyExpenseTotalsPaise) / n))
        # Two months: conservatively low confidence.
        confidence = 0.2

    confidence = round(confidence, 4)
    if confidence > 0.95:
        confidence = 0.95
    return Forecast(nextMonthExpensePaise=predicted, confidence=confidence, method=method)