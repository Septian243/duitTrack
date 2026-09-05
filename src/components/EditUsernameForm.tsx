'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'same';

export default function EditUsernameForm({
    currentUsername,
    userId,
    userEmail,
    onSaved,
}: {
    currentUsername: string;
    userId: string;
    userEmail: string;
    onSaved?: (username: string) => void;
}) {
    const supabase = createClient();
    const [username, setUsername] = useState(currentUsername);
    const [status, setStatus] = useState<UsernameStatus>('idle');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const value = username.trim().toLowerCase();

        if (!value || value === currentUsername.toLowerCase() || !USERNAME_REGEX.test(value)) return;
        const timeout = setTimeout(async () => {
            const { data, error } = await supabase.rpc('is_username_available', {
                check_username: value,
                exclude_user_id: userId,
            });
            if (error) {
                console.error('Gagal cek username:', error);
                setStatus('invalid');
                return;
            }
            setStatus(data ? 'available' : 'taken');
        }, 500);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    function handleUsernameChange(value: string) {
        const normalizedValue = value.toLowerCase();
        const trimmedValue = normalizedValue.trim();
        setUsername(normalizedValue);

        if (!trimmedValue) {
            setStatus('idle');
        } else if (trimmedValue === currentUsername.toLowerCase()) {
            setStatus('same');
        } else if (!USERNAME_REGEX.test(trimmedValue)) {
            setStatus('invalid');
        } else {
            setStatus('checking');
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (status !== 'available' && status !== 'same') return;

        setSaving(true);
        setMessage(null);

        const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim().toLowerCase() }),
        });

        if (!res.ok) {
            const data = await res.json();
            setMessage(data.error || 'Gagal menyimpan username.');
            setSaving(false);
            return;
        }

        setMessage('Username berhasil diperbarui.');
        setSaving(false);
        onSaved?.(username.trim().toLowerCase());
    }

    const hintMap: Record<UsernameStatus, { text: string; color: string } | null> = {
        idle: null,
        same: null,
        invalid: { text: '3-20 karakter, huruf kecil/angka/underscore saja', color: 'text-gray-400' },
        checking: { text: 'Mengecek ketersediaan...', color: 'text-gray-400' },
        available: { text: 'Username tersedia', color: 'text-[#76C457]' },
        taken: { text: 'Username sudah dipakai', color: 'text-[#E07A5F]' },
    };
    const hint = hintMap[status];
    const canSave = (status === 'available' || status === 'same') && !saving;

    return (
        <form onSubmit={handleSave}>
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="text-sm font-medium text-gray-700">Username</label>
                    <input
                        type="text"
                        value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 mt-1 mb-1 w-full focus:outline-none focus:border-[#76C457] transition-colors"
                    />
                    {hint && <p className={`text-xs mb-2 ${hint.color}`}>{hint.text}</p>}
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        value={userEmail}
                        disabled
                        className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 mt-1 w-full text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email belum bisa diubah dari sini.</p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
                {message && <p className="text-xs text-gray-600">{message}</p>}
                <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? 'Menyimpan...' : 'Simpan Username'}
                </button>
            </div>
        </form>
    );
}
