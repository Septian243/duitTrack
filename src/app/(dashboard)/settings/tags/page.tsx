'use client';

import { useEffect, useState } from 'react';

type Tag = {
    id: string;
    name: string;
};

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        async function loadTags() {
            setLoading(true);
            const res = await fetch('/api/tags');
            const data = await res.json();
            if (!ignore) {
                setTags(data);
                setLoading(false);
            }
        }

        loadTags();

        return () => {
            ignore = true;
        };
    }, [reloadKey]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const res = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }
        setName('');
        setReloadKey((k) => k + 1);
    }

    async function handleDelete(id: string) {
        if (!confirm('Hapus tag ini?')) return;
        await fetch(`/api/tags/${id}`, { method: 'DELETE' });
        setReloadKey((k) => k + 1);
    }

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Tag</h1>

            <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
                <input
                    type="text"
                    placeholder="Nama tag"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ marginRight: 8, padding: 8 }}
                />
                <button type="submit">Tambah</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <ul>
                {tags.map((t) => (
                    <li key={t.id}>
                        {t.name}
                        <button onClick={() => handleDelete(t.id)} style={{ marginLeft: 8 }}>
                            Hapus
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}