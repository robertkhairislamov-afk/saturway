import { useState, useEffect } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { PermissionScreen } from './PermissionScreen';
import { ErrorScreen } from './ErrorScreen';
import { LanguageProvider } from './LanguageContext';

type AuthStep = 'loading' | 'permission' | 'error' | 'complete';

const NOTIFICATION_ASKED_KEY = 'saturway_notification_asked';

interface AuthFlowProps {
  onComplete: () => void;
  simulateError?: boolean;
}

export function AuthFlow({ onComplete, simulateError = false }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('loading');

  const handleLoadingComplete = () => {
    if (simulateError) {
      setCurrentStep('error');
    } else {
      // Check if we've already asked for notification permission
      const hasAskedForNotifications = localStorage.getItem(NOTIFICATION_ASKED_KEY);

      if (hasAskedForNotifications === 'true') {
        // Skip permission screen if already asked
        setCurrentStep('complete');
        onComplete();
      } else {
        // Show permission screen only on first launch
        setCurrentStep('permission');
      }
    }
  };

  const handlePermissionAllow = () => {
    // Save that we've asked for notification permission
    localStorage.setItem(NOTIFICATION_ASKED_KEY, 'true');
    localStorage.setItem('notifications_enabled', 'true');

    // Here you would actually request notification permissions
    console.log('Notifications enabled');
    setCurrentStep('complete');
    onComplete();
  };

  const handlePermissionSkip = () => {
    // Save that we've asked for notification permission
    localStorage.setItem(NOTIFICATION_ASKED_KEY, 'true');
    localStorage.setItem('notifications_enabled', 'false');

    console.log('Notifications skipped');
    setCurrentStep('complete');
    onComplete();
  };

  const handleErrorRetry = () => {
    setCurrentStep('loading');
  };

  const handleSupport = () => {
    // Open support chat or link
    console.log('Opening support...');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'loading':
        return <LoadingScreen onComplete={handleLoadingComplete} />;
      
      case 'permission':
        return (
          <PermissionScreen
            onAllow={handlePermissionAllow}
            onSkip={handlePermissionSkip}
          />
        );
      
      case 'error':
        return (
          <ErrorScreen
            onRetry={handleErrorRetry}
            onSupport={handleSupport}
          />
        );
      
      case 'complete':
        onComplete();
        return null;
      
      default:
        return null;
    }
  };

  return (
    <LanguageProvider>
      {renderStep()}
    </LanguageProvider>
  );
}