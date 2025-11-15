// Global Error Handler Middleware
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../types/index.js';
import { config } from '../config/index.js';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

/**
 * Global Error Handler
 */
export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
    ip: request.ip,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    };

    return reply.status(400).send(response);
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        stack: config.server.isDevelopment ? error.stack : undefined,
      },
    };

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    };

    return reply.status(400).send(response);
  }

  // Handle JWT errors
  if (error.message?.includes('jwt') || error.message?.includes('token')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired authentication token',
      },
    };

    return reply.status(401).send(response);
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.server.isDevelopment
        ? error.message
        : 'An unexpected error occurred',
      stack: config.server.isDevelopment ? error.stack : undefined,
    },
  };

  return reply.status(500).send(response);
}

/**
 * Not Found Handler
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  };

  return reply.status(404).send(response);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<T> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      throw error; // Let global error handler catch it
    }
  };
}
