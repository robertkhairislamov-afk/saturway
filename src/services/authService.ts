/**
 * Authentication Service
 * Handles Telegram WebApp authentication and user management
 */

import { apiClient } from '../lib/api';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: TelegramUser;
}

export interface UserProfile {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  averageEnergyLevel: number;
  averageFocusLevel: number;
  moodLogsCount: number;
}

/**
 * Authenticate user with Telegram WebApp initData
 */
export async function authenticateWithTelegram(): Promise<AuthResponse> {
  // Get Telegram WebApp instance
  const tg = (window as any).Telegram?.WebApp;

  if (!tg) {
    throw new Error('Telegram WebApp SDK not loaded');
  }

  // Get initData from Telegram
  const initData = tg.initData;

  if (!initData) {
    throw new Error('No Telegram initData available. Please open app from Telegram bot.');
  }

  // Expand the Telegram WebApp to full height
  tg.expand();

  // Send initData to backend for validation
  const response = await apiClient.post<AuthResponse>('/auth', {
    initData,
  });

  // Save JWT token
  if (response.success && response.token) {
    apiClient.setToken(response.token);
  }

  return response;
}

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/user/me');
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  return apiClient.get<UserStats>('/user/stats');
}

/**
 * Logout user
 */
export function logout(): void {
  apiClient.clearToken();

  // Clear any cached data
  localStorage.removeItem('user_profile');

  // Optionally close the Mini App
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.close();
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return apiClient.getToken() !== null;
}

/**
 * Get Telegram WebApp instance
 */
export function getTelegramWebApp() {
  return (window as any).Telegram?.WebApp;
}

/**
 * Initialize Telegram WebApp
 */
export function initTelegramWebApp(): void {
  const tg = getTelegramWebApp();

  if (!tg) {
    console.error('Telegram WebApp SDK not loaded');
    return;
  }

  // Set up theme
  tg.ready();
  tg.expand();

  // Enable closing confirmation
  tg.enableClosingConfirmation();

  // Log initialization
  console.log('Telegram WebApp initialized', {
    version: tg.version,
    platform: tg.platform,
    colorScheme: tg.colorScheme,
  });
}
