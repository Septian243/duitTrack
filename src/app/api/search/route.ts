import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STATIC_PAGES = [
    { label: 'Dashboard', href: '/' },
    { label: 'Transaksi', href: '/transactions' },
    { label: 'Budget', href: '/budgets' },
    { label: 'Cash Flow', href: '/cashflow' },
    { label: 'Kategori', href: '/settings/categories' },
    { label: 'Tag', href: '/settings/tags' },
    { label: 'Pengaturan', href: '/settings' },
];

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (!q) {
        return NextResponse.json({ pages: [], transactions: [] });
    }

    const lowerQ = q.toLowerCase();

    const pages = STATIC_PAGES.filter((p) => p.label.toLowerCase().includes(lowerQ));

    const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, type, transaction_date, note, categories(name)')
        .or(`note.ilike.%${q}%`)
        .order('transaction_date', { ascending: false })
        .limit(5);

    const { data: byCategory } = await supabase
        .from('transactions')
        .select('id, amount, type, transaction_date, note, categories!inner(name)')
        .ilike('categories.name', `%${q}%`)
        .order('transaction_date', { ascending: false })
        .limit(5);

    const merged = [...(transactions ?? []), ...(byCategory ?? [])];
    const uniqueMap = new Map(merged.map((t) => [t.id, t]));
    const uniqueTransactions = Array.from(uniqueMap.values()).slice(0, 5);

    const formattedTransactions = (
        uniqueTransactions as unknown as {
            id: string;
            amount: number;
            type: 'income' | 'expense';
            transaction_date: string;
            note: string | null;
            categories: { name: string } | null;
        }[]
    ).map((t) => ({
        id: t.id,
        label: t.note || t.categories?.name || 'Tanpa catatan',
        detail: `${t.transaction_date} · ${t.type === 'income' ? '+' : '-'}${formatRupiah(Number(t.amount))}`,
    }));

    return NextResponse.json({ pages, transactions: formattedTransactions });
}