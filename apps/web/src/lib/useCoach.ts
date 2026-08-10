import { useMutation } from '@tanstack/react-query';
import { coachApi } from './coachApi';
import type { CoachQueryInput, CoachResponse } from '../types/coach';

export function useCoachQuery() {
  return useMutation<CoachResponse, Error, CoachQueryInput>({
    mutationFn: (input: CoachQueryInput) => coachApi.query(input),
  });
}