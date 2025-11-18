import { apiClient } from '../lib/api';

export interface EnergyLog {
  id: string;
  userId: string;
  value: number; // 20/40/60/80/100
  source: 'today' | 'review' | 'onboarding';
  createdAt: string;
}

export interface EnergyTodayData {
  logs: EnergyLog[];
  lastValue: number | null;
  avgValue: number | null;
}

export async function createEnergyLog(value: number, source: 'today' | 'review' | 'onboarding' = 'today'): Promise<EnergyLog> {
  const response = await apiClient.post('/energy', { value, source });
  return response.data.energyLog;
}

export async function getTodayEnergy(): Promise<EnergyTodayData> {
  const response = await apiClient.get('/energy/today');
  return response.data;
}
