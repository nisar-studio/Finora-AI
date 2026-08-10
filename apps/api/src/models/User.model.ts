import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    currency: { type: String, default: 'INR' },
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const User = model('User', userSchema);