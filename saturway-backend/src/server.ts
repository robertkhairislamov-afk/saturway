// Main Server File
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { config } from './config/index.js';
import { db, checkDatabaseConnection, closeDatabaseConnection } from './db/index.js';
import { cacheService } from './services/cacheService.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Create Fastify instance with logging
const app = Fastify({
  logger: {
    level: config.logging.level,
    transport: config.server.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Extend Fastify instance with config
declare module 'fastify' {
  interface FastifyInstance {
    config: typeof config;
  }
}

app.decorate('config', config);

// ==========================================
// Plugins
// ==========================================

// CORS
await app.register(cors, config.cors);

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: config.server.isDevelopment ? false : undefined,
});

// JWT
await app.register(jwt, {
  secret: config.jwt.secret,
});

// ==========================================
// Global Hooks
// ==========================================

// Request logging
app.addHook('onRequest', async (request, reply) => {
  request.log.info({
    method: request.method,
    url: request.url,
    ip: request.ip,
  });
});

// Response time tracking
app.addHook('onRequest', async (request: any, reply) => {
  request.startTime = Date.now();
});

app.addHook('onResponse', async (request: any, reply) => {
  const responseTime = Date.now() - request.startTime;
  reply.header('X-Response-Time', `${responseTime}ms`);
});

// ==========================================
// Error Handlers
// ==========================================

app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);

// ==========================================
// Routes
// ==========================================

await registerRoutes(app);

// ==========================================
// Startup Function
// ==========================================

async function start() {
  try {
    // Check database connection
    app.log.info('Checking database connection...');
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    app.log.info('Connecting to Redis...');
    await cacheService.connect();

    // Start server
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    app.log.info(`
🚀 Saturway Backend Server Started!

Environment: ${config.server.env}
Port: ${config.server.port}
Host: ${config.server.host}
URL: http://${config.server.host}:${config.server.port}

Database: Connected ✅
Redis: ${cacheService.isReady() ? 'Connected ✅' : 'Disconnected ⚠️'}
AI Provider: ${config.ai.defaultProvider}

Health Check: http://${config.server.host}:${config.server.port}/health
    `);
  } catch (error) {
    app.log.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ==========================================
// Graceful Shutdown
// ==========================================

async function shutdown(signal: string) {
  app.log.info(`${signal} received, shutting down gracefully...`);

  try {
    // Close Fastify server
    await app.close();
    app.log.info('Fastify server closed');

    // Close database connection
    await closeDatabaseConnection();

    // Close Redis connection
    await cacheService.close();

    app.log.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    app.log.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  app.log.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  app.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// ==========================================
// Start the server
// ==========================================

start();

// Export for testing
export { app };
