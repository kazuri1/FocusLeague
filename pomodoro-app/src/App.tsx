import { useState, useEffect } from 'react';
import './App.css';
import { ModeSelector } from './components/ModeSelector';
import { TimerDisplay } from './components/TimerDisplay';
import { Tasks } from './components/Tasks';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import { useMobile } from './hooks/useMobile';
import type { TimerSettings } from './components/SettingsModal';

/* eslint-disable react-hooks/set-state-in-effect */

type Mode = 'pomodoro' | 'short break' | 'long break';

const NATURE_IMAGES = [
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop", // Forest path
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2560&auto=format&fit=crop", // Mountains
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2560&auto=format&fit=crop", // Nature landscape
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2560&auto=format&fit=crop", // Calm lake
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=2560&auto=format&fit=crop"  // Waterfall
];

const defaultSettings: TimerSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  longBreakInterval: 4,
};

function App() {
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isMobile = useMobile();

  const getModeTimeSeconds = (currentMode: Mode, currentSettings: TimerSettings) => {
    if (currentMode === 'pomodoro') return currentSettings.pomodoro * 60;
    if (currentMode === 'short break') return currentSettings.shortBreak * 60;
    return currentSettings.longBreak * 60;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getModeTimeSeconds('pomodoro', defaultSettings));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState<number>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    // Change background image every 30 seconds
    const bgInterval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % NATURE_IMAGES.length);
    }, 30000);
    return () => clearInterval(bgInterval);
  }, []);

  useEffect(() => {
    if (isPlaying && timeLeft === 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => console.error("Error playing sound:", e));
      
      setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
      }, 5000);

      let nextMode: Mode = 'pomodoro';
      let nextPlaying = false;

      if (mode === 'pomodoro') {
          const newCount = pomodorosCompleted + 1;
          if (newCount >= settings.longBreakInterval) {
              nextMode = 'long break';
              setPomodorosCompleted(0);
          } else {
              nextMode = 'short break';
              setPomodorosCompleted(newCount);
          }
          nextPlaying = settings.autoStartBreaks;
      } else {
          nextMode = 'pomodoro';
          nextPlaying = settings.autoStartPomodoros;
      }

      setMode(nextMode);
      setTimeLeft(getModeTimeSeconds(nextMode, settings));
      setIsPlaying(nextPlaying);
    }
  }, [timeLeft, isPlaying, mode, settings, pomodorosCompleted]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(getModeTimeSeconds(newMode, settings));
    setIsPlaying(false);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleReset = () => {
    setIsPlaying(false);
    setTimeLeft(getModeTimeSeconds(mode, settings));
  };

  const handleSettingsChange = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (!isPlaying) {
      setTimeLeft(getModeTimeSeconds(mode, newSettings));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - FocusLeague`;
  }, [timeLeft]);

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
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} />
      <TimerDisplay time={formatTime(timeLeft)} activeMode={mode} />
      <Controls
        onStart={togglePlay}
        onReset={handleReset}
        onSettings={() => setIsSettingsOpen(true)}
        isPlaying={isPlaying}
      />
      <Tasks />
      
   
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onSettingsChange={handleSettingsChange} 
      />
    </div>
  );
}

export default App;
