// Configuration Management with Environment Variables
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment Variables Schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_MAX_CONNECTIONS: z.string().default('20').transform(Number),
  DATABASE_SSL: z.string().default('false').transform(v => v === 'true'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),

  // AI Providers
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  AI_DEFAULT_PROVIDER: z.enum(['claude', 'openai']).default('claude'),
  AI_CACHE_TTL: z.string().default('3600').transform(Number), // 1 hour

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_MAX_RETRIES: z.string().default('3').transform(Number),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Features
  ENABLE_WEBSOCKETS: z.string().default('false').transform(v => v === 'true'),
  ENABLE_METRICS: z.string().default('false').transform(v => v === 'true'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

// Application Configuration
export const config = {
  // Server Configuration
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  // Database Configuration
  database: {
    url: env.DATABASE_URL,
    maxConnections: env.DATABASE_MAX_CONNECTIONS,
    ssl: env.DATABASE_SSL,
    options: {
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_MAX_CONNECTIONS,
      ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    },
  },

  // JWT Configuration
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256' as const,
  },

  // Telegram Configuration
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookUrl: env.TELEGRAM_WEBHOOK_URL,
    polling: !env.TELEGRAM_WEBHOOK_URL, // Use polling if no webhook
  },

  // AI Configuration
  ai: {
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 2048,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      maxTokens: 2048,
    },
    defaultProvider: env.AI_DEFAULT_PROVIDER,
    cacheTTL: env.AI_CACHE_TTL,
  },

  // Redis Configuration
  redis: {
    url: env.REDIS_URL,
    maxRetries: env.REDIS_MAX_RETRIES,
    retryStrategy: (times: number) => {
      if (times > env.REDIS_MAX_RETRIES) {
        return null; // Stop retrying
      }
      return Math.min(times * 50, 2000); // Exponential backoff
    },
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests, please try again later',
  },

  // Logging Configuration
  logging: {
    level: env.LOG_LEVEL,
    format: env.NODE_ENV === 'production' ? 'json' : 'pretty',
  },

  // CORS Configuration
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Feature Flags
  features: {
    websockets: env.ENABLE_WEBSOCKETS,
    metrics: env.ENABLE_METRICS,
  },

  // Business Logic Constants
  constants: {
    // Task limits
    maxTasksPerUser: 1000,
    maxTaskTitleLength: 500,
    maxTaskDescriptionLength: 5000,

    // Mood tracking
    moodLogRetentionDays: 90,
    maxMoodLogsPerDay: 24,

    // AI
    aiCacheExpirationDays: 7,
    maxAIRequestsPerDay: 100,

    // Pagination
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;

// Export types
export type Config = typeof config;
export type Environment = typeof env;

// Helper functions
export const isDevelopment = () => config.server.isDevelopment;
export const isProduction = () => config.server.isProduction;
export const isTest = () => config.server.isTest;

// Validate configuration on import
if (isProduction() && config.cors.origin === '*') {
  console.warn('⚠️  WARNING: CORS is set to allow all origins in production!');
}

if (config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

console.log(`✅ Configuration loaded for ${config.server.env} environment`);
