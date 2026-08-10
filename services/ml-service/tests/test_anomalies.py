"""Unit tests for anomaly detection (pure logic)."""

from app.analysis.anomalies import (
    MIN_GLOBAL_SAMPLES,
    detect_anomalies,
)
from app.schemas.intelligence import TransactionFeature


def txns(items: list[tuple[str, int, str]], category: str = "food") -> list[TransactionFeature]:
    """items: (type, amountPaise, date) - date as YYYY-MM-DD."""
    return [
        TransactionFeature(type=t, amountPaise=a, date=d, category=category)
        for t, a, d in items
    ]


def test_empty_history_has_no_anomalies():
    assert detect_anomalies([]) == []


def test_too_few_expenses_has_no_anomalies():
    history = txns([("expense", 100, "2026-01-01"), ("expense", 200, "2026-01-02")])
    assert detect_anomalies(history) == []


def test_normal_spending_no_anomalies():
    history = txns(
        [
            ("expense", 1000, "2026-01-01"),
            ("expense", 1050, "2026-01-05"),
            ("expense", 980, "2026-01-10"),
            ("expense", 1020, "2026-01-15"),
            ("expense", 1100, "2026-01-20"),
        ]
    )
    assert detect_anomalies(history) == []


def test_anomalous_spend_is_flagged():
    history = txns(
        [
            ("expense", 1000, "2026-01-01"),
            ("expense", 1050, "2026-01-05"),
            ("expense", 980, "2026-01-10"),
            ("expense", 1020, "2026-01-15"),
            ("expense", 50000, "2026-01-20"),
        ]
    )
    anomalies = detect_anomalies(history)
    assert len(anomalies) >= 1
    flagged = [a for a in anomalies if a.amountPaise == 50000]
    assert flagged, anomalies
    assert flagged[0].severity in ("low", "medium", "high")
    assert flagged[0].date == "2026-01-20"
    assert flagged[0].deviation >= 0


def test_anomalies_deterministic():
    history = txns(
        [
            ("expense", 1000, "2026-01-01"),
            ("expense", 1050, "2026-01-05"),
            ("expense", 980, "2026-01-10"),
            ("expense", 1020, "2026-01-15"),
            ("expense", 50000, "2026-01-20"),
        ]
    )
    assert detect_anomalies(history) == detect_anomalies(history)


def test_income_transactions_ignored_for_detection():
    history = txns(
        [
            ("income", 1000000, "2026-01-01"),
            ("income", 1000000, "2026-01-02"),
            ("income", 1000000, "2026-01-03"),
            ("expense", 1000, "2026-01-04"),
            ("expense", 1020, "2026-01-05"),
            ("expense", 980, "2026-01-06"),
            ("expense", 1040, "2026-01-07"),
            ("expense", 1010, "2026-01-08"),
        ]
    )
    assert detect_anomalies(history) == []


def test_sparse_category_uses_global_distribution():
    # food has 5 samples (self-scored); compare gets 2 samples (below the
    # per-category threshold) so it is scored against the global expense
    # distribution, where the extreme compare value is caught.
    history = txns(
        [
            ("expense", 1000, "2026-01-01"),
            ("expense", 1020, "2026-01-02"),
            ("expense", 980, "2026-01-03"),
            ("expense", 1010, "2026-01-04"),
            ("expense", 1030, "2026-01-05"),
        ],
        category="food",
    )
    history.extend(
        txns(
            [
                ("expense", 1500, "2026-01-06"),
                ("expense", 999999, "2026-01-07"),
            ],
            category="compare",
        )
    )
    anomalies = detect_anomalies(history)
    assert len(anomalies) >= 1
    assert any(a.amountPaise == 999999 for a in anomalies)


def test_requires_min_global_samples_constant():
    assert MIN_GLOBAL_SAMPLES == 5