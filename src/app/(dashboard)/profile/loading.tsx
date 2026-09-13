function Skeleton({ className }: { className: string }) {
    return <div className={`skeleton-pulse rounded-lg bg-gray-200 ${className}`} />;
}

export default function ProfileLoading() {
    return (
        <div className="page-enter space-y-6" role="status" aria-label="Memuat profile">
            <div className="flex items-start gap-6 rounded-2xl bg-white p-6 shadow-sm">
                <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                    <Skeleton className="h-7 w-44" />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Skeleton className="h-7 w-28 rounded-full" />
                        <Skeleton className="h-7 w-48 rounded-full" />
                    </div>
                    <Skeleton className="mt-3 h-4 w-80 max-w-full" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-6 flex gap-6 border-b border-gray-100 pb-3">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="mb-5 h-5 w-36" />
                    <Skeleton className="mb-2 h-3 w-24" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="mt-5 h-11 w-32 rounded-full" />
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-2xl" />
                    <Skeleton className="mx-auto h-5 w-40" />
                    <Skeleton className="mx-auto mt-2 h-4 w-56 max-w-full" />
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-9 w-full rounded-lg" />
                        <Skeleton className="h-9 w-full rounded-lg" />
                        <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}
