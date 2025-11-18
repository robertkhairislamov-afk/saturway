import { apiClient } from '../lib/api';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  startDate: string; // YYYY-MM-DD
  targetDays: number;
  status: 'active' | 'completed' | 'abandoned';
  doneDays: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  done: number; // 1 or 0
  createdAt: string;
}

export interface HabitStats {
  doneDays: number;
  targetDays: number;
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
}

export interface HabitWithLogs {
  habit: Habit | null;
  logs: HabitLog[];
  stats: HabitStats | null;
}

export interface CreateHabitInput {
  title: string;
  description?: string;
  targetDays?: number;
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
}

export async function getHabit(): Promise<HabitWithLogs> {
  const response = await apiClient.get<{ success: boolean; data: HabitWithLogs }>('/habit');
  return response.data;
}

export async function createHabit(input: CreateHabitInput): Promise<HabitWithLogs> {
  const response = await apiClient.post<{ success: boolean; data: HabitWithLogs }>('/habit', input);
  return response.data;
}

export async function updateHabit(input: UpdateHabitInput): Promise<HabitWithLogs> {
  const response = await apiClient.patch<{ success: boolean; data: HabitWithLogs }>('/habit', input);
  return response.data;
}

export async function deleteHabit(): Promise<void> {
  await apiClient.delete('/habit');
}

export async function markHabitToday(): Promise<HabitWithLogs> {
  const response = await apiClient.post<{ success: boolean; data: HabitWithLogs }>('/habit/mark-today', {});
  return response.data;
}
