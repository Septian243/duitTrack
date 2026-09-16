function Skeleton({ className }: { className: string }) {
    return <div className={`skeleton-pulse rounded-lg bg-gray-200 ${className}`} />;
}

function DashboardLoadingState() {
    return (
        <div className="page-enter space-y-6" role="status" aria-label="Memuat dashboard">
            <div className="relative h-44 overflow-hidden rounded-3xl bg-[#DCEBDD] p-8">
                <Skeleton className="mb-4 h-7 w-72 bg-white/60" />
                <Skeleton className="h-4 w-96 max-w-full bg-white/50" />
                <Skeleton className="mt-2 h-4 w-80 max-w-full bg-white/50" />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="mt-2 h-3 w-56" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="rounded-2xl bg-white p-5 shadow-sm">
                        <Skeleton className="mb-4 h-11 w-11 rounded-xl" />
                        <Skeleton className="mb-2 h-3 w-28" />
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                    <div key={index} className="rounded-2xl bg-white p-6 shadow-sm">
                        <Skeleton className="mb-5 h-5 w-48" />
                        <Skeleton className="h-52 w-full rounded-xl bg-gray-100" />
                    </div>
                ))}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <Skeleton className="mb-5 h-5 w-52" />
                <Skeleton className="h-56 w-full rounded-xl bg-gray-100" />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <Skeleton className="mb-5 h-5 w-44" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div>
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="mt-2 h-3 w-28" />
                            </div>
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Panel({ className = 'h-56' }: { className?: string }) {
    return <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}><Skeleton className="mb-5 h-5 w-44" /><Skeleton className="h-[calc(100%-2rem)] w-full rounded-xl bg-gray-100" /></div>;
}

function CollectionLoadingState({ variant, compact = false }: { variant: 'budgets' | 'cashflow' | 'transactions' | 'settings' | 'categories' | 'tags'; compact?: boolean }) {
    const isCashflow = variant === 'cashflow';
    const isTransactions = variant === 'transactions';
    const isSettings = variant === 'settings';
    const isTags = variant === 'tags';
    const statCount = isCashflow ? 4 : isTransactions ? 3 : isSettings ? 2 : variant === 'budgets' ? 3 : 0;

    return (
        <div className="page-enter space-y-6" role="status" aria-label="Memuat halaman">
            {!compact && !isSettings && !isTags && <div className="flex items-center justify-between"><div><Skeleton className="h-6 w-48" /><Skeleton className="mt-2 h-3 w-56" /></div><Skeleton className="h-9 w-28 rounded-full" /></div>}
            {!compact && isTags && <div className="flex justify-end"><Skeleton className="h-10 w-28 rounded-full" /></div>}
            {statCount > 0 && <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${statCount === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>{Array.from({ length: statCount }, (_, index) => <div key={index} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><Skeleton className="h-11 w-11 rounded-xl" /><div><Skeleton className="mb-2 h-3 w-28" /><Skeleton className="h-6 w-32" /></div></div></div>)}</div>}
            {isTransactions && <Panel className="h-20" />}
            {isSettings ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Panel className="h-72" /><Panel className="h-72" /></div> : isTags ? <Panel className="h-48" /> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Panel /><Panel /></div>}
            {(isCashflow || isTransactions) && <Panel className="h-64" />}
        </div>
    );
}

export default function LoadingState({ variant = 'default', compact = false }: { variant?: 'default' | 'dashboard' | 'budgets' | 'cashflow' | 'transactions' | 'settings' | 'categories' | 'tags'; compact?: boolean }) {
    if (variant === 'dashboard') return <DashboardLoadingState />;
    if (variant !== 'default') return <CollectionLoadingState variant={variant} compact={compact} />;

    return (
        <div className="page-enter min-h-[calc(100vh-7rem)]" role="status" aria-label="Memuat data">
            <div className="mb-6 h-8 w-48 rounded-lg bg-gray-200 skeleton-pulse" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="mb-4 h-11 w-11 rounded-xl bg-gray-200 skeleton-pulse" />
                        <div className="mb-2 h-3 w-28 rounded bg-gray-200 skeleton-pulse" />
                        <div className="h-6 w-36 rounded bg-gray-200 skeleton-pulse" />
                    </div>
                ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                    <div key={index} className="h-64 rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-6 h-5 w-44 rounded bg-gray-200 skeleton-pulse" />
                        <div className="h-40 rounded-xl bg-gray-100 skeleton-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
