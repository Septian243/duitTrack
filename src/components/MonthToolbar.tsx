'use client';

import { useRef } from 'react';
import { Calendar } from 'lucide-react';

export function shiftMonth(monthStr: string, delta: number) {
    const d = new Date(`${monthStr}-01`);
    d.setMonth(d.getMonth() + delta);
    return d.toISOString().slice(0, 7);
}

export function monthLabel(monthStr: string) {
    const d = new Date(`${monthStr}-01`);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function monthShortLabel(monthStr: string) {
    const d = new Date(`${monthStr}-01`);
    return d.toLocaleDateString('id-ID', { month: 'short' });
}

export function currentDateLabel() {
    return new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function MonthToolbar({
    selectedMonth,
    onChange,
    currentMonthStr,
    subtitle,
}: {
    selectedMonth: string;
    onChange: (month: string) => void;
    currentMonthStr: string;
    subtitle?: string;
}) {
    const monthInputRef = useRef<HTMLInputElement>(null);
    const monthChips = [shiftMonth(currentMonthStr, -2), shiftMonth(currentMonthStr, -1), currentMonthStr];

    function handleMonthInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.value) onChange(e.target.value);
    }

    function openMonthPicker() {
        const input = monthInputRef.current;
        if (!input) return;

        const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void };
        if (typeof inputWithPicker.showPicker === 'function') {
            inputWithPicker.showPicker();
        } else {
            inputWithPicker.click();
        }
    }

    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-xl font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                    {monthLabel(selectedMonth)}
                </h2>
                <p className="mt-0.5 text-sm text-gray-400">{subtitle ?? currentDateLabel()}</p>
            </div>
            <div className="flex items-center gap-2">
                {monthChips.map((m) => (
                    <button
                        key={m}
                        onClick={() => onChange(m)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${selectedMonth === m
                            ? 'bg-[#76C457] text-white font-medium'
                            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {monthShortLabel(m)}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={openMonthPicker}
                    className="relative w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    aria-label="Pilih bulan lain"
                >
                    <Calendar size={14} className="text-gray-500" />
                    <input
                        ref={monthInputRef}
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthInputChange}
                        max={currentMonthStr}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </button>
            </div>
        </div>
    );
}