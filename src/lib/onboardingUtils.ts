/**
 * Onboarding utilities for managing user onboarding flow and data
 */

const ONBOARDING_COMPLETED_KEY = 'saturway_onboarding_completed';
const ONBOARDING_DATA_KEY = 'saturway_onboarding_data';

export interface OnboardingData {
  mainFocus: 'work' | 'health' | 'personal' | 'mix';
  workSchedule: 'stable' | 'flexible' | 'freelance';
  startHour: string;
  initialEnergy: number;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
}

/**
 * Get saved onboarding data
 */
export function getOnboardingData(): OnboardingData | null {
  const data = localStorage.getItem(ONBOARDING_DATA_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as OnboardingData;
  } catch {
    return null;
  }
}

/**
 * Save onboarding data and mark as completed
 */
export function saveOnboardingData(data: OnboardingData): void {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));
}

/**
 * Reset onboarding (allows user to go through it again)
 */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  localStorage.removeItem(ONBOARDING_DATA_KEY);
}
