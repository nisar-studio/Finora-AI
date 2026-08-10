import { User, UserDoc } from '../models/User.model.js';

export interface FindOrCreateUserInput {
  clerkId: string;
  email?: string;
}

/**
 * Lazily upserts the user that owns a Clerk session.
 *
 * Identity is owned by Clerk; the users collection only mirrors the Clerk
 * userId (clerkId) plus lightweight profile metadata. This is called on the
 * first authenticated API request for a given Clerk user.
 */
export async function findOrCreateUser(input: FindOrCreateUserInput): Promise<UserDoc> {
  const update: Record<string, unknown> = {};
  if (input.email) {
    update.$set = { email: input.email };
  }

  const doc = await User.findOneAndUpdate(
    { clerkId: input.clerkId },
    {
      $setOnInsert: { clerkId: input.clerkId, currency: 'INR', preferences: {} },
      ...(Object.keys(update).length ? update : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return doc as UserDoc;
}

export async function findUserByClerkId(clerkId: string): Promise<UserDoc | null> {
  return (await User.findOne({ clerkId }).lean()) as UserDoc | null;
}

export function serializeUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    clerkId: user.clerkId,
    email: user.email ?? null,
    currency: user.currency,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}