'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    itemType: string;
    itemName: string;
    consequence: string;
    question?: ReactNode;
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
            className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[#17221d]/55 px-4 py-6 backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onCancel();
            }}
        >
            <section
                className="modal-enter w-full max-w-[624px] overflow-hidden rounded-xl bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <header className="flex items-center justify-between border-b border-[#E7EBEF] bg-[#F8FAFC] px-8 py-5">
                    <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-[#F0444D]" aria-hidden="true" />
                        <h2 id="confirm-dialog-title" className="text-xl font-bold text-[#182237]">
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        aria-label="Tutup dialog"
                        className="rounded-lg p-1 text-[#7B8087] transition-colors hover:bg-gray-200 hover:text-[#3C4148] disabled:opacity-50"
                    >
                        <X size={30} strokeWidth={1.8} />
                    </button>
                </header>

                <div className="px-8 pb-8 pt-8 text-center">
                    <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#F0444D] text-[#F0444D]">
                        <X size={36} strokeWidth={2.2} aria-hidden="true" />
                    </div>
                    {question ? (
                        <p className="text-xl leading-8 text-[#3C4148]">{question}</p>
                    ) : (
                        <p className="text-xl leading-8 text-[#3C4148]">
                            Yakin ingin {title.includes('Hapus') ? 'menghapus' : 'melanjutkan'} {itemType}:{' '}
                            <strong className="font-bold text-[#303640]">{itemName}</strong>
                        </p>
                    )}
                    <p id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-[#94A8C5]">
                        {consequence}
                    </p>
                </div>

                <footer className="flex justify-center gap-5 bg-[#F8FAFC] px-8 py-6">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="min-w-[94px] rounded-xl border border-[#DDE4EE] bg-white px-5 py-3 text-base font-bold text-[#53627A] transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className={`min-w-[128px] rounded-xl px-5 py-3 text-base font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${confirmClassName}`}
                    >
                        {submitting ? 'Memproses...' : confirmLabel}
                    </button>
                </footer>
            </section>
        </div>
    ), document.body);
}
