# Emergency Recovery - Экстренное Восстановление

**Описание:** Агент для восстановления работы после сбоев, потери контекста или критических ошибок.

## Когда использовать

🚨 **EMERGENCY активируй когда:**
- Потерян контекст разговора
- Проект не собирается
- Критические ошибки появились внезапно
- Git в конфликтном состоянии
- База данных недоступна
- Не помнишь что делал последним

## Протокол восстановления

### Шаг 1: Оценка ситуации (2 минуты)

```bash
# Быстрая диагностика
echo "=== PROJECT HEALTH CHECK ==="

# 1. Где мы?
pwd

# 2. Git status
git status
git log --oneline -5

# 3. Что изменилось
git diff --stat

# 4. Можно ли собрать?
cd saturway-app && npm run build
cd ../saturway-backend && npm run build 2>/dev/null || echo "Backend build not configured"

# 5. Зависимости
npm list --depth=0
```

**Запиши результаты.**

### Шаг 2: Восстановление контекста

**Читай в этом порядке:**

1. **`.claude/context.md`** - Текущее состояние проекта
2. **`ТЗ.txt`** - Исходное задание
3. **`README.md`** - Документация
4. **`.claude/skills/mvp-tracker.md`** - Что нужно для MVP
5. **Git log** - Последние изменения

```bash
# Быстрый обзор контекста
cat .claude/context.md 2>/dev/null || echo "No context file"
git log --oneline -10
git diff HEAD~1 --stat
```

### Шаг 3: Восстановление работоспособности

**Типичные проблемы и решения:**

#### 🔴 Problem: Build fails

```bash
# Solution
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 🔴 Problem: TypeScript errors

```bash
# Check
npx tsc --noEmit

# Common fixes:
# 1. Missing types
npm install --save-dev @types/node @types/react @types/react-dom

# 2. Wrong imports
# Fix imports: change .js to .ts/.tsx
# Fix paths: check tsconfig.json paths

# 3. Type conflicts
# Check package.json versions
```

#### 🔴 Problem: Git conflicts

```bash
# See conflicts
git status

# Option 1: Keep ours
git checkout --ours <file>
git add <file>

# Option 2: Keep theirs
git checkout --theirs <file>
git add <file>

# Option 3: Abort merge
git merge --abort
git rebase --abort

# Start fresh
git stash
git pull
git stash pop
```

#### 🔴 Problem: Database not accessible

```bash
# Check if running
psql -U postgres -c "SELECT version();"

# Start PostgreSQL
# Ubuntu/Debian:
sudo service postgresql start

# macOS:
brew services start postgresql

# Check connection
psql -h localhost -U saturway_user -d saturway
```

#### 🔴 Problem: Port already in use

```bash
# Find process
lsof -i :3000  # backend
lsof -i :5173  # vite

# Kill it
kill -9 <PID>

# Or change port in config
```

### Шаг 4: Восстановление данных

**Если данные потеряны:**

```sql
-- Проверка БД
\c saturway
\dt  -- list tables

-- Backup restoration (если есть)
psql saturway < backup.sql

-- Re-initialize with seed data
-- (run migration scripts)
```

**Если нет бэкапа:**
- Используй mock данные из `store.ts`
- Создай минимальный seed скрипт
- Начни с пустой БД

### Шаг 5: Создание чекпоинта

**ОБЯЗАТЕЛЬНО после восстановления:**

```bash
# Создай snapshot текущего состояния
cat > .claude/checkpoints/recovery-$(date +%Y%m%d-%H%M).md << 'EOF'
# Recovery Checkpoint

## Problem:
[Что случилось]

## Solution:
[Как исправили]

## Current State:
- Frontend: [status]
- Backend: [status]
- Database: [status]

## Working commands:
```bash
cd saturway-app && npm run dev
cd saturway-backend && npm run dev
```

## Next steps:
1. [что делать дальше]

