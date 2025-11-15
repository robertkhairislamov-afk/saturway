# Code Quality - Контроль Качества Кода

**Описание:** Агент для проверки качества кода перед коммитом и предотвращения типичных ошибок.

## Автоматические проверки

### 1. TypeScript Проверки

**Обязательные правила:**
```typescript
// ❌ ПЛОХО - any типы
const data: any = fetchData();

// ✅ ХОРОШО - точные типы
interface TaskData {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
}
const data: TaskData = fetchData();

// ❌ ПЛОХО - неявные типы
function addTask(task) { ... }

// ✅ ХОРОШО - явные типы
function addTask(task: Omit<Task, 'id'>): void { ... }
```

**Проверяй:**
- Нет `any` типов (кроме обоснованных случаев)
- Все props имеют interface/type
- Нет неиспользуемых imports
- Нет @ts-ignore без комментария

### 2. React Best Practices

**Hooks:**
```typescript
// ❌ ПЛОХО - useEffect без зависимостей
useEffect(() => {
  loadData();
}, []); // loadData может измениться!

// ✅ ХОРОШО
useEffect(() => {
  loadData();
}, [loadData]);

// ❌ ПЛОХО - мутация state
const [tasks, setTasks] = useState([]);
tasks.push(newTask); // НИКОГДА!

// ✅ ХОРОШО
setTasks([...tasks, newTask]);
```

**Components:**
```typescript
// ❌ ПЛОХО - inline functions в render
<button onClick={() => handleClick(id)}>

// ✅ ХОРОШО - мемоизированная функция
const onClick = useCallback(() => handleClick(id), [id]);
<button onClick={onClick}>

// ❌ ПЛОХО - пропсы без типов
export function MyComponent(props) { ... }

// ✅ ХОРОШО
interface MyComponentProps {
  title: string;
  onClose: () => void;
}
export function MyComponent({ title, onClose }: MyComponentProps) { ... }
```

### 3. Security Проверки

**Проверяй на уязвимости:**

```typescript
// ❌ ОПАСНО - XSS уязвимость
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ БЕЗОПАСНО
<div>{sanitize(userInput)}</div>

// ❌ ОПАСНО - API ключи в коде
const API_KEY = "sk-proj-abc123...";

// ✅ БЕЗОПАСНО
const API_KEY = import.meta.env.VITE_API_KEY;

// ❌ ОПАСНО - SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ БЕЗОПАСНО - parameterized query
const query = 'SELECT * FROM users WHERE id = $1';
pool.query(query, [userId]);
```

**НИКОГДА не коммить:**
- API ключи
- Пароли
- Приватные токены
- `.env` файлы с реальными данными

### 4. Performance

**Проверяй на проблемы производительности:**

```typescript
// ❌ ПЛОХО - создание объектов в render
{tasks.map(task => (
  <TaskCard key={task.id} style={{ color: 'red' }} />
))}

// ✅ ХОРОШО - переиспользуй объекты
const cardStyle = { color: 'red' };
{tasks.map(task => (
  <TaskCard key={task.id} style={cardStyle} />
))}

// ❌ ПЛОХО - n+1 запросы
tasks.forEach(task => {
  const user = await fetchUser(task.userId); // BAD!
});

// ✅ ХОРОШО - batch запросы
const userIds = tasks.map(t => t.userId);
const users = await fetchUsers(userIds);
```

### 5. Code Style

**Консистентность:**
```typescript
// Выбери один стиль и придерживайся его:

// ✅ Именование
const getUserTasks = () => { ... }  // camelCase для функций
interface UserTask { ... }          // PascalCase для типов
const API_URL = "..."              // UPPER_CASE для констант

// ✅ Структура файлов
MyComponent.tsx
  ├─ imports (сгруппированы)
  ├─ types/interfaces
  ├─ component
  └─ export

// ✅ Комментарии (только когда нужно)
// ПЛОХО: Инкрементируем счетчик
count++;

// ХОРОШО: Используем UTC для корректного сравнения часовых поясов
const now = new Date().toUTCString();
```

### 6. Error Handling

**Всегда обрабатывай ошибки:**

```typescript
// ❌ ПЛОХО
const data = await fetch('/api/tasks');
setTasks(data); // Что если ошибка?

// ✅ ХОРОШО
try {
  const data = await fetch('/api/tasks');
  setTasks(data);
} catch (error) {
  console.error('Failed to load tasks:', error);
  WebApp.showAlert('Ошибка загрузки задач');
}

// ✅ ЕЩЕ ЛУЧШЕ - error boundaries для React
class ErrorBoundary extends Component {
  componentDidCatch(error, info) {
    logError(error, info);
  }
}
```

### 7. Доступность (a11y)

**Базовые требования:**

```typescript
// ❌ ПЛОХО
<div onClick={handleClick}>Click me</div>

// ✅ ХОРОШО
<button onClick={handleClick} aria-label="Add task">
  Click me
</button>

// ✅ Клавиатурная навигация
<input
  onKeyDown={(e) => e.key === 'Enter' && submit()}
  aria-required="true"
/>
```

## Чеклист перед коммитом

```markdown
### Pre-commit Checklist

**Code Quality:**
- [ ] Нет console.log (или обоснован)
- [ ] Нет закомментированного кода
- [ ] Нет TODO без тикета/issue
- [ ] Нет дублирования кода
- [ ] Функции < 50 строк
- [ ] Файлы < 300 строк

**Types:**
- [ ] Нет any без причины
- [ ] Все props типизированы
- [ ] Нет type assertions без причины

**Testing:**
- [ ] Код работает локально
- [ ] npm run build проходит
- [ ] npm run lint проходит
- [ ] Протестирован вручную

**Security:**
- [ ] Нет хардкоженных секретов
- [ ] Нет SQL injection рисков
- [ ] Нет XSS уязвимостей
- [ ] Input validation есть

**Performance:**
- [ ] Нет лишних re-renders
- [ ] Оптимизированы тяжелые операции
- [ ] Lazy loading где нужно

**Documentation:**
- [ ] Сложная логика прокомментирована
- [ ] README обновлен если нужно
- [ ] API changes документированы
```

## Автоматизация проверок

### ESLint Rules

```json
{
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/prop-types": "off"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running code quality checks..."

# TypeScript check
npm run type-check || exit 1

# Lint
npm run lint || exit 1

# Format check
npm run format:check || exit 1

echo "✅ All checks passed!"
```

## Быстрые исправления

### Частые проблемы:

**1. Unused imports**
```bash
# Auto-remove
npm run lint -- --fix
```

**2. Type errors**
```bash
# Check что сломано
npx tsc --noEmit
```

**3. Format issues**
```bash
# Auto-format
npx prettier --write .
```

## Code Review Guidelines

При проверке кода задавай себе:

1. **Читаемость:** Понятно ли что делает код?
2. **Простота:** Нет ли overengineering?
3. **DRY:** Нет ли дублирования?
4. **Безопасность:** Нет ли уязвимостей?
5. **Тесты:** Можно ли это протестировать?
6. **Документация:** Нужны ли комментарии?

## Использование

Запускай автоматически:
- Перед каждым git commit
- После завершения фичи
- При pull request

Ручной запуск:
```
Запусти code-quality для проверки кода
```

## Метрики качества

**Хороший код имеет:**
- Type coverage > 95%
- Lint errors = 0
- Code duplication < 5%
- Function complexity < 10
- Test coverage > 70% (для важного кода)

**Плохие сигналы:**
- Много any типов
- Большие файлы (>500 строк)
- Глубокая вложенность (>3 уровня)
- Магические числа
- Глобальные переменные
