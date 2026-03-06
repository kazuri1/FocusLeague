import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMobile } from '../hooks/useMobile';

export const NotificationBell: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchDueTasks = async () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Fetch tasks that are uncompleted and have a due_date <= today
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_completed', false)
      .not('due_date', 'is', null)
      .lte('due_date', todayStr)
      .order('due_date', { ascending: true });

    if (data && !error) {
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchDueTasks();
    
    // Set up realtime subscription to tasks table to auto-update bell
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchDueTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div style={{
      position: 'absolute',
      top: isMobile ? '3.5rem' : '2.5rem',
      right: isMobile ? '1.5rem' : '2.5rem',
      zIndex: 100,
    }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '45px',
          height: '45px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
          color: '#fff',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Bell size={20} />
        {tasks.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ff4d4f',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid rgba(0, 0, 0, 0.8)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {tasks.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '55px',
          right: '0',
          width: '320px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
          color: '#333'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #eee',
            background: '#fafafa',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Notifications</span>
            {tasks.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#ff4d4f', background: '#ffe6e6', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>
                    {tasks.length} Critical
                </span>
            )}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tasks.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
                You have no critical tasks due today. Awesome!
              </div>
            ) : (
              tasks.map(task => {
                const dueDt = new Date(task.due_date);
                const today = new Date();
                today.setHours(0,0,0,0);
                dueDt.setHours(0,0,0,0);
                const isOverdue = dueDt < today;
                
                return (
                  <div key={task.id} style={{
                    padding: '1rem',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 500, color: '#333', fontSize: '0.95rem' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: isOverdue ? '#ff4d4f' : '#faad14', fontWeight: 600 }}>
                        {isOverdue ? 'Overdue!' : 'Due Today'}
                      </span>
                      <span style={{ color: '#888' }}>
                        {dueDt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
