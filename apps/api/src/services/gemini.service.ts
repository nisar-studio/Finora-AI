import { GoogleGenAI } from '@google/genai';

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GenerateTextInput {
  messages: GeminiMessage[];
  systemInstruction?: string;
  temperature?: number;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor(private readonly config: { apiKey: string; model: string }) {}

  private client(): GoogleGenAI {
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });
    }
    return this.ai;
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    const contents = input.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const response = await this.client().models.generateContent({
      model: this.config.model,
      contents,
      config: {
        systemInstruction: input.systemInstruction,
        temperature: input.temperature ?? 0.4,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }
    return text;
  }
}