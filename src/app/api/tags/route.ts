import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('tags').select('*').order('name');

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
        // unique constraint violation -> tag sudah ada
        const message = error.code === '23505' ? 'Tag sudah ada' : error.message;
        return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
}