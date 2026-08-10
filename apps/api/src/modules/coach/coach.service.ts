import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { GeminiService } from '../../services/gemini.service.js';
import { AiConversation } from '../../models/AiConversation.model.js';
import { buildFinancialContext, FinancialContext } from './context-builder.js';
import { buildCoachPrompt, COACH_PROMPT_VERSION } from './prompts/v1/coach.prompt.js';

export interface CoachQueryResponse {
  answer: string;
  suggestedQuestions: string[];
  sourcesUsed: string[];
}

interface ParsedCoachAnswer {
  answer: string;
  suggestedQuestions: string[];
}

function parseCoachAnswer(raw: string): ParsedCoachAnswer {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  try {
    const parsed = JSON.parse(candidate) as { answer?: unknown; suggestedQuestions?: unknown };
    const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
    const suggestedQuestions = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : [];
    if (answer) {
      return { answer, suggestedQuestions };
    }
  } catch {
    // Malformed model output: fall back to raw text below.
  }

  return { answer: trimmed, suggestedQuestions: [] };
}

/** Deterministic fingerprint of the context that produced an answer. */
export function contextHash(context: FinancialContext): string {
  return createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

export function deriveSourcesUsed(context: FinancialContext): string[] {
  const sources: string[] = [];
  if (context.summary.transactionCount > 0) {
    sources.push('current_month_summary');
  }
  if (context.topSpendingCategories.length > 0) {
    sources.push('top_categories');
  }
  if (context.categoryTrends.length > 0) {
    sources.push('category_trends');
  }
  if (context.monthlyTrend.some((m) => m.incomePaise > 0 || m.expensePaise > 0)) {
    sources.push('monthly_trend');
  }
  if (context.goals.total > 0) {
    sources.push('savings_goals');
  }
  return sources;
}

export class CoachService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly geminiModel: string
  ) {}

  /**
   * Answers a coaching question using the authenticated user's own data.
   * The clerkId comes from the session (set by requireAuth), never the client.
   */
  async answerQuestion(clerkId: string, question: string): Promise<CoachQueryResponse> {
    const context = await buildFinancialContext(clerkId);
    const { systemInstruction } = buildCoachPrompt(context);

    const raw = await this.gemini.generateText({
      systemInstruction,
      messages: [{ role: 'user', content: question }],
      temperature: 0.3,
    });

    const parsed = parseCoachAnswer(raw);
    const sourcesUsed = deriveSourcesUsed(context);
    const hash = contextHash(context);
    const timestamp = new Date().toISOString();

    await AiConversation.create({
      clerkId,
      question,
      answer: parsed.answer,
      messages: [
        { role: 'user', content: question, timestamp },
        { role: 'model', content: parsed.answer, timestamp },
      ],
      suggestedQuestions: parsed.suggestedQuestions,
      sourcesUsed,
      contextHash: hash,
      promptVersion: COACH_PROMPT_VERSION,
      model: this.geminiModel,
    });

    return { answer: parsed.answer, suggestedQuestions: parsed.suggestedQuestions, sourcesUsed };
  }
}

let cachedCoachService: CoachService | null = null;

export function getCoachService(): CoachService {
  if (!cachedCoachService) {
    const config = env();
    cachedCoachService = new CoachService(
      new GeminiService({ apiKey: config.GEMINI_API_KEY, model: config.GEMINI_MODEL }),
      config.GEMINI_MODEL
    );
  }
  return cachedCoachService;
}