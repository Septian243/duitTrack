'use client';

import { useEffect, useState } from 'react';
import LoadingState from '@/components/LoadingState';
import TagModal from '@/components/TagModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type Tag = {
    id: string;
    name: string;
    usage_count?: number;
    in_use?: boolean;
};

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
    const { showToast } = useToast();

    async function loadTags() {
        const res = await fetch('/api/tags');
        const data = await res.json();
        setTags(data);
    }

    useEffect(() => {
        async function init() {
            setLoading(true);
            await loadTags();
            setLoading(false);
        }
        init();
    }, []);

    async function handleSaved(savedName: string) {
        setModalOpen(false);
        await loadTags();
        showToast({ type: 'success', title: 'Berhasil Ditambahkan', description: `Tag "${savedName}" berhasil dibuat.` });
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        const tag = deleteTarget;
        const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            showToast({ type: 'error', title: 'Gagal Menghapus', description: data.error ?? 'Tag tidak dapat dihapus.' });
            return;
        }
        setDeleteTarget(null);
        await loadTags();
        showToast({ type: 'success', title: 'Berhasil Dihapus', description: `Tag "${tag.name}" berhasil dihapus.` });
    }

    if (loading) return <LoadingState variant="tags" />;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 bg-[#76C457] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                    Tambah Tag
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
                {tags.length === 0 ? (
                    <p className="text-sm text-gray-400">Belum ada tag. Tambah tag pertamamu.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                            const disabled = tag.in_use;
                            const title = disabled
                                ? 'Tidak bisa dihapus — tag ini masih dipakai di transaksi'
                                : 'Hapus tag';

                            return (
                                <span
                                    key={tag.id}
                                    className="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-700 pl-3 pr-2 py-1.5 rounded-full"
                                >
                                    #{tag.name}
                                    {typeof tag.usage_count === 'number' && tag.usage_count > 0 && (
                                        <span className="text-xs text-gray-400">({tag.usage_count})</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(tag)}
                                        disabled={disabled}
                                        title={title}
                                        className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-500 hover:bg-gray-200 hover:text-[#E07A5F]'
                                            }`}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {modalOpen && <TagModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Hapus Tag"
                itemType="tag"
                itemName={deleteTarget?.name ?? ''}
                consequence={deleteTarget?.usage_count
                    ? `Tag ini akan hilang dari ${deleteTarget.usage_count} transaksi yang memakainya.`
                    : 'Tag ini belum dipakai di transaksi manapun.'}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
