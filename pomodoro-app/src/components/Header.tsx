import React from 'react';
import { Button } from 'pulseui-base';

export const Header: React.FC = () => {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            borderBottom: '1px solid #eaeaea',
            backgroundColor: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#ff624d',
                fontFamily: 'Inter, sans-serif'
            }}>
                Pomodoro
            </div>
            <div>
                <Button variant="filled">Sign In</Button>
            </div>
        </header>
    );
};
