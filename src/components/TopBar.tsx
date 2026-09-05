'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';
import { notificationIcons, formatRelativeTime } from '@/lib/notifications/notificationMeta';
import type { NotificationType } from '@/lib/notifications/createNotification';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Dashboard', subtitle: 'Ringkasan keuanganmu bulan ini' },
    '/transactions': { title: 'Transaksi', subtitle: 'Catat dan kelola pemasukan & pengeluaranmu' },
    '/budgets': { title: 'Budget', subtitle: 'Atur dan pantau batas pengeluaranmu' },
    '/cashflow': { title: 'Cash Flow', subtitle: 'Proyeksi pengeluaran sampai akhir bulan' },
    '/settings/categories': { title: 'Kategori', subtitle: 'Kelola kategori transaksi' },
    '/settings/tags': { title: 'Tag', subtitle: 'Kelola tag transaksi' },
    '/settings': { title: 'Pengaturan', subtitle: 'Kelola akun dan preferensimu' },
    '/profile': { title: 'Profile', subtitle: 'Kelola informasi akun dan keamananmu' },
};

type PageResult = { type: 'page'; label: string; href: string };
type TransactionResult = { type: 'transaction'; id: string; label: string; detail: string };
type FlatResult = PageResult | TransactionResult;

type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    source: 'web' | 'telegram' | 'system';
    is_read: boolean;
    created_at: string;
};

