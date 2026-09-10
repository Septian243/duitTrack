import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/createNotification';

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sortedCategories = [...(categories ?? [])].sort((a, b) => {
        const aIsOther = a.name.trim().toLocaleLowerCase() === 'lainnya';
        const bIsOther = b.name.trim().toLocaleLowerCase() === 'lainnya';

        if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });

    if (!user) return NextResponse.json(sortedCategories);

    const [{ data: txCats }, { data: budgetCats }] = await Promise.all([
        supabase
            .from('transactions')
            .select('category_id')
            .eq('user_id', user.id)
            .not('category_id', 'is', null),
        supabase
            .from('budgets')
            .select('category_id')
            .eq('user_id', user.id)
            .not('category_id', 'is', null),
    ]);

    const usedIds = new Set<string>();
    for (const row of txCats ?? []) {
        if (row.category_id) usedIds.add(row.category_id);
    }
    for (const row of budgetCats ?? []) {
        if (row.category_id) usedIds.add(row.category_id);
    }

    const result = sortedCategories.map((c) => ({
        ...c,
        in_use: usedIds.has(c.id),
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
    const { name, type } = body;

    if (!name || !type || !['income', 'expense'].includes(type)) {
        return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name, type, is_system: false })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'category',
        title: 'Kategori Ditambahkan',
        message: `Kategori "${name}" telah dibuat.`,
        source: 'web',
    });

    return NextResponse.json(data, { status: 201 });
}
