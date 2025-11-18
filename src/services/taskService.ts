/**
 * Task Service
 * Handles all task-related API operations
 */

import { apiClient } from '../lib/api';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  aiMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
}

export interface TasksResponse {
  success: boolean;
  tasks: Task[];
  total: number;
}

export interface TaskResponse {
  success: boolean;
  task: Task;
}

/**
 * Get all tasks for the current user
 */
export async function getTasks(): Promise<Task[]> {
  const response = await apiClient.get<{ success: boolean; data: { tasks: Task[] } }>('/tasks');
  return response.data.tasks;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  const response = await apiClient.get<{ success: boolean; data: { task: Task } }>(`/tasks/${taskId}`);
  return response.data.task;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await apiClient.post<{ success: boolean; data: { task: Task } }>('/tasks', input);
  return response.data.task;
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const response = await apiClient.patch<{ success: boolean; data: { task: Task } }>(`/tasks/${taskId}`, input);
  return response.data.task;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string): Promise<Task> {
  const response = await apiClient.post<{ success: boolean; data: { task: Task } }>(`/tasks/${taskId}/complete`, {});
  return response.data.task;
}

/**
 * Get tasks filtered by status
 */
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter((task) => task.status === status);
}

/**
 * Get tasks filtered by priority
 */
export async function getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter((task) => task.priority === priority);
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  const now = new Date();

  return tasks.filter((task) => {
    if (!task.dueDate || task.status === 'completed') {
      return false;
    }
    return new Date(task.dueDate) < now;
  });
}

/**
 * Get tasks due today
 */
export async function getTodayTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tasks.filter((task) => {
    if (!task.dueDate || task.status === 'completed') {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < tomorrow;
  });
}
