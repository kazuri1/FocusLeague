import React from 'react';
import { useAppStore } from '../../entities/store';

export const AnalyticsModule: React.FC = () => {
  const { sessions, tasks, projects } = useAppStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); 
  
  const pomodorosToday = sessions.filter(s => 
    s.type === 'focus' && 
    s.completed && 
    new Date(s.startedAt).getTime() >= today.getTime()
  ).length;

  const pomodorosThisWeek = sessions.filter(s => 
    s.type === 'focus' && 
    s.completed && 
    new Date(s.startedAt).getTime() >= startOfWeek.getTime()
  ).length;

  const focusTimeTodayHrs = (pomodorosToday * 25) / 60;


  const projectFocusTimes = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id);
    const pTaskIds = pTasks.map(t => t.id);
    
    const pSessions = sessions.filter(s => 
      s.type === 'focus' && 
      s.completed && 
      s.taskId && 
      pTaskIds.includes(s.taskId)
    );

    return {
      name: p.name,
      hours: (pSessions.length * 25) / 60
    };
  }).filter(p => p.hours > 0).sort((a, b) => b.hours - a.hours);

  return (
    <div className="analytics-module">
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics</h1>
        <p className="analytics-subtitle">Track your focus and productivity over time.</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3 className="analytics-card-title">Focus Time Today</h3>
          <p className="analytics-card-value">{focusTimeTodayHrs.toFixed(1)} <span className="analytics-card-unit">h</span></p>
        </div>

        <div className="analytics-card">
          <h3 className="analytics-card-title">Pomodoros This Week</h3>
          <p className="analytics-card-value">{pomodorosThisWeek} <span className="analytics-card-unit">🍅</span></p>
        </div>
      </div>

      <div className="analytics-card" style={{ padding: '2rem' }}>
        <h3 className="analytics-card-title" style={{ marginBottom: '1.5rem' }}>Time Spent by Project (All Time)</h3>
        {projectFocusTimes.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>No focus data recorded yet.</p>
        ) : (
          <div className="analytics-list">
            {projectFocusTimes.map((p, i) => (
              <div key={i} className="analytics-list-item">
                <span className="analytics-list-name">{p.name}</span>
                <span className="analytics-list-hours">{p.hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
