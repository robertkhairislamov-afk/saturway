/**
 * AI Service
 * Handles all AI-powered features using Claude
 */

import { apiClient } from '../lib/api';
import { Task } from './taskService';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'wellness' | 'scheduling' | 'motivation';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  createdAt: string;
}

export interface AIInsightsResponse {
  success: boolean;
  insights: AIInsight[];
}

export interface OptimizeScheduleInput {
  tasks: string[]; // Task IDs
  energyLevel?: number;
  focusLevel?: number;
  preferences?: {
    workHoursStart?: string; // "09:00"
    workHoursEnd?: string; // "18:00"
    breakDuration?: number; // minutes
    prioritizeUrgent?: boolean;
  };
}

export interface ScheduleSuggestion {
  taskId: string;
  suggestedTime: string;
  duration: number; // minutes
  reasoning: string;
  energyMatch: number; // 1-5
}

export interface OptimizeScheduleResponse {
  success: boolean;
  suggestions: ScheduleSuggestion[];
  reasoning: string;
}

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
  category: string;
}

export interface TaskSuggestionsResponse {
  success: boolean;
  suggestions: TaskSuggestion[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  tokensUsed: number;
}

/**
 * Get AI insights based on user's tasks and mood data
 */
export async function getAIInsights(): Promise<AIInsight[]> {
  const response = await apiClient.get<AIInsightsResponse>('/ai/insights');
  return response.insights;
}

/**
 * Optimize schedule using AI
 */
export async function optimizeSchedule(
  input: OptimizeScheduleInput
): Promise<ScheduleSuggestion[]> {
  const response = await apiClient.post<OptimizeScheduleResponse>(
    '/ai/optimize-schedule',
    input
  );
  return response.suggestions;
}

/**
 * Get AI-powered task suggestions
 */
export async function getTaskSuggestions(): Promise<TaskSuggestion[]> {
  const response = await apiClient.post<TaskSuggestionsResponse>('/ai/suggestions');
  return response.suggestions;
}

/**
 * Chat with AI assistant
 */
export async function chatWithAI(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<string> {
  const response = await apiClient.post<ChatResponse>('/ai/chat', {
    message,
    history: conversationHistory || [],
  });

  return response.response;
}

/**
 * Get motivational message based on current state
 */
export async function getMotivationalMessage(context?: {
  energyLevel?: number;
  focusLevel?: number;
  completedTasksToday?: number;
}): Promise<string> {
  const prompt = `Generate a short motivational message for a user with:
- Energy level: ${context?.energyLevel || 3}/5
- Focus level: ${context?.focusLevel || 3}/5
- Completed tasks today: ${context?.completedTasksToday || 0}

Keep it positive, concise (1-2 sentences), and actionable.`;

  return chatWithAI(prompt);
}

/**
 * Analyze task complexity and get time estimate
 */
export async function analyzeTask(taskTitle: string, description?: string): Promise<{
  estimatedDuration: number; // minutes
  complexity: 'low' | 'medium' | 'high';
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
  tips: string[];
}> {
  const prompt = `Analyze this task and provide estimates:
Title: ${taskTitle}
Description: ${description || 'No description'}

Provide:
1. Estimated duration in minutes
2. Complexity level (low/medium/high)
3. Suggested priority (low/medium/high/urgent)
4. 2-3 tips for completing it efficiently

Format as JSON.`;

  const response = await chatWithAI(prompt);

  try {
    return JSON.parse(response);
  } catch {
    // Fallback if parsing fails
    return {
      estimatedDuration: 30,
      complexity: 'medium',
      suggestedPriority: 'medium',
      tips: ['Break down into smaller steps', 'Focus on one thing at a time'],
    };
  }
}

/**
 * Get productivity tips based on user patterns
 */
export async function getProductivityTips(userStats?: {
  completionRate?: number;
  averageEnergy?: number;
  averageFocus?: number;
}): Promise<string[]> {
  const prompt = `Based on user stats:
- Task completion rate: ${userStats?.completionRate || 50}%
- Average energy: ${userStats?.averageEnergy || 3}/5
- Average focus: ${userStats?.averageFocus || 3}/5

Provide 3-5 specific, actionable productivity tips. Return as JSON array of strings.`;

  const response = await chatWithAI(prompt);

  try {
    return JSON.parse(response);
  } catch {
    return [
      'Try the Pomodoro technique for better focus',
      'Break large tasks into smaller, manageable steps',
      'Schedule important tasks during your peak energy hours',
    ];
  }
}

/**
 * Generate task description using AI
 */
export async function generateTaskDescription(taskTitle: string): Promise<string> {
  const prompt = `For the task titled "${taskTitle}", generate a helpful description that includes:
- What needs to be done
- Why it's important
- Potential steps or considerations

Keep it concise (2-3 sentences).`;

  return chatWithAI(prompt);
}
