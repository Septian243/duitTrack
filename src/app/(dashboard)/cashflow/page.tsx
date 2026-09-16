'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MonthToolbar from '@/components/MonthToolbar';
import AnimatedNumber from '@/components/AnimatedNumber';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    TrendingDown, Activity, CalendarClock, Compass, AlertTriangle, CheckCircle2, ListChecks,
} from 'lucide-react';

type Projection = {
    currency: string;
    totalSoFar: number;
    avgPerDay: number;
    daysRemaining: number;
    projectedAdditional: number;
    projectedTotal: number;
};

type DailyPoint = { day: number; actual: number | null; projected: number | null };

type CategoryBreakdown = {
    category_id: string | null;
    name: string;
    spent: number;
    projectedTotal: number;
};

type CashflowData = {
    month: string;
    isCurrentMonth: boolean;
    dayOfMonth: number;
    totalDaysInMonth: number;
    daysRemaining: number;
    projections: Projection[];
    dailySeries: DailyPoint[];
    categoryBreakdown: CategoryBreakdown[];
};

type Budget = {
    id: string;
    category_id: string | null;
    amount: number;
    spent: number;
    categories: { name: string } | null;
};

function formatMoney(n: number, currency = 'IDR') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(n);
}

function getCurrentMonthStr() {
    return new Date().toISOString().slice(0, 7);
}

