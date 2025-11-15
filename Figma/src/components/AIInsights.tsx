import { Brain, Sparkles, TrendingUp, AlertCircle, Calendar, Zap } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function AIInsights() {
  const insights = [
    {
      id: '1',
      type: 'productivity',
      title: 'Optimize Your Morning Routine',
      description:
        'Based on your patterns, you complete 40% more tasks when you start before 9 AM. Consider moving your most important work earlier.',
      priority: 'high',
      icon: TrendingUp,
      color: 'text-[#52C9C1]',
      bgColor: 'bg-[#52C9C1]/10',
      action: 'Adjust Schedule',
    },
    {
      id: '2',
      type: 'energy',
      title: 'Energy Dip Detected',
      description:
        'Your energy consistently drops around 2-3 PM. A 15-minute walk or brief meditation could help you recharge.',
      priority: 'medium',
      icon: Zap,
      color: 'text-[#FFD93D]',
      bgColor: 'bg-[#FFD93D]/10',
      action: 'Set Reminder',
    },
    {
      id: '3',
      type: 'focus',
      title: 'Deep Work Opportunity',
      description:
        'You have a 2-hour block tomorrow at 10 AM with no meetings. Perfect for focused work on your blog post.',
      priority: 'high',
      icon: Brain,
      color: 'text-[#4A9FD8]',
      bgColor: 'bg-[#4A9FD8]/10',
      action: 'Block Time',
    },
    {
      id: '4',
      type: 'balance',
      title: 'Work-Life Balance Check',
      description:
        "You've worked 45 hours this week. Remember to schedule some rest and recovery time this weekend.",
      priority: 'medium',
      icon: AlertCircle,
      color: 'text-[#5AB5E8]',
      bgColor: 'bg-[#5AB5E8]/10',
      action: 'Plan Weekend',
    },
    {
      id: '5',
      type: 'planning',
      title: 'Weekly Planning Suggestion',
      description:
        "Sunday evenings work best for your weekly planning. You're 60% more likely to stick to tasks planned then.",
      priority: 'low',
      icon: Calendar,
      color: 'text-[#52C9C1]',
      bgColor: 'bg-[#52C9C1]/10',
      action: 'Create Habit',
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-[#FF6B6B]/10 text-[#FF6B6B]">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-[#FFD93D]/10 text-[#FFD93D]">Medium</Badge>;
      case 'low':
        return <Badge className="bg-[#52C9C1]/10 text-[#52C9C1]">Low Priority</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Image */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative h-40">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1687245905413-2602d6fb2b4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIwY2FsbSUyMHBlcnNvbnxlbnwxfHx8fDE3NjIxNTYwMTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Calm meditation"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/90 via-[#1a1a2e]/50 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="opacity-90">Powered by AI</span>
          </div>
          <h2 className="mb-1">Personal Insights</h2>
          <p className="opacity-90">
            Tailored recommendations based on your patterns
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50 p-4 text-center">
          <div className="mb-1" style={{ fontSize: '24px', fontWeight: 700 }}>
            5
          </div>
          <div className="text-muted-foreground" style={{ fontSize: '12px' }}>
            New Insights
          </div>
        </Card>
        <Card className="border-border/50 p-4 text-center">
          <div className="mb-1" style={{ fontSize: '24px', fontWeight: 700 }}>
            85%
          </div>
          <div className="text-muted-foreground" style={{ fontSize: '12px' }}>
            Accuracy
          </div>
        </Card>
        <Card className="border-border/50 p-4 text-center">
          <div className="mb-1" style={{ fontSize: '24px', fontWeight: 700 }}>
            12
          </div>
          <div className="text-muted-foreground" style={{ fontSize: '12px' }}>
            Applied
          </div>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <Card key={insight.id} className="border-border/50 p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`${insight.bgColor} rounded-xl p-2.5`}>
                    <Icon className={`h-5 w-5 ${insight.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1">{insight.title}</h3>
                    {getPriorityBadge(insight.priority)}
                  </div>
                </div>
              </div>
              <p className="mb-4 text-muted-foreground">{insight.description}</p>
              <button className="rounded-lg bg-[#4A9FD8]/10 px-4 py-2 text-[#4A9FD8] transition-colors hover:bg-[#4A9FD8]/20">
                {insight.action}
              </button>
            </Card>
          );
        })}
      </div>

      {/* AI Learning Card */}
      <Card className="border-[#4A9FD8]/20 bg-gradient-to-r from-[#4A9FD8]/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-[#4A9FD8]/10 p-2.5">
            <Brain className="h-5 w-5 text-[#4A9FD8]" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-[#4A9FD8]">Continuously Learning</h3>
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              The AI is analyzing your patterns and will provide more personalized
              insights over time. Keep logging your tasks and energy levels for
              better recommendations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
