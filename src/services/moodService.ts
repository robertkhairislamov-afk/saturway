/**
 * Mood Service
 * Handles mood logging and energy/focus tracking
 */

import { apiClient } from '../lib/api';

export interface MoodLog {
  id: string;
  userId: string;
  energyLevel: number; // 1-5
  focusLevel: number; // 1-5
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface LogMoodInput {
  energyLevel: number;
  focusLevel: number;
  notes?: string;
}

export interface MoodLogsResponse {
  success: boolean;
  logs: MoodLog[];
  total: number;
}

export interface MoodLogResponse {
  success: boolean;
  log: MoodLog;
}

export interface MoodStats {
  averageEnergy: number;
  averageFocus: number;
  totalLogs: number;
  highEnergyDays: number;
  lowEnergyDays: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface MoodStatsResponse {
  success: boolean;
  stats: MoodStats;
}

/**
 * Log current mood (energy and focus levels)
 */
export async function logMood(input: LogMoodInput): Promise<MoodLog> {
  const response = await apiClient.post<MoodLogResponse>('/mood/log', input);
  return response.log;
}

/**
 * Get mood logs for specified number of days
 */
export async function getMoodLogs(days: number = 7): Promise<MoodLog[]> {
  const response = await apiClient.get<MoodLogsResponse>(`/mood/logs?days=${days}`);
  return response.logs;
}

/**
 * Get mood statistics for specified number of days
 */
export async function getMoodStats(days: number = 7): Promise<MoodStats> {
  const response = await apiClient.get<MoodStatsResponse>(`/mood/stats?days=${days}`);
  return response.stats;
}

/**
 * Get today's mood logs
 */
export async function getTodayMoodLogs(): Promise<MoodLog[]> {
  const logs = await getMoodLogs(1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return logs.filter((log) => {
    const logDate = new Date(log.loggedAt);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });
}

/**
 * Get latest mood log
 */
export async function getLatestMoodLog(): Promise<MoodLog | null> {
  const logs = await getMoodLogs(7);
  if (logs.length === 0) {
    return null;
  }

  // Sort by loggedAt descending
  logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  return logs[0];
}

/**
 * Calculate average mood for a period
 */
export async function getAverageMood(days: number = 7): Promise<{
  averageEnergy: number;
  averageFocus: number;
}> {
  const logs = await getMoodLogs(days);

  if (logs.length === 0) {
    return { averageEnergy: 0, averageFocus: 0 };
  }

  const totalEnergy = logs.reduce((sum, log) => sum + log.energyLevel, 0);
  const totalFocus = logs.reduce((sum, log) => sum + log.focusLevel, 0);

  return {
    averageEnergy: totalEnergy / logs.length,
    averageFocus: totalFocus / logs.length,
  };
}

/**
 * Check if user has logged mood today
 */
export async function hasLoggedMoodToday(): Promise<boolean> {
  const todayLogs = await getTodayMoodLogs();
  return todayLogs.length > 0;
}

/**
 * Get mood trend (improving, declining, stable)
 */
export async function getMoodTrend(): Promise<'improving' | 'declining' | 'stable'> {
  const logs = await getMoodLogs(14); // Last 2 weeks

  if (logs.length < 4) {
    return 'stable';
  }

  // Sort by date
  logs.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  // Split into two halves
  const midpoint = Math.floor(logs.length / 2);
  const firstHalf = logs.slice(0, midpoint);
  const secondHalf = logs.slice(midpoint);

  // Calculate averages for each half
  const firstAvg =
    firstHalf.reduce((sum, log) => sum + log.energyLevel + log.focusLevel, 0) /
    (firstHalf.length * 2);

  const secondAvg =
    secondHalf.reduce((sum, log) => sum + log.energyLevel + log.focusLevel, 0) /
    (secondHalf.length * 2);

  // Determine trend
  const difference = secondAvg - firstAvg;

  if (difference > 0.3) {
    return 'improving';
  } else if (difference < -0.3) {
    return 'declining';
  } else {
    return 'stable';
  }
}
