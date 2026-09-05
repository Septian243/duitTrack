'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from '@/components/PasswordStrength';
import PasswordInput from '@/components/PasswordInput';

export default function ChangePasswordForm({ email }: { email: string }) {
    const supabase = createClient();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password baru tidak sama.');
            return;
        }

        setLoading(true);

        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email,
            password: currentPassword,
        });

        if (verifyError) {
            setError('Password saat ini salah.');
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        setSuccess('Password berhasil diubah.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
    }

    const inputClass =
        'bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 mt-1 mb-1 w-full focus:outline-none focus:border-[#76C457] transition-colors';

    return (
        <form onSubmit={handleSubmit}>
            <div className="w-full">
                <label className="text-sm font-medium text-gray-700">Password Saat Ini</label>
                <PasswordInput
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className={inputClass}
                />

                <label className="text-sm font-medium text-gray-700">Password Baru</label>
                <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClass}
                />
                <PasswordStrength password={newPassword} />

                <label className="text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClass}
                />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
                {error && <p className="text-xs text-[#E07A5F]">{error}</p>}
                {success && <p className="text-xs text-[#4F9D69]">{success}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {loading ? 'Memproses...' : 'Ganti Password'}
                </button>
            </div>
        </form>
    );
}
