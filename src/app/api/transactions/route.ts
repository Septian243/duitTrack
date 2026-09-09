import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkBudgetAlerts } from '@/lib/budget/checkBudgetAlerts';
import { createNotification } from '@/lib/notifications/createNotification';

export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type');
    let dateFrom = searchParams.get('date_from');
    let dateTo = searchParams.get('date_to');
    const sort = searchParams.get('sort');
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('page_size')) || Number(searchParams.get('limit')) || 10;

    if (month && !dateFrom && !dateTo) {
        const start = `${month}-01`;
        const endObj = new Date(start);
        endObj.setMonth(endObj.getMonth() + 1);
        endObj.setDate(endObj.getDate() - 1);
        dateFrom = start;
        dateTo = endObj.toISOString().slice(0, 10);
    }

    let matchingCategoryIds: string[] = [];
    if (search) {
        const { data: catMatches } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', `%${search}%`);
        matchingCategoryIds = (catMatches ?? []).map((c) => c.id);
    }

    let query = supabase
        .from('transactions')
        .select('*, categories(name), transaction_tags(tags(id, name))', { count: 'exact' });

    if (search) {
        const orParts = [`note.ilike.%${search}%`];
        if (matchingCategoryIds.length > 0) {
            orParts.push(`category_id.in.(${matchingCategoryIds.join(',')})`);
        }
        query = query.or(orParts.join(','));
    }

    if (categoryId) query = query.eq('category_id', categoryId);
    if (type === 'income' || type === 'expense') query = query.eq('type', type);
    if (dateFrom) query = query.gte('transaction_date', dateFrom);
    if (dateTo) query = query.lte('transaction_date', dateTo);

    if (sort === 'amount_asc') {
        query = query.order('amount', { ascending: true });
    } else if (sort === 'amount_desc') {
        query = query.order('amount', { ascending: false });
    } else {
        query = query.order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, total: count ?? 0, page, pageSize });
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

    function formatRupiah(n: number) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'transaction',
        title: transaction.type === 'income' ? 'Pemasukan Ditambahkan' : 'Pengeluaran Ditambahkan',
        message: `${formatRupiah(Number(transaction.amount))} - ${transaction.note || 'Tanpa catatan'}`,
        source: 'web',
    });

    return NextResponse.json(transaction, { status: 201 });
}