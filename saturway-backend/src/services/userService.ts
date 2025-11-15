// User Service - Handles user-related database operations
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, NewUser, User } from '../db/schema.js';
import { TelegramUser, NotFoundError } from '../types/index.js';

export class UserService {
  /**
   * Find user by Telegram ID
   */
  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
    });

    return result || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return result || null;
  }

  /**
   * Create or update user from Telegram data
   */
  async upsertFromTelegram(telegramUser: TelegramUser): Promise<User> {
    const telegramId = BigInt(telegramUser.id);

    // Check if user exists
    const existingUser = await this.findByTelegramId(telegramId);

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code,
          isPremium: telegramUser.is_premium ? 1 : 0,
          photoUrl: telegramUser.photo_url,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      return updatedUser;
    }

    // Create new user
    const newUser: NewUser = {
      telegramId,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      languageCode: telegramUser.language_code,
      isPremium: telegramUser.is_premium ? 1 : 0,
      photoUrl: telegramUser.photo_url,
      settings: {},
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();

    return createdUser;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, settings: Record<string, any>): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        settings: { ...user.settings, ...settings },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Delete user and all related data
   */
  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalMoodLogs: number;
  }> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // This would need to be implemented with proper queries
    // For now, returning mock data structure
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      totalMoodLogs: 0,
    };
  }
}

export const userService = new UserService();
