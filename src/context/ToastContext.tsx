'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; type: ToastType; title: string; description: string };
type ToastInput = Omit<Toast, 'id'>;

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

const styles: Record<ToastType, { border: string; iconBg: string; icon: string; progress: string }> = {
    success: { border: 'border-l-[#00B87C]', iconBg: 'bg-[#E5F8F1]', icon: 'text-[#00A873]', progress: 'bg-[#00B87C]' },
    error: { border: 'border-l-[#F0444D]', iconBg: 'bg-[#FDEBEC]', icon: 'text-[#F0444D]', progress: 'bg-[#F0444D]' },
    warning: { border: 'border-l-[#E2A72E]', iconBg: 'bg-[#FFF6DE]', icon: 'text-[#D29109]', progress: 'bg-[#E2A72E]' },
    info: { border: 'border-l-[#4387D8]', iconBg: 'bg-[#EAF3FF]', icon: 'text-[#4387D8]', progress: 'bg-[#4387D8]' },
};

function ToastIcon({ type }: { type: ToastType }) {
    if (type === 'success') return <Check size={20} strokeWidth={3} />;
    if (type === 'error') return <X size={20} strokeWidth={3} />;
    if (type === 'warning') return <TriangleAlert size={19} strokeWidth={2.5} />;
    return <Info size={20} strokeWidth={2.5} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((toast: ToastInput) => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current.slice(-2), { ...toast, id }]);
        window.setTimeout(() => dismissToast(id), 4000);
    }, [dismissToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex w-[min(375px,calc(100vw-2rem))] flex-col gap-3">
                {toasts.map((toast) => {
                    const style = styles[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className={`toast-enter pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-gray-100 border-l-[5px] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(31,49,43,0.14)] ${style.border}`}
                            role="status"
                        >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.icon}`}>
                                <ToastIcon type={toast.type} />
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                                <p className="text-sm font-bold text-[#182237]">{toast.title}</p>
                                <p className="mt-1 text-sm leading-5 text-[#718096]">{toast.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => dismissToast(toast.id)}
                                aria-label="Tutup notifikasi"
                                className="shrink-0 p-1 text-[#94A3B8] transition-colors hover:text-[#475569]"
                            >
                                <X size={17} />
                            </button>
                            <span className={`toast-progress absolute bottom-0 left-0 h-1 ${style.progress}`} aria-hidden="true" />
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider');
    return context;
}
