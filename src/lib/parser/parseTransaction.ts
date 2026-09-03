import {
    EXPENSE_KEYWORDS,
    INCOME_KEYWORDS,
    DEFAULT_EXPENSE_CATEGORY,
    DEFAULT_INCOME_CATEGORY,
} from './categoryKeywords';

export type ParsedTransaction = {
    amount: number;
    type: 'income' | 'expense';
    categoryName: string;
    note: string;
};

const INCOME_SIGNAL_WORDS = ['gaji', 'bonus', 'thr', 'dividen', 'investasi', 'terima', 'dapat'];

function parseAmount(text: string): number | null {
    const regex = /(\d+(?:[.,]\d+)?)\s*(rb|ribu|jt|juta)?/gi;
    let match: RegExpExecArray | null;
    let best: number | null = null;

    while ((match = regex.exec(text)) !== null) {
        const rawNumber = parseFloat(match[1].replace(',', '.'));
        const unit = match[2]?.toLowerCase();

        let value = rawNumber;
        if (unit === 'rb' || unit === 'ribu') value = rawNumber * 1_000;
        if (unit === 'jt' || unit === 'juta') value = rawNumber * 1_000_000;

        if (best === null || value > best) {
            best = value;
        }
    }

    return best;
}

function detectCategory(
    text: string,
    keywordMap: Record<string, string[]>,
    fallback: string
): string {
    const lower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(keywordMap)) {
        if (keywords.some((kw) => lower.includes(kw))) {
            return category;
        }
    }
    return fallback;
}

export function parseTransaction(text: string): ParsedTransaction | null {
    const amount = parseAmount(text);
    if (amount === null || amount <= 0) {
        return null;
    }

    const lower = text.toLowerCase();
    const isIncome = INCOME_SIGNAL_WORDS.some((w) => lower.includes(w));

    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';
    const categoryName = isIncome
        ? detectCategory(text, INCOME_KEYWORDS, DEFAULT_INCOME_CATEGORY)
        : detectCategory(text, EXPENSE_KEYWORDS, DEFAULT_EXPENSE_CATEGORY);

    return {
        amount,
        type,
        categoryName,
        note: text.trim(),
    };
}