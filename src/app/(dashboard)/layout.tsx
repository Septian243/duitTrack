import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/DashboardShell';
import { ToastProvider } from '@/context/ToastContext';

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
        <ToastProvider>
            <DashboardShell
                userName={profile?.username ?? null}
                userId={user.id}
                userAvatarUrl={profile?.avatar_url ?? null}
            >
                {children}
            </DashboardShell>
        </ToastProvider>
    );
}
