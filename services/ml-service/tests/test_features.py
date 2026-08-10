"""Unit tests for feature preparation (pure logic)."""

from app.features.preparation import MonthlyTotals, prepare_features
from app.schemas.intelligence import TransactionFeature


def txn(t: str, a: int, d: str) -> TransactionFeature:
    return TransactionFeature(type=t, amountPaise=a, date=d, category="food")


def test_empty_history():
    features = prepare_features([])
    assert features.expenseTotalsPaise == []
    assert features.incomeTotalsPaise == []
    assert features.monthsAvailable == 0
    assert features.expenseCount == 0
    assert features.incomeCount == 0
    assert features.transactionCount == 0


def test_buckets_by_calendar_month_chronologically():
    history = [
        txn("expense", 1000, "2026-03-01"),
        txn("expense", 2000, "2026-01-10"),
        txn("expense", 1500, "2026-02-05"),
    ]
    features = prepare_features(history)
    assert features.expenseTotalsPaise == [2000, 1500, 1000]
    assert features.monthsAvailable == 3
    assert features.expenseCount == 3


def test_income_and_expense_separated():
    history = [
        txn("income", 500000, "2026-01-05"),
        txn("expense", 10000, "2026-01-10"),
        txn("expense", 20000, "2026-02-10"),
    ]
    features = prepare_features(history)
    assert features.incomeTotalsPaise == [500000, 0]
    assert features.expenseTotalsPaise == [10000, 20000]
    assert features.monthsAvailable == 2


def test_month_with_only_one_type_is_zero_filled_for_the_other():
    history = [
        txn("income", 100, "2026-01-01"),
        txn("expense", 50, "2026-02-01"),
    ]
    features = prepare_features(history)
    assert features.expenseTotalsPaise == [0, 50]
    assert features.incomeTotalsPaise == [100, 0]


def test_multiple_txns_same_month_are_summed():
    history = [
        txn("expense", 100, "2026-01-01"),
        txn("expense", 250, "2026-01-15"),
        txn("expense", 50, "2026-01-20"),
    ]
    features = prepare_features(history)
    assert features.expenseTotalsPaise == [400]


def test_deterministic():
    history = [
        txn("income", 100, "2026-01-01"),
        txn("expense", 50, "2026-01-05"),
    ]
    assert prepare_features(history) == prepare_features(history)


def test_returns_dataclass():
    assert isinstance(prepare_features([]), MonthlyTotals)