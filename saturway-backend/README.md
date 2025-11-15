# 🪐 Saturway Backend

Professional, scalable backend API for Saturway - AI-powered productivity Telegram Mini App.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 15
- Redis >= 7 (optional, but recommended)
- npm >= 10.0.0

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Database Setup

```bash
# Create PostgreSQL database
createdb saturway

# Or via psql
psql -U postgres
CREATE DATABASE saturway;
CREATE USER saturway_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE saturway TO saturway_user;
\q

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (development)
npm run db:push
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

Server will start on http://localhost:3000

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
saturway-backend/
├── src/
│   ├── config/           # Configuration management
│   │   └── index.ts      # Environment variables & config
│   ├── controllers/      # Route controllers
│   │   └── authController.ts
│   ├── db/               # Database layer
│   │   ├── index.ts      # Database connection
│   │   └── schema.ts     # Drizzle ORM schema
│   ├── middleware/       # Express/Fastify middleware
│   │   ├── auth.ts       # JWT authentication
│   │   └── errorHandler.ts
│   ├── routes/           # API routes
│   │   └── index.ts      # Route registration
│   ├── services/         # Business logic layer
│   │   ├── aiService.ts  # AI operations (Claude/OpenAI)
│   │   ├── cacheService.ts # Redis caching
│   │   ├── moodService.ts  # Mood tracking
│   │   ├── taskService.ts  # Task management
│   │   └── userService.ts  # User operations
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Shared types & interfaces
│   ├── utils/            # Utility functions
│   │   └── telegram.ts   # Telegram WebApp validation
│   └── server.ts         # Main server file
├── drizzle/              # Database migrations
├── .env.example          # Environment variables template
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## 🔧 Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/saturway
JWT_SECRET=your-secret-key-min-32-chars
TELEGRAM_BOT_TOKEN=your-bot-token
ANTHROPIC_API_KEY=your-anthropic-key
```

### Optional Variables

```env
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://yourdomain.com
```

## 📡 API Endpoints

### Authentication

- `POST /api/auth` - Authenticate with Telegram WebApp data

### User

- `GET /api/user/me` - Get current user
- `GET /api/user/stats` - Get user statistics

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task by ID
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Mark task as completed

### Mood Tracking

- `POST /api/mood/log` - Log mood entry
- `GET /api/mood/logs` - Get mood logs
- `GET /api/mood/stats` - Get mood statistics

### AI

- `POST /api/ai/optimize-schedule` - AI schedule optimization
- `GET /api/ai/insights` - Get AI insights
- `POST /api/ai/suggestions` - Get task suggestions

### Health

- `GET /health` - Server health check

## 🏗️ Architecture

### Layer Structure

```
┌─────────────────────────────────┐
│   Routes (API Endpoints)        │
├─────────────────────────────────┤
│   Controllers (Request Handling)│
├─────────────────────────────────┤
│   Services (Business Logic)     │
├─────────────────────────────────┤
│   Database (Drizzle ORM)        │
└─────────────────────────────────┘
```

### Key Features

- **Type-Safe**: Full TypeScript coverage with strict mode
- **Validation**: Zod schema validation for all inputs
- **Authentication**: JWT with Telegram WebApp validation
- **Caching**: Redis-based caching for AI responses
- **Error Handling**: Global error handler with custom error types
- **Logging**: Structured logging with Pino
- **Security**: Helmet, CORS, rate limiting
- **Scalable**: Service-based architecture

## 🛠️ Development

### Database Management

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio (GUI)
npm run db:studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npx tsc --noEmit
```

## 🔐 Security

### Telegram WebApp Validation

All requests must include valid Telegram WebApp `initData` for authentication.

```typescript
// Example: Validate Telegram data
const isValid = validateTelegramWebAppData(initData);
```

### JWT Authentication

Protected routes require JWT token in Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Rate Limiting

Default: 100 requests per minute per IP. Configure in `.env`:

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Deployment

### Using PM2

```bash
# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name saturway-backend

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

### Docker (Coming Soon)

```bash
docker build -t saturway-backend .
docker run -p 3000:3000 --env-file .env saturway-backend
```

### Environment-Specific Config

```bash
# Production
NODE_ENV=production npm start

# Development
NODE_ENV=development npm run dev
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "environment": "production"
}
```

### Logs

Logs are output to console with different levels:

- `error` - Critical errors
- `warn` - Warnings
- `info` - General information
- `debug` - Debug information

Set log level in `.env`:
```env
LOG_LEVEL=info
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

ISC License

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U saturway_user -d saturway -h localhost
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourrepo/saturway-backend/issues)
- Telegram: @yourusername

---

Made with ❤️ for Saturway - AI-Powered Productivity
