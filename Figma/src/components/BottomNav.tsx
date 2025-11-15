import { Home, ListTodo, Battery, Brain, Settings } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'energy', label: 'Energy', icon: Battery },
    { id: 'insights', label: 'Insights', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
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
