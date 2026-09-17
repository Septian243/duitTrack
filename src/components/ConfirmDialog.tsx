'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Sparkles, Trash2, Unplug } from 'lucide-react';

type ConfirmDialogIcon = 'delete' | 'disconnect' | 'logout';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    itemType: string;
    itemName: string;
    consequence: string;
    question?: ReactNode;
    icon?: ConfirmDialogIcon;
    confirmLabel?: string;
    confirmClassName?: string;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
};

export default function ConfirmDialog({
    open,
    title,
    itemType,
    itemName,
    consequence,
    question,
    icon = 'delete',
    confirmLabel = 'Ya, Hapus',
    confirmClassName = 'bg-[#F0444D] hover:bg-[#DB3740] shadow-[0_8px_18px_rgba(240,68,77,0.22)]',
    onCancel,
    onConfirm,
}: ConfirmDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        cancelRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !submitting) onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel, submitting]);

    if (!open) return null;

    const ConfirmationIcon = icon === 'logout' ? LogOut : icon === 'disconnect' ? Unplug : Trash2;

    async function handleConfirm() {
        setSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setSubmitting(false);
        }
    }

    return typeof document === 'undefined' ? null : createPortal((
        <div
            className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onCancel();
            }}
        >
            <section
                className="modal-enter w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-[0_16px_45px_rgba(31,41,55,0.16)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <div className="relative px-8 pb-7 pt-9 text-center">
                    <div className="relative mx-auto mb-5 flex h-[86px] w-[104px] items-center justify-center text-[#f0444d]">
                        <Sparkles className="absolute left-0 top-2 h-3 w-3" strokeWidth={3} aria-hidden="true" />
                        <Sparkles className="absolute right-1 top-0 h-3 w-3" strokeWidth={3} aria-hidden="true" />
                        <Sparkles className="absolute bottom-3 right-0 h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        <ConfirmationIcon className="relative h-14 w-14" strokeWidth={3.2} aria-hidden="true" />
                        <span className="absolute bottom-0 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-[#f0444d]/10" aria-hidden="true" />
                    </div>
                    {question ? (
                        <p className="text-base leading-6 text-[#303640]">{question}</p>
                    ) : (
                        <p className="text-base leading-6 text-[#303640]">
                            Yakin ingin {title.includes('Hapus') ? 'menghapus' : 'melanjutkan'} {itemType}{' '}
                            <strong className="font-bold">{itemName}</strong>?
                        </p>
                    )}
                    <p id="confirm-dialog-description" className="mx-auto mt-2 max-w-[300px] text-xs leading-4 text-[#9a9a9a]">
                        {consequence}
                    </p>
                </div>

                <footer className="flex gap-3 px-4 pb-4">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="min-w-0 flex-1 rounded-lg border border-[#f0444d] bg-white px-4 py-3 text-sm font-semibold text-[#f0444d] transition-colors hover:bg-[#fff4f4] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className={`min-w-0 flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${confirmClassName}`}
                    >
                        {submitting ? 'Memproses...' : confirmLabel}
                    </button>
                </footer>
            </section>
        </div>
    ), document.body);
}
