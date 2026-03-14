import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import './App.css';
import './modules.css';
import { ModeSelector } from './components/ModeSelector';
import { TimerDisplay } from './components/TimerDisplay';
import { Tasks } from './components/Tasks';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import { useMobile } from './hooks/useMobile';
import type { TimerSettings } from './components/SettingsModal';

import { AppProvider } from './entities/store';
import { ProjectsModule } from './modules/projects/ProjectsModule';
import { AnalyticsModule } from './modules/analytics/AnalyticsModule';
import { NotificationBell } from './components/NotificationBell';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LogIn, LogOut } from 'lucide-react';

/* eslint-disable react-hooks/set-state-in-effect */

type Mode = 'pomodoro' | 'short break' | 'long break';

const NATURE_IMAGES = [
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2560&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2560&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2560&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=2560&auto=format&fit=crop"
];

const defaultSettings: TimerSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  longBreakInterval: 4,
};

// Helper: push the full timer state to Supabase
async function pushTimerState(
  mode: Mode,
  isPlaying: boolean,
  timeLeft: number,
  pomodorosCompleted: number,
  activeTaskId: string | null
) {
  // RLS ensures we only update our own row
  await supabase.from('timer_state').update({
    mode,
    is_playing: isPlaying,
    time_left: timeLeft,
    last_updated: new Date().toISOString(),
    pomodoros_completed: pomodorosCompleted,
    active_task_id: activeTaskId || null,
  }).not('id', 'is', null);
}

