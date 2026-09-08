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

    const today = new Date().toISOString().slice(0, 10);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .gte('transaction_date', sixtyDaysAgo.toISOString().slice(0, 10))
        .order('transaction_date', { ascending: false });

    const distinctDates = Array.from(new Set((data ?? []).map((t) => t.transaction_date))).sort(
        (a, b) => (a < b ? 1 : -1)
    );

    const hasTransactionToday = distinctDates.includes(today);

    let streakDays = 0;
    if (hasTransactionToday) {
        const cursor = new Date();
        for (const dateStr of distinctDates) {
            const expected = cursor.toISOString().slice(0, 10);
            if (dateStr === expected) {
                streakDays++;
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }
    }

    return NextResponse.json({ hasTransactionToday, streakDays });
}