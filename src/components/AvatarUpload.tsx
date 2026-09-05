'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
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
    onUploaded?: (url: string) => void;
}) {
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

        // Tambahkan cache-buster supaya browser tidak menampilkan foto lama yang ter-cache
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
    }

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative w-24 h-24 rounded-2xl overflow-hidden group"
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

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-[#76C457] font-medium mt-2 hover:underline disabled:opacity-50"
            >
                {uploading ? 'Mengunggah...' : 'Ubah Foto Profile'}
            </button>

            {error && <p className="text-xs text-[#E07A5F] mt-1 text-center max-w-[200px]">{error}</p>}
        </div>
    );
}
