import { z } from 'zod';

const MONGO_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid goal id');

/**
 * A supplied deadline must be a valid, future RFC 3339 date-time. Omit it
 * entirely (or send null when updating) for an open-ended goal.
 */
const futureDeadline = z
  .string({ invalid_type_error: 'deadline must be an ISO 8601 date-time' })
  .datetime({ offset: true })
  .refine((value) => Date.parse(value) > Date.now(), 'deadline must be in the future');

const name = z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer');
const targetAmountPaise = z
  .number()
  .int('Target must be a whole number of paise')
  .positive('Target amount must be a positive integer of paise');
const currentAmountPaise = z
  .number()
  .int('Saved amount must be a whole number of paise')
  .nonnegative('Saved amount cannot be negative');
const autosaveEnabled = z.boolean();

export const createGoalSchema = z.object({
  body: z
    .object({
      name,
      targetAmountPaise,
      currentAmountPaise: currentAmountPaise.optional().default(0),
      deadline: futureDeadline.optional(),
      autosaveEnabled: autosaveEnabled.optional().default(false),
    })
    .refine(
      (value) => {
        const { currentAmountPaise, targetAmountPaise } = value;
        return (
          currentAmountPaise === undefined ||
          targetAmountPaise === undefined ||
          currentAmountPaise <= targetAmountPaise
        );
      },
      { message: 'currentAmountPaise cannot exceed targetAmountPaise', path: ['currentAmountPaise'] }
    ),
});

export const updateGoalSchema = z.object({
  params: z.object({ id: MONGO_ID }),
  body: z
    .object({
      name: name.optional(),
      targetAmountPaise: targetAmountPaise.optional(),
      currentAmountPaise: currentAmountPaise.optional(),
      deadline: z.union([futureDeadline, z.null()]).optional(),
      autosaveEnabled: autosaveEnabled.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided')
    .refine(
      (value) => {
        const { currentAmountPaise, targetAmountPaise } = value;
        return (
          currentAmountPaise === undefined ||
          targetAmountPaise === undefined ||
          currentAmountPaise <= targetAmountPaise
        );
      },
      { message: 'currentAmountPaise cannot exceed targetAmountPaise', path: ['currentAmountPaise'] }
    ),
});

export const goalIdSchema = z.object({
  params: z.object({ id: MONGO_ID }),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>['body'];
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>['body'];