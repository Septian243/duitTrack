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
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
        return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('is_system')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (categoryError || !category) {
        return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    if (category.is_system) {
        return NextResponse.json(
            { error: 'Kategori default tidak dapat diedit.' },
            { status: 403 }
        );
    }

    const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
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

    const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('is_system')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (categoryError || !category) {
        return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    if (category.is_system) {
        return NextResponse.json(
            { error: 'Kategori default tidak dapat dihapus.' },
            { status: 403 }
        );
    }

    const [{ count: transactionCount, error: transactionError }, { count: budgetCount, error: budgetError }] =
        await Promise.all([
            supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', id)
                .eq('user_id', user.id),
            supabase
                .from('budgets')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', id)
                .eq('user_id', user.id),
        ]);

    if (transactionError || budgetError) {
        return NextResponse.json(
            { error: transactionError?.message ?? budgetError?.message },
            { status: 500 }
        );
    }

    if ((transactionCount ?? 0) > 0 || (budgetCount ?? 0) > 0) {
        return NextResponse.json(
            { error: 'Kategori masih digunakan oleh transaksi atau budget dan tidak dapat dihapus.' },
            { status: 409 }
        );
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createNotification(supabase, {
        userId: user.id,
        type: 'category',
        title: 'Kategori Dihapus',
        message: 'Sebuah kategori telah dihapus.',
        source: 'web',
    });

    return NextResponse.json({ success: true });
}
