import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TaskCard } from '../../components/taskCard/TaskCard';
import { TaskForm } from '../../components/Tasks';
import { X } from 'lucide-react';

const PROJECT_COLORS = [
  '#e1f5fe', // light blue
  '#e8f5e9', // light green
  '#fff3e0', // light orange
  '#fce4ec', // light pink
  '#f3e5f5', // light purple
  '#e0f7fa', // teal
  '#e8eaf6', // indigo
];

export const ProjectsModule: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('board');

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTaskInModal, setEditingTaskInModal] = useState<any | null>(null);
  const [isEditingTaskMode, setIsEditingTaskMode] = useState(false);

  const handleTaskClick = (task: any, projectId?: string) => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
    setEditingTaskInModal(task);
    setIsEditingTaskMode(false);
  };

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const cleanupOldCompletedTasks = async (currentTasks: any[]) => {
    const completedTasks = currentTasks.filter(t => t.is_completed);
    completedTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (completedTasks.length > 5) {
      const idsToDelete = completedTasks.slice(5).map(t => t.id);
      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete);
      if (!error) {
        setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));
      }
    }
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false })
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (tasksRes.data) {
        setTasks(tasksRes.data);
        cleanupOldCompletedTasks(tasksRes.data);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectTasks = tasks.filter(t => t.project_id === activeProjectId);

  const generateRandomColor = () => {
      return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      const newProject = {
          name: newProjectName.trim(),
          color: selectedColor || generateRandomColor()
      };
      const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
      if (data && !error) {
          setProjects(prev => [...prev, data]);
      }
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedColor(null);
      setIsCreatingProject(false);
    }
  };

  const handleCreateTaskFromModal = async (
    title: string,
    note: string,
    estPomodoros: number
  ) => {
    if (!activeProjectId || !title.trim()) return;

    const newTask = {
      title: title.trim(),
      note: note.trim() || null,
      est_pomodoros: estPomodoros,
      completed_pomodoros: 0,
      is_completed: false,
      project_id: activeProjectId,
      due_date: null as string | null,
      scheduled_date: null as string | null,
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (data && !error) {
      setTasks(prev => [...prev, data]);
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTaskFromModal = async (
    title: string,
    note: string,
    estPomodoros: number,
    projectId?: string,
    scheduledDate?: string,
    dueDate?: string
  ) => {
    if (!editingTaskInModal) return;

    const updates: any = {
      title: title.trim(),
      note: note.trim() || null,
      est_pomodoros: estPomodoros,
      project_id: projectId || null,
      scheduled_date: scheduledDate || null,
      due_date: dueDate || null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', editingTaskInModal.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(`Failed to save task: ${error.message || 'Database error occurred'}`);
      return;
    }

    if (data) {
      setTasks(prev => prev.map(t => (t.id === data.id ? data : t)));
      setActiveProjectId(data.project_id || null);
      setEditingTaskInModal(null);
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
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    setTasks(updatedTasks);

    // Database update
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (!error && updates.is_completed) {
      cleanupOldCompletedTasks(updatedTasks);
    }
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
            {editingTaskInModal && !isEditingTaskMode && (
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>{editingTaskInModal.title}</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setIsEditingTaskMode(true)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this task?')) {
                          const { error } = await supabase.from('tasks').delete().eq('id', editingTaskInModal.id);
                          if (!error) {
                            setTasks(prev => prev.filter(t => t.id !== editingTaskInModal.id));
                            setEditingTaskInModal(null);
                          } else {
                            alert('Failed to delete task. Please try again.');
                          }
                        }
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ff4d4f', borderColor: '#ffccc7', background: '#fff' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#666', width: '100px' }}>Status:</span>
                        {editingTaskInModal.is_completed ? (
                            <span className="badge badge-completed">Done</span>
                        ) : editingTaskInModal.completed_pomodoros > 0 ? (
                            <span className="badge badge-running">In Progress</span>
                        ) : (
                            <span className="badge badge-draft">To Do</span>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#666', width: '100px' }}>Progress:</span>
                        <span>🍅 {editingTaskInModal.completed_pomodoros} / {editingTaskInModal.est_pomodoros} Pomodoros</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#666', width: '100px' }}>Dates:</span>
                        <div style={{ display: 'flex', gap: '1rem', color: '#555' }}>
                            <span><strong>Scheduled:</strong> {editingTaskInModal.scheduled_date ? new Date(editingTaskInModal.scheduled_date).toLocaleDateString() : 'None'}</span>
                            <span><strong>Due:</strong> {editingTaskInModal.due_date ? new Date(editingTaskInModal.due_date).toLocaleDateString() : 'None'}</span>
                        </div>
                    </div>
                    
                    {editingTaskInModal.note && (
                      <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: '#666', display: 'block', marginBottom: '0.3rem' }}>Notes:</span>
                          <p style={{ margin: 0, padding: '0.8rem', background: '#fff', borderRadius: '8px', border: '1px solid #eee', whiteSpace: 'pre-wrap', color: '#444' }}>
                              {editingTaskInModal.note}
                          </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {editingTaskInModal && isEditingTaskMode && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ margin: 0 }}>Edit Task</h2>
                  <button onClick={() => setIsEditingTaskMode(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                    Cancel Edit
                  </button>
                </div>
                <TaskForm
                  initialTitle={editingTaskInModal.title}
                  initialNote={editingTaskInModal.note || ''}
                  initialEstPomodoros={editingTaskInModal.est_pomodoros}
                  initialProjectId={editingTaskInModal.project_id || undefined}
                  disableTitleEditing
                  projects={projects}
                  onAddProject={async (name: string) => {
                    const newProject = {
                      name: name.trim(),
                      color: generateRandomColor(),
                    };
                    const { data, error } = await supabase
                      .from('projects')
                      .insert([newProject])
                      .select()
                      .single();
                    if (data && !error) {
                      setProjects(prev => [...prev, data]);
                      return data.id as string;
                    }
                    return undefined;
                  }}
                  onDeleteProject={async (id: string) => {
                    const { error } = await supabase.from('projects').delete().eq('id', id);
                    if (!error) {
                      setProjects(prev => prev.filter(p => p.id !== id));
                    }
                  }}
                  onSave={handleUpdateTaskFromModal}
                  onCancel={() => setIsEditingTaskMode(false)}
                />
              </div>
            )}

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
              <div style={{ marginBottom: '1.5rem' }}>
                <TaskForm
                  initialProjectId={activeProjectId || undefined}
                  projects={projects}
                  onAddProject={async (name: string) => {
                    const newProject = {
                      name: name.trim(),
                      color: generateRandomColor(),
                    };
                    const { data, error } = await supabase
                      .from('projects')
                      .insert([newProject])
                      .select()
                      .single();
                    if (data && !error) {
                      setProjects(prev => [...prev, data]);
                      return data.id as string;
                    }
                    return undefined;
                  }}
                  onDeleteProject={async (id: string) => {
                    const { error } = await supabase.from('projects').delete().eq('id', id);
                    if (!error) {
                      setProjects(prev => prev.filter(p => p.id !== id));
                    }
                  }}
                  onSave={handleCreateTaskFromModal}
                  onCancel={() => setIsCreatingTask(false)}
                />
              </div>
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
          <h1>Projects</h1>
          <p>Organize your projects and the tasks inside them.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={filterProjectId} 
            onChange={e => setFilterProjectId(e.target.value)}
            className="form-input"
            style={{ width: '150px', cursor: 'pointer', flex: 'none' }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {viewMode === 'table' && (
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="form-input"
              style={{ width: '130px', cursor: 'pointer', flex: 'none' }}
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          )}
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

          <div style={{ marginTop: '1rem' }}>
            <label className="form-label">Project Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: selectedColor === color ? '0 0 0 2px rgba(255,255,255,0.5)' : '0 1px 3px rgba(0,0,0,0.2)',
                    backgroundColor: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setIsCreatingProject(false);
                setSelectedColor(null);
              }}
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
                <th>Project</th>
                <th>Task Title ↓</th>
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
                .filter(task => {
                  if (filterProjectId !== 'all' && task.project_id !== filterProjectId) return false;
                  if (filterStatus === 'todo' && (task.is_completed || task.completed_pomodoros > 0)) return false;
                  if (filterStatus === 'in-progress' && (task.is_completed || task.completed_pomodoros === 0)) return false;
                  if (filterStatus === 'done' && !task.is_completed) return false;
                  return true;
                })
                .sort((a, b) => {
                  if (a.is_completed && !b.is_completed) return 1;
                  if (!a.is_completed && b.is_completed) return -1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
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
                    onClick={() => handleTaskClick(task, project?.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                        {project ? (
                            <span style={{
                                backgroundColor: project.color || '#333',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#444',
                                display: 'inline-block',
                                width: '120px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {project.name}
                            </span>
                        ) : (
                            <span style={{ color: '#666', fontSize: '0.85rem' }}>No Project</span>
                        )}
                    </td>
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
                          if (draggingId !== task.id) {
                            handleTaskClick(task, project?.id);
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
