import React, { useState } from 'react';
import { useAppStore, type Task } from '../../entities/store';
import { Timer } from '../../components/timer/Timer';
import { TaskCard } from '../../components/taskCard/TaskCard';

export const FocusModule: React.FC = () => {
  const { getTodayTasks } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const todaysTasks = getTodayTasks();

  return (
    <div className="focus-module">
      <Timer task={activeTask} />
      
      <div>
        <h2 className="focus-today-title">Today's Focus</h2>
        {todaysTasks.length === 0 ? (
          <div className="focus-empty">
            No tasks scheduled for today. Head to Projects to add some.
          </div>
        ) : (
          <div className="focus-task-list">
            {todaysTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                selected={activeTask?.id === task.id}
                onClick={() => setActiveTask(task)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
