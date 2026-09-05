'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative w-full">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={`pr-11 ${className}`}
            />
            <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#76C457]"
            >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}
