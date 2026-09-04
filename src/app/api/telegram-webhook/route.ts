import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';
import { parseTransaction } from '@/lib/parser/parseTransaction';
import { checkBudgetAlerts } from '@/lib/budget/checkBudgetAlerts';

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

export async function POST(request: Request) {
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update = await request.json();
    const message = update.message;

    if (!message || !message.text) {
        return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text.trim();
    const service = createServiceClient();

    // --- Handle /start <kode> ---
    if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const code = parts[1];

        if (!code) {
            await sendTelegramMessage(
                chatId,
                'Halo! Untuk menghubungkan akun, buka Settings di web DuitTrack dan generate kode, lalu kirim: /start &lt;kode&gt;'
            );
            return NextResponse.json({ ok: true });
        }

        const { data: link, error: linkError } = await service
            .from('telegram_links')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('used', false)
            .single();

        if (linkError || !link) {
            await sendTelegramMessage(chatId, '❌ Kode tidak valid atau sudah dipakai.');
            return NextResponse.json({ ok: true });
        }

        if (new Date(link.expires_at) < new Date()) {
            await sendTelegramMessage(chatId, '❌ Kode sudah kedaluwarsa, generate kode baru di web.');
            return NextResponse.json({ ok: true });
        }

        await service.from('profiles').update({ telegram_chat_id: chatId }).eq('id', link.user_id);
        await service.from('telegram_links').update({ used: true }).eq('code', link.code);

        await sendTelegramMessage(
            chatId,
            '✅ Akun berhasil terhubung! Sekarang kamu bisa kirim transaksi langsung, contoh: "beli kopi 20rb"'
        );
        return NextResponse.json({ ok: true });
    }

    // --- Cari user berdasarkan chat_id (harus sudah linking) ---
    const { data: profile } = await service
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .single();

    if (!profile) {
        await sendTelegramMessage(
            chatId,
            'Akun kamu belum terhubung. Buka Settings di web DuitTrack untuk mendapatkan kode, lalu kirim: /start <kode>'
        );
        return NextResponse.json({ ok: true });
    }

    // --- Handle /batal ---
    if (text === '/batal') {
        const { data: lastTx } = await service
            .from('transactions')
            .select('id, amount, type')
            .eq('user_id', profile.id)
            .eq('source', 'telegram')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!lastTx) {
            await sendTelegramMessage(chatId, 'Tidak ada transaksi dari Telegram yang bisa dibatalkan.');
            return NextResponse.json({ ok: true });
        }

        await service.from('transactions').delete().eq('id', lastTx.id);

        const label = lastTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        await sendTelegramMessage(chatId, `🗑️ Dibatalkan: ${label} ${formatRupiah(lastTx.amount)}`);
        return NextResponse.json({ ok: true });
    }

    // --- Handle /budget ---
    if (text === '/budget') {
        const now = new Date();
        const periodMonth = `${now.toISOString().slice(0, 7)}-01`;
        const endDateObj = new Date(periodMonth);
        endDateObj.setMonth(endDateObj.getMonth() + 1);
        const endDate = endDateObj.toISOString().slice(0, 10);

        const { data: budgets } = await service
            .from('budgets')
            .select('*, categories(name)')
            .eq('user_id', profile.id)
            .eq('period_month', periodMonth);

        if (!budgets || budgets.length === 0) {
            await sendTelegramMessage(
                chatId,
                'Belum ada budget yang diset bulan ini. Buka Settings > Budget di web untuk menambahkan.'
            );
            return NextResponse.json({ ok: true });
        }

        const { data: transactions } = await service
            .from('transactions')
            .select('amount, category_id')
            .eq('user_id', profile.id)
            .eq('type', 'expense')
            .gte('transaction_date', periodMonth)
            .lt('transaction_date', endDate);

        const spentByCategory: Record<string, number> = {};
        let spentTotal = 0;
        for (const tx of transactions ?? []) {
            spentTotal += Number(tx.amount);
            if (tx.category_id) {
                spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] ?? 0) + Number(tx.amount);
            }
        }

        const lines = budgets.map((b) => {
            const spent = b.category_id ? (spentByCategory[b.category_id] ?? 0) : spentTotal;
            const pct = Math.round((spent / b.amount) * 100);
            const icon = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
            const label = b.categories?.name ?? 'Keseluruhan';
            return `${icon} ${label}: ${formatRupiah(spent)} / ${formatRupiah(b.amount)} (${pct}%)`;
        });

        await sendTelegramMessage(chatId, `📊 Status Budget Bulan Ini:\n\n${lines.join('\n')}`);
        return NextResponse.json({ ok: true });
    }

    // --- Parsing transaksi dari teks bebas ---
    const parsed = parseTransaction(text);

    if (!parsed) {
        await sendTelegramMessage(
            chatId,
            'Maaf, saya tidak menemukan nominal di pesanmu. Contoh format: "beli kopi 20rb"'
        );
        return NextResponse.json({ ok: true });
    }

    const { data: category } = await service
        .from('categories')
        .select('id')
        .eq('name', parsed.categoryName)
        .is('user_id', null)
        .single();

    const { error: insertError } = await service.from('transactions').insert({
        user_id: profile.id,
        amount: parsed.amount,
        type: parsed.type,
        category_id: category?.id ?? null,
        transaction_date: new Date().toISOString().slice(0, 10),
        note: parsed.note,
        currency: 'IDR',
        source: 'telegram',
    });

    if (insertError) {
        await sendTelegramMessage(chatId, '❌ Gagal menyimpan transaksi, coba lagi.');
        return NextResponse.json({ ok: true });
    }

    if (parsed.type === 'expense') {
        await checkBudgetAlerts(service, {
            userId: profile.id,
            categoryId: category?.id ?? null,
            amount: parsed.amount,
            transactionDate: new Date().toISOString().slice(0, 10),
        });
    }

    const label = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    await sendTelegramMessage(
        chatId,
        `✅ Tercatat: ${label} ${formatRupiah(parsed.amount)} - ${parsed.categoryName}`
    );

    return NextResponse.json({ ok: true });
}