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

    const month = new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const endObj = new Date(start);
    endObj.setMonth(endObj.getMonth() + 1);
    const end = endObj.toISOString().slice(0, 10);

    const [{ count: totalCount }, { count: incomeCount }, { count: expenseCount }] = await Promise.all([
        supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('transaction_date', start)
            .lt('transaction_date', end),
        supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'income')
            .gte('transaction_date', start)
            .lt('transaction_date', end),
        supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('transaction_date', start)
            .lt('transaction_date', end),
    ]);

    return NextResponse.json({
        totalCount: totalCount ?? 0,
        incomeCount: incomeCount ?? 0,
        expenseCount: expenseCount ?? 0,
    });
}