// Authentication Controller
import { FastifyRequest, FastifyReply } from 'fastify';
import { validateAndParseTelegramData } from '../utils/telegram.js';
import { userService } from '../services/userService.js';
import { AuthRequest, AuthResponse } from '../types/index.js';
import { config } from '../config/index.js';

export async function authHandler(
  request: FastifyRequest<{ Body: AuthRequest }>,
  reply: FastifyReply
): Promise<AuthResponse> {
  const { initData } = request.body;

  // Validate and parse Telegram data
  const telegramUser = validateAndParseTelegramData(initData);

  // Create or update user in database
  const user = await userService.upsertFromTelegram(telegramUser);

  // Generate JWT token
  const token = request.server.jwt.sign(
    {
      userId: user.id,
      telegramId: user.telegramId.toString(),
    },
    {
      expiresIn: config.jwt.expiresIn,
    }
  );

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
    },
  };
}
