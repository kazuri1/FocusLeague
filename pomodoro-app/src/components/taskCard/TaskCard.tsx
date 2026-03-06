import React from 'react';
import { type Task } from '../../entities/store';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  selected?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, selected }) => {
  return (
    <div 
      onClick={onClick}
      className={`task-card ${selected ? 'task-card-selected' : ''}`}
    >
      <div className="task-card-header">
        <h3 className="task-card-title">{task.title}</h3>
        {task.status === 'done' && (
          <span className="task-card-done-badge">
            Done
          </span>
        )}
      </div>
      {task.note && <p className="task-card-note">{task.note}</p>}
      
      <div className="task-card-footer">
        <span className="task-card-progress-label">Progress:</span>
        <span className="task-card-progress-value">
          {task.completedPomodoros} / {task.estimatedPomodoros} 🍅
        </span>
      </div>
    </div>
  );
};
