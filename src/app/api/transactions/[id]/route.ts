import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/createNotification';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, type, category_id, transaction_date, note, tag_ids } = body;

    if (!amount || !type || !['income', 'expense'].includes(type) || !transaction_date) {
        return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const { data: transaction, error } = await supabase
        .from('transactions')
        .update({
            amount,
            type,
            category_id: category_id || null,
            transaction_date,
            note: note || null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('transaction_tags').delete().eq('transaction_id', id);

    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
        const rows = tag_ids.map((tag_id: string) => ({ transaction_id: id, tag_id }));
        const { error: tagError } = await supabase.from('transaction_tags').insert(rows);
        if (tagError) {
            return NextResponse.json({ error: tagError.message }, { status: 500 });
        }
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'transaction',
        title: 'Transaksi Diperbarui',
        message: `Transaksi "${transaction.note || 'tanpa catatan'}" telah diubah.`,
        source: 'web',
    });

    return NextResponse.json(transaction);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'transaction',
        title: 'Transaksi Dihapus',
        message: 'Sebuah transaksi telah dihapus dari catatanmu.',
        source: 'web',
    });

    return NextResponse.json({ success: true });
}