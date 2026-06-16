import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const TAG_COLORS = ['#f43f5e','#ec4899','#a855f7','#8b5cf6','#6366f1','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#84cc16','#eab308','#f59e0b','#f97316','#ef4444'];

export function pickTagColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for insecure contexts or older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getRelativeTime(timestamp, t) {
    if (!timestamp) return '';

    // Netscape format is often just seconds
    let date = new Date(parseInt(timestamp) * 1000);
    if (date.getFullYear() < 1971) {
        date = new Date(parseInt(timestamp));
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (!t) return '...'; // Fallback if t not provided

    if (diffInSeconds < 60) return t('common.relativeTime.justNow');
    if (diffInSeconds < 3600) return t('common.relativeTime.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('common.relativeTime.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 2592000) return t('common.relativeTime.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    if (diffInSeconds < 31536000) return t('common.relativeTime.monthsAgo', { count: Math.floor(diffInSeconds / 2592000) });

    return t('common.relativeTime.yearsAgo', { count: Math.floor(diffInSeconds / 31536000) });
}
