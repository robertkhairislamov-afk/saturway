import { Battery, BatteryCharging, BatteryLow, Sun, Moon, Coffee } from 'lucide-react';
import { Card } from './ui/card';
import { Slider } from './ui/slider';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function EnergyTracker() {
  const { t } = useTranslation();
  const [currentEnergy, setCurrentEnergy] = useState([75]);

  const energyData = [
    { time: '6 AM', value: 45, label: 'Morning', icon: Sun },
    { time: '9 AM', value: 85, label: 'Peak', icon: BatteryCharging },
    { time: '12 PM', value: 70, label: 'Midday', icon: Coffee },
    { time: '3 PM', value: 55, label: 'Afternoon', icon: BatteryLow },
    { time: '6 PM', value: 40, label: 'Evening', icon: Battery },
    { time: '9 PM', value: 25, label: 'Night', icon: Moon },
  ];

  const insights = [
    {
      key: 'peakPerformance',
      color: 'text-[#4ECDC4]',
      bgColor: 'bg-[#4ECDC4]/10',
    },
    {
      key: 'restNeeded',
      color: 'text-[#FFD93D]',
      bgColor: 'bg-[#FFD93D]/10',
    },
    {
      key: 'windDown',
      color: 'text-[#FF6B9D]',
      bgColor: 'bg-[#FF6B9D]/10',
    },
  ];

  const getEnergyStatus = (value: number) => {
    if (value >= 70) return { text: t('energy.high'), color: 'text-[#4ECDC4]', icon: BatteryCharging };
    if (value >= 40) return { text: t('energy.medium'), color: 'text-[#FFD93D]', icon: Battery };
    return { text: t('energy.low'), color: 'text-[#FF6B9D]', icon: BatteryLow };
  };

  const status = getEnergyStatus(currentEnergy[0]);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-1">{t('energy.title')}</h2>
        <p className="text-muted-foreground">
          {t('energy.subtitle')}
        </p>
      </div>

      {/* Current Energy */}
      <Card className="border-[#7E57FF]/20 bg-gradient-to-br from-[#7E57FF]/5 to-transparent p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 text-muted-foreground uppercase tracking-wide" style={{ fontSize: '12px' }}>
              {t('energy.currentLevel')}
            </div>
            <div className="flex items-center gap-2">
              <div style={{ fontSize: '32px', fontWeight: 700 }}>{currentEnergy[0]}%</div>
              <StatusIcon className={`h-6 w-6 ${status.color}`} />
            </div>
            <div className={`${status.color}`} style={{ fontSize: '14px' }}>
              {status.text}
            </div>
          </div>
        </div>
        <Slider
          value={currentEnergy}
          onValueChange={setCurrentEnergy}
          max={100}
          step={5}
          className="mb-2"
        />
        <div className="text-muted-foreground" style={{ fontSize: '12px' }}>
          {t('energy.sliderHint')}
        </div>
      </Card>

      {/* Energy Timeline */}
      <Card className="p-5">
        <h3 className="mb-4">{t('energy.todayPattern')}</h3>
        <div className="space-y-4">
          {energyData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="flex w-16 items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: '14px' }}>
                    {item.time}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span style={{ fontSize: '14px' }}>{item.label}</span>
                    <span className="text-muted-foreground" style={{ fontSize: '14px' }}>
                      {item.value}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.value >= 70
                          ? 'bg-[#4ECDC4]'
                          : item.value >= 40
                          ? 'bg-[#FFD93D]'
                          : 'bg-[#FF6B9D]'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Insights */}
      <div className="space-y-3">
        <h3>{t('energy.insights.title')}</h3>
        {insights.map((insight, index) => (
          <Card key={index} className={`border-border/50 p-4 ${insight.bgColor}`}>
            <div className="mb-1 flex items-center justify-between">
              <div className={insight.color}>{t(`energy.insights.${insight.key}.title`)}</div>
              <div className="text-muted-foreground" style={{ fontSize: '14px' }}>
                {t(`energy.insights.${insight.key}.time`)}
              </div>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              {t(`energy.insights.${insight.key}.description`)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
