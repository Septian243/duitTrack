'use client';

import { useEffect, useState } from 'react';

type Projection = {
    currency: string;
    totalSoFar: number;
    avgPerDay: number;
    daysRemaining: number;
    projectedAdditional: number;
    projectedTotal: number;
};

function formatMoney(n: number, currency: string) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(n);
}

export default function CashflowPage() {
    const [projections, setProjections] = useState<Projection[]>([]);
    const [dayOfMonth, setDayOfMonth] = useState(0);
    const [totalDaysInMonth, setTotalDaysInMonth] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        async function load() {
            setLoading(true);
            const res = await fetch('/api/cashflow');
            const data = await res.json();
            if (!ignore) {
                setProjections(data.projections);
                setDayOfMonth(data.dayOfMonth);
                setTotalDaysInMonth(data.totalDaysInMonth);
                setLoading(false);
            }
        }

        load();

        return () => {
            ignore = true;
        };
    }, []);

    if (loading) return <p>Memuat...</p>;

    return (
        <div>
            <h1>Proyeksi Cash Flow</h1>
            <p style={{ color: '#666' }}>
                Hari ke-{dayOfMonth} dari {totalDaysInMonth} hari bulan ini. Proyeksi dihitung dari
                rata-rata pengeluaran harianmu sejauh ini.
            </p>

            {projections.length === 0 && <p>Belum ada data pengeluaran bulan ini.</p>}

            {projections.map((p) => (
                <div key={p.currency} style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 16 }}>
                    <h3>{p.currency}</h3>
                    <p>Pengeluaran sejauh ini: <strong>{formatMoney(p.totalSoFar, p.currency)}</strong></p>
                    <p>Rata-rata per hari: <strong>{formatMoney(p.avgPerDay, p.currency)}</strong></p>
                    <p>Sisa hari bulan ini: <strong>{p.daysRemaining} hari</strong></p>
                    <p>
                        Proyeksi total pengeluaran akhir bulan:{' '}
                        <strong style={{ fontSize: 18 }}>{formatMoney(p.projectedTotal, p.currency)}</strong>
                    </p>
                </div>
            ))}
        </div>
    );
}