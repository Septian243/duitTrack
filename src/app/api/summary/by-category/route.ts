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
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
    const type = searchParams.get('type') ?? 'expense';

    const startDate = `${month}-01`;
    const endDateObj = new Date(startDate);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, categories(name)')
        .eq('type', type)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byCategory: Record<string, number> = {};
    for (const tx of data as unknown as { amount: number; categories: { name: string } | null }[]) {
        const name = tx.categories?.name ?? 'Tanpa kategori';
        byCategory[name] = (byCategory[name] ?? 0) + Number(tx.amount);
    }

    const result = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return NextResponse.json(result);
}