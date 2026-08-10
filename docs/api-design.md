# Finora AI — API Design

## 1. Conventions

- Public API base path: `/api/v1` (mounted on `apps/api`, port `4000` in dev).
- Internal ML endpoints on `services/ml-service` share the `/api/v1` prefix and
  are reachable **only** by a backend process presenting the internal key.
- Every `/api/v1` resource requires `Authorization: Bearer <Clerk JWT>`. The
  backend verifies the signature; `userId` is taken from the verified session,
  never from the request body.
- All amounts travel and are stored as **integer paise** (`type: number`).
- Uniform error body:
  ```json
  { "error": { "code": "NOT_FOUND", "message": "Transaction not found.", "details": {} } }
  ```
- Breaking changes bump the version prefix (`/api/v2`); migration aliases kept
  temporarily.

## 2. Public API surface (apps/api)

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | none | service health + `mongo` connection state |

### Authentication

Handled entirely by Clerk (hosted sign-in/sign-up, forgot password, JWT). The
backend only verifies sessions. A Clerk webhook optionally syncs profile data
into MongoDB; otherwise users are lazily upserted on first authenticated request.

### Transactions (Phase 1)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/transactions` | paginated list; filters `type`, `category`, `from`, `to`, `q` |
| POST | `/api/v1/transactions` | create income/expense (validated, paise) |
| GET | `/api/v1/transactions/:id` | fetch owner-scoped |
| PATCH | `/api/v1/transactions/:id` | update owner-scoped |
| DELETE | `/api/v1/transactions/:id` | delete owner-scoped |

Owner-scoped routes return the same `404` for missing and foreign records so
cross-user probing is not detectable.

### Dashboard & Analytics (Phase 1)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/dashboard` | balance, monthly income/expense, savings rate, net worth, recent tx, health snapshot |
| GET | `/api/v1/analytics/spending` | category breakdown + monthly trend |
| GET | `/api/v1/analytics/categories` | top categories with delta vs prev period |

### Coach (Phase 1)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/coach/query` | `{ question }` → `{ answer, sources }`; rate-limited |
| GET | `/api/v1/coach/suggestions` | context-aware suggested questions |

### Savings Goals (Phase 1)

| Method | Path | Description |
| --- | --- | --- |
| GET / POST | `/api/v1/goals` | list / create |
| PATCH / DELETE | `/api/v1/goals/:id` | update / delete (owner-scoped) |
| GET | `/api/v1/goals/:id/progress` | computed progress + required monthly savings |

### Budgets (Phase 1–2)

| Method | Path | Description |
| --- | --- | --- |
| GET / POST | `/api/v1/budgets` | per-category monthly limits |
| PATCH / DELETE | `/api/v1/budgets/:id` | edit / delete (owner-scoped) |
| GET | `/api/v1/budgets/status` | current-month spend vs limits |

### Insights & notifications (Phase 2+)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/insights` | cached AI/ML insights with `acknowledged` flag |
| GET | `/api/v1/notifications` | smart alerts (Phase 2); subscriptions (Phase 2) |

### Receipts (Phase 2)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/receipts/scan` | upload image (size-limited) → OCR → draft (never auto-saves) |
| POST | `/api/v1/receipts/:id/confirm` | finalize verified draft into a transaction |

### Statement import (Phase 3)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/impex/uploads` | CSV/PDF → normalized rows, dupes flagged |
| POST | `/api/v1/imports/:id/apply` | apply user-approved rows |

## 3. Request / response examples

### POST /api/v1/transactions

Request:
```json
{
  "type": "expense",
  "amountPaise": 124050,
  "category": "food_dining",
  "description": "Lunch with team",
  "date": "2026-08-09T10:00:00.000Z"
}
```
Response `201`:
```json
{
  "transaction": {
    "id": "…", "type": "expense", "amountPaise": 124050,
    "category": "food_dining", "description": "Lunch with team",
    "date": "…", "source": "manual"
  }
}
```

### POST /api/v1/coach/query

```
{ "question": "Can I afford an iPhone next month?" }
```
Response:
```json
{
  "answer": "Based on your metrics...",
  "suggestedQuestions": ["…"],
  "sources": ["monthly_expenses", "current_balance"]
}
```

## 4. Internal ML surface (services/ml-service — NOT public)

Authenticated by header `X-ML-API-KEY` (only `apps/api` knows it).

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/predict/spending` | month-level expense forecast from aggregates |
| POST | `/api/v1/detect/anomalies` | flag transactions outside the historical norm |
| POST | `/api/v1/analyze/patterns` | category trends and recurring patterns |

Endpoints currently return `501` with an explicit "not implemented" detail until
Phase 3, per the no-fake-features rule. The Node `mlClient.service.ts` is the
only consumer and always forwards the Clerk-verified `userId`, never a client
value.