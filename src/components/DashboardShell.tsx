'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

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

    return (
        <div className="flex h-screen overflow-hidden bg-[#F5FAF3]">
            <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <TopBar
                    userName={userName}
                    userId={userId}
                    userAvatarUrl={userAvatarUrl}
                    onOpenSidebar={() => setMobileSidebarOpen(true)}
                />
                <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
