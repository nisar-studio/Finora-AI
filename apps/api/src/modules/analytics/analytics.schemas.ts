import { z } from 'zod';

/**
 * Date semantics:
 * - `from` / `to` are inclusive, RFC 3339 date-time strings (e.g.
 *   `2026-07-01T00:00:00.000Z`). A transaction is inside the period when
 *   `from <= txn.date <= to`.
 * - When omitted, the summary period defaults to the current calendar month
 *   (UTC). The monthly trend always covers the trailing 6 calendar months.
 * - Comparison is always current vs the immediately preceding period of equal
 *   length (previous calendar month by default).
 */
export const isoDateTime = z.string().datetime({ offset: true });

export const analyticsSummaryQuerySchema = z.object({
  query: z
    .object({
      from: isoDateTime.optional(),
      to: isoDateTime.optional(),
    })
    .refine(
      (value) => !(value.from && value.to && Date.parse(value.from) > Date.parse(value.to)),
      {
        message: '`from` must be on or before `to`',
        path: ['from'],
      }
    ),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>['query'];