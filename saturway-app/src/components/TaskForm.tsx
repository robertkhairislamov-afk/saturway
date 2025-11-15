import { useState } from 'react';
import { X, Calendar, Flag } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useStore } from '../store';

interface TaskFormProps {
  onClose: () => void;
}

export function TaskForm({ onClose }: TaskFormProps) {
  const addTask = useStore((state) => state.addTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      WebApp.showAlert('Пожалуйста, введите название задачи');
      return;
    }

    let taskDueDate: Date | undefined;
    if (dueDate) {
      const dateTimeString = dueTime
        ? `${dueDate}T${dueTime}`
        : `${dueDate}T12:00`;
      taskDueDate = new Date(dateTimeString);
    }

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status: 'pending',
      dueDate: taskDueDate,
    });

    WebApp.HapticFeedback.notificationOccurred('success');

    onClose();
  };

  const priorityOptions = [
    { value: 'low', label: 'Низкий', color: '#4ECDC4' },
    { value: 'medium', label: 'Средний', color: '#FFD93D' },
    { value: 'high', label: 'Высокий', color: '#FF6B9D' },
  ] as const;

  return (
    <div className="task-form-overlay" onClick={onClose}>
      <div className="task-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="task-form-header">
          <h2>Новая задача</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Название *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="form-input"
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительные детали (опционально)"
              className="form-textarea"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>
              <Flag size={16} />
              Приоритет
            </label>
            <div className="priority-buttons">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`priority-btn ${priority === option.value ? 'active' : ''}`}
                  onClick={() => setPriority(option.value)}
                  style={{
                    borderColor: priority === option.value ? option.color : 'transparent',
                    backgroundColor: priority === option.value
                      ? `${option.color}15`
                      : 'transparent'
                  }}
                >
                  <span className="priority-dot" style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <Calendar size={16} />
              Срок выполнения
            </label>
            <div className="date-time-inputs">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input date-input"
                min={new Date().toISOString().split('T')[0]}
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="form-input time-input"
                disabled={!dueDate}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Создать задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
