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
            get: vi.fn(),
            toArray: vi.fn(),
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
            add: vi.fn(),
            toArray: vi.fn(),
            update: vi.fn()
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

vi.mock('../../lib/utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        generateUUID: vi.fn(() => 'mock-uuid'),
        pickTagColor: vi.fn(() => '#f43f5e')
    };
});

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

    describe('mergeDuplicates', () => {
        it('should merge tags, notes and delete duplicates', async () => {
            const bookmarksWithTags = [
                { id: '1', url: 'https://test.com', title: 'Test 1', addDate: 10, tags: ['tag1'], note: 'Note 1' },
                { id: '2', url: 'https://test.com', title: 'Test 2', addDate: 20, tags: ['tag2'], note: 'Note 2', description: 'Desc 2' }
            ];
            db.tags.toArray.mockResolvedValueOnce([]);
            const props = { ...defaultProps, rawBookmarks: bookmarksWithTags };
            const { result } = renderHook(() => useBookmarkOperations(props));

            await act(async () => {
                await result.current.mergeDuplicates();
            });

            // id: 2 is newest (addDate 20), so id: 1 should be deleted and id: 2 updated
            expect(db.bookmarks.update).toHaveBeenCalledWith('2', expect.objectContaining({
                tags: expect.arrayContaining(['tag1', 'tag2']),
                note: expect.stringContaining('Note 1'),
                description: 'Desc 2'
            }));
            expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['1']);
            expect(defaultProps.addCommand).toHaveBeenCalled();
        });

        it('should not do anything when no duplicates exist', async () => {
            const props = { ...defaultProps, rawBookmarks: [rawBookmarks[0]] };
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => {
                await result.current.mergeDuplicates();
            });
            expect(db.bookmarks.bulkDelete).not.toHaveBeenCalled();
        });

        it('should merge specific duplicate group with mergeDuplicateGroup', async () => {
            const bookmarksWithTags = [
                { id: '1', url: 'https://group.com', title: 'G1', addDate: 5, tags: ['a'], note: 'Note A' },
                { id: '2', url: 'https://group.com', title: 'G2', addDate: 15, tags: ['b'], note: 'Note B' }
            ];
            db.tags.toArray.mockResolvedValueOnce([]);
            const props = { ...defaultProps, rawBookmarks: bookmarksWithTags };
            const { result } = renderHook(() => useBookmarkOperations(props));

            await act(async () => {
                await result.current.mergeDuplicateGroup(bookmarksWithTags[0]);
            });

            expect(db.bookmarks.update).toHaveBeenCalledWith('2', expect.objectContaining({
                tags: expect.arrayContaining(['a', 'b'])
            }));
            expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['1']);
        });

        it('should preserve case-sensitive paths and not falsely merge distinct paths', async () => {
            const caseSensitiveBookmarks = [
                { id: '1', url: 'https://youtube.com/watch?v=AbCd', title: 'Video 1', addDate: 10 },
                { id: '2', url: 'https://youtube.com/watch?v=abcd', title: 'Video 2', addDate: 20 }
            ];
            const props = { ...defaultProps, rawBookmarks: caseSensitiveBookmarks };
            const { result } = renderHook(() => useBookmarkOperations(props));
            await act(async () => {
                await result.current.mergeDuplicates();
            });
            expect(db.bookmarks.bulkDelete).not.toHaveBeenCalled();
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

    describe('moveFolder', () => {
        it('should move folder inside target parent folder and update descendants', async () => {
            const props = { ...defaultProps };
            db.bookmarks.toArray.mockResolvedValueOnce([
                { id: 'b1', originalFolder: 'Dev', newFolder: 'Dev' },
                { id: 'b2', originalFolder: 'Dev > React', newFolder: 'Dev > React' },
                { id: 'b3', originalFolder: 'Other', newFolder: 'Other' }
            ]);
            db.folders.toArray.mockResolvedValueOnce([
                { id: 'f1', name: 'Dev' },
                { id: 'f2', name: 'Dev > React' }
            ]);

            const { result } = renderHook(() => useBookmarkOperations(props));
            let success;
            await act(async () => {
                success = await result.current.moveFolder('Dev', 'Work');
            });

            expect(success).toBe(true);
            expect(db.bookmarks.update).toHaveBeenCalledWith('b1', {
                originalFolder: 'Work > Dev',
                newFolder: 'Work > Dev'
            });
            expect(db.bookmarks.update).toHaveBeenCalledWith('b2', {
                originalFolder: 'Work > Dev > React',
                newFolder: 'Work > Dev > React'
            });
            expect(db.folders.update).toHaveBeenCalledWith('f1', { name: 'Work > Dev' });
            expect(db.folders.update).toHaveBeenCalledWith('f2', { name: 'Work > Dev > React' });
            expect(props.addCommand).toHaveBeenCalled();
        });

        it('should move folder to root level when target is null or __ROOT__', async () => {
            const props = { ...defaultProps };
            db.bookmarks.toArray.mockResolvedValueOnce([
                { id: 'b1', originalFolder: 'Work > Dev', newFolder: 'Work > Dev' }
            ]);
            db.folders.toArray.mockResolvedValueOnce([
                { id: 'f1', name: 'Work > Dev' }
            ]);

            const { result } = renderHook(() => useBookmarkOperations(props));
            let success;
            await act(async () => {
                success = await result.current.moveFolder('Work > Dev', '__ROOT__');
            });

            expect(success).toBe(true);
            expect(db.bookmarks.update).toHaveBeenCalledWith('b1', {
                originalFolder: 'Dev',
                newFolder: 'Dev'
            });
            expect(db.folders.update).toHaveBeenCalledWith('f1', { name: 'Dev' });
        });

        it('should prevent cyclic moves when moving parent into its own child', async () => {
            const props = { ...defaultProps };
            const { result } = renderHook(() => useBookmarkOperations(props));
            let success;
            await act(async () => {
                success = await result.current.moveFolder('Work', 'Work > Dev > React');
            });

            expect(success).toBe(false);
            expect(db.bookmarks.update).not.toHaveBeenCalled();
        });
    });

    describe('moveBookmark', () => {
        it('should move bookmark to target folder', async () => {
            const props = { ...defaultProps };
            db.bookmarks.get.mockResolvedValueOnce({
                id: 'b1',
                title: 'Test',
                originalFolder: 'OldFolder',
                newFolder: 'OldFolder'
            });

            const { result } = renderHook(() => useBookmarkOperations(props));
            let success;
            await act(async () => {
                success = await result.current.moveBookmark('b1', 'NewFolder');
            });

            expect(success).toBe(true);
            expect(db.bookmarks.update).toHaveBeenCalledWith('b1', {
                originalFolder: 'NewFolder',
                newFolder: 'NewFolder'
            });
            expect(props.addCommand).toHaveBeenCalled();
        });

        it('should do nothing if bookmark already in target folder', async () => {
            const props = { ...defaultProps };
            db.bookmarks.get.mockResolvedValueOnce({
                id: 'b1',
                title: 'Test',
                originalFolder: 'FolderA',
                newFolder: 'FolderA'
            });

            const { result } = renderHook(() => useBookmarkOperations(props));
            let success;
            await act(async () => {
                success = await result.current.moveBookmark('b1', 'FolderA');
            });

            expect(success).toBe(false);
            expect(db.bookmarks.update).not.toHaveBeenCalled();
        });
    });
});
