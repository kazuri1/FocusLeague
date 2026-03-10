import React, { useState, useEffect } from 'react';
import { useAppStore, type Task } from '../../entities/store';

interface TimerProps {
  task: Task | null;
}

const POMODORO_MINUTES = 25;
const POMODORO_SECONDS = POMODORO_MINUTES * 60;

export const Timer: React.FC<TimerProps> = ({ task }) => {
  const { addSession } = useAppStore();
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('pomodoro_timeLeft');
    const lastTick = localStorage.getItem('pomodoro_lastTick');
    const isRun = localStorage.getItem('pomodoro_isRunning') === 'true';
    if (saved) {
      const parsedTime = parseInt(saved, 10);
      if (isRun && lastTick) {
         const elapsed = Math.floor((Date.now() - parseInt(lastTick, 10)) / 1000);
         return Math.max(0, parsedTime - elapsed);
      }
      return parsedTime;
    }
    return POMODORO_SECONDS;
  });

  const [isRunning, setIsRunning] = useState(() => {
    return localStorage.getItem('pomodoro_isRunning') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pomodoro_timeLeft', timeLeft.toString());
    localStorage.setItem('pomodoro_lastTick', Date.now().toString());
    localStorage.setItem('pomodoro_isRunning', isRunning.toString());
  }, [timeLeft, isRunning]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      if (task) {
        addSession({
          taskId: task.id,
          type: "focus",
          startedAt: new Date(Date.now() - POMODORO_SECONDS * 1000),
          duration: POMODORO_MINUTES,
          completed: true,
        });
      }
      setTimeLeft(POMODORO_SECONDS); // reset for next
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, task, addSession]);

  const toggleTimer = () => {
    if (!task) {
        alert('Please select a task before starting a pomorodo session');
        return;
    }
    setIsRunning(!isRunning);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  let btnClass = isRunning ? "timer-btn timer-btn-pause" : "timer-btn timer-btn-start";

  return (
    <div className="timer-container">
      <div className="timer-display">
        {formatTime(timeLeft)}
      </div>
      <button
        onClick={toggleTimer}
        className={btnClass}
      >
        {isRunning ? 'Pause' : 'Start Focus'}
      </button>
      {!task && (
        <p className="timer-message">Select a task below to start</p>
      )}
    </div>
  );
};
