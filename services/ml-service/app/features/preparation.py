"""Feature preparation: turn the validated history into simple numeric
features the statistical models can consume.

No FastAPI, no pydantic model dependencies beyond the schema dataclasses - fully
unit-testable in isolation.

All monetary values stay in integer paise.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from app.schemas.intelligence import TransactionFeature


@dataclass(frozen=True)
class MonthlyTotals:
    """Chronological monthly expense/income totals.

    Only calendar months that actually contain an expense (or income) transaction
    appear, in ascending order. `monthsAvailable` is the number of distinct
    calendar months with activity.

    `categoryExpenseTotalsPaise` maps each spent-on category to a chronological
    monthly expense total aligned with the same month index used by
    `expenseTotalsPaise`, so per-category trend/recurrence analysis stays
    deterministic and backend-authored.
    """

    expenseTotalsPaise: list[int]
    incomeTotalsPaise: list[int]
    monthsAvailable: int
    expenseCount: int
    incomeCount: int
    transactionCount: int
    categoryExpenseTotalsPaise: dict[str, list[int]]


def _month_key(date: str) -> str:
    # date is validated to YYYY-MM-DD already.
    return date[:7]


def prepare_features(history: list[TransactionFeature]) -> MonthlyTotals:
    """Aggregate features deterministically from the validated history."""
    expense_by_month: dict[str, int] = defaultdict(int)
    income_by_month: dict[str, int] = defaultdict(int)
    expense_by_category_month: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    expense_count = 0
    income_count = 0
    for txn in history:
        if txn.type == "expense":
            expense_by_month[_month_key(txn.date)] += txn.amountPaise
            expense_by_category_month[txn.category][_month_key(txn.date)] += txn.amountPaise
            expense_count += 1
        else:
            income_by_month[_month_key(txn.date)] += txn.amountPaise
            income_count += 1

    all_months = sorted(set(expense_by_month) | set(income_by_month))

    expense_totals = [expense_by_month.get(m, 0) for m in all_months]
    income_totals = [income_by_month.get(m, 0) for m in all_months]

    category_totals = {
        category: [monthly.get(m, 0) for m in all_months]
        for category, monthly in expense_by_category_month.items()
    }

    return MonthlyTotals(
        expenseTotalsPaise=expense_totals,
        incomeTotalsPaise=income_totals,
        monthsAvailable=len(all_months),
        expenseCount=expense_count,
        incomeCount=income_count,
        transactionCount=len(history),
        categoryExpenseTotalsPaise=category_totals,
    )