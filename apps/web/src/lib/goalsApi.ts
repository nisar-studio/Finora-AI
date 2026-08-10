import { api } from './api';
import type { CreateGoalInput, Goal, UpdateGoalInput } from '../types/goal';

export const goalsApi = {
  async list(): Promise<Goal[]> {
    const res = await api.get<{ goals: Goal[] }>('/v1/goals');
    return res.goals;
  },

  async create(input: CreateGoalInput): Promise<Goal> {
    const res = await api.post<{ goal: Goal }>('/v1/goals', input);
    return res.goal;
  },

  async update(id: string, input: UpdateGoalInput): Promise<Goal> {
    const res = await api.patch<{ goal: Goal }>(`/v1/goals/${id}`, input);
    return res.goal;
  },

  async remove(id: string): Promise<void> {
    await api.delete<void>(`/v1/goals/${id}`);
  },
};