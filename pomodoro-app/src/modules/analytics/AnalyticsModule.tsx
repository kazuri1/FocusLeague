import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

// --- Date Utils ---
const startOfDay = (d: Date) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getCurrentWeekArray = () => {
  const arr = [];
  const curr = new Date();
  curr.setHours(0, 0, 0, 0);
  
  // Force Monday as the 1st day of the week
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(first));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    arr.push(d);
  }
  return arr;
};

const formatDayName = (d: Date) => {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

const LIGHT_COLORS = ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4', '#5eead4', '#fdba74'];

export const AnalyticsModule: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsRes, tasksRes, sessionsRes] = await Promise.all([
            supabase.from('projects').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('pomodoro_sessions').select('*')
        ]);

        if (sessionsRes.data) {
          setSessions(sessionsRes.data.map(s => ({
                id: s.id,
                taskId: s.task_id,
                type: s.type,
                startedAt: s.created_at, // mapped to startedAt for logic compat
                duration: s.duration,
                completed: s.completed
          })));
        }

        if (projectsRes.data) {
            setProjects(projectsRes.data.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color
            })));
        }

        if (tasksRes.data) {
            setTasks(tasksRes.data.map(t => ({
                id: t.id,
                title: t.title,
                isCompleted: t.is_completed || false,
                projectId: t.project_id,
                createdAt: t.created_at
            })));
        }
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const metrics = useMemo(() => {
    if (isLoading) return null;

    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const validSessions = sessions.filter(s => s.type === 'focus' && s.completed);

    // 1. Focus Time Today
    const focusSessionsToday = validSessions.filter(s => new Date(s.startedAt).getTime() >= today.getTime());
    const focusTimeTodayHrs = focusSessionsToday.reduce((acc, s) => acc + s.duration / 3600, 0);
    const focusTimeTodayMins = focusSessionsToday.reduce((acc, s) => acc + s.duration / 60, 0);
    
    const focusSessionsYesterday = validSessions.filter(s => {
      const t = new Date(s.startedAt).getTime();
      return t >= yesterday.getTime() && t < today.getTime();
    });
    const focusTimeYesterdayMins = focusSessionsYesterday.reduce((acc, s) => acc + s.duration / 60, 0);
    
    const focusTimeDiffMins = Math.round(focusTimeTodayMins - focusTimeYesterdayMins);
    const focusTimeSign = focusTimeDiffMins > 0 ? '+' : '';

    // 2. Pomodoros Today
    const pomodorosToday = focusSessionsToday.length;

    // 3. Tasks Completed
    const taskCompletionDates = new Map<string, number>();
    // Proxy completion date by last session recorded for the task
    validSessions.forEach(s => {
      if (s.taskId) {
         const tTime = new Date(s.startedAt).getTime();
         const existing = taskCompletionDates.get(s.taskId) || 0;
         if (tTime > existing) taskCompletionDates.set(s.taskId, tTime);
      }
    });

    const completedTasks = tasks.filter(t => t.isCompleted);
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // 4. Deep Work Streak
    let streak = 0;
    let checkDate = new Date(today);
    while (true) {
       const checkTime = checkDate.getTime();
       const hasSession = validSessions.some(s => startOfDay(s.startedAt).getTime() === checkTime);
       
       if (hasSession) {
         streak++;
         checkDate.setDate(checkDate.getDate() - 1);
       } else if (checkTime === today.getTime() && streak === 0) {
         // Keep streak alive if they just haven't worked today yet
         checkDate.setDate(checkDate.getDate() - 1);
       } else {
         break;
       }
    }

    // --- Weekly Data ---
    // Section 2: Weekly Focus Trend (Mon-Sun strictly)
    const currentWeekArray = getCurrentWeekArray();

    const weeklyFocusData = currentWeekArray.map(d => {
        const dTime = d.getTime();
        const daySessions = validSessions.filter(s => startOfDay(s.startedAt).getTime() === dTime);
        const hours = daySessions.reduce((acc, s) => acc + s.duration, 0) / 3600;
        return {
            name: formatDayName(d),
            hours: Number(hours.toFixed(1))
        };
    });

    // Section 3: Focus Distribution by Project
    const thisMonday = currentWeekArray[0].getTime();
    const recentSessions = validSessions.filter(s => new Date(s.startedAt).getTime() >= thisMonday);

    const distributionDataRaw = projects.map((p) => {
        const pTasks = tasks.filter(t => t.projectId === p.id).map(t => t.id);
        const pSessions = recentSessions.filter(s => s.taskId && pTasks.includes(s.taskId));
        const hours = pSessions.reduce((acc, s) => acc + s.duration, 0) / 3600;
        return {
            name: p.name,
            value: Number(hours.toFixed(1)),
            rawColor: (p as any).color
        };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

    // Synchronize Donut colors directly with the global Supabase project tags
    const distributionData = distributionDataRaw.map((d, i) => ({
        ...d,
        color: d.rawColor || LIGHT_COLORS[i % LIGHT_COLORS.length]
    }));

    // Uncategorized padding
    const uncategorizedSessions = recentSessions.filter(s => {
        if (!s.taskId) return true;
        const t = tasks.find(t => t.id === s.taskId);
        return !t || !t.projectId;
    });
    const uncategorizedHours = uncategorizedSessions.reduce((acc, s) => acc + s.duration, 0) / 3600;
    if (uncategorizedHours > 0) {
        distributionData.push({
            name: 'Uncategorized',
            value: Number(uncategorizedHours.toFixed(1)),
            color: '#888888',
            rawColor: undefined
        });
    }

    // Section 4: Task Completion Trend
    const taskCompletionData = currentWeekArray.map(d => {
        const dTime = d.getTime();
        const count = completedTasks.filter(t => {
            const completedAt = taskCompletionDates.get(t.id);
            // Default to createdAt if no sessions to interpolate completion (fallback)
            const fallbackTime = new Date(t.createdAt).getTime();
            const dateToUse = completedAt || fallbackTime;
            return startOfDay(new Date(dateToUse)).getTime() === dTime;
        }).length;
        
        return {
            name: formatDayName(d),
            completed: count
        };
    });

    // New Metrics for additional boxes
    const focusTimeThisWeekMins = recentSessions.reduce((acc, s) => acc + s.duration / 60, 0);
    const topProject = distributionData.length > 0 ? distributionData[0] : null;
    const topProjectName = topProject ? topProject.name : 'None';
    const topProjectHours = topProject ? topProject.value : 0;

    return {
      focusTimeTodayHrs,
      focusTimeTodayMins,
      focusTimeDiffMins,
      focusTimeSign,
      pomodorosToday,
      totalCompleted: completedTasks.length,
      totalTasks,
      completionRate,
      streak,
      weeklyFocusData,
      distributionData,
      taskCompletionData,
      focusTimeThisWeekMins,
      topProjectName,
      topProjectHours
    };
  }, [sessions, tasks, projects]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(0,0,0,0.85)', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{label || payload[0].name}</p>
          <p style={{ margin: '0.2rem 0 0', color: payload[0].fill || payload[0].color || '#fff' }}>
            {payload[0].value} {payload[0].dataKey === 'hours' || payload[0].name !== label ? 'hrs' : 'tasks'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading || !metrics) {
      return (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'rgba(255,255,255,0.6)'}}>
              Loading Analytics...
          </div>
      );
  }

  return (
    <div className="analytics-module" style={{ paddingBottom: '3rem' }}>
      <div className="analytics-header" style={{ marginBottom: '2rem' }}>
        <h1 className="analytics-title">Analytics</h1>
        <p className="analytics-subtitle">Track your focus and productivity over time.</p>
      </div>

      {/* TOP ROW: 4 KEY METRIC CARDS */}
      <div className="analytics-grid-4">
        <div className="analytics-card">
            <h3 className="analytics-card-title">Focus Time Today</h3>
            <p className="analytics-card-value">
              {Math.floor(metrics.focusTimeTodayMins / 60)}h {Math.floor(metrics.focusTimeTodayMins % 60)}m
            </p>
            <p className={`analytics-card-trend ${metrics.focusTimeDiffMins > 0 ? 'trend-up' : metrics.focusTimeDiffMins < 0 ? 'trend-down' : 'trend-neutral'}`}>
                {metrics.focusTimeSign}{metrics.focusTimeDiffMins} min vs yesterday
            </p>
        </div>

        <div className="analytics-card">
            <h3 className="analytics-card-title">Pomodoros Today</h3>
            <p className="analytics-card-value">{metrics.pomodorosToday} <span className="analytics-card-unit">🍅</span></p>
            <p className="analytics-card-trend trend-neutral">Goal: 10</p>
        </div>

        <div className="analytics-card">
            <h3 className="analytics-card-title">Tasks Completed</h3>
            <p className="analytics-card-value">{metrics.totalCompleted} / {metrics.totalTasks}</p>
            <p className="analytics-card-trend trend-neutral">Completion Rate: {metrics.completionRate}%</p>
        </div>

        <div className="analytics-card">
            <h3 className="analytics-card-title">Focus Streak</h3>
            <p className="analytics-card-value">{metrics.streak} <span className="analytics-card-unit">🔥</span></p>
            <p className="analytics-card-trend trend-neutral">Days</p>
        </div>

        <div className="analytics-card">
            <h3 className="analytics-card-title">Weekly Focus</h3>
            <p className="analytics-card-value">
              {Math.floor(metrics.focusTimeThisWeekMins / 60)}h {Math.floor(metrics.focusTimeThisWeekMins % 60)}m
            </p>
            <p className="analytics-card-trend trend-neutral">This Week</p>
        </div>

        <div className="analytics-card">
            <h3 className="analytics-card-title">Top Project</h3>
            <p className="analytics-card-value" style={{ fontSize: '1.25rem', marginTop: '0.4rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {metrics.topProjectName}
            </p>
            <p className="analytics-card-trend trend-neutral">{metrics.topProjectHours}h logged</p>
        </div>
      </div>

      {/* MIDDLE SECTION: WEEKLY FOCUS TREND */}
      <div className="analytics-chart-container">
        <h3 className="analytics-chart-title">Weekly Focus Time</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.weeklyFocusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM SECTION: DISTRIBUTION & EXECUTION TREND */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Focus Distribution */}
        <div className="analytics-chart-container" style={{ marginBottom: 0 }}>
          <h3 className="analytics-chart-title">Focus Distribution <span style={{fontSize:'0.9rem', color:'rgba(255,255,255,0.5)', fontWeight:400}}>(Last 7 Days)</span></h3>
          {metrics.distributionData.length === 0 ? (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
              No project focus data
            </div>
          ) : (
            <div style={{ width: '100%', height: 250, display: 'flex' }}>
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.8rem' }}>
                 {metrics.distributionData.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                       <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: entry.color }} />
                       <span style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                       <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          {entry.value}h
                       </span>
                    </div>
                 ))}
              </div>
            </div>
          )}
        </div>

        {/* Task Completion Trend */}
        <div className="analytics-chart-container" style={{ marginBottom: 0 }}>
          <h3 className="analytics-chart-title">Tasks Completed <span style={{fontSize:'0.9rem', color:'rgba(255,255,255,0.5)', fontWeight:400}}>(Last 7 Days)</span></h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.taskCompletionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
