import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Circle, CheckCircle2 } from 'lucide-react';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { useStore } from '../store';
import { formatLocalDate } from '../lib/dateUtils';

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const tasks = useStore((state) => state.tasks) || [];

  const getTasksForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = formatLocalDate(new Date(task.dueDate));
      return taskDate === dateStr;
    });
  };

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Days to show from previous month
    const startPadding = firstDay.getDay();
    // Days to show from next month
    const endPadding = 6 - lastDay.getDay();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      tasks: typeof tasks;
    }> = [];

    // Previous month days
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, tasks: getTasksForDate(date) });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true, tasks: getTasksForDate(date) });
    }

    // Next month days
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, tasks: getTasksForDate(date) });
    }

    return days;
  }, [currentDate, tasks]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-6">
      <GradientHeader
        title="Календарь задач"
        subtitle="Планируйте свои задачи"
        icon={<Calendar className="h-6 w-6" />}
        variant="ocean"
      />

      <AnimatedOceanCard delay={0.1}>
        <div className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <motion.button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>

            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>

            <motion.button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Days of Week */}
          <div
            className="grid grid-cols-7 gap-2 mb-2"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px', marginBottom: '8px' }}
          >
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            className="grid grid-cols-7 gap-2"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}
          >
            {calendarDays.map((day, index) => {
              const tasksForDay = day.tasks;
              const completedCount = tasksForDay.filter(t => t.status === 'completed').length;
              const hasActiveTasks = tasksForDay.some(t => t.status !== 'completed');

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`
                    relative rounded-lg border p-1 flex flex-col items-center justify-center
                    ${day.isCurrentMonth ? 'border-border/50' : 'border-transparent'}
                    ${isToday(day.date) ? 'bg-[#4A9FD8]/10 border-[#4A9FD8]' : ''}
                    ${day.isCurrentMonth ? '' : 'opacity-40'}
                  `}
                  style={{
                    aspectRatio: '1',
                    minHeight: '40px',
                    position: 'relative'
                  }}
                >
                  <span className={`text-xs font-medium ${isToday(day.date) ? 'text-[#4A9FD8]' : ''}`}>
                    {day.date.getDate()}
                  </span>

                  {tasksForDay.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {hasActiveTasks && (
                        <Circle className="h-2 w-2 fill-[#4A9FD8] text-[#4A9FD8]" />
                      )}
                      {completedCount > 0 && (
                        <CheckCircle2 className="h-2 w-2 fill-green-500 text-green-500" />
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 justify-center text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 fill-[#4A9FD8] text-[#4A9FD8]" />
              <span>Активная</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 fill-green-500 text-green-500" />
              <span>Выполнена</span>
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Today's Tasks */}
      <AnimatedOceanCard delay={0.2}>
        <div className="p-6">
          <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: 600 }}>
            Задачи на сегодня
          </h3>
          {getTasksForDate(new Date()).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Нет задач на сегодня
            </p>
          ) : (
            <div className="space-y-2">
              {getTasksForDate(new Date()).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedOceanCard>
    </div>
  );
}
