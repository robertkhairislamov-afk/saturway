import { useState, useEffect } from 'react';
import { TodayScreen } from './components/TodayScreen';
import { TaskList } from './components/TaskList';
import { ProfileScreen } from './components/ProfileScreen';
import { BottomNav } from './components/BottomNav';
import { Welcome } from './components/Welcome';
import { Onboarding, OnboardingData } from './components/Onboarding';
import { ReviewScreen } from './components/ReviewScreen';
import { HabitScreen } from './components/HabitScreen';
import { StatisticsScreen } from './components/StatisticsScreen';
import { CalendarView } from './components/CalendarView';
import { AuthFlow } from './components/AuthFlow';
import { LanguageProvider } from './components/LanguageContext';
import { BackgroundProvider } from './components/BackgroundContext';
import { ThemeProvider } from './components/ThemeContext';
import { AnimatedScreen } from './components/AnimatedScreen';
import { AppHeader } from './components/AppHeader';
import { DynamicBackground } from './components/DynamicBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store';
import { hasCompletedOnboarding, saveOnboardingData } from './lib/onboardingUtils';
import logoImage from './assets/443c5c749ebfe974980617b9c917b81b051ddc82.png';

// Set to true to see auth screens demo
const DEMO_MODE = false;
// Cache bust: 2025-11-17 - Ocean Edition v2 with API integration
const APP_VERSION = '2.0.0-ocean-edition';

export default function App() {
  // Check if onboarding was already completed
  const isOnboardingComplete = hasCompletedOnboarding();

  const [showAuth, setShowAuth] = useState(!DEMO_MODE && !isOnboardingComplete);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState('today');

  const user = useStore((state) => state.user);
  const initializeApp = useStore((state) => state.initializeApp);
  const fetchTodayEnergy = useStore((state) => state.fetchTodayEnergy);

  // Initialize app data after auth and onboarding
  useEffect(() => {
    if (!showAuth && !showOnboarding && user) {
      initializeApp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAuth, showOnboarding, user]);

  // Handle auth completion
  const handleAuthComplete = () => {
    setShowAuth(false);
    setShowOnboarding(true);
  };

  // Handle onboarding completion
  const handleOnboardingComplete = (data: OnboardingData) => {
    // Save onboarding data using utility
    saveOnboardingData(data);

    console.log('Onboarding data saved:', data);

    // TODO: Optionally send to backend
    // await api.post('/user/onboarding', data);

    setShowOnboarding(false);
  };

  // Show auth flow
  if (showAuth) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <AuthFlow onComplete={handleAuthComplete} />
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <Onboarding onComplete={handleOnboardingComplete} />
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  const renderView = () => {
    const userName = user?.firstName || 'User';

    switch (currentView) {
      case 'today':
        return <TodayScreen userName={userName} onNavigate={setCurrentView} />;
      case 'tasks':
        return <TaskList />;
      case 'profile':
        return <ProfileScreen userName={userName} onNavigate={setCurrentView} />;
      case 'review':
        return <ReviewScreen onComplete={() => setCurrentView('today')} />;
      case 'habit':
        return <HabitScreen />;
      case 'statistics':
        return <StatisticsScreen />;
      case 'calendar':
        return <CalendarView />;
      default:
        return <TodayScreen userName={userName} onNavigate={setCurrentView} />;
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BackgroundProvider>
          <div className="relative min-h-screen bg-background pb-20">
            {/* Dynamic Background */}
            <DynamicBackground />

            {/* Header with theme toggle */}
            <AppHeader />

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
      </ThemeProvider>
    </ErrorBoundary>
  );
}