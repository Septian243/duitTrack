'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Search, Plus, Receipt, Pencil } from 'lucide-react';

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
    category_id?: string | null;
};

export default function TransactionModal({
    mode,
    initialData,
    categories,
    tags,
    onClose,
    onSaved,
    onTagCreated,
}: {
    mode: 'add' | 'edit';
    initialData?: Transaction;
    categories: Category[];
    tags: Tag[];
    onClose: () => void;
    onSaved: () => void;
    onTagCreated: (tag: Tag) => void;
}) {
    const [type, setType] = useState<'income' | 'expense'>(initialData?.type ?? 'expense');
    const [note, setNote] = useState(initialData?.note ?? '');
    const [categoryId, setCategoryId] = useState(
        initialData?.category_id ?? ''
    );
    const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
    const [date, setDate] = useState(
        initialData?.transaction_date ?? new Date().toISOString().slice(0, 10)
    );
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        initialData?.transaction_tags.map((tt) => tt.tags.id) ?? []
    );
    const [newTagNames, setNewTagNames] = useState<string[]>([]);

    const [categorySearch, setCategorySearch] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [tagOpen, setTagOpen] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categoryRef = useRef<HTMLDivElement>(null);
    const tagRef = useRef<HTMLDivElement>(null);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);
    const tagButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [categoryMenuStyle, setCategoryMenuStyle] = useState<React.CSSProperties>();
    const [tagMenuStyle, setTagMenuStyle] = useState<React.CSSProperties>();

    const getMenuStyle = useCallback((button: HTMLButtonElement) => {
        const rect = button.getBoundingClientRect();
        const modalRect = modalRef.current?.getBoundingClientRect();
        const menuHeight = 224;
        const boundaryBottom = modalRect?.bottom ?? window.innerHeight - 8;
        const top = rect.bottom + 8;
        const availableBelow = boundaryBottom - top - 8;
        const maxHeight = Math.max(48, Math.min(menuHeight, availableBelow));

        return {
            top,
            left: rect.left + 4,
            width: Math.max(0, rect.width - 8),
            maxHeight,
        };
    }, []);

    const updateMenuPositions = useCallback(() => {
        if (categoryOpen && categoryButtonRef.current) {
            setCategoryMenuStyle(getMenuStyle(categoryButtonRef.current));
        }
        if (tagOpen && tagButtonRef.current) {
            setTagMenuStyle(getMenuStyle(tagButtonRef.current));
        }
    }, [categoryOpen, tagOpen, getMenuStyle]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setCategoryOpen(false);
            }
            if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
                setTagOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateMenuPositions);
        window.addEventListener('scroll', updateMenuPositions, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateMenuPositions);
            window.removeEventListener('scroll', updateMenuPositions, true);
        };
    }, [categoryOpen, tagOpen, updateMenuPositions]);

    useEffect(() => {
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const filteredCategories = categories.filter(
        (c) => c.type === type && c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const selectedExistingTags = tags.filter((t) => selectedTagIds.includes(t.id));
    const filteredTags = tags.filter(
        (t) =>
            !selectedTagIds.includes(t.id) &&
            t.name.toLowerCase().includes(tagSearch.toLowerCase())
    );
    const tagQueryTrimmed = tagSearch.trim();
    const exactTagExists = tags.some((t) => t.name.toLowerCase() === tagQueryTrimmed.toLowerCase());
    const alreadyQueuedAsNew = newTagNames.some(
        (n) => n.toLowerCase() === tagQueryTrimmed.toLowerCase()
    );
    const canCreateNewTag = tagQueryTrimmed.length > 0 && !exactTagExists && !alreadyQueuedAsNew;

    function handleTypeChange(newType: 'income' | 'expense') {
        setType(newType);
        setCategoryId(''); // kategori tidak valid lintas jenis, reset
    }

    function selectCategory(id: string) {
        setCategoryId(id);
        setCategorySearch('');
        setCategoryOpen(false);
    }

    function toggleExistingTag(id: string) {
        setSelectedTagIds((prev) => [...prev, id]);
        setTagSearch('');
        setTagOpen(false);
    }

    function removeExistingTag(id: string) {
        setSelectedTagIds((prev) => prev.filter((t) => t !== id));
    }

    function queueNewTag() {
        if (!canCreateNewTag) return;
        setNewTagNames((prev) => [...prev, tagQueryTrimmed]);
        setTagSearch('');
        setTagOpen(false);
    }

    function removeNewTag(name: string) {
        setNewTagNames((prev) => prev.filter((n) => n !== name));
    }

    function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        setAmount(digitsOnly);
    }

    const formattedAmount = amount
        ? new Intl.NumberFormat('id-ID').format(Number(amount))
        : '';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!note.trim()) {
            setError('Catatan wajib diisi.');
            return;
        }
        if (!categoryId) {
            setError('Kategori wajib dipilih.');
            return;
        }
        if (!amount || Number(amount) <= 0) {
            setError('Jumlah wajib diisi.');
            return;
        }

        setSaving(true);

        // Buat dulu tag-tag baru yang di-ketik user (kalau ada), kumpulkan id-nya
        const finalTagIds = [...selectedTagIds];
        for (const name of newTagNames) {
            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                const created = await res.json();
                finalTagIds.push(created.id);
                onTagCreated(created);
            }
        }

        const payload = {
            amount: Number(amount),
            type,
            category_id: categoryId,
            transaction_date: date,
            note: note.trim(),
            currency: 'IDR',
            tag_ids: finalTagIds,
        };

        const url = mode === 'add' ? '/api/transactions' : `/api/transactions/${initialData!.id}`;
        const method = mode === 'add' ? 'POST' : 'PATCH';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Gagal menyimpan transaksi.');
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
                ref={modalRef}
                className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        {mode === 'add' ? (
                            <Receipt size={18} className="text-[#76C457]" />
                        ) : (
                            <Pencil size={18} className="text-[#76C457]" />
                        )}
                        <h2 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            {mode === 'add' ? 'Tambah Transaksi Baru' : 'Edit Transaksi'}
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

                {/* Body */}
                <form id="transaction-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-9 overflow-y-auto px-6 py-5">
                    {/* Jenis */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Jenis<span className="text-[#E07A5F]">*</span>
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('expense')}
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
                                onClick={() => handleTypeChange('income')}
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
                    </div>

                    {/* Catatan */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Catatan<span className="text-[#E07A5F]">*</span>
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Makan siang, Gaji bulanan"
                            className={inputClass}
                        />
                    </div>

                    {/* Kategori & Tag - side by side */}
                    <div className="grid min-w-0 grid-cols-2 gap-4">
                        {/* Kategori */}
                        <div ref={categoryRef} className="relative min-h-[74px] min-w-0">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Kategori<span className="text-[#E07A5F]">*</span>
                            </label>
                            <button
                                type="button"
                                ref={categoryButtonRef}
                                onClick={() => {
                                    const nextOpen = !categoryOpen;
                                    setCategoryOpen(nextOpen);
                                    setTagOpen(false);
                                    if (nextOpen && categoryButtonRef.current) {
                                        setCategoryMenuStyle(getMenuStyle(categoryButtonRef.current));
                                    }
                                }}
                                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100"
                            >
                                <span className={`min-w-0 truncate ${selectedCategory ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {selectedCategory?.name ?? 'Cari kategori...'}
                                </span>
                                <ChevronDown size={16} className="text-gray-400 shrink-0" />
                            </button>
                            {categoryOpen && (
                                <div
                                    className="fixed z-[300] max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl"
                                    style={categoryMenuStyle}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 sticky top-0 bg-white border-b border-gray-50">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                placeholder="Cari kategori..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {filteredCategories.length === 0 ? (
                                            <p className="text-xs text-gray-400 px-2 py-2">Tidak ada kategori ditemukan.</p>
                                        ) : (
                                            filteredCategories.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => selectCategory(c.id)}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${categoryId === c.id
                                                        ? 'bg-[#E8F5E0] text-[#3D6B2C] font-medium'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tag */}
                        <div ref={tagRef} className="relative min-h-[74px] min-w-0">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Tag</label>

                            <button
                                type="button"
                                ref={tagButtonRef}
                                onClick={() => {
                                    const nextOpen = !tagOpen;
                                    setTagOpen(nextOpen);
                                    setCategoryOpen(false);
                                    if (nextOpen && tagButtonRef.current) {
                                        setTagMenuStyle(getMenuStyle(tagButtonRef.current));
                                    }
                                }}
                                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-100"
                            >
                                <span className="min-w-0 truncate">Pilih atau buat tag baru</span>
                                <ChevronDown size={16} className="text-gray-400 shrink-0" />
                            </button>

                            {(selectedExistingTags.length > 0 || newTagNames.length > 0) && (
                                <div className="-mb-8 mt-2 flex flex-wrap gap-1.5">
                                    {selectedExistingTags.map((t) => (
                                        <span
                                            key={t.id}
                                            className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                                        >
                                            #{t.name}
                                            <button
                                                type="button"
                                                onClick={() => removeExistingTag(t.id)}
                                                className="hover:text-[#E07A5F]"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    {newTagNames.map((name) => (
                                        <span
                                            key={name}
                                            className="flex items-center gap-1 rounded-full bg-[#E8F5E0] px-2.5 py-1 text-xs text-[#3D6B2C]"
                                        >
                                            #{name} <span className="text-[10px] opacity-70">(baru)</span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewTag(name)}
                                                className="hover:text-[#E07A5F]"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {tagOpen && (
                                <div
                                    className="fixed z-[300] max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl"
                                    style={tagMenuStyle}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 sticky top-0 bg-white border-b border-gray-50">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={tagSearch}
                                                onChange={(e) => setTagSearch(e.target.value)}
                                                placeholder="Cari atau ketik tag baru..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {filteredTags.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => toggleExistingTag(t.id)}
                                                className="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                            >
                                                #{t.name}
                                            </button>
                                        ))}
                                        {canCreateNewTag && (
                                            <button
                                                type="button"
                                                onClick={queueNewTag}
                                                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-lg text-[#76C457] hover:bg-[#E8F5E0] transition-colors font-medium"
                                            >
                                                <Plus size={14} />
                                                Buat tag baru: &quot;{tagQueryTrimmed}&quot;
                                            </button>
                                        )}
                                        {filteredTags.length === 0 && !canCreateNewTag && (
                                            <p className="text-xs text-gray-400 px-2 py-2">Ketik untuk mencari atau membuat tag.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Jumlah & Tanggal - side by side */}
                    <div className="grid min-w-0 grid-cols-2 gap-4">
                        {/* Jumlah */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Jumlah<span className="text-[#E07A5F]">*</span>
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

                        {/* Tanggal */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Tanggal<span className="text-[#E07A5F]">*</span>
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-[#E07A5F]">{error}</p>}
                </form>

                {/* Footer */}
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
                        form="transaction-form"
                        disabled={saving}
                        className="px-6 py-2.5 rounded-full bg-[#76C457] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : mode === 'add' ? 'Simpan Transaksi' : 'Update Transaksi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
