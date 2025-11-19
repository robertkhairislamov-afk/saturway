import { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, CheckCircle2, Circle, Calendar, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { RippleButton } from './RippleButton';
import { useStore } from '../store';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { formatLocalDate } from '../lib/dateUtils';

export function HabitScreen() {
  const { t } = useLanguage();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const habit = useStore((state) => state.habit);
  const habitLogs = useStore((state) => state.habitLogs);
  const habitStats = useStore((state) => state.habitStats);
  const isLoadingHabit = useStore((state) => state.isLoadingHabit);
  const markHabitToday = useStore((state) => state.markHabitToday);
  const updateHabit = useStore((state) => state.updateHabit);
  const deleteHabit = useStore((state) => state.deleteHabit);

  if (!habit || !habitStats) {
    return (
      <div className="space-y-6">
        <GradientHeader
          title={t('habit.title')}
          subtitle={t('habit.empty')}
          variant="ocean"
        />
      </div>
    );
  }

  const { doneDays, targetDays, currentStreak, longestStreak, todayDone } = habitStats;
  const progress = (doneDays / targetDays) * 100;

  // Create set of completed dates for quick lookup
  const completedDates = new Set(habitLogs.map(log => log.date));

  // Generate array of days (1 to targetDays)
  const days = Array.from({ length: targetDays }, (_, i) => i + 1);

  // Calculate which date corresponds to each day
  const startDate = new Date(habit.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayStatus = (dayIndex: number): 'done' | 'today' | 'future' | 'missed' => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayIndex - 1);
    const dayDateStr = formatLocalDate(dayDate);
    const todayStr = formatLocalDate(today);

    if (completedDates.has(dayDateStr)) return 'done';
    if (dayDateStr === todayStr) return 'today';
    if (dayDate > today) return 'future';
    return 'missed';
  };

  const handleMarkToday = async () => {
    try {
      await markHabitToday();
    } catch (error) {
      console.error('Failed to mark today:', error);
    }
  };

  const handleOpenEdit = () => {
    setEditTitle(habit?.title || '');
    setEditDescription(habit?.description || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;

    try {
      await updateHabit({
        title: editTitle,
        description: editDescription,
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update habit:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHabit();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Edit/Delete buttons */}
      <div>
        <GradientHeader
          title={habit.title}
          subtitle={t('habit.subtitle')}
          variant="ocean"
        />
        <div className="flex gap-2 mt-3">
          <motion.button
            onClick={handleOpenEdit}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Pencil className="w-4 h-4" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Редактировать</span>
          </motion.button>
          <motion.button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-4 h-4" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Удалить</span>
          </motion.button>
        </div>
      </div>

      {/* Progress Card */}
      <AnimatedOceanCard delay={0.1}>
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '16px', fontWeight: 600 }}>
                {t('habit.dayProgress')
                  .replace('{{current}}', doneDays.toString())
                  .replace('{{target}}', targetDays.toString())}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600 }} className="text-[#4A9FD8]">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('habit.streak')}
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>
                  {currentStreak} {t('habit.days')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#4A9FD8]" />
              <div>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  Longest
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>
                  {longestStreak} {t('habit.days')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Grid of days */}
      <AnimatedOceanCard delay={0.2}>
        <div className="p-6">
          <h3 className="mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
            {t('habit.progressGrid')}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            maxWidth: '300px',
            margin: '0 auto'
          }}>
            {days.map((day) => {
              const status = getDayStatus(day);

              const getBackgroundColor = () => {
                if (status === 'done') return 'linear-gradient(135deg, #4A9FD8 0%, #52C9C1 100%)';
                if (status === 'today') return 'rgba(74, 159, 216, 0.1)';
                if (status === 'future') return 'rgba(228, 228, 231, 0.2)';
                return 'rgba(239, 68, 68, 0.1)';
              };

              const getTextColor = () => {
                if (status === 'done') return '#ffffff';
                if (status === 'today') return '#4A9FD8';
                if (status === 'future') return 'rgba(107, 114, 128, 0.4)';
                return 'rgba(239, 68, 68, 0.5)';
              };

              const getBorder = () => {
                if (status === 'today') return '1px solid #4A9FD8';
                if (status === 'missed') return '1px solid rgba(239, 68, 68, 0.3)';
                return 'none';
              };

              return (
                <motion.div
                  key={day}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + (day - 1) * 0.003 }}
                  title={`Day ${day}`}
                  style={{
                    aspectRatio: '1',
                    background: getBackgroundColor(),
                    border: getBorder(),
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getTextColor(),
                    fontSize: '10px',
                    fontWeight: status === 'today' ? 600 : 500,
                    boxShadow: status === 'done' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                  }}
                >
                  {day}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1]" />
              <span style={{ fontSize: '11px' }} className="text-muted-foreground">
                {t('habit.done')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm ring-2 ring-[#4A9FD8] bg-[#4A9FD8]/10" />
              <span style={{ fontSize: '11px' }} className="text-muted-foreground">
                {t('habit.today')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm border border-red-500/30 bg-red-500/10" />
              <span style={{ fontSize: '11px' }} className="text-muted-foreground">
                {t('habit.missed')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-border/20" />
              <span style={{ fontSize: '11px' }} className="text-muted-foreground">
                Будущее
              </span>
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Mark today button */}
      {!todayDone && (
        <RippleButton
          onClick={handleMarkToday}
          disabled={isLoadingHabit}
          className="w-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90"
        >
          {t('habit.markToday')}
        </RippleButton>
      )}

      {todayDone && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-green-600" style={{ fontSize: '16px', fontWeight: 500 }}>
            {t('habit.todayDone')}
          </span>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsEditModalOpen(false)}
        >
          <motion.div
            className="w-full max-w-lg bg-background rounded-t-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600 }} className="mb-4">
              Редактировать привычку
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Название *
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Название привычки"
                  className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание (необязательно)"
                  rows={3}
                  className="flex w-full rounded-md border border-[#4A9FD8]/30 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] focus-visible:ring-offset-2 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <motion.button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-border/50 hover:bg-muted/50 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 500 }}>Отмена</span>
              </motion.button>
              <motion.button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || isLoadingHabit}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Сохранить</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }} className="mb-2">
                Удалить привычку?
              </h3>
              <p className="text-muted-foreground text-sm">
                Это действие нельзя отменить. Все ваши данные и прогресс будут удалены.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-border/50 hover:bg-muted/50 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 500 }}>Отмена</span>
              </motion.button>
              <motion.button
                onClick={handleDelete}
                disabled={isLoadingHabit}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Удалить</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
