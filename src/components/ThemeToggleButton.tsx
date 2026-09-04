'use client';

import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggleButton() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button onClick={toggleTheme} style={{ marginLeft: 12 }}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
    );
}