## Don't forget:
- [важная информация]
EOF
```

### Шаг 6: Обновление контекста

```bash
# Update main context file
cat > .claude/context.md << 'EOF'
# SATURWAY PROJECT CONTEXT

## Current Status: [RECOVERED / IN PROGRESS / STABLE]

## Last Known Good State:
- Date: $(date)
- Commit: $(git rev-parse --short HEAD)
- Branch: $(git branch --show-current)

## Working Setup:
- Frontend running on: http://localhost:5173
- Backend running on: http://localhost:3000
- Database: localhost:5432/saturway

## Recent Issues:
[List any problems and solutions]

## Active Tasks:
1. [что делаем сейчас]

## Critical Files:
- saturway-app/src/store.ts
- saturway-app/src/App.tsx
- saturway-backend/server.js
- ТЗ.txt

## Environment:
See .env.example for required variables
EOF
```

## Recovery Procedures

### Full System Recovery

```bash
#!/bin/bash
# emergency-reset.sh

echo "🚨 EMERGENCY RECOVERY STARTING..."

# 1. Save current state
git stash save "emergency-backup-$(date +%s)"

# 2. Clean everything
rm -rf node_modules
rm -rf dist
rm -rf build

# 3. Reset to last good commit (if needed)
# git reset --hard HEAD~1

# 4. Fresh install
npm install

# 5. Rebuild
npm run build

# 6. Test
npm run dev

echo "✅ Recovery complete!"
```

### Partial Recovery

```bash
# Just fix dependencies
npm ci  # Clean install from lockfile

# Just fix build
rm -rf dist && npm run build

# Just fix types
rm -rf node_modules/@types && npm install
```

## Prevention Checklist

После восстановления, настрой:

```markdown
- [ ] Git hooks для проверки перед commit
- [ ] Automatic backups БД
- [ ] .claude/context.md регулярно обновляется
- [ ] Checkpoints каждые 2 часа работы
- [ ] README.md актуален
- [ ] .env.example существует
- [ ] package.json scripts работают
```

## Escalation Path

Если recovery не помогает:

1. **Level 1:** Попробуй другой подход
   - Другая версия Node.js
   - Другой package manager (npm → yarn)
   - Другой терминал/shell

2. **Level 2:** Изоляция проблемы
   - Создай минимальный repro
   - Протестируй на чистой системе
   - Проверь dependencies версии

3. **Level 3:** Откат
   - Восстанови из последнего working commit
   - Используй последний working backup
   - Начни подкомпонент заново

4. **Level 4:** Обратись к документации
   - GitHub Issues проекта
   - Stack Overflow
   - Official docs

## Emergency Contacts

```markdown
### Resources:
- Project docs: README.md
- Technical spec: ТЗ.txt
- Architecture: docs/architecture.md (если есть)

### Quick commands:
```bash
# Check everything
npm run lint && npm run type-check && npm run build

# Full reset
rm -rf node_modules && npm install && npm run build

# Database reset
psql -U postgres -c "DROP DATABASE saturway; CREATE DATABASE saturway;"
```

### Useful logs:
- Frontend: Browser console (F12)
- Backend: Terminal output
- Database: /var/log/postgresql/
- Git: git reflog (last 100 operations)
```

## Post-Recovery Actions

1. ✅ Verify everything works
2. ✅ Run all tests
3. ✅ Update documentation
4. ✅ Create backup
5. ✅ Commit changes
6. ✅ Update teammates (если есть)

## Usage

Автоматически при:
- Build failures
- Critical errors
- Lost context

Ручной вызов:
```
EMERGENCY! Запусти emergency-recovery
```

## Recovery Success Indicators

✅ **Recovered успешно если:**
- npm run build работает
- npm run dev запускается
- Git в чистом состоянии
- Понятно где мы и что дальше
- Создан новый checkpoint
- Контекст восстановлен

❌ **Нужна дополнительная помощь если:**
- Ошибки продолжаются
- Неясно что делать
- Потеряны критические данные
- Время восстановления > 30 минут
