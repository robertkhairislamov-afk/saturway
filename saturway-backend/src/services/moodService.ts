// Mood Service - Handles mood tracking operations
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { moodLogs, NewMoodLog, MoodLog } from '../db/schema.js';
import { ValidationError } from '../types/index.js';
import { config } from '../config/index.js';

export class MoodService {
  /**
   * Log mood entry
   */
  async logMood(
    userId: string,
    data: {
      energyLevel: number;
      focusLevel: number;
      notes?: string;
    }
  ): Promise<MoodLog> {
    // Validate levels
    if (data.energyLevel < 1 || data.energyLevel > 10) {
      throw new ValidationError('Energy level must be between 1 and 10');
    }

    if (data.focusLevel < 1 || data.focusLevel > 10) {
      throw new ValidationError('Focus level must be between 1 and 10');
    }

    const newMoodLog: NewMoodLog = {
      userId,
      energyLevel: data.energyLevel,
      focusLevel: data.focusLevel,
      notes: data.notes,
      loggedAt: new Date(),
    };

    const [createdLog] = await db.insert(moodLogs).values(newMoodLog).returning();

    return createdLog;
  }

  /**
   * Get mood logs for a user
   */
  async getUserMoodLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<MoodLog[]> {
    const limit = Math.min(
      options?.limit || config.constants.defaultPageSize,
      config.constants.maxPageSize
    );

    const result = await db.query.moodLogs.findMany({
      where: eq(moodLogs.userId, userId),
      orderBy: [desc(moodLogs.loggedAt)],
      limit,
      offset: options?.offset || 0,
    });

    return result;
  }

  /**
   * Get mood logs for a specific date range
   */
  async getMoodLogsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MoodLog[]> {
    // This would use proper date range filtering in production
    // For now, getting all logs and filtering
    const allLogs = await this.getUserMoodLogs(userId, { limit: 1000 });

    return allLogs.filter(log => {
      const logDate = new Date(log.loggedAt);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Get recent mood logs (last N days)
   */
  async getRecentMoodLogs(userId: string, days: number = 7): Promise<MoodLog[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getMoodLogsByDateRange(userId, startDate, endDate);
  }

  /**
   * Get mood statistics
   */
  async getMoodStats(userId: string, days: number = 7): Promise<{
    averageEnergy: number;
    averageFocus: number;
    totalLogs: number;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const logs = await this.getRecentMoodLogs(userId, days);

    if (logs.length === 0) {
      return {
        averageEnergy: 0,
        averageFocus: 0,
        totalLogs: 0,
        trend: 'stable',
      };
    }

    const avgEnergy = logs.reduce((sum, log) => sum + log.energyLevel, 0) / logs.length;
    const avgFocus = logs.reduce((sum, log) => sum + log.focusLevel, 0) / logs.length;

    // Calculate trend (simple: compare first half vs second half)
    const halfPoint = Math.floor(logs.length / 2);
    const firstHalfAvg =
      logs.slice(0, halfPoint).reduce((sum, log) => sum + (log.energyLevel + log.focusLevel) / 2, 0) /
      halfPoint;
    const secondHalfAvg =
      logs.slice(halfPoint).reduce((sum, log) => sum + (log.energyLevel + log.focusLevel) / 2, 0) /
      (logs.length - halfPoint);

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.5) {
      trend = 'improving';
    } else if (secondHalfAvg < firstHalfAvg - 0.5) {
      trend = 'declining';
    }

    return {
      averageEnergy: Math.round(avgEnergy * 10) / 10,
      averageFocus: Math.round(avgFocus * 10) / 10,
      totalLogs: logs.length,
      trend,
    };
  }

  /**
   * Delete old mood logs (cleanup)
   */
  async deleteOldMoodLogs(userId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.constants.moodLogRetentionDays);

    // This would use proper date filtering in production
    const oldLogs = await this.getUserMoodLogs(userId, { limit: 10000 });
    const logsToDelete = oldLogs.filter(log => new Date(log.loggedAt) < cutoffDate);

    for (const log of logsToDelete) {
      await db.delete(moodLogs).where(eq(moodLogs.id, log.id));
    }

    return logsToDelete.length;
  }
}

export const moodService = new MoodService();
