"""Unit tests for spending forecasting (pure logic)."""

from app.analysis.forecasting import (
    MIN_MONTHS_FOR_TREND,
    Forecast,
    forecast_next_month_expense,
)


def test_empty_history_returns_none_forecast():
    result = forecast_next_month_expense([])
    assert isinstance(result, Forecast)
    assert result.nextMonthExpensePaise is None
    assert result.confidence == 0.0
    assert result.method == "insufficient_data"


def test_single_month_repeats_value_with_low_confidence():
    result = forecast_next_month_expense([10000])
    assert result.nextMonthExpensePaise == 10000
    assert result.confidence == 0.1
    assert result.method == "single_value"


def test_two_months_uses_trailing_average():
    result = forecast_next_month_expense([10000, 20000])
    assert result.nextMonthExpensePaise == 15000
    assert result.confidence == 0.2
    assert result.method == "trailing_average"


def test_flat_three_months_is_deterministic():
    result_a = forecast_next_month_expense([5000, 5000, 5000])
    result_b = forecast_next_month_expense([5000, 5000, 5000])
    assert result_a == result_b
    assert result_a.nextMonthExpensePaise == 5000
    assert result_a.method == "linear_trend"


def test_default_confidence_stays_bounded():
    for totals in (
        [1000, 1000, 1000],
        [100, 200, 150, 400],
        [1, 2, 3, 4, 5, 6, 7, 8, 300],
    ):
        result = forecast_next_month_expense(totals)
        assert 0.0 <= result.confidence <= 1.0, totals


def test_monotonic_increasing_baseline():
    # A clean rising trend should project above the last observed value
    # (deterministic, not guaranteed exact - just a sanity check).
    result = forecast_next_month_expense([10000, 20000, 30000])
    assert result.nextMonthExpensePaise is not None
    assert result.nextMonthExpensePaise >= 30000


def test_forecast_never_negative():
    # Even with a steep negative trend the forecast is floored at zero.
    result = forecast_next_month_expense([100, 50, 10])
    assert result.nextMonthExpensePaise == 0


def test_conf_increases_with_more_data_for_same_shape():
    light = forecast_next_month_expense([1000, 1000, 1000])
    heavy = forecast_next_month_expense([1000] * 10)
    assert heavy.confidence >= light.confidence


def test_min_months_constants():
    assert MIN_MONTHS_FOR_TREND == 3