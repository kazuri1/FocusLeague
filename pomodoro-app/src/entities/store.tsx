import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  note?: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  scheduledDate?: Date;
  status: "todo" | "in-progress" | "done";
  createdAt: Date;
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  type: "focus" | "short-break" | "long-break";
  startedAt: Date;
  duration: number;
  completed: boolean;
}

interface AppState {
  projects: Project[];
  tasks: Task[];
  sessions: PomodoroSession[];
}

interface AppContextType extends AppState {
  addProject: (name: string, description?: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedPomodoros' | 'status'>) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  addSession: (session: Omit<PomodoroSession, 'id'>) => void;
  getTodayTasks: () => Task[];
  deleteProject: (projectId: string) => void;
}

 

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('fl_projects');
    if (saved) {
      try {
        return JSON.parse(saved).map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('fl_tasks');
    if (saved) {
      try {
        return JSON.parse(saved).map((t: any) => ({ 
          ...t, 
          createdAt: new Date(t.createdAt),
          scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    const saved = localStorage.getItem('fl_sessions');
    if (saved) {
      try {
        return JSON.parse(saved).map((s: any) => ({ 
          ...s, 
          startedAt: new Date(s.startedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('fl_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('fl_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('fl_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const addProject = (name: string, description?: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
  };

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'completedPomodoros' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      completedPomodoros: 0,
      status: "todo",
      createdAt: new Date(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const addSession = (sessionData: Omit<PomodoroSession, 'id'>) => {
    const newSession: PomodoroSession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };
    setSessions(prev => [...prev, newSession]);

    // If it's a focus session and completed, increment the task's completedPomodoros
    if (newSession.type === 'focus' && newSession.completed && newSession.taskId) {
      setTasks(prev => prev.map(t => 
        t.id === newSession.taskId 
          ? { ...t, completedPomodoros: t.completedPomodoros + 1 } 
          : t
      ));
    }
  };

  const getTodayTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (!task.scheduledDate) return false;
      const taskDate = new Date(task.scheduledDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime() && task.status !== "done";
    });
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // Optional: Also cleanup associated tasks, but simplest is just project removal
    // setTasks(prev => prev.filter(t => t.projectId !== projectId));
  };

  return (
    <AppContext.Provider value={{ projects, tasks, sessions, addProject, addTask, updateTaskStatus, addSession, getTodayTasks, deleteProject }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
