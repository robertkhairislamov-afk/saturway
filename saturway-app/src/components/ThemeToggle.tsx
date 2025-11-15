import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Проверяем системную тему Telegram
    const telegramDark = WebApp.colorScheme === 'dark';
    setIsDark(telegramDark);
    document.documentElement.setAttribute('data-theme', telegramDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    WebApp.HapticFeedback.impactOccurred('light');
  };

  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {isDark ? <Sun size={24} color="#FFD93D" /> : <Moon size={24} color="#7E57FF" />}
    </button>
  );
}
