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
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const startDate = `${month}-01`;
    const endDateObj = new Date(startDate);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, currency')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byCurrency: Record<string, { income: number; expense: number }> = {};

    for (const tx of data) {
        if (!byCurrency[tx.currency]) {
            byCurrency[tx.currency] = { income: 0, expense: 0 };
        }
        byCurrency[tx.currency][tx.type as 'income' | 'expense'] += Number(tx.amount);
    }

    const result = Object.entries(byCurrency).map(([currency, v]) => ({
        currency,
        income: v.income,
        expense: v.expense,
        balance: v.income - v.expense,
    }));

    return NextResponse.json({ month, summary: result });
}