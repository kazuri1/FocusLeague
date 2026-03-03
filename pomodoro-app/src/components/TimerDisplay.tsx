import React from 'react';
import { useMobile } from '../hooks/useMobile';

interface TimerDisplayProps {
    time: string;
    activeMode?: 'pomodoro' | 'short break' | 'long break';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ time, activeMode }) => {
    const isMobile = useMobile();

    const getModeMessage = () => {
        if (activeMode === 'short break') return "Alright lets take a quick break";
        if (activeMode === 'long break') return "Relax lets take a break";
        return "Get back to work, Kazuri"; // default to pomodoro
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '4rem',
            zIndex: 10
        }}>
            <div style={{
                fontSize: isMobile ? 'min(25vw, 7rem)' : '12rem',
                fontWeight: 700,
                width: '100%',
                padding: '0 1rem',
                boxSizing: 'border-box',
                color: '#ffffff',
                lineHeight: 1,
                fontFamily: '"Space Grotesk", sans-serif',
                textAlign: 'center',
                letterSpacing: '-2px',
                textShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                {time}
            </div>
            
            <div style={{
                marginTop: '1rem',
                fontSize: isMobile ? '0.9rem' : '1rem',
                color: '#ffffff',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 500,
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '0.4rem 1.2rem',
                borderRadius: '8px'
            }}>
                {getModeMessage()}
            </div>
        </div>
    );
};
