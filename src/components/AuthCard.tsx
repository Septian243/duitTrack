'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from '@/components/PasswordStrength';
import PasswordInput from '@/components/PasswordInput';

type Mode = 'signin' | 'signup';

const inputClass =
    'bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 my-1.5 w-full focus:outline-none focus:border-[#76C457] transition-colors';

const logoClass = 'mb-[-12px]';
const validationClass = 'w-full text-left text-sm font-medium text-[#E07A5F] mt-2';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

function getAuthError(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('email not confirmed')) {
        return 'Email belum dikonfirmasi. Silakan cek inbox atau folder spam email kamu.';
    }
    if (normalizedMessage.includes('invalid login credentials')) {
        return 'Username/email atau password salah.';
    }
    if (normalizedMessage.includes('user already registered')) {
        return 'Email ini sudah terdaftar. Silakan login.';
    }
    if (normalizedMessage.includes('password')) {
        return 'Password tidak memenuhi syarat. Gunakan minimal 6 karakter.';
    }

    return 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function AuthCard({ initialMode }: { initialMode: Mode }) {
    const router = useRouter();
    const supabase = createClient();

    const [mode, setMode] = useState<Mode>(initialMode);
    const isSignUp = mode === 'signup';

    // State form Sign Up
    const [signUpUsername, setSignUpUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
    const [signUpLoading, setSignUpLoading] = useState(false);
    const [signUpError, setSignUpError] = useState<string | null>(null);
    const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

    // State form Sign In (identifier = username ATAU email)
    const [signInIdentifier, setSignInIdentifier] = useState('');
    const [signInPassword, setSignInPassword] = useState('');
    const [signInLoading, setSignInLoading] = useState(false);
    const [signInError, setSignInError] = useState<string | null>(null);

    // Cek ketersediaan username - debounce 500ms
    useEffect(() => {
        const value = signUpUsername.trim().toLowerCase();

        if (!value || !USERNAME_REGEX.test(value)) return;
        const timeout = setTimeout(async () => {
            const { data, error } = await supabase.rpc('is_username_available', {
                check_username: value,
            });
            if (error) {
                console.error('Gagal cek username:', error);
                setUsernameStatus('invalid');
                return;
            }
            setUsernameStatus(data ? 'available' : 'taken');
        }, 500);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signUpUsername]);

    function handleUsernameChange(value: string) {
        const normalizedValue = value.toLowerCase();
        setSignUpUsername(normalizedValue);

        if (!normalizedValue.trim()) {
            setUsernameStatus('idle');
        } else if (!USERNAME_REGEX.test(normalizedValue.trim())) {
            setUsernameStatus('invalid');
        } else {
            setUsernameStatus('checking');
        }
    }

    async function handleSignUp(e: React.FormEvent) {
        e.preventDefault();
        setSignUpError(null);
        setSignUpSuccess(null);

        if (usernameStatus !== 'available') {
            setSignUpError('Pastikan username valid dan tersedia sebelum daftar.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail)) {
            setSignUpError('Masukkan alamat email yang valid.');
            return;
        }
        if (signUpPassword.length < 6) {
            setSignUpError('Password wajib diisi minimal 6 karakter.');
            return;
        }
        if (signUpPassword !== signUpConfirmPassword) {
            setSignUpError('Konfirmasi password tidak sama.');
            return;
        }

        setSignUpLoading(true);

        const { error } = await supabase.auth.signUp({
            email: signUpEmail,
            password: signUpPassword,
            options: {
                data: { username: signUpUsername.trim().toLowerCase() },
            },
        });

        if (error) {
            setSignUpError(getAuthError(error.message));
            setSignUpLoading(false);
            return;
        }

        setSignUpLoading(false);
        setSignUpSuccess('Pendaftaran berhasil. Silakan cek email untuk konfirmasi akun sebelum login.');
    }

    async function handleSignIn(e: React.FormEvent) {
        e.preventDefault();
        setSignInError(null);

        if (!signInIdentifier.trim()) {
            setSignInError('Username atau email wajib diisi.');
            return;
        }
        if (!signInPassword) {
            setSignInError('Password wajib diisi.');
            return;
        }

        setSignInLoading(true);

        let emailToUse = signInIdentifier.trim();

        // Kalau input bukan format email, anggap itu username - cari email-nya lewat RPC aman
        if (!emailToUse.includes('@')) {
            const { data, error: rpcError } = await supabase.rpc('get_email_by_username', {
                check_username: emailToUse.toLowerCase(),
            });

            if (rpcError || !data) {
                setSignInError('Username/email atau password salah.');
                setSignInLoading(false);
                return;
            }

            emailToUse = data;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: signInPassword,
        });

        if (error) {
            setSignInError(getAuthError(error.message));
            setSignInLoading(false);
            return;
        }

        router.push('/');
        router.refresh();
    }

    const usernameHint: Record<UsernameStatus, { text: string; color: string } | null> = {
        idle: null,
        invalid: { text: '3-20 karakter, huruf kecil/angka/underscore saja', color: 'text-gray-400' },
        checking: { text: 'Mengecek ketersediaan...', color: 'text-gray-400' },
        available: { text: 'Username tersedia', color: 'text-[#76C457]' },
        taken: { text: 'Username sudah dipakai', color: 'text-[#E07A5F]' },
    };
    const hint = usernameHint[usernameStatus];

    return (
        <div className="relative w-full max-w-4xl min-h-[600px] mx-auto my-12 rounded-[20px] shadow-2xl overflow-hidden bg-white">
            {/* Sign Up form */}
            <div
                className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-[600ms] ease-in-out
          ${isSignUp ? 'translate-x-full opacity-100 z-[5]' : 'translate-x-full opacity-0 z-[1]'}
          max-md:static max-md:w-full max-md:translate-x-0
          ${isSignUp ? 'max-md:block' : 'max-md:hidden'}`}
            >
                <form
                    className="flex scale-[0.92] flex-col items-center justify-center h-full origin-center px-10 py-3 text-center bg-white"
                    onSubmit={handleSignUp}
                >
                    <Image src="/logo.png" alt="DuitTrack" width={140} height={140} loading="eager" className={logoClass} />
                    <h1 className="text-2xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                        Register
                    </h1>
                    <input
                        type="text"
                        placeholder="Username"
                        value={signUpUsername}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        required
                        className={inputClass}
                    />
                    {hint && <p className={`w-full text-left text-xs -mt-1 mb-1 ${hint.color}`}>{hint.text}</p>}
                    <input
                        type="email"
                        placeholder="Email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                        className={inputClass}
                    />
                    <PasswordInput
                        placeholder="Password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        minLength={6}
                        aria-label="Password"
                        className={inputClass}
                    />
                    <PasswordStrength password={signUpPassword} />
                    <PasswordInput
                        placeholder="Konfirmasi Password"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        required
                        aria-label="Konfirmasi Password"
                        className={inputClass}
                    />
                    {signUpError && <p role="alert" className={validationClass}>{signUpError}</p>}
                    {signUpSuccess && (
                        <p role="status" className="w-full text-left text-sm font-medium text-[#4F9D69] mt-2">
                            {signUpSuccess}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={signUpLoading}
                        className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-11 py-3 mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {signUpLoading ? 'Memproses...' : 'Register'}
                    </button>
                </form>
            </div>

            {/* Sign In form */}
            <div
                className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-[600ms] ease-in-out z-[2]
          ${isSignUp ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
          max-md:static max-md:w-full max-md:translate-x-0 max-md:opacity-100
          ${isSignUp ? 'max-md:hidden' : 'max-md:block'}`}
            >
                <form
                    className="flex flex-col items-center justify-center h-full px-10 text-center bg-white -translate-y-8"
                    onSubmit={handleSignIn}
                >
                    <Image src="/logo.png" alt="DuitTrack" width={160} height={160} loading="eager" className={logoClass} />
                    <h1 className="text-2xl font-bold mb-2 font-[family-name:var(--font-sora)]">Login</h1>
                    <input
                        type="text"
                        placeholder="Username atau Email"
                        value={signInIdentifier}
                        onChange={(e) => setSignInIdentifier(e.target.value)}
                        required
                        className={inputClass}
                    />
                    <PasswordInput
                        placeholder="Password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        className={inputClass}
                    />
                    <a href="/forgot-password" className="text-sm text-gray-500 mt-3 hover:underline">
                        Lupa Password?
                    </a>
                    {signInError && <p role="alert" className={validationClass}>{signInError}</p>}
                    <button
                        type="submit"
                        disabled={signInLoading}
                        className="rounded-full bg-[#76C457] text-white text-xs font-bold uppercase tracking-wider px-11 py-3 mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {signInLoading ? 'Memproses...' : 'Login'}
                    </button>
                </form>
            </div>

            {/* Overlay hijau dengan tombol switch - disembunyikan di mobile */}
            <div
                className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden z-[100] transition-transform duration-[600ms] ease-in-out
          ${isSignUp ? '-translate-x-full' : 'translate-x-0'}`}
            >
                <div
                    className={`relative -left-full h-full w-[200%] bg-gradient-to-br from-[#76C457] to-[#5CA843] text-white transition-transform duration-[600ms] ease-in-out
            ${isSignUp ? 'translate-x-1/2' : 'translate-x-0'}`}
                >
                    <div
                        className={`absolute top-0 h-full w-1/2 flex flex-col items-center justify-center px-10 text-center transition-transform duration-[600ms] ease-in-out
              ${isSignUp ? 'translate-x-0' : '-translate-x-[20%]'}`}
                    >
                        <h1 className="text-2xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                            Selamat Datang Kembali!
                        </h1>
                        <p className="text-sm mb-4">Yuk, Login dan lanjut pantau target keuanganmu di duitTrack.</p>
                        <button
                            type="button"
                            onClick={() => setMode('signin')}
                            className="rounded-full bg-transparent border border-white text-white text-xs font-bold uppercase tracking-wider px-11 py-3 hover:opacity-90 transition-opacity"
                        >
                            Login
                        </button>
                    </div>
                    <div
                        className={`absolute top-0 right-0 h-full w-1/2 flex flex-col items-center justify-center px-10 text-center transition-transform duration-[600ms] ease-in-out
              ${isSignUp ? 'translate-x-[20%]' : 'translate-x-0'}`}
                    >
                        <h1 className="text-2xl font-bold mb-2 font-[family-name:var(--font-sora)]">
                            Mulai Perjalanan Finansialmu
                        </h1>
                        <p className="text-sm mb-4">Yuk, gabung dan buat pencatatan keuanganmu jadi lebih rapi dan praktis.</p>
                        <button
                            type="button"
                            onClick={() => setMode('signup')}
                            className="rounded-full bg-transparent border border-white text-white text-xs font-bold uppercase tracking-wider px-11 py-3 hover:opacity-90 transition-opacity"
                        >
                            Register
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
