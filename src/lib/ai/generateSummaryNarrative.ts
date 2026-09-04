import { GoogleGenerativeAI } from '@google/generative-ai';

export type SummaryNumbers = {
    month: string;
    userName: string | null;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    prevMonthExpense: number | null;
    topCategories: { name: string; amount: number }[];
    significantIncrease: { category: string; pctChange: number } | null;
};

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

function buildFallbackNarrative(data: SummaryNumbers): string {
    const greeting = data.userName ? `Halo ${data.userName}!` : 'Halo!';
    const lines = [
        `${greeting} Ringkasan ${data.month}:`,
        `Pemasukan: ${formatRupiah(data.totalIncome)}`,
        `Pengeluaran: ${formatRupiah(data.totalExpense)}`,
        `Saldo: ${formatRupiah(data.balance)}`,
    ];

    if (data.topCategories.length > 0) {
        lines.push(
            `Kategori pengeluaran terbesar: ${data.topCategories
                .slice(0, 3)
                .map((c) => `${c.name} (${formatRupiah(c.amount)})`)
                .join(', ')}`
        );
    }

    if (data.significantIncrease) {
        lines.push(
            `Kategori "${data.significantIncrease.category}" naik ${Math.round(data.significantIncrease.pctChange)}% dari bulan lalu.`
        );
    }

    return lines.join('\n');
}

export async function generateSummaryNarrative(data: SummaryNumbers): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL;

    if (!apiKey || !modelName) {
        return buildFallbackNarrative(data);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Kamu adalah asisten keuangan pribadi. Tuliskan ringkasan bulanan keuangan dalam Bahasa Indonesia, gaya hangat dan singkat (maksimal 4-5 kalimat), berdasarkan data berikut. Sapa pengguna dengan namanya di awal kalimat${data.userName ? ` (nama: ${data.userName})` : ' (kalau nama tidak ada, sapa dengan "Halo!" saja tanpa nama)'}. JANGAN menghitung ulang angka apapun, JANGAN mengarang angka baru - hanya rangkai angka yang diberikan jadi narasi natural.

Data (${data.month}):
- Total pemasukan: ${formatRupiah(data.totalIncome)}
- Total pengeluaran: ${formatRupiah(data.totalExpense)}
- Saldo: ${formatRupiah(data.balance)}
- Pengeluaran bulan lalu: ${data.prevMonthExpense !== null ? formatRupiah(data.prevMonthExpense) : 'tidak ada data'}
- Kategori pengeluaran terbesar: ${data.topCategories.map((c) => `${c.name} (${formatRupiah(c.amount)})`).join(', ') || 'tidak ada'}
- Kenaikan signifikan: ${data.significantIncrease ? `kategori ${data.significantIncrease.category} naik ${Math.round(data.significantIncrease.pctChange)}%` : 'tidak ada'}`;

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini timeout')), 8000)
        );

        const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
        const text = result.response.text();

        if (!text || !text.trim()) {
            return buildFallbackNarrative(data);
        }

        return text.trim();
    } catch {
        return buildFallbackNarrative(data);
    }
}