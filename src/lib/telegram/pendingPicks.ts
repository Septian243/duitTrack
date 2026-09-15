import { SupabaseClient } from '@supabase/supabase-js';

export const PENDING_PICK_TIMEOUT_MINUTES = 10;

export type PendingPick = {
    id: string;
    user_id: string;
    chat_id: number;
    transaction_id: string;
    state: 'awaiting_category' | 'awaiting_new_category_name';
    note: string;
    amount: number;
    type: 'income' | 'expense';
    resolved: boolean;
    expires_at: string;
};

export async function createPendingPick(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    params: {
        userId: string;
        chatId: number;
        transactionId: string;
        note: string;
        amount: number;
        type: 'income' | 'expense';
    }
): Promise<PendingPick> {
    const expiresAt = new Date(Date.now() + PENDING_PICK_TIMEOUT_MINUTES * 60 * 1000);

    const { data, error } = await supabase
        .from('telegram_pending_picks')
        .insert({
            user_id: params.userId,
            chat_id: params.chatId,
            transaction_id: params.transactionId,
            note: params.note,
            amount: params.amount,
            type: params.type,
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (error) throw new Error(`Gagal membuat pending pick: ${error.message}`);
    return data as PendingPick;
}

export async function getActivePendingPick(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    userId: string
): Promise<PendingPick | null> {
    const { data } = await supabase
        .from('telegram_pending_picks')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return (data as PendingPick) ?? null;
}

export async function getPendingPickById(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    pendingPickId: string
): Promise<PendingPick | null> {
    const { data } = await supabase
        .from('telegram_pending_picks')
        .select('*')
        .eq('id', pendingPickId)
        .maybeSingle();

    return (data as PendingPick) ?? null;
}

async function getSystemCategoryId(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    name: string
): Promise<string | null> {
    const { data } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name)
        .is('user_id', null)
        .maybeSingle();
    return data?.id ?? null;
}

export async function resolvePendingPickWithCategory(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    pendingPick: PendingPick,
    categoryId: string
) {
    await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', pendingPick.transaction_id);

    await supabase
        .from('telegram_pending_picks')
        .update({ resolved: true })
        .eq('id', pendingPick.id);
}

export async function resolvePendingPickWithNewCategory(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    pendingPick: PendingPick,
    categoryName: string
): Promise<{ id: string; name: string }> {
    const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
            user_id: pendingPick.user_id,
            name: categoryName,
            type: pendingPick.type,
            is_system: false,
        })
        .select()
        .single();

    if (error) throw new Error(`Gagal membuat kategori baru: ${error.message}`);

    await resolvePendingPickWithCategory(supabase, pendingPick, newCategory.id);

    return newCategory;
}

export async function expirePendingPickToLainnya(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    pendingPick: PendingPick
): Promise<{ categoryName: string }> {
    const categoryId = await getSystemCategoryId(supabase, 'Lainnya');

    await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', pendingPick.transaction_id);

    await supabase
        .from('telegram_pending_picks')
        .update({ resolved: true })
        .eq('id', pendingPick.id);

    return { categoryName: 'Lainnya' };
}

export async function setPendingPickState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    pendingPickId: string,
    state: PendingPick['state']
) {
    await supabase.from('telegram_pending_picks').update({ state }).eq('id', pendingPickId);
}