import { api } from './api';
import { FinancialIntelligence, IntelligenceParams } from '../types/intelligence';

export const intelligenceApi = {
  async get(params?: IntelligenceParams): Promise<FinancialIntelligence> {
    const search = new URLSearchParams();
    if (params?.months) search.set('months', String(params.months));
    const query = search.toString();
    return api.get<FinancialIntelligence>(`/v1/intelligence${query ? `?${query}` : ''}`);
  },
};