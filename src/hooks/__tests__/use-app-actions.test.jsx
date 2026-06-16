import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

const mockBulkGet = vi.fn();
const mockBulkPut = vi.fn();
const mockBookmarksClear = vi.fn();
const mockRulesClear = vi.fn();
const mockFoldersClear = vi.fn();
const mockTagsClear = vi.fn();
const mockIgnoredUrlsClear = vi.fn();
const mockCollectionsClear = vi.fn();

vi.mock('../../db', () => ({
    db: {
        bookmarks: {
            bulkGet: (...args) => mockBulkGet(...args),
            bulkPut: (...args) => mockBulkPut(...args),
            clear: () => mockBookmarksClear()
        },
        rules: { clear: () => mockRulesClear() },
        folders: { clear: () => mockFoldersClear() },
        tags: { clear: () => mockTagsClear() },
        ignoredUrls: { clear: () => mockIgnoredUrlsClear() },
        collections: { clear: () => mockCollectionsClear() },
        transaction: vi.fn((...args) => {
            const cb = args[args.length - 1];
            return cb();
        })
    }
}));

vi.mock('../../lib/backup-manager', () => ({
    createBackup: vi.fn().mockResolvedValue({ data: 'test' }),
    downloadBackup: vi.fn()
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key })
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

import { useAppActions } from '../use-app-actions';

describe('useAppActions', () => {
    const defaultProps = {
        addCommand: vi.fn(),
        workerSetLinkHealth: vi.fn(),
        workerRuleConflicts: [],
        displayBookmarks: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.setState({
            selectedIds: new Set(['1']),
            setSelectedIds: vi.fn(),
            setShowBackupModal: vi.fn(),
            setIsConflictModalOpen: vi.fn(),
            setSearchQuery: vi.fn(),
            setActiveTag: vi.fn(),
            setSmartFilter: vi.fn(),
        });
    });

    describe('applySortUpdates', () => {
        it('should apply pending sort updates', async () => {
            const previousStates = [{ id: '1', title: 'Old', originalFolder: 'Old', newFolder: 'Old' }];
            mockBulkGet.mockResolvedValueOnce(previousStates);
            const { result } = renderHook(() => useAppActions(defaultProps));
            const updates = [{
                id: '1', title: 'New', originalFolder: 'Old', newFolder: 'New', tags: ['tag1'], ruleTags: ['tag2']
            }];
            await act(async () => { await result.current.applySortUpdates(updates); });
            expect(mockBulkPut).toHaveBeenCalled();
            const saved = mockBulkPut.mock.calls[0][0][0];
            expect(saved.newFolder).toBe('New');
            expect(saved.status).toBe('ai-suggested');
            expect(saved.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
            expect(defaultProps.addCommand).toHaveBeenCalled();
        });

        it('should do nothing with empty updates', async () => {
            const { result } = renderHook(() => useAppActions(defaultProps));
            await act(async () => { await result.current.applySortUpdates([]); });
            expect(mockBulkPut).not.toHaveBeenCalled();
        });
    });

    describe('guardedExport', () => {
        it('should call export function when no conflicts', () => {
            const { result } = renderHook(() => useAppActions(defaultProps));
            const exportFn = vi.fn();
            act(() => { result.current.guardedExport(exportFn); });
            expect(exportFn).toHaveBeenCalledOnce();
        });

        it('should open conflict modal when conflicts exist', () => {
            const props = { ...defaultProps, workerRuleConflicts: [{ id: '1' }] };
            const { result } = renderHook(() => useAppActions(props));
            const exportFn = vi.fn();
            act(() => { result.current.guardedExport(exportFn); });
            expect(exportFn).not.toHaveBeenCalled();
            const state = useAppStore.getState();
            expect(state.setIsConflictModalOpen).toHaveBeenCalledWith(true);
        });
    });

    describe('confirmClearAll', () => {
        it('should clear all tables and show toast', async () => {
            const { result } = renderHook(() => useAppActions(defaultProps));
            await act(async () => { await result.current.confirmClearAll(false); });
            expect(mockBookmarksClear).toHaveBeenCalled();
            expect(mockRulesClear).toHaveBeenCalled();
            expect(mockFoldersClear).toHaveBeenCalled();
            expect(mockTagsClear).toHaveBeenCalled();
            expect(mockIgnoredUrlsClear).toHaveBeenCalled();
            expect(mockCollectionsClear).toHaveBeenCalled();
            const { toast } = await import('sonner');
            expect(toast.success).toHaveBeenCalledWith('toast.clearedAll');
        });

        it('should backup before clearing when requested', async () => {
            const { result } = renderHook(() => useAppActions(defaultProps));
            const { createBackup, downloadBackup } = await import('../../lib/backup-manager');
            await act(async () => { await result.current.confirmClearAll(true); });
            expect(createBackup).toHaveBeenCalledOnce();
            expect(downloadBackup).toHaveBeenCalledOnce();
            expect(mockBookmarksClear).toHaveBeenCalled();
        });
    });

    describe('closeFile', () => {
        it('should clear all tables and reset store state', () => {
            const { result } = renderHook(() => useAppActions(defaultProps));
            act(() => { result.current.closeFile(); });
            expect(mockBookmarksClear).toHaveBeenCalled();
            expect(defaultProps.workerSetLinkHealth).toHaveBeenCalledWith({});
            const state = useAppStore.getState();
            expect(state.setSearchQuery).toHaveBeenCalledWith('');
            expect(state.setActiveTag).toHaveBeenCalledWith(null);
            expect(state.setSmartFilter).toHaveBeenCalledWith(null);
        });
    });
});
