'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUpload({
    userId,
    initialAvatarUrl,
    fallbackInitial,
    onUploaded,
}: {
    userId: string;
    initialAvatarUrl: string | null;
    fallbackInitial: string;
    onUploaded?: (url: string | null) => void;
}) {
    const supabase = createClient();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    function getStoragePath(url: string) {
        try {
            const pathname = new URL(url).pathname;
            const marker = '/storage/v1/object/public/avatars/';
            const markerIndex = pathname.indexOf(marker);
            return markerIndex >= 0 ? decodeURIComponent(pathname.slice(markerIndex + marker.length)) : null;
        } catch {
            return null;
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Format harus JPG, PNG, atau WebP.');
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`);
            return;
        }

        setUploading(true);

        const ext = file.name.split('.').pop();
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) {
            setError('Gagal mengunggah foto. Coba lagi.');
            setUploading(false);
            return;
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path);

        const finalUrl = `${publicUrl}?t=${Date.now()}`;

        const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: finalUrl }),
        });

        if (!res.ok) {
            setError('Foto terunggah, tapi gagal menyimpan ke profil.');
            setUploading(false);
            return;
        }

        setAvatarUrl(finalUrl);
        onUploaded?.(finalUrl);
        setUploading(false);
        setShowModal(false);
        router.refresh();
    }

    async function handleRemoveAvatar() {
        if (!avatarUrl || uploading) return;

        setError(null);
        setUploading(true);

        const storagePath = getStoragePath(avatarUrl);
        if (storagePath) {
            await supabase.storage.from('avatars').remove([storagePath]);
        }

        const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: null }),
        });

        if (!res.ok) {
            setError('Gagal menghapus foto profile. Coba lagi.');
            setUploading(false);
            return;
        }

        setAvatarUrl(null);
        onUploaded?.(null);
        setUploading(false);
        setShowModal(false);
        router.refresh();
    }

    function openFilePicker() {
        setError(null);
        fileInputRef.current?.click();
    }

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={uploading}
                className="relative h-24 w-24 overflow-hidden rounded-full group"
                aria-label="Ganti foto profile"
            >
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Foto profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-[#76C457] text-white flex items-center justify-center text-3xl font-bold">
                        {fallbackInitial}
                    </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? (
                        <Loader2 size={20} className="text-white animate-spin" />
                    ) : (
                        <Camera size={20} className="text-white" />
                    )}
                </div>
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
            />

            {error && <p className="text-xs text-[#E07A5F] mt-1 text-center max-w-[200px]">{error}</p>}

            {showModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="profile-photo-title"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}
                >
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Tutup"
                        >
                            <X size={18} />
                        </button>

                        <h2 id="profile-photo-title" className="text-center text-lg font-bold text-[#1B2A22]">
                            Foto Profile
                        </h2>

                        <div className="mx-auto mt-5 h-40 w-40 overflow-hidden rounded-full">
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="Foto profile" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#76C457] text-5xl font-bold text-white">
                                    {fallbackInitial}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={openFilePicker}
                                disabled={uploading}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#76C457] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <Camera size={16} />
                                {avatarUrl ? 'Edit Foto' : 'Tambahkan Foto'}
                            </button>

                            {avatarUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    disabled={uploading}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E07A5F] px-4 py-2.5 text-sm font-medium text-[#E07A5F] transition-colors hover:bg-[#E07A5F]/10 disabled:opacity-50"
                                >
                                    <Trash2 size={16} />
                                    {uploading ? 'Menghapus...' : 'Hapus Foto'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
