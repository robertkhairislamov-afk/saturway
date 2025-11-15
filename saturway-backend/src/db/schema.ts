// Database Schema using Drizzle ORM
import { pgTable, uuid, bigint, varchar, text, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users Table
// ============================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  languageCode: varchar('language_code', { length: 10 }),
  isPremium: integer('is_premium').default(0), // 0 = false, 1 = true
  photoUrl: text('photo_url'),
  settings: jsonb('settings').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  telegramIdIdx: uniqueIndex('telegram_id_idx').on(table.telegramId),
}));

// ============================================
// Tasks Table
// ============================================

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('medium').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  aiMetadata: jsonb('ai_metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('tasks_user_id_idx').on(table.userId),
  statusIdx: index('tasks_status_idx').on(table.status),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
  userStatusIdx: index('tasks_user_status_idx').on(table.userId, table.status),
}));

// ============================================
// Mood Logs Table
// ============================================

export const moodLogs = pgTable('mood_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  energyLevel: integer('energy_level').notNull(),
  focusLevel: integer('focus_level').notNull(),
  notes: text('notes'),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('mood_logs_user_id_idx').on(table.userId),
  loggedAtIdx: index('mood_logs_logged_at_idx').on(table.loggedAt),
  userLoggedAtIdx: index('mood_logs_user_logged_at_idx').on(table.userId, table.loggedAt),
}));

// ============================================
// AI Conversations Table (Cache)
// ============================================

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  provider: varchar('provider', { length: 20 }).notNull(),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
  promptHashIdx: uniqueIndex('ai_conversations_prompt_hash_idx').on(table.promptHash),
  expiresAtIdx: index('ai_conversations_expires_at_idx').on(table.expiresAt),
}));

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  moodLogs: many(moodLogs),
  aiConversations: many(aiConversations),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const moodLogsRelations = relations(moodLogs, ({ one }) => ({
  user: one(users, {
    fields: [moodLogs.userId],
    references: [users.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type MoodLog = typeof moodLogs.$inferSelect;
export type NewMoodLog = typeof moodLogs.$inferInsert;

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