export default function CashflowPage() {
    const currentMonthStr = getCurrentMonthStr();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    const [data, setData] = useState<CashflowData | null>(null);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;
        const controller = new AbortController();

        async function load() {
            const isInitialLoad = !hasLoadedRef.current;
            setLoading(isInitialLoad);
            setError(null);
            const [cfRes, budRes] = await Promise.all([
                fetch(`/api/cashflow?month=${selectedMonth}`, { signal: controller.signal }),
                fetch(`/api/budgets?month=${selectedMonth}`, { signal: controller.signal }),
            ]);
            if (!cfRes.ok || !budRes.ok) throw new Error('Gagal memuat cashflow');
            const [cfData, budData] = await Promise.all([cfRes.json(), budRes.json()]);
            if (!ignore) {
                setData(cfData);
                setBudgets(budData);
                setLoading(false);
                hasLoadedRef.current = true;
            }
        }

        load().catch(() => {
            if (!ignore && !controller.signal.aborted) {
                setError('Cashflow gagal dimuat. Silakan coba lagi.');
                setLoading(false);
            }
        });

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [selectedMonth]);

    const viewData: CashflowData = data ?? {
        month: selectedMonth,
        isCurrentMonth: selectedMonth === currentMonthStr,
        dayOfMonth: 0,
        totalDaysInMonth: 0,
        daysRemaining: 0,
        projections: [],
        dailySeries: [],
        categoryBreakdown: [],
    };
    const main = viewData.projections[0] ?? {
        currency: 'IDR',
        totalSoFar: 0,
        avgPerDay: 0,
        daysRemaining: viewData.daysRemaining,
        projectedAdditional: 0,
        projectedTotal: 0,
    };

    const dayProgressPct = viewData.totalDaysInMonth > 0 ? (viewData.dayOfMonth / viewData.totalDaysInMonth) * 100 : 0;

    const overallBudget = budgets.find((b) => b.category_id === null) ?? null;
    const overallBudgetPct = overallBudget ? (main.projectedTotal / overallBudget.amount) * 100 : null;
    const overBudgetAmount = overallBudget ? main.projectedTotal - overallBudget.amount : 0;

    const categoryBudgetMap = new Map(
        budgets.filter((b) => b.category_id !== null).map((b) => [b.category_id as string, b])
    );

    return (
        <div className="page-enter">
            <MonthToolbar
                selectedMonth={selectedMonth}
                onChange={setSelectedMonth}
                currentMonthStr={currentMonthStr}
                subtitle="Berdasarkan pola pengeluaran harianmu"
            />
            {error && <div className="mb-6 rounded-2xl border border-[#E07A5F]/30 bg-[#FCEAE5] px-4 py-3 text-sm text-[#A84D3A]" role="alert">{error}</div>}

            <>
                    {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E07A5F]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#FCEAE5] flex items-center justify-center mb-3">
                                    <TrendingDown size={20} className="text-[#E07A5F]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Pengeluaran Sejauh Ini
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {loading ? <span className="inline-block h-6 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={main.totalSoFar} formatter={(value) => formatMoney(value, main.currency)} />}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3D84A8]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#E7F1F6] flex items-center justify-center mb-3">
                                    <Activity size={20} className="text-[#3D84A8]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Rata-rata / Hari
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {loading ? <span className="inline-block h-6 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={main.avgPerDay} formatter={(value) => formatMoney(value, main.currency)} />}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#F2CC8F]/20 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#FCF1DE] flex items-center justify-center mb-3">
                                    <CalendarClock size={20} className="text-[#E0A85C]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Sisa Hari
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {loading ? <span className="inline-block h-6 w-20 rounded bg-gray-200 skeleton-pulse" /> : `${viewData.daysRemaining} hari`}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#9B5DE5]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#F1EBFA] flex items-center justify-center mb-3">
                                    <Compass size={20} className="text-[#9B5DE5]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    {viewData.isCurrentMonth ? 'Proyeksi Total Pengeluaran' : 'Total Akhir Bulan'}
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {loading ? <span className="inline-block h-6 w-36 rounded bg-gray-200 skeleton-pulse" /> : <AnimatedNumber value={main.projectedTotal} formatter={(value) => formatMoney(value, main.currency)} />}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar hari berjalan */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                                Posisi Hari Ini
                            </h3>
                            <span className="text-sm text-gray-500">
                                Hari ke-{viewData.dayOfMonth} dari {viewData.totalDaysInMonth} hari
                            </span>
                        </div>
                        <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#76C457] transition-all"
                                style={{ width: `${Math.min(dayProgressPct, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {dayProgressPct.toFixed(0)}% dari bulan ini sudah berjalan
                        </p>
                    </div>

                    {/* Line chart aktual vs proyeksi */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)] mb-5">
                            Pengeluaran Kumulatif: Aktual vs Proyeksi
                        </h3>
                        {loading ? <div className="h-[300px] rounded-xl bg-gray-100 skeleton-pulse" /> : viewData.dailySeries.length === 0 ? (
                            <div className="flex h-[300px] items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">
                                Belum ada data pengeluaran untuk ditampilkan.
                            </div>
                        ) : <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={viewData.dailySeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="day" tick={{ fontSize: 12 }} label={{ value: 'Hari', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v) => formatMoney(Number(v), main.currency)} labelFormatter={(d) => `Hari ke-${d}`} />
                                <Legend />
                                {overallBudget && (
                                    <Line
                                        type="monotone"
                                        dataKey={() => overallBudget.amount}
                                        stroke="#E07A5F"
                                        strokeDasharray="2 2"
                                        strokeWidth={1.5}
                                        dot={false}
                                        name="Limit Budget"
                                    />
                                )}
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#76C457"
                                    strokeWidth={2.5}
                                    dot={false}
                                    connectNulls={false}
                                    name="Aktual"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="projected"
                                    stroke="#9B5DE5"
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                    dot={false}
                                    connectNulls
                                    name="Proyeksi"
                                />
                            </LineChart>
                        </ResponsiveContainer>}
                    </div>

                    {/* Perbandingan dengan budget */}
                    {overallBudget ? (
                        <div
                            className={`rounded-2xl p-5 mb-6 flex items-start gap-3 ${overBudgetAmount > 0 ? 'bg-[#FCEAE5]' : 'bg-[#E8F5E0]'
                                }`}
                        >
                            {overBudgetAmount > 0 ? (
                                <AlertTriangle size={20} className="text-[#E07A5F] shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle2 size={20} className="text-[#76C457] shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className={`text-sm font-bold ${overBudgetAmount > 0 ? 'text-[#B5543E]' : 'text-[#3D6B2C]'}`}>
                                    {overBudgetAmount > 0
                                        ? `Proyeksi ini akan melebihi budget kamu sebesar ${formatMoney(overBudgetAmount, main.currency)}`
                                        : 'Proyeksi masih di bawah budget kamu'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Proyeksi vs Budget: {formatMoney(main.projectedTotal, main.currency)} /{' '}
                                    {formatMoney(overallBudget.amount, main.currency)}
                                    {overallBudgetPct !== null && ` (${overallBudgetPct.toFixed(0)}%)`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center justify-between">
                            <p className="text-sm text-gray-400">Belum ada budget keseluruhan untuk dibandingkan.</p>
                            <Link href="/budgets" className="text-sm text-[#76C457] font-medium hover:underline shrink-0 ml-4">
                                Set budget →
                            </Link>
                        </div>
                    )}

                    {/* Breakdown per kategori */}
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                                <ListChecks size={16} className="text-[#76C457]" />
                            </div>
                            <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                                Proyeksi per Kategori
                            </h3>
                        </div>
                        {loading ? (
                            <div className="h-40 rounded-xl bg-gray-100 skeleton-pulse" />
                        ) : viewData.categoryBreakdown.length === 0 ? (
                            <p className="text-sm text-gray-400">Belum ada pengeluaran per kategori bulan ini.</p>
                        ) : (
                            <div className="space-y-4">
                                {viewData.categoryBreakdown.map((c) => {
                                    const catBudget = c.category_id ? categoryBudgetMap.get(c.category_id) : undefined;
                                    const pct = catBudget ? (c.projectedTotal / catBudget.amount) * 100 : null;
                                    const willOverBudget = pct !== null && pct >= 100;

                                    return (
                                        <div key={c.category_id ?? 'none'} className="flex items-center justify-between text-sm">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-700 truncate">{c.name}</span>
                                                    {willOverBudget && (
                                                        <span className="text-[10px] font-bold text-[#E07A5F] bg-[#FCEAE5] px-2 py-0.5 rounded-full shrink-0">
                                                            Bisa over
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Sejauh ini: {formatMoney(c.spent, main.currency)}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="font-bold text-[#1B2A22]">
                                                    {formatMoney(c.projectedTotal, main.currency)}
                                                </p>
                                                {catBudget && (
                                                    <p className="text-xs text-gray-400">
                                                        dari budget {formatMoney(catBudget.amount, main.currency)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
            </>
        </div>
    );
}
