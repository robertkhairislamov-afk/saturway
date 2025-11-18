import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useStore } from '../store';
import WebApp from '@twa-dev/sdk';

export function AddTaskForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

  const { addTask } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      WebApp.showAlert('Введите название задачи');
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

    // Сброс формы
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setDueTime('');
    setIsOpen(false);

    WebApp.HapticFeedback.notificationOccurred('success');
    WebApp.showAlert('Задача добавлена! ✅');
  };

  if (!isOpen) {
    return (
      <button className="add-task-fab" onClick={() => setIsOpen(true)}>
        <Plus size={24} />
      </button>
    );
  }

  return (
    <div className="add-task-modal">
      <div className="add-task-overlay" onClick={() => setIsOpen(false)} />
      <div className="add-task-content">
        <div className="add-task-header">
          <h3>Новая задача</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Позвонить клиенту"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Приоритет</label>
            <div className="priority-buttons">
              <button
                type="button"
                className={`priority-btn priority-low ${priority === 'low' ? 'active' : ''}`}
                onClick={() => setPriority('low')}
              >
                Низкий
              </button>
              <button
                type="button"
                className={`priority-btn priority-medium ${priority === 'medium' ? 'active' : ''}`}
                onClick={() => setPriority('medium')}
              >
                Средний
              </button>
              <button
                type="button"
                className={`priority-btn priority-high ${priority === 'high' ? 'active' : ''}`}
                onClick={() => setPriority('high')}
              >
                Высокий
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Срок выполнения</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ flex: 1 }}
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                style={{ flex: 1 }}
                placeholder="Время"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-submit">
              Создать задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
