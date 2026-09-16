'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag as TagIcon } from 'lucide-react';

export default function TagModal({
    onClose,
    onSaved,
}: {
    onClose: () => void;
    onSaved: (name: string) => void;
}) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Nama tag wajib diisi.');
            return;
        }

        setSaving(true);

        const res = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Gagal menyimpan tag.');
            setSaving(false);
            return;
        }

        setSaving(false);
        onSaved(name.trim());
    }

    return typeof document === 'undefined' ? null : createPortal((
        <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <TagIcon size={18} className="text-[#76C457]" />
                        <h2 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Tambah Tag
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Tutup"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form id="tag-form" onSubmit={handleSubmit} className="px-6 py-5">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Nama Tag<span className="text-[#E07A5F]">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Liburan, Mendesak"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#76C457] transition-colors"
                        autoFocus
                    />
                    {error && <p className="text-sm text-[#E07A5F] mt-2">{error}</p>}
                </form>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="tag-form"
                        disabled={saving}
                        className="px-6 py-2.5 rounded-full bg-[#76C457] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Tag'}
                    </button>
                </div>
            </div>
        </div>
    ), document.body);
}
