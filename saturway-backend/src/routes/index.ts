// API Routes
import { FastifyInstance } from 'fastify';
import { authHandler } from '../controllers/authController.js';
import { authenticateJWT, getUserId } from '../middleware/auth.js';
import { taskService } from '../services/taskService.js';
import { moodService } from '../services/moodService.js';
import { aiService } from '../services/aiService.js';
import { userService } from '../services/userService.js';
import {
  authSchema,
  createTaskSchema,
  updateTaskSchema,
  logMoodSchema,
} from '../types/index.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================
  // Health Check
  // ==========================================

  app.get('/health', async () => {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: app.config.server.env,
    };
  });

  // ==========================================
  // Authentication
  // ==========================================

  app.post('/api/auth', {
    schema: {
      body: authSchema,
    },
    handler: authHandler,
  });

  // ==========================================
  // User Routes
  // ==========================================

  app.get('/api/user/me', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const user = await userService.findById(userId);

      return {
        success: true,
        data: user,
      };
    },
  });

  app.get('/api/user/stats', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const stats = await userService.getUserStats(userId);

      return {
        success: true,
        data: stats,
      };
    },
  });

  // ==========================================
  // Task Routes
  // ==========================================

  app.get('/api/tasks', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const tasks = await taskService.getAllUserTasks(userId);

      return {
        success: true,
        data: { tasks },
      };
    },
  });

  app.post('/api/tasks', {
    preHandler: [authenticateJWT],
    schema: {
      body: createTaskSchema,
    },
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const data = request.body as any;

      const task = await taskService.createTask(userId, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });

      return {
        success: true,
        data: { task },
      };
    },
  });

  app.get('/api/tasks/:taskId', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { taskId } = request.params as { taskId: string };

      const task = await taskService.getTaskById(taskId, userId);

      return {
        success: true,
        data: { task },
      };
    },
  });

  app.patch('/api/tasks/:taskId', {
    preHandler: [authenticateJWT],
    schema: {
      body: updateTaskSchema,
    },
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { taskId } = request.params as { taskId: string };
      const data = request.body as any;

      const task = await taskService.updateTask(taskId, userId, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });

      return {
        success: true,
        data: { task },
      };
    },
  });

  app.delete('/api/tasks/:taskId', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { taskId } = request.params as { taskId: string };

      await taskService.deleteTask(taskId, userId);

      return {
        success: true,
        message: 'Task deleted successfully',
      };
    },
  });

  app.post('/api/tasks/:taskId/complete', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { taskId } = request.params as { taskId: string };

      const task = await taskService.completeTask(taskId, userId);

      return {
        success: true,
        data: { task },
      };
    },
  });

  // ==========================================
  // Mood Routes
  // ==========================================

  app.post('/api/mood/log', {
    preHandler: [authenticateJWT],
    schema: {
      body: logMoodSchema,
    },
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const data = request.body as any;

      const moodLog = await moodService.logMood(userId, {
        energyLevel: data.energyLevel,
        focusLevel: data.focusLevel,
        notes: data.notes,
      });

      return {
        success: true,
        data: { moodLog },
      };
    },
  });

  app.get('/api/mood/logs', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { days } = request.query as { days?: string };

      const logs = await moodService.getRecentMoodLogs(userId, days ? parseInt(days) : 7);

      return {
        success: true,
        data: { logs },
      };
    },
  });

  app.get('/api/mood/stats', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);
      const { days } = request.query as { days?: string };

      const stats = await moodService.getMoodStats(userId, days ? parseInt(days) : 7);

      return {
        success: true,
        data: stats,
      };
    },
  });

  // ==========================================
  // AI Routes
  // ==========================================

  app.post('/api/ai/optimize-schedule', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);

      const result = await aiService.optimizeSchedule(userId);

      return {
        success: true,
        data: result,
      };
    },
  });

  app.get('/api/ai/insights', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);

      const insights = await aiService.getInsights(userId);

      return {
        success: true,
        data: { insights },
      };
    },
  });

  app.post('/api/ai/suggestions', {
    preHandler: [authenticateJWT],
    handler: async (request, reply) => {
      const userId = getUserId(request);

      const suggestions = await aiService.generateTaskSuggestions(userId);

      return {
        success: true,
        data: { suggestions },
      };
    },
  });
}
