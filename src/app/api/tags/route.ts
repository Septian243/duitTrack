import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/createNotification';

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: usageRows } = await supabase
        .from('transaction_tags')
        .select('tag_id, transactions!inner(user_id)')
        .eq('transactions.user_id', user.id);

    const usageCount: Record<string, number> = {};
    for (const row of usageRows ?? []) {
        usageCount[row.tag_id] = (usageCount[row.tag_id] ?? 0) + 1;
    }

    const result = tags.map((t) => ({
        ...t,
        usage_count: usageCount[t.id] ?? 0,
        in_use: (usageCount[t.id] ?? 0) > 0,
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
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Nama tag tidak boleh kosong' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, name: name.trim() })
        .select()
        .single();

    if (error) {
        const message = error.code === '23505' ? 'Tag sudah ada' : error.message;
        return NextResponse.json({ error: message }, { status: 400 });
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'tag',
        title: 'Tag Ditambahkan',
        message: `Tag "${name.trim()}" telah dibuat.`,
        source: 'web',
    });

    return NextResponse.json(data, { status: 201 });
}
