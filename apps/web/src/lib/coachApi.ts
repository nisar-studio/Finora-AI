import { api } from './api';
import type { CoachQueryInput, CoachResponse } from '../types/coach';

export const coachApi = {
  /** Sends a question and returns the backend-generated answer, follow-ups and sources. */
  async query(input: CoachQueryInput): Promise<CoachResponse> {
    return api.post<CoachResponse>('/v1/coach/query', input);
  },
};