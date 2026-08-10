import { api } from './api';
import { AnalyticsParams, AnalyticsSummary } from '../types/analytics';

function analyticsQueryString(params?: AnalyticsParams): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const analyticsApi = {
  async summary(params?: AnalyticsParams): Promise<AnalyticsSummary> {
    return api.get<AnalyticsSummary>(`/v1/analytics/summary${analyticsQueryString(params)}`);
  },
};