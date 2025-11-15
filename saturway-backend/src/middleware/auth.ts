// Authentication Middleware
import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload, AuthenticationError } from '../types/index.js';

// Extend Fastify Request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token (Fastify JWT plugin automatically does this)
    await request.jwtVerify();

    // User payload is now available at request.user
    // Type assertion to ensure proper typing
    request.user = request.user as JWTPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't fail if not
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    request.user = request.user as JWTPayload;
  } catch (error) {
    // Silently fail - user will be undefined
    request.user = undefined;
  }
}

/**
 * Helper to get current user or throw
 */
export function getCurrentUser(request: FastifyRequest): JWTPayload {
  if (!request.user) {
    throw new AuthenticationError('User not authenticated');
  }
  return request.user;
}

/**
 * Helper to get user ID from request
 */
export function getUserId(request: FastifyRequest): string {
  const user = getCurrentUser(request);
  return user.userId;
}
