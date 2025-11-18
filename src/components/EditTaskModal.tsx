import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Input } from './ui/input';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomTimePicker } from './CustomTimePicker';
import { useStore } from '../store';
import type { Task } from '../services/taskService';

interface EditTaskModalProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
  };
  onClose: () => void;
}

export function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task.priority);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const updateTask = useStore((state) => state.updateTask);
  const isLoadingTasks = useStore((state) => state.isLoadingTasks);

  const handleSubmit = async () => {
    if (title.trim()) {
      try {
        let taskDueDate: Date | undefined;
        if (dueDate) {
          const dateTimeString = dueTime
            ? `${dueDate}T${dueTime}`
            : `${dueDate}T12:00`;
          taskDueDate = new Date(dateTimeString);
        }

        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: taskDueDate,
        });

        onClose();
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-background rounded-t-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>
              Редактировать задачу
            </h3>
            <motion.button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span style={{ fontSize: '24px' }}>×</span>
            </motion.button>
          </div>
        </div>

        {/* Form Content */}
        <div className={`p-6 space-y-5 max-h-[60vh] overflow-y-auto overflow-x-visible ${
          isDatePickerOpen || isTimePickerOpen ? 'pb-6' : 'pb-40'
        }`}>
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Название *
            </label>
            <Input
              placeholder="Например: Позвонить клиенту"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Описание
            </label>
            <textarea
              placeholder="Дополнительная информация..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-[#4A9FD8]/30 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Приоритет
            </label>
            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={() => setPriority('low')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  priority === 'low'
                    ? 'border-green-500 bg-green-500/10 text-green-600 font-medium'
                    : 'border-border/50 hover:border-green-500/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '14px' }}>Низкий</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setPriority('medium')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  priority === 'medium'
                    ? 'border-[#4A9FD8] bg-[#4A9FD8]/10 text-[#4A9FD8] font-medium'
                    : 'border-border/50 hover:border-[#4A9FD8]/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '14px' }}>Средний</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setPriority('high')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  priority === 'high'
                    ? 'border-red-500 bg-red-500/10 text-red-600 font-medium'
                    : 'border-border/50 hover:border-red-500/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '14px' }}>Высокий</span>
              </motion.button>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Срок выполнения
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <CustomDatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  minDate={new Date().toISOString().split('T')[0]}
                  onOpenChange={setIsDatePickerOpen}
                />
              </div>
              {!isDatePickerOpen && (
                <div className="flex-1">
                  <CustomTimePicker
                    value={dueTime}
                    onChange={setDueTime}
                    disabled={!dueDate}
                    onOpenChange={setIsTimePickerOpen}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {!isDatePickerOpen && !isTimePickerOpen && (
        <div className="sticky bottom-0 p-6 border-t border-border/50 bg-background flex gap-3 z-10">
          <motion.button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-border/50 hover:bg-muted/50 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{ fontSize: '16px', fontWeight: 500 }}>
              Отмена
            </span>
          </motion.button>
          <motion.button
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
            disabled={!title.trim() || isLoadingTasks}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              Сохранить изменения
            </span>
          </motion.button>
        </div>
        )}
      </motion.div>
    </div>
  );
}
