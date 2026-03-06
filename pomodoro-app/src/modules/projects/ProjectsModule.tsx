import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TaskCard } from '../../components/taskCard/TaskCard';
import { X } from 'lucide-react';

export const ProjectsModule: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskScheduledDate, setNewTaskScheduledDate] = useState('');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: true })
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectTasks = tasks.filter(t => t.project_id === activeProjectId);

  const generateRandomColor = () => {
      const colors = ['#e1f5fe', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa', '#e8eaf6'];
      return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      const newProject = {
          name: newProjectName.trim(),
          color: generateRandomColor()
      };
      const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
      if (data && !error) {
          setProjects(prev => [...prev, data]);
      }
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreatingProject(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && activeProjectId) {
      const newTask = {
          title: newTaskTitle.trim(),
          est_pomodoros: newTaskPomodoros,
          completed_pomodoros: 0,
          is_completed: false,
          project_id: activeProjectId,
          due_date: newTaskDueDate || null,
          scheduled_date: newTaskScheduledDate || null
      };
      const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
      if (data && !error) {
          setTasks(prev => [...prev, data]);
      }
      setNewTaskTitle('');
      setNewTaskPomodoros(1);
      setNewTaskDueDate('');
      setNewTaskScheduledDate('');
      setIsCreatingTask(false);
    }
  };



  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow browser to grab the ghost image before we change opacity
    setTimeout(() => setDraggingId(taskId), 0);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, column: 'todo' | 'in-progress' | 'done') => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingId(null);
    
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let updates: any = {};
    if (column === 'todo') {
      updates = { is_completed: false, completed_pomodoros: 0 };
    } else if (column === 'in-progress') {
      updates = { is_completed: false, completed_pomodoros: Math.max(1, task.completed_pomodoros || 0) };
    } else if (column === 'done') {
      updates = { is_completed: true };
    }

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    // Database update
    await supabase.from('tasks').update(updates).eq('id', taskId);
  };

  if (isLoading) {
      return (
          <div className="projects-module" style={{ textAlign: 'center', opacity: 0.6, padding: '4rem 0' }}>
              Loading projects...
          </div>
      );
  }

  // Modal content moved below the main return
  const renderProjectModal = () => {
    if (!activeProject) return null;

    return (
      <div className="project-modal-backdrop" onClick={() => setActiveProjectId(null)}>
        <div className="project-modal-content" onClick={e => e.stopPropagation()}>
          <button 
            className="project-modal-close"
            onClick={() => setActiveProjectId(null)}
          >
            <X size={20} />
          </button>

          <div className="projects-detail-header">
            <h1 className="projects-detail-title">{activeProject.name}</h1>
            {activeProject.description && (
              <p className="projects-detail-desc">{activeProject.description}</p>
            )}
          </div>

          <div>
            <div className="tasks-header">
              <h2>Project Tasks</h2>
              {!isCreatingTask && (
                <button 
                  onClick={() => setIsCreatingTask(true)}
                  className="btn-primary"
                >
                  + New Task
                </button>
              )}
            </div>

            {isCreatingTask && (
              <form onSubmit={handleCreateTask} className="projects-create-form">
                <label className="form-label">Task Title</label>
                <div className="form-input-group">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="E.g., Design database schema..."
                    className="form-input"
                    autoFocus
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTaskPomodoros}
                    onChange={(e) => setNewTaskPomodoros(parseInt(e.target.value))}
                    className="form-input"
                    style={{ maxWidth: '100px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem' }}>Scheduled</label>
                       <input
                         type="date"
                         value={newTaskScheduledDate}
                         onChange={(e) => setNewTaskScheduledDate(e.target.value)}
                         className="form-input"
                         style={{ padding: '0.4rem' }}
                       />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem' }}>Due</label>
                       <input
                         type="date"
                         value={newTaskDueDate}
                         onChange={(e) => setNewTaskDueDate(e.target.value)}
                         className="form-input"
                         style={{ padding: '0.4rem' }}
                       />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: 'auto' }} disabled={!newTaskTitle.trim()}>
                    Add
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    style={{ marginTop: 'auto' }}
                    onClick={() => setIsCreatingTask(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {activeProjectTasks.length === 0 && !isCreatingTask ? (
              <div className="tasks-empty">
                No tasks in this project yet. Add one to get started.
              </div>
            ) : (
              <div className="tasks-grid">
                {activeProjectTasks.map(task => (
                  <TaskCard key={task.id} task={{
                    id: task.id,
                    projectId: task.project_id,
                    title: task.title,
                    note: task.note,
                    estimatedPomodoros: task.est_pomodoros,
                    completedPomodoros: task.completed_pomodoros,
                    scheduledDate: task.scheduled_date ? new Date(task.scheduled_date) : undefined,
                    status: task.is_completed ? 'done' : 'todo',
                    createdAt: new Date(task.created_at || Date.now())
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="projects-module">
      <div className="projects-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div className="projects-title-container">
          <h1>Tasks</h1>
          <p>Organize and track your individual tasks.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={filterProjectId} 
            onChange={e => setFilterProjectId(e.target.value)}
            className="form-input"
            style={{ minWidth: '150px', cursor: 'pointer' }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.2rem' }}>
            <button
                onClick={() => setViewMode('table')}
                style={{
                    background: viewMode === 'table' ? '#fff' : 'transparent',
                    color: viewMode === 'table' ? '#000' : '#fff',
                    border: 'none',
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}
            >
                Table
            </button>
            <button
                onClick={() => setViewMode('board')}
                style={{
                    background: viewMode === 'board' ? '#fff' : 'transparent',
                    color: viewMode === 'board' ? '#000' : '#fff',
                    border: 'none',
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}
            >
                Board
            </button>
          </div>
          {!isCreatingProject && (
            <button 
              onClick={() => setIsCreatingProject(true)}
              className="btn-primary"
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      {isCreatingProject && (
        <form onSubmit={handleCreateProject} className="projects-create-form">
          <div className="form-grid">
            <div>
              <label className="form-label">Project Name</label>
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="E.g., Redesign Website"
                className="form-input"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Description (Optional)</label>
              <input
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Brief description..."
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setIsCreatingProject(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={!newProjectName.trim()}
            >
              Create Project
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 && (
        <div className="projects-empty">
          <p>You don't have any tasks yet.</p>
          <button onClick={() => setIsCreatingProject(true)}>
             Start by creating a project →
          </button>
        </div>
      )}
      
      {tasks.length > 0 && viewMode === 'table' && (
        <div className="table-container">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Task Title ↓</th>
                <th>Project</th>
                <th>Scheduled</th>
                <th>Due</th>
                <th>Status</th>
                <th>Pomodoros</th>
                <th>Completion</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks
                .filter(task => filterProjectId === 'all' || task.project_id === filterProjectId)
                .map(task => {
                const project = projects.find(p => p.id === task.project_id);
                
                const progressPct = task.est_pomodoros > 0 
                  ? Math.min(100, Math.round((task.completed_pomodoros / task.est_pomodoros) * 100)) 
                  : 0;

                let statusBadge = <span className="badge badge-draft">To Do</span>;
                if (task.is_completed) {
                    statusBadge = <span className="badge badge-completed">Done</span>;
                } else if (task.completed_pomodoros > 0) {
                    statusBadge = <span className="badge badge-running">In Progress</span>;
                }

                // Fallback to Date.now() if created_at is null
                const createdDate = new Date(task.created_at || Date.now());
                const dateString = `${createdDate.getDate().toString().padStart(2, '0')}-${(createdDate.getMonth() + 1).toString().padStart(2, '0')}-${createdDate.getFullYear()}`;

                return (
                  <tr 
                    key={task.id} 
                    onClick={() => project && setActiveProjectId(project.id)}
                    style={{ cursor: project ? 'pointer' : 'default' }}
                  >
                    <td>
                      <div className="project-name-cell">
                        <div>
                          <div className="project-name" style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? '#888' : 'inherit' }}>
                              {task.title}
                          </div>
                          <div className="project-date">{dateString}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                        {project ? (
                            <span style={{
                                backgroundColor: project.color || '#333',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#444',
                                display: 'inline-block'
                            }}>
                                {project.name}
                            </span>
                        ) : (
                            <span style={{ color: '#666', fontSize: '0.85rem' }}>No Project</span>
                        )}
                    </td>
                    <td style={{ color: '#999', fontSize: '0.9rem' }}>
                        {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ color: '#999', fontSize: '0.9rem' }}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td>{statusBadge}</td>
                    <td>
                      <span className="tasks-count">
                        {task.completed_pomodoros} / {task.est_pomodoros}
                      </span>
                    </td>
                    <td>
                      <div className="completion-cell">
                        <div className="progress-container">
                          <div 
                            className="progress-bar blue" 
                            style={{ 
                                width: `${progressPct}%`,
                                backgroundColor: task.is_completed ? '#4caf50' : undefined 
                            }}
                          />
                        </div>
                        <span className="completion-pct">{progressPct}%</span>
                      </div>
                    </td>
                    <td>
                       {/* You can add a delete task button here if needed, but for now we keep the layout similar */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'board' && tasks.length > 0 && (
        <div className="kanban-board">
          {/* To Do Column */}
          <div 
            className="kanban-column"
            style={{ 
              borderColor: dragOverColumn === 'todo' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
              background: dragOverColumn === 'todo' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'
            }}
            onDragOver={(e) => handleDragOver(e, 'todo')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'todo')}
          >
            <div className="kanban-column-header">
              <span>To Do</span>
              <span className="kanban-column-count">
                {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && !t.is_completed && t.completed_pomodoros === 0).length}
              </span>
            </div>
            <div className="kanban-tasks">
              {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && !t.is_completed && t.completed_pomodoros === 0).map(task => {
                  const project = projects.find(p => p.id === task.project_id);
                  return (
                      <div 
                        key={task.id} 
                        className="kanban-task-card" 
                        style={{ 
                          opacity: draggingId === task.id ? 0.4 : 1,
                          transform: draggingId === task.id ? 'scale(0.98)' : 'none',
                          border: draggingId === task.id ? '1px dashed #fff' : undefined
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (draggingId !== task.id && project) {
                            setActiveProjectId(project.id);
                          }
                        }}
                      >
                          <div className="kanban-task-title">{task.title}</div>
                          {project && (
                              <div className="kanban-task-project" style={{ backgroundColor: project.color || '#333' }}>
                                  {project.name}
                              </div>
                          )}
                          <div className="kanban-task-meta">
                              <span>🍅 {task.completed_pomodoros}/{task.est_pomodoros}</span>
                              {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                      </div>
                  );
              })}
            </div>
          </div>

          {/* In Progress Column */}
          <div 
            className="kanban-column"
            style={{ 
              borderColor: dragOverColumn === 'in-progress' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
              background: dragOverColumn === 'in-progress' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'
            }}
            onDragOver={(e) => handleDragOver(e, 'in-progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'in-progress')}
          >
            <div className="kanban-column-header">
              <span>In Progress</span>
              <span className="kanban-column-count">
                {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && !t.is_completed && t.completed_pomodoros > 0).length}
              </span>
            </div>
            <div className="kanban-tasks">
              {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && !t.is_completed && t.completed_pomodoros > 0).map(task => {
                  const project = projects.find(p => p.id === task.project_id);
                  return (
                      <div 
                        key={task.id} 
                        className="kanban-task-card" 
                        style={{ 
                          opacity: draggingId === task.id ? 0.4 : 1,
                          transform: draggingId === task.id ? 'scale(0.98)' : 'none',
                          border: draggingId === task.id ? '1px dashed #fff' : undefined
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (draggingId !== task.id && project) {
                            setActiveProjectId(project.id);
                          }
                        }}
                      >
                          <div className="kanban-task-title">{task.title}</div>
                          {project && (
                              <div className="kanban-task-project" style={{ backgroundColor: project.color || '#333' }}>
                                  {project.name}
                              </div>
                          )}
                          <div className="kanban-task-meta">
                              <span>🍅 {task.completed_pomodoros}/{task.est_pomodoros}</span>
                              {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                      </div>
                  );
              })}
            </div>
          </div>

          {/* Done Column */}
          <div 
            className="kanban-column"
            style={{ 
              borderColor: dragOverColumn === 'done' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
              background: dragOverColumn === 'done' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'
            }}
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <div className="kanban-column-header">
              <span>Done</span>
              <span className="kanban-column-count">
                {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && t.is_completed).length}
              </span>
            </div>
            <div className="kanban-tasks">
              {tasks.filter(t => (filterProjectId === 'all' || t.project_id === filterProjectId) && t.is_completed).map(task => {
                  const project = projects.find(p => p.id === task.project_id);
                  return (
                      <div 
                        key={task.id} 
                        className="kanban-task-card" 
                        style={{ 
                          opacity: draggingId === task.id ? 0.2 : 0.7,
                          transform: draggingId === task.id ? 'scale(0.98)' : 'none',
                          border: draggingId === task.id ? '1px dashed #fff' : undefined
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (draggingId !== task.id && project) {
                            setActiveProjectId(project.id);
                          }
                        }}
                      >
                          <div className="kanban-task-title" style={{ textDecoration: 'line-through' }}>{task.title}</div>
                          {project && (
                              <div className="kanban-task-project" style={{ backgroundColor: project.color || '#333' }}>
                                  {project.name}
                              </div>
                          )}
                          <div className="kanban-task-meta">
                              <span>🍅 {task.completed_pomodoros}/{task.est_pomodoros}</span>
                          </div>
                      </div>
                  );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Render modal if a project is active */}
      {renderProjectModal()}
    </div>
  );
};
