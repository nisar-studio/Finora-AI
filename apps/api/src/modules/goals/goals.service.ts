import { Goal, GoalDoc } from './goals.model.js';
import { calculateGoalMath, GoalMath } from './goalMath.js';
import { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';
import { AppError } from '../../middleware/errors.js';

/**
 * Every query is scoped by `clerkId` — the authenticated Clerk user — so a user
 * can never read, update, or delete another user's goals. The id is always
 * matched together with the owner at the DB level.
 */

export async function createGoal(clerkId: string, input: CreateGoalInput): Promise<GoalDoc> {
  const doc = await Goal.create({
    clerkId,
    name: input.name,
    targetAmountPaise: input.targetAmountPaise,
    currentAmountPaise: input.currentAmountPaise,
    deadline: input.deadline ? new Date(input.deadline) : null,
    autosaveEnabled: input.autosaveEnabled,
  });
  return doc.toObject() as unknown as GoalDoc;
}

export async function listGoals(clerkId: string): Promise<GoalDoc[]> {
  return (await Goal.find({ clerkId }).sort({ createdAt: -1 }).lean()) as unknown as GoalDoc[];
}

export async function getGoal(clerkId: string, id: string): Promise<GoalDoc | null> {
  return (await Goal.findOne({ _id: id, clerkId }).lean()) as GoalDoc | null;
}

export async function updateGoal(
  clerkId: string,
  id: string,
  patch: UpdateGoalInput
): Promise<GoalDoc | null> {
  const existing = await Goal.findOne({ _id: id, clerkId });
  if (!existing) {
    return null;
  }

  // Validate the final merged state, not only the PATCH fields: `current`
  // must never exceed `target` once the patch is applied.
  const nextTarget = patch.targetAmountPaise ?? existing.targetAmountPaise;
  const nextCurrent = patch.currentAmountPaise ?? existing.currentAmountPaise;
  if (nextCurrent > nextTarget) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'currentAmountPaise cannot exceed targetAmountPaise'
    );
  }

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.targetAmountPaise !== undefined) update.targetAmountPaise = patch.targetAmountPaise;
  if (patch.currentAmountPaise !== undefined) update.currentAmountPaise = patch.currentAmountPaise;
  if (patch.deadline !== undefined) {
    update.deadline = patch.deadline === null ? null : new Date(patch.deadline);
  }
  if (patch.autosaveEnabled !== undefined) update.autosaveEnabled = patch.autosaveEnabled;

  const doc = await Goal.findOneAndUpdate(
    { _id: id, clerkId },
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  return doc as GoalDoc | null;
}

export async function deleteGoal(clerkId: string, id: string): Promise<boolean> {
  const result = await Goal.deleteOne({ _id: id, clerkId });
  return result.deletedCount > 0;
}

export interface SerializedGoalProgress extends GoalMath {}

export function goalProgress(doc: GoalDoc, now: Date = new Date()): SerializedGoalProgress {
  return calculateGoalMath(
    {
      targetAmountPaise: doc.targetAmountPaise,
      currentAmountPaise: doc.currentAmountPaise,
      deadline: doc.deadline ?? null,
      createdAt: doc.createdAt,
    },
    now
  );
}

export function serializeGoal(doc: GoalDoc, now: Date = new Date()) {
  return {
    id: doc._id.toString(),
    clerkId: doc.clerkId,
    name: doc.name,
    targetAmountPaise: doc.targetAmountPaise,
    currentAmountPaise: doc.currentAmountPaise,
    deadline: doc.deadline ?? null,
    autosaveEnabled: doc.autosaveEnabled,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    progress: goalProgress(doc, now),
  };
}