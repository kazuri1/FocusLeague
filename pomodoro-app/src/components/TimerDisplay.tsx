import React from 'react';

interface TimerDisplayProps {
    time: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ time }) => {
    return (
        <div style={{
            fontSize: '12rem',
            fontWeight: 700,
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
