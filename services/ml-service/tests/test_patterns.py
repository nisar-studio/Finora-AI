"""Unit tests for category pattern / trend analysis (pure logic)."""

from app.analysis.patterns import (
    RECURRING_MIN_FRACTION,
    analyze_patterns,
)


def test_empty_input():
    assert analyze_patterns({}) == []


def test_rising_trend_detected():
    patterns = analyze_patterns({"food": [1000, 2000, 3000]})
    assert len(patterns) == 1
    assert patterns[0].category == "food"
    assert patterns[0].trend > 0


def test_falling_trend_detected():
    patterns = analyze_patterns({"food": [3000, 2000, 1000]})
    assert patterns[0].trend < 0


def test_flat_trend_zero():
    patterns = analyze_patterns({"food": [1000, 1000, 1000]})
    assert patterns[0].trend == 0


def test_recurring_when_mostly_present():
    patterns = analyze_patterns({"rent": [1000, 1000, 1000, 1000]})
    assert patterns[0].recurring is True


def test_not_recurring_when_rare():
    patterns = analyze_patterns({"travel": [0, 0, 0, 5000]})
    assert patterns[0].recurring is False


def test_trend_bounded_to_unit_interval():
    extremes = analyze_patterns({"x": [1, 100000, 1, 100000, 1]})
    assert -1.0 <= extremes[0].trend <= 1.0


def test_deterministic():
    data = {"food": [1000, 2000, 3000], "rent": [5000, 5000, 5000]}
    assert analyze_patterns(data) == analyze_patterns(data)


def test_recurring_constant():
    assert 0.0 < RECURRING_MIN_FRACTION <= 1.0