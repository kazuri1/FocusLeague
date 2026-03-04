import React, { useState } from 'react';
import { Button } from 'pulseui-base';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import { useMobile } from '../hooks/useMobile';

interface ControlsProps {
    onStart: () => void;
    onReset: () => void;
    onSettings: () => void;
    isPlaying: boolean;
    hasStarted: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ onStart, onReset, onSettings, isPlaying, hasStarted }) => {
    const [isResetting, setIsResetting] = useState(false);
    const isMobile = useMobile();

    const handleResetClick = () => {
        setIsResetting(true);
        onReset();
        setTimeout(() => setIsResetting(false), 400); // Wait for transition to finish
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            zIndex: 10,
            marginTop: '-2rem',
            marginBottom: '3rem'
        }}>
            <Button
                onClick={onStart}
                className="start-btn"
            >
                {isPlaying ? 'pause' : (hasStarted ? 'continue' : 'start')}
            </Button>
            <button
                onClick={handleResetClick}
                style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    transition: 'opacity 0.2s'
                }}
                aria-label="Reset Timer"
            >
                <RefreshIcon style={{ fontSize: isMobile ? '2rem' : '3rem' }} className={`reset-icon ${isResetting ? 'spinning' : ''}`} />
            </button>
            <button
                onClick={onSettings}
                style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    transition: 'opacity 0.2s'
                }}
                aria-label="Settings"
            >
                <SettingsIcon style={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }} />
            </button>
        </div>
    );
};
