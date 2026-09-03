export const EXPENSE_KEYWORDS: Record<string, string[]> = {
    'Makanan/Minuman': [
        'makan', 'kopi', 'minum', 'jajan', 'nasi', 'ayam', 'kfc', 'mcd',
        'sarapan', 'kuliner', 'gofood', 'grabfood', 'warteg', 'bakso', 'mie',
    ],
    Transportasi: [
        'bensin', 'grab', 'gojek', 'ojek', 'ojol', 'parkir', 'tol', 'bus',
        'kereta', 'krl', 'pertamax', 'pertalite', 'transportasi',
    ],
    Belanja: ['belanja', 'shopee', 'tokopedia', 'baju', 'sepatu', 'beli'],
    Tagihan: [
        'listrik', 'pulsa', 'paket data', 'wifi', 'internet', 'kos', 'kontrakan',
        'sewa', 'tagihan', 'pdam', 'air',
    ],
    Hiburan: ['nonton', 'bioskop', 'game', 'netflix', 'spotify', 'hiburan'],
    Kesehatan: ['obat', 'dokter', 'rumah sakit', 'apotek', 'vitamin', 'kesehatan'],
    Pendidikan: ['buku', 'kursus', 'kuliah', 'sekolah', 'skpp', 'pendidikan'],
};

export const INCOME_KEYWORDS: Record<string, string[]> = {
    Gaji: ['gaji', 'salary'],
    Bonus: ['bonus', 'thr'],
    Investasi: ['dividen', 'investasi', 'saham', 'reksadana'],
};

export const DEFAULT_EXPENSE_CATEGORY = 'Lainnya';
export const DEFAULT_INCOME_CATEGORY = 'Lainnya';