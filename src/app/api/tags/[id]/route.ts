import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/createNotification';

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

    const { count, error: usageError } = await supabase
        .from('transaction_tags')
        .select('transaction_id', { count: 'exact', head: true })
        .eq('tag_id', id);

    if (usageError) {
        return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
        return NextResponse.json(
            { error: 'Tag masih digunakan oleh transaksi dan tidak dapat dihapus.' },
            { status: 409 }
        );
    }

    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'tag',
        title: 'Tag Dihapus',
        message: 'Sebuah tag telah dihapus.',
        source: 'web',
    });

    return NextResponse.json({ success: true });
}
