import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookmarkOperations } from '../use-bookmark-operations';
import { db } from '../../db';

// Mock dependencies
vi.mock('../../db', () => ({
    db: {
        bookmarks: {
            bulkGet: vi.fn(),
            bulkDelete: vi.fn(),
            bulkAdd: vi.fn(),
            bulkPut: vi.fn(),
            update: vi.fn(),
            where: vi.fn(() => ({
                anyOf: vi.fn(() => ({
                    modify: vi.fn()
                }))
            })),
            filter: vi.fn(() => ({
                toArray: vi.fn()
            }))
        },
        folders: {
            add: vi.fn()
        },
        tags: {
            toArray: vi.fn(),
            bulkAdd: vi.fn()
        },
        transaction: vi.fn((mode, ...args) => {
            const cb = args[args.length - 1];
            return cb();
        })
    }
}));

vi.mock('../../lib/utils', () => ({
    generateUUID: vi.fn(() => 'mock-uuid')
}));

vi.mock('../../lib/url-cleaner', () => ({
    cleanUrl: vi.fn((url) => {
        if (url.includes('?utm_')) {
            return { changed: true, cleaned: url.split('?')[0] };
        }
        return { changed: false, cleaned: url };
    }),
    countCleanableUrls: vi.fn(() => 1)
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('useBookmarkOperations', () => {
    const rawBookmarks = [
        { id: '1', url: 'https://example.com?utm_source=test', title: 'Example URL', addDate: 1 },
        { id: '2', url: 'https://test.com', title: 'Test', addDate: 2 },
        { id: '3', url: 'https://test.com', title: 'Test Duplicate', addDate: 3 }
    ];

    const defaultProps = {
        rawBookmarks,
        bookmarks: rawBookmarks,
        addCommand: vi.fn(),
        selectedIds: new Set(),
        setSelectedIds: vi.fn(),
        availableFolders: [{ name: 'Tech' }],
        linkHealth: {},
        setLinkHealth: vi.fn(),
        setSmartFilter: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize and calculate cleanable count', () => {
        const { result } = renderHook(() => useBookmarkOperations(defaultProps));
        expect(result.current.cleanableCount).toBe(1);
    });

    it('removeDuplicates should identify and delete duplicates', async () => {
        db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[2]]);

        const { result } = renderHook(() => useBookmarkOperations(defaultProps));

        await act(async () => {
            await result.current.removeDuplicates();
        });

        expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['3']);
        expect(defaultProps.addCommand).toHaveBeenCalled();
    });

    it('cleanAllUrls should clean URLs with tracking params', async () => {
        const { result } = renderHook(() => useBookmarkOperations(defaultProps));

        await act(async () => {
            await result.current.cleanAllUrls();
        });

        expect(db.transaction).toHaveBeenCalled();
        expect(db.bookmarks.update).toHaveBeenCalledWith('1', { url: 'https://example.com' });
        expect(defaultProps.addCommand).toHaveBeenCalled();
    });

    it('handleBatchDelete should delete selected bookmarks', async () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['1', '2'])
        };
        db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[0], rawBookmarks[1]]);

        const { result } = renderHook(() => useBookmarkOperations(props));

        await act(async () => {
            await result.current.handleBatchDelete();
        });

        expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['1', '2']);
        expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
        expect(props.addCommand).toHaveBeenCalled();
    });

    it('handleBatchMove should move selected bookmarks to existing folder', async () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['2'])
        };
        db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);

        // Mock chain: where().anyOf().modify()
        const modifyMock = vi.fn();
        db.bookmarks.where.mockReturnValueOnce({
            anyOf: vi.fn(() => ({ modify: modifyMock }))
        });

        const { result } = renderHook(() => useBookmarkOperations(props));

        await act(async () => {
            await result.current.handleBatchMove('Tech');
        });

        expect(db.folders.add).not.toHaveBeenCalled();
        expect(db.transaction).toHaveBeenCalled();
        expect(modifyMock).toHaveBeenCalledWith({ originalFolder: 'Tech', newFolder: 'Tech' });
        expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
        expect(props.addCommand).toHaveBeenCalled();
    });

    it('handleBatchMove should create target folder if it does not exist', async () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['2'])
        };
        db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);

        const modifyMock = vi.fn();
        db.bookmarks.where.mockReturnValueOnce({
            anyOf: vi.fn(() => ({ modify: modifyMock }))
        });

        const { result } = renderHook(() => useBookmarkOperations(props));

        await act(async () => {
            await result.current.handleBatchMove('NewFolder');
        });

        expect(db.folders.add).toHaveBeenCalledWith({
            id: 'mock-uuid',
            name: 'NewFolder',
            color: '#64748b',
            order: 1
        });
    });

    it('handleStatusOverride should update link health for selected bookmarks', () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['2'])
        };

        const { result } = renderHook(() => useBookmarkOperations(props));

        act(() => {
            result.current.handleStatusOverride('dead');
        });

        expect(props.setLinkHealth).toHaveBeenCalledWith({ 'https://test.com': 'dead' });
        expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
    });
});
