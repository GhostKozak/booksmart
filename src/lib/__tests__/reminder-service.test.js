import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getTomorrowPreset,
    getThreeDaysPreset,
    getThisWeekendPreset,
    getNextWeekPreset,
    getReminderPresets,
    setReminder,
    removeReminder,
    snoozeReminder,
    getReminderStatus,
    checkAndNotifyDueReminders,
    requestNotificationPermission
} from '../reminder-service';
import { db } from '../../db';

vi.mock('../../db', () => ({
    db: {
        bookmarks: {
            update: vi.fn(),
            where: vi.fn()
        }
    }
}));

vi.mock('sonner', () => ({
    toast: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('reminder-service.js', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('presets calculation', () => {
        it('calculates tomorrow preset at 09:00', () => {
            const ts = getTomorrowPreset();
            const date = new Date(ts);
            expect(date.getHours()).toBe(9);
            expect(date.getMinutes()).toBe(0);
            expect(ts).toBeGreaterThan(Date.now());
        });

        it('calculates 3 days preset at 09:00', () => {
            const ts = getThreeDaysPreset();
            const date = new Date(ts);
            expect(date.getHours()).toBe(9);
            expect(date.getMinutes()).toBe(0);
            expect(ts).toBeGreaterThan(Date.now() + 2 * 24 * 60 * 60 * 1000);
        });

        it('calculates this weekend preset at 10:00 Saturday', () => {
            const ts = getThisWeekendPreset();
            const date = new Date(ts);
            expect(date.getDay()).toBe(6); // Saturday
            expect(date.getHours()).toBe(10);
            expect(date.getMinutes()).toBe(0);
        });

        it('calculates next week preset at 09:00 Monday', () => {
            const ts = getNextWeekPreset();
            const date = new Date(ts);
            expect(date.getDay()).toBe(1); // Monday
            expect(date.getHours()).toBe(9);
            expect(date.getMinutes()).toBe(0);
        });

        it('returns all 4 quick presets', () => {
            const presets = getReminderPresets();
            expect(presets.length).toBe(4);
            expect(presets.map(p => p.id)).toEqual(['tomorrow', 'in3days', 'weekend', 'nextweek']);
        });
    });

    describe('database operations', () => {
        it('sets reminder timestamp for bookmark in database', async () => {
            const bookmarkId = 42;
            const targetTime = Date.now() + 100000;
            const res = await setReminder(bookmarkId, targetTime);

            expect(res).toBe(true);
            expect(db.bookmarks.update).toHaveBeenCalledWith(bookmarkId, {
                reminderAt: targetTime,
                reminderNotified: 0
            });
        });

        it('removes reminder timestamp from bookmark in database', async () => {
            const bookmarkId = 42;
            const res = await removeReminder(bookmarkId);

            expect(res).toBe(true);
            expect(db.bookmarks.update).toHaveBeenCalledWith(bookmarkId, {
                reminderAt: null,
                reminderNotified: null
            });
        });

        it('snoozes reminder by 1 day', async () => {
            const bookmarkId = 42;
            const now = Date.now();
            const newTs = await snoozeReminder(bookmarkId, 1);

            expect(newTs).toBeGreaterThanOrEqual(now + 24 * 60 * 60 * 1000 - 1000);
            expect(db.bookmarks.update).toHaveBeenCalledWith(bookmarkId, {
                reminderAt: newTs,
                reminderNotified: 0
            });
        });

        it('returns false for invalid IDs', async () => {
            expect(await setReminder(null, 123)).toBe(false);
            expect(await removeReminder(null)).toBe(false);
            expect(await snoozeReminder(null)).toBe(false);
        });
    });

    describe('getReminderStatus formatting', () => {
        it('returns overdue status for past timestamps', () => {
            const pastTs = Date.now() - 3600000;
            const status = getReminderStatus(pastTs);

            expect(status.isOverdue).toBe(true);
            expect(status.text).toBe('Vakti Geçti');
            expect(status.fullDate).toBeTruthy();
        });

        it('returns relative minutes or hours for upcoming reminders', () => {
            const futureTs = Date.now() + 2 * 60 * 60 * 1000; // in 2 hours
            const status = getReminderStatus(futureTs);

            expect(status.isOverdue).toBe(false);
            expect(status.text).toContain('sa sonra');
        });

        it('returns empty status when timestamp is missing', () => {
            const status = getReminderStatus(null);
            expect(status.text).toBe('');
        });
    });

    describe('checkAndNotifyDueReminders', () => {
        it('finds due bookmarks and triggers toast notification', async () => {
            const dueList = [
                { id: 1, title: 'Read BookSmart Article', url: 'https://booksmart.dev', reminderAt: Date.now() - 5000, reminderNotified: 0 }
            ];

            const mockToArray = vi.fn().mockResolvedValue(dueList);
            const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
            const mockBetween = vi.fn().mockReturnValue({ filter: mockFilter });
            db.bookmarks.where.mockReturnValue({ between: mockBetween });

            const count = await checkAndNotifyDueReminders();

            expect(count).toBe(1);
            expect(db.bookmarks.update).toHaveBeenCalledWith(1, { reminderNotified: expect.any(Number) });
            const { toast } = await import('sonner');
            expect(toast.info).toHaveBeenCalled();
        });
    });

    describe('requestNotificationPermission', () => {
        it('returns unsupported in non-browser environment or handles permission check', async () => {
            const res = await requestNotificationPermission();
            expect(typeof res).toBe('string');
        });
    });
});
