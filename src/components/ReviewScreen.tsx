import { useState, useEffect } from 'react';
import { Battery, Moon, BatteryLow, BatteryMedium, BatteryFull, Zap, Send, Lightbulb, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { RippleButton } from './RippleButton';
import * as reviewService from '../services/reviewService';
import { useStore } from '../store';

// Battery levels constants
const BATTERY_LEVELS = [20, 40, 60, 80, 100] as const;
type BatteryLevel = (typeof BATTERY_LEVELS)[number];

export function ReviewScreen() {
  const { t } = useLanguage();
  const addEnergyLog = useStore((state) => state.addEnergyLog);

  // Form state
  const [good, setGood] = useState('');
  const [bad, setBad] = useState('');
  const [endEnergy, setEndEnergy] = useState<BatteryLevel | null>(null);

  // Review state
  const [existingReview, setExistingReview] = useState<reviewService.Review | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing review on mount
  useEffect(() => {
    const loadReview = async () => {
      try {
        const review = await reviewService.getTodayReview();
        if (review) {
          setExistingReview(review);
          setGood(review.good);
          setBad(review.bad);
          setEndEnergy(review.endEnergy as BatteryLevel);
          setAiSummary(review.aiSummary);
          setAiAdvice(review.aiAdvice);
        }
      } catch (err) {
        console.error('Failed to load review:', err);
        setError(err instanceof Error ? err.message : t('review.loadError'));
      } finally {
        setIsLoadingReview(false);
      }
    };

    loadReview();
  }, [t]);

  const handleSubmit = async () => {
    if (!good.trim() || !bad.trim() || endEnergy === null) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const review = await reviewService.createReview({
        good: good.trim(),
        bad: bad.trim(),
        endEnergy,
      });

      // Save end energy log
      await addEnergyLog(endEnergy, 'review');

      setExistingReview(review);
      setAiSummary(review.aiSummary);
      setAiAdvice(review.aiAdvice);
    } catch (err) {
      console.error('Failed to save review:', err);
      setError(err instanceof Error ? err.message : t('review.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const energyLevels = [
    { value: 20, icon: Moon, label: t('today.energy.tired'), color: '#94a3b8' },
    { value: 40, icon: BatteryLow, label: t('today.energy.low'), color: '#64748b' },
    { value: 60, icon: BatteryMedium, label: t('today.energy.okay'), color: '#4A9FD8' },
    { value: 80, icon: BatteryFull, label: t('today.energy.good'), color: '#52C9C1' },
    { value: 100, icon: Zap, label: t('today.energy.great'), color: '#5AB5E8' },
  ];

  if (isLoadingReview) {
    return (
      <div className="space-y-6">
        <GradientHeader
          title={t('review.title')}
          subtitle={t('review.subtitle')}
          variant="ocean"
        />
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GradientHeader
        title={t('review.title')}
        subtitle={t('review.subtitle')}
        variant="ocean"
      />

      {/* Form Card */}
      <AnimatedOceanCard delay={0.1}>
        <div className="p-6 space-y-6">
          {/* Good */}
          <div>
            <label className="block mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
              {t('review.goodLabel')}
            </label>
            <textarea
              value={good}
              onChange={(e) => setGood(e.target.value)}
              placeholder={t('review.goodPlaceholder')}
              className="w-full min-h-[100px] p-3 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-[#4A9FD8] resize-none"
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* Bad */}
          <div>
            <label className="block mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
              {t('review.badLabel')}
            </label>
            <textarea
              value={bad}
              onChange={(e) => setBad(e.target.value)}
              placeholder={t('review.badPlaceholder')}
              className="w-full min-h-[100px] p-3 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-[#4A9FD8] resize-none"
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* End Energy */}
          <div>
            <label className="block mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
              {t('review.endEnergyLabel')}
            </label>
            <div className="flex justify-between gap-2">
              {energyLevels.map((level) => (
                <motion.button
                  key={level.value}
                  onClick={() => setEndEnergy(level.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                    endEnergy === level.value
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

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-500" style={{ fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <RippleButton
            onClick={handleSubmit}
            disabled={isLoading || !good.trim() || !bad.trim() || endEnergy === null}
            className="w-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Loading...</span>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                {t('review.submit')}
              </>
            )}
          </RippleButton>
        </div>
      </AnimatedOceanCard>

      {/* AI Summary Card */}
      {aiSummary && (
        <AnimatedOceanCard delay={0.2}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-[#4A9FD8]" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {t('review.aiSummaryTitle')}
              </h3>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
              {aiSummary}
            </p>
          </div>
        </AnimatedOceanCard>
      )}

      {/* AI Advice Card */}
      {aiAdvice && (
        <AnimatedOceanCard delay={0.3}>
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
                {t('review.aiAdviceTitle')}
              </h3>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
              {aiAdvice}
            </p>
          </div>
        </AnimatedOceanCard>
      )}
    </div>
  );
}
