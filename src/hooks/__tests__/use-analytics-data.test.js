import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAnalyticsData } from '../use-analytics-data';

describe('useAnalyticsData hook', () => {
    const mockBookmarks = [
        { id: '1', url: 'https://google.com', isDuplicate: false, addDate: '1700000000', tags: ['search'], originalFolder: 'Work' },
        { id: '2', url: 'https://google.com/2', isDuplicate: true, addDate: '1700000001', tags: ['search', 'tech'], originalFolder: 'Work' },
        { id: '3', url: 'https://github.com', isDuplicate: false, addDate: '1600000000', tags: ['tech'], originalFolder: 'Dev' }
    ];

    const mockLinkHealth = {
        'https://google.com': 'alive',
        'https://google.com/2': 'dead',
        'https://github.com': 'alive'
    };

    it('returns null if no bookmarks provided', () => {
        const { result } = renderHook(() => useAnalyticsData([], {}, 0));
        expect(result.current).toBeNull();
    });

    it('calculates basic stats correctly', () => {
        const { result } = renderHook(() => useAnalyticsData(mockBookmarks, mockLinkHealth, 5));

        expect(result.current.total).toBe(3);
        expect(result.current.folders).toBe(2); // Work, Dev
        expect(result.current.duplicates).toBe(1);
        expect(result.current.deadLinks).toBe(1);
        expect(result.current.checkedLinks).toBe(3);
        expect(result.current.oldBookmarksCount).toBe(5);
    });

    it('calculates top domains correctly', () => {
        const { result } = renderHook(() => useAnalyticsData(mockBookmarks, mockLinkHealth, 0));

        expect(result.current.topDomains).toHaveLength(2);
        expect(result.current.topDomains[0].domain).toBe('google.com');
        expect(result.current.topDomains[0].count).toBe(2);
    });

    it('generates tag cloud data', () => {
        const { result } = renderHook(() => useAnalyticsData(mockBookmarks, mockLinkHealth, 0));

        expect(result.current.tagCloudData).toContainEqual({ tag: 'search', count: 2 });
        expect(result.current.tagCloudData).toContainEqual({ tag: 'tech', count: 2 });
    });

    it('calculates health score grade', () => {
        const { result } = renderHook(() => useAnalyticsData(mockBookmarks, mockLinkHealth, 0));

        // With 1/3 dead links and 1/3 duplicates, the score will be calculated
        expect(result.current.healthScore.grade).toBeDefined();
        expect(['A', 'B', 'C', 'D', 'F']).toContain(result.current.healthScore.grade);
    });
});
