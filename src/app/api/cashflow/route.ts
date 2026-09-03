import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dayOfMonth = now.getDate();
    const totalDaysInMonth = endOfMonth.getDate();
    const daysRemaining = totalDaysInMonth - dayOfMonth;

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, currency')
        .eq('type', 'expense')
        .gte('transaction_date', startOfMonth.toISOString().slice(0, 10))
        .lte('transaction_date', now.toISOString().slice(0, 10));

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byCurrency: Record<string, number> = {};
    for (const tx of data) {
        byCurrency[tx.currency] = (byCurrency[tx.currency] ?? 0) + Number(tx.amount);
    }

    const result = Object.entries(byCurrency).map(([currency, totalSoFar]) => {
        const avgPerDay = totalSoFar / dayOfMonth;
        const projectedAdditional = avgPerDay * daysRemaining;
        const projectedTotal = totalSoFar + projectedAdditional;

        return {
            currency,
            totalSoFar,
            avgPerDay,
            daysRemaining,
            projectedAdditional,
            projectedTotal,
        };
    });

    return NextResponse.json({ dayOfMonth, totalDaysInMonth, daysRemaining, projections: result });
}