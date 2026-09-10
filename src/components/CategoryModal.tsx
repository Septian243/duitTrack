'use client';

import { useState } from 'react';
import { X, FolderPlus, Pencil } from 'lucide-react';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense';
    is_system: boolean;
};

export default function CategoryModal({
    mode,
    initialData,
    onClose,
    onSaved,
}: {
    mode: 'add' | 'edit';
    initialData?: Category;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [type, setType] = useState<'income' | 'expense'>(initialData?.type ?? 'expense');
    const [name, setName] = useState(initialData?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Nama kategori wajib diisi.');
            return;
        }

        setSaving(true);

        const url = mode === 'add' ? '/api/categories' : `/api/categories/${initialData!.id}`;
        const method = mode === 'add' ? 'POST' : 'PATCH';
        const payload = mode === 'add' ? { name: name.trim(), type } : { name: name.trim() };

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Gagal menyimpan kategori.');
            setSaving(false);
            return;
        }

        setSaving(false);
        onSaved();
    }

    const inputClass =
        'w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#76C457] transition-colors';

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        {mode === 'add' ? (
                            <FolderPlus size={18} className="text-[#76C457]" />
                        ) : (
                            <Pencil size={18} className="text-[#76C457]" />
                        )}
                        <h2 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            {mode === 'add' ? 'Tambah Kategori' : 'Edit Kategori'}
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

                <form id="category-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Jenis */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Jenis<span className="text-[#E07A5F]">*</span>
                        </label>
                        {mode === 'add' ? (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('expense')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${type === 'expense'
                                        ? 'border-[#E07A5F] bg-[#FCEAE5] text-[#B5543E]'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-[#E07A5F]' : 'bg-gray-300'}`}
                                    />
                                    Pengeluaran
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('income')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${type === 'income'
                                        ? 'border-[#76C457] bg-[#E8F5E0] text-[#3D6B2C]'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-[#76C457]' : 'bg-gray-300'}`}
                                    />
                                    Pemasukan
                                </button>
                            </div>
                        ) : (
                            <div
                                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium ${type === 'expense'
                                    ? 'border-[#E07A5F] bg-[#FCEAE5] text-[#B5543E]'
                                    : 'border-[#76C457] bg-[#E8F5E0] text-[#3D6B2C]'
                                    }`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-[#E07A5F]' : 'bg-[#76C457]'}`}
                                />
                                {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                                <span className="text-xs text-gray-400 ml-auto">tidak dapat diubah</span>
                            </div>
                        )}
                    </div>

                    {/* Nama */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                            Nama Kategori<span className="text-[#E07A5F]">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Hiburan, Bonus"
                            className={inputClass}
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-sm text-[#E07A5F]">{error}</p>}
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
                        form="category-form"
                        disabled={saving}
                        className="px-6 py-2.5 rounded-full bg-[#76C457] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : mode === 'add' ? 'Simpan Kategori' : 'Update Kategori'}
                    </button>
                </div>
            </div>
        </div>
    );
}