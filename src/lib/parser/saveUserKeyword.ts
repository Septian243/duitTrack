import { SupabaseClient } from '@supabase/supabase-js';

const STOPWORDS = new Set([
    'yang', 'di', 'ke', 'dari', 'untuk', 'dan', 'atau', 'ini', 'itu', 'saya',
    'beli', 'bayar', 'buat', 'sama', 'aja', 'saja', 'dong', 'nih', 'tuh',
    'rb', 'ribu', 'jt', 'juta', 'rp',
]);

function isAmountToken(word: string) {
    return /^\d+(?:[.,]\d+)?(?:rb|ribu|jt|juta)?$/i.test(word);
}

function extractKeywords(note: string): string[] {
    const words = note
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .filter((w) => !isAmountToken(w))
        .filter((w) => !/\d/.test(w))
        .filter((w) => !STOPWORDS.has(w));

    return Array.from(new Set(words)).slice(0, 3);
}

export async function saveUserKeyword(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    params: { userId: string; note: string; categoryId: string }
) {
    const keywords = extractKeywords(params.note);
    if (keywords.length === 0) return;

    const rows = keywords.map((keyword) => ({
        user_id: params.userId,
        keyword,
        category_id: params.categoryId,
    }));

    await supabase
        .from('user_keyword_mappings')
        .upsert(rows, { onConflict: 'user_id,keyword' });
}
