import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/ai-service', () => ({
    categorizeBookmarks: vi.fn()
}));

vi.mock('../../db', () => ({
    db: {
        bookmarks: { bulkPut: vi.fn() }
    }
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key })
}));

import { categorizeBookmarks } from '../../services/ai-service';
import { useMagicSort } from '../use-magic-sort';

describe('useMagicSort', () => {
    const rawBookmarks = [
        { id: '1', url: 'https://react.dev', title: 'React', originalFolder: 'Dev', tags: [] },
        { id: '2', url: 'https://vue.dev', title: 'Vue', originalFolder: 'Design', tags: [] },
    ];

    const defaultProps = {
        selectedIds: new Set(['1', '2']),
        setSelectedIds: vi.fn(),
        rawBookmarks,
        openSettings: vi.fn(),
        onSortPreview: null,
    };

    let store = {};
    beforeEach(() => {
        vi.clearAllMocks();
        store = { bs_api_key: 'test-key', bs_model: 'gpt-4o-mini', bs_provider: 'openai' };
        localStorage.getItem.mockImplementation((k) => store[k] ?? null);
        localStorage.setItem.mockImplementation((k, v) => { store[k] = String(v); });
        localStorage.removeItem.mockImplementation((k) => { delete store[k]; });
        sessionStorage.clear();
    });

    it('should initialize with isProcessingAI false', () => {
        const { result } = renderHook(() => useMagicSort(defaultProps));
        expect(result.current.isProcessingAI).toBe(false);
    });

    it('should call categorizeBookmarks with selected bookmarks', async () => {
        categorizeBookmarks.mockResolvedValueOnce({
            '1': { folder: 'Framework', tags: ['js'] },
            '2': { folder: 'Framework', tags: ['js'] }
        });
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(categorizeBookmarks).toHaveBeenCalledOnce();
        expect(categorizeBookmarks.mock.calls[0][0]).toHaveLength(2);
    });

    it('should open settings when no API key and provider is not ollama', async () => {
        localStorage.removeItem('bs_api_key');
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(defaultProps.openSettings).toHaveBeenCalledWith('ai');
        expect(categorizeBookmarks).not.toHaveBeenCalled();
    });

    it('should skip when selectedIds is empty', async () => {
        const props = { ...defaultProps, selectedIds: new Set() };
        const { result } = renderHook(() => useMagicSort(props));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(categorizeBookmarks).not.toHaveBeenCalled();
    });

    it('should produce updates on preview callback', async () => {
        categorizeBookmarks.mockResolvedValueOnce({
            '1': { folder: 'Framework', tags: ['js'] },
        });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview };
        const { result } = renderHook(() => useMagicSort(props));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(onSortPreview).toHaveBeenCalledOnce();
        const updates = onSortPreview.mock.calls[0][0];
        expect(updates).toHaveLength(1);
        expect(updates[0].id).toBe('1');
        expect(updates[0].newFolder).toBe('Framework');
        expect(updates[0].status).toBe('suggested');
    });

    it('should skip bookmarks with same folder and tags', async () => {
        const bookmarks = [
            { id: '1', url: 'https://react.dev', title: 'React', originalFolder: 'Framework', newFolder: 'Framework', tags: [], ruleTags: ['js'] },
        ];
        categorizeBookmarks.mockResolvedValueOnce({
            '1': { folder: 'Framework', tags: ['js'] },
        });
        const props = { ...defaultProps, rawBookmarks: bookmarks, onSortPreview: vi.fn() };
        const { result } = renderHook(() => useMagicSort(props));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(props.onSortPreview).not.toHaveBeenCalled();
    });

    it('should handle old format response (string instead of object)', async () => {
        categorizeBookmarks.mockResolvedValueOnce({ '1': 'NewFolder' });
        const onSortPreview = vi.fn();
        const props = { ...defaultProps, onSortPreview };
        const { result } = renderHook(() => useMagicSort(props));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(onSortPreview).toHaveBeenCalled();
        expect(onSortPreview.mock.calls[0][0][0].newFolder).toBe('NewFolder');
    });

    it('should fallback to bulkPut when no onSortPreview', async () => {
        const { db } = await import('../../db');
        categorizeBookmarks.mockResolvedValueOnce({
            '1': { folder: 'Framework', tags: [] },
        });
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(db.bookmarks.bulkPut).toHaveBeenCalled();
        expect(defaultProps.setSelectedIds).toHaveBeenCalledWith(new Set());
    });

    it('should cancel via abort controller', async () => {
        const abortError = new DOMException('Aborted', 'AbortError');
        categorizeBookmarks.mockRejectedValueOnce(abortError);
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        const { toast } = await import('sonner');
        expect(toast.info).toHaveBeenCalledWith('common.cancelled');
    });

    it('should handle API errors with 401 redirect to settings', async () => {
        categorizeBookmarks.mockRejectedValueOnce(new Error('API Key error'));
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(defaultProps.openSettings).toHaveBeenCalledWith('ai');
    });

    it('should not redirect to settings for non-auth errors', async () => {
        categorizeBookmarks.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(defaultProps.openSettings).not.toHaveBeenCalled();
    });

    it('should get ollama URL instead of API key when provider is ollama', async () => {
        localStorage.setItem('bs_provider', 'ollama');
        localStorage.setItem('bs_ollama_url', 'http://localhost:11434');
        categorizeBookmarks.mockResolvedValueOnce({});
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(defaultProps.openSettings).not.toHaveBeenCalled();
    });

    it('should read from sessionStorage with priority over localStorage', async () => {
        localStorage.setItem('bs_model', 'gpt-4o');
        sessionStorage.setItem('bs_model', 'claude-sonnet-4-20250514');
        sessionStorage.setItem('bs_provider', 'anthropic');
        sessionStorage.setItem('bs_api_key', 'sk-ant-test');
        categorizeBookmarks.mockResolvedValueOnce({});
        const { result } = renderHook(() => useMagicSort(defaultProps));
        await act(async () => { await result.current.handleMagicSort(); });
        expect(categorizeBookmarks).toHaveBeenCalled();
        expect(categorizeBookmarks.mock.calls[0][2]).toBe('claude-sonnet-4-20250514');
    });
});
