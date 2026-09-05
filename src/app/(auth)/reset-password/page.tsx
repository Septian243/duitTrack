'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from '@/components/PasswordStrength';
import PasswordInput from '@/components/PasswordInput';

const inputClass =
    'bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 my-2 w-full focus:outline-none focus:border-[#76C457] transition-colors';

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password wajib diisi minimal 6 karakter.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Konfirmasi password tidak sama.');
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setTimeout(() => router.push('/login'), 2000);
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md rounded-[20px] shadow-2xl overflow-hidden bg-white">
            <div className="flex flex-col items-center justify-center px-10 py-8 text-center">
                <Image src="/logo.png" alt="DuitTrack" width={160} height={160} loading="eager" className="mb-[-12px]" />

                {success ? (
                    <>
                        <h1 className="text-3xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                            Password Berhasil Diubah
                        </h1>
                        <p className="text-sm text-gray-600">Mengalihkan ke halaman login...</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                            Set Password Baru
                        </h1>
                        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                            <PasswordInput
                                placeholder="Password Baru"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className={inputClass}
                            />
                            <PasswordInput
                                placeholder="Konfirmasi Password Baru"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={inputClass}
                            />
                            <PasswordStrength password={password} />
                            {error && <p role="alert" className="w-full text-left text-sm font-medium text-[#E07A5F] mt-2">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-11 py-3 mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Memproses...' : 'Simpan Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
        </main>
    );
}
