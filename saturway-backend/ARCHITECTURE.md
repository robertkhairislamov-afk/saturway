# 🏗️ Saturway Backend Architecture

## Overview

Professional, enterprise-grade backend architecture built with modern TypeScript, following SOLID principles and clean architecture patterns.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│           (Telegram Mini App / Web Interface)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Fastify Server                                      │   │
│  │  - CORS, Helmet (Security)                          │   │
│  │  - Rate Limiting                                    │   │
│  │  - Request Validation (Zod)                        │   │
│  │  - JWT Authentication                              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ROUTING LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/auth      → Auth Controller                   │   │
│  │  /api/tasks     → Task Routes                       │   │
│  │  /api/mood      → Mood Routes                       │   │
│  │  /api/ai        → AI Routes                         │   │
│  │  /api/user      → User Routes                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 MIDDLEWARE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Authentication Middleware                          │   │
│  │  Error Handler                                      │   │
│  │  Request Logger                                     │   │
│  │  Response Time Tracker                              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER (Services)                 │
│  ┌─────────────┬─────────────┬─────────────┬────────────┐  │
│  │  User       │   Task      │   Mood      │   AI       │  │
│  │  Service    │   Service   │   Service   │   Service  │  │
│  └─────────────┴─────────────┴─────────────┴────────────┘  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Cache Service (Redis)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Drizzle ORM                                        │   │
│  │  - Type-safe queries                                │   │
│  │  - Schema management                                │   │
│  │  - Migrations                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  STORAGE LAYER                               │
│  ┌──────────────┬────────────────┬────────────────────┐    │
│  │  PostgreSQL  │     Redis      │   External APIs    │    │
│  │  (Primary    │   (Cache &     │   (Claude/OpenAI)  │    │
│  │   Database)  │   Sessions)    │                    │    │
│  └──────────────┴────────────────┴────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Folder Structure

```
src/
├── config/              # Configuration Management
│   └── index.ts         # Env vars, app config, constants
│
├── controllers/         # Request Controllers
│   └── authController.ts
│
├── db/                  # Database Layer
│   ├── index.ts         # DB connection & client
│   └── schema.ts        # Drizzle ORM schemas
│
├── middleware/          # Middleware Functions
│   ├── auth.ts          # JWT authentication
│   └── errorHandler.ts  # Global error handling
│
├── routes/              # API Route Definitions
│   └── index.ts         # Route registration
│
├── services/            # Business Logic
│   ├── aiService.ts     # AI operations
│   ├── cacheService.ts  # Redis caching
│   ├── moodService.ts   # Mood tracking
│   ├── taskService.ts   # Task management
│   └── userService.ts   # User operations
│
├── types/               # TypeScript Definitions
│   └── index.ts         # Shared types & interfaces
│
├── utils/               # Utility Functions
│   └── telegram.ts      # Telegram validation utils
│
└── server.ts            # Main Application Entry
```

## 🔄 Request Flow

### Example: Creating a Task

```
1. Client Request
   POST /api/tasks
   Headers: { Authorization: "Bearer <jwt>" }
   Body: { title: "Buy groceries", priority: "high" }

   ↓

2. Fastify Server
   - CORS check
   - Helmet security headers
   - Parse JSON body

   ↓

3. Route Handler (/api/tasks)
   - Match POST /api/tasks
   - Execute middleware chain

   ↓

4. Authentication Middleware
   - Verify JWT token
   - Extract user ID
   - Attach to request.user

   ↓

5. Validation
   - Validate body with Zod schema (createTaskSchema)
   - Ensure required fields present
   - Check data types

   ↓

6. Task Service
   - Check user task limit
   - Create task in database
   - Return created task

   ↓

7. Database (Drizzle ORM)
   - Execute type-safe INSERT query
   - Return inserted row

   ↓

8. Response
   {
     "success": true,
     "data": {
       "task": {
         "id": "uuid",
         "title": "Buy groceries",
         "priority": "high",
         ...
       }
     }
   }
```

## 🛡️ Security Layers

### 1. Telegram WebApp Validation

```typescript
// Validates Telegram initData cryptographic signature
validateTelegramWebAppData(initData) → boolean
```

**Process:**
1. Extract hash from initData
2. Create HMAC-SHA256 signature using bot token
3. Compare calculated hash with provided hash
4. Verify auth_date is recent (< 24 hours)

### 2. JWT Authentication

```typescript
// Generate token after Telegram validation
jwt.sign({ userId, telegramId }, secret, { expiresIn: '7d' })
```

**Features:**
- HS256 algorithm
- 7-day expiration (configurable)
- User ID and Telegram ID in payload
- Verified on every protected route

### 3. Input Validation (Zod)

```typescript
// Example schema
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high']),
});
```

**Benefits:**
- Type-safe validation
- Automatic error messages
- Runtime type checking

### 4. Security Headers (Helmet)

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### 5. Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_MAX_REQUESTS=100     # 100 req/min
```

## 📦 Service Layer Design

### Service Pattern

Each service follows this pattern:

```typescript
class SomeService {
  // Database queries
  async findById(id: string): Promise<Entity | null>
  async create(data: CreateData): Promise<Entity>
  async update(id: string, data: UpdateData): Promise<Entity>
  async delete(id: string): Promise<void>

