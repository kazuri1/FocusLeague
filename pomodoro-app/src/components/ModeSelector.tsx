import React from 'react';
import { useMobile } from '../hooks/useMobile';

type Mode = 'pomodoro' | 'short break' | 'long break';

interface ModeSelectorProps {
    activeMode: Mode;
    onModeChange: (mode: Mode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ activeMode, onModeChange }) => {
    const modes: Mode[] = ['pomodoro', 'short break', 'long break'];
    const isMobile = useMobile();

    return (
        <div style={{
            display: 'flex',
            gap: isMobile ? '0.5rem' : '1rem',
            justifyContent: 'center',
            marginBottom: isMobile ? '2rem' : '4rem',
            zIndex: 10,
            flexWrap: 'wrap',
            padding: '0 1rem'
        }}>
            {modes.map(mode => {
                const isActive = activeMode === mode;
                return (
                    <button
                        key={mode}
                        onClick={() => onModeChange(mode)}
                        style={{
                            padding: isMobile ? '0.4rem 1rem' : '0.5rem 1.5rem',
                            borderRadius: '9999px',
                            border: isActive ? '2px solid transparent' : '1px solid #ffffff',
                            backgroundColor: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#000000' : '#ffffff',
                            fontSize: isMobile ? '1rem' : '1.2rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: '"Space Grotesk", sans-serif',
                            textTransform: 'lowercase',
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {mode}
                    </button>
                );
            })}
        </div>
    );
};
