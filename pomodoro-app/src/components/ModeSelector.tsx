import React from 'react';

type Mode = 'pomodoro' | 'short break' | 'long break';

interface ModeSelectorProps {
    activeMode: Mode;
    onModeChange: (mode: Mode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ activeMode, onModeChange }) => {
    const modes: Mode[] = ['pomodoro', 'short break', 'long break'];

    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            marginBottom: '4rem',
            zIndex: 10
        }}>
            {modes.map(mode => {
                const isActive = activeMode === mode;
                return (
                    <button
                        key={mode}
                        onClick={() => onModeChange(mode)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '9999px',
                            border: isActive ? '2px solid transparent' : '1px solid #ffffff',
                            backgroundColor: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#000000' : '#ffffff',
                            fontSize: '1.2rem',
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
