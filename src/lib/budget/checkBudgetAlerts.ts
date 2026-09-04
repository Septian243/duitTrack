import { SupabaseClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

type CheckParams = {
    userId: string;
    categoryId: string | null;
    amount: number;
    transactionDate: string;
};

export async function checkBudgetAlerts(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    { userId, categoryId, amount, transactionDate }: CheckParams
) {
    const month = transactionDate.slice(0, 7);
    const periodMonth = `${month}-01`;

    const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('period_month', periodMonth)
        .or(categoryId ? `category_id.eq.${categoryId},category_id.is.null` : 'category_id.is.null');

    if (!budgets || budgets.length === 0) return;

    const endDateObj = new Date(periodMonth);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', userId)
        .single();

    if (!profile?.telegram_chat_id) return;

    for (const budget of budgets) {
        let query = supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('transaction_date', periodMonth)
            .lt('transaction_date', endDate);

        if (budget.category_id) {
            query = query.eq('category_id', budget.category_id);
        }

        const { data: txs } = await query;
        const totalSpent = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

        const isRelevant = !budget.category_id || budget.category_id === categoryId;
        if (!isRelevant) continue;

        const spentBefore = totalSpent - amount;
        const pctBefore = (spentBefore / budget.amount) * 100;
        const pctAfter = (totalSpent / budget.amount) * 100;

        const scopeLabel = budget.category_id ? 'kategori ini' : 'keseluruhan';

        if (pctBefore < 100 && pctAfter >= 100) {
            await sendTelegramMessage(
                profile.telegram_chat_id,
                `🔴 Budget ${scopeLabel} bulan ini sudah TERLAMPAUI!\nTerpakai: ${formatRupiah(totalSpent)} dari ${formatRupiah(budget.amount)}`
            );
        } else if (pctBefore < 80 && pctAfter >= 80) {
            await sendTelegramMessage(
                profile.telegram_chat_id,
                `🟡 Budget ${scopeLabel} bulan ini sudah ${Math.round(pctAfter)}% terpakai.\nTerpakai: ${formatRupiah(totalSpent)} dari ${formatRupiah(budget.amount)}`
            );
        }
    }
}