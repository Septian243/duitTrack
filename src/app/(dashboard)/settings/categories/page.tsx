'use client';

import { useEffect, useState } from 'react';
import CategoryModal from '@/components/CategoryModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, Search, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense';
    is_system: boolean;
    in_use?: boolean;
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const { showToast } = useToast();

    async function loadCategories() {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Gagal memuat kategori');
        const data = await res.json();
        setCategories(data);
    }

    useEffect(() => {
        async function init() {
            setLoading(true);
            await loadCategories();
            setLoading(false);
        }
        init().catch(() => {
            setError('Kategori gagal dimuat. Silakan coba lagi.');
            setLoading(false);
        });
    }, []);

    function handleAddClick() {
        setEditingCategory(null);
        setModalOpen(true);
    }

    function handleEditClick(c: Category) {
        setEditingCategory(c);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingCategory(null);
    }

    async function handleSaved(savedName: string) {
        const wasEditing = Boolean(editingCategory);
        const categoryName = savedName || editingCategory?.name || 'kategori';
        closeModal();
        await loadCategories();
        showToast({
            type: 'success',
            title: wasEditing ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
            description: `Kategori "${categoryName}" berhasil ${wasEditing ? 'diupdate' : 'dibuat'}.`,
        });
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        const c = deleteTarget;
        const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            showToast({ type: 'error', title: 'Gagal Menghapus', description: data.error ?? 'Kategori tidak dapat dihapus.' });
            return;
        }
        setDeleteTarget(null);
        await loadCategories();
        showToast({ type: 'success', title: 'Berhasil Dihapus', description: `Kategori "${c.name}" berhasil dihapus.` });
    }

    const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );
    const expenseCategories = filtered.filter((c) => c.type === 'expense');
    const incomeCategories = filtered.filter((c) => c.type === 'income');

    function renderRow(c: Category) {
        const deleteDisabled = c.is_system || c.in_use;
        const deleteTitle = c.is_system
            ? 'Kategori sistem tidak dapat dihapus'
            : c.in_use
                ? 'Tidak bisa dihapus — kategori ini masih dipakai di transaksi'
                : 'Hapus kategori';

        return (
            <div
                key={c.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                        {c.is_system ? 'Default' : 'Pribadi'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {c.is_system ? (
                        <span className="text-xs text-gray-400">Hanya baca</span>
                    ) : (
                        <button
                            onClick={() => handleEditClick(c)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FDF3D9] text-[#D9A331] hover:opacity-80 transition-opacity"
                            aria-label="Edit"
                            title="Edit kategori pribadi"
                        >
                            <Pencil size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => setDeleteTarget(c)}
                        disabled={deleteDisabled}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-opacity ${deleteDisabled
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-[#FCE4E4] text-[#E0574B] hover:opacity-80'
                            }`}
                        aria-label="Hapus"
                        title={deleteTitle}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            {error && <div className="mb-6 rounded-2xl border border-[#E07A5F]/30 bg-[#FCEAE5] px-4 py-3 text-sm text-[#A84D3A]" role="alert">{error}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#76C457] transition-colors"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleAddClick}
                    className="flex items-center gap-2 bg-[#76C457] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                    Tambah Kategori
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pengeluaran */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#FCEAE5] flex items-center justify-center shrink-0">
                            <ArrowDownCircle size={16} className="text-[#E07A5F]" />
                        </div>
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Pengeluaran
                        </h3>
                    </div>
                    {loading ? (
                        <div className="skeleton-pulse mt-4 h-40 rounded-xl bg-gray-100" role="status" aria-label="Memuat kategori pengeluaran" />
                    ) : expenseCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">Tidak ada kategori ditemukan.</p>
                    ) : (
                        <div>{expenseCategories.map(renderRow)}</div>
                    )}
                </div>

                {/* Pemasukan */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#E8F5E0] flex items-center justify-center shrink-0">
                            <ArrowUpCircle size={16} className="text-[#76C457]" />
                        </div>
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Pemasukan
                        </h3>
                    </div>
                    {loading ? (
                        <div className="skeleton-pulse mt-4 h-40 rounded-xl bg-gray-100" role="status" aria-label="Memuat kategori pemasukan" />
                    ) : incomeCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">Tidak ada kategori ditemukan.</p>
                    ) : (
                        <div>{incomeCategories.map(renderRow)}</div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <CategoryModal
                    mode={editingCategory ? 'edit' : 'add'}
                    initialData={editingCategory ?? undefined}
                    onClose={closeModal}
                    onSaved={handleSaved}
                />
            )}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Hapus Kategori"
                itemType="kategori"
                itemName={deleteTarget?.name ?? ''}
                consequence="Kategori ini belum digunakan di transaksi manapun."
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
