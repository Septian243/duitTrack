import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get('months')) || 6;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .gte('transaction_date', startDate.toISOString().slice(0, 10));

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const buckets: Record<string, { income: number; expense: number }> = {};
    for (let i = 0; i < months; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const key = d.toISOString().slice(0, 7);
        buckets[key] = { income: 0, expense: 0 };
    }

    for (const tx of data) {
        const key = tx.transaction_date.slice(0, 7);
        if (buckets[key]) {
            buckets[key][tx.type as 'income' | 'expense'] += Number(tx.amount);
        }
    }

    const result = Object.entries(buckets).map(([month, v]) => ({
        month,
        income: v.income,
        expense: v.expense,
    }));

    return NextResponse.json(result);
}