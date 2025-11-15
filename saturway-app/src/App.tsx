import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './index.css';
import './i18n';
import { Welcome } from './components/Welcome';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { EnergyTracker } from './components/EnergyTracker';
import { AIInsights } from './components/AIInsights';
import { Settings } from './components/Settings';
import { BottomNav } from './components/BottomNav';
import { useStore } from './store';
import { useTranslation } from 'react-i18next';
import logoImage from './assets/logo.png';
// Ocean Edition 2.0 Components
import { FloatingBubbles } from './components/FloatingBubbles';
import { OceanAccents } from './components/OceanAccents';

function App() {
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('saturway_onboarded');
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const { initializeApp } = useStore();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    localStorage.setItem('saturway_onboarded', 'true');
    setShowWelcome(false);
  };

  useEffect(() => {
    // Инициализация Telegram WebApp
    WebApp.ready();
    WebApp.expand();

    // Настройка темы
    WebApp.setHeaderColor(WebApp.themeParams.bg_color || '#f8f9fa');
    WebApp.setBackgroundColor(WebApp.themeParams.bg_color || '#f8f9fa');

    // Инициализация приложения с mock данными
    initializeApp();

    // Показываем главную кнопку
    WebApp.MainButton.setText(t('app.optimizeButton'));
    WebApp.MainButton.show();
    WebApp.MainButton.onClick(() => {
      WebApp.showAlert(t('app.optimizeAlert'));
    });
  }, [initializeApp, t]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userName="Alex" />;
      case 'tasks':
        return <TaskList />;
      case 'energy':
        return <EnergyTracker />;
      case 'insights':
        return <AIInsights />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard userName="Alex" />;
    }
  };

  if (showWelcome) {
    return <Welcome onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="relative min-h-screen bg-background pb-20">
      {/* Ocean Edition 2.0 - Background Effects */}
      <OceanAccents variant="subtle" />
      <FloatingBubbles count={6} opacity={0.12} />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-lg">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] p-1">
                <img
                  src={logoImage}
                  alt="Saturway Logo"
                  className="h-full w-full object-contain drop-shadow-md"
                />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] bg-clip-text" style={{ fontSize: '20px', fontWeight: 700, color: 'transparent' }}>
                  {t('app.name')}
                </h1>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] p-1">
              <img
                src={logoImage}
                alt="Saturway"
                className="h-full w-full object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
