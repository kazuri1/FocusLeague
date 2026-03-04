import { TextInput } from 'pulseui-base';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';

export interface TimerSettings {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    autoStartBreaks: boolean;
    autoStartPomodoros: boolean;
    longBreakInterval: number;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: TimerSettings;
    onSettingsChange: (newSettings: TimerSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    settings, 
    onSettingsChange 
}) => {
    
    // Hold local settings to prevent immediate updates to main timer
    const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);

    // reset local changes on open event if unsaved matching globals
    useEffect(() => {
        if (isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    const handleChange = (key: keyof TimerSettings, value: number | boolean) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        onSettingsChange(localSettings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', fontFamily: '"Space Grotesk", sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                        <div style={{paddingLeft: '2rem', color: '#bdbdbd', fontWeight: 700, letterSpacing: '1px', flex: 1, textAlign: 'center' }}>
                            SETTING
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bdbdbd', display: 'flex' }}>
                            <CloseIcon />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#bdbdbd', fontWeight: 700, letterSpacing: '1px' }}>
                        <AccessTimeIcon fontSize="small" />
                        TIMER
                    </div>

                    <div style={{ fontWeight: 600, color: '#4f4f4f', marginBottom: '0.5rem' }}>
                        Time (minutes)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <div style={{ color: '#bdbdbd', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pomodoro</div>
                            <div className="settings-input">
                                <TextInput 
                                    type="number" 
                                    value={localSettings.pomodoro.toString()} 
                                    onChange={(val) => handleChange('pomodoro', parseInt(val) || 0)}
                                />
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#bdbdbd', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Short Break</div>
                            <div className="settings-input">
                                <TextInput 
                                    type="number" 
                                    value={localSettings.shortBreak.toString()} 
                                    onChange={(val) => handleChange('shortBreak', parseInt(val) || 0)}
                                />
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#bdbdbd', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Long Break</div>
                            <div className="settings-input">
                                <TextInput 
                                    type="number" 
                                    value={localSettings.longBreak.toString()} 
                                    onChange={(val) => handleChange('longBreak', parseInt(val) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                        <div style={{ fontWeight: 600, color: '#4f4f4f' }}>Auto Start Breaks</div>
                        <label className="custom-switch">
                            <input 
                                type="checkbox"
                                checked={localSettings.autoStartBreaks} 
                                onChange={(e) => handleChange('autoStartBreaks', e.target.checked)} 
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                        <div style={{ fontWeight: 600, color: '#4f4f4f' }}>Auto Start Pomodoros</div>
                        <label className="custom-switch">
                            <input 
                                type="checkbox"
                                checked={localSettings.autoStartPomodoros} 
                                onChange={(e) => handleChange('autoStartPomodoros', e.target.checked)} 
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                        <div style={{ fontWeight: 600, color: '#4f4f4f' }}>Long Break interval</div>
                        <div className="settings-input" style={{ width: '80px' }}>
                            <TextInput 
                                type="number" 
                                value={localSettings.longBreakInterval.toString()} 
                                onChange={(val) => handleChange('longBreakInterval', parseInt(val) || 0)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button 
                            onClick={onClose}
                            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e0e0e0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600, color: '#4f4f4f', fontFamily: '"Space Grotesk", sans-serif' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#333', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif' }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
