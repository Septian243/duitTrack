'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
    theme: Theme;
    toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Keep the first render identical on the server and client.
    const [theme, setTheme] = useState<Theme>('light');

    // localStorage is only available in the browser, after hydration.
    useEffect(() => {
        const saved = localStorage.getItem('duittrack-theme') as Theme | null;
        if (saved === 'light' || saved === 'dark') {
            queueMicrotask(() => setTheme(saved));
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    function toggleTheme() {
        setTheme((prev) => {
            const next: Theme = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('duittrack-theme', next);
            return next;
        });
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
    return ctx;
}
