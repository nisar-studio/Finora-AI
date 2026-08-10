"""Anomaly / unusual-spending detection.

Unsupervised, deterministic, robust statistics (median + MAD) evaluated per
category over the user's own history. No fabricated training data and no random
outputs: a transaction is anomalous when it deviates strongly from the typical
distribution of the same category. Sparse categories fall back to the global
expense distribution of the user.

Only abnormally *large* spends are flagged, matching "unusual spending" in a
personal-finance context. Severity is derived from the robust z-score.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.intelligence import TransactionFeature

MIN_CATEGORY_SAMPLES = 3
MIN_GLOBAL_SAMPLES = 5
Z_THRESHOLD = 2.5
FOLD_FALLBACK = 4.0  # used when MAD == 0: requires x >= median * 4

SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"


@dataclass(frozen=True)
class Anomaly:
    category: str
    amountPaise: int
    date: str
    severity: str
    deviation: float  # modified z-score (positive, in number of MADs)


def _median(values: list[int]) -> float:
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 1:
        return float(ordered[mid])
    return (ordered[mid - 1] + ordered[mid]) / 2.0


def _mad(values: list[int], median: float) -> float:
    deviations = [abs(v - median) for v in values]
    return _median(deviations)


def _robust_z(values: list[int], candidate: int) -> float:
    """Modified z-score: 0.6745 * (x - median) / MAD. Returns -inf sentinel when
    the scale (MAD) is zero so callers apply the fold fallback."""
    median = _median(values)
    mad = _mad(values, median)
    if mad == 0:
        return float("-inf")
    return 0.6745 * (candidate - median) / mad


def _severity(z: float) -> str:
    if z >= 8.0:
        return SEVERITY_HIGH
    if z >= 4.0:
        return SEVERITY_MEDIUM
    return SEVERITY_LOW


def _flag_category(category: str, amounts: list[int], txns: list[TransactionFeature]) -> list[Anomaly]:
    """Flag large spend in a single category. `amounts` is the distribution the
    z-score is computed against (may include the flagged candidate itself, which
    is fine for robust MAD-based statistics)."""
    results: list[Anomaly] = []
    median = _median(amounts)
    mad = _mad(amounts, median)

    if mad > 0:
        for txn in txns:
            z = 0.6745 * (txn.amountPaise - median) / mad
            if z >= Z_THRESHOLD:
                results.append(
                    Anomaly(
                        category=category,
                        amountPaise=txn.amountPaise,
                        date=txn.date,
                        severity=_severity(z),
                        deviation=round(z, 4),
                    )
                )
    else:
        # Scale-free distribution (e.g. all identical): require a large multiple.
        if median > 0:
            for txn in txns:
                if txn.amountPaise >= median * FOLD_FALLBACK:
                    # Relative distance in "multiples of median" drives severity.
                    ratio = txn.amountPaise / median
                    z = (ratio - 1.0) * 2.0
                    results.append(
                        Anomaly(
                            category=category,
                            amountPaise=txn.amountPaise,
                            date=txn.date,
                            severity=_severity(z),
                            deviation=round(max(z, Z_THRESHOLD), 4),
                        )
                    )
    return results


def detect_anomalies(history: list[TransactionFeature]) -> list[Anomaly]:
    """Detect unusually large expenses from the user's own history.

    Deterministic. Categories with at least MIN_CATEGORY_SAMPLES are scored
    against their own distribution; smaller categories are scored against the
    global expense distribution.
    """
    if not history:
        return []

    expenses = [t for t in history if t.type == "expense"]
    if len(expenses) < MIN_GLOBAL_SAMPLES:
        return []

    by_category: dict[str, list[TransactionFeature]] = {}
    for txn in expenses:
        by_category.setdefault(txn.category, []).append(txn)

    all_amounts = [t.amountPaise for t in expenses]
    had_self_scored: set[str] = set()

    results: list[Anomaly] = []

    for category, txns in by_category.items():
        amounts = [t.amountPaise for t in txns]
        if len(amounts) >= MIN_CATEGORY_SAMPLES:
            results.extend(_flag_category(category, amounts, txns))
            had_self_scored.add(category)

    for category, txns in by_category.items():
        if category in had_self_scored:
            continue
        results.extend(_flag_category(category, all_amounts, txns))

    results.sort(key=lambda a: a.deviation, reverse=True)
    return results