export default function TopBar({
    userName,
    userId,
    userAvatarUrl,
}: {
    userName: string | null;
    userId: string;
    userAvatarUrl: string | null;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const page = pageTitles[pathname] ?? { title: 'DuitTrack', subtitle: '' };
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    // Search state
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [flatResults, setFlatResults] = useState<FlatResult[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Notification state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Profile dropdown + modal state
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // --- Search logic ---
    useEffect(() => {
        if (!query.trim()) return;

        const timeout = setTimeout(async () => {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            const pages: PageResult[] = data.pages.map((p: { label: string; href: string }) => ({
                type: 'page',
                ...p,
            }));
            const transactions: TransactionResult[] = data.transactions.map(
                (t: { id: string; label: string; detail: string }) => ({ type: 'transaction', ...t })
            );

            setFlatResults([...pages, ...transactions]);
            setActiveIndex(-1);
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    // --- Klik di luar: tutup search, notif, dan profile dropdown ---
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                collapseSearch();
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifDropdown(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function toggleSearch() {
        if (isExpanded) {
            collapseSearch();
        } else {
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }

    function collapseSearch() {
        setIsExpanded(false);
        setQuery('');
        setFlatResults([]);
        setActiveIndex(-1);
    }

    function selectResult(result: FlatResult) {
        if (result.type === 'page') {
            router.push(result.href);
        } else {
            router.push('/transactions');
        }
        collapseSearch();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1 >= flatResults.length ? 0 : prev + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 < 0 ? flatResults.length - 1 : prev - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && flatResults[activeIndex]) {
                selectResult(flatResults[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            collapseSearch();
        }
    }

    const pageResults = flatResults.filter((r): r is PageResult => r.type === 'page');
    const transactionResults = flatResults.filter(
        (r): r is TransactionResult => r.type === 'transaction'
    );

    useEffect(() => {
        const supabase = createClient();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        async function loadInitialNotifications() {
            const res = await fetch('/api/notifications');
            if (!res.ok || cancelled) return;
            const data = await res.json();
            if (cancelled) return;
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        }

        async function setupRealtime() {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (cancelled) return;

            if (session) {
                supabase.realtime.setAuth(session.access_token);
            }

            channel = supabase
                .channel('notifications-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
                        setUnreadCount((prev) => prev + 1);
                    }
                )
                .subscribe();
        }

        void loadInitialNotifications();
        void setupRealtime();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [userId]);

    async function handleOpenNotifDropdown() {
        const next = !showNotifDropdown;
        setShowNotifDropdown(next);
        if (next && unreadCount > 0) {
            await fetch('/api/notifications/mark-read', { method: 'POST' });
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        }
    }

    return (
        <>
            <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold font-[family-name:var(--font-sora)] text-[#1B2A22]">
                        {page.title}
                    </h1>
                    {page.subtitle && <p className="text-sm text-gray-400 mt-0.5">{page.subtitle}</p>}
                </div>

                <div className="flex items-center gap-4">
                    {/* Search: ikon bulat -> expand jadi input */}
                    <div className="relative" ref={containerRef}>
                        <div
                            className={`flex items-center bg-gray-50 border border-gray-200 rounded-full transition-all duration-300 ease-in-out overflow-hidden
                ${isExpanded ? 'w-72 gap-2 px-4 py-2' : 'w-10 h-10 justify-center'}`}
                        >
                            <button
                                type="button"
                                onClick={toggleSearch}
                                className={`flex items-center justify-center shrink-0
                  ${isExpanded ? 'w-auto h-auto' : 'w-full h-full'}`}
                                aria-label={isExpanded ? 'Tutup pencarian' : 'Buka pencarian'}
                            >
                                <Search size={18} strokeWidth={2.25} className="text-gray-500" />
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Cari transaksi atau halaman..."
                                value={query}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setQuery(value);
                                    if (!value.trim()) {
                                        setFlatResults([]);
                                        setActiveIndex(-1);
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                className={`bg-transparent outline-none text-sm placeholder:text-gray-400 transition-all duration-300
                  ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}`}
                            />
                        </div>

                        {isExpanded && query.trim() && (
                            <div className="absolute top-full mt-2 w-80 right-0 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 max-h-96 overflow-y-auto">
                                {flatResults.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-gray-400">
                                        Tidak ada hasil untuk &quot;{query}&quot;
                                    </p>
                                )}

                                {pageResults.length > 0 && (
                                    <div className="mb-2">
                                        <p className="px-4 py-1 text-xs font-bold text-gray-400 uppercase">Halaman</p>
                                        {pageResults.map((p) => {
                                            const idx = flatResults.indexOf(p);
                                            return (
                                                <button
                                                    key={p.href}
                                                    onClick={() => selectResult(p)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors
                            ${activeIndex === idx ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {transactionResults.length > 0 && (
                                    <div>
                                        <p className="px-4 py-1 text-xs font-bold text-gray-400 uppercase">Transaksi</p>
                                        {transactionResults.map((t) => {
                                            const idx = flatResults.indexOf(t);
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => selectResult(t)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={`w-full text-left px-4 py-2 transition-colors
                            ${activeIndex === idx ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                                >
                                                    <p className="text-sm font-medium">{t.label}</p>
                                                    <p className="text-xs text-gray-400">{t.detail}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notifikasi */}
                    <div className="relative" ref={notifRef}>
                        <button
                            type="button"
                            onClick={handleOpenNotifDropdown}
                            className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                            aria-label="Notifikasi"
                        >
                            <Bell size={18} strokeWidth={2.25} className="text-gray-500" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-[#E07A5F] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifDropdown && (
                            <div className="absolute top-full mt-2 w-80 right-0 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 max-h-96 overflow-y-auto">
                                <p className="px-4 py-2 text-sm font-bold border-b border-gray-100">Notifikasi</p>

                                {notifications.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-gray-400 text-center">
                                        Belum ada notifikasi.
                                    </p>
                                )}

                                {notifications.map((n) => {
                                    const Icon = notificationIcons[n.type];
                                    return (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0
                        ${!n.is_read ? 'bg-green-50/40' : ''}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <Icon size={14} className="text-gray-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="break-words text-sm font-medium">{n.title}</p>
                                                <p className="break-words text-xs text-gray-500">{n.message}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    {formatRelativeTime(n.created_at)}
                                                    {n.source === 'telegram' && ' · via Telegram'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Profil dengan dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            type="button"
                            onClick={() => setShowProfileDropdown((prev) => !prev)}
                            className="flex flex-row-reverse items-center gap-3"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#76C457] font-bold text-white">
                                {userAvatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={userAvatarUrl} alt="Foto profile" className="h-full w-full object-cover" />
                                ) : initial}
                            </div>
                            <div className="hidden text-right sm:block">
                                <p className="text-sm font-bold leading-none">{userName ?? 'Pengguna'}</p>
                            </div>
                        </button>

                        {showProfileDropdown && (
                            <div className="absolute top-full mt-2 w-56 right-0 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50">
                                <Link
                                    href="/profile"
                                    onClick={() => setShowProfileDropdown(false)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <User size={16} className="text-gray-400" />
                                    Profil Saya
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
