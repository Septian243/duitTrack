'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard,
    Receipt,
    Wallet,
    TrendingUp,
    Shapes,
    Tag,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { signOut } from '@/lib/supabase/actions';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transaksi', icon: Receipt },
    { href: '/budgets', label: 'Budget', icon: Wallet },
    { href: '/cashflow', label: 'Cash Flow', icon: TrendingUp },
    { href: '/settings/categories', label: 'Kategori', icon: Shapes },
    { href: '/settings/tags', label: 'Tag', icon: Tag },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
];

const navSections = [
    { label: 'UTAMA', items: navItems.slice(0, 1) },
    { label: 'KEUANGAN', items: [navItems[1], navItems[2], navItems[3]] },
    { label: 'KUSTOMISASI', items: [navItems[4], navItems[5]] },
    { label: 'AKUN', items: navItems.slice(6) },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isMinimized, setIsMinimized] = useState(false);
    const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

    return (
        <aside className={`${isMinimized ? 'w-20' : 'w-64'} relative z-50 h-screen shrink-0 overflow-visible bg-white border-r border-gray-100 flex flex-col transition-[width] duration-300`}>
            {/* Logo + wordmark */}
            <div className={`flex shrink-0 items-center border-b border-gray-100 px-4 py-5 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
                {isMinimized ? (
                    <button
                        type="button"
                        aria-label="Perbesar sidebar"
                        title="Perbesar sidebar"
                        onClick={() => setIsMinimized(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-[#76C457]"
                    >
                        <ChevronRight size={18} />
                    </button>
                ) : (
                    <Link
                        href="/"
                        aria-label="Kembali ke Dashboard"
                    className="flex items-center justify-start gap-2"
                    >
                        <Image
                            src="/logo.png"
                            alt="DuitTrack"
                            width={56}
                            height={56}
                            className="h-14 w-14 object-contain"
                            loading="eager"
                        />
                        <div className="text-left">
                            <p className="font-bold text-xl leading-none font-[family-name:var(--font-sora)]">
                                duit<span className="text-[#76C457]">Track</span>
                            </p>
                            <p className="mt-1 text-xs text-gray-400">Kelola Keuanganmu</p>
                        </div>
                    </Link>
                )}
                {!isMinimized && (
                    <button
                        type="button"
                        aria-label="Minimalkan sidebar"
                        onClick={() => setIsMinimized(true)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-[#76C457]"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className={`min-h-0 flex-1 overflow-y-auto py-5 ${isMinimized ? 'px-2' : 'px-4'} space-y-5`}>
                {navSections.map((section) => (
                    <div key={section.label || 'dashboard'} className="space-y-1">
                        {section.label && !isMinimized && (
                            <p className="px-4 pb-2 text-xs font-bold tracking-wide text-[#78AAA5]">
                                {section.label}
                            </p>
                        )}
                        {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.href}
                                    className="group relative"
                                    onMouseEnter={(event) => {
                                        if (!isMinimized) return;
                                        const bounds = event.currentTarget.getBoundingClientRect();
                                        setTooltip({ label: item.label, top: bounds.top + bounds.height / 2, left: bounds.right + 12 });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                >
                                    <Link
                                        href={item.href}
                                        className={`flex items-center rounded-xl text-base font-medium transition-colors
                  ${isMinimized ? 'justify-center px-3 py-3.5' : 'gap-4 px-4 py-3.5'}
                  ${isActive ? 'bg-[#76C457] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Icon size={isMinimized ? 21 : 22} />
                                        {!isMinimized && item.label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {tooltip && (
                <div
                    className="pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-lg"
                    style={{ top: tooltip.top, left: tooltip.left }}
                >
                    {tooltip.label}
                </div>
            )}

            {/* Logout */}
            <div className={`${isMinimized ? 'px-2' : 'px-5'} flex items-center gap-2 py-6 border-t border-gray-100`}>
                <form action={signOut} className="min-w-0 flex-1">
                    <button
                        type="submit"
                        title={isMinimized ? 'Keluar' : undefined}
                        className={`flex items-center rounded-xl text-base font-medium text-red-500 hover:bg-red-50 transition-colors w-full
              ${isMinimized ? 'justify-center px-2 py-3.5' : 'gap-4 px-5 py-3.5'}`}
                    >
                        <LogOut size={isMinimized ? 21 : 22} />
                        {!isMinimized && 'LogOut'}
                    </button>
                </form>
            </div>
        </aside>
    );
}
