// Task Adapter - Maps between API format and UI format
// API uses: "pending" | "in_progress" | "completed" | "cancelled"
// UI wants: "active" | "done"

import { formatLocalDate } from '../lib/dateUtils';

export type APITaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type UITaskStatus = 'active' | 'done';

export type APITask = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: APITaskStatus;
  dueDate?: string; // ISO timestamp
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  aiMetadata?: any;
};

export type UITask = {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: UITaskStatus;
  date?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
};

/**
 * Convert API status to UI status
 */
export function apiStatusToUI(apiStatus: APITaskStatus): UITaskStatus {
  switch (apiStatus) {
    case 'completed':
      return 'done';
    case 'pending':
    case 'in_progress':
    case 'cancelled':
    default:
      return 'active';
  }
}

/**
 * Convert UI status to API status
 */
export function uiStatusToAPI(uiStatus: UITaskStatus): APITaskStatus {
  switch (uiStatus) {
    case 'done':
      return 'completed';
    case 'active':
    default:
      return 'pending';
  }
}

/**
 * Convert API task to UI task
 */
export function apiTaskToUI(apiTask: APITask): UITask {
  return {
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description,
    priority: apiTask.priority,
    status: apiStatusToUI(apiTask.status),
    date: apiTask.dueDate ? formatLocalDate(new Date(apiTask.dueDate)) : undefined,
    createdAt: apiTask.createdAt,
    updatedAt: apiTask.updatedAt,
  };
}

/**
 * Convert UI task to API task format for creation
 */
export function uiTaskToAPICreate(uiTask: Partial<UITask>): {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
} {
  return {
    title: uiTask.title || '',
    description: uiTask.description,
    priority: uiTask.priority || 'medium',
    dueDate: uiTask.date ? new Date(uiTask.date).toISOString() : undefined,
  };
}

/**
 * Convert UI task to API task format for update
 */
export function uiTaskToAPIUpdate(uiTask: Partial<UITask>): {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: APITaskStatus;
  dueDate?: string;
} {
  return {
    title: uiTask.title,
    description: uiTask.description,
    priority: uiTask.priority,
    status: uiTask.status ? uiStatusToAPI(uiTask.status) : undefined,
    dueDate: uiTask.date ? new Date(uiTask.date).toISOString() : undefined,
  };
}
