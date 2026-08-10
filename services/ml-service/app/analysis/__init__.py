"""Statistical/ML intelligence for the Finora ML service.

These modules are pure Python (no FastAPI imports) so the logic is directly
unit-testable. They operate only on numeric feature representation prepared from
the validated request history.
"""

from app.analysis.anomalies import Anomaly, detect_anomalies
from app.analysis.forecasting import Forecast, forecast_next_month_expense
from app.analysis.risk import RiskScore, score_risk

__all__ = [
    "Anomaly",
    "Forecast",
    "RiskScore",
    "detect_anomalies",
    "forecast_next_month_expense",
    "score_risk",
]