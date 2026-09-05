import { SupabaseClient } from '@supabase/supabase-js';
import { SummaryNumbers } from './generateSummaryNarrative';

const SIGNIFICANT_INCREASE_THRESHOLD = 30;

function getMonthRange(month: string) {
    const start = `${month}-01`;
    const endObj = new Date(start);
    endObj.setMonth(endObj.getMonth() + 1);
    const end = endObj.toISOString().slice(0, 10);
    return { start, end };
}

function getPrevMonth(month: string): string {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
}

export async function computeSummaryNumbers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    userId: string,
    month: string
): Promise<SummaryNumbers> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('main_currency, username')
        .eq('id', userId)
        .single();

    const currency = profile?.main_currency ?? 'IDR';
    const userName = profile?.username ?? null;
    const { start, end } = getMonthRange(month);

    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, category_id, categories(name)')
        .eq('user_id', userId)
        .eq('currency', currency)
        .gte('transaction_date', start)
        .lt('transaction_date', end);

    const rows = (transactions ?? []) as unknown as {
        amount: number;
        type: 'income' | 'expense';
        category_id: string | null;
        categories: { name: string } | null;
    }[];

    let totalIncome = 0;
    let totalExpense = 0;
    const spentByCategory: Record<string, { name: string; amount: number }> = {};

    for (const tx of rows) {
        if (tx.type === 'income') {
            totalIncome += Number(tx.amount);
        } else {
            totalExpense += Number(tx.amount);
            const key = tx.category_id ?? 'uncategorized';
            const name = tx.categories?.name ?? 'Tanpa kategori';
            if (!spentByCategory[key]) spentByCategory[key] = { name, amount: 0 };
            spentByCategory[key].amount += Number(tx.amount);
        }
    }

    const topCategories = Object.values(spentByCategory)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    // --- Bulan lalu: untuk perbandingan total expense & deteksi kenaikan per kategori ---
    const prevMonth = getPrevMonth(month);
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth);

    const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('amount, type, category_id, categories(name)')
        .eq('user_id', userId)
        .eq('currency', currency)
        .eq('type', 'expense')
        .gte('transaction_date', prevStart)
        .lt('transaction_date', prevEnd);

    const prevRows = (prevTransactions ?? []) as unknown as {
        amount: number;
        category_id: string | null;
        categories: { name: string } | null;
    }[];

    let prevMonthExpense: number | null = null;
    const prevSpentByCategory: Record<string, number> = {};

    if (prevRows.length > 0) {
        prevMonthExpense = 0;
        for (const tx of prevRows) {
            prevMonthExpense += Number(tx.amount);
            const key = tx.category_id ?? 'uncategorized';
            prevSpentByCategory[key] = (prevSpentByCategory[key] ?? 0) + Number(tx.amount);
        }
    }

    // Cari kategori dengan kenaikan % terbesar (yang di atas threshold), dibanding bulan lalu
    let significantIncrease: SummaryNumbers['significantIncrease'] = null;
    let maxPct = SIGNIFICANT_INCREASE_THRESHOLD;

    for (const [key, current] of Object.entries(spentByCategory)) {
        const prevAmount = prevSpentByCategory[key];
        if (!prevAmount || prevAmount === 0) continue;

        const pctChange = ((current.amount - prevAmount) / prevAmount) * 100;
        if (pctChange > maxPct) {
            maxPct = pctChange;
            significantIncrease = { category: current.name, pctChange };
        }
    }

    return {
        month,
        userName,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        prevMonthExpense,
        topCategories,
        significantIncrease,
    };
}