import { useQuery } from '@tanstack/react-query';
import { intelligenceApi } from './intelligenceApi';
import { IntelligenceParams } from '../types/intelligence';

export function useIntelligence(params?: IntelligenceParams) {
  return useQuery({
    queryKey: ['intelligence', params?.months ?? null],
    queryFn: () => intelligenceApi.get(params),
  });
}