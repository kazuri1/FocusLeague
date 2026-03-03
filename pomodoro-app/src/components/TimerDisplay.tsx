import React from 'react';
import { useMobile } from '../hooks/useMobile';

interface TimerDisplayProps {
    time: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ time }) => {
    const isMobile = useMobile();

    return (
        <div style={{
            fontSize: isMobile ? 'min(25vw, 7rem)' : '12rem',
            fontWeight: 700,
            width: '100%',
            padding: '0 1rem',
            boxSizing: 'border-box',
            color: '#ffffff',
            lineHeight: 1,
            marginBottom: '4rem',
            fontFamily: '"Space Grotesk", sans-serif',
            textAlign: 'center',
            letterSpacing: '-2px',
            textShadow: '0 4px 20px rgba(0,0,0,0.1)',
            zIndex: 10
        }}>
            {time}
        </div>
    );
};