function AppContent() {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const saved = localStorage.getItem('pomodoro_app_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isMobile = useMobile();
  const [currentTab, setCurrentTab] = useState<'focus' | 'tasks' | 'analytics'>('focus');

  // Timer state — initialized empty, populated from Supabase
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(defaultSettings.pomodoro * 60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ref to prevent the tick useEffect from re-pushing state during remote updates
  const suppressPushRef = useRef(false);
  // Ref to track if we are the originator of a push (to avoid echo loops)
  const localPushInFlight = useRef(false);

  const getModeTimeSeconds = (currentMode: Mode, currentSettings: TimerSettings) => {
    if (currentMode === 'pomodoro') return currentSettings.pomodoro * 60;
    if (currentMode === 'short break') return currentSettings.shortBreak * 60;
    return currentSettings.longBreak * 60;
  };

  // ── 1. Load initial state from Supabase ──────────────────────────────────
  useEffect(() => {
    const loadState = async () => {
      const { data, error } = await supabase
        .from('timer_state')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Failed to load timer state from Supabase:', error);
        setIsLoaded(true);
        return;
      }

      // No row exists for this user — create one
      if (!data) {
        const defaultTimeLeft = getModeTimeSeconds('pomodoro', settings);
        await supabase.from('timer_state').insert([{
          mode: 'pomodoro',
          is_playing: false,
          time_left: defaultTimeLeft,
          last_updated: new Date().toISOString(),
          pomodoros_completed: 0,
        }]);
        setIsLoaded(true);
        return;
      }

      const remoteMode = data.mode as Mode;
      const remotePlaying = data.is_playing as boolean;
      const remoteTimeLeft = data.time_left as number;
      const remoteLastUpdated = new Date(data.last_updated).getTime();
      const remotePomosCompleted = data.pomodoros_completed as number;

      // Apply time-offset: if the timer was running when we opened the page,
      // fast-forward by the elapsed seconds since last_updated.
      let computedTimeLeft = remoteTimeLeft;
      if (remotePlaying) {
        const elapsedSeconds = Math.floor((Date.now() - remoteLastUpdated) / 1000);
        computedTimeLeft = Math.max(0, remoteTimeLeft - elapsedSeconds);
      }

      suppressPushRef.current = true;
      setMode(remoteMode);
      setTimeLeft(computedTimeLeft);
      setIsPlaying(remotePlaying);
      setPomodorosCompleted(remotePomosCompleted);
      setIsLoaded(true);
      // Brief delay to let re-renders settle before re-enabling push
      setTimeout(() => { suppressPushRef.current = false; }, 200);
    };

    loadState();
  }, []);

  // ── 2. Supabase Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel('timer-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'timer_state' },
        (payload) => {
          // If we sent this update ourselves, ignore the echo
          if (localPushInFlight.current) return;

          const d = payload.new as any;
          const remoteMode = d.mode as Mode;
          const remotePlaying = d.is_playing as boolean;
          const remoteTimeLeft = d.time_left as number;
          const remoteLastUpdated = new Date(d.last_updated).getTime();
          const remotePomosCompleted = d.pomodoros_completed as number;

          let computedTimeLeft = remoteTimeLeft;
          if (remotePlaying) {
            const elapsed = Math.floor((Date.now() - remoteLastUpdated) / 1000);
            computedTimeLeft = Math.max(0, remoteTimeLeft - elapsed);
          }

          suppressPushRef.current = true;
          setMode(remoteMode);
          setTimeLeft(computedTimeLeft);
          setIsPlaying(remotePlaying);
          setPomodorosCompleted(remotePomosCompleted);
          setTimeout(() => { suppressPushRef.current = false; }, 200);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoaded]);

  // ── 3. Tick the local timer every second ─────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && isLoaded) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isLoaded]);

  // ── 4. Persist settings to localStorage ──────────────────────────────────
  useEffect(() => {
    localStorage.setItem('pomodoro_app_settings', JSON.stringify(settings));
  }, [settings]);

  // ── 5. Rotate background images ──────────────────────────────────────────
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % NATURE_IMAGES.length);
    }, 30000);
    return () => clearInterval(bgInterval);
  }, []);

  // ── 6. Handle timer completion ────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (isPlaying && timeLeft === 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => console.error("Error playing sound:", e));
      setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 5000);

      let nextMode: Mode = 'pomodoro';
      let nextPlaying = false;
      let nextPomos = pomodorosCompleted;

      if (mode === 'pomodoro') {
        window.dispatchEvent(new CustomEvent('pomodoroCompleted'));

        try {
          const activeTaskId = localStorage.getItem('fl_activeTaskId');
          if (activeTaskId && activeTaskId !== 'null' && activeTaskId !== 'undefined') {
            supabase.from('pomodoro_sessions').insert([{
              task_id: activeTaskId,
              type: 'focus',
              duration: settings.pomodoro * 60,
              completed: true
            }]).then(({ error }: any) => {
              if (error) console.error("Supabase session insert error:", error);
            });
          }
        } catch (e) {
          console.error("Failed to save session to analytics cloud", e);
        }

        const newCount = pomodorosCompleted + 1;
        if (newCount >= settings.longBreakInterval) {
          nextMode = 'long break';
          nextPomos = 0;
        } else {
          nextMode = 'short break';
          nextPomos = newCount;
        }
        nextPlaying = settings.autoStartBreaks;
      } else {
        nextMode = 'pomodoro';
        nextPlaying = settings.autoStartPomodoros;
      }

      const nextTimeLeft = getModeTimeSeconds(nextMode, settings);
      const activeTaskId = localStorage.getItem('fl_activeTaskId');

      setMode(nextMode);
      setTimeLeft(nextTimeLeft);
      setIsPlaying(nextPlaying);
      setPomodorosCompleted(nextPomos);

      // Push final state to cloud
      localPushInFlight.current = true;
      pushTimerState(nextMode, nextPlaying, nextTimeLeft, nextPomos, activeTaskId).finally(() => {
        setTimeout(() => { localPushInFlight.current = false; }, 300);
      });
    }
  }, [timeLeft, isPlaying, mode, settings, pomodorosCompleted, isLoaded]);

  // ── 7. Update document title ──────────────────────────────────────────────
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - FocusLeague`;
  }, [timeLeft]);

  // ── Interaction handlers ─────────────────────────────────────────────────
  const handleModeChange = (newMode: Mode) => {
    const newTimeLeft = getModeTimeSeconds(newMode, settings);
    const activeTaskId = localStorage.getItem('fl_activeTaskId');
    setMode(newMode);
    setTimeLeft(newTimeLeft);
    setIsPlaying(false);

    localPushInFlight.current = true;
    pushTimerState(newMode, false, newTimeLeft, pomodorosCompleted, activeTaskId).finally(() => {
      setTimeout(() => { localPushInFlight.current = false; }, 300);
    });
  };

  const togglePlay = () => {
    const activeTaskId = localStorage.getItem('fl_activeTaskId');
    const hasActiveTask = activeTaskId && activeTaskId !== 'null' && activeTaskId !== 'undefined' && activeTaskId.trim() !== '';

    if (!hasActiveTask && mode === 'pomodoro' && !isPlaying) {
      window.alert('Please select a task before starting a pomodoro session');
      return;
    }

    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);

    localPushInFlight.current = true;
    pushTimerState(mode, newPlaying, timeLeft, pomodorosCompleted, activeTaskId).finally(() => {
      setTimeout(() => { localPushInFlight.current = false; }, 300);
    });
  };

  const handleReset = () => {
    const newTimeLeft = getModeTimeSeconds(mode, settings);
    const activeTaskId = localStorage.getItem('fl_activeTaskId');
    setIsPlaying(false);
    setTimeLeft(newTimeLeft);

    localPushInFlight.current = true;
    pushTimerState(mode, false, newTimeLeft, pomodorosCompleted, activeTaskId).finally(() => {
      setTimeout(() => { localPushInFlight.current = false; }, 300);
    });
  };

  const handleSettingsChange = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (!isPlaying) {
      const newTimeLeft = getModeTimeSeconds(mode, newSettings);
      setTimeLeft(newTimeLeft);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container" style={{ paddingLeft: isMobile ? '1rem' : '0', paddingRight: isMobile ? '1rem' : '0' }}>
      {NATURE_IMAGES.map((imgUrl, index) => (
        <div
          key={imgUrl}
          className="background-image"
          style={{
            backgroundImage: `url(${imgUrl})`,
            opacity: index === currentImageIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: 0
          }}
        ></div>
      ))}
      <div className="background-overlay"></div>

      <img src="/logo.png" alt="FocusLeague" className="app-logo" style={{ top: isMobile ? '3rem' : '1.5rem', height: isMobile ? '48px' : '72px' }} />
      <HeaderAuth />
      <NotificationBell />

      {/* Top Center Tab Toggle */}
      <div style={{
          position: 'absolute',
          top: isMobile ? '3rem' : '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '0.3rem',
          borderRadius: '30px',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
      }}>
          <button onClick={() => setCurrentTab('focus')} style={{ background: currentTab === 'focus' ? '#ffffff' : 'transparent', color: currentTab === 'focus' ? '#000000' : '#ffffff', border: 'none', borderRadius: '20px', padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.95rem', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              Focus
          </button>
          <button onClick={() => setCurrentTab('tasks')} style={{ background: currentTab === 'tasks' ? '#ffffff' : 'transparent', color: currentTab === 'tasks' ? '#000000' : '#ffffff', border: 'none', borderRadius: '20px', padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.95rem', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              Projects
          </button>
          <button onClick={() => setCurrentTab('analytics')} style={{ background: currentTab === 'analytics' ? '#ffffff' : 'transparent', color: currentTab === 'analytics' ? '#000000' : '#ffffff', border: 'none', borderRadius: '20px', padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.95rem', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              Analytics
          </button>
      </div>

      <div style={{ position: 'relative', zIndex: 10, paddingTop: '8rem', width: '100%', maxWidth: '1200px' }}>
        {currentTab === 'focus' && (
          <>
              <ModeSelector activeMode={mode} onModeChange={handleModeChange} />
              <TimerDisplay time={formatTime(timeLeft)} activeMode={mode} />
              <Controls
                  onStart={togglePlay}
                  onReset={handleReset}
                  onSettings={() => setIsSettingsOpen(true)}
                  isPlaying={isPlaying}
                  hasStarted={timeLeft < getModeTimeSeconds(mode, settings)}
              />
              <Tasks />
          </>
        )}

        {currentTab === 'tasks' && (
          <div className="module-container">
            <ProjectsModule />
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="module-container">
            <AnalyticsModule />
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

function HeaderAuth() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email;

  return (
    <div ref={dropdownRef} style={{
      position: 'absolute',
      top: isMobile ? '3.5rem' : '2.5rem',
      right: isMobile ? '4.5rem' : '6rem',
      zIndex: 100,
    }}>
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
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
          padding: 0,
          overflow: 'hidden',
          color: '#fff'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {user && avatar ? (
          <img src={avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        ) : (
          <LogIn size={20} />
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '55px',
          right: '0',
          width: '280px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
          color: '#333'
        }}>
          {user ? (
            <>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid #eee',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {avatar && <img src={avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#333' }}>{name}</div>
                  {user.email && <div style={{ fontSize: '0.8rem', color: '#888' }}>{user.email}</div>}
                </div>
              </div>
              <button
                onClick={() => { signOut(); setIsOpen(false); }}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#555',
                  fontFamily: '"Space Grotesk", sans-serif',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={18} /> Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => { signInWithGoogle(); setIsOpen(false); }}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#333',
                fontFamily: '"Space Grotesk", sans-serif',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
