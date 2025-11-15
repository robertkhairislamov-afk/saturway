import { Brain, Zap, Target, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface DashboardProps {
  userName: string;
}

export function Dashboard({ userName }: DashboardProps) {
  const stats = [
    {
      label: 'Tasks Complete',
      value: '12/18',
      percentage: 67,
      icon: Target,
      color: 'text-[#4A9FD8]',
      bgColor: 'bg-[#4A9FD8]/10',
    },
    {
      label: 'Energy Level',
      value: '78%',
      percentage: 78,
      icon: Zap,
      color: 'text-[#52C9C1]',
      bgColor: 'bg-[#52C9C1]/10',
    },
    {
      label: 'Focus Time',
      value: '4.5h',
      percentage: 75,
      icon: Brain,
      color: 'text-[#5AB5E8]',
      bgColor: 'bg-[#5AB5E8]/10',
    },
    {
      label: 'Weekly Streak',
      value: '5 days',
      percentage: 71,
      icon: TrendingUp,
      color: 'text-[#FFD93D]',
      bgColor: 'bg-[#FFD93D]/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4A9FD8] via-[#5AB5E8] to-[#52C9C1] p-6 text-white">
        <div className="relative z-10">
          <div className="mb-2 opacity-90">Monday, November 3</div>
          <h1 className="mb-1">Good Morning, {userName}</h1>
          <p className="opacity-90">
            You have 6 tasks scheduled today
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-20">
          <div className="absolute right-0 top-1/4 h-32 w-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-24 w-24 rounded-full bg-white blur-2xl" />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/50 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className={`${stat.bgColor} rounded-xl p-2.5`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-muted-foreground uppercase tracking-wide" style={{ fontSize: '12px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.2 }}>
                  {stat.value}
                </div>
                <Progress value={stat.percentage} className="h-1.5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* AI Suggestion Card */}
      <Card className="border-[#4A9FD8]/20 bg-gradient-to-r from-[#4A9FD8]/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-[#4A9FD8]/10 p-2.5">
            <Brain className="h-5 w-5 text-[#4A9FD8]" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-[#4A9FD8]">AI Insight</h3>
            <p className="text-muted-foreground">
              Your energy peaks between 9-11 AM. Consider scheduling your most
              important task during this window.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
