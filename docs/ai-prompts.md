# Finora AI — AI Prompts & Gemini Integration

## 1. Model selection

- The model is **configurable** at runtime through the `GEMINI_MODEL`
  environment variable. No code changes are needed to switch models.
- Default documented in `.env.example`: `gemini-3.6-flash` — a current stable
  Gemini model appropriate for production.
- The SDK used is the official Gemini JavaScript SDK (`@google/genai`,
  `GoogleGenAI`), integrated **exclusively in the Node backend**. The API key
  never leaves the server, is never exposed to the browser.

## 2.Prompt organization & versioning

`apps/api/src/modules/coach/prompts/`

```
prompts/
├── registry.ts             # maps prompt version -> { contextVersion, systemPrompt }
├── v1/coach.system.ts      # default Coach system prompt (Phase 1)
└── README.md               # how to add v2 without breaking live conversations
```

Rules:

- A new major system-prompt change bumps the `promptVersion` and the
  `contextVersion` it expects.
- `aiConversations` records the `contextVersion` used per message, so historical
  conversations stay interpretable after upgrades.
- Prompts are assets managed alongside the module that uses them — they are never
  inline string soup inside route handlers.

## 3. FinancialContext (the AI "context layer")

The engine builds a **structured, verified snapshot** of the user's finances for
every coach turn. The LLM only ever sees this — never the raw database dumps.

Example shape (units are integer paise):

```jsonc
{
  "contextVersion": 1,
  "asOf": "2026-08-09T00:00:00.000Z",
  "currency": "INR",
  "monthlyIncomePaise": 5000000,
  "monthlyExpensesPaise": 3400000,
  "currentBalancePaise": 6100000,
  "savingsRate": 0.32,
  "topCategories": [
    { "category": "food", "spentPaise": 1050000, "share": 0.31 }
  ],
  "categoryTrends": {
    "food": { "thisMonth": 1050000, "lastAvg": 780000, "deltaPct": 0.35 }
  },
  "recurring": [
    { "merchant": "netflix", "amountPaise": 49900, "frequency": "monthly" }
  ],
  "goals": [
    { "name": "Emergency fund", "targetPaise": 5000000, "currentPaise": 2000000,
      "deadline": "2027-02-01T00:00:00.000Z", "requiredMonthlyPaise": 500000 }
  ],
  "budgetStatus": [
    { "category": "food", "limitPaise": 800000, "spentPaise": 1050000, "remainingPaise": -250000 }
  ],
  "prediction": null    // Phase 3: { nextMonthPaise, confidence }
}
```

Budget the token window: cap on top categories (e.g. 10), no raw transaction rows.

## 4. Default Coach system prompt (v1)

The prompt alternates on top of the context. Intended behavior:

1. Act as Finora, a personal financial coach grounded in the user's real numbers.
2. **Never invent numbers.** Only use the provided `FINANCIAL_CONTEXT`. Anything
   not present is unknown — say so.
3. Do not compute new math from memory — interpret the delivered metrics.
4. Label predictions as **estimates**; never guarantee outcomes.
5. Not a licensed financial advisor/legal/tax professional: for high-stakes
   decisions recommend consulting a qualified professional.
6. Give actionable, concise, number-referenced recommendations with a clear
   recommended next step.
7. Format answers with short paragraphs and markdown lists; keep them tight.

## 5. Integration contract

- Node module `services/gemini.service.ts` wraps `GoogleGenAI`:
  - `generateText({ messages, systemInstruction, temperature })` returning text.
  - Uses `process.env.GEMINI_MODEL` as the model id.
  - Keeps the `GoogleGenAI` client lazily initialized once.
- Coach route: build context -> compile messages + system prompt -> call Gemini ->
  parse + validate `suggestedQuestions` (JSON assertions) -> persist conversation.

## 6. Guardrails & evaluation

- Base safety rules are enforced in the system prompt (no guarantees, no
  fabrications, disclaimers for high-stakes decisions).
- Response is post-processed: ensure it references at least one metric from the
  context; if the model returns no metrics, the coach falls back to generic
  guidance with an "estimate only" label.
- Rate-limited per user (see `api-design.md`).
- A test fixture checks that a known question + canned context produces output
  containing only numbers present in the context (Phase 3 unit/E2E).