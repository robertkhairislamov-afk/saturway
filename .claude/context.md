# SATURWAY PROJECT - ТЕКУЩИЙ КОНТЕКСТ

**Последнее обновление:** 3 ноября 2025
**Статус проекта:** 🔨 IN PROGRESS - MVP Development

---

## 🎯 ЦЕЛЬ ПРОЕКТА

Saturway - AI-powered органайзер как Telegram Mini App для оптимизации продуктивности с учетом энергии и фокуса пользователя.

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### Frontend (Saturway-app) - 75% готов
- ✅ React 19 + TypeScript + Vite
- ✅ Telegram UI Kit интегрирован
- ✅ Zustand state management
- ✅ Компоненты созданы:
  - Header (приветствие)
  - QuickActions (быстрые действия)
  - TaskList (список задач с CRUD)
  - MoodTracker (энергия + фокус)
  - AIInsights (показ рекомендаций)
  - TaskForm (создание задач) - ✅ ТОЛЬКО ЧТО ДОБАВЛЕНО
  - AddTaskForm - ✅ альтернативная форма
  - Calendar - ✅ календарь задач
  - MoodAnalytics - ✅ аналитика настроения
  - ThemeToggle - ✅ переключатель темы

**Расположение:** `C:\321\saturway-app\`

**Запуск:**
```bash
cd saturway-app
npm install
npm run dev
# Откроется на http://localhost:5173
```

### Backend (Saturway-backend) - 5% готов
- ⏳ Папка создана
- ⏳ package.json инициализирован
- ❌ Зависимости не установлены (прервано пользователем)
- ❌ Server code не написан
- ❌ Database не настроена

**Расположение:** `C:\321\saturway-backend\`

**Планируемый стек:**
- Fastify (веб-сервер)
- PostgreSQL (база данных)
- Drizzle ORM
- JWT auth
- OpenAI/Claude API

### Database - 0% готов
- ❌ PostgreSQL не установлен
- ❌ Схема не создана
- ❌ Миграции нет

**Планируемые таблицы:**
- users (telegram_id, username, settings)
- tasks (title, priority, status, due_date, ai_metadata)
- mood_logs (energy, focus, timestamp)
- ai_conversations (кэш AI ответов)

---

## 🛠️ SKILLS АГЕНТЫ - ✅ СОЗДАНЫ

Созданы 5 skills для контроля качества:

1. **project-validator** - валидация проекта
2. **context-manager** - управление контекстом
3. **mvp-tracker** - отслеживание прогресса MVP
4. **code-quality** - проверка качества кода
5. **emergency-recovery** - восстановление после сбоев

**Расположение:** `C:\321\.claude\skills\`

**Использование:**
```
Запусти project-validator для проверки проекта
Запусти context-manager для сохранения контекста
Запусти mvp-tracker для проверки MVP прогресса
Запусти code-quality перед коммитом
Запусти emergency-recovery при критических ошибках
```

---

## 📋 MVP ЧЕКЛИСТ

### MUST HAVE для MVP:

**Frontend:**
- [x] UI компоненты базовые
- [x] Task CRUD (локально)
- [x] Mood tracking UI
- [x] Task creation form
- [x] Calendar view
- [x] Analytics view
- [ ] API integration
- [ ] Real Telegram auth
- [ ] Error handling
- [ ] Loading states

**Backend:**
- [ ] Fastify server setup
- [ ] PostgreSQL connection
- [ ] REST API endpoints:
  - [ ] POST /api/auth (Telegram login)
  - [ ] GET /api/tasks
  - [ ] POST /api/tasks
  - [ ] PUT /api/tasks/:id
  - [ ] DELETE /api/tasks/:id
  - [ ] POST /api/mood
  - [ ] GET /api/ai/insights
- [ ] Telegram Bot setup
- [ ] AI Gateway (Claude/OpenAI)
- [ ] JWT authentication

**Integration:**
- [ ] Frontend ↔ Backend API calls
- [ ] Telegram WebApp validation
- [ ] Real AI recommendations
- [ ] Data persistence

**Deployment:**
- [ ] Backend hosting (VPS/Railway/Render)
- [ ] Database hosting (Supabase/Neon/VPS)
- [ ] Frontend deploy (Vercel/Netlify)
- [ ] SSL certificates
- [ ] Environment variables
- [ ] Telegram Bot registration

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ (ПРИОРИТЕТ)

### Немедленно (Next 2-4 hours):

1. **Backend Setup:**
   ```bash
   cd saturway-backend
   npm install fastify @fastify/cors @fastify/helmet @fastify/jwt pg drizzle-orm
   npm install node-telegram-bot-api openai @anthropic-ai/sdk ioredis zod dotenv
   ```

2. **Create server.js:**
   - Basic Fastify setup
   - CORS for Telegram
   - Health check endpoint

3. **Database Schema:**
   - Create SQL migration
   - Setup tables
   - Add indexes

4. **Basic Endpoints:**
   - POST /api/auth
   - GET /api/tasks
   - POST /api/tasks

### Скоро (Next 1-2 days):

5. **Frontend API Integration:**
   - Create API client
   - Connect TaskList to real API
   - Add error handling

6. **Telegram Integration:**
   - Register Bot with BotFather
   - Setup Telegram WebApp
   - Validate init data

7. **AI Features:**
   - Setup AI Gateway
   - Generate real insights
   - Cache responses

### Позже (Before MVP):

8. **Testing & Polish:**
   - Manual testing all features
   - Bug fixes
   - UX improvements

9. **Deployment:**
   - Deploy backend
   - Deploy frontend
   - Setup production DB

10. **Beta Testing:**
    - 5-10 test users
    - Collect feedback
    - Iterate

---

## 💡 ВАЖНЫЕ РЕШЕНИЯ

1. **State Management:** Zustand (легче Redux, достаточно для MVP)
2. **Backend:** Fastify (быстрее Express)
3. **ORM:** Drizzle (type-safe, легковесный)
4. **AI:** Hybrid Claude (умный) + GPT-4o-mini (дешевый)
5. **Hosting:** Пока решается, варианты:
   - VPS (Hetzner €5/мес)
   - Railway (free tier → $5/мес)
   - Render (free tier)

---

## 🔑 КЛЮЧЕВЫЕ ФАЙЛЫ

### Frontend:
- `saturway-app/src/App.tsx` - Main component
- `saturway-app/src/store.ts` - State management
- `saturway-app/src/components/` - All components
- `saturway-app/src/App.css` - Global styles

### Backend (когда создадим):
- `saturway-backend/server.js` - Main server
- `saturway-backend/.env` - Environment variables
- `saturway-backend/db/schema.sql` - Database schema

### Документация:
- `ТЗ.txt` - Полное техническое задание
- `.claude/skills/` - Агенты для контроля
- `.claude/context.md` - Этот файл

---

## 🐛 ИЗВЕСТНЫЕ ПРОБЛЕМЫ

1. **Backend не запущен** - прервана установка зависимостей
   - Solution: Завершить npm install

2. **No real API** - Frontend работает с mock данными
   - Solution: Создать backend endpoints

3. **No Telegram Bot** - Используется mock Telegram API
   - Solution: Зарегистрировать бота через @BotFather

---

## 📝 КОМАНДЫ ДЛЯ БЫСТРОГО СТАРТА

```bash
# Frontend
cd C:\321\saturway-app
npm install
npm run dev
# → http://localhost:5173

# Backend (когда будет готов)
cd C:\321\saturway-backend
npm install
cp .env.example .env  # и заполнить переменные
npm run dev
# → http://localhost:3000

# Database (локальная установка PostgreSQL)
psql -U postgres
CREATE DATABASE saturway;
CREATE USER saturway_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE saturway TO saturway_user;
```

---

## 🎓 КОНТЕКСТ ДЛЯ AI

**Когда контекст потерян, прочитай:**
1. Этот файл (.claude/context.md)
2. ТЗ.txt (полное задание)
3. .claude/skills/mvp-tracker.md (что нужно для MVP)
4. README.md проектов

**Текущая задача:** Создание backend сервера с API endpoints

**После восстановления контекста:**
- Проверь статус с `mvp-tracker`
- Запусти `project-validator` для проверки
- Продолжай с "Следующие шаги"

---

## 📊 MVP ПРОГРЕСС

**Общий прогресс:** ~22% до MVP

- Frontend: 75%
- Backend: 5%
- Database: 0%
- Integration: 0%
- Deployment: 0%

**Estimated time to MVP:** 3-5 дней активной работы

---

**🔄 Этот файл обновляется автоматически при значительных изменениях проекта**