  // Business logic
  async someBusinessOperation(): Promise<Result>
}
```

### Service Responsibilities

**UserService:**
- User CRUD operations
- Telegram user sync
- User settings management

**TaskService:**
- Task CRUD operations
- Task filtering & pagination
- Task statistics

**MoodService:**
- Mood log creation
- Mood statistics calculation
- Trend analysis

**AIService:**
- AI chat with caching
- Schedule optimization
- Task suggestions generation
- Insights generation

**CacheService:**
- Redis connection management
- Get/Set operations
- Pattern-based deletion
- Cache-aside pattern helper

## 🔌 Database Schema

### Tables

**users**
- Primary user data from Telegram
- Settings stored as JSONB

**tasks**
- User tasks with priorities
- AI metadata for suggestions
- Cascading delete on user removal

**mood_logs**
- Energy and focus tracking
- Time-series data
- Indexed for fast queries

**ai_conversations** (cache)
- Stores AI responses
- Auto-expires after 7 days
- Reduces API costs

### Relationships

```
users (1) ──→ (N) tasks
users (1) ──→ (N) mood_logs
users (1) ──→ (N) ai_conversations
```

### Indexing Strategy

```typescript
// Composite indexes for common queries
index('tasks_user_status_idx').on(userId, status)
index('mood_logs_user_logged_at_idx').on(userId, loggedAt)
```

## 🎯 Design Patterns

### 1. Dependency Injection

Services are exported as singletons:

```typescript
export const taskService = new TaskService();
```

### 2. Repository Pattern

Services act as repositories for data access.

### 3. Factory Pattern

Configuration factory from environment:

```typescript
const config = parseEnv() // Factory
```

### 4. Singleton Pattern

- Database connection
- Redis client
- Service instances

### 5. Strategy Pattern

AI provider selection:

```typescript
if (provider === 'claude') {
  return await this.sendClaude()
} else {
  return await this.sendOpenAI()
}
```

### 6. Cache-Aside Pattern

```typescript
async getOrSet<T>(key, getter, ttl) {
  const cached = await get(key)
  if (cached) return cached

  const fresh = await getter()
  await set(key, fresh, ttl)
  return fresh
}
```

## 🚀 Performance Optimizations

### 1. Connection Pooling

```typescript
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
})
```

### 2. Redis Caching

- AI responses cached for 1 hour
- User sessions cached
- Reduces database load

### 3. Database Indexing

- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes for filtered queries

### 4. Lazy Loading

Services only initialized when needed.

### 5. Efficient Queries

```typescript
// Bad: N+1 queries
for (task of tasks) {
  await getUser(task.userId)
}

// Good: Join or batch
const tasksWithUsers = await db.query.tasks.findMany({
  with: { user: true }
})
```

## 🔍 Error Handling

### Error Hierarchy

```
Error
  └── AppError (base)
      ├── ValidationError (400)
      ├── AuthenticationError (401)
      ├── AuthorizationError (403)
      ├── NotFoundError (404)
      └── RateLimitError (429)
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": [...],
    "stack": "..." // Only in development
  }
}
```

## 📊 Monitoring & Logging

### Structured Logging (Pino)

```typescript
app.log.info({
  event: 'task_created',
  userId: user.id,
  taskId: task.id,
})
```

### Log Levels

- `error` - Critical failures
- `warn` - Non-critical issues
- `info` - General operations
- `debug` - Detailed debugging

### Health Checks

```bash
GET /health
```

Returns:
- Server status
- Database connectivity
- Redis connectivity
- Environment info

## 🧪 Testing Strategy (Recommended)

### Unit Tests
```typescript
describe('TaskService', () => {
  it('should create task', async () => {
    const task = await taskService.create(...)
    expect(task.id).toBeDefined()
  })
})
```

### Integration Tests
```typescript
describe('POST /api/tasks', () => {
  it('should return 401 without auth', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks'
    })
    expect(response.statusCode).toBe(401)
  })
})
```

## 🔐 Environment Configuration

### Environment Levels

1. **Development** - Full logging, hot reload
2. **Production** - Minimal logging, optimized
3. **Test** - Mock external services

### Config Validation

All environment variables validated on startup with Zod:

```typescript
const envSchema = z.object({
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  ...
})
```

## 📈 Scalability Considerations

### Horizontal Scaling

- Stateless design (JWT, no sessions)
- Redis for shared cache
- Database connection pooling

### Vertical Scaling

- Async operations (non-blocking I/O)
- Efficient database queries
- Connection limits configured

### Future Improvements

- [ ] Message queue (Bull/BullMQ)
- [ ] WebSocket support
- [ ] Microservices architecture
- [ ] Event-driven patterns
- [ ] CQRS for read/write separation

---

This architecture is designed to be:
- **Maintainable** - Clear separation of concerns
- **Scalable** - Can handle growth
- **Secure** - Multiple security layers
- **Type-safe** - Full TypeScript coverage
- **Testable** - Easy to unit/integration test
