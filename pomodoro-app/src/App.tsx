import { useState, useEffect } from 'react';
import './App.css';
import { ModeSelector } from './components/ModeSelector';
import { TimerDisplay } from './components/TimerDisplay';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import type { TimerSettings } from './components/SettingsModal';

type Mode = 'pomodoro' | 'short break' | 'long break';

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

  const getModeTimeSeconds = (currentMode: Mode, currentSettings: TimerSettings) => {
    if (currentMode === 'pomodoro') return currentSettings.pomodoro * 60;
    if (currentMode === 'short break') return currentSettings.shortBreak * 60;
    return currentSettings.longBreak * 60;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getModeTimeSeconds('pomodoro', defaultSettings));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsPlaying(false);
            
            // Play notification sound repeatedly for 2 seconds
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.loop = true;
            audio.play().catch(e => console.error("Error playing sound:", e));
            
            setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
            }, 2000);

            // If a break just finished, switch back to Pomodoro
            if (mode === 'short break' || mode === 'long break') {
                setMode('pomodoro');
                return getModeTimeSeconds('pomodoro', settings);
            }

            // If auto-start breaks is enabled (could be added later based on settings.autoStartBreaks)
            // For now, it just resets the current mode's time if we are not switching modes.
            return getModeTimeSeconds(mode, settings);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, mode, settings]);

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

  return (
    <div className="app-container">
      <img src="/logo.png" alt="FocusLeague" className="app-logo" />
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} />
      <TimerDisplay time={formatTime(timeLeft)} />
      <Controls
        onStart={togglePlay}
        onReset={handleReset}
        onSettings={() => setIsSettingsOpen(true)}
        isPlaying={isPlaying}
      />
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
