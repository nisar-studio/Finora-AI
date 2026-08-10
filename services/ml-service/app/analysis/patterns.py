"""Category trend / recurring-pattern analysis.

Deterministic statistics over category monthly aggregates: linear trend sign and
magnitude, plus a "recurring" flag when a category appears with spend in most
available months.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

RECURRING_MIN_FRACTION = 0.5  # present in at least half the available months


@dataclass(frozen=True)
class CategoryPattern:
    category: str
    trend: float  # normalized slope: positive = rising, negative = falling
    recurring: bool


def _trend_of(totals: list[int]) -> float:
    n = len(totals)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(totals) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0 or mean_y <= 0:
        return 0.0
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, totals)) / denom
    return round(max(-1.0, min(1.0, slope / mean_y)), 4)


def analyze_patterns(category_totals: dict[str, list[int]]) -> list[CategoryPattern]:
    """Compute per-category trend and recurrence.

    `category_totals` maps category -> chronological monthly totals. The number
    of available months is the union across categories.
    """
    all_months = set()
    for totals in category_totals.values():
        all_months.add(len(totals))
    available_months = max(all_months) if all_months else 0

    results: list[CategoryPattern] = []
    for category, totals in category_totals.items():
        active_months = sum(1 for t in totals if t > 0)
        recurring = (
            available_months > 0 and active_months / available_months >= RECURRING_MIN_FRACTION
        )
        results.append(
            CategoryPattern(
                category=category,
                trend=_trend_of(totals),
                recurring=recurring,
            )
        )
    results.sort(key=lambda p: p.trend, reverse=True)
    return results