'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadingState from '@/components/LoadingState';
import MonthToolbar, { shiftMonth } from '@/components/MonthToolbar';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
    Wallet, TrendingDown, Target, ArrowUp, ArrowDown, Activity,
    PieChart as PieChartIcon, TrendingUp, Compass, Receipt, Bell, Flame, CalendarDays,
} from 'lucide-react';

type SummaryItem = { currency: string; income: number; expense: number; balance: number };
type CategoryItem = { name: string; value: number };
type TrendItem = { month: string; income: number; expense: number };
type BudgetItem = {
    id: string;
    category_id: string | null;
    amount: number;
    spent: number;
    categories: { name: string } | null;
};
type Transaction = {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    transaction_date: string;
    note: string | null;
    categories: { name: string } | null;
};
type CashflowProjection = {
    currency: string;
    totalSoFar: number;
    avgPerDay: number;
    projectedTotal: number;
};

const COLORS = ['#21A366', '#E07A5F', '#3D84A8', '#F2CC8F', '#81B29A', '#9B5DE5', '#F15BB5'];

function formatMoney(n: number, currency: string) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(n);
}

function getCurrentMonthStr() {
    return new Date().toISOString().slice(0, 7);
}

function daysInMonth(monthStr: string) {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
}

function CardHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-[#76C457]" />
            </div>
            <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">{title}</h3>
        </div>
    );
}

function budgetStatusColor(pct: number) {
    if (pct >= 100) return '#E07A5F';
    if (pct >= 80) return '#F2CC8F';
    return '#76C457';
}

