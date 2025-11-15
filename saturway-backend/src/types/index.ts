// Core type definitions for Saturway Backend
import { z } from 'zod';

// ============================================
// Database Types
// ============================================

export interface User {
  id: string;
  telegramId: bigint;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: boolean;
  timezone?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  aiMetadata?: AITaskMetadata;
}

export interface AITaskMetadata {
  suggestedTime?: string;
  estimatedDuration?: number;
  energyLevel?: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface MoodLog {
  id: string;
  userId: string;
  energyLevel: number; // 1-10
  focusLevel: number; // 1-10
  notes?: string;
  loggedAt: Date;
  createdAt: Date;
}

export interface AIConversation {
  id: string;
  userId: string;
  promptHash: string;
  prompt: string;
  response: string;
  provider: 'claude' | 'openai';
  tokensUsed: number;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

export interface AuthRequest {
  initData: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
}

export interface LogMoodRequest {
  energyLevel: number;
  focusLevel: number;
  notes?: string;
}

export interface AIOptimizeScheduleRequest {
  date?: string;
}

export interface AIOptimizeScheduleResponse {
  schedule: AIScheduleItem[];
  insights: string[];
}

export interface AIScheduleItem {
  time: string;
  taskId?: string;
  title: string;
  reason: string;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
}

// ============================================
// Validation Schemas (Zod)
// ============================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  dueDate: z.string().datetime().optional(),
});

export const logMoodSchema = z.object({
  energyLevel: z.number().int().min(1).max(10),
  focusLevel: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional(),
});

export const authSchema = z.object({
  initData: z.string().min(1),
});

// ============================================
// JWT Payload
// ============================================

export interface JWTPayload {
  userId: string;
  telegramId: string;
  iat?: number;
  exp?: number;
}

// ============================================
// Service Response Types
// ============================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================
// Telegram Types
// ============================================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: any;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

// ============================================
// Error Types
// ============================================

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}
