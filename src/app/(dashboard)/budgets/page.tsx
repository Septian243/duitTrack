'use client';

import { useEffect, useState } from 'react';

type Category = { id: string; name: string; type: 'income' | 'expense' };
type Budget = {
    id: string;
    category_id: string | null;
    amount: number;
    spent: number;
    categories: { name: string } | null;
};

function formatMoney(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

function statusColor(pct: number) {
    if (pct >= 100) return '#E07A5F';
    if (pct >= 80) return '#F2CC8F';
    return '#21A366';
}

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const currentMonth = new Date().toISOString().slice(0, 7);

    useEffect(() => {
        let ignore = false;

        async function load() {
            setLoading(true);
            const [budRes, catRes] = await Promise.all([
                fetch(`/api/budgets?month=${currentMonth}`),
                fetch('/api/categories'),
            ]);
            const [budData, catData] = await Promise.all([budRes.json(), catRes.json()]);
            if (!ignore) {
                setBudgets(budData);
                setCategories(catData.filter((c: Category) => c.type === 'expense'));
                setLoading(false);
            }
        }

        load();

        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const res = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category_id: categoryId || null,
                amount: Number(amount),
                month: currentMonth,
            }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }
        setAmount('');
        setCategoryId('');
        setReloadKey((k) => k + 1);
    }

    async function handleDelete(id: string) {
        if (!confirm('Hapus budget ini?')) return;
        await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
        setReloadKey((k) => k + 1);
    }

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Budget Bulan Ini</h1>

            <form onSubmit={handleAdd} style={{ marginBottom: 32, maxWidth: 480 }}>
                <div style={{ marginBottom: 12 }}>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        style={{ padding: 8, marginRight: 8 }}
                    >
                        <option value="">Budget keseluruhan</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Jumlah budget"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min={1}
                        style={{ padding: 8 }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Set Budget</button>
            </form>

            {budgets.length === 0 && <p>Belum ada budget bulan ini.</p>}

            {budgets.map((b) => {
                const pct = Math.min((b.spent / b.amount) * 100, 100);
                return (
                    <div key={b.id} style={{ borderTop: '1px solid #ddd', paddingTop: 12, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{b.categories?.name ?? 'Keseluruhan'}</strong>
                            <button onClick={() => handleDelete(b.id)}>Hapus</button>
                        </div>
                        <p>
                            {formatMoney(b.spent)} / {formatMoney(b.amount)}
                        </p>
                        <div style={{ background: '#eee', height: 4, borderRadius: 2 }}>
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: statusColor((b.spent / b.amount) * 100),
                                    borderRadius: 2,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}