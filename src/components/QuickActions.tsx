import { Plus, Brain, Calendar, TrendingUp } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export function QuickActions() {
  const actions = [
    { icon: Plus, label: 'Задача', color: '#7E57FF' },
    { icon: Brain, label: 'AI План', color: '#FF6B9D' },
    { icon: Calendar, label: 'Календарь', color: '#4ECDC4' },
    { icon: TrendingUp, label: 'Аналитика', color: '#FFD93D' }
  ];

  const handleAction = (label: string) => {
    WebApp.showPopup({
      title: label,
      message: `Функция "${label}" уже доступна в приложении! Прокрутите вниз 📱`,
      buttons: [{ type: 'close' }]
    });
  };

  return (
    <div className="quick-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          className="action-btn"
          onClick={() => handleAction(action.label)}
          style={{ borderColor: action.color }}
        >
          <action.icon size={24} color={action.color} />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
