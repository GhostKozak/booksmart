import { db } from '../db';
import { toast } from 'sonner';

/**
 * Calculates preset timestamp for tomorrow at 09:00.
 */
export function getTomorrowPreset() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
}

/**
 * Calculates preset timestamp for 3 days from now at 09:00.
 */
export function getThreeDaysPreset() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
}

/**
 * Calculates preset timestamp for upcoming weekend (Saturday 10:00).
 */
export function getThisWeekendPreset() {
    const d = new Date();
    const day = d.getDay(); // 0: Sunday, 6: Saturday
    let daysUntilSaturday = 6 - day;
    if (daysUntilSaturday <= 0) {
        daysUntilSaturday += 7; // Next Saturday
    }
    d.setDate(d.getDate() + daysUntilSaturday);
    d.setHours(10, 0, 0, 0);
    return d.getTime();
}

/**
 * Calculates preset timestamp for next Monday at 09:00.
 */
export function getNextWeekPreset() {
    const d = new Date();
    const day = d.getDay(); // 0: Sun, 1: Mon
    let daysUntilMonday = (8 - day) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
}

/**
 * Available preset options for UI quick selection.
 */
export function getReminderPresets() {
    return [
        { id: 'tomorrow', labelKey: 'reminders.presets.tomorrow', defaultLabel: 'Yarın (09:00)', getTimestamp: getTomorrowPreset },
        { id: 'in3days', labelKey: 'reminders.presets.in3days', defaultLabel: '3 Gün Sonra', getTimestamp: getThreeDaysPreset },
        { id: 'weekend', labelKey: 'reminders.presets.weekend', defaultLabel: 'Hafta Sonu Oku (Cts 10:00)', getTimestamp: getThisWeekendPreset },
        { id: 'nextweek', labelKey: 'reminders.presets.nextweek', defaultLabel: 'Gelecek Hafta (Pzt 09:00)', getTimestamp: getNextWeekPreset }
    ];
}

/**
 * Sets or updates a reminder timestamp for a bookmark.
 *
 * @param {number|string} bookmarkId
 * @param {number} timestamp Unix epoch timestamp in ms
 */
export async function setReminder(bookmarkId, timestamp) {
    if (!bookmarkId || !timestamp) return false;
    await db.bookmarks.update(bookmarkId, {
        reminderAt: Number(timestamp),
        reminderNotified: 0
    });
    return true;
}

/**
 * Removes a reminder from a bookmark.
 *
 * @param {number|string} bookmarkId
 */
export async function removeReminder(bookmarkId) {
    if (!bookmarkId) return false;
    await db.bookmarks.update(bookmarkId, {
        reminderAt: null,
        reminderNotified: null
    });
    return true;
}

/**
 * Snoozes an existing reminder by a specified number of hours or days.
 *
 * @param {number|string} bookmarkId
 * @param {number} [days=1]
 */
export async function snoozeReminder(bookmarkId, days = 1) {
    if (!bookmarkId) return false;
    const newTimestamp = Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000;
    await setReminder(bookmarkId, newTimestamp);
    return newTimestamp;
}

/**
 * Requests browser notification permission if supported.
 *
 * @returns {Promise<NotificationPermission|'unsupported'>}
 */
export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    try {
        return await Notification.requestPermission();
    } catch {
        return Notification.permission;
    }
}

/**
 * Formats a reminder timestamp into human-readable relative/absolute text.
 *
 * @param {number} timestamp
 * @param {function} [t] i18next translator function
 * @returns {{ isOverdue: boolean, text: string, fullDate: string }}
 */
export function getReminderStatus(timestamp, t = (k, def) => def) {
    if (!timestamp) return { isOverdue: false, text: '', fullDate: '' };
    const now = Date.now();
    const diffMs = timestamp - now;
    const isOverdue = diffMs <= 0;
    const targetDate = new Date(timestamp);

    const fullDate = targetDate.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (isOverdue) {
        return {
            isOverdue: true,
            text: t('reminders.overdue', 'Vakti Geçti'),
            fullDate
        };
    }

    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let text;
    if (diffHours < 1) {
        const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
        text = t('reminders.inMinutes', `${diffMins} dk sonra`, { count: diffMins });
    } else if (diffHours < 24) {
        text = t('reminders.inHours', `${diffHours} sa sonra`, { count: diffHours });
    } else if (diffDays === 1) {
        text = t('reminders.tomorrow', 'Yarın');
    } else {
        text = t('reminders.inDays', `${diffDays} gün kaldı`, { count: diffDays });
    }

    return { isOverdue: false, text, fullDate };
}

/**
 * Checks for bookmarks with due reminders and triggers in-app and browser notifications.
 *
 * @param {object} [options]
 * @param {function} [options.t] Translator function
 * @param {function} [options.onOpenBookmark] Callback to open bookmark (reader mode or URL)
 */
export async function checkAndNotifyDueReminders({ t = (k, def) => def, onOpenBookmark } = {}) {
    try {
        const now = Date.now();
        // Query bookmarks where reminderAt is in the past and hasn't been notified yet
        const dueBookmarks = await db.bookmarks
            .where('reminderAt')
            .between(1, now, true, true)
            .filter(b => !b.reminderNotified || b.reminderNotified === 0)
            .toArray();

        if (!dueBookmarks || dueBookmarks.length === 0) return 0;

        for (const bookmark of dueBookmarks) {
            // Mark as notified so it doesn't trigger again
            await db.bookmarks.update(bookmark.id, { reminderNotified: now });

            const title = bookmark.title || t('common.untitled', 'İsimsiz Yer İmi');
            const url = bookmark.url;

            // 1. Browser Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    const notif = new Notification(`⏰ ${t('reminders.notificationTitle', 'Okuma Hatırlatıcısı')}`, {
                        body: title,
                        icon: '/favicon.ico',
                        tag: `reminder-${bookmark.id}`
                    });
                    notif.onclick = () => {
                        window.focus();
                        if (onOpenBookmark) {
                            onOpenBookmark(bookmark);
                        } else {
                            window.open(url, '_blank');
                        }
                    };
                } catch (e) {
                    console.warn('[Reminders] Failed to display browser notification:', e);
                }
            }

            // 2. In-App Toast with Snooze and Open actions
            toast.info(`⏰ ${t('reminders.notificationTitle', 'Okuma Hatırlatıcısı')}: ${title}`, {
                duration: 10000,
                description: url,
                action: {
                    label: t('reminders.openNow', 'Aç'),
                    onClick: () => {
                        if (onOpenBookmark) {
                            onOpenBookmark(bookmark);
                        } else {
                            window.open(url, '_blank');
                        }
                    }
                },
                cancel: {
                    label: t('reminders.snooze1Day', '1 Gün Ertele'),
                    onClick: async () => {
                        await snoozeReminder(bookmark.id, 1);
                        toast.success(t('reminders.snoozedSuccess', '1 gün ertelendi'));
                    }
                }
            });
        }

        return dueBookmarks.length;
    } catch (err) {
        console.error('[Reminders] Error checking due reminders:', err);
        return 0;
    }
}
