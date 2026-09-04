type PasswordStrengthProps = {
    password: string;
};

export function getPasswordChecks(password: string) {
    return {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    if (!password) return null;

    const checks = getPasswordChecks(password);
    const score = Object.values(checks).filter(Boolean).length;
    const strength = score <= 1 ? 'Lemah' : score <= 3 ? 'Sedang' : 'Kuat';
    const strengthColor = score <= 1 ? 'text-[#E07A5F]' : score <= 3 ? 'text-[#C58B27]' : 'text-[#4F9D69]';

    return (
        <div className="w-full text-left text-xs mt-1" aria-live="polite">
            <p className={`font-bold text-sm ${strengthColor}`}>Kekuatan password: {strength}</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-500">
                <li className={checks.length ? 'text-[#4F9D69]' : ''}>{checks.length ? '✓' : '○'} Minimal 6 karakter</li>
                <li className={checks.uppercase ? 'text-[#4F9D69]' : ''}>{checks.uppercase ? '✓' : '○'} Huruf kapital</li>
                <li className={checks.number ? 'text-[#4F9D69]' : ''}>{checks.number ? '✓' : '○'} Angka</li>
                <li className={checks.symbol ? 'text-[#4F9D69]' : ''}>{checks.symbol ? '✓' : '○'} Simbol</li>
            </ul>
        </div>
    );
}
