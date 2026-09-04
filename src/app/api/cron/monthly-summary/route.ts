import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getOrGenerateSummary } from '@/lib/ai/getOrGenerateSummary';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';

function getPrevMonth(): string {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.toISOString().slice(0, 7);
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();
    const month = getPrevMonth();

    const { data: profiles, error } = await service
        .from('profiles')
        .select('id, telegram_chat_id')
        .not('telegram_chat_id', 'is', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { userId: string; status: string }[] = [];

    for (const profile of profiles) {
        try {
            const narrative = await getOrGenerateSummary(service, profile.id, month);
            await sendTelegramMessage(profile.telegram_chat_id, `📅 Ringkasan Bulan Lalu:\n\n${narrative}`);
            results.push({ userId: profile.id, status: 'sent' });
        } catch (err) {
            console.error(`Gagal kirim ringkasan untuk user ${profile.id}:`, err);
            results.push({ userId: profile.id, status: 'failed' });
        }
    }

    return NextResponse.json({ month, total: profiles.length, results });
}