// Task Service - Handles task-related database operations
import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, NewTask, Task } from '../db/schema.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { config } from '../config/index.js';

export class TaskService {
  /**
   * Get all tasks for a user
   */
  async getAllUserTasks(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Task[]> {
    const limit = Math.min(
      options?.limit || config.constants.defaultPageSize,
      config.constants.maxPageSize
    );

    let query = db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
      orderBy: [desc(tasks.createdAt)],
      limit,
      offset: options?.offset || 0,
    });

    const result = await query;
    return result;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<Task> {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return task;
  }

  /**
   * Create a new task
   */
  async createTask(
    userId: string,
    data: {
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: Date;
      aiMetadata?: any;
    }
  ): Promise<Task> {
    // Check task limit
    const userTasks = await this.getAllUserTasks(userId, { limit: 1 });
    // In production, you'd count total tasks
    // For now, this is a placeholder

    if (data.title.length > config.constants.maxTaskTitleLength) {
      throw new ValidationError('Task title too long');
    }

    if (data.description && data.description.length > config.constants.maxTaskDescriptionLength) {
      throw new ValidationError('Task description too long');
    }

    const newTask: NewTask = {
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: 'pending',
      dueDate: data.dueDate,
      aiMetadata: data.aiMetadata,
    };

    const [createdTask] = await db.insert(tasks).values(newTask).returning();

    return createdTask;
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high';
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      dueDate?: Date;
      aiMetadata?: any;
    }
  ): Promise<Task> {
    // Verify task exists and belongs to user
    await this.getTaskById(taskId, userId);

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Set completedAt if status is completed
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'completed') {
      updateData.completedAt = null;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Verify task exists and belongs to user
    await this.getTaskById(taskId, userId);

    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(
    userId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<Task[]> {
    const result = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, userId), eq(tasks.status, status)),
      orderBy: [desc(tasks.createdAt)],
    });

    return result;
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This would need proper date filtering in production
    // For now, returning all pending tasks
    return this.getTasksByStatus(userId, 'pending');
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string, userId: string): Promise<Task> {
    return this.updateTask(taskId, userId, {
      status: 'completed',
    });
  }

  /**
   * Get task statistics for user
   */
  async getTaskStats(userId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }> {
    const allTasks = await this.getAllUserTasks(userId, { limit: config.constants.maxTasksPerUser });

    return {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      cancelled: allTasks.filter(t => t.status === 'cancelled').length,
    };
  }
}

export const taskService = new TaskService();
