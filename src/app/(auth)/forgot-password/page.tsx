'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const inputClass =
    'bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 my-2 w-full focus:outline-none focus:border-[#76C457] transition-colors';

export default function ForgotPasswordPage() {
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Masukkan alamat email yang valid.');
            return;
        }

        setLoading(true);

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
            return;
        }

        setSent(true);
        setLoading(false);
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md rounded-[20px] shadow-2xl overflow-hidden bg-white">
            <div className="flex flex-col items-center justify-center px-10 py-8 text-center">
                <Image src="/logo.png" alt="DuitTrack" width={160} height={160} loading="eager" className="mb-[-12px]" />

                {sent ? (
                    <>
                        <h1 className="text-3xl font-bold mb-4 font-[family-name:var(--font-sora)]">
                            Cek Email Kamu
                        </h1>
                        <p className="text-sm text-gray-600 mb-6">
                            Kalau email <strong>{email}</strong> terdaftar, kami sudah kirim link untuk reset
                            password. Cek juga folder spam kalau belum muncul.
                        </p>
                        <Link href="/login" className="text-sm font-medium text-gray-500 hover:underline">
                            Kembali ke Login
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                            Lupa Password
                        </h1>
                        <p className="text-sm text-gray-600 mb-2">
                            Masukkan email akunmu, kami kirim link untuk reset password.
                        </p>
                        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={inputClass}
                            />
                            {error && <p role="alert" className="w-full text-left text-sm font-medium text-[#E07A5F] mt-1">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-11 py-3 mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                            </button>
                        </form>
                        <Link href="/login" className="text-sm font-medium text-gray-500 mt-4 hover:underline">
                            Kembali ke Login
                        </Link>
                    </>
                )}
            </div>
        </div>
        </main>
    );
}
