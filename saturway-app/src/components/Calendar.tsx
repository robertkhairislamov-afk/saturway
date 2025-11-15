import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import WebApp from '@twa-dev/sdk';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { tasks, currentMood } = useStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksForSelectedDate = tasks.filter(task =>
    task.dueDate && isSameDay(task.dueDate, selectedDate)
  );

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleAISchedule = () => {
    const energy = currentMood.energy;
    const focus = currentMood.focus;

    let suggestion = '';
    if (energy > 7 && focus > 7) {
      suggestion = '🚀 Отличное время для сложных задач! Рекомендую:\n\n' +
        '09:00 - Позвонить инвестору\n' +
        '11:00 - Подготовить презентацию\n' +
        '14:00 - Code review\n' +
        '16:00 - Обновить документацию';
    } else if (energy < 5 || focus < 5) {
      suggestion = '😴 Энергия низкая. Рекомендую легкие задачи:\n\n' +
        '10:00 - Медитация 10 минут\n' +
        '11:00 - Обновить документацию\n' +
        '14:00 - Короткая прогулка\n' +
        '15:00 - Code review (простые задачи)';
    } else {
      suggestion = '⚡ Средний уровень энергии. Сбалансированный план:\n\n' +
        '09:00 - Code review\n' +
        '11:00 - Подготовить презентацию\n' +
        '13:00 - Перерыв\n' +
        '14:00 - Обновить документацию\n' +
        '16:00 - Позвонить инвестору';
    }

    WebApp.showPopup({
      title: 'AI Расписание',
      message: suggestion,
      buttons: [{ type: 'close' }]
    });
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>🗓️ Календарь</h3>
        <button className="ai-schedule-btn" onClick={handleAISchedule}>
          <Sparkles size={16} />
          <span>AI План</span>
        </button>
      </div>

      <div className="calendar-nav">
        <button onClick={prevMonth} className="nav-btn">
          <ChevronLeft size={20} />
        </button>
        <div className="current-month">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </div>
        <button onClick={nextMonth} className="nav-btn">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-days">
        {/* Пустые ячейки для выравнивания */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
        ))}

        {/* Дни месяца */}
        {daysInMonth.map((day) => {
          const hasTasks = tasks.some(task =>
            task.dueDate && isSameDay(task.dueDate, day)
          );
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <span className="day-number">{format(day, 'd')}</span>
              {hasTasks && <div className="day-indicator" />}
            </button>
          );
        })}
      </div>

      <div className="calendar-tasks">
        <h4>Задачи на {format(selectedDate, 'd MMMM', { locale: ru })}</h4>
        {tasksForSelectedDate.length === 0 ? (
          <p className="no-tasks">Нет задач на этот день</p>
        ) : (
          <div className="tasks-for-date">
            {tasksForSelectedDate.map((task) => (
              <div key={task.id} className="date-task">
                <span className="task-time">
                  {task.dueDate && format(task.dueDate, 'HH:mm')}
                </span>
                <span className="task-title">{task.title}</span>
                <span className={`task-badge priority-${task.priority}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
