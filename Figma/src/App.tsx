import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { EnergyTracker } from './components/EnergyTracker';
import { AIInsights } from './components/AIInsights';
import { Settings } from './components/Settings';
import { BottomNav } from './components/BottomNav';
import { Welcome } from './components/Welcome';
import logoImage from 'figma:asset/443c5c749ebfe974980617b9c917b81b051ddc82.png';

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  if (showWelcome) {
    return <Welcome onGetStarted={() => setShowWelcome(false)} />;
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
    <div className="min-h-screen bg-background pb-20">
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
                  Saturway
                </h1>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  AI Organizer
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
      <main className="mx-auto max-w-2xl px-4 py-6">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}
