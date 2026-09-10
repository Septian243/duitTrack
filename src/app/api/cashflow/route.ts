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
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const month = searchParams.get('month') ?? currentMonthStr;
    const isCurrentMonth = month === currentMonthStr;

    const startOfMonth = new Date(`${month}-01`);
    const endOfMonthObj = new Date(startOfMonth);
    endOfMonthObj.setMonth(endOfMonthObj.getMonth() + 1);
    endOfMonthObj.setDate(0);
    const totalDaysInMonth = endOfMonthObj.getDate();

    const dayOfMonth = isCurrentMonth ? now.getDate() : totalDaysInMonth;
    const daysRemaining = isCurrentMonth ? totalDaysInMonth - dayOfMonth : 0;

    const startDateStr = startOfMonth.toISOString().slice(0, 10);
    const cutoffDateStr = isCurrentMonth
        ? now.toISOString().slice(0, 10)
        : endOfMonthObj.toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, currency, transaction_date, category_id, categories(name)')
        .eq('type', 'expense')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', cutoffDateStr);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byCurrency: Record<string, number> = {};
    const byDay: Record<number, number> = {};
    const byCategory: Record<string, { name: string; spent: number }> = {};

    for (const tx of data ?? []) {
        const amt = Number(tx.amount);
        byCurrency[tx.currency] = (byCurrency[tx.currency] ?? 0) + amt;

        const day = new Date(tx.transaction_date).getDate();
        byDay[day] = (byDay[day] ?? 0) + amt;

        const catId = tx.category_id ?? 'none';
        const category = tx.categories as { name: string } | { name: string }[] | null;
        const catName = (Array.isArray(category) ? category[0]?.name : category?.name) ?? 'Tanpa kategori';
        if (!byCategory[catId]) byCategory[catId] = { name: catName, spent: 0 };
        byCategory[catId].spent += amt;
    }

    const projections = Object.entries(byCurrency).map(([currency, totalSoFar]) => {
        const avgPerDay = dayOfMonth > 0 ? totalSoFar / dayOfMonth : 0;
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

    const totalSoFarAll = Object.values(byCurrency).reduce((sum, v) => sum + v, 0);
    const avgPerDayAll = dayOfMonth > 0 ? totalSoFarAll / dayOfMonth : 0;

    let cumulative = 0;
    const dailySeries: { day: number; actual: number | null; projected: number | null }[] = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
        if (day <= dayOfMonth) {
            cumulative += byDay[day] ?? 0;
            dailySeries.push({
                day,
                actual: cumulative,
                projected: day === dayOfMonth ? cumulative : null,
            });
        } else {
            cumulative += avgPerDayAll;
            dailySeries.push({ day, actual: null, projected: cumulative });
        }
    }

    const categoryBreakdown = Object.entries(byCategory)
        .map(([category_id, v]) => {
            const avgPerDay = dayOfMonth > 0 ? v.spent / dayOfMonth : 0;
            const projectedTotal = v.spent + avgPerDay * daysRemaining;
            return {
                category_id: category_id === 'none' ? null : category_id,
                name: v.name,
                spent: v.spent,
                projectedTotal,
            };
        })
        .sort((a, b) => b.projectedTotal - a.projectedTotal);

    return NextResponse.json({
        month,
        isCurrentMonth,
        dayOfMonth,
        totalDaysInMonth,
        daysRemaining,
        projections,
        dailySeries,
        categoryBreakdown,
    });
}
