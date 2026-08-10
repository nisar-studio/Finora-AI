import { z } from 'zod';

export const coachQuerySchema = z.object({
  body: z.object({
    question: z
      .string({ invalid_type_error: 'question must be a string' })
      .trim()
      .min(1, 'Question is required')
      .max(1000, 'Question must be 1000 characters or fewer'),
  }),
});

export type CoachQueryInput = z.infer<typeof coachQuerySchema>['body'];