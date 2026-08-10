import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from './goalsApi';
import type { CreateGoalInput, UpdateGoalInput } from '../types/goal';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      goalsApi.update(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
      void queryClient.invalidateQueries({ queryKey: ['goal', id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}