function calcTrend(current: number, previous: number | undefined) {
    if (previous === undefined || previous === 0) {
        return { label: 'Belum ada data bulan lalu', isUp: null as boolean | null };
    }
    const diff = current - previous;
    const pct = (diff / Math.abs(previous)) * 100;
    return { label: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% dari bulan lalu`, isUp: diff > 0 };
}

export default function DashboardPage() {
    const currentMonthStr = getCurrentMonthStr();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
    const isCurrentMonth = selectedMonth === currentMonthStr;
    const prevMonthStr = shiftMonth(selectedMonth, -1);

    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [prevSummary, setPrevSummary] = useState<SummaryItem[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
    const [trendData, setTrendData] = useState<TrendItem[]>([]);
    const [trendMonths, setTrendMonths] = useState(6);
    const [username, setUsername] = useState<string | null>(null);
    const [budgets, setBudgets] = useState<BudgetItem[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [cashflow, setCashflow] = useState<CashflowProjection | null>(null);
    const [streak, setStreak] = useState<{ hasTransactionToday: boolean; streakDays: number } | null>(
        null
    );
    const [loading, setLoading] = useState(true);

    // Fetch data yang tergantung bulan terpilih di toolbar
    useEffect(() => {
        let ignore = false;

        async function load() {
            setLoading(true);
            const [sumRes, prevSumRes, catRes, profileRes, budgetsRes, transactionsRes, cashflowRes, streakRes] =
                await Promise.all([
                    fetch(`/api/summary?month=${selectedMonth}`),
                    fetch(`/api/summary?month=${prevMonthStr}`),
                    fetch(`/api/summary/by-category?type=expense&month=${selectedMonth}`),
                    fetch('/api/profile'),
                    fetch(`/api/budgets?month=${selectedMonth}`),
                    fetch(`/api/transactions?month=${selectedMonth}&limit=10`),
                    fetch('/api/cashflow'),
                    fetch('/api/streak'),
                ]);
            const [sumData, prevSumData, catData, profileData, budgetsData, transactionsData, cashflowData, streakData] =
                await Promise.all([
                    sumRes.json(), prevSumRes.json(), catRes.json(), profileRes.json(),
                    budgetsRes.json(), transactionsRes.json(), cashflowRes.json(), streakRes.json(),
                ]);
            if (!ignore) {
                setSummary(sumData.summary);
                setPrevSummary(prevSumData.summary);
                setCategoryData(catData);
                setUsername(profileData.username ?? null);
                setBudgets(budgetsData);
                setRecentTransactions(transactionsData.data);
                setCashflow(cashflowData.projections?.[0] ?? null);
                setStreak(streakData);
                setLoading(false);
            }
        }

        load();

        return () => {
            ignore = true;
        };
    }, [selectedMonth, prevMonthStr]);

    // Fetch tren - independen dari toolbar bulan, selalu anchor ke bulan berjalan asli
    useEffect(() => {
        let ignore = false;

        async function loadTrend() {
            const res = await fetch(`/api/summary/trend?months=${trendMonths}`);
            const data = await res.json();
            if (!ignore) setTrendData(data);
        }

        loadTrend();

        return () => {
            ignore = true;
        };
    }, [trendMonths]);

    if (loading) return <LoadingState />;

    const mainSummary = summary[0] ?? { currency: 'IDR', income: 0, expense: 0, balance: 0 };
    const prevMainSummary = prevSummary.find((s) => s.currency === mainSummary.currency);
    const monthHasTransactions = summary.length > 0;

    const balanceTrend = calcTrend(mainSummary.balance, prevMainSummary?.balance);
    const expenseTrend = calcTrend(mainSummary.expense, prevMainSummary?.expense);

    const avgPerDay = isCurrentMonth
        ? cashflow?.avgPerDay ?? 0
        : mainSummary.expense / daysInMonth(selectedMonth);
    const avgPerDayPrev = prevMainSummary
        ? prevMainSummary.expense / daysInMonth(prevMonthStr)
        : undefined;
    const avgTrend = calcTrend(avgPerDay, avgPerDayPrev);

    // Proyeksi (bulan berjalan) vs Saldo Akhir aktual (bulan yang sudah lewat)
    const projectedBalance =
        isCurrentMonth && cashflow ? mainSummary.income - cashflow.projectedTotal : mainSummary.balance;

    const totalExpenseForPct = categoryData.reduce((sum, c) => sum + c.value, 0);

    const overallBudget = budgets.find((b) => b.category_id === null);
    const categoryBudgetsSorted = budgets
        .filter((b) => b.category_id !== null)
        .map((b) => ({ ...b, pct: (b.spent / b.amount) * 100 }))
        .sort((a, b) => b.pct - a.pct);
    const combinedBudgets = overallBudget
        ? [{ ...overallBudget, pct: (overallBudget.spent / overallBudget.amount) * 100 }, ...categoryBudgetsSorted]
        : categoryBudgetsSorted;
    const cappedBudgets = combinedBudgets.slice(0, 5);
    const hasMoreBudgets = combinedBudgets.length > 5;

    const showReminder = streak && (!streak.hasTransactionToday || streak.streakDays >= 2);

    return (
        <div>
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-[#0F3D2E] via-[#1B4D3A] to-[#3A7A5C] rounded-3xl mb-8 relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{ backgroundImage: 'url(/hero-pattern.svg)', backgroundSize: '80px 80px' }}
                />
                <Image
                    src="/Hero-Banner-Card.png"
                    alt=""
                    width={800}
                    height={500}
                    loading="eager"
                    className="absolute inset-y-0 right-0 h-full w-auto max-w-[50%] object-contain object-right pointer-events-none select-none opacity-90 z-10"
                />
                <div className="relative z-20 p-8 max-w-xl">
                    <h1 className="text-3xl font-[family-name:var(--font-sora)] mb-2">
                        <span className="font-normal text-white/90">Selamat Datang, </span>
                        <span className="font-extrabold text-white">{username ?? 'Pengguna'}!</span>
                    </h1>
                    <p className="text-white/80 text-sm">
                        Pantau pemasukan, pengeluaran, dan kesehatan keuanganmu secara real-time — semua
                        tercatat rapi di satu tempat, baik dari web maupun Telegram.
                    </p>
                </div>
            </div>

            {/* Reminder/Nudge - kondisional, di luar urutan tetap */}
            {showReminder && (
                <div
                    className={`rounded-2xl p-4 mb-6 flex items-center gap-3 ${!streak!.hasTransactionToday ? 'bg-[#FCF1DE]' : 'bg-[#E8F5E0]'
                        }`}
                >
                    {!streak!.hasTransactionToday ? (
                        <>
                            <Bell size={18} className="text-[#E0A85C] shrink-0" />
                            <p className="text-sm text-[#8A6A2F] font-medium">
                                Belum ada transaksi tercatat hari ini. Yuk catat pemasukan/pengeluaranmu.
                            </p>
                        </>
                    ) : (
                        <>
                            <Flame size={18} className="text-[#76C457] shrink-0" />
                            <p className="text-sm text-[#3D6B2C] font-medium">
                                Kamu sudah mencatat {streak!.streakDays} hari berturut-turut 🔥
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Toolbar Bulan */}
            <MonthToolbar
                selectedMonth={selectedMonth}
                onChange={setSelectedMonth}
                currentMonthStr={currentMonthStr}
            />

            {!monthHasTransactions ? (
                <div className="bg-white rounded-2xl shadow-sm p-10 mb-8 text-center">
                    <CalendarDays size={28} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                        Belum ada transaksi di bulan ini.
                    </p>
                </div>
            ) : (
                <>
                    {/* Baris 1: 4 stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* 1. Saldo Bulan Ini */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#76C457]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#E8F5E0] flex items-center justify-center mb-3">
                                    <Wallet size={20} className="text-[#76C457]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Saldo Bulan Ini
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {formatMoney(mainSummary.balance, mainSummary.currency)}
                                </p>
                                {balanceTrend.isUp !== null ? (
                                    <p
                                        className={`text-xs font-medium flex items-center gap-1 mt-1 ${balanceTrend.isUp ? 'text-[#76C457]' : 'text-[#E07A5F]'
                                            }`}
                                    >
                                        {balanceTrend.isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                        {balanceTrend.label}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">{balanceTrend.label}</p>
                                )}
                            </div>
                        </div>

                        {/* 2. Total Pengeluaran */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#F2CC8F]/20 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#FCF1DE] flex items-center justify-center mb-3">
                                    <TrendingDown size={20} className="text-[#E0A85C]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Total Pengeluaran
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {formatMoney(mainSummary.expense, mainSummary.currency)}
                                </p>
                                {expenseTrend.isUp !== null ? (
                                    <p
                                        className={`text-xs font-medium flex items-center gap-1 mt-1 ${expenseTrend.isUp ? 'text-[#E07A5F]' : 'text-[#76C457]'
                                            }`}
                                    >
                                        {expenseTrend.isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                        {expenseTrend.label}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">{expenseTrend.label}</p>
                                )}
                            </div>
                        </div>

                        {/* 3. Rata-rata Pengeluaran Harian */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3D84A8]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#E7F1F6] flex items-center justify-center mb-3">
                                    <Activity size={20} className="text-[#3D84A8]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Rata-rata Pengeluaran/Hari
                                </p>
                                <p className="text-xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                                    {formatMoney(avgPerDay, mainSummary.currency)}
                                </p>
                                {avgTrend.isUp !== null ? (
                                    <p
                                        className={`text-xs font-medium flex items-center gap-1 mt-1 ${avgTrend.isUp ? 'text-[#E07A5F]' : 'text-[#76C457]'
                                            }`}
                                    >
                                        {avgTrend.isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                        {avgTrend.label}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">{avgTrend.label}</p>
                                )}
                            </div>
                        </div>

                        {/* 4. Proyeksi Akhir Bulan / Saldo Akhir Bulan */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#9B5DE5]/10 rounded-full blur-xl" />
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-[#F1EBFA] flex items-center justify-center mb-3">
                                    <Compass size={20} className="text-[#9B5DE5]" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    {isCurrentMonth ? 'Proyeksi Saldo Akhir Bulan' : 'Saldo Akhir Bulan'}
                                </p>
                                <p
                                    className={`text-xl font-bold font-[family-name:var(--font-sora)] ${projectedBalance >= 0 ? 'text-[#1B2A22]' : 'text-[#E07A5F]'
                                        }`}
                                >
                                    {formatMoney(projectedBalance, mainSummary.currency)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {isCurrentMonth
                                        ? `Berdasarkan pola ${new Date().getDate()} hari terakhir`
                                        : 'Bulan ini sudah selesai'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Baris 2: Pengeluaran per Kategori (60%) + Status Budget (40%) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mb-6">
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <CardHeader icon={PieChartIcon} title="Pengeluaran per Kategori" />
                            {categoryData.length === 0 ? (
                                <p className="text-sm text-gray-400">Belum ada data pengeluaran bulan ini.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}>
                                                {categoryData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;

                                                    const item = payload[0];
                                                    const value = Number(item.value);
                                                    const pct = totalExpenseForPct > 0
                                                        ? (value / totalExpenseForPct) * 100
                                                        : 0;

                                                    return (
                                                        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                                            <p className="text-sm font-medium text-[#1B2A22]">
                                                                {String(item.name ?? '')}
                                                            </p>
                                                            <p className="text-sm text-[#009B63]">
                                                                {formatMoney(value, 'IDR')} ({pct.toFixed(0)}%)
                                                            </p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2">
                                        {categoryData.map((c, i) => (
                                            <div key={c.name} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ background: COLORS[i % COLORS.length] }}
                                                    />
                                                    <span className="text-gray-600 truncate">
                                                        {i + 1}. {c.name}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-[#1B2A22] shrink-0 ml-2">
                                                    {formatMoney(c.value, 'IDR')} (
                                                    {totalExpenseForPct > 0 ? ((c.value / totalExpenseForPct) * 100).toFixed(0) : 0}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <CardHeader icon={Target} title="Status Budget" />
                            {combinedBudgets.length === 0 ? (
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Belum ada budget diset bulan ini.</p>
                                    <Link href="/budgets" className="text-sm text-[#76C457] font-medium hover:underline">
                                        Set budget →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cappedBudgets.map((b) => (
                                        <div key={b.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700">
                                                    {b.category_id === null ? 'Keseluruhan' : b.categories?.name}
                                                </span>
                                                <span className="text-gray-500">{b.pct.toFixed(0)}%</span>
                                            </div>
                                            <div className="bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${Math.min(b.pct, 100)}%`, background: budgetStatusColor(b.pct) }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {formatMoney(b.spent, 'IDR')} / {formatMoney(b.amount, 'IDR')}
                                            </p>
                                        </div>
                                    ))}
                                    {hasMoreBudgets && (
                                        <Link href="/budgets" className="inline-block text-sm text-[#76C457] font-medium hover:underline">
                                            Lihat semua budget →
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Baris 3: Tren Income vs Expense - full width, independen dari toolbar bulan */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                            <TrendingUp size={16} className="text-[#76C457]" />
                        </div>
                        <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                            Tren Income vs Expense
                        </h3>
                    </div>
                    <div className="flex gap-1">
                        {[3, 6, 12].map((m) => (
                            <button
                                key={m}
                                onClick={() => setTrendMonths(m)}
                                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${trendMonths === m ? 'bg-[#76C457] text-white font-medium' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {m} bulan
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatMoney(Number(v), 'IDR')} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#76C457" name="Pemasukan" strokeWidth={2} />
                        <Line type="monotone" dataKey="expense" stroke="#E07A5F" name="Pengeluaran" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Baris 4: Transaksi Terbaru - full width */}
            {monthHasTransactions && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <CardHeader icon={Receipt} title="Transaksi Terbaru" />
                    {recentTransactions.length === 0 ? (
                        <p className="text-sm text-gray-400">Belum ada transaksi.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="font-medium text-gray-700">{tx.note || 'Tanpa catatan'}</p>
                                        <p className="text-xs text-gray-400">
                                            {tx.transaction_date} {`· ${tx.categories?.name ?? 'Tanpa kategori'}`}
                                        </p>
                                    </div>
                                    <span className={`font-medium ${tx.type === 'income' ? 'text-[#76C457]' : 'text-[#E07A5F]'}`}>
                                        {tx.type === 'income' ? '+' : '-'}
                                        {formatMoney(tx.amount, 'IDR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/transactions" className="inline-block text-sm text-[#76C457] font-medium mt-4 hover:underline">
                        Lihat semua transaksi →
                    </Link>
                </div>
            )}
        </div>
    );
}
