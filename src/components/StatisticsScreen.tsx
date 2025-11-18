import { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Calendar, Flame, Target } from 'lucide-react';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { Progress } from './ui/progress';
import { useStore } from '../store';
import { useLanguage } from './LanguageContext';

export function StatisticsScreen() {
  const { t } = useLanguage();
  const tasks = useStore((state) => state.tasks) || [];

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Priority distribution
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const mediumPriority = tasks.filter(t => t.priority === 'medium').length;
    const lowPriority = tasks.filter(t => t.priority === 'low').length;

    // Calculate streak (simplified - based on completed tasks)
    const currentStreak = completed > 0 ? Math.min(completed, 7) : 0;

    return {
      total,
      completed,
      active: total - completed,
      completionRate,
      highPriority,
      mediumPriority,
      lowPriority,
      currentStreak,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <GradientHeader
        title="Статистика"
        subtitle="Ваша продуктивность"
        icon={<TrendingUp className="h-6 w-6" />}
        variant="ocean"
      />

      {/* Completion Rate */}
      <AnimatedOceanCard delay={0.1}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#4A9FD8]" />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                Процент выполнения
              </h3>
            </div>
            <span className="text-2xl font-bold text-[#4A9FD8]">
              {stats.completionRate}%
            </span>
          </div>
          <Progress value={stats.completionRate} className="h-3" />
          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>{stats.completed} выполнено</span>
            <span>{stats.active} активных</span>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Current Streak */}
      <AnimatedOceanCard delay={0.2}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500">
              <Flame className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm">Текущая серия</p>
              <p className="text-3xl font-bold">{stats.currentStreak} дней</p>
              <p className="text-xs text-muted-foreground mt-1">
                Продолжайте в том же духе!
              </p>
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Priority Distribution */}
      <AnimatedOceanCard delay={0.3}>
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
            <CheckCircle2 className="h-5 w-5 text-[#4A9FD8]" />
            Распределение по приоритетам
          </h3>

          <div className="space-y-4">
            {/* High Priority */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-600 font-medium">Высокий</span>
                <span className="text-muted-foreground">{stats.highPriority}</span>
              </div>
              <Progress
                value={stats.total > 0 ? (stats.highPriority / stats.total) * 100 : 0}
                className="h-2 [&>div]:bg-red-500"
              />
            </div>

            {/* Medium Priority */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-yellow-600 font-medium">Средний</span>
                <span className="text-muted-foreground">{stats.mediumPriority}</span>
              </div>
              <Progress
                value={stats.total > 0 ? (stats.mediumPriority / stats.total) * 100 : 0}
                className="h-2 [&>div]:bg-yellow-500"
              />
            </div>

            {/* Low Priority */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-600 font-medium">Низкий</span>
                <span className="text-muted-foreground">{stats.lowPriority}</span>
              </div>
              <Progress
                value={stats.total > 0 ? (stats.lowPriority / stats.total) * 100 : 0}
                className="h-2 [&>div]:bg-blue-500"
              />
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatedOceanCard delay={0.4}>
          <div className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-[#4A9FD8]" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Всего задач</p>
          </div>
        </AnimatedOceanCard>

        <AnimatedOceanCard delay={0.5}>
          <div className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Завершено</p>
          </div>
        </AnimatedOceanCard>
      </div>

      {/* Motivational Message */}
      {stats.completionRate >= 70 && (
        <AnimatedOceanCard delay={0.6}>
          <div className="p-6 bg-gradient-to-r from-[#4A9FD8]/10 to-[#52C9C1]/10">
            <p className="text-center text-sm font-medium">
              🎉 Отличная работа! Вы на правильном пути!
            </p>
          </div>
        </AnimatedOceanCard>
      )}
    </div>
  );
}
