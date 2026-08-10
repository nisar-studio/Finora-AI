import { useCallback, useEffect, useRef, useState } from 'react';
import { useCoachQuery } from '../lib/useCoach';
import { CoachComposer } from '../components/coach/CoachComposer';
import { CoachExchange, CoachMessage } from '../components/coach/CoachMessage';
import { CoachWelcome } from '../components/coach/CoachWelcome';
import type { CoachResponse } from '../types/coach';

/**
 * Session-scoped thread: user questions and coach answers are kept in memory
 * for the lifetime of the page. Every question goes through the real
 * POST /api/v1/coach/query — no mocked answers.
 */
export function CoachPage() {
  const query = useCoachQuery();
  const [exchanges, setExchanges] = useState<CoachExchange[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isPending = activeId !== null;

  const runQuery = useCallback(
    (question: string, id: number) => {
      setActiveId(id);
      setExchanges((prev) =>
        prev.map((exchange) =>
          exchange.id === id ? { ...exchange, failed: false, failureMessage: null } : exchange
        )
      );

      query.mutate(
        { question },
        {
          onSuccess: (response: CoachResponse) => {
            setExchanges((prev) =>
              prev.map((exchange) => (exchange.id === id ? { ...exchange, response } : exchange))
            );
            setActiveId((current) => (current === id ? null : current));
          },
          onError: (error: Error) => {
            setExchanges((prev) =>
              prev.map((exchange) =>
                exchange.id === id
                  ? { ...exchange, failed: true, failureMessage: error.message }
                  : exchange
              )
            );
            setActiveId((current) => (current === id ? null : current));
          },
        }
      );
    },
    [query.mutate]
  );

  const send = useCallback(
    (question: string) => {
      const clean = question.trim();
      if (!clean || activeId !== null) {
        return;
      }
      const id = Date.now();
      setExchanges((prev) => [
        ...prev,
        { id, question: clean, response: null, failed: false, failureMessage: null },
      ]);
      runQuery(clean, id);
    },
    [activeId, runQuery]
  );

  const retry = useCallback(
    (id: number, question: string) => {
      if (activeId !== null) {
        return;
      }
      runQuery(question, id);
    },
    [activeId, runQuery]
  );

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [exchanges.length, activeId]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">AI Financial Coach</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your coach analyzes your financial activity and savings goals to provide personalized
          guidance — always grounded in your real data.
        </p>
      </header>

      {exchanges.length === 0 ? (
        <CoachWelcome onAsk={send} isPending={isPending} />
      ) : (
        <ol className="space-y-6">
          {exchanges.map((exchange) => (
            <li key={exchange.id}>
              <CoachMessage
                exchange={exchange}
                isPending={exchange.id === activeId}
                onRetry={retry}
                onSuggest={send}
              />
            </li>
          ))}
        </ol>
      )}

      <div ref={bottomRef} />

      <CoachComposer onSend={send} isPending={isPending} />

      <p className="text-center text-xs text-ink-muted">
        Answers are generated from your transactions and savings goals only.
      </p>
    </section>
  );
}