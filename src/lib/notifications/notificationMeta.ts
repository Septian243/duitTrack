import { Receipt, Wallet, Shapes, Tag, Link2, AlertTriangle } from 'lucide-react';
import type { NotificationType } from './createNotification';

export const notificationIcons: Record<NotificationType, typeof Receipt> = {
    transaction: Receipt,
    budget: Wallet,
    category: Shapes,
    tag: Tag,
    telegram_link: Link2,
    budget_alert: AlertTriangle,
};

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}