import { apiClient } from '../lib/api';

export interface Review {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  good: string;
  bad: string;
  endEnergy: number; // 20/40/60/80/100
  aiSummary: string;
  aiAdvice: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  good: string;
  bad: string;
  endEnergy: number;
}

export async function getTodayReview(): Promise<Review | null> {
  const response = await apiClient.get('/review/today');
  return response.data.review;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const response = await apiClient.post('/review', input);
  return response.data.review;
}
