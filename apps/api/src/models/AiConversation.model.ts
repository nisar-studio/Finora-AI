import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * One persisted coach exchange per request: the user's question, the model
 * answer, the deterministic financial context hash that produced it, and the
 * metadata needed to reproduce the response (version, model, sources).
 * Collection name is pinned to `aiConversations`.
 */
const aiConversationSchema = new Schema(
  {
    clerkId: { type: String, required: true, index: true },
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    answer: { type: String, required: true },
    messages: { type: [messageSchema], required: true },
    suggestedQuestions: { type: [String], default: [] },
    sourcesUsed: { type: [String], default: [] },
    contextHash: { type: String, required: true },
    promptVersion: { type: String, required: true },
    model: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

aiConversationSchema.index({ clerkId: 1, createdAt: -1 });

export type AiConversationDoc = InferSchemaType<typeof aiConversationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AiConversation = model('AiConversation', aiConversationSchema, 'aiConversations');