import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramMessage, editTelegramMessage, answerCallbackQuery, buildInlineKeyboard } from '@/lib/telegram/sendMessage';
import { parseTransaction } from '@/lib/parser/parseTransaction';
import { checkBudgetAlerts } from '@/lib/budget/checkBudgetAlerts';
import { getOrGenerateSummary } from '@/lib/ai/getOrGenerateSummary';
import { createNotification } from '@/lib/notifications/createNotification';
import { getUserKeywordMap } from '@/lib/parser/getUserKeywordMap';
import { saveUserKeyword } from '@/lib/parser/saveUserKeyword';
import {
    createPendingPick,
    getActivePendingPick,
    resolvePendingPickWithCategory,
    resolvePendingPickWithNewCategory,
    expirePendingPickToLainnya,
    setPendingPickState,
} from '@/lib/telegram/pendingPicks';

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

export async function POST(request: Request) {
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update = await request.json();
    const service = createServiceClient();

    // --- Handle tap tombol (callback_query) ---
    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId: number = callbackQuery.message.chat.id;
        const messageId: number = callbackQuery.message.message_id;
        const data: string = callbackQuery.data;

        const { data: profile } = await service
            .from('profiles')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .single();

        if (!profile) {
            await answerCallbackQuery(callbackQuery.id, 'Akun tidak ditemukan.');
            return NextResponse.json({ ok: true });
        }

        const pendingPick = await getActivePendingPick(service, profile.id);

        if (!pendingPick) {
            await answerCallbackQuery(callbackQuery.id, 'Pertanyaan ini sudah tidak berlaku.');
            await editTelegramMessage(
                chatId,
                messageId,
                'Pertanyaan ini sudah tidak berlaku (transaksi sudah diproses sebelumnya).'
            );
            return NextResponse.json({ ok: true });
        }

        // --- User tap "Buat kategori baru" ---
        if (data === 'newcat') {
            await setPendingPickState(service, pendingPick.id, 'awaiting_new_category_name');
            await answerCallbackQuery(callbackQuery.id);
            await editTelegramMessage(
                chatId,
                messageId,
                `💬 "${pendingPick.note}" — ${formatRupiah(pendingPick.amount)}\n\nKetik nama kategori baru:`
            );
            return NextResponse.json({ ok: true });
        }

        // --- User tap salah satu tombol kategori ---
        if (data.startsWith('cat:')) {
            const categoryId = data.slice(4);

            await resolvePendingPickWithCategory(service, pendingPick, categoryId);
            await saveUserKeyword(service, {
                userId: profile.id,
                note: pendingPick.note,
                categoryId,
            });

            const { data: category } = await service
                .from('categories')
                .select('name')
                .eq('id', categoryId)
                .single();

            const label = pendingPick.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            await answerCallbackQuery(callbackQuery.id, 'Tersimpan!');
            await editTelegramMessage(
                chatId,
                messageId,
                `✅ Tercatat: ${label} ${formatRupiah(pendingPick.amount)} - ${category?.name ?? 'Kategori'}`
            );

            if (pendingPick.type === 'expense') {
                await checkBudgetAlerts(service, {
                    userId: profile.id,
                    categoryId,
                    amount: pendingPick.amount,
                    transactionDate: new Date().toISOString().slice(0, 10),
                });
            }

            await createNotification(service, {
                userId: profile.id,
                type: 'transaction',
                title: pendingPick.type === 'income' ? 'Pemasukan Ditambahkan' : 'Pengeluaran Ditambahkan',
                message: `${formatRupiah(pendingPick.amount)} - ${category?.name ?? ''} (via Telegram)`,
                source: 'telegram',
            });

            return NextResponse.json({ ok: true });
        }

        await answerCallbackQuery(callbackQuery.id);
        return NextResponse.json({ ok: true });
    }

    const message = update.message;

    if (!message || !message.text) {
        return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text.trim();

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

        await service
            .from('profiles')
            .update({
                telegram_chat_id: chatId,
                telegram_username: message.from?.username ?? null,
            })
            .eq('id', link.user_id);
        await service.from('telegram_links').update({ used: true }).eq('code', link.code);

        await sendTelegramMessage(
            chatId,
            '✅ Akun berhasil terhubung! Sekarang kamu bisa kirim transaksi langsung, contoh: "beli kopi 20rb"'
        );

        await createNotification(service, {
            userId: link.user_id,
            type: 'telegram_link',
            title: 'Telegram Terhubung',
            message: 'Akun Telegram-mu berhasil dihubungkan ke DuitTrack.',
            source: 'telegram',
        });

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

    // --- Cek dulu kalau ada pending pick lama yang sudah kedaluwarsa (lazy timeout check) ---
    const activePendingPick = await getActivePendingPick(service, profile.id);

    if (
        activePendingPick &&
        activePendingPick.state === 'awaiting_category' &&
        new Date(activePendingPick.expires_at) < new Date()
    ) {
        await expirePendingPickToLainnya(service, activePendingPick);
        await sendTelegramMessage(
            chatId,
            `⏰ Transaksi "${activePendingPick.note}" otomatis masuk kategori "Lainnya" karena belum kamu pilih. Ubah lewat web kalau perlu.`
        );
    }

    // --- Handle balasan nama kategori baru (kalau sedang dalam state awaiting_new_category_name) ---
    if (
        activePendingPick &&
        activePendingPick.state === 'awaiting_new_category_name' &&
        new Date(activePendingPick.expires_at) >= new Date()
    ) {
        const categoryName = text.trim();

        if (!categoryName) {
            await sendTelegramMessage(chatId, 'Nama kategori tidak boleh kosong. Coba ketik lagi:');
            return NextResponse.json({ ok: true });
        }

        const newCategory = await resolvePendingPickWithNewCategory(
            service,
            activePendingPick,
            categoryName
        );

        await saveUserKeyword(service, {
            userId: profile.id,
            note: activePendingPick.note,
            categoryId: newCategory.id,
        });

        const label = activePendingPick.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        await sendTelegramMessage(
            chatId,
            `✅ Kategori "${newCategory.name}" dibuat & transaksi tercatat!\n${label} ${formatRupiah(activePendingPick.amount)} - ${newCategory.name}`
        );

        if (activePendingPick.type === 'expense') {
            await checkBudgetAlerts(service, {
                userId: profile.id,
                categoryId: newCategory.id,
                amount: activePendingPick.amount,
                transactionDate: new Date().toISOString().slice(0, 10),
            });
        }

        await createNotification(service, {
            userId: profile.id,
            type: 'transaction',
            title: activePendingPick.type === 'income' ? 'Pemasukan Ditambahkan' : 'Pengeluaran Ditambahkan',
            message: `${formatRupiah(activePendingPick.amount)} - ${newCategory.name} (via Telegram)`,
            source: 'telegram',
        });

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

        await createNotification(service, {
            userId: profile.id,
            type: 'transaction',
            title: 'Transaksi Dibatalkan',
            message: `${label} ${formatRupiah(lastTx.amount)} dibatalkan via Telegram.`,
            source: 'telegram',
        });

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

    // --- Handle /ringkasan ---
    if (text === '/ringkasan') {
        const month = new Date().toISOString().slice(0, 7);
        const narrative = await getOrGenerateSummary(service, profile.id, month, true);
        await sendTelegramMessage(chatId, `📋 ${narrative}`);
        return NextResponse.json({ ok: true });
    }

    // --- Parsing transaksi dari teks bebas ---
    const userKeywordMap = await getUserKeywordMap(service, profile.id);
    const parsed = parseTransaction(text, userKeywordMap);

    if (!parsed) {
        await sendTelegramMessage(
            chatId,
            'Maaf, saya tidak menemukan nominal di pesanmu. Contoh format: "beli kopi 20rb"'
        );
        return NextResponse.json({ ok: true });
    }

    let categoryId: string | null = null;
    if (parsed.matched) {
        const { data: categories } = await service
            .from('categories')
            .select('id, user_id')
            .eq('name', parsed.categoryName)
            .eq('type', parsed.type)
            .or(`user_id.is.null,user_id.eq.${profile.id}`);

        // Prefer the user's category when a custom category has the same name
        // as a system category; otherwise use the shared system category.
        const category = (categories ?? []).find((item) => item.user_id === profile.id)
            ?? (categories ?? []).find((item) => item.user_id === null);
        categoryId = category?.id ?? null;
    }

    const { data: transaction, error: insertError } = await service
        .from('transactions')
        .insert({
            user_id: profile.id,
            amount: parsed.amount,
            type: parsed.type,
            category_id: categoryId,
            transaction_date: new Date().toISOString().slice(0, 10),
            note: parsed.note,
            currency: 'IDR',
            source: 'telegram',
        })
        .select()
        .single();

    if (insertError) {
        await sendTelegramMessage(chatId, '❌ Gagal menyimpan transaksi, coba lagi.');
        return NextResponse.json({ ok: true });
    }

    // --- Kalau kategori tidak ketemu (matched: false), tanya user lewat tombol ---
    if (!parsed.matched) {
        const stillActivePick = await getActivePendingPick(service, profile.id);
        if (stillActivePick) {
            await expirePendingPickToLainnya(service, stillActivePick);
        }

        const { data: userCategories } = await service
            .from('categories')
            .select('id, name')
            .or(`user_id.is.null,user_id.eq.${profile.id}`)
            .eq('type', parsed.type)
            .order('name');

        await createPendingPick(service, {
            userId: profile.id,
            chatId,
            transactionId: transaction.id,
            note: parsed.note,
            amount: parsed.amount,
            type: parsed.type,
        });

        const buttons = (userCategories ?? [])
            .filter((c) => c.name !== 'Lainnya')
            .map((c) => ({ label: c.name, data: `cat:${c.id}` }));
        buttons.push({ label: '➕ Buat kategori baru', data: 'newcat' });

        await sendTelegramMessage(
            chatId,
            `💬 "${parsed.note}" — ${formatRupiah(parsed.amount)}\nMau dimasukin kategori apa?`,
            { replyMarkup: buildInlineKeyboard(buttons) }
        );

        return NextResponse.json({ ok: true });
    }

    // --- Kategori berhasil ke-detect otomatis, lanjut seperti biasa ---
    if (parsed.type === 'expense') {
        await checkBudgetAlerts(service, {
            userId: profile.id,
            categoryId,
            amount: parsed.amount,
            transactionDate: new Date().toISOString().slice(0, 10),
        });
    }

    await createNotification(service, {
        userId: profile.id,
        type: 'transaction',
        title: parsed.type === 'income' ? 'Pemasukan Ditambahkan' : 'Pengeluaran Ditambahkan',
        message: `${formatRupiah(parsed.amount)} - ${parsed.categoryName} (via Telegram)`,
        source: 'telegram',
    });

    const label = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    await sendTelegramMessage(
        chatId,
        `✅ Tercatat: ${label} ${formatRupiah(parsed.amount)} - ${parsed.categoryName}`
    );

    return NextResponse.json({ ok: true });
}
