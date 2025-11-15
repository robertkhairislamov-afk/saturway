import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { EnergyTracker } from './components/EnergyTracker';
import { AIInsights } from './components/AIInsights';
import { Settings } from './components/Settings';
import { BottomNav } from './components/BottomNav';
import { Welcome } from './components/Welcome';
import { AuthFlow } from './components/AuthFlow';
import { AuthScreensDemo } from './components/AuthScreensDemo';
import { LanguageProvider } from './components/LanguageContext';
import { BackgroundProvider } from './components/BackgroundContext';
import { AnimatedScreen } from './components/AnimatedScreen';
import { DynamicBackground } from './components/DynamicBackground';
import logoImage from './assets/443c5c749ebfe974980617b9c917b81b051ddc82.png';

// Set to true to see auth screens demo
const DEMO_MODE = false;

export default function App() {
  const [showAuth, setShowAuth] = useState(!DEMO_MODE);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Demo mode - show auth screens menu
  if (DEMO_MODE) {
    return (
      <LanguageProvider>
        <AuthScreensDemo />
      </LanguageProvider>
    );
  }

  if (showAuth) {
    return (
      <LanguageProvider>
        <AuthFlow onComplete={() => {
          setShowAuth(false);
          setShowWelcome(true);
        }} />
      </LanguageProvider>
    );
  }

  if (showWelcome) {
    return (
      <LanguageProvider>
        <Welcome onGetStarted={() => setShowWelcome(false)} />
      </LanguageProvider>
    );
  }

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

  return (
    <LanguageProvider>
      <BackgroundProvider>
        <div className="relative min-h-screen bg-background pb-20">
          {/* Dynamic Background */}
          <DynamicBackground />
          
          {/* Header with gradient enhancement */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-card/95 backdrop-blur-lg">
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
                      Saturway
                    </h1>
                    <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                      AI Organizer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content with Animated Transitions */}
          <main className="relative z-0 mx-auto max-w-2xl px-4 py-6">
            <AnimatedScreen screenKey={currentView}>
              {renderView()}
            </AnimatedScreen>
          </main>

          {/* Gradient fade before bottom nav */}
          <div className="pointer-events-none fixed bottom-16 left-0 right-0 z-30 h-8 bg-gradient-to-t from-background to-transparent" />

          {/* Bottom Navigation */}
          <BottomNav currentView={currentView} onViewChange={setCurrentView} />
        </div>
      </BackgroundProvider>
    </LanguageProvider>
  );
}