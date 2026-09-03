'use client';

import { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

type SummaryItem = { currency: string; income: number; expense: number; balance: number };
type CategoryItem = { name: string; value: number };
type TrendItem = { month: string; income: number; expense: number };

const COLORS = ['#21A366', '#E07A5F', '#3D84A8', '#F2CC8F', '#81B29A', '#9B5DE5', '#F15BB5'];

function formatMoney(n: number, currency: string) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(n);
}

export default function DashboardPage() {
    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
    const [trendData, setTrendData] = useState<TrendItem[]>([]);
    const [trendMonths, setTrendMonths] = useState(6);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        async function load() {
            setLoading(true);
            const [sumRes, catRes, trendRes] = await Promise.all([
                fetch('/api/summary'),
                fetch('/api/summary/by-category?type=expense'),
                fetch(`/api/summary/trend?months=${trendMonths}`),
            ]);
            const [sumData, catData, trendD] = await Promise.all([
                sumRes.json(),
                catRes.json(),
                trendRes.json(),
            ]);
            if (!ignore) {
                setSummary(sumData.summary);
                setCategoryData(catData);
                setTrendData(trendD);
                setLoading(false);
            }
        }

        load();

        return () => {
            ignore = true;
        };
    }, [trendMonths]);

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Ringkasan Bulan Ini</h1>

            {summary.length === 0 && <p>Belum ada transaksi bulan ini.</p>}

            {summary.map((s) => (
                <div key={s.currency} style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 16 }}>
                    <h3>{s.currency}</h3>
                    <p>Pemasukan: <strong style={{ color: 'green' }}>{formatMoney(s.income, s.currency)}</strong></p>
                    <p>Pengeluaran: <strong style={{ color: 'crimson' }}>{formatMoney(s.expense, s.currency)}</strong></p>
                    <p>Saldo: <strong>{formatMoney(s.balance, s.currency)}</strong></p>
                </div>
            ))}

            <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 32 }}>
                <h3>Pengeluaran per Kategori (bulan ini)</h3>
                {categoryData.length === 0 ? (
                    <p>Belum ada data.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => entry.name}
                            >
                                {categoryData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatMoney(Number(v), 'IDR')} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Tren Income vs Expense</h3>
                    <div>
                        {[3, 6, 12].map((m) => (
                            <button
                                key={m}
                                onClick={() => setTrendMonths(m)}
                                style={{
                                    marginLeft: 8,
                                    fontWeight: trendMonths === m ? 'bold' : 'normal',
                                }}
                            >
                                {m} bulan
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatMoney(Number(v), 'IDR')} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#21A366" name="Pemasukan" />
                        <Line type="monotone" dataKey="expense" stroke="#E07A5F" name="Pengeluaran" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}