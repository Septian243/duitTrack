import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: profiles, error } = await service
        .from('profiles')
        .select('id, telegram_chat_id')
        .eq('daily_reminder_enabled', true)
        .not('telegram_chat_id', 'is', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { userId: string; status: string }[] = [];

    for (const profile of profiles) {
        try {
            const { data: todayTx } = await service
                .from('transactions')
                .select('id')
                .eq('user_id', profile.id)
                .eq('transaction_date', today)
                .limit(1);

            if (!todayTx || todayTx.length === 0) {
                await sendTelegramMessage(
                    profile.telegram_chat_id,
                    '👋 Belum ada transaksi yang tercatat hari ini. Jangan lupa catat pengeluaran/pemasukanmu ya!'
                );
                results.push({ userId: profile.id, status: 'reminded' });
            } else {
                results.push({ userId: profile.id, status: 'skipped_has_transaction' });
            }
        } catch (err) {
            console.error(`Gagal kirim reminder untuk user ${profile.id}:`, err);
            results.push({ userId: profile.id, status: 'failed' });
        }
    }

    return NextResponse.json({ total: profiles.length, results });
}