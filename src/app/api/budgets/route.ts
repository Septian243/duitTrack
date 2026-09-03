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
    const periodMonth = `${month}-01`;

    const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*, categories(name)')
        .eq('period_month', periodMonth);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const endDateObj = new Date(periodMonth);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('type', 'expense')
        .gte('transaction_date', periodMonth)
        .lt('transaction_date', endDate);

    const spentByCategory: Record<string, number> = {};
    let spentTotal = 0;
    for (const tx of transactions ?? []) {
        spentTotal += Number(tx.amount);
        if (tx.category_id) {
            spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] ?? 0) + Number(tx.amount);
        }
    }

    const result = budgets.map((b) => ({
        ...b,
        spent: b.category_id ? (spentByCategory[b.category_id] ?? 0) : spentTotal,
    }));

    return NextResponse.json(result);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category_id, amount, month } = body;

    if (!amount || !month) {
        return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const periodMonth = `${month}-01`;

    const { data, error } = await supabase
        .from('budgets')
        .insert({
            user_id: user.id,
            category_id: category_id || null,
            amount,
            period_month: periodMonth,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
}