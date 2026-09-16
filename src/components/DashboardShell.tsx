'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { ProfileProvider } from '@/context/ProfileContext';

export default function DashboardShell({
    children,
    userName,
    userId,
    userAvatarUrl,
}: {
    children: React.ReactNode;
    userName: string | null;
    userId: string;
    userAvatarUrl: string | null;
}) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [profile, setProfile] = useState({
        username: userName,
        avatarUrl: userAvatarUrl,
    });

    useEffect(() => {
        let ignore = false;

        async function loadProfile() {
            try {
                const response = await fetch('/api/profile');
                if (!response.ok) return;
                const data = await response.json();
                if (!ignore) {
                    setProfile({
                        username: data.username ?? null,
                        avatarUrl: data.avatar_url ?? null,
                    });
                }
            } catch {
                // Profile is supplementary; the dashboard shell should remain usable.
            }
        }

        loadProfile();
        return () => {
            ignore = true;
        };
    }, []);

    return (
        <ProfileProvider profile={profile}>
            <div className="flex h-screen overflow-hidden bg-[#F5FAF3]">
                <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <TopBar
                        userName={profile.username}
                        userId={userId}
                        userAvatarUrl={profile.avatarUrl}
                        onOpenSidebar={() => setMobileSidebarOpen(true)}
                    />
                    <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
                </div>
            </div>
        </ProfileProvider>
    );
}
