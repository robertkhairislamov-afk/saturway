import { Battery, BatteryCharging, BatteryLow, Sun, Moon, Coffee } from 'lucide-react';
import { Card } from './ui/card';
import { Slider } from './ui/slider';
import { useState } from 'react';

export function EnergyTracker() {
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
      title: 'Peak Performance',
      time: '9:00 - 11:00 AM',
      description: 'Your energy is highest during this window',
      color: 'text-[#52C9C1]',
      bgColor: 'bg-[#52C9C1]/10',
    },
    {
      title: 'Rest Needed',
      time: '3:00 - 4:00 PM',
      description: 'Consider a short break or light tasks',
      color: 'text-[#FFD93D]',
      bgColor: 'bg-[#FFD93D]/10',
    },
    {
      title: 'Wind Down',
      time: 'After 8:00 PM',
      description: 'Perfect time for reflection and planning',
      color: 'text-[#5AB5E8]',
      bgColor: 'bg-[#5AB5E8]/10',
    },
  ];

  const getEnergyStatus = (value: number) => {
    if (value >= 70) return { text: 'High Energy', color: 'text-[#52C9C1]', icon: BatteryCharging };
    if (value >= 40) return { text: 'Moderate', color: 'text-[#FFD93D]', icon: Battery };
    return { text: 'Low Energy', color: 'text-[#5AB5E8]', icon: BatteryLow };
  };

  const status = getEnergyStatus(currentEnergy[0]);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-1">Energy Tracker</h2>
        <p className="text-muted-foreground">
          Track and optimize your daily energy levels
        </p>
      </div>

      {/* Current Energy */}
      <Card className="border-[#4A9FD8]/20 bg-gradient-to-br from-[#4A9FD8]/5 to-transparent p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 text-muted-foreground uppercase tracking-wide" style={{ fontSize: '12px' }}>
              Current Energy
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
          Slide to update your current energy level
        </div>
      </Card>

      {/* Energy Timeline */}
      <Card className="p-5">
        <h3 className="mb-4">Today's Energy Pattern</h3>
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
                          ? 'bg-[#52C9C1]'
                          : item.value >= 40
                          ? 'bg-[#FFD93D]'
                          : 'bg-[#5AB5E8]'
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
        <h3>Energy Insights</h3>
        {insights.map((insight, index) => (
          <Card key={index} className={`border-border/50 p-4 ${insight.bgColor}`}>
            <div className="mb-1 flex items-center justify-between">
              <div className={insight.color}>{insight.title}</div>
              <div className="text-muted-foreground" style={{ fontSize: '14px' }}>
                {insight.time}
              </div>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              {insight.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
