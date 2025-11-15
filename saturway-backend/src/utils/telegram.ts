// Telegram WebApp Validation Utilities
import crypto from 'crypto';
import { config } from '../config/index.js';
import { TelegramWebAppInitData, TelegramUser } from '../types/index.js';
import { AuthenticationError } from '../types/index.js';

/**
 * Validates Telegram WebApp initData
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return false;
    }

    params.delete('hash');

    // Sort params and create data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegram.botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hash === calculatedHash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
}

/**
 * Parses Telegram WebApp initData and extracts user information
 */
export function parseTelegramWebAppData(initData: string): TelegramWebAppInitData {
  const params = new URLSearchParams(initData);

  const userParam = params.get('user');
  if (!userParam) {
    throw new AuthenticationError('No user data in initData');
  }

  const user: TelegramUser = JSON.parse(userParam);
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const hash = params.get('hash') || '';

  // Check if auth_date is not too old (e.g., 24 hours)
  const MAX_AUTH_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const authAge = Date.now() - authDate * 1000;

  if (authAge > MAX_AUTH_AGE) {
    throw new AuthenticationError('Auth data is too old');
  }

  return {
    user,
    auth_date: authDate,
    hash,
    query_id: params.get('query_id') || undefined,
    chat_instance: params.get('chat_instance') || undefined,
    start_param: params.get('start_param') || undefined,
  };
}

/**
 * Validates and parses Telegram WebApp data
 */
export function validateAndParseTelegramData(initData: string): TelegramUser {
  if (!validateTelegramWebAppData(initData)) {
    throw new AuthenticationError('Invalid Telegram WebApp data');
  }

  const parsed = parseTelegramWebAppData(initData);

  if (!parsed.user) {
    throw new AuthenticationError('No user data found');
  }

  return parsed.user;
}

/**
 * Creates a hash for caching purposes
 */
export function createHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Creates a hash for AI conversation caching
 */
export function createAIPromptHash(userId: string, prompt: string): string {
  return createHash(`${userId}:${prompt}`);
}
