type InlineKeyboardButton = {
    text: string;
    callback_data: string;
};

type InlineKeyboardMarkup = {
    inline_keyboard: InlineKeyboardButton[][];
};

type SendMessageResult = {
    message_id: number;
};

async function callTelegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN belum diset');
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gagal panggil Telegram API (${method}): ${errBody}`);
    }

    const data = await res.json();
    return data.result as T;
}

export async function sendTelegramMessage(
    chatId: number | string,
    text: string,
    options?: { replyMarkup?: InlineKeyboardMarkup }
): Promise<SendMessageResult> {
    return callTelegramApi<SendMessageResult>('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: options?.replyMarkup,
    });
}

export async function editTelegramMessage(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: { replyMarkup?: InlineKeyboardMarkup }
): Promise<void> {
    await callTelegramApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: options?.replyMarkup ?? { inline_keyboard: [] },
    });
}

export async function answerCallbackQuery(
    callbackQueryId: string,
    text?: string
): Promise<void> {
    await callTelegramApi('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text,
    });
}

export function buildInlineKeyboard(
    buttons: { label: string; data: string }[],
    columns = 2
): InlineKeyboardMarkup {
    const rows: InlineKeyboardButton[][] = [];
    for (let i = 0; i < buttons.length; i += columns) {
        rows.push(
            buttons.slice(i, i + columns).map((b) => ({ text: b.label, callback_data: b.data }))
        );
    }
    return { inline_keyboard: rows };
}