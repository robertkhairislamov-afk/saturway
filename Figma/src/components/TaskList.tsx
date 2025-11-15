import { useState } from 'react';
import { Plus, Circle, CheckCircle2, Clock, Flag } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  time?: string;
  energy?: 'low' | 'medium' | 'high';
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Review project proposal',
      completed: false,
      priority: 'high',
      time: '9:00 AM',
      energy: 'high',
    },
    {
      id: '2',
      title: 'Team standup meeting',
      completed: true,
      priority: 'medium',
      time: '10:30 AM',
      energy: 'medium',
    },
    {
      id: '3',
      title: 'Write blog post draft',
      completed: false,
      priority: 'medium',
      time: '2:00 PM',
      energy: 'high',
    },
    {
      id: '4',
      title: 'Respond to emails',
      completed: false,
      priority: 'low',
      time: '4:00 PM',
      energy: 'low',
    },
    {
      id: '5',
      title: 'Evening meditation',
      completed: false,
      priority: 'medium',
      time: '7:00 PM',
      energy: 'low',
    },
  ]);

  const [newTask, setNewTask] = useState('');

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([
        ...tasks,
        {
          id: Date.now().toString(),
          title: newTask,
          completed: false,
          priority: 'medium',
        },
      ]);
      setNewTask('');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-[#FF6B6B] bg-[#FF6B6B]/10';
      case 'medium':
        return 'text-[#FFD93D] bg-[#FFD93D]/10';
      case 'low':
        return 'text-[#52C9C1] bg-[#52C9C1]/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getEnergyColor = (energy?: string) => {
    switch (energy) {
      case 'high':
        return 'text-[#52C9C1]';
      case 'medium':
        return 'text-[#FFD93D]';
      case 'low':
        return 'text-[#5AB5E8]';
      default:
        return 'text-muted-foreground';
    }
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-1">Today's Tasks</h2>
        <p className="text-muted-foreground">
          {incompleteTasks.length} tasks remaining
        </p>
      </div>

      {/* Add Task Input */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            className="border-border/50"
          />
          <Button onClick={addTask} className="bg-[#4A9FD8] hover:bg-[#4A9FD8]/90">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {incompleteTasks.map((task) => (
          <Card
            key={task.id}
            className="border-border/50 p-4 transition-all hover:border-[#4A9FD8]/30 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-0.5 text-muted-foreground transition-colors hover:text-[#4A9FD8]"
              >
                <Circle className="h-5 w-5" />
              </button>
              <div className="flex-1 space-y-2">
                <div>{task.title}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {task.time && (
                    <Badge variant="outline" className="gap-1 border-border/50">
                      <Clock className="h-3 w-3" />
                      {task.time}
                    </Badge>
                  )}
                  {task.priority && (
                    <Badge className={`gap-1 ${getPriorityColor(task.priority)}`}>
                      <Flag className="h-3 w-3" />
                      {task.priority}
                    </Badge>
                  )}
                  {task.energy && (
                    <div className={`flex items-center gap-1 ${getEnergyColor(task.energy)}`} style={{ fontSize: '12px' }}>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-3 w-1 rounded-full ${
                              i <= (task.energy === 'high' ? 3 : task.energy === 'medium' ? 2 : 1)
                                ? 'bg-current opacity-100'
                                : 'bg-current opacity-30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="text-muted-foreground" style={{ fontSize: '14px' }}>
            Completed ({completedTasks.length})
          </div>
          {completedTasks.map((task) => (
            <Card
              key={task.id}
              className="border-border/30 bg-muted/30 p-4 opacity-60"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 text-[#52C9C1]"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <div className="flex-1 line-through">{task.title}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
