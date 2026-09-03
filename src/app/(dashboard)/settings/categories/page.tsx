'use client';

import { useEffect, useState } from 'react';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense';
    is_system: boolean;
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [error, setError] = useState<string | null>(null);

    async function loadCategories() {
        setLoading(true);
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(data);
        setLoading(false);
    }

    useEffect(() => {
        loadCategories();
    }, []);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }
        setName('');
        loadCategories();
    }

    async function handleDelete(id: string) {
        if (!confirm('Hapus kategori ini?')) return;
        await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        loadCategories();
    }

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Kategori</h1>

            <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
                <input
                    type="text"
                    placeholder="Nama kategori"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ marginRight: 8, padding: 8 }}
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    style={{ marginRight: 8, padding: 8 }}
                >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                </select>
                <button type="submit">Tambah</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <h3>Pengeluaran</h3>
            <ul>
                {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                        <li key={c.id}>
                            {c.name} {c.is_system && '(default)'}
                            {!c.is_system && (
                                <button onClick={() => handleDelete(c.id)} style={{ marginLeft: 8 }}>
                                    Hapus
                                </button>
                            )}
                        </li>
                    ))}
            </ul>

            <h3>Pemasukan</h3>
            <ul>
                {categories
                    .filter((c) => c.type === 'income')
                    .map((c) => (
                        <li key={c.id}>
                            {c.name} {c.is_system && '(default)'}
                            {!c.is_system && (
                                <button onClick={() => handleDelete(c.id)} style={{ marginLeft: 8 }}>
                                    Hapus
                                </button>
                            )}
                        </li>
                    ))}
            </ul>
        </div>
    );
}