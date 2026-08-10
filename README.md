# Finora AI — Your Personal AI Financial Coach

Three deployable services:

| Directory | Tech | Role | Deploy |
| --- | --- | --- | --- |
| `apps/web` | React 19 + Vite + Tailwind v4 | SPA (no secrets) | Vercel |
| `apps/api` | Node.js + Express + Mongoose | Public API, deterministic finance, Gemini | Render |
| `services/ml-service` | Python + FastAPI | Prediction / anomaly / patterns (internal) | Render |

Architecture and design decisions live in [`docs/`](docs/architecture.md).
The API and database are specified in [`docs/api-design.md`](docs/api-design.md)
and [`docs/database-schema.md`](docs/database-schema.md). Prompt strategy and the
Gemini integration contract are in [`docs/ai-prompts.md`](docs/ai-prompts.md).

## Prerequisites

- Node.js >= 20
- Python >= 3.12
- MongoDB (Atlas recommended)
- Clerk application (API keys)
- Gemini API key (Google AI Studio)
- For ML: an internal `ML_SERVICE_API_KEY` shared between `apps/api` and
  `services/ml-service`

## Running locally

Each service reads its own `.env` file. Copy `.env.example` → `.env` in each app.

### apps/api (port 4000)

```bash
cd apps/api
cp .env.example .env   # fill in real values
npm install
npm run dev            # tsx watch src/server.ts
```

### services/ml-service (port 8000)

```bash
cd services/ml-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

### apps/web (port 5173)

```bash
cd apps/web
cp .env.example .env   # fill in VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:4000` in dev.

## Security model

- The browser only ever talks to `apps/api`.
- `apps/api` verifies Clerk JWTs (server-side) and forwards the verified `userId`.
- Gemini keys and the ML internal key live only in `apps/api` / `services/ml-service`.
- The ML service is never publicly reachable; it requires `X-ML-API-KEY`.
- Monetary amounts are integer paise (`amountPaise`), validated server-side.

## Conventions

- Status endpoints return `{ error: { code, message, details? } }`.
- Anything not yet implemented returns `501` or is marked TODO — no fake features.

## Docs

- [System architecture](docs/architecture.md)
- [API design](docs/api-design.md)
- [Database schema](docs/database-schema.md)
- [AI prompts & Gemini integration](docs/ai-prompts.md)