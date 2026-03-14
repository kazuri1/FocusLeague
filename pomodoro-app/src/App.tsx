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
  await supabase.from('timer_state').update({
    mode,
    is_playing: isPlaying,
    time_left: timeLeft,
    last_updated: new Date().toISOString(),
    pomodoros_completed: pomodorosCompleted,
    active_task_id: activeTaskId || null,
  }).eq('id', 1);
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
        .eq('id', 1)
        .single();

      if (error || !data) {
        console.error('Failed to load timer state from Supabase:', error);
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
        { event: 'UPDATE', schema: 'public', table: 'timer_state', filter: 'id=eq.1' },
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

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
