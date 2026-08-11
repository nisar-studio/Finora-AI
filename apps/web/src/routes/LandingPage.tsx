import { useAuth } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, BrainCircuit, BarChart3, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';

export function LandingPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isSignedIn) {
      navigate('/app/dashboard');
    } else {
      navigate('/sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-ink text-canvas shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Finora AI</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {isSignedIn ? (
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
            >
              Go to Dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={handleGetStarted}
                className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-ink/10 bg-surface px-4 py-1.5 text-xs font-medium text-ink-muted shadow-xs">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Grounded in Real Financial Data · No Speculation</span>
        </div>

        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Take Control of Your Money with <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">AI Intelligence</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-muted leading-relaxed sm:text-xl">
          Your personal AI financial coach. Track expenses, analyze spending behavior, predict financial risks, and ask questions — calculated directly from your real ledger.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-base font-semibold text-canvas shadow-md transition-all hover:opacity-90 hover:shadow-lg cursor-pointer"
          >
            {isSignedIn ? 'Open Application' : 'Get Started Free'}
            <ArrowRight className="size-5" />
          </button>
          <a
            href="#features"
            className="rounded-full border border-ink/15 bg-surface px-8 py-3.5 text-base font-semibold transition-colors hover:bg-ink/5"
          >
            See How It Works
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div id="features" className="mt-28 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-left">
          <div className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-xs transition-all hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Ledger & Tracking</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Record transactions with integer-paise precision. Pure deterministic analytics compute balances and savings rates.
            </p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-xs transition-all hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <BarChart3 className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Spending Analytics</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Visualize monthly trends, category breakdowns, top spending areas, and month-over-month rate comparisons.
            </p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-xs transition-all hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <BrainCircuit className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Predictive ML</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Internal Python FastAPI ML service detects spending anomalies, forecasts future expenses, and scores financial risk.
            </p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-xs transition-all hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Sparkles className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Gemini AI Coach</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Conversational assistant powered by Google Gemini, grounded strictly in pre-computed financial context snapshots.
            </p>
          </div>
        </div>

        {/* Security Banner */}
        <div className="mt-16 rounded-2xl border border-ink/10 bg-surface/50 p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h4 className="font-semibold">Security & Data Privacy First</h4>
              <p className="text-sm text-ink-muted">
                Zero client-side secrets. API keys and ML connections are isolated entirely within backend process boundaries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGetStarted}
            className="mt-4 sm:mt-0 shrink-0 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 cursor-pointer"
          >
            Explore Finora AI
          </button>
        </div>
      </main>
    </div>
  );
}