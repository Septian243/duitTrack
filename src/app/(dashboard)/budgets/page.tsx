'use client';

import { useEffect, useRef, useState } from 'react';
import AnimatedNumber from '@/components/AnimatedNumber';
import MonthToolbar from '@/components/MonthToolbar';
import BudgetModal from '@/components/BudgetModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Wallet, TrendingDown, PiggyBank, Plus, Target, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

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

function getCurrentMonthStr() {
    return new Date().toISOString().slice(0, 7);
}

function statusColor(pct: number) {
    if (pct >= 100) return '#E07A5F';
    if (pct >= 70) return '#F2CC8F';
    return '#76C457';
}

export default function BudgetsPage() {
    const currentMonthStr = getCurrentMonthStr();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [staticLoading, setStaticLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const hasLoadedInitialDataRef = useRef(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const controller = new AbortController();

        async function loadStatic() {
            const res = await fetch('/api/categories', { signal: controller.signal });
            if (!res.ok) throw new Error('Gagal memuat kategori');
            const data = await res.json();
            setCategories(data.filter((c: Category) => c.type === 'expense'));
            setStaticLoading(false);
        }
        loadStatic().catch(() => {
            if (!controller.signal.aborted) {
                setError('Kategori gagal dimuat.');
                setStaticLoading(false);
            }
        });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        let ignore = false;
        const controller = new AbortController();

        async function loadBudgets() {
            if (hasLoadedInitialDataRef.current) setRefreshing(true);
            const res = await fetch(`/api/budgets?month=${selectedMonth}`, { signal: controller.signal });
            if (!res.ok) throw new Error('Gagal memuat budget');
            const data = await res.json();
            if (!ignore) {
                setBudgets(data);
                setHasLoadedInitialData(true);
                hasLoadedInitialDataRef.current = true;
                setRefreshing(false);
            }
        }

        loadBudgets().catch(() => {
            if (!ignore && !controller.signal.aborted) {
                setError('Budget gagal dimuat.');
                setRefreshing(false);
                setHasLoadedInitialData(true);
            }
        });

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [selectedMonth]);

    async function refreshBudgets() {
        const res = await fetch(`/api/budgets?month=${selectedMonth}`);
        const data = await res.json();
        setBudgets(data);
    }

    function handleAddClick() {
        setEditingBudget(null);
        setModalOpen(true);
    }

    function handleEditClick(b: Budget) {
        setEditingBudget(b);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingBudget(null);
    }

    async function handleSaved() {
        const wasEditing = Boolean(editingBudget);
        const budgetName = editingBudget?.categories?.name ?? 'Keseluruhan';
        closeModal();
        await refreshBudgets();
        showToast({
            type: 'success',
            title: 'Berhasil Disimpan',
            description: `Budget "${budgetName}" berhasil diatur${wasEditing ? ' kembali' : ''}.`,
        });
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        const budgetName = deleteTarget.category_id === null ? 'Keseluruhan' : deleteTarget.categories?.name ?? 'Tanpa nama';
        await fetch(`/api/budgets/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null);
        await refreshBudgets();
        showToast({ type: 'success', title: 'Berhasil Dihapus', description: `Budget "${budgetName}" berhasil dihapus.` });
    }

    const overallBudget = budgets.find((b) => b.category_id === null) ?? null;
    const categoryBudgets = budgets.filter((b) => b.category_id !== null);

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
    const totalRemaining = totalBudget - totalSpent;

    function renderBudgetRow(b: Budget) {
        const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
        const label = b.category_id === null ? 'Keseluruhan' : b.categories?.name ?? 'Tanpa nama';

        return (
            <div key={b.id} className="py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
                            <span className="text-sm font-bold" style={{ color: statusColor(pct) }}>
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                        <div className="bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                            <div
                                className="progress-fill h-full rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%`, background: statusColor(pct) }}
                            />
                        </div>
                        <p className="text-xs text-gray-400">
                            {formatMoney(b.spent)} / {formatMoney(b.amount)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleEditClick(b)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FDF3D9] text-[#D9A331] hover:opacity-80 transition-opacity"
                            aria-label="Edit"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={() => setDeleteTarget(b)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FCE4E4] text-[#E0574B] hover:opacity-80 transition-opacity"
                            aria-label="Hapus"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const dataLoading = staticLoading || !hasLoadedInitialData;

    return (
        <div className={`${refreshing ? 'data-refreshing ' : ''}page-enter relative`} aria-busy={refreshing}>
            <MonthToolbar
                selectedMonth={selectedMonth}
                onChange={setSelectedMonth}
                currentMonthStr={currentMonthStr}
                subtitle="Ringkasan budget bulan ini"
            />

            {error && <div className="mb-6 rounded-2xl border border-[#E07A5F]/30 bg-[#FCEAE5] px-4 py-3 text-sm text-[#A84D3A]" role="alert">{error}</div>}

            <>
                {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3D84A8]/10 rounded-full blur-xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#E7F1F6] flex items-center justify-center">
                                <Wallet size={20} className="text-[#3D84A8]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Total Budget
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                            {dataLoading ? <span className="inline-block h-7 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={totalBudget} formatter={formatMoney} />}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E07A5F]/10 rounded-full blur-xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#FCEAE5] flex items-center justify-center">
                                <TrendingDown size={20} className="text-[#E07A5F]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Total Terpakai
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                            {dataLoading ? <span className="inline-block h-7 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={totalSpent} formatter={formatMoney} />}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#76C457]/10 rounded-full blur-xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#E8F5E0] flex items-center justify-center">
                                <PiggyBank size={20} className="text-[#76C457]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Sisa Budget
                                </p>
                                <p
                                    className={`text-xl font-bold font-[family-name:var(--font-sora)] ${totalRemaining < 0 ? 'text-[#E07A5F]' : 'text-[#1B2A22]'
                                        }`}
                                >
                                    {dataLoading ? <span className="inline-block h-7 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={totalRemaining} formatter={formatMoney} />}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="flex items-center gap-2 bg-[#76C457] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                        <Plus size={16} />
                        Set Budget
                    </button>
                </div>

                {/* Budget Keseluruhan */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                            <Target size={16} className="text-[#76C457]" />
                        </div>
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Budget Keseluruhan
                        </h3>
                    </div>
                    {dataLoading ? (
                        <div className="skeleton-pulse mt-4 h-20 rounded-xl bg-gray-100" role="status" aria-label="Memuat budget keseluruhan" />
                    ) : overallBudget ? (
                        renderBudgetRow(overallBudget)
                    ) : (
                        <p className="text-sm text-gray-400 py-2">
                            Belum ada budget keseluruhan untuk bulan ini.{' '}
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="text-[#76C457] font-medium hover:underline"
                            >
                                Tambah sekarang →
                            </button>
                        </p>
                    )}
                </div>

                {/* Budget per Kategori */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                            <ListChecks size={16} className="text-[#76C457]" />
                        </div>
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Budget per Kategori
                        </h3>
                    </div>
                    {dataLoading ? (
                        <div className="skeleton-pulse mt-4 h-32 rounded-xl bg-gray-100" role="status" aria-label="Memuat budget kategori" />
                    ) : categoryBudgets.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">
                            Belum ada budget per kategori.{' '}
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="text-[#76C457] font-medium hover:underline"
                            >
                                Tambah budget kategori →
                            </button>
                        </p>
                    ) : (
                        <div>{categoryBudgets.map(renderBudgetRow)}</div>
                    )}
                </div>
            </>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Hapus Budget"
                itemType="budget"
                itemName={deleteTarget
                    ? `${deleteTarget.category_id === null ? 'Keseluruhan' : deleteTarget.categories?.name ?? 'Tanpa nama'} — ${formatMoney(deleteTarget.amount)}`
                    : ''}
                consequence="Riwayat pengeluaran kategori ini tidak terpengaruh, hanya batas budget-nya yang dihapus."
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />

            {modalOpen && (
                <BudgetModal
                    mode={editingBudget ? 'edit' : 'add'}
                    initialData={editingBudget ?? undefined}
                    categories={categories}
                    existingBudgets={budgets}
                    month={selectedMonth}
                    onClose={closeModal}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
