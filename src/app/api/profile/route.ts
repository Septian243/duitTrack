import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('username, main_currency, daily_reminder_enabled, daily_reminder_hour, avatar_url')
        .eq('id', user.id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { daily_reminder_enabled, daily_reminder_hour, username, main_currency, avatar_url } = body;

    const updates: Record<string, unknown> = {};
    if (daily_reminder_enabled !== undefined) updates.daily_reminder_enabled = daily_reminder_enabled;
    if (daily_reminder_hour !== undefined) updates.daily_reminder_hour = daily_reminder_hour;
    if (username !== undefined) updates.username = username;
    if (main_currency !== undefined) updates.main_currency = main_currency;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}