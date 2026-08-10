# Finora AI — MongoDB Database Schema

## Conventions

- All monetary amounts are **integers in paise** (`amountPaise`). `₹1,240.50` → `124050`.
  No floats, no BigInt. Sign is never encoded in magnitude: a `type` field carries
  `income` / `expense`, and both magnitudes are positive integers.
- Validation on the backend (Zod) requires positive safe integers, trimmed strings.
- All timestamps are UTC `Date` values, handled by `timestamps: true`.
- Every user-owned collection has a `userId` (the Clerk user id) and **every**
  query is filtered by it. The server scopes data; the client never supplies the
  scope filter.
- API `id` maps to the native Mongo `_id`.

## Derived vs stored

- Deterministic metrics (totals, savings rate, category breakdown, goal progress)
  are **computed on read** from `transactions` / `savingsGoals` by the analytics
  engine. They are not denormalized into the ledger.
- Model-derived outputs (forecasts, anomalies, insights) are cached in
  `financialInsights` with the time range (`dataRefs`) used, for auditability.

## Collections

### users

| field | type | notes |
| --- | --- | --- |
| clerkId | String | unique index; the Clerk user id |
| email | String | lowercase, trimmed, index |
| currency | String | default `"INR"` |
| preferences | Object | e.g. `{ theme }`, default `{}` |
| timestamps | Date | createdAt / updatedAt |

No passwords or session tokens are stored here — identity is owned by Clerk.

### transactions

| field | type | notes |
| --- | --- | --- |
| userId | String | index, owner |
| type | `"income"` \| `"expense"` | required |
| amountPaise | Number | positive safe integer |
| currency | String | default `"INR"` |
| category | String | normalized key e.g. `food_dining`, index |
| categoryId | ObjectId \| null | optional ref to categories |
| description | String | trimmed, ≤ 200 chars |
| date | Date | required |
| source | enum | `manual` (default), `receipt`, `import`, `voice` |
| isRecurring | Boolean | default `false` (set by Phase 2 detection) |
| tags | [String] | optional, ignored in MVP |

Indexes:
- `{ userId: 1, date: -1 }`
- `{ userId: 1, category: 1, date: -1 }`
- `{ userId: 1, type: 1, date: -1 }`

### categories

| field | type | notes |
| --- | --- | --- |
| userId | String | index |
| name | String | required, trimmed, unique per user |
| icon | String | emoji (optional) |
| color | String | hex (optional) |
| type | "income" \| "expense" | optional |

Unique compound index `{ userId: 1, name: 1 }`.

### budgets

| field | type | notes |
| --- | --- | --- |
| userId | String | index |
| categoryId | ObjectId ref | required |
| monthlyLimitPaise | Number | positive integer |
| period | String | default `"monthly"` |

Unique index `{ userId: 1, categoryId: 1 }`.

### savingsGoals

| field | type | notes |
| --- | --- | --- |
| userId | String | index |
| name | String | required |
| icon | String | optional emoji |
| targetAmountPaise | Number | positive |
| currentAmountPaise | Number | default `0` |
| deadline | Date | required |
| status | enum | `active` (default), `completed`, `archived` |

`requiredMonthlySavings` is computed by the analytics service on read.

### aiConversations

| field | type | notes |
| --- | --- | --- |
| userId | String | index |
| messages | [{ role, content, createdAt }] | capped per document (~20) via validation |
| contextVersion | Number | prompt schema version used |
| lastContext | Object | copy of the FinancialContext snapshot |

Indexing: `{ userId: 1, createdAt: -1 }`.

### financialInsights

| field | type | notes |
| --- | --- | --- |
| userId | String | index |
| type | enum | `spending_insight`, `anomaly`, `prediction`, `recommendation` |
| summary | String | |
| recommendations | [String] | |
| dataRefs | Object | horizon + aggregates used, for auditability |
| acknowledged | Boolean | default `false` |

Indexing: `{ userId: 1, type: 1, createdAt: -1 }`.

### recurringSubscriptions (Phase 2)

`userId`, `merchant`, `category`, `amountPaise`, `frequency`, `lastDate`,
`nextDate` — indexed by `{ userId: 1, merchant: 1 }`.

### notifications (Phase 3, optional)

May be derived on read from `financialInsights` instead of a dedicated collection,
to avoid duplication. Decision deferred until Phase 2 implementation.

## Privacy & security notes

- Keep financial collections separate from identity data; scope Atlas network
  access to the API's outbound IP in production.
- Never log transaction `description` or raw amounts.
- Field-level encryption for stored amounts may be introduced in Phase 2 with a
  server-held key; the read path will centralize key handling in a service.