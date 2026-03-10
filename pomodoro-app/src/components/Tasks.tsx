import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface Project {
    id: string;
    name: string;
    color: string;
}

interface Task {
    id: string;
    title: string;
    note: string;
    estPomodoros: number;
    completedPomodoros: number;
    isCompleted: boolean;
    projectId?: string;
    scheduledDate?: string;
    dueDate?: string;
}

interface TaskFormProps {
    initialTitle?: string;
    initialNote?: string;
    initialEstPomodoros?: number;
    initialProjectId?: string;
    initialScheduledDate?: string;
    initialDueDate?: string;
    disableTitleEditing?: boolean;
    projects: Project[];
    onSave: (title: string, note: string, estPomodoros: number, projectId?: string, scheduledDate?: string, dueDate?: string) => Promise<void>;
    onCancel: () => void;
    onAddProject: (name: string) => Promise<string | undefined>;
    onDeleteProject: (id: string) => Promise<void>;
}

const generateRandomColor = () => {
    const colors = ['#e1f5fe', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa', '#e8eaf6'];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const TaskForm: React.FC<TaskFormProps> = ({
    initialTitle = '',
    initialNote = '',
    initialEstPomodoros = 1,
    initialProjectId,
    initialScheduledDate = '',
    initialDueDate = '',
    disableTitleEditing = false,
    projects,
    onSave,
    onCancel,
    onAddProject,
    onDeleteProject
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [note, setNote] = useState(initialNote);
    const [isNoteOpen, setIsNoteOpen] = useState(!!initialNote);
    const [estPomodoros, setEstPomodoros] = useState(initialEstPomodoros);
    const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
    const [scheduledDate, setScheduledDate] = useState(initialScheduledDate);
    const [dueDate, setDueDate] = useState(initialDueDate);
    
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    
    const projectMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isProjectMenuOpen && projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProjectMenuOpen]);

    const handleIncrement = () => setEstPomodoros(prev => prev + 1);
    const handleDecrement = () => setEstPomodoros(prev => Math.max(1, prev - 1));

    const handleCreateProject = async () => {
        if (newProjectName.trim()) {
            const newId = await onAddProject(newProjectName.trim());
            if (newId) {
                setProjectId(newId);
            }
            setNewProjectName('');
            setIsProjectMenuOpen(false);
        }
    };

    const selectedProject = projects.find(p => p.id === projectId);

    return (
        <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            marginTop: '1rem',
            marginBottom: '1rem',
            transition: 'all 0.3s ease',
            position: 'relative'
        }}>
            <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem' }}>
                <input 
                    type="text"
                    className="task-title-input"
                    placeholder="What are you working on?"
                    value={title}
                    onChange={(e) => {
                        if (!disableTitleEditing) {
                            setTitle(e.target.value);
                        }
                    }}
                    readOnly={disableTitleEditing}
                    style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        color: '#c61c1cff',
                        backgroundColor: '#f2f2f2',
                        borderRadius: '6px',
                        padding: '0.8rem',
                        boxSizing: 'border-box',
                        marginBottom: isNoteOpen ? '1rem' : '1.5rem',
                        fontFamily: '"Space Grotesk", sans-serif'
                    }}
                />

                {isNoteOpen && (
                    <textarea
                        placeholder="Some notes..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.8rem',
                            marginBottom: '1.5rem',
                            backgroundColor: '#f2f2f2',
                            border: 'none',
                            borderRadius: '6px',
                            outline: 'none',
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontSize: '1rem',
                            color: '#555',
                            resize: 'vertical',
                            boxSizing: 'border-box'
                        }}
                    />
                )}
                
                <div style={{ fontWeight: 700, color: '#555', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Est Pomodoros
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                        type="number"
                        value={estPomodoros}
                        onChange={(e) => setEstPomodoros(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                            width: '4rem',
                            padding: '0.5rem',
                            backgroundColor: '#efefef',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#555',
                            outline: 'none',
                            fontFamily: '"Space Grotesk", sans-serif'
                        }}
                    />
                    <button 
                        onClick={handleIncrement}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffffff',
                            border: '1px solid #dfdfdf',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            color: '#555',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                    >
                        <ArrowDropUpIcon />
                    </button>
                    <button 
                        onClick={handleDecrement}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffffff',
                            border: '1px solid #dfdfdf',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            color: '#555',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                    >
                        <ArrowDropDownIcon />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Scheduled Date</label>
                        <div className="date-input-wrapper date-input-light-wrapper">
                            <CalendarTodayIcon className="date-input-icon" style={{ fontSize: '1.2rem' }} />
                            <input
                                type="date"
                                className="date-input-styled date-input-light"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Due Date</label>
                        <div className="date-input-wrapper date-input-light-wrapper">
                            <CalendarTodayIcon className="date-input-icon" style={{ fontSize: '1.2rem' }} />
                            <input
                                type="date"
                                className="date-input-styled date-input-light"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {isProjectMenuOpen && !selectedProject && (
                    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                        <input 
                            type="text"
                            placeholder="Project name... (Press Enter to add)"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateProject();
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                backgroundColor: '#f2f2f2',
                                border: 'none',
                                borderRadius: '6px',
                                outline: 'none',
                                fontFamily: '"Space Grotesk", sans-serif',
                                fontSize: '1rem',
                                color: '#555',
                                boxSizing: 'border-box',
                                marginBottom: projects.length > 0 ? '0.8rem' : '0'
                            }}
                        />
                        {projects.length > 0 && (
                            <div style={{ 
                                display: 'flex', 
                                gap: '0.5rem',
                                overflowX: 'auto',
                                whiteSpace: 'nowrap',
                                paddingBottom: '0.5rem',
                                scrollbarWidth: 'none', // Firefox
                                msOverflowStyle: 'none' // IE 10+
                            }}>
                                {projects.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => {
                                            setProjectId(p.id);
                                            setIsProjectMenuOpen(false);
                                        }}
                                        style={{
                                            padding: '0.3rem 0.8rem',
                                            backgroundColor: p.color,
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            color: '#444',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            transition: 'transform 0.1s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            flexShrink: 0 // Prevent squishing
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <span>{p.name}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteProject(p.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#777',
                                                cursor: 'pointer',
                                                padding: '0 0.2rem',
                                                fontSize: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    {!isNoteOpen && (
                        <button 
                            onClick={() => setIsNoteOpen(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#aaaaaa',
                                textDecoration: 'underline',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.9rem',
                                fontFamily: '"Space Grotesk", sans-serif'
                            }}
                        >
                            + Add Note
                        </button>
                    )}
                    
                    {selectedProject ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: selectedProject.color,
                            padding: '0.3rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#444'
                        }}>
                            {selectedProject.name}
                            <button 
                                onClick={() => setProjectId(undefined)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#444',
                                    cursor: 'pointer',
                                    padding: '0',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: 700
                                }}
                            >
                                x
                            </button>
                        </div>
                    ) : (
                        !isProjectMenuOpen && (
                            <button 
                                onClick={() => setIsProjectMenuOpen(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#aaaaaa',
                                    textDecoration: 'underline',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '0.9rem',
                                    fontFamily: '"Space Grotesk", sans-serif'
                                }}
                            >
                                + Add Project
                            </button>
                        )
                    )}
                </div>
            </div>

            <div style={{
                backgroundColor: '#f6f6f6',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '1rem',
                borderTop: '1px solid #eeeeee'
            }}>
                <button 
                    onClick={onCancel}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888888',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontFamily: '"Space Grotesk", sans-serif'
                    }}
                >
                    Cancel
                </button>
                <button 
                    onClick={async () => {
                        if (title.trim()) {
                            await onSave(title, note, estPomodoros, projectId, scheduledDate, dueDate);
                        }
                    }}
                    style={{
                        backgroundColor: '#444444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontFamily: '"Space Grotesk", sans-serif',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export const Tasks: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Active task state
    const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
        return localStorage.getItem('fl_activeTaskId');
    });

    useEffect(() => {
        if (activeTaskId) {
            localStorage.setItem('fl_activeTaskId', activeTaskId);
        } else {
            localStorage.removeItem('fl_activeTaskId');
        }
    }, [activeTaskId]);
    
    // Kebab menu & Edit state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    
    const menuRef = useRef<HTMLDivElement>(null);

    const cleanupOldCompletedTasks = async (currentTasks: any[]) => {
        const completedTasks = currentTasks.filter(t => t.isCompleted);
        completedTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        if (completedTasks.length > 5) {
            const idsToDelete = completedTasks.slice(5).map(t => t.id);
            const { error } = await supabase.from('tasks').delete().in('id', idsToDelete);
            if (!error) {
                setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));
                if (activeTaskId && idsToDelete.includes(activeTaskId)) {
                    setActiveTaskId(null);
                }
            }
        }
    };

    // Initial fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [projectsRes, tasksRes] = await Promise.all([
                supabase.from('projects').select('*').order('created_at', { ascending: true }),
                supabase.from('tasks').select('*').order('created_at', { ascending: false })
            ]);

            if (projectsRes.data) {
                setProjects(projectsRes.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color
                })));
            }
            if (tasksRes.data) {
                const fetchedTasks = tasksRes.data.map(t => ({
                    id: t.id,
                    title: t.title,
                    note: t.note || '',
                    estPomodoros: t.est_pomodoros,
                    completedPomodoros: t.completed_pomodoros,
                    isCompleted: t.is_completed || false,
                    projectId: t.project_id,
                    scheduledDate: t.scheduled_date || '',
                    dueDate: t.due_date || '',
                    createdAt: t.created_at
                }));
                setTasks(fetchedTasks as any);
                cleanupOldCompletedTasks(fetchedTasks);
                
                const activeId = localStorage.getItem('fl_activeTaskId');
                if (activeId) {
                    const taskStillValid = fetchedTasks.some(t => t.id === activeId && !t.isCompleted);
                    if (!taskStillValid) {
                        setActiveTaskId(null);
                        localStorage.removeItem('fl_activeTaskId');
                    }
                }
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

    // Handle Pomodoro Timer Completion Broadcast
    useEffect(() => {
        const handlePomodoroCompleted = async () => {
            if (!activeTaskId) return;

            const activeTask = tasks.find(t => t.id === activeTaskId);
            if (!activeTask) return;

            const newCount = activeTask.completedPomodoros + 1;
            const newEstPomodoros = newCount > activeTask.estPomodoros ? newCount : activeTask.estPomodoros;

            // Optimistic UI Update
            setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, completedPomodoros: newCount, estPomodoros: newEstPomodoros } : t));

            const { error } = await supabase
                .from('tasks')
                .update({ 
                    completed_pomodoros: newCount,
                    est_pomodoros: newEstPomodoros
                })
                .eq('id', activeTaskId);

            if (error) {
                // Revert on failure
                setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, completedPomodoros: newCount - 1, estPomodoros: activeTask.estPomodoros } : t));
                console.error("Failed to auto-increment pomodoro count:", error);
            }
        };

        window.addEventListener('pomodoroCompleted', handlePomodoroCompleted);
        return () => window.removeEventListener('pomodoroCompleted', handlePomodoroCompleted);
    }, [activeTaskId, tasks]);

    const handleAddProject = async (name: string) => {
        const newProject = {
            name,
            color: generateRandomColor()
        };
        const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
        if (data && !error) {
            setProjects(prev => [...prev, { id: data.id, name: data.name, color: data.color }]);
            return data.id as string;
        }
        return undefined;
    };

    const handleDeleteProject = async (id: string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (!error) {
            setProjects(prev => prev.filter(p => p.id !== id));
            setTasks(prev => prev.map(t => 
                t.projectId === id ? { ...t, projectId: undefined } : t
            ));
        }
    };

    const handleCreateSave = async (title: string, note: string, estPomodoros: number, projectId?: string, scheduledDate?: string, dueDate?: string) => {
        const { data, error } = await supabase.from('tasks').insert([{
            title: title.trim(),
            note: note.trim() || null,
            est_pomodoros: estPomodoros,
            completed_pomodoros: 0,
            is_completed: false,
            project_id: projectId || null,
            scheduled_date: scheduledDate || null,
            due_date: dueDate || null
        }]).select().single();

        if (error) {
            console.error(error);
            alert(`Failed to save task: ${error.message || 'Database error occurred'}`);
            return;
        }

        if (data) {
            const newTask: Task = {
                id: data.id,
                title: data.title,
                note: data.note || '',
                estPomodoros: data.est_pomodoros,
                completedPomodoros: data.completed_pomodoros,
                isCompleted: data.is_completed || false,
                projectId: data.project_id,
                scheduledDate: data.scheduled_date || '',
                dueDate: data.due_date || ''
            };
            setTasks(prev => [...prev, newTask]);
            setIsAdding(false);
            if (!activeTaskId) {
                setActiveTaskId(newTask.id);
            }
        }
    };

    const handleUpdateSave = async (id: string, newTitle: string, newNote: string, newEst: number, newProjectId?: string, newScheduled?: string, newDue?: string) => {
        const { data, error } = await supabase.from('tasks').update({
            title: newTitle.trim(),
            note: newNote.trim() || null,
            est_pomodoros: newEst,
            project_id: newProjectId || null,
            scheduled_date: newScheduled || null,
            due_date: newDue || null
        }).eq('id', id).select().single();

        if (error) {
            console.error(error);
            alert(`Failed to save task: ${error.message || 'Database error occurred'}`);
            return;
        }

        if (data) {
            setTasks(prev => prev.map(t => 
                t.id === id ? {
                    ...t,
                    title: data.title,
                    note: data.note || '',
                    estPomodoros: data.est_pomodoros,
                    projectId: data.project_id,
                    scheduledDate: data.scheduled_date || '',
                    dueDate: data.due_date || ''
                } : t
            ));
            setEditingTaskId(null);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) {
            setTasks(prev => {
                const remaining = prev.filter(t => t.id !== id);
                if (activeTaskId === id) {
                    setActiveTaskId(remaining.length > 0 ? remaining[0].id : null);
                }
                return remaining;
            });
            setOpenMenuId(null);
        }
    };

    const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
        e.stopPropagation(); // prevent activating the task
        
        const newStatus = !task.isCompleted;
        
        // Optimistic UI Update
        const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t);
        setTasks(updatedTasks);
        if (newStatus && activeTaskId === task.id) {
            const nextActiveId = tasks.find(t => t.id !== task.id && !t.isCompleted)?.id;
            setActiveTaskId(nextActiveId || null);
        }

        const { error } = await supabase.from('tasks').update({ is_completed: newStatus }).eq('id', task.id);
        
        if (error) {
            // Revert changes on error
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !newStatus } : t));
            console.error("Error toggling completion:", error);
            alert("Database Error! Did you make sure to create the `is_completed` column in Supabase? Details: " + error.message);
        } else if (newStatus) {
            cleanupOldCompletedTasks(updatedTasks as any[]);
        }
    };

    if (isLoading) {
        return (
            <div style={{
                width: '100%',
                maxWidth: '480px',
                margin: '2rem auto',
                padding: '0 1rem',
                boxSizing: 'border-box',
                fontFamily: '"Space Grotesk", sans-serif',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1.2rem',
                marginTop: '4rem'
            }}>
                Loading tasks...
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            maxWidth: '480px',
            margin: '2rem auto',
            padding: '0 1rem',
            boxSizing: 'border-box',
            fontFamily: '"Space Grotesk", sans-serif',
            zIndex: 10
        }}>
            <style>
                {`
                    .task-title-input::placeholder {
                        color: #cccccc !important;
                        opacity: 1;
                    }
                `}
            </style>

            {/* Active Task Indicator */}
            {activeTaskId && tasks.find(t => t.id === activeTaskId) && (
                <div style={{
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    color: '#ffffff',
                    fontFamily: '"Space Grotesk", sans-serif'
                }}>
                    <div style={{ fontSize: '1rem', opacity: 0.8, fontWeight: 500, marginBottom: '0.2rem' }}>
                        #{(tasks.find(t => t.id === activeTaskId)?.completedPomodoros || 0) + 1}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {tasks.find(t => t.id === activeTaskId)?.title}
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid rgba(255,255,255,0.6)',
                paddingBottom: '0.5rem',
                marginBottom: '1rem'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    color: '#ffffff',
                    fontWeight: 700
                }}>
                    Tasks
                </h2>
                <button style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem'
                }}>
                    <MoreVertIcon fontSize="small" />
                </button>
            </div>

            {/* Render Saved Tasks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {(() => {
                    const uncompletedTasks = tasks.filter(t => !t.isCompleted);
                    const completedTasks = tasks.filter(t => t.isCompleted);
                    const sortedTasks = [...uncompletedTasks, ...completedTasks];

                    return sortedTasks.map((task) => {
                    if (editingTaskId === task.id) {
                        return (
                            <TaskForm 
                                key={task.id}
                                initialTitle={task.title}
                                initialNote={task.note}
                                initialEstPomodoros={task.estPomodoros}
                                initialProjectId={task.projectId}
                                initialScheduledDate={task.scheduledDate}
                                initialDueDate={task.dueDate}
                                projects={projects}
                                onAddProject={handleAddProject}
                                onDeleteProject={handleDeleteProject}
                                onSave={(title, note, est, projId, sched, due) => handleUpdateSave(task.id, title, note, est, projId, sched, due)}
                                onCancel={() => setEditingTaskId(null)}
                            />
                        );
                    }

                    const taskProject = task.projectId ? projects.find(p => p.id === task.projectId) : undefined;

                    return (
                        <div key={task.id} 
                            onClick={() => setActiveTaskId(prev => prev === task.id ? null : task.id)}
                            style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '4px',
                            borderLeft: activeTaskId === task.id && !task.isCompleted ? '6px solid #d08109ff' : '6px solid transparent',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                            opacity: task.isCompleted ? 0.6 : 1, // Dim completed tasks
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.8rem', 
                                    flex: 1, 
                                    minWidth: 0, /* Allow flex child to shrink properly */
                                    overflowX: 'auto',
                                    whiteSpace: 'nowrap',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}>
                                    <CheckCircleIcon 
                                        onClick={(e) => handleToggleComplete(e, task)}
                                        style={{ 
                                            color: task.isCompleted ? '#4caf50' : '#dfdfdf', // Green when checked
                                            fontSize: '1.8rem', 
                                            cursor: 'pointer', 
                                            flexShrink: 0 
                                        }} 
                                    />
                                    <span 
                                        title={task.title}
                                        style={{
                                        color: task.isCompleted ? '#aaaaaa' : '#555555',
                                        fontWeight: task.isCompleted ? 500 : 700,
                                        textDecoration: task.isCompleted ? 'line-through' : 'none',
                                        fontSize: '1.1rem',
                                        fontFamily: '"Space Grotesk", sans-serif',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {task.title}
                                    </span>
                                    {taskProject && (
                                        <div style={{
                                            backgroundColor: taskProject.color,
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: '#444',
                                            marginLeft: '0.5rem',
                                            flexShrink: 0
                                        }}>
                                            {taskProject.name}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', position: 'relative' }}>
                                    <span style={{ color: '#aaaaaa', fontWeight: 600, fontSize: '1rem', fontFamily: '"Space Grotesk", sans-serif' }}>
                                        {task.completedPomodoros} / {task.estPomodoros}
                                    </span>
                                    
                                    <div ref={openMenuId === task.id ? menuRef : null}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === task.id ? null : task.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '4px',
                                                color: '#888888',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.1rem',
                                                backgroundColor: openMenuId === task.id ? '#eeeeee' : 'transparent'
                                            }}
                                        >
                                            <MoreVertIcon fontSize="small" />
                                        </button>
                                        
                                        {openMenuId === task.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: '0.5rem',
                                                backgroundColor: '#ffffff',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                zIndex: 50,
                                                minWidth: '120px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                border: '1px solid #eeeeee'
                                            }}>
                                                <button 
                                                    onClick={() => {
                                                        setEditingTaskId(task.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    style={{
                                                        padding: '0.8rem 1rem',
                                                        textAlign: 'left',
                                                        background: 'none',
                                                        border: 'none',
                                                        borderBottom: '1px solid #f0f0f0',
                                                        cursor: 'pointer',
                                                        color: '#555',
                                                        fontWeight: 600,
                                                        fontFamily: '"Space Grotesk", sans-serif',
                                                        fontSize: '0.95rem'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(task.id)}
                                                    style={{
                                                        padding: '0.8rem 1rem',
                                                        textAlign: 'left',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#e74c3c',
                                                        fontWeight: 600,
                                                        fontFamily: '"Space Grotesk", sans-serif',
                                                        fontSize: '0.95rem'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdf2f0'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {task.note && (
                                <div style={{
                                    backgroundColor: '#fcf8d4',
                                    borderRadius: '4px',
                                    padding: '0.8rem',
                                    marginTop: '1rem',
                                    color: '#666555',
                                    fontSize: '0.95rem',
                                    fontFamily: '"Space Grotesk", sans-serif',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                                    marginLeft: '2.6rem' // Indent to align with text
                                }}>
                                    {task.note}
                                </div>
                            )}
                        </div>
                    );
                {/* Tasks loop close */}
                    });
                })()}
            </div>

            {isAdding ? (
                <TaskForm 
                    projects={projects}
                    onAddProject={handleAddProject}
                    onDeleteProject={handleDeleteProject}
                    onSave={handleCreateSave}
                    onCancel={() => setIsAdding(false)}
                />
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    style={{
                        width: '100%',
                        padding: '1.2rem',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        border: '2px dashed rgba(255,255,255,0.4)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontFamily: '"Space Grotesk", sans-serif',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                    }}
                >
                    <AddCircleOutlineIcon /> Add Task
                </button>
            )}

            {tasks.length > 0 && (() => {
                const activeTasks = tasks.filter(t => !t.isCompleted);
                const totalEst = activeTasks.reduce((sum, t) => sum + t.estPomodoros, 0);
                const totalComp = activeTasks.reduce((sum, t) => sum + t.completedPomodoros, 0);
                const remaining = Math.max(0, totalEst - totalComp);
                const hours = (remaining * 25) / 60; // Assumes 25 min pomodoros
                
                const finishDate = new Date();
                finishDate.setMinutes(finishDate.getMinutes() + (remaining * 25));
                
                return (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.2rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderTop: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1.5rem',
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontSize: '1.05rem',
                    }}>
                        <div>
                            <span style={{ color: '#rgba(255, 255, 255, 0.8)' }}>Pomos:</span>{' '}
                            <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{totalComp}</span> / {totalEst}
                        </div>
                        <div>
                            <span style={{ color: '#rgba(255, 255, 255, 0.8)' }}>Finish At:</span>{' '}
                            <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>
                                {finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>{' '}
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                ({hours.toFixed(1)}h)
                            </span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
