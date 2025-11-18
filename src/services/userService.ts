/**
 * User Service
 * Handles all user-related API operations
 */

import { apiClient } from '../lib/api';

export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  isPremium: boolean;
  photoUrl: string | null;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ success: boolean; data: User }>('/user/me');
  return response.data;
}

/**
 * Update user profile
 */
export async function updateUser(input: UpdateUserInput): Promise<User> {
  const response = await apiClient.patch<{ success: boolean; data: User }>('/user/me', input);
  return response.data;
}
