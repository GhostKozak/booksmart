import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookmarkOperations } from '../use-bookmark-operations';
import { db } from '../../db';

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
            })),
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
    generateUUID: vi.fn(() => 'mock-uuid'),
    pickTagColor: vi.fn(() => '#f43f5e')
}));

vi.mock('../../lib/url-cleaner', () => ({
    cleanUrl: vi.fn((url) => {
        if (url && url.includes('?utm_')) {
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

    describe('removeDuplicates', () => {
        it('should identify and delete duplicates', async () => {
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.removeDuplicates(); });
            expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['2']);
            expect(defaultProps.addCommand).toHaveBeenCalled();
        });

        it('should not delete anything when no duplicates exist', async () => {
            const props = { ...defaultProps, rawBookmarks: [rawBookmarks[0]] };
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.removeDuplicates(); });
            expect(db.bookmarks.bulkDelete).not.toHaveBeenCalled();
            expect(props.addCommand).not.toHaveBeenCalled();
        });

        it('should keep the newest bookmark when duplicates found', async () => {
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.removeDuplicates(); });
            // id:2 has addDate=2, id:3 has addDate=3, so id:2 (older) should be deleted
            expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['2']);
        });
    });

    describe('cleanAllUrls', () => {
        it('should clean URLs with tracking params', async () => {
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.cleanAllUrls(); });
            expect(db.transaction).toHaveBeenCalled();
            expect(db.bookmarks.update).toHaveBeenCalledWith('1', { url: 'https://example.com' });
            expect(defaultProps.addCommand).toHaveBeenCalled();
        });

        it('should not run when no URLs need cleaning', async () => {
            const props = { ...defaultProps, rawBookmarks: [rawBookmarks[1]] };
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.cleanAllUrls(); });
            expect(db.transaction).not.toHaveBeenCalled();
            expect(props.addCommand).not.toHaveBeenCalled();
        });
    });

    describe('cleanSelectedUrls', () => {
        it('should clean URLs for selected bookmarks', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['1']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[0]]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.cleanSelectedUrls(); });
            expect(db.bookmarks.update).toHaveBeenCalledWith('1', { url: 'https://example.com' });
            expect(props.addCommand).toHaveBeenCalled();
            expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
        });

        it('should skip selected bookmarks that resolve to null', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['nonexistent']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([null]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.cleanSelectedUrls(); });
            expect(db.bookmarks.update).not.toHaveBeenCalled();
        });
    });

    describe('handleBatchDelete', () => {
        it('should delete selected bookmarks', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['1', '2']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[0], rawBookmarks[1]]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchDelete(); });
            expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['1', '2']);
            expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
            expect(props.addCommand).toHaveBeenCalled();
        });

        it('should filter out nulls from bulkGet', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['1', 'missing']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[0], undefined]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchDelete(); });
            // Undo callback should only bulkAdd the non-null bookmarks
            const undoFn = props.addCommand.mock.calls[0][0].undo;
            await act(async () => { await undoFn(); });
            expect(db.bookmarks.bulkAdd).toHaveBeenCalledWith([rawBookmarks[0]]);
        });

        it('should do nothing when selectedIds is empty', async () => {
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.handleBatchDelete(); });
            expect(db.bookmarks.bulkDelete).not.toHaveBeenCalled();
        });
    });

    describe('handleBatchMove', () => {
        it('should move selected bookmarks to existing folder', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['2']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);
            const modifyMock = vi.fn();
            db.bookmarks.where.mockReturnValueOnce({
                anyOf: vi.fn(() => ({ modify: modifyMock }))
            });
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchMove('Tech'); });
            expect(db.folders.add).not.toHaveBeenCalled();
            expect(modifyMock).toHaveBeenCalledWith({ originalFolder: 'Tech', newFolder: 'Tech' });
            expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
            expect(props.addCommand).toHaveBeenCalled();
        });

        it('should create target folder if it does not exist', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['2']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([rawBookmarks[1]]);
            const modifyMock = vi.fn();
            db.bookmarks.where.mockReturnValueOnce({
                anyOf: vi.fn(() => ({ modify: modifyMock }))
            });
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchMove('NewFolder'); });
            expect(db.folders.add).toHaveBeenCalledWith({
                id: 'mock-uuid',
                name: 'NewFolder',
                color: '#64748b',
                order: 1
            });
        });
    });

    describe('handleBatchMoveDocs', () => {
        it('should move PDF and doc bookmarks to References folder', async () => {
            db.bookmarks.filter.mockReturnValueOnce({
                toArray: vi.fn().mockResolvedValueOnce([
                    { id: 'd1', url: 'https://example.com/doc.pdf', originalFolder: 'Misc', newFolder: 'Misc' },
                    { id: 'd2', url: 'https://docs.google.com/document', originalFolder: 'Misc', newFolder: 'Misc' }
                ])
            });
            const modifyMock = vi.fn();
            db.bookmarks.where.mockReturnValueOnce({
                anyOf: vi.fn(() => ({ modify: modifyMock }))
            });
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.handleBatchMoveDocs(); });
            expect(db.folders.add).toHaveBeenCalledWith(expect.objectContaining({ name: 'References' }));
            expect(modifyMock).toHaveBeenCalledWith({ originalFolder: 'References', newFolder: 'References' });
            expect(defaultProps.addCommand).toHaveBeenCalled();
            expect(defaultProps.setSmartFilter).toHaveBeenCalledWith(null);
        });

        it('should not create References folder if it already exists', async () => {
            const props = { ...defaultProps, availableFolders: [{ name: 'References' }] };
            db.bookmarks.filter.mockReturnValueOnce({
                toArray: vi.fn().mockResolvedValueOnce([])
            });
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchMoveDocs(); });
            expect(db.folders.add).not.toHaveBeenCalled();
        });
    });

    describe('handleStatusOverride', () => {
        it('should update link health for selected bookmarks', () => {
            const props = { ...defaultProps, selectedIds: new Set(['2']) };
            const { result } = renderHook(() => useBookmarkOperations(props));
            act(() => { result.current.handleStatusOverride('dead'); });
            expect(props.setLinkHealth).toHaveBeenCalledWith({ 'https://test.com': 'dead' });
            expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
        });

        it('should skip bookmarks not found in the list', () => {
            const props = { ...defaultProps, selectedIds: new Set(['nonexistent']) };
            const { result } = renderHook(() => useBookmarkOperations(props));
            act(() => { result.current.handleStatusOverride('alive'); });
            expect(props.setLinkHealth).toHaveBeenCalledWith({});
        });
    });

    describe('handleBatchAddTags', () => {
        it('should add tags to selected bookmarks', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['1']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([{ id: '1', tags: ['existing'] }]);
            db.tags.toArray.mockResolvedValueOnce([{ id: 't1', name: 'existing' }]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchAddTags('newtag'); });
            expect(db.tags.bulkAdd).toHaveBeenCalled();
            expect(db.bookmarks.bulkPut).toHaveBeenCalled();
            expect(props.addCommand).toHaveBeenCalled();
            expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
        });

        it('should do nothing with empty tag string', async () => {
            const { result } = renderHook(() => useBookmarkOperations(defaultProps));
            await act(async () => { await result.current.handleBatchAddTags(''); });
            expect(db.tags.bulkAdd).not.toHaveBeenCalled();
        });

        it('should handle string tags field on bookmarks', async () => {
            const props = { ...defaultProps, selectedIds: new Set(['1']) };
            db.bookmarks.bulkGet.mockResolvedValueOnce([{ id: '1', tags: 'tag1,tag2' }]);
            db.tags.toArray.mockResolvedValueOnce([]);
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => { await result.current.handleBatchAddTags('newtag'); });
            expect(db.bookmarks.bulkPut).toHaveBeenCalled();
        });
    });
});
