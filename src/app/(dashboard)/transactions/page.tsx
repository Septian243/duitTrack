'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingState from '@/components/LoadingState';
import TransactionModal from '@/components/TransactionModal';
import {
    Receipt, ArrowDownCircle, ArrowUpCircle, Plus, Download,
    Search, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown,
} from 'lucide-react';

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
type Stats = { totalCount: number; incomeCount: number; expenseCount: number };
type DatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'all' | 'custom';
type SortMode = 'none' | 'amount_asc' | 'amount_desc';

function isNoneSort(value: SortMode) {
    return value === 'none';
}

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

function formatDateHeader(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function computePresetRange(preset: DatePreset): { from: string | null; to: string | null } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'this_month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    if (preset === 'last_month') {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    if (preset === 'last_3_months') {
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        return { from: start.toISOString().slice(0, 10), to: todayStr };
    }
    return { from: null, to: null };
}

const presetLabels: Record<DatePreset, string> = {
    this_month: 'Bulan Ini',
    last_month: 'Bulan Lalu',
    last_3_months: '3 Bulan Terakhir',
    all: 'Semua Waktu',
    custom: 'Kustom',
};

export default function TransactionsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [staticLoading, setStaticLoading] = useState(true);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [type, setType] = useState<'' | 'income' | 'expense'>('');
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [appliedRange, setAppliedRange] = useState<{ from: string | null; to: string | null }>(
        computePresetRange('this_month')
    );
    const [sort, setSort] = useState<SortMode>('none');
    const amountSortIndicator = sort === 'amount_desc' ? '↓' : sort === 'amount_asc' ? '↑' : '';

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [exportOpen, setExportOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);
    const [dateRangeOpen, setDateRangeOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const typeRef = useRef<HTMLDivElement>(null);
    const dateRangeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setExportOpen(false);
            }
            if (dateRangeRef.current && !dateRangeRef.current.contains(e.target as Node)) {
                setDateRangeOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setCategoryOpen(false);
            }
            if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
                setTypeOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        async function loadStatic() {
            const [catRes, statsRes, tagRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/transactions/stats'),
                fetch('/api/tags'),
            ]);
            setCategories(await catRes.json());
            setStats(await statsRes.json());
            setTags(await tagRes.json());
            setStaticLoading(false);
        }
        loadStatic();
    }, []);

    useEffect(() => {
        let ignore = false;

        async function loadTransactions() {
            setLoading(true);
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (categoryId) params.set('category_id', categoryId);
            if (type) params.set('type', type);
            if (appliedRange.from) params.set('date_from', appliedRange.from);
            if (appliedRange.to) params.set('date_to', appliedRange.to);
            if (sort !== 'none') params.set('sort', sort);
            params.set('page', String(page));
            params.set('page_size', String(pageSize));

            const res = await fetch(`/api/transactions?${params.toString()}`);
            const data = await res.json();
            if (!ignore) {
                setTransactions(data.data);
                setTotal(data.total);
                setLoading(false);
                setHasLoadedInitialData(true);
            }
        }

        loadTransactions();

        return () => {
            ignore = true;
        };
    }, [debouncedSearch, categoryId, type, appliedRange, sort, page, pageSize]);

    async function handleDelete(id: string) {
        if (!confirm('Hapus transaksi ini?')) return;
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (categoryId) params.set('category_id', categoryId);
        if (type) params.set('type', type);
        if (appliedRange.from) params.set('date_from', appliedRange.from);
        if (appliedRange.to) params.set('date_to', appliedRange.to);
        if (sort !== 'none') params.set('sort', sort);
        params.set('page', String(page));
        params.set('page_size', String(pageSize));
        const [res, statsRes] = await Promise.all([
            fetch(`/api/transactions?${params.toString()}`),
            fetch('/api/transactions/stats'),
        ]);
        const data = await res.json();
        setTransactions(data.data);
        setTotal(data.total);
        setStats(await statsRes.json());
    }

    function handleAddClick() {
        setEditingTransaction(null);
        setModalOpen(true);
    }

    function handleEditClick(tx: Transaction) {
        setEditingTransaction(tx);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingTransaction(null);
    }

    async function refreshAfterSave() {
        closeModal();
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (categoryId) params.set('category_id', categoryId);
        if (type) params.set('type', type);
        if (appliedRange.from) params.set('date_from', appliedRange.from);
        if (appliedRange.to) params.set('date_to', appliedRange.to);
        if (sort !== 'none') params.set('sort', sort);
        params.set('page', String(page));
        params.set('page_size', String(pageSize));
        const [res, statsRes] = await Promise.all([
            fetch(`/api/transactions?${params.toString()}`),
            fetch('/api/transactions/stats'),
        ]);
        const data = await res.json();
        setTransactions(data.data);
        setTotal(data.total);
        setStats(await statsRes.json());
    }

    function handleTagCreated(newTag: Tag) {
        setTags((prev) => [...prev, newTag]);
    }

    function handlePresetChange(preset: DatePreset) {
        setDatePreset(preset);
        setPage(1);
        if (preset !== 'custom') {
            setAppliedRange(computePresetRange(preset));
            setDateRangeOpen(false);
        }
    }

    function applyCustomRange() {
        if (!customFrom || !customTo) return;
        setAppliedRange({ from: customFrom, to: customTo });
        setPage(1);
        setDateRangeOpen(false);
    }

    function toggleAmountSort() {
        setSort((prev) =>
            prev === 'none' ? 'amount_desc' : prev === 'amount_desc' ? 'amount_asc' : 'none'
        );
    }

    const dateRangeLabel =
        datePreset === 'custom' && appliedRange.from && appliedRange.to
            ? `${appliedRange.from} - ${appliedRange.to}`
            : presetLabels[datePreset];

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    const groupedByDate: [string, Transaction[]][] = [];
    if (sort === 'none') {
        const map = new Map<string, Transaction[]>();
        for (const tx of transactions) {
            if (!map.has(tx.transaction_date)) map.set(tx.transaction_date, []);
            map.get(tx.transaction_date)!.push(tx);
        }
        groupedByDate.push(...Array.from(map.entries()));
    }

    function pageNumbers() {
        const nums: number[] = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, start + 4);
        for (let i = start; i <= end; i++) nums.push(i);
        return nums;
    }

    const incomeCategories = categories.filter((category) => category.type === 'income');
    const expenseCategories = categories.filter((category) => category.type === 'expense');

    function renderCategoryOption(category: Category) {
        return (
            <button
                key={category.id}
                type="button"
                onClick={() => {
                    setCategoryId(category.id);
                    setPage(1);
                    setCategoryOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${categoryId === category.id ? 'bg-[#E8F5E0] font-medium text-[#3D6B2C]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                {category.name}
            </button>
        );
    }

    if (!hasLoadedInitialData || staticLoading) return <LoadingState />;

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3D84A8]/10 rounded-full blur-xl" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-[#E7F1F6] flex items-center justify-center">
                            <Receipt size={20} className="text-[#3D84A8]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                Total Transaksi Bulan Ini
                            </p>
                            <p className="text-2xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                {stats?.totalCount ?? '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#76C457]/10 rounded-full blur-xl" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-[#E8F5E0] flex items-center justify-center">
                            <ArrowUpCircle size={20} className="text-[#76C457]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                Transaksi Masuk
                            </p>
                            <p className="text-2xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                {stats?.incomeCount ?? '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E07A5F]/10 rounded-full blur-xl" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-[#FCEAE5] flex items-center justify-center">
                            <ArrowDownCircle size={20} className="text-[#E07A5F]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                Transaksi Keluar
                            </p>
                            <p className="text-2xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                {stats?.expenseCount ?? '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="flex items-center gap-2 bg-[#76C457] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                        <Plus size={16} />
                        Tambah Transaksi
                    </button>

                    <div className="relative" ref={exportRef}>
                        <button
                            type="button"
                            onClick={() => setExportOpen((prev) => !prev)}
                            className="flex items-center gap-2 bg-gray-50 text-gray-500 text-sm font-medium px-4 py-2.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            <Download size={16} />
                            Export
                        </button>
                        {exportOpen && (
                            <div className="absolute top-full mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50">
                                <a href="/api/export?format=csv" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    CSV
                                </a>
                                <a href="/api/export?format=xlsx" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Excel
                                </a>
                                <a href="/api/export?format=pdf" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    PDF
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari catatan atau kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#76C457] transition-colors"
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative" ref={categoryRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setCategoryOpen((prev) => !prev);
                            setTypeOpen(false);
                            setDateRangeOpen(false);
                        }}
                        className="flex min-w-52 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:border-[#76C457]"
                    >
                        <span className="truncate">
                            {categoryId
                                ? categories.find((category) => category.id === categoryId)?.name ?? 'Semua Kategori'
                                : 'Semua Kategori'}
                        </span>
                        <ChevronDown size={16} className="shrink-0 text-gray-500" />
                    </button>
                    {categoryOpen && (
                        <div className="absolute top-full z-50 mt-2 max-h-72 w-full min-w-64 overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                            <button
                                type="button"
                                onClick={() => {
                                    setCategoryId('');
                                    setPage(1);
                                    setCategoryOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${!categoryId ? 'bg-[#E8F5E0] font-medium text-[#3D6B2C]' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Semua Kategori
                            </button>
                            {incomeCategories.length > 0 && (
                                <div className="mt-2 border-t border-gray-100 pt-2">
                                    <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-[#78AAA5]">
                                        Pemasukan
                                    </p>
                                    {incomeCategories.map(renderCategoryOption)}
                                </div>
                            )}
                            {expenseCategories.length > 0 && (
                                <div className="mt-2 border-t border-gray-100 pt-2">
                                    <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-[#78AAA5]">
                                        Pengeluaran
                                    </p>
                                    {expenseCategories.map(renderCategoryOption)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative" ref={typeRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setTypeOpen((prev) => !prev);
                            setCategoryOpen(false);
                            setDateRangeOpen(false);
                        }}
                        className="flex min-w-40 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:border-[#76C457]"
                    >
                        <span>{type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Semua Jenis'}</span>
                        <ChevronDown size={16} className="shrink-0 text-gray-500" />
                    </button>
                    {typeOpen && (
                        <div className="absolute top-full z-50 mt-2 w-full min-w-40 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                            {[
                                { value: '', label: 'Semua Jenis' },
                                { value: 'income', label: 'Pemasukan' },
                                { value: 'expense', label: 'Pengeluaran' },
                            ].map((option) => (
                                <button
                                    key={option.value || 'all'}
                                    type="button"
                                    onClick={() => {
                                        setType(option.value as '' | 'income' | 'expense');
                                        setPage(1);
                                        setTypeOpen(false);
                                    }}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${type === option.value ? 'bg-[#E8F5E0] font-medium text-[#3D6B2C]' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative" ref={dateRangeRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setDateRangeOpen((prev) => !prev);
                            setCategoryOpen(false);
                            setTypeOpen(false);
                        }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
                    >
                        {dateRangeLabel} ▾
                    </button>

                    {dateRangeOpen && (
                        <div className="absolute top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-50">
                            {(['this_month', 'last_month', 'last_3_months', 'all', 'custom'] as DatePreset[]).map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handlePresetChange(preset)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${datePreset === preset ? 'bg-[#E8F5E0] text-[#3D6B2C] font-medium' : 'hover:bg-gray-50 text-gray-600'
                                        }`}
                                >
                                    {presetLabels[preset]}
                                </button>
                            ))}

                            {datePreset === 'custom' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                                    <input
                                        type="date"
                                        value={customFrom}
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                                    />
                                    <input
                                        type="date"
                                        value={customTo}
                                        onChange={(e) => setCustomTo(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyCustomRange}
                                        className="w-full bg-[#76C457] text-white text-sm font-medium py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        Terapkan
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabel + Pagination digabung jadi satu card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10">
                        <LoadingState />
                    </div>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">Tidak ada transaksi ditemukan.</p>
                ) : isNoneSort(sort) ? (
                    <div>
                        {groupedByDate.map(([date, txs]) => (
                            <div key={date}>
                                <div className="bg-[#F8F6F1] px-6 py-2.5 text-sm font-bold text-gray-500">
                                    {'📅 '}
                                    {formatDateHeader(date)}
                                </div>
                                <table className="w-full text-[15px] table-fixed">
                                    <colgroup>
                                        <col className="w-auto" />
                                        <col className="w-65" />
                                        <col className="w-45" />
                                        <col className="w-45" />
                                        <col className="w-50" />
                                        <col className="w-28" />
                                    </colgroup>
                                    <thead>
                                        <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 border-b-2 border-gray-200">
                                            <th className="px-6 py-2.5 font-bold">Catatan</th>
                                            <th className="px-3 py-2.5 font-bold border-l border-gray-200">Kategori</th>
                                            <th className="px-3 py-2.5 font-bold border-l border-gray-200">Jenis</th>
                                            <th className="px-3 py-2.5 font-bold border-l border-gray-200">Tag</th>
                                            <th
                                                className="px-3 py-2.5 font-bold border-l border-gray-200 text-right cursor-pointer"
                                                onClick={toggleAmountSort}
                                            >
                                                {'Jumlah '}
                                                {amountSortIndicator}
                                            </th>
                                            <th className="px-3 py-2.5 font-bold border-l border-gray-200 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txs.map((tx) => (
                                            <tr key={tx.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                                <td className="px-6 py-3 truncate">{tx.note || '-'}</td>
                                                <td className="px-3 py-3 border-l border-gray-100 text-gray-600 truncate">{tx.categories?.name ?? '-'}</td>
                                                <td className="px-3 py-3 border-l border-gray-100">
                                                    <span
                                                        className={`text-xs font-medium px-2 py-1 rounded-full ${tx.type === 'income' ? 'bg-[#E8F5E0] text-[#3D6B2C]' : 'bg-[#FCEAE5] text-[#B5543E]'
                                                            }`}
                                                    >
                                                        {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 border-l border-gray-100">
                                                    {tx.transaction_tags.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {tx.transaction_tags.map((tt) => (
                                                                <span key={tt.tags.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {'#'}
                                                                    {tt.tags.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td
                                                    className={`px-3 py-3 border-l border-gray-100 text-right font-medium ${tx.type === 'income' ? 'text-[#76C457]' : 'text-[#E07A5F]'
                                                        }`}
                                                >
                                                    {tx.type === 'income' ? '+' : '-'}
                                                    {formatRupiah(tx.amount)}
                                                </td>
                                                <td className="px-3 py-3 border-l border-gray-100">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(tx)}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FDF3D9] text-[#D9A331] hover:opacity-80 transition-opacity"
                                                            aria-label="Edit"
                                                        >
                                                            <Pencil size={17} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(tx.id)}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FCE4E4] text-[#E0574B] hover:opacity-80 transition-opacity"
                                                            aria-label="Hapus"
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-[15px] table-fixed">
                        <colgroup>
                            <col className="w-35" />
                            <col className="w-auto" />
                            <col className="w-50" />
                            <col className="w-40" />
                            <col className="w-40" />
                            <col className="w-50" />
                            <col className="w-28" />
                        </colgroup>
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 border-b-2 border-gray-200">
                                <th className="px-6 py-3 font-bold">Tanggal</th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200">Catatan</th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200">Kategori</th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200">Jenis</th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200">Tag</th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200 text-right cursor-pointer" onClick={toggleAmountSort}>
                                    {'Jumlah '}
                                    {sort === 'amount_desc' ? '↓' : '↑'}
                                </th>
                                <th className="px-3 py-3 font-bold border-l border-gray-200 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                    <td className="px-6 py-3 text-gray-500">{tx.transaction_date}</td>
                                    <td className="px-3 py-3 border-l border-gray-100 truncate">{tx.note || '-'}</td>
                                    <td className="px-3 py-3 border-l border-gray-100 text-gray-600 truncate">{tx.categories?.name ?? '-'}</td>
                                    <td className="px-3 py-3 border-l border-gray-100">
                                        <span
                                            className={`text-xs font-medium px-2 py-1 rounded-full ${tx.type === 'income' ? 'bg-[#E8F5E0] text-[#3D6B2C]' : 'bg-[#FCEAE5] text-[#B5543E]'
                                                }`}
                                        >
                                            {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 border-l border-gray-100">
                                        {tx.transaction_tags.length > 0
                                            ? tx.transaction_tags.map((tt) => `#${tt.tags.name}`).join(' ')
                                            : '-'}
                                    </td>
                                    <td
                                        className={`px-3 py-3 border-l border-gray-100 text-right font-medium ${tx.type === 'income' ? 'text-[#76C457]' : 'text-[#E07A5F]'
                                            }`}
                                    >
                                        {tx.type === 'income' ? '+' : '-'}
                                        {formatRupiah(tx.amount)}
                                    </td>
                                    <td className="px-3 py-3 border-l border-gray-100">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(tx)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FDF3D9] text-[#D9A331] hover:opacity-80 transition-opacity"
                                                aria-label="Edit"
                                            >
                                                <Pencil size={17} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FCE4E4] text-[#E0574B] hover:opacity-80 transition-opacity"
                                                aria-label="Hapus"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && transactions.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {pageNumbers().map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setPage(num)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${page === num ? 'bg-[#76C457] text-white' : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {modalOpen && (
                <TransactionModal
                    mode={editingTransaction ? 'edit' : 'add'}
                    initialData={editingTransaction ?? undefined}
                    categories={categories}
                    tags={tags}
                    onClose={closeModal}
                    onSaved={refreshAfterSave}
                    onTagCreated={handleTagCreated}
                />
            )}
        </div>
    );
}