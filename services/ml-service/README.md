# Finora AI ML Service

Machine-learning / statistical intelligence for Finora AI. Plain Python 3 +
FastAPI + scikit-learn/numpy. **Not a public API** - only `apps/api` (the Node
backend) calls it, authenticated via an internal API key
(`ML_SERVICE_API_KEY`). The browser never reaches this service directly.

## Why Python ML exists in this architecture

- The Node backend owns authentication, authorization, MongoDB access, and the
  deterministic financial calculations (Transactions, Analytics, Goals, Coach).
- The Python service owns **statistical/forecasting intelligence only**: spend
  risk, expense forecasting, and unusual-spend detection.
- Node authenticates the user, queries **only that user's own transactions**,
  transforms them into a validated numeric feature payload, and sends it to this
  service. Python never sees a Clerk token, clerkId, email, name, or other users'
  data, and never touches MongoDB or Gemini.

## What the model / statistical methods do

All computations are deterministic (no random outputs) and work even with little
history. When history is too thin, the service says so (`sufficientHistory`) and
degrades to a baseline instead of inventing numbers.

### Expense forecasting (`app/analysis/forecasting.py`)
- `>= 3` months of data: least-squares linear trend over chronological month
  indices; confidence falls as the number of months drops and relative error
  rises.
- 2 months: trailing average, conservatively low confidence.
- 1 month: the single observed value with very low confidence.
- 0 months: `nextMonthExpensePaise = null`, confidence 0.

### Anomaly / unusual-spend detection (`app/analysis/anomalies.py`)
- Unsupervised robust statistics (median + MAD, modified z-score) per category.
- A category with enough samples is scored against its own distribution; sparse
  categories fall back to the user's global expense distribution.
- Only abnormally *large* spends are flagged, with `low`/`medium`/`high`
  severity scaled by the z-score.

### Spending risk score (`app/analysis/risk.py`)
- Composite 0-100 from four documented statistical signals: spend volatility,
  rising-spend trend, expense-to-income pressure (when income data exists), and
  anomaly prevalence.
- Fixed, transparent weights; `low` < 40, `moderate` 40-69, `high` >= 70.
- With too few months the score is pulled toward a conservative band rather than
  asserting precision.

### Pattern analysis (`app/analysis/patterns.py`)
- Per-category normalized trend (sign & magnitude) plus a `recurring` flag when a
  category is active in most available months.

**Honesty note:** these are statistical indicators, not verified predictions.
No accuracy metrics are claimed or fabricated here.

## Input contract (Node -> Python)

`POST /api/v1/financial-intelligence` with header `X-ML-API-KEY`.

```jsonc
{
  "history": [
    {
      "type": "income" | "expense",
      "category": "food",
      "amountPaise": 1200,          // integer paise
      "date": "2026-07-04"           // YYYY-MM-DD
    }
  ]
}
```

Only financial features. **No** clerkId, user email/name, or tokens - the schema
rejects them.

## Output contract (Python -> Node)

```jsonc
{
  "modelVersion": "v1",
  "dataQuality": {
    "transactionCount": 12,
    "expenseCount": 8,
    "monthsAvailable": 3,
    "sufficientHistory": true
  },
  "risk":    { "score": 42.0, "level": "moderate" },
  "forecast":{
    "nextMonthExpensePaise": 150000,   // null when insufficient history
    "confidence": 0.6                    // 0..1
  },
  "anomalies": [
    { "category": "shopping", "amountPaise": 999999, "date": "2026-07-20",
      "severity": "high", "deviation": 12.4 }
  ]
}
```

## Other internal endpoints

The legacy scaffold routes remain available and delegate to the same modules:

- `POST /api/v1/predict/spending` - forecast over monthly totals.
- `POST /api/v1/detect/anomalies` - per-transaction anomaly results.
- `POST /api/v1/analyze/patterns` - category trends + recurrence.

## How Node communicates with Python

`apps/api/src/services/mlClient.service.ts`:

1. `MlServiceClient.fromEnv()` builds a client from `ML_SERVICE_URL` +
   `ML_SERVICE_API_KEY`.
2. `apps/api/src/modules/intelligence/` loads the authenticated user's own
   transactions (scoped by `clerkId`), transforms them into the feature payload,
   calls the unified endpoint with a **5s timeout**, and validates the response
   against a zod schema before returning it to the browser.
3. If Python is missing, down, or returns malformed output, the API degrades to
   a typed error (`503` / `502`) instead of crashing or leaking internals.

## Run locally

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
Copy-Item .env.example .env                               # set ML_SERVICE_API_KEY
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

## How the system behaves with insufficient history

- `dataQuality.sufficientHistory` is false when there are fewer than 3 expenses
  or fewer than 2 months of activity.
- `forecast.nextMonthExpensePaise` becomes `null` with no history.
- Risk scoring stays within a conservative band and never claims precision.

## Tests

```bash
.venv/Scripts/python -m pytest -v
```

Unit tests cover feature preparation, forecasting, anomalies, risk, and patterns
directly (no FastAPI needed). API tests exercise the real endpoints and internal
key gate.