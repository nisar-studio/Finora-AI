# Finora AI — System Architecture

Finora AI is "Your Personal AI Financial Coach". This document is the single
source of truth for how the system is structured and why.

## 1. Design principles

1. **Deterministic by default.** All financial mathematics lives in the Node.js
   backend. The LLM never computes; it reads pre-computed, verified metrics.
2. **Three separate brains, three separate services.**
   - `apps/web` — React + Vite SPA (presentation only, no secrets).
   - `apps/api` — Node.js + Express (data, deterministic finance, orchestration,
     the only public API).
   - `services/ml-service` — Python + FastAPI (prediction, anomaly detection,
     pattern analysis). Never directly reachable from the browser.
3. **No fake functionality.** Anything not yet implemented is explicitly marked
   TODO or returns a clear `501 Not Implemented`. Nothing ships pretending to work.

## 2. Service topology

```
Browser (apps/web: React + Vite SPA)
        │  HTTPS + Bearer JWT (Clerk session token)
        ▼
apps/api (Node.js + Express)
        │
        ├──▶ MongoDB Atlas (Mongoose ODM)
        ├──▶ Gemini API  (GoogleGenAI — configurable model via GEMINI_MODEL)
        └──▶ services/ml-service  (FastAPI — internal key, never public)
```

Rules that never change:

- The browser only ever talks to `apps/api`.
- `apps/api` is the only caller of both Gemini and `services/ml-service`.
- Gemini keys, Clerk secret keys, and the ML internal key never appear in the
  frontend bundle.
- The Python service does no user authentication of its own beyond an internal
  shared credential supplied by `apps/api`. It never trusts a `userId` that was
  not placed there by `apps/api` after Clerk verification.

## 3. Process boundaries

| Concern | Owned by | Never by |
| --- | --- | --- |
| Session / identity | Clerk (frontend UI + backend JWT verify) | our DB |
| CRUD + user ownership | apps/api | — |
| Financial metrics (sums, rates, budget/goal math) | apps/api (deterministic) | Gemini |
| Prediction / anomaly / pattern math | services/ml-service | Gemini, client |
| Natural-language reasoning & explanation | Gemini | client, ml-service |
| OCR + receipt extraction | apps/api + Tesseract/Cloudinary (Phase 2) | — |

## 4. Key data flows

### 4.1 AI Financial Coach (Phase 1)

```
user question
   │
   ▼
POST /api/v1/coach/query        (Bearer JWT, rate-limited)
   │
   ▼
coach.service.buildFinancialContext(userId)
   │  reads aggregates from MongoDB via the analytics service (deterministic math)
   │  builds the Structured Financial Context (metrics only, no raw ledger dumps)
   │  optionally requests a prediction signal from the ML service
   ▼
gemini.service.generateText(model=GEMINI_MODEL, system + context + question)
   │  Gemini interprets VERIFIED numbers (never computes)
   ▼
{ answer, suggestedQuestions, sourcesUsed }  → persisted to aiConversations
```

Grounding rule: the LLM only sees numbers that the analytics engine already
computed. The system prompt tells the model to never invent numbers, to label
forecasts as estimates, to decline professional/legal advice, and to encourage a
qualified advisor for high-stakes decisions.

### 4.2 Spending prediction (Phase 3, scaffolded now)

```
Node aggregates monthly totals (deterministic) → buildFeatures()
   │  { monthlyTotals[], categoryAggregates[] }
   ▼
services/ml-service  POST /api/v1/predict/spending   (header X-ML-API-KEY: internal)
   │  stateless: linear regression over structured historical aggregates
   ▼
{ horizonMonths, predictions[], confidence } → cached as a financialInsight
```

Design note: Phase 1/2 ML uses **stateless, lightweight calculations from
structured historical aggregates** — no model files, no retraining per request.
The layout reserves a space for proper training/versioning later
(`services/ml-service/models/`) but nothing runs until that path is added
deliberately.

### 4.3 Receipt scanning (Phase 2)

```
web uploads image → apps/api (validated, size-limited) → Cloudinary upload
   → OCR → structured reading → Gemini extracts {store, amount, date, category}
   → draft shown to user for confirmation → POST /transactions
   → low-confidence extractions are flagged, never auto-saved
```

## 5. Authentication (Clerk)

- Frontend: `@clerk/clerk-react`. `ClerkProvider` at root; `useAuth().getToken()`
  feeds the API client a fresh short-lived JWT per request.
- Backend: `@clerk/express` `clerkMiddleware()`. The `requireAuth` middleware
  rejects requests without a verified `userId`.
- `userId` is the Clerk user id, stored on every user-owned Mongoose doc. All
  queries include a `userId` filter — the server scopes, never the client.
- Node → ml-service uses a separate internal `ML_SERVICE_API_KEY`; the Python
  service has no public route for browsers.

## 5. Deterministic math engine

Pure, unit-testable functions in `apps/api/src/modules/analytics`:
`monthlyTotals`, `savingsRate`, `categoryBreakdown`, `budgetStatus`,
`requiredMonthlySaving`. All operate on integer paise, produce stable output, and
feed the context given to Gemini.

## 6. Errors & logging

- Errors serialize as `{ error: { code, message, details? } }`.
- Central error handler never leaks stack traces outside dev.
- Sensitive amounts are not written to logs; log ids and aggregates only.
- AI endpoints are rate-limited per user.

## 7. Deployment seams

| Piece | Target | Notes |
| --- | --- | --- |
| apps/web | Vercel | static build, frontend-only env vars |
| apps/api | Render | `npm run build && npm start` |
| services/ml-service | Render | uvicorn; only reachable by apps/api |
| MongoDB | Atlas | single cluster, per-env database name |

See repo `README.md` for run commands and `docs/api-design.md` for endpoints.