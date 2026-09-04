'use client';

import { useEffect, useState } from 'react';

type Category = { id: string; name: string; type: 'income' | 'expense' };
type Tag = { id: string; name: string };
type Transaction = {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    transaction_date: string;
    note: string | null;
    categories: { name: string } | null;
    transaction_tags: { tags: { id: string; name: string } }[];
};

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

    useEffect(() => {
        let ignore = false;

        async function loadAll() {
            setLoading(true);
            const [txRes, catRes, tagRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/categories'),
                fetch('/api/tags'),
            ]);
            const [txData, catData, tagData] = await Promise.all([
                txRes.json(),
                catRes.json(),
                tagRes.json(),
            ]);
            if (!ignore) {
                setTransactions(txData);
                setCategories(catData);
                setTags(tagData);
                setLoading(false);
            }
        }

        loadAll();

        return () => {
            ignore = true;
        };
    }, [reloadKey]);

    const filteredCategories = categories.filter((c) => c.type === type);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: Number(amount),
                type,
                category_id: categoryId || null,
                transaction_date: date,
                note,
                currency: 'IDR',
                tag_ids: selectedTagIds,
            }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }
        setAmount('');
        setNote('');
        setSelectedTagIds([]);
        setReloadKey((k) => k + 1);
    }

    async function handleDelete(id: string) {
        if (!confirm('Hapus transaksi ini?')) return;
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        setReloadKey((k) => k + 1);
    }

    function toggleTag(id: string) {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    }

    function formatRupiah(n: number) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
    }

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Transaksi</h1>

            <div style={{ marginBottom: 16 }}>
                <a href="/api/export?format=csv" style={{ marginRight: 12 }}>
                    Export CSV
                </a>
                <a href="/api/export?format=xlsx" style={{ marginRight: 12 }}>
                    Export Excel
                </a>
                <a href="/api/export?format=pdf">Export PDF</a>
            </div>

            <form onSubmit={handleAdd} style={{ marginBottom: 32, maxWidth: 480 }}>
                <div style={{ marginBottom: 12 }}>
                    <select
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value as 'income' | 'expense');
                            setCategoryId('');
                        }}
                        style={{ padding: 8, marginRight: 8 }}
                    >
                        <option value="expense">Pengeluaran</option>
                        <option value="income">Pemasukan</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Jumlah (Rp)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min={1}
                        style={{ padding: 8 }}
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        style={{ padding: 8, marginRight: 8 }}
                    >
                        <option value="">-- Pilih kategori --</option>
                        {filteredCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        style={{ padding: 8 }}
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Catatan (opsional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{ padding: 8, width: '100%' }}
                    />
                </div>

                {tags.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {tags.map((t) => (
                            <label key={t.id} style={{ marginRight: 12 }}>
                                <input
                                    type="checkbox"
                                    checked={selectedTagIds.includes(t.id)}
                                    onChange={() => toggleTag(t.id)}
                                />{' '}
                                {t.name}
                            </label>
                        ))}
                    </div>
                )}

                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Tambah Transaksi</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Catatan</th>
                        <th>Tag</th>
                        <th>Jumlah</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td>{tx.transaction_date}</td>
                            <td>{tx.categories?.name ?? '-'}</td>
                            <td>{tx.note ?? '-'}</td>
                            <td>{tx.transaction_tags.map((tt) => tt.tags.name).join(', ') || '-'}</td>
                            <td style={{ color: tx.type === 'income' ? 'green' : 'crimson' }}>
                                {tx.type === 'income' ? '+' : '-'}
                                {formatRupiah(tx.amount)}
                            </td>
                            <td>
                                <button onClick={() => handleDelete(tx.id)}>Hapus</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}