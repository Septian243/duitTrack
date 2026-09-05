'use client';

import { useState } from 'react';
import { User, KeyRound, ShieldCheck } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import EditUsernameForm from '@/components/EditUsernameForm';
import ChangePasswordForm from '@/components/ChangePasswordForm';

type Tab = 'profile' | 'password';

const guideContent: Record<Tab, { title: string; description: string; tips: string[] }> = {
    profile: {
        title: 'Panduan Profile',
        description: 'Pastikan data profilemu valid dan mudah dikenali di DuitTrack.',
        tips: [
            'Username unik dan tanpa spasi.',
            'Foto profile membantu pengenalan akun.',
            'Email terdaftar tidak bisa diubah sendiri.',
        ],
    },
    password: {
        title: 'Panduan Keamanan',
        description: 'Jaga akunmu tetap aman dengan password yang kuat.',
        tips: [
            'Gunakan password yang kuat dan unik.',
            'Jangan gunakan password yang sama dengan akun lain.',
            'Jangan bagikan password ke siapa pun.',
        ],
    },
};

export default function ProfileTabs({
    userId,
    userEmail,
    initialUsername,
    initialAvatarUrl,
}: {
    userId: string;
    userEmail: string;
    initialUsername: string;
    initialAvatarUrl: string | null;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [username, setUsername] = useState(initialUsername);
    const initial = username ? username.charAt(0).toUpperCase() : '?';
    const guide = guideContent[activeTab];

    return (
        <div className="w-full">
            {/* Header card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-start gap-6">
                <AvatarUpload
                    userId={userId}
                    initialAvatarUrl={initialAvatarUrl}
                    fallbackInitial={initial}
                />
                <div>
                    <h1 className="text-2xl font-bold font-[family-name:var(--font-sora)] mb-2">
                        {username || 'Pengguna'}
                    </h1>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
                            <User size={12} />@{username}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
                            {userEmail}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400">
                        Kelola informasi profile dan keamanan akunmu melalui halaman ini.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
                {/* Tab card */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex gap-6 border-b border-gray-100 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'profile' ? 'border-[#76C457] text-[#76C457]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <User size={16} />
                            Data Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('password')}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'password' ? 'border-[#76C457] text-[#76C457]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <KeyRound size={16} />
                            Ganti Password
                        </button>
                    </div>

                    <div key={activeTab} className="animate-fade-slide-in">
                        {activeTab === 'profile' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Informasi Dasar</h3>
                                <EditUsernameForm
                                    currentUsername={username}
                                    userId={userId}
                                    userEmail={userEmail}
                                    onSaved={(newUsername) => setUsername(newUsername)}
                                />
                            </div>
                        )}

                        {activeTab === 'password' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Ganti Password</h3>
                                <ChangePasswordForm email={userEmail} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Tips card - konten berubah sesuai tab aktif */}
                <div key={`guide-${activeTab}`} className="bg-white rounded-2xl p-6 h-fit text-center animate-fade-slide-in">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <ShieldCheck size={24} className="text-[#76C457]" />
                    </div>
                    <h3 className="font-bold font-[family-name:var(--font-sora)] mb-1">{guide.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{guide.description}</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                        {guide.tips.map((tip) => (
                            <li key={tip} className="flex items-center justify-start gap-2 bg-gray-50 rounded-lg px-3 py-2 text-left">
                                <ShieldCheck size={14} className="text-[#76C457] shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
