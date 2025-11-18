import { useState } from 'react';
import { motion } from 'motion/react';
import { Target, Zap, CheckCircle2, Edit3, Flame, ArrowRight } from 'lucide-react';
import { RippleButton } from './RippleButton';
import { useLanguage } from './LanguageContext';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { useStore } from '../store';
import { Progress } from './ui/progress';
import { Input } from './ui/input';

type HabitPreset = 'focus' | 'workout' | 'journal' | 'custom';

interface HabitChallengeProps {
  onNavigate?: (view: string) => void;
}

export function HabitChallenge({ onNavigate }: HabitChallengeProps) {
  const { t } = useLanguage();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  const habit = useStore((state) => state.habit);
  const habitStats = useStore((state) => state.habitStats);
  const isLoadingHabit = useStore((state) => state.isLoadingHabit);
  const createHabit = useStore((state) => state.createHabit);
  const markHabitToday = useStore((state) => state.markHabitToday);

  const presetOptions = [
    { id: 'focus' as HabitPreset, icon: Target, label: t('habit.presets.focus') },
    { id: 'workout' as HabitPreset, icon: Zap, label: t('habit.presets.workout') },
    { id: 'journal' as HabitPreset, icon: Edit3, label: t('habit.presets.journal') },
    { id: 'custom' as HabitPreset, icon: CheckCircle2, label: t('habit.custom') },
  ];

  const handlePresetClick = async (presetId: HabitPreset) => {
    if (presetId === 'custom') {
      setShowCustomForm(true);
      return;
    }

    const preset = presetOptions.find(p => p.id === presetId);
    if (!preset) return;

    try {
      await createHabit({
        title: preset.label,
        targetDays: 40,
      });
    } catch (error) {
      console.error('Failed to create habit:', error);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customTitle.trim()) return;

    try {
      await createHabit({
        title: customTitle.trim(),
        targetDays: 40,
      });
      setCustomTitle('');
      setShowCustomForm(false);
    } catch (error) {
      console.error('Failed to create custom habit:', error);
    }
  };

  const handleCancelCustom = () => {
    setCustomTitle('');
    setShowCustomForm(false);
  };

  const handleMarkToday = async () => {
    try {
      await markHabitToday();
    } catch (error) {
      console.error('Failed to mark today:', error);
    }
  };

  // State 1: No active habit
  if (!habit || habit.status !== 'active') {
    return (
      <AnimatedOceanCard delay={0.3}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
              {t('habit.title')}
            </h3>
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              {t('habit.subtitle')}
            </p>
          </div>

          {/* Custom habit form */}
          {showCustomForm ? (
            <div className="space-y-3">
              <Input
                placeholder={t('habit.customPlaceholder')}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
                autoFocus
                className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              />
              <div className="flex gap-2">
                <RippleButton
                  onClick={handleCustomSubmit}
                  disabled={isLoadingHabit || !customTitle.trim()}
                  className="flex-1 bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90"
                >
                  {t('habit.create')}
                </RippleButton>
                <RippleButton
                  onClick={handleCancelCustom}
                  disabled={isLoadingHabit}
                  className="flex-1 bg-muted text-foreground hover:bg-muted/80"
                >
                  {t('habit.cancel')}
                </RippleButton>
              </div>
            </div>
          ) : (
            /* Preset buttons */
            <div className="grid grid-cols-2 gap-3">
              {presetOptions.map((preset) => (
                <RippleButton
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  disabled={isLoadingHabit}
                  className="flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-[#4A9FD8]/10 to-[#52C9C1]/10 text-foreground hover:from-[#4A9FD8]/20 hover:to-[#52C9C1]/20 border border-[#4A9FD8]/30 text-center"
                  style={{ fontSize: '12px', fontWeight: 500, padding: '12px 6px', minHeight: '85px' }}
                >
                  <preset.icon className="h-5 w-5 text-[#4A9FD8] flex-shrink-0" />
                  <span className="leading-tight break-words w-full px-1">{preset.label}</span>
                </RippleButton>
              ))}
            </div>
          )}
        </div>
      </AnimatedOceanCard>
    );
  }

  // State 2: Active habit
  const doneDays = habitStats?.doneDays || 0;
  const targetDays = habitStats?.targetDays || 40;
  const currentStreak = habitStats?.currentStreak || 0;
  const todayDone = habitStats?.todayDone || false;
  const progress = (doneDays / targetDays) * 100;

  return (
    <AnimatedOceanCard delay={0.3}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="mb-2" style={{ fontSize: '18px', fontWeight: 600 }}>
            {habit.title}
          </h3>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
            {t('habit.dayProgress')
              .replace('{{current}}', doneDays.toString())
              .replace('{{target}}', targetDays.toString())}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Streak */}
        {currentStreak > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-muted-foreground" style={{ fontSize: '14px' }}>
              {t('habit.streak')}: {currentStreak} {t('habit.days')}
            </span>
          </div>
        )}

        {/* Mark today button */}
        {todayDone ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-green-600" style={{ fontSize: '14px', fontWeight: 500 }}>
              {t('habit.todayDone')}
            </span>
          </div>
        ) : (
          <RippleButton
            onClick={handleMarkToday}
            disabled={isLoadingHabit}
            className="w-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90"
          >
            {t('habit.markToday')}
          </RippleButton>
        )}

        {/* Details button */}
        <button
          onClick={() => onNavigate?.('habit')}
          className="mt-3 flex w-full items-center justify-center gap-1 text-[#4A9FD8] hover:text-[#52C9C1] transition-colors"
          style={{ fontSize: '14px', fontWeight: 500 }}
        >
          <span>{t('habit.details')}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </AnimatedOceanCard>
  );
}
