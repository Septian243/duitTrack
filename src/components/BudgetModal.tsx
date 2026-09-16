'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Pencil, ChevronDown, Search } from 'lucide-react';

type Category = { id: string; name: string; type: 'income' | 'expense' };
type Budget = {
    id: string;
    category_id: string | null;
    amount: number;
    spent: number;
    categories: { name: string } | null;
};

export default function BudgetModal({
    mode,
    initialData,
    categories,
    existingBudgets,
    month,
    onClose,
    onSaved,
}: {
    mode: 'add' | 'edit';
    initialData?: Budget;
    categories: Category[];
    existingBudgets: Budget[];
    month: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '');
    const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryMenuStyle, setCategoryMenuStyle] = useState<React.CSSProperties>();
    const categoryButtonRef = useRef<HTMLButtonElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const getMenuStyle = useCallback(() => {
        const button = categoryButtonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const modalRect = modalRef.current?.getBoundingClientRect();
        const menuHeight = 224;
        const top = rect.bottom + 8;
        const boundaryBottom = modalRect?.bottom ?? window.innerHeight - 8;
        const availableBelow = boundaryBottom - top - 8;

        setCategoryMenuStyle({
            top,
            left: rect.left + 4,
            width: Math.max(0, rect.width - 8),
            maxHeight: Math.max(48, Math.min(menuHeight, availableBelow)),
        });
    }, []);

    const updateMenuPosition = useCallback(() => {
        if (categoryOpen) getMenuStyle();
    }, [categoryOpen, getMenuStyle]);

    const takenCategoryIds = existingBudgets
        .filter((b) => b.category_id !== null)
        .map((b) => b.category_id as string);
    const overallTaken = existingBudgets.some((b) => b.category_id === null);
    const availableCategories = categories.filter((c) => !takenCategoryIds.includes(c.id));
    const nothingLeftToAdd = overallTaken && availableCategories.length === 0;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setCategoryOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [updateMenuPosition]);

    function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        setAmount(digitsOnly);
    }

    const formattedAmount = amount ? new Intl.NumberFormat('id-ID').format(Number(amount)) : '';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!amount || Number(amount) <= 0) {
            setError('Jumlah budget wajib diisi.');
            return;
        }

        setSaving(true);

        if (mode === 'add') {
            const res = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: categoryId || null,
                    amount: Number(amount),
                    month,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Gagal menyimpan budget.');
                setSaving(false);
                return;
            }
        } else {
            const res = await fetch(`/api/budgets/${initialData!.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Gagal memperbarui budget.');
                setSaving(false);
                return;
            }
        }

        setSaving(false);
        onSaved();
    }

    const inputClass =
        'w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#76C457] transition-colors';

    const editingLabel = initialData?.category_id === null
        ? 'Keseluruhan'
        : initialData?.categories?.name ?? 'Kategori';
    const filteredCategories = availableCategories.filter((category) =>
        category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    const selectedCategoryLabel = categoryId
        ? availableCategories.find((category) => category.id === categoryId)?.name ?? 'Pilih kategori'
        : 'Budget Keseluruhan';

    return typeof document === 'undefined' ? null : createPortal((
        <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                            className="modal-fade-in flex max-h-[96vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        {mode === 'add' ? (
                            <Target size={18} className="text-[#76C457]" />
                        ) : (
                            <Pencil size={18} className="text-[#76C457]" />
                        )}
                        <h2 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            {mode === 'add' ? 'Set Budget Baru' : 'Edit Budget'}
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

                <form id="budget-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {mode === 'add' ? (
                        <div ref={categoryRef} className="relative min-h-[74px] min-w-0">
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Untuk</label>
                            <button
                                type="button"
                                ref={categoryButtonRef}
                                onClick={() => {
                                    const nextOpen = !categoryOpen;
                                    setCategoryOpen(nextOpen);
                                    if (nextOpen) getMenuStyle();
                                }}
                                className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                            >
                                <span className="min-w-0 truncate">{overallTaken && !categoryId ? 'Pilih kategori' : selectedCategoryLabel}</span>
                                <ChevronDown size={16} className="shrink-0 text-gray-500" />
                            </button>
                            {categoryOpen && (
                                <div
                                    className="fixed z-[300] max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl"
                                    style={categoryMenuStyle}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="sticky top-0 z-10 border-b border-gray-50 bg-white p-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                placeholder="Cari kategori..."
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {!overallTaken && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCategoryId('');
                                                    setCategoryOpen(false);
                                                }}
                                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${!categoryId ? 'bg-[#E8F5E0] font-medium text-[#3D6B2C]' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                Budget Keseluruhan
                                            </button>
                                        )}
                                        {filteredCategories.length === 0 ? (
                                            <p className="px-2 py-2 text-xs text-gray-400">Tidak ada kategori ditemukan.</p>
                                        ) : (
                                            filteredCategories.map((category) => (
                                                <button
                                                    key={category.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategoryId(category.id);
                                                        setCategorySearch('');
                                                        setCategoryOpen(false);
                                                    }}
                                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${categoryId === category.id ? 'bg-[#E8F5E0] font-medium text-[#3D6B2C]' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    {category.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                            {nothingLeftToAdd && (
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Semua kategori sudah punya budget bulan ini.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Untuk</label>
                            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                                {editingLabel}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                            Jumlah Budget<span className="text-[#E07A5F]">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formattedAmount}
                                onChange={handleAmountChange}
                                placeholder="0"
                                className={`${inputClass} pl-10`}
                            />
                        </div>
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
                        form="budget-form"
                        disabled={saving || (mode === 'add' && nothingLeftToAdd)}
                        className="px-6 py-2.5 rounded-full bg-[#76C457] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : mode === 'add' ? 'Simpan Budget' : 'Update Budget'}
                    </button>
                </div>
            </div>
        </div>
    ), document.body);
}
