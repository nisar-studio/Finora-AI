"""Unit tests for risk scoring (pure logic)."""

from app.analysis.risk import (
    MIN_MONTHS_FOR_MEANINGFUL_SCORE,
    RiskScore,
    score_risk,
)

VALID_LEVELS = ("low", "moderate", "high")


def test_empty_history_scored_in_moderate_band():
    result = score_risk([], [], anomaly_count=0, expense_count=0)
    assert 0.0 <= result.score <= 100.0
    assert result.level in VALID_LEVELS
    # With no history we must not assert high confidence.
    assert result.score < 70


def test_score_always_bounded():
    for i in range(0, 200):
        result = score_risk([i, i + 10], [1000, 1000], anomaly_count=i % 5, expense_count=50)
        assert 0.0 <= result.score <= 100.0


def test_low_risk_for_small_steady_spend_under_income():
    result = score_risk(
        expense_totals=[5000, 5100, 5200, 5100],
        income_totals=[15000, 15000, 15000, 15000],
        anomaly_count=0,
        expense_count=80,
    )
    assert result.level == "low"
    assert result.score < 40


def test_high_risk_when_spend_exceeds_income():
    # Volatile, sharply rising spend well above income -> high risk.
    result = score_risk(
        expense_totals=[10000, 30000, 50000, 90000],
        income_totals=[15000, 15000, 15000, 15000],
        anomaly_count=0,
        expense_count=100,
    )
    assert result.level == "high"
    assert result.score >= 70


def test_spend_slightly_over_income_is_moderate():
    result = score_risk(
        expense_totals=[20000, 22000, 25000, 28000],
        income_totals=[15000, 15000, 15000, 15000],
        anomaly_count=0,
        expense_count=100,
    )
    assert result.level == "moderate"


def test_anomaly_prevalence_raises_score():
    steady = score_risk(
        expense_totals=[10000, 30000, 50000, 90000],
        income_totals=[15000] * 4,
        anomaly_count=0,
        expense_count=100,
    )
    anomalous = score_risk(
        expense_totals=[10000, 30000, 50000, 90000],
        income_totals=[15000] * 4,
        anomaly_count=60,
        expense_count=100,
    )
    assert anomalous.score > steady.score


def test_deterministic():
    args = dict(expense_totals=[5000, 5100, 5200, 5100], income_totals=[15000] * 4,
                anomaly_count=2, expense_count=80)
    assert score_risk(**args) == score_risk(**args)


def test_risk_score_is_dataclass():
    result = score_risk([1000, 1000], [2000, 2000], anomaly_count=0, expense_count=10)
    assert isinstance(result, RiskScore)


def test_no_income_signal_still_scores():
    result = score_risk(
        expense_totals=[1000, 2000, 3000, 4000],
        income_totals=[0, 0, 0, 0],
        anomaly_count=0,
        expense_count=40,
    )
    assert 0.0 <= result.score <= 100.0


def test_min_months_constant():
    assert MIN_MONTHS_FOR_MEANINGFUL_SCORE == 2


def test_insufficient_history_pulls_toward_moderate():
    # A single month with a tiny expense and no income must not be scored as
    # "high" purely from one point of data.
    result = score_risk([10], [], anomaly_count=0, expense_count=1)
    assert result.score < 70