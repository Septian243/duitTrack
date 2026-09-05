import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
    | 'transaction'
    | 'budget'
    | 'category'
    | 'tag'
    | 'telegram_link'
    | 'budget_alert';

export type NotificationSource = 'web' | 'telegram' | 'system';

export async function createNotification(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    params: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        source: NotificationSource;
    }
) {

    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            source: params.source,
        });

        if (error) {
            console.error('Gagal membuat notifikasi:', error.message);
        }
    } catch (err) {
        console.error('Gagal membuat notifikasi:', err);
    }
}
