import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_CATEGORIES = [
  'salary',
  'freelance',
  'investment',
  'business',
  'food',
  'transport',
  'housing',
  'utilities',
  'entertainment',
  'healthcare',
  'shopping',
  'education',
  'travel',
  'other',
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

const transactionSchema = new Schema(
  {
    // Ownership: the authenticated Clerk user. Every query is scoped by clerkId.
    clerkId: { type: String, required: true, index: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    category: { type: String, enum: TRANSACTION_CATEGORIES, required: true },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    date: { type: Date, required: true, index: true },
    source: { type: String, enum: ['manual'], default: 'manual' },
  },
  {
    timestamps: true,
  }
);

// Most reads are "this user's ledger, newest first".
transactionSchema.index({ clerkId: 1, date: -1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Transaction = model('Transaction', transactionSchema);