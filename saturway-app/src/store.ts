import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  aiSuggestion?: string;
}

interface MoodLog {
  id: string;
  energy: number;
  focus: number;
  timestamp: Date;
}

interface AIInsight {
  id: string;
  type: 'tip' | 'warning' | 'success';
  message: string;
  timestamp: Date;
}

interface AppState {
  tasks: Task[];
  moodLogs: MoodLog[];
  aiInsights: AIInsight[];
  currentMood: { energy: number; focus: number };

  initializeApp: () => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  logMood: (energy: number, focus: number) => void;
  setCurrentMood: (energy: number, focus: number) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [],
  moodLogs: [],
  aiInsights: [],
  currentMood: { energy: 7, focus: 6 },

  initializeApp: () => {
    // Mock данные для тестирования
    set({
      tasks: [
        {
          id: '1',
          title: 'Позвонить инвестору',
          description: 'Обсудить раунд финансирования',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          aiSuggestion: 'Лучшее время: 10:00-11:00 (пик энергии)'
        },
        {
          id: '2',
          title: 'Подготовить презентацию',
          priority: 'high',
          status: 'in_progress',
          dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
        {
          id: '3',
          title: 'Code review PR #234',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: '4',
          title: 'Обновить документацию',
          priority: 'low',
          status: 'pending',
          aiSuggestion: 'Перенесите на послеобеденное время'
        },
        {
          id: '5',
          title: 'Медитация 10 минут',
          priority: 'medium',
          status: 'completed',
        }
      ],
      moodLogs: [
        { id: '1', energy: 8, focus: 7, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
        { id: '2', energy: 6, focus: 5, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { id: '3', energy: 7, focus: 6, timestamp: new Date() },
      ],
      aiInsights: [
        {
          id: '1',
          type: 'tip',
          message: 'Ваша продуктивность выше в первой половине дня. Запланируйте сложные задачи на утро.',
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'warning',
          message: 'Уровень энергии снижается. Рекомендую 5-минутный перерыв.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        }
      ]
    });
  },

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, { ...task, id: Date.now().toString() }]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    )
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== id)
  })),

  logMood: (energy, focus) => set((state) => ({
    moodLogs: [...state.moodLogs, {
      id: Date.now().toString(),
      energy,
      focus,
      timestamp: new Date()
    }],
    currentMood: { energy, focus }
  })),

  setCurrentMood: (energy, focus) => set({
    currentMood: { energy, focus }
  })
}));
