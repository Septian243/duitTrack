import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileTabs from '@/components/ProfileTabs';

export default async function ProfilePage() {
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
        <ProfileTabs
            userId={user.id}
            userEmail={user.email ?? ''}
            initialUsername={profile?.username ?? ''}
            initialAvatarUrl={profile?.avatar_url ?? null}
        />
    );
}