import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const goalSchema = new Schema(
  {
    // Ownership: the authenticated Clerk user. Every query is scoped by clerkId.
    clerkId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetAmountPaise: { type: Number, required: true, min: 1 },
    currentAmountPaise: { type: Number, required: true, min: 0, default: 0 },
    // Optional; when absent (null) it is an open-ended goal.
    deadline: { type: Date, default: null },
    autosaveEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

goalSchema.index({ clerkId: 1, createdAt: -1 });

export type GoalDoc = InferSchemaType<typeof goalSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Goal = model('Goal', goalSchema);