import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkBudgetAlerts } from '@/lib/budget/checkBudgetAlerts';

export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;

    const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name), transaction_tags(tags(id, name))')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
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
    const { amount, type, category_id, transaction_date, note, currency, tag_ids } = body;

    if (!amount || !type || !['income', 'expense'].includes(type) || !transaction_date) {
        return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            amount,
            type,
            category_id: category_id || null,
            transaction_date,
            note: note || null,
            currency: currency || 'IDR',
            source: 'web',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
        const rows = tag_ids.map((tag_id: string) => ({
            transaction_id: transaction.id,
            tag_id,
        }));
        const { error: tagError } = await supabase.from('transaction_tags').insert(rows);
        if (tagError) {
            return NextResponse.json({ error: tagError.message }, { status: 500 });
        }
    }

    if (transaction.type === 'expense') {
        await checkBudgetAlerts(supabase, {
            userId: user.id,
            categoryId: transaction.category_id,
            amount: Number(transaction.amount),
            transactionDate: transaction.transaction_date,
        });
    }

    return NextResponse.json(transaction, { status: 201 });
}