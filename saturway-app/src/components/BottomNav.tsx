import { Home, ListTodo, Battery, Brain, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'tasks', label: t('nav.tasks'), icon: ListTodo },
    { id: 'energy', label: t('nav.energy'), icon: Battery },
    { id: 'insights', label: t('nav.insights'), icon: Brain },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? 'text-[#4A9FD8]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'fill-[#4A9FD8]/20' : ''}`} />
              <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
