'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        async function loadProfile() {
            setProfileLoading(true);
            const res = await fetch('/api/profile');
            const data = await res.json();
            if (!ignore) {
                setReminderEnabled(data.daily_reminder_enabled ?? false);
                setProfileLoading(false);
            }
        }

        loadProfile();

        return () => {
            ignore = true;
        };
    }, []);

    async function handleGenerateCode() {
        setLoading(true);
        const res = await fetch('/api/telegram/link', { method: 'POST' });
        const data = await res.json();
        setCode(data.code);
        setLoading(false);
    }

    async function handleSaveReminder(e: React.FormEvent) {
        e.preventDefault();
        setSavedMessage(null);
        await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daily_reminder_enabled: reminderEnabled,
            }),
        });
        setSavedMessage('Pengaturan reminder tersimpan.');
    }

    return (
        <div>
            <h1>Settings</h1>

            <h3>Hubungkan Telegram</h3>
            {!code ? (
                <button onClick={handleGenerateCode} disabled={loading}>
                    {loading ? 'Memproses...' : 'Generate Kode'}
                </button>
            ) : (
                <div>
                    <p>
                        Kirim pesan berikut ke bot Telegram{' '}
                        {botUsername && (
                            <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                                @{botUsername}
                            </a>
                        )}
                        :
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: 20 }}>/start {code}</p>
                    <p style={{ color: '#666' }}>Kode berlaku 10 menit.</p>
                </div>
            )}

            <h3 style={{ marginTop: 32 }}>Reminder Harian</h3>
            {profileLoading ? (
                <p>Memuat...</p>
            ) : (
                <form onSubmit={handleSaveReminder}>
                    <label style={{ display: 'block', marginBottom: 12 }}>
                        <input
                            type="checkbox"
                            checked={reminderEnabled}
                            onChange={(e) => setReminderEnabled(e.target.checked)}
                        />{' '}
                        Aktifkan reminder kalau belum ada transaksi tercatat hari itu (jam 20:00 WIB)
                    </label>

                    <button type="submit">Simpan</button>
                    {savedMessage && <p style={{ color: 'green' }}>{savedMessage}</p>}
                </form>
            )}
        </div>
    );
}