# MVP Tracker - Трекер MVP

**Описание:** Агент для отслеживания прогресса доведения проекта Saturway до MVP и предотвращения отклонения от цели.

## Определение MVP для Saturway

### Минимальный набор функций (MUST HAVE):

**Frontend (Telegram Mini App):**
- ✅ Авторизация через Telegram
- ✅ Список задач (CRUD)
- ✅ Mood tracker (энергия + фокус)
- ✅ AI insights базовые
- ⏳ Форма создания задач
- ⏳ Календарь с задачами
- ⏳ Аналитика настроения

**Backend:**
- ⏳ REST API endpoints
- ⏳ PostgreSQL database
- ⏳ Telegram Bot integration
- ⏳ AI Gateway (Claude/OpenAI)
- ⏳ JWT authentication

**Integration:**
- ⏳ Frontend ↔ Backend API
- ⏳ Telegram WebApp validation
- ⏳ AI рекомендации (реальные)

**Deployment:**
- ⏳ VPS setup или Vercel/Railway
- ⏳ Database hosted
- ⏳ SSL сертификаты
- ⏳ Environment variables

### НЕ ВКЛЮЧАЕТСЯ в MVP (можно потом):

❌ Сложная аналитика с графиками
❌ Экспорт данных
❌ Notifications через email
❌ Интеграция с календарями (Google, etc)
❌ Collaborative features
❌ Платежи
❌ Темная тема (nice to have, но не критично)

## Прогресс трекинг

### Чеклист MVP:

```markdown
## FRONTEND (70% готово)
- [x] Header компонент
- [x] Quick Actions
- [x] Mood Tracker
- [x] Task List component
- [x] AI Insights display
- [x] Basic UI/UX
- [ ] Task Form (в процессе)
- [ ] Calendar integration
- [ ] API integration
- [ ] Error handling
- [ ] Loading states

## BACKEND (0% готово)
- [ ] Server setup (Fastify)
- [ ] Database schema
- [ ] User authentication
- [ ] Tasks CRUD endpoints
- [ ] Mood logging endpoints
- [ ] AI Gateway setup
- [ ] Telegram Bot setup
- [ ] Error handling & validation

## DATABASE (0% готово)
- [ ] PostgreSQL setup
- [ ] Users table
- [ ] Tasks table
- [ ] Mood_logs table
- [ ] AI_conversations table (cache)
- [ ] Indexes
- [ ] Migrations

## INTEGRATION (0% готово)
- [ ] Frontend API client
- [ ] Telegram auth flow
- [ ] Real AI responses
- [ ] WebSocket (optional для MVP)

## DEPLOYMENT (0% готово)
- [ ] Backend hosting
- [ ] Database hosting
- [ ] Frontend build & deploy
- [ ] Domain & SSL
- [ ] Environment setup
- [ ] Telegram Bot registration

## TESTING (0% готово)
- [ ] Manual testing всех функций
- [ ] Telegram Mini App тестирование
- [ ] 5-10 бета тестеров
```

## Приоритизация задач

### Критический путь к MVP (по порядку):

1. **Backend Foundation** (День 1-2)
   - Server structure
   - Database schema
   - Basic endpoints

2. **Frontend-Backend Connection** (День 2-3)
   - API client
   - Authentication flow
   - Task CRUD работает end-to-end

3. **Telegram Integration** (День 3-4)
   - Bot setup
   - WebApp validation
   - Real user data

4. **AI Features** (День 4-5)
   - AI Gateway
   - Real recommendations
   - Cache система

5. **Deployment** (День 5-6)
   - VPS или cloud
   - Production build
   - Testing

6. **Beta Testing** (День 6-7)
   - Bug fixes
   - UX improvements
   - Ready for real users

## Сигналы отклонения от MVP

⚠️ **STOP если:**
- Добавляешь функции не из MUST HAVE списка
- Тратишь > 2 часов на "украшательства"
- Делаешь преждевременную оптимизацию
- Пишешь перфектный код вместо рабочего
- Добавляешь библиотеки "на всякий случай"

## Оценка готовности

```python
def mvp_readiness():
    frontend = 70  # % готовности
    backend = 0
    integration = 0
    deployment = 0

    total = (frontend + backend + integration + deployment) / 4

    if total >= 80:
        return "🚀 READY FOR BETA"
    elif total >= 60:
        return "⚡ ALMOST THERE"
    elif total >= 40:
        return "🔨 IN PROGRESS"
    else:
        return "🌱 EARLY STAGE"
```

**Текущий статус: 🔨 IN PROGRESS (17.5%)**

## Ежедневный отчет

В конце каждой сессии:

```markdown
# MVP Progress Report - [Дата]

## Сегодня сделано:
- [задача 1]
- [задача 2]

## MVP completion:
- Frontend: X%
- Backend: X%
- Integration: X%
- Deployment: X%
- **Total: X%**

## Blockers:
- [что мешает]

## Tomorrow план:
1. [приоритет 1]
2. [приоритет 2]

## ETA to MVP:
[X] дней при текущем темпе
```

## Действия агента

1. **Проверяй** что каждая задача из критического пути
2. **Предупреждай** если начинается feature creep
3. **Напоминай** о приоритетах
4. **Считай** процент готовности
5. **Блокируй** не-MVP задачи пока MVP не готов

## Использование

Запускай этот skill:
- В начале каждой рабочей сессии
- Перед планированием новых задач
- Когда кажется что проект "почти готов"
- При появлении желания добавить "еще одну фичу"

Команда:
```
Запусти mvp-tracker чтобы проверить прогресс
```
