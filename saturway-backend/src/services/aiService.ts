// AI Service - Handles AI operations with Claude/OpenAI
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { cacheService } from './cacheService.js';
import { taskService } from './taskService.js';
import { moodService } from './moodService.js';
import { createAIPromptHash } from '../utils/telegram.js';
import { AIScheduleItem } from '../types/index.js';

export class AIService {
  private anthropic: Anthropic;
  private openai?: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.ai.anthropic.apiKey,
    });

    if (config.ai.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.ai.openai.apiKey,
      });
    }
  }

  /**
   * Send a message to Claude
   */
  private async sendClaude(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: config.ai.anthropic.model,
      max_tokens: config.ai.anthropic.maxTokens,
      messages,
    });

    const firstContent = response.content[0];
    if (firstContent.type === 'text') {
      return firstContent.text;
    }

    throw new Error('Unexpected response format from Claude');
  }

  /**
   * Send a message to OpenAI
   */
  private async sendOpenAI(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: config.ai.openai.model,
      max_tokens: config.ai.openai.maxTokens,
      messages,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generic chat function with caching
   */
  async chat(
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    provider: 'claude' | 'openai' = config.ai.defaultProvider
  ): Promise<string> {
    // Create cache key
    const promptHash = createAIPromptHash(userId, JSON.stringify(messages));
    const cacheKey = cacheService.createKey('ai', 'chat', promptHash);

    // Try cache first
    const cached = await cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get fresh response
    let response: string;
    if (provider === 'claude') {
      response = await this.sendClaude(messages);
    } else {
      response = await this.sendOpenAI(messages);
    }

    // Cache the response
    await cacheService.set(cacheKey, response, config.ai.cacheTTL);

    return response;
  }

  /**
   * Optimize user's schedule for the day
   */
  async optimizeSchedule(userId: string, date?: Date): Promise<{
    schedule: AIScheduleItem[];
    insights: string[];
  }> {
    // Get user's pending tasks
    const tasks = await taskService.getTasksByStatus(userId, 'pending');

    // Get recent mood data
    const moodLogs = await moodService.getRecentMoodLogs(userId, 7);
    const moodStats = await moodService.getMoodStats(userId, 7);

    // Prepare context for AI
    const tasksContext = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
    }));

    const prompt = `You are a productivity AI assistant. Help optimize the user's schedule for today.

User's Tasks (${tasks.length}):
${JSON.stringify(tasksContext, null, 2)}

User's Recent Mood Statistics:
- Average Energy: ${moodStats.averageEnergy}/10
- Average Focus: ${moodStats.averageFocus}/10
- Trend: ${moodStats.trend}

Current Time: ${new Date().toISOString()}

Based on this information:
1. Create an optimal schedule for today
2. Consider the user's energy and focus levels
3. Prioritize high-priority tasks during peak energy times
4. Provide insights and recommendations

Return a JSON response in this exact format:
{
  "schedule": [
    {
      "time": "09:00",
      "taskId": "uuid-or-null",
      "title": "Task title or break",
      "reason": "Why schedule this now",
      "estimatedDuration": 60,
      "priority": "high"
    }
  ],
  "insights": [
    "Your energy levels are highest in the morning...",
    "Consider taking breaks every 90 minutes..."
  ]
}`;

    const response = await this.chat(userId, [
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // Parse AI response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response;
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);
      return {
        schedule: parsed.schedule || [],
        insights: parsed.insights || [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return fallback
      return {
        schedule: [],
        insights: ['Unable to generate schedule at this time. Please try again.'],
      };
    }
  }

  /**
   * Generate task suggestions based on user patterns
   */
  async generateTaskSuggestions(userId: string): Promise<string[]> {
    const tasks = await taskService.getAllUserTasks(userId, { limit: 50 });
    const moodStats = await moodService.getMoodStats(userId, 7);

    const prompt = `Based on this user's task history and mood data, suggest 3-5 new productive tasks they might want to add.

Completed Tasks: ${tasks.filter(t => t.status === 'completed').map(t => t.title).join(', ')}
Pending Tasks: ${tasks.filter(t => t.status === 'pending').map(t => t.title).join(', ')}

Mood Stats:
- Average Energy: ${moodStats.averageEnergy}/10
- Average Focus: ${moodStats.averageFocus}/10

Return ONLY a JSON array of strings:
["Task suggestion 1", "Task suggestion 2", ...]`;

    const response = await this.chat(userId, [{ role: 'user', content: prompt }]);

    try {
      let jsonText = response;
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      return JSON.parse(jsonText);
    } catch (error) {
      return ['Review your goals', 'Plan your week', 'Organize workspace'];
    }
  }

  /**
   * Get AI insights based on user data
   */
  async getInsights(userId: string): Promise<string[]> {
    const taskStats = await taskService.getTaskStats(userId);
    const moodStats = await moodService.getMoodStats(userId, 7);

    const insights: string[] = [];

    // Task completion insights
    const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;
    if (completionRate > 70) {
      insights.push(`Great job! You've completed ${completionRate.toFixed(0)}% of your tasks.`);
    } else if (completionRate < 30) {
      insights.push(`You have ${taskStats.pending} pending tasks. Let's tackle them!`);
    }

    // Mood insights
    if (moodStats.trend === 'improving') {
      insights.push('Your mood is improving! Keep up the great work.');
    } else if (moodStats.trend === 'declining') {
      insights.push('Your energy seems low lately. Consider taking breaks.');
    }

    if (moodStats.averageEnergy < 5) {
      insights.push('Your energy levels are below average. Prioritize rest and self-care.');
    }

    if (moodStats.averageFocus < 5) {
      insights.push('Focus seems challenging lately. Try shorter work sessions with breaks.');
    }

    return insights;
  }
}

export const aiService = new AIService();
