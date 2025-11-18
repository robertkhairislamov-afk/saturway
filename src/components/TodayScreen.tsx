import { useState, useMemo, useCallback } from 'react';
import { Plus, Lightbulb, Circle, CheckCircle2, Battery, Moon, BatteryLow, BatteryMedium, BatteryFull, Zap } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { RippleButton } from './RippleButton';
import { Input } from './ui/input';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { EmptyState } from './EmptyState';
import { HabitChallenge } from './HabitChallenge';
import { StreakBadge } from './StreakBadge';
import { CreateTaskModal } from './CreateTaskModal';
import { useStore } from '../store';

interface TodayScreenProps {
  userName?: string;
  onNavigate?: (view: string) => void;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

// Battery levels constants
const BATTERY_LEVELS = [20, 40, 60, 80, 100] as const;
type BatteryLevel = (typeof BATTERY_LEVELS)[number];

export function TodayScreen({ userName = 'Alex', onNavigate }: TodayScreenProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get data from store
  const storeTasks = useStore((state) => state.tasks) || [];
  const completeTask = useStore((state) => state.completeTask);

  // Energy state
  const energyAvgToday = useStore((state) => state.energyAvgToday);
  const energyLastToday = useStore((state) => state.energyLastToday);
  const addEnergyLog = useStore((state) => state.addEnergyLog);

  // Map store tasks to component format - ONLY TODAY'S TASKS
  const tasks: Task[] = useMemo(() => {
    const safeTasks = Array.isArray(storeTasks) ? storeTasks : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return safeTasks
      .filter(task => {
        // Filter tasks due today OR tasks without due date
        if (!task.dueDate) return true; // Show tasks without date
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < tomorrow;
      })
      .slice(0, 10) // Limit to 10 tasks
      .map(task => ({
        id: task.id,
        title: task.title,
        completed: task.status === 'completed',
      }));
  }, [storeTasks]);

  const toggleTask = useCallback(async (id: string) => {
    try {
      await completeTask(id);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [completeTask]);

  const handleBatteryClick = useCallback(async (value: BatteryLevel) => {
    try {
      await addEnergyLog(value, 'today');
    } catch (error) {
      console.error('Failed to log energy:', error);
    }
  }, [addEnergyLog]);

  const completedTasks = useMemo(() => {
    const safeTasks = Array.isArray(storeTasks) ? storeTasks : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return safeTasks.filter(task => {
      // Only count completed tasks that are due today
      if (task.status !== 'completed') return false;
      if (!task.dueDate) return true; // Count tasks without date
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    }).length;
  }, [storeTasks]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('today.goodMorning');
    if (hour < 18) return t('today.goodAfternoon');
    return t('today.goodEvening');
  }, [t]);

  const energyLevels = useMemo(() => [
    { value: 20, icon: Moon, label: t('today.energy.tired'), color: '#94a3b8' },
    { value: 40, icon: BatteryLow, label: t('today.energy.low'), color: '#64748b' },
    { value: 60, icon: BatteryMedium, label: t('today.energy.okay'), color: '#4A9FD8' },
    { value: 80, icon: BatteryFull, label: t('today.energy.good'), color: '#52C9C1' },
    { value: 100, icon: Zap, label: t('today.energy.great'), color: '#5AB5E8' },
  ], [t]);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <GradientHeader
        title={`${getGreeting()}, ${userName}!`}
        subtitle={t('today.subtitle')}
        variant="ocean"
      />

      {/* Streak Badge */}
      <div className="flex justify-center">
        <StreakBadge streak={3} type="tasks" />
      </div>

      {/* Tasks Summary Card */}
      <AnimatedOceanCard delay={0.1}>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {t('today.tasksToday')}
              </h3>
              <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                {tasks.length === 0
                  ? t('today.noTasks')
                  : `${t('today.tasksToday')}: ${tasks.length} (${t('today.completed')}: ${completedTasks})`
                }
              </p>
            </div>
            <div className="rounded-full bg-[#4A9FD8]/10 p-3">
              <Circle className="h-6 w-6 text-[#4A9FD8]" />
            </div>
          </div>
          {tasks.length > 0 && (
            <Progress value={(completedTasks / tasks.length) * 100} className="h-2" />
          )}
        </div>
      </AnimatedOceanCard>

      {/* Add Task Button */}
      <AnimatedOceanCard delay={0.15}>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="w-full p-4 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="rounded-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] p-2">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: 500 }}>
            {t('today.addTaskPlaceholder')}
          </span>
        </motion.button>
      </AnimatedOceanCard>

      {/* Create Task Modal */}
      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Energy Tracker Card */}
      <AnimatedOceanCard delay={0.2}>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#52C9C1]/10 p-2">
              <Battery className="h-5 w-5 text-[#52C9C1]" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {t('today.energyNow')}
            </h3>
          </div>
          <p className="mb-4 text-muted-foreground" style={{ fontSize: '14px' }}>
            {energyAvgToday !== null
              ? `${t('today.avgEnergy')}: ${energyAvgToday}% | ${t('today.currentEnergy')}: ${energyLastToday || '-'}%`
              : t('today.trackEnergyPrompt')
            }
          </p>
          <div className="flex justify-between gap-2">
            {energyLevels.map((level) => (
              <motion.button
                key={level.value}
                onClick={() => handleBatteryClick(level.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                  energyLastToday === level.value
                    ? 'border-[#4A9FD8] bg-[#4A9FD8]/10'
                    : 'border-border/50 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <level.icon className="h-5 w-5" style={{ color: level.color }} />
                <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                  {level.value}%
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </AnimatedOceanCard>

      {/* AI Tip Card */}
      <AnimatedOceanCard delay={0.25}>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <motion.div
              className="rounded-lg bg-[#FFD93D]/10 p-2"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Lightbulb className="h-5 w-5 text-[#FFD93D]" />
            </motion.div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {t('today.aiTip')}
            </h3>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600 }} className="mb-2">
            {t('today.tipTitle')}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
            {t('today.tipContent')}
          </p>
        </div>
      </AnimatedOceanCard>

      {/* Habit Challenge */}
      <HabitChallenge onNavigate={onNavigate} />

      {/* Nearest Tasks */}
      <div>
        <h3 className="mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
          {t('today.nearestTasks')}
        </h3>
        {tasks.length === 0 ? (
          <EmptyState
            illustration="tasks"
            title={t('today.noTasksTitle')}
            description={t('today.noTasksDesc')}
            actionLabel={t('today.createFirstTask')}
            onAction={() => onNavigate?.('tasks')}
          />
        ) : (
          <AnimatedOceanCard delay={0.3}>
            <div className="divide-y divide-border/50">
              {tasks.slice(0, 4).map((task, index) => (
                <motion.div
                  key={task.id}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <motion.button
                    onClick={() => toggleTask(task.id)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-[#4A9FD8]" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </motion.button>
                  <span
                    className={task.completed ? 'text-muted-foreground line-through' : ''}
                    style={{ fontSize: '14px' }}
                  >
                    {task.title}
                  </span>
                </motion.div>
              ))}
            </div>
          </AnimatedOceanCard>
        )}
      </div>
    </div>
  );
}