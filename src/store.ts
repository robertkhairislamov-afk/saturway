import { create } from 'zustand';
import * as taskService from './services/taskService';
import * as moodService from './services/moodService';
import * as aiService from './services/aiService';
import * as userService from './services/userService';
import { Task, TaskPriority, TaskStatus } from './services/taskService';
import { MoodLog } from './services/moodService';
import { AIInsight } from './services/aiService';

interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  isPremium: boolean;
  photoUrl: string | null;
}

interface AppState {
  // User
  user: User | null;
  setUser: (user: User) => void;
  updateUser: (input: userService.UpdateUserInput) => Promise<void>;

  // Tasks
  tasks: Task[];
  isLoadingTasks: boolean;
  tasksError: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (input: taskService.CreateTaskInput) => Promise<void>;
  updateTask: (id: string, updates: taskService.UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;

  // Mood
  moodLogs: MoodLog[];
  isLoadingMood: boolean;
  moodError: string | null;
  currentMood: { energy: number; focus: number };
  fetchMoodLogs: (days?: number) => Promise<void>;
  logMood: (energy: number, focus: number, notes?: string) => Promise<void>;
  setCurrentMood: (energy: number, focus: number) => void;

  // AI Insights
  aiInsights: AIInsight[];
  isLoadingInsights: boolean;
  insightsError: string | null;
  fetchAIInsights: () => Promise<void>;

  // Energy
  energyLogs: import('./services/energyService').EnergyLog[];
  energyAvgToday: number | null;
  energyLastToday: number | null;
  isLoadingEnergy: boolean;
  energyError: string | null;
  fetchTodayEnergy: () => Promise<void>;
  addEnergyLog: (value: number, source?: 'today' | 'review' | 'onboarding') => Promise<void>;

  // Habit
  habit: import('./services/habitService').Habit | null;
  habitLogs: import('./services/habitService').HabitLog[];
  habitStats: import('./services/habitService').HabitStats | null;
  isLoadingHabit: boolean;
  habitError: string | null;
  fetchHabit: () => Promise<void>;
  createHabit: (input: import('./services/habitService').CreateHabitInput) => Promise<void>;
  updateHabit: (input: import('./services/habitService').UpdateHabitInput) => Promise<void>;
  deleteHabit: () => Promise<void>;
  markHabitToday: () => Promise<void>;

  // App initialization
  initializeApp: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  updateUser: async (input) => {
    try {
      const updatedUser = await userService.updateUser(input);
      set({ user: updatedUser });
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },

  // Tasks
  tasks: [],
  isLoadingTasks: false,
  tasksError: null,

  fetchTasks: async () => {
    set({ isLoadingTasks: true, tasksError: null });
    try {
      const tasks = await taskService.getTasks();
      set({ tasks, isLoadingTasks: false });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      set({
        tasksError: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoadingTasks: false,
      });
    }
  },

  addTask: async (input) => {
    set({ isLoadingTasks: true, tasksError: null });
    try {
      const newTask = await taskService.createTask(input);
      set((state) => ({
        tasks: [...(Array.isArray(state.tasks) ? state.tasks : []), newTask],
        isLoadingTasks: false,
      }));
    } catch (error) {
      console.error('Failed to create task:', error);
      set({
        tasksError: error instanceof Error ? error.message : 'Failed to create task',
        isLoadingTasks: false,
      });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    set({ isLoadingTasks: true, tasksError: null });
    try {
      const updatedTask = await taskService.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
        isLoadingTasks: false,
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
      set({
        tasksError: error instanceof Error ? error.message : 'Failed to update task',
        isLoadingTasks: false,
      });
      throw error;
    }
  },

  deleteTask: async (id) => {
    // Optimistic update - remove from UI immediately
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));

    try {
      await taskService.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Rollback on error
      set({
        tasks: previousTasks,
        tasksError: error instanceof Error ? error.message : 'Failed to delete task',
      });
      throw error;
    }
  },

  completeTask: async (id) => {
    // Optimistic update - update UI immediately
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: 'completed' as TaskStatus } : task
      ),
    }));

    try {
      const completedTask = await taskService.completeTask(id);
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? completedTask : task)),
      }));
    } catch (error) {
      console.error('Failed to complete task:', error);
      // Rollback on error
      set({
        tasks: previousTasks,
        tasksError: error instanceof Error ? error.message : 'Failed to complete task',
      });
      throw error;
    }
  },

  // Mood
  moodLogs: [],
  isLoadingMood: false,
  moodError: null,
  currentMood: { energy: 3, focus: 3 },

  fetchMoodLogs: async (days = 7) => {
    set({ isLoadingMood: true, moodError: null });
    try {
      const logs = await moodService.getMoodLogs(days);
      const logsArray = Array.isArray(logs) ? logs : [];
      set({ moodLogs: logsArray, isLoadingMood: false });

      // Update current mood with latest log
      if (logsArray.length > 0) {
        const latest = logsArray[0];
        set({ currentMood: { energy: latest.energyLevel, focus: latest.focusLevel } });
      }
    } catch (error) {
      console.error('Failed to fetch mood logs:', error);
      set({
        moodError: error instanceof Error ? error.message : 'Failed to load mood logs',
        isLoadingMood: false,
      });
    }
  },

  logMood: async (energy, focus, notes) => {
    set({ isLoadingMood: true, moodError: null });
    try {
      const log = await moodService.logMood({
        energyLevel: energy,
        focusLevel: focus,
        notes,
      });

      set((state) => ({
        moodLogs: [log, ...(Array.isArray(state.moodLogs) ? state.moodLogs : [])],
        currentMood: { energy, focus },
        isLoadingMood: false,
      }));
    } catch (error) {
      console.error('Failed to log mood:', error);
      set({
        moodError: error instanceof Error ? error.message : 'Failed to log mood',
        isLoadingMood: false,
      });
      throw error;
    }
  },

  setCurrentMood: (energy, focus) => set({ currentMood: { energy, focus } }),

  // AI Insights
  aiInsights: [],
  isLoadingInsights: false,
  insightsError: null,

  fetchAIInsights: async () => {
    set({ isLoadingInsights: true, insightsError: null });
    try {
      const insights = await aiService.getAIInsights();
      set({ aiInsights: insights, isLoadingInsights: false });
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      set({
        insightsError: error instanceof Error ? error.message : 'Failed to load insights',
        isLoadingInsights: false,
      });
    }
  },

  // Energy
  energyLogs: [],
  energyAvgToday: null,
  energyLastToday: null,
  isLoadingEnergy: false,
  energyError: null,

  fetchTodayEnergy: async () => {
    set({ isLoadingEnergy: true, energyError: null });
    try {
      const data = await import('./services/energyService').then(m => m.getTodayEnergy());
      set({
        energyLogs: data.logs,
        energyAvgToday: data.avgValue,
        energyLastToday: data.lastValue,
        isLoadingEnergy: false,
      });
    } catch (error) {
      console.error('Failed to fetch energy:', error);
      set({
        energyError: error instanceof Error ? error.message : 'Failed to load energy',
        isLoadingEnergy: false,
      });
    }
  },

  addEnergyLog: async (value: number, source?: 'today' | 'review' | 'onboarding') => {
    try {
      await import('./services/energyService').then(m => m.createEnergyLog(value, source));
      await get().fetchTodayEnergy();
    } catch (error) {
      console.error('Failed to add energy log:', error);
      throw error;
    }
  },

  // Habit
  habit: null,
  habitLogs: [],
  habitStats: null,
  isLoadingHabit: false,
  habitError: null,

  fetchHabit: async () => {
    set({ isLoadingHabit: true, habitError: null });
    try {
      const data = await import('./services/habitService').then(m => m.getHabit());
      set({
        habit: data.habit,
        habitLogs: data.logs,
        habitStats: data.stats,
        isLoadingHabit: false,
      });
    } catch (error) {
      console.error('Failed to fetch habit:', error);
      set({
        habitError: error instanceof Error ? error.message : 'Failed to load habit',
        isLoadingHabit: false,
      });
    }
  },

  createHabit: async (input) => {
    set({ isLoadingHabit: true, habitError: null });
    try {
      const data = await import('./services/habitService').then(m => m.createHabit(input));
      set({
        habit: data.habit,
        habitLogs: data.logs,
        habitStats: data.stats,
        isLoadingHabit: false,
      });
    } catch (error) {
      console.error('Failed to create habit:', error);
      set({
        habitError: error instanceof Error ? error.message : 'Failed to create habit',
        isLoadingHabit: false,
      });
      throw error;
    }
  },

  updateHabit: async (input) => {
    set({ isLoadingHabit: true, habitError: null });
    try {
      const data = await import('./services/habitService').then(m => m.updateHabit(input));
      set({
        habit: data.habit,
        habitLogs: data.logs,
        habitStats: data.stats,
        isLoadingHabit: false,
      });
    } catch (error) {
      console.error('Failed to update habit:', error);
      set({
        habitError: error instanceof Error ? error.message : 'Failed to update habit',
        isLoadingHabit: false,
      });
      throw error;
    }
  },

  deleteHabit: async () => {
    set({ isLoadingHabit: true, habitError: null });
    try {
      await import('./services/habitService').then(m => m.deleteHabit());
      set({
        habit: null,
        habitLogs: [],
        habitStats: null,
        isLoadingHabit: false,
      });
    } catch (error) {
      console.error('Failed to delete habit:', error);
      set({
        habitError: error instanceof Error ? error.message : 'Failed to delete habit',
        isLoadingHabit: false,
      });
      throw error;
    }
  },

  markHabitToday: async () => {
    set({ isLoadingHabit: true, habitError: null });
    try {
      const data = await import('./services/habitService').then(m => m.markHabitToday());
      set({
        habit: data.habit,
        habitLogs: data.logs,
        habitStats: data.stats,
        isLoadingHabit: false,
      });
    } catch (error) {
      console.error('Failed to mark habit today:', error);
      set({
        habitError: error instanceof Error ? error.message : 'Failed to mark today',
        isLoadingHabit: false,
      });
      throw error;
    }
  },

  // App initialization
  initializeApp: async () => {
    // Load all data in parallel
    const { fetchTasks, fetchMoodLogs, fetchAIInsights, fetchHabit, fetchTodayEnergy } = get();

    try {
      await Promise.all([
        fetchTasks(),
        fetchMoodLogs(7),
        fetchAIInsights(),
        fetchHabit(),
        fetchTodayEnergy(),
      ]);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  },
}));
