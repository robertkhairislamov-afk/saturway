import { useState, useMemo, useCallback } from 'react';
import { Plus, Circle, CheckCircle2, Clock, Flag, ListTodo, Pencil, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { RippleButton } from './RippleButton';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TaskSkeleton, StatCardSkeleton } from './ui/skeleton';
import { AnimatedCard, StaggerContainer, staggerItemVariants } from './AnimatedScreen';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { EmptyState } from './EmptyState';
import { GradientHeader } from './GradientHeader';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { useStore } from '../store';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  time?: string;
  energy?: 'low' | 'medium' | 'high';
}

export function TaskList() {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'important'>('all');
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'priority'>('default');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Get data from store
  const storeTasks = useStore((state) => state.tasks) || [];
  const isLoadingTasks = useStore((state) => state.isLoadingTasks);
  const tasksError = useStore((state) => state.tasksError);
  const completeTask = useStore((state) => state.completeTask);
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);

  // Map store tasks to component format
  const tasks: Task[] = useMemo(() => {
    const safeTasks = Array.isArray(storeTasks) ? storeTasks : [];
    return safeTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.status === 'completed',
      priority: task.priority as 'low' | 'medium' | 'high',
    }));
  }, [storeTasks]);

  const toggleTask = useCallback(async (id: string) => {
    try {
      await completeTask(id);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [completeTask]);

  const changePriority = useCallback(async (taskId: string, newPriority: 'low' | 'medium' | 'high') => {
    try {
      await updateTask(taskId, { priority: newPriority });
      setEditingPriorityId(null);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }, [updateTask]);

  const handleDelete = useCallback(async () => {
    if (deletingTaskId) {
      try {
        await deleteTask(deletingTaskId);
        setDeletingTaskId(null);
        setExpandedTaskId(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  }, [deletingTaskId, deleteTask]);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      case 'low': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  }, []);

  const getPriorityLabel = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return t('tasks.priority.high');
      case 'medium': return t('tasks.priority.medium');
      case 'low': return t('tasks.priority.low');
      default: return priority;
    }
  }, [t]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    if (filter === 'important') return task.priority === 'high';
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0; // default order
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    important: tasks.filter(t => t.priority === 'high').length,
  };

  // Show error state
  if (tasksError) {
    return (
      <div className="space-y-6">
        <GradientHeader
          title={t('tasks.title')}
          subtitle={t('tasks.subtitle')}
          icon={<ListTodo className="h-6 w-6" />}
          variant="sky"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800 font-medium">{t('error.title')}</p>
          <p className="text-red-600 text-sm mt-2">{tasksError}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingTasks && tasks.length === 0) {
    return (
      <div className="space-y-6">
        <GradientHeader
          title={t('tasks.title')}
          subtitle={t('loading.tasks')}
          icon={<ListTodo className="h-6 w-6" />}
          variant="sky"
        />
        {/* Stats Skeletons */}
        <div className="grid grid-cols-4 gap-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        {/* Task Skeletons */}
        <div className="space-y-2">
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <GradientHeader
        title={t('tasks.title')}
        subtitle={`${stats.active} ${t('tasks.active').toLowerCase()}, ${stats.completed} ${t('tasks.completed').toLowerCase()}`}
        icon={<ListTodo className="h-6 w-6" />}
        variant="sky"
      />

      {/* Add Task Button */}
      <AnimatedOceanCard delay={0.1}>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="w-full p-4 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="rounded-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] p-2">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: 500 }}>
            {t('tasks.addNew')}
          </span>
        </motion.button>
      </AnimatedOceanCard>

      {/* Create Task Modal */}
      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Stats with Ocean Cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t('tasks.all'), value: stats.total, color: '#4A9FD8' },
          { label: t('tasks.active'), value: stats.active, color: '#52C9C1' },
          { label: t('tasks.completed'), value: stats.completed, color: '#5AB5E8' },
          { label: t('tasks.important'), value: stats.important, color: '#EF4444' },
        ].map((stat, index) => (
          <AnimatedOceanCard key={index} delay={0.2 + index * 0.05}>
            <div className="p-2.5 text-center">
              <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                {stat.label}
              </p>
              <motion.p
                style={{ fontSize: '18px', fontWeight: 700 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  delay: 0.3 + index * 0.05,
                  stiffness: 200,
                }}
              >
                {stat.value}
              </motion.p>
            </div>
          </AnimatedOceanCard>
        ))}
      </div>

      {/* Filters and Sorting */}
      <AnimatedOceanCard delay={0.3}>
        <div className="p-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <div className="flex items-center gap-2">
              <TabsList className="flex-1 !flex !flex-row !w-full h-auto p-1">
                <TabsTrigger value="all" className="flex-1 text-xs py-1.5">{t('tasks.all')}</TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs py-1.5">{t('tasks.active')}</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 text-xs py-1.5">{t('tasks.completed')}</TabsTrigger>
                <TabsTrigger value="important" className="flex-1 text-xs py-1.5">{t('tasks.important')}</TabsTrigger>
              </TabsList>
              <motion.button
                onClick={() => setSortBy(sortBy === 'default' ? 'priority' : 'default')}
                className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                  sortBy === 'priority'
                    ? 'bg-[#4A9FD8] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Flag className="h-4 w-4" />
              </motion.button>
            </div>

          </Tabs>
        </div>
      </AnimatedOceanCard>

      {/* Tasks Content */}
      <div className="space-y-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsContent value="all" className="mt-0">
          {sortedTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title={t('tasks.empty')}
              description={t('tasks.emptyDescription')}
              actionLabel={t('tasks.addNew')}
              onAction={() => document.querySelector<HTMLInputElement>('input')?.focus()}
            />
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, index) => (
                <AnimatedOceanCard key={task.id} delay={0.05 * index} showWaves={false}>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <motion.button
                        onClick={() => toggleTask(task.id)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-[#4A9FD8]" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </motion.button>

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={task.completed ? 'text-muted-foreground line-through' : ''}
                            style={{ fontSize: '14px', fontWeight: 500 }}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {task.time && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span style={{ fontSize: '12px' }}>{task.time}</span>
                            </div>
                          )}

                          {/* Priority Badge - Click to Edit */}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {editingPriorityId === task.id ? (
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map((priority) => (
                                  <motion.button
                                    key={priority}
                                    onClick={() => changePriority(task.id, priority)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                      priority === 'high'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : priority === 'medium'
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Flag className="h-3 w-3" />
                                    {getPriorityLabel(priority)}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${getPriorityColor(task.priority)}`}
                                onClick={() => setEditingPriorityId(task.id)}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Expanded Description and Actions */}
                        {expandedTaskId === task.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border/50 space-y-3"
                          >
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setExpandedTaskId(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5 transition-all text-sm font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Редактировать</span>
                              </motion.button>
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTaskId(task.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-sm font-medium text-red-600"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Удалить</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedOceanCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {sortedTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title={t('tasks.empty')}
              description={t('tasks.emptyDescription')}
              actionLabel={t('tasks.addNew')}
              onAction={() => document.querySelector<HTMLInputElement>('input')?.focus()}
            />
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, index) => (
                <AnimatedOceanCard key={task.id} delay={0.05 * index} showWaves={false}>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <motion.button
                        onClick={() => toggleTask(task.id)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-[#4A9FD8]" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </motion.button>

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={task.completed ? 'text-muted-foreground line-through' : ''}
                            style={{ fontSize: '14px', fontWeight: 500 }}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {task.time && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span style={{ fontSize: '12px' }}>{task.time}</span>
                            </div>
                          )}

                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {editingPriorityId === task.id ? (
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map((priority) => (
                                  <motion.button
                                    key={priority}
                                    onClick={() => changePriority(task.id, priority)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                      priority === 'high'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : priority === 'medium'
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Flag className="h-3 w-3" />
                                    {getPriorityLabel(priority)}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${getPriorityColor(task.priority)}`}
                                onClick={() => setEditingPriorityId(task.id)}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {expandedTaskId === task.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border/50 space-y-3"
                          >
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setExpandedTaskId(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5 transition-all text-sm font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Редактировать</span>
                              </motion.button>
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTaskId(task.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-sm font-medium text-red-600"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Удалить</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedOceanCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {sortedTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title={t('tasks.empty')}
              description={t('tasks.emptyDescription')}
              actionLabel={t('tasks.addNew')}
              onAction={() => document.querySelector<HTMLInputElement>('input')?.focus()}
            />
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, index) => (
                <AnimatedOceanCard key={task.id} delay={0.05 * index} showWaves={false}>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <motion.button
                        onClick={() => toggleTask(task.id)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-[#4A9FD8]" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </motion.button>

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={task.completed ? 'text-muted-foreground line-through' : ''}
                            style={{ fontSize: '14px', fontWeight: 500 }}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {task.time && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span style={{ fontSize: '12px' }}>{task.time}</span>
                            </div>
                          )}

                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {editingPriorityId === task.id ? (
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map((priority) => (
                                  <motion.button
                                    key={priority}
                                    onClick={() => changePriority(task.id, priority)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                      priority === 'high'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : priority === 'medium'
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Flag className="h-3 w-3" />
                                    {getPriorityLabel(priority)}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${getPriorityColor(task.priority)}`}
                                onClick={() => setEditingPriorityId(task.id)}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {expandedTaskId === task.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border/50 space-y-3"
                          >
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setExpandedTaskId(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5 transition-all text-sm font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Редактировать</span>
                              </motion.button>
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTaskId(task.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-sm font-medium text-red-600"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Удалить</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedOceanCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="important" className="mt-4">
          {sortedTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title={t('tasks.empty')}
              description={t('tasks.emptyDescription')}
              actionLabel={t('tasks.addNew')}
              onAction={() => document.querySelector<HTMLInputElement>('input')?.focus()}
            />
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, index) => (
                <AnimatedOceanCard key={task.id} delay={0.05 * index} showWaves={false}>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <motion.button
                        onClick={() => toggleTask(task.id)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-[#4A9FD8]" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </motion.button>

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={task.completed ? 'text-muted-foreground line-through' : ''}
                            style={{ fontSize: '14px', fontWeight: 500 }}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {task.time && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span style={{ fontSize: '12px' }}>{task.time}</span>
                            </div>
                          )}

                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {editingPriorityId === task.id ? (
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map((priority) => (
                                  <motion.button
                                    key={priority}
                                    onClick={() => changePriority(task.id, priority)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                      priority === 'high'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : priority === 'medium'
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Flag className="h-3 w-3" />
                                    {getPriorityLabel(priority)}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${getPriorityColor(task.priority)}`}
                                onClick={() => setEditingPriorityId(task.id)}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {expandedTaskId === task.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border/50 space-y-3"
                          >
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setExpandedTaskId(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50 hover:bg-[#4A9FD8]/5 transition-all text-sm font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Редактировать</span>
                              </motion.button>
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTaskId(task.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-sm font-medium text-red-600"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Удалить</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedOceanCard>
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeletingTaskId(null)}
        >
          <motion.div
            className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }} className="mb-2">
                Удалить задачу?
              </h3>
              <p className="text-muted-foreground text-sm">
                Это действие нельзя отменить. Задача будет удалена навсегда.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setDeletingTaskId(null)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-border/50 hover:bg-muted/50 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 500 }}>Отмена</span>
              </motion.button>
              <motion.button
                onClick={handleDelete}
                disabled={isLoadingTasks}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Удалить</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}