'use client';

import { useEffect, useState } from 'react';
import LoadingState from '@/components/LoadingState';
import { Send, Bell, Target, CalendarDays, Unlink } from 'lucide-react';

type Profile = {
    daily_reminder_enabled: boolean;
    budget_alert_enabled: boolean;
    monthly_summary_enabled: boolean;
    telegram_chat_id: string | null;
    telegram_username: string | null;
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-[#76C457]' : 'bg-gray-200'
                }`}
            aria-pressed={checked}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );
}

export default function SettingsPage() {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [code, setCode] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [budgetAlertEnabled, setBudgetAlertEnabled] = useState(true);
    const [monthlySummaryEnabled, setMonthlySummaryEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    async function loadProfile() {
        const res = await fetch('/api/profile');
        const data: Profile = await res.json();
        setProfile(data);
        setReminderEnabled(data.daily_reminder_enabled ?? false);
        setBudgetAlertEnabled(data.budget_alert_enabled ?? true);
        setMonthlySummaryEnabled(data.monthly_summary_enabled ?? true);
    }

    useEffect(() => {
        async function init() {
            setProfileLoading(true);
            await loadProfile();
            setProfileLoading(false);
        }
        init();
    }, []);

    async function handleGenerateCode() {
        setGenerating(true);
        const res = await fetch('/api/telegram/link', { method: 'POST' });
        const data = await res.json();
        setCode(data.code);
        setGenerating(false);
    }

    async function handleDisconnect() {
        const confirmed = confirm(
            'Putuskan koneksi Telegram? Notifikasi otomatis (reminder, budget, ringkasan) tidak akan terkirim lagi sampai kamu hubungkan ulang.'
        );
        if (!confirmed) return;

        setDisconnecting(true);
        await fetch('/api/telegram/disconnect', { method: 'POST' });
        setCode(null);
        await loadProfile();
        setDisconnecting(false);
    }

    async function handleSaveNotifications(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSavedMessage(null);
        await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daily_reminder_enabled: reminderEnabled,
                budget_alert_enabled: budgetAlertEnabled,
                monthly_summary_enabled: monthlySummaryEnabled,
            }),
        });
        setSaving(false);
        setSavedMessage('Pengaturan notifikasi tersimpan.');
    }

    if (profileLoading || !profile) return <LoadingState />;

    const isConnected = !!profile.telegram_chat_id;
    const telegramBotUrl = 'https://t.me/' + botUsername;

    return (
        <div>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                        <Send size={16} className="text-[#76C457]" />
                    </div>
                    <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                        Hubungkan Telegram
                    </h3>
                </div>

                <div
                    className={
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium w-fit mb-4 ' +
                        (isConnected ? 'bg-[#E8F5E0] text-[#3D6B2C]' : 'bg-[#FCEAE5] text-[#B5543E]')
                    }
                >
                    <span
                        className={
                            'w-2 h-2 rounded-full ' + (isConnected ? 'bg-[#76C457]' : 'bg-[#E07A5F]')
                        }
                    />
                    {isConnected
                        ? 'Terhubung' + (profile.telegram_username ? ' sebagai @' + profile.telegram_username : '')
                        : 'Belum Terhubung'}
                </div>

                {isConnected && (
                    <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex items-center gap-2 border border-[#E07A5F] text-[#E07A5F] text-sm font-bold px-4 py-2.5 rounded-full hover:bg-[#FCEAE5] transition-colors disabled:opacity-50"
                    >
                        <Unlink size={16} />
                        {disconnecting ? 'Memutuskan...' : 'Putuskan Koneksi'}
                    </button>
                )}

                {!isConnected && !code && (
                    <button
                        type="button"
                        onClick={handleGenerateCode}
                        disabled={generating}
                        className="flex items-center gap-2 bg-[#76C457] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {generating ? 'Memproses...' : 'Generate Kode'}
                    </button>
                )}

                {!isConnected && code && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-2">
                            Kirim kode ini ke bot{' '}
                            {botUsername ? (
                                <a
                                    href={telegramBotUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#76C457] font-medium hover:underline"
                                >
                                    {'@' + botUsername}
                                </a>
                            ) : (
                                <span>Telegram</span>
                            )}
                            {' '}di Telegram:
                        </p>
                        <p className="font-mono text-lg font-bold text-[#1B2A22] bg-white border border-gray-200 rounded-lg px-3 py-2 inline-block">
                            {'/start ' + code}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">Kode berlaku 10 menit.</p>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center shrink-0">
                        <Bell size={16} className="text-[#76C457]" />
                    </div>
                    <h3 className="font-bold text-[#1B2A22] font-[family-name:var(--font-sora)]">
                        Notifikasi
                    </h3>
                </div>

                <form onSubmit={handleSaveNotifications} className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <CalendarDays size={14} className="text-gray-400" />
                                Reminder Harian
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Aktifkan reminder kalau belum ada transaksi tercatat hari itu (jam 20:00 WIB)
                            </p>
                        </div>
                        <ToggleSwitch checked={reminderEnabled} onChange={setReminderEnabled} />
                    </div>

                    <div className="border-t border-gray-50 pt-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Target size={14} className="text-gray-400" />
                                Peringatan Budget
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Peringatan saat budget terlampaui atau mendekati limit
                            </p>
                        </div>
                        <ToggleSwitch checked={budgetAlertEnabled} onChange={setBudgetAlertEnabled} />
                    </div>

                    <div className="border-t border-gray-50 pt-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Send size={14} className="text-gray-400" />
                                Ringkasan Bulanan
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Ringkasan bulanan otomatis (dikirim tiap awal bulan)
                            </p>
                        </div>
                        <ToggleSwitch checked={monthlySummaryEnabled} onChange={setMonthlySummaryEnabled} />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-[#76C457] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        {savedMessage && <p className="text-sm text-[#76C457]">{savedMessage}</p>}
                    </div>
                </form>
            </div>
        </div >
    );
}
