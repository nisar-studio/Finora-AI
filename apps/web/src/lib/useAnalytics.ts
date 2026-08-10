import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analyticsApi';
import { AnalyticsParams } from '../types/analytics';

export function useAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'summary', params?.from ?? null, params?.to ?? null],
    queryFn: () => analyticsApi.summary(params),
  });
}