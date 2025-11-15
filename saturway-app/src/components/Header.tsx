import WebApp from '@twa-dev/sdk';
import { Sparkles } from 'lucide-react';

export function Header() {
  const user = WebApp.initDataUnsafe.user;
  const hour = new Date().getHours();

  const greeting = hour < 12 ? '☀️ Доброе утро' :
                   hour < 18 ? '🌤️ Добрый день' :
                   '🌙 Добрый вечер';

  return (
    <header className="header">
      <div className="header-greeting">
        <h1>{greeting}, {user?.first_name || 'друг'}!</h1>
        <p className="header-subtitle">Путь Сатурна начинается сегодня</p>
      </div>
      <div className="header-logo">
        <Sparkles size={32} color="#7E57FF" />
      </div>
    </header>
  );
}
