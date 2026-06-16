import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/auto-categorizer', () => ({
    autoCategorizeLocal: vi.fn()
}));

vi.mock('../../db', () => ({
    db: {
        bookmarks: { bulkPut: vi.fn() }
    }
}));

import { autoCategorizeLocal } from '../../services/auto-categorizer';
import { useAutoCategorize } from '../use-auto-categorize';

describe('useAutoCategorize', () => {
    const rawBookmarks = [
        { id: '1', url: 'https://react.dev', title: 'React', originalFolder: 'Dev', tags: [], ruleTags: [] },
        { id: '2', url: 'https://vue.dev', title: 'Vue', originalFolder: 'Design', tags: [], ruleTags: [] },
        { id: '3', url: 'https://node.dev', title: 'Node', originalFolder: 'Dev', tags: ['backend'], ruleTags: [] },
    ];

    const defaultProps = {
        selectedIds: new Set(['1', '2']),
        setSelectedIds: vi.fn(),
        rawBookmarks,
        onSortPreview: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with isProcessingLocal false', () => {
        const { result } = renderHook(() => useAutoCategorize(defaultProps));
        expect(result.current.isProcessingLocal).toBe(false);
    });

    it('should call autoCategorizeLocal with selected bookmarks', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: 'Framework', tags: ['js'] },
            '2': { folder: 'Framework', tags: ['js'] }
        });
        const { result } = renderHook(() => useAutoCategorize(defaultProps));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(autoCategorizeLocal).toHaveBeenCalledOnce();
        expect(autoCategorizeLocal.mock.calls[0][0]).toHaveLength(2);
    });

    it('should skip when selectedIds is empty', async () => {
        const props = { ...defaultProps, selectedIds: new Set() };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(autoCategorizeLocal).not.toHaveBeenCalled();
    });

    it('should send updates via onSortPreview callback', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: 'Framework', tags: ['js'] },
        });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(onSortPreview).toHaveBeenCalledOnce();
        const updates = onSortPreview.mock.calls[0][0];
        expect(updates).toHaveLength(1);
        expect(updates[0].id).toBe('1');
        expect(updates[0].newFolder).toBe('Framework');
        expect(updates[0].status).toBe('suggested');
        expect(updates[0].ruleTags).toEqual(['js']);
    });

    it('should fallback to bulkPut when no onSortPreview handler', async () => {
        const { db } = await import('../../db');
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: 'Framework', tags: [] },
        });
        const { result } = renderHook(() => useAutoCategorize(defaultProps));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(db.bookmarks.bulkPut).toHaveBeenCalled();
        expect(defaultProps.setSelectedIds).toHaveBeenCalledWith(new Set());
    });

    it('should skip bookmarks where folder and tags are unchanged', async () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['1']),
            rawBookmarks: [
                { id: '1', url: 'https://react.dev', title: 'React', originalFolder: 'Existing', newFolder: 'Existing', tags: [], ruleTags: ['js'] },
            ],
            onSortPreview: vi.fn(),
        };
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: 'Existing', tags: ['js'] },
        });
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(props.onSortPreview).not.toHaveBeenCalled();
    });

    it('should skip update when prediction folder is empty (matches current)', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: '', tags: [] },
        });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview, selectedIds: new Set(['1']), rawBookmarks: [rawBookmarks[0]] };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(onSortPreview).not.toHaveBeenCalled();
    });

    it('should skip update when prediction folder is "uncategorized" (matches current)', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: 'Uncategorized', tags: [] },
        });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview, selectedIds: new Set(['1']), rawBookmarks: [rawBookmarks[0]] };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(onSortPreview).not.toHaveBeenCalled();
    });

    it('should default to currentEffective when prediction folder is empty and tags differ', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '1': { folder: '', tags: ['newtag'] },
        });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview, selectedIds: new Set(['1']), rawBookmarks: [rawBookmarks[0]] };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(onSortPreview).toHaveBeenCalled();
        expect(onSortPreview.mock.calls[0][0][0].newFolder).toBe('Dev');
    });

    it('should merge new tags with existing ruleTags', async () => {
        autoCategorizeLocal.mockReturnValueOnce({
            '3': { folder: 'NewFolder', tags: ['newtag'] },
        });
        const onSortPreview = vi.fn();
        const props = {
            ...defaultProps,
            onSortPreview,
            selectedIds: new Set(['3']),
            rawBookmarks: [
                { id: '3', url: 'https://node.dev', title: 'Node', originalFolder: 'Dev', tags: ['backend'], ruleTags: ['existing'] },
            ],
        };
        const { result } = renderHook(() => useAutoCategorize(props));
        await act(async () => { await result.current.handleAutoCategorize(); });
        const update = onSortPreview.mock.calls[0][0][0];
        expect(update.ruleTags).toEqual(expect.arrayContaining(['existing', 'newtag']));
    });

    it('should handle errors gracefully and set isProcessingLocal to false', async () => {
        autoCategorizeLocal.mockImplementation(() => { throw new Error('Test error'); });
        const { result } = renderHook(() => useAutoCategorize(defaultProps));
        await act(async () => { await result.current.handleAutoCategorize(); });
        expect(result.current.isProcessingLocal).toBe(false);
    });
});
