import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

    return (
        <div className="flex h-screen overflow-hidden bg-[#F5FAF3]">
            <Sidebar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <TopBar
                    userName={profile?.username ?? null}
                    userId={user.id}
                    userAvatarUrl={profile?.avatar_url ?? null}
                />
                <main className="min-h-0 flex-1 overflow-y-auto p-8">{children}</main>
            </div>
        </div>
    );
}
