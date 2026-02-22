import { describe, it, expect, vi } from 'vitest';
import { cn, generateUUID, getRelativeTime } from '../utils';

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names correctly', () => {
            const result = cn('base-class', { 'active': true, 'disabled': false }, ['extra-class']);
            expect(result).toContain('base-class');
            expect(result).toContain('active');
            expect(result).not.toContain('disabled');
            expect(result).toContain('extra-class');
        });

        it('should handle tailwind conflicts correctly', () => {
            const result = cn('px-2 py-2', 'px-4');
            // twMerge should prioritize the last one
            expect(result).toContain('px-4');
            expect(result).toContain('py-2');
            expect(result).not.toContain('px-2');
        });
    });

    describe('generateUUID', () => {
        it('should generate a valid looking UUID', () => {
            const uuid = generateUUID();
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should produce unique results', () => {
            const uuid1 = generateUUID();
            const uuid2 = generateUUID();
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('getRelativeTime', () => {
        const mockT = vi.fn((key, options) => {
            if (options && options.count !== undefined) return `${key}:${options.count}`;
            return key;
        });

        it('should return empty string if no timestamp provided', () => {
            expect(getRelativeTime(null, mockT)).toBe('');
        });

        it('should return relative time for seconds ago', () => {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const pastSeconds = nowSeconds - 30; // 30 seconds ago
            const result = getRelativeTime(pastSeconds.toString(), mockT);
            expect(result).toBe('common.relativeTime.justNow');
        });

        it('should return relative time for minutes ago', () => {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const pastSeconds = nowSeconds - 600; // 10 minutes ago
            const result = getRelativeTime(pastSeconds.toString(), mockT);
            expect(result).toBe('common.relativeTime.minutesAgo:10');
        });

        it('should return relative time for days ago', () => {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const pastSeconds = nowSeconds - (86400 * 5); // 5 days ago
            const result = getRelativeTime(pastSeconds.toString(), mockT);
            expect(result).toBe('common.relativeTime.daysAgo:5');
        });

        it('should handle Netscape format vs milliseconds', () => {
            // Netscape format: seconds since epoch
            const seconds = 1700000000;
            const res1 = getRelativeTime(seconds.toString(), mockT);
            expect(res1).not.toBe('');

            // Potential milliseconds format
            const ms = Date.now() - 10000;
            const res2 = getRelativeTime(ms.toString(), mockT);
            expect(res2).toBe('common.relativeTime.justNow');
        });
    });
});
