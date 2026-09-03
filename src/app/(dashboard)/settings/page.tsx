'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

    async function handleGenerateCode() {
        setLoading(true);
        const res = await fetch('/api/telegram/link', { method: 'POST' });
        const data = await res.json();
        setCode(data.code);
        setLoading(false);
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
        </div>
    );
}