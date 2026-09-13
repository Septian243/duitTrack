'use client';

import { useEffect, useState } from 'react';

export default function AnimatedNumber({
    value,
    formatter,
    duration = 650,
}: {
    value: number;
    formatter: (value: number) => string;
    duration?: number;
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let frame = 0;
        const startedAt = performance.now();
        const startValue = displayValue;
        const delta = value - startValue;

        const animate = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(startValue + delta * eased);
            if (progress < 1) frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
        // The value is the animation trigger; displayValue is intentionally captured at start.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, duration]);

    return <>{formatter(displayValue)}</>;